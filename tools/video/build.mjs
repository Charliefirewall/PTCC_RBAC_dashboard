/**
 * Mux: sentence clips -> one narration track -> burned-in captions -> MP4.
 *
 * LAYOUT. The capture is 1920x960 and the output is 1920x1080, so the bottom 120px is a
 * black band that belongs to the captions alone. Subtitles are centred in that band and
 * cannot overlap the interface — which matters here, because the application keeps a
 * permanent "DEMO — SIMULATED DATA" bar along its own bottom edge that must stay legible.
 * Nothing is scaled: the UI occupies its recorded pixels exactly.
 *
 * AUDIO. Each sentence is already high-passed, trimmed, fade-topped and levelled by
 * tts.mjs. Here they are only placed on the timeline and summed — no second dynamic
 * normalisation pass, because gain riding across the whole track is what made the first
 * cut sound restless between lines.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'build/video';
const DIST = process.env.PTCC_VIDEO_OUT ?? 'H:/Mongolia Bus Transport/handover';
mkdirSync(DIST, { recursive: true });

// Measured by record.mjs, not assumed: see the note there.
const HEAD = JSON.parse(readFileSync(join(OUT, 'head.json'), 'utf8')).head;
const VIDEO_H = 960;     // recorded height
const FRAME_H = 1080;    // output height
const BAND = FRAME_H - VIDEO_H;

const { timings, cues } = JSON.parse(readFileSync(join(OUT, 'timings.json'), 'utf8'));

const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const probe = (f, entry) =>
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', entry, '-of', 'default=noprint_wrappers=1:nokey=1', f], {
    encoding: 'utf8',
  }).trim();

const videoDur = Number(probe(join(OUT, 'screen.webm'), 'format=duration'));

// ── 1. narration track ───────────────────────────────────────────────────────────
const clips = timings.flatMap((t) => t.clips);
const inputs = clips.flatMap((c) => ['-i', join(OUT, 'audio', `${c.id}.wav`)]);
const delays = clips
  .map((c, i) => `[${i}:a]adelay=${Math.round((c.at + HEAD) * 1000)}:all=1[a${i}]`)
  .join(';');
const mixIn = clips.map((_, i) => `[a${i}]`).join('');
const narration = join(OUT, 'narration.wav');

ff([
  ...inputs,
  '-filter_complex',
  `${delays};${mixIn}amix=inputs=${clips.length}:normalize=0:dropout_transition=0[m];` +
    // A single static trim, not a dynamic one. -1.5 dB of ceiling is enough to survive
    // AAC encoding without a limiter that could breathe.
    `[m]volume=1.0,alimiter=limit=0.84:level=false,apad[out]`,
  '-map', '[out]',
  '-t', String(videoDur),
  '-ar', '48000', '-ac', '2',
  narration,
]);
const lastCue = cues.at(-1);
console.log(`capture ${videoDur.toFixed(1)}s · ${clips.length} clips · narration ends ${(lastCue.until + HEAD).toFixed(1)}s`);

// ── 2. subtitles ─────────────────────────────────────────────────────────────────
const ts = (sec, sep = ',') => {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  const f = Math.round((sec % 1) * (sep === ',' ? 1000 : 100));
  return `${h}:${m}:${s}${sep}${String(f).padStart(sep === ',' ? 3 : 2, '0')}`;
};
const placed = cues.map((c) => ({ ...c, at: c.at + HEAD, until: c.until + HEAD }));

// Sidecar SRT, for players and for anyone who wants to re-time or translate it.
writeFileSync(
  join(DIST, 'PTCC-Smart-Operation-Management-demo.srt'),
  placed.map((c, i) => `${i + 1}\n${ts(c.at)} --> ${ts(c.until)}\n${c.text}\n`).join('\n'),
  'utf8',
);

/*
 * ASS, for burning in. Alignment=2 is bottom-centre; MarginV lifts the text off the
 * frame edge so two lines sit centred inside the 120px band. No outline and no shadow:
 * the band is solid black, so an outline would only add fringing.
 */
const FONT_SIZE = 34;
const MARGIN_V = Math.round((BAND - FONT_SIZE * 2 * 1.25) / 2) + 6;
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Segoe UI,${FONT_SIZE},&H00F2F2F2,&H00F2F2F2,&H00000000,&H00000000,0,0,0,0,100,100,0.4,0,1,0,0,2,160,160,${MARGIN_V},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${placed
  .map((c) => `Dialogue: 0,${ts(c.at, '.')},${ts(c.until, '.')},Caption,,0,0,0,,${c.text.replace(/\n/g, '\\N')}`)
  .join('\n')}
`;
const assPath = join(OUT, 'captions.ass');
writeFileSync(assPath, ass, 'utf8');

// ── 3. compose ───────────────────────────────────────────────────────────────────
// pad    : 1920x960 capture sits at the top; the new 120px strip is the caption band
// drawbox: a 1px divider so the band reads as part of the design, not a crop accident
// ass    : captions burned into the band
// fade   : 0.8s up from black at the head, 1.0s down at the tail
const mp4 = join(DIST, 'PTCC-Smart-Operation-Management-demo.mp4');
const fadeOutAt = Math.max(0, videoDur - 1.0);
const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');

ff([
  '-i', join(OUT, 'screen.webm'),
  '-i', narration,
  '-filter_complex',
  `[0:v]pad=1920:${FRAME_H}:0:0:color=black,` +
    `drawbox=x=0:y=${VIDEO_H}:w=1920:h=1:color=0x2A2F3A@1.0:t=fill,` +
    `ass='${assEscaped}',` +
    `fade=t=in:st=0:d=0.8,fade=t=out:st=${fadeOutAt.toFixed(2)}:d=1.0,format=yuv420p[v];` +
    `[1:a]afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOutAt.toFixed(2)}:d=1.0[a]`,
  '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-movflags', '+faststart',
  '-r', '25',
  '-c:a', 'aac', '-b:a', '192k',
  '-shortest',
  mp4,
]);

const size = (Number(probe(mp4, 'format=size')) / 1048576).toFixed(1);
const dur = Number(probe(mp4, 'format=duration'));
console.log(`\n${mp4}`);
console.log(`  ${Math.floor(dur / 60)}m ${Math.round(dur % 60)}s · ${size} MB · ${probe(mp4, 'stream=width,height').replace('\n', 'x')} · ${placed.length} burned-in captions`);
