/**
 * Mux: scene WAVs -> one narration track -> muxed with the screen capture into MP4,
 * plus an SRT so the video is usable with the sound off (which is how half of any
 * management audience will first watch it).
 *
 * The audio is laid out on the SAME timeline record.mjs held to: each scene's line starts
 * at the cumulative sum of the previous scenes' holds, with a short lead-in so a line
 * never begins on the frame the scene cuts. Nothing is stretched to fit.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCENES } from './scenes.mjs';

const OUT = 'build/video';
const DIST = process.env.PTCC_VIDEO_OUT ?? 'H:/Mongolia Bus Transport/handover';
mkdirSync(DIST, { recursive: true });

const { timings } = JSON.parse(readFileSync(join(OUT, 'timings.json'), 'utf8'));
const LEAD_IN = 0.55;          // beat before each line
const HEAD = 6.0;              // the un-narrated warm-up settle at the head of the capture

const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const probe = (f, entry) =>
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', entry, '-of', 'default=noprint_wrappers=1:nokey=1', f], {
    encoding: 'utf8',
  }).trim();

// ── 1. where each line sits on the timeline ──────────────────────────────────────
let t = HEAD;
const placed = timings.map((s) => {
  const at = t + LEAD_IN;
  t += s.hold;
  return { ...s, at: +at.toFixed(3) };
});
const videoDur = Number(probe(join(OUT, 'screen.webm'), 'format=duration'));
console.log(`capture ${videoDur.toFixed(1)}s · narration ends ${(placed.at(-1).at + placed.at(-1).speech).toFixed(1)}s`);

// ── 2. one narration track, each line delayed onto its mark ──────────────────────
const inputs = placed.flatMap((s) => ['-i', join(OUT, 'audio', `${s.id}.wav`)]);
const delays = placed
  .map((s, i) => `[${i}:a]adelay=${Math.round(s.at * 1000)}|${Math.round(s.at * 1000)}[a${i}]`)
  .join(';');
const mixIn = placed.map((_, i) => `[a${i}]`).join('');
const narration = join(OUT, 'narration.wav');

ff([
  ...inputs,
  '-filter_complex',
  `${delays};${mixIn}amix=inputs=${placed.length}:normalize=0:dropout_transition=0[mixed];` +
    // Gentle levelling so the voice sits at a consistent, comfortable level throughout.
    `[mixed]loudnorm=I=-16:TP=-1.5:LRA=11,apad[out]`,
  '-map', '[out]',
  '-t', String(videoDur),
  '-ar', '48000', '-ac', '2',
  narration,
]);
console.log(`narration track -> ${narration}`);

// ── 3. mux to H.264 MP4 ──────────────────────────────────────────────────────────
const mp4 = join(DIST, 'PTCC-Smart-Operation-Management-demo.mp4');
ff([
  '-i', join(OUT, 'screen.webm'),
  '-i', narration,
  '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-pix_fmt', 'yuv420p',          // the format every player and projector accepts
  '-movflags', '+faststart',      // starts playing before it has fully downloaded
  '-r', '25',
  '-c:a', 'aac', '-b:a', '192k',
  '-shortest',
  mp4,
]);

// ── 4. subtitles ─────────────────────────────────────────────────────────────────
const ts = (sec) => {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  const ms = String(Math.round((sec % 1) * 1000)).padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
};
const wrap = (text) => {
  // Two short lines read better on screen than one long one.
  const words = text.split(/\s+/);
  const out = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 46) { out.push(line.trim()); line = w; } else { line += ' ' + w; }
  }
  if (line.trim()) out.push(line.trim());
  return out.join('\n');
};
const srt = placed
  .map((s, i) => {
    const say = SCENES.find((x) => x.id === s.id).say;
    return `${i + 1}\n${ts(s.at)} --> ${ts(s.at + s.speech)}\n${wrap(say)}\n`;
  })
  .join('\n');
const srtPath = join(DIST, 'PTCC-Smart-Operation-Management-demo.srt');
writeFileSync(srtPath, srt, 'utf8');

const size = (Number(probe(mp4, 'format=size')) / 1048576).toFixed(1);
const dur = Number(probe(mp4, 'format=duration'));
console.log(`\n${mp4}`);
console.log(`  ${Math.floor(dur / 60)}m ${Math.round(dur % 60)}s · ${size} MB · ${probe(mp4, 'stream=width,height').replace('\n', 'x')} · H.264/AAC`);
console.log(`${srtPath}`);
