/**
 * Voice-over: synthesis, cleanup, and exact timings.
 *
 * WHAT WAS WRONG WITH THE FIRST VERSION, measured with `astats` rather than guessed:
 *
 *   22,050 Hz mono   SAPI's default. Upsampled to 48 kHz for AAC it sounds dull and
 *                    gritty. Now requested at 48 kHz up front.
 *   DC offset 0.0124 A constant bias. `adelay` pads with true digital silence, so every
 *                    clip boundary was a step from 0.000 to 0.0124 - an audible click at
 *                    the head of all ten scenes. Removed with a high-pass, and every clip
 *                    now fades in and out over 12 ms so a boundary cannot click at all.
 *   Peak -0.27 dB    Effectively no headroom; any resampling overshoot clips.
 *
 * One clip per SENTENCE, not per scene. The voice keeps natural sentence prosody, and
 * because each sentence is measured individually the subtitles can be cut to real
 * timings instead of estimated ones.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SCENES, VOICE, RATE } from './scenes.mjs';

const OUT = 'build/video';
const AUDIO = join(OUT, 'audio');
const RAWA = join(OUT, 'audio-raw');

/** Gap after a sentence, and the extra beat a scene gets before its first line. */
const SENTENCE_GAP = 0.32;
const LEAD_IN = 0.55;
const TAIL = 0.65;

/** Subtitle shape: two lines, this wide. Anything longer is cut into a second cue. */
const CUE_CHARS = 42;
const CUE_LINES = 2;

rmSync(AUDIO, { recursive: true, force: true });
rmSync(RAWA, { recursive: true, force: true });
mkdirSync(AUDIO, { recursive: true });
mkdirSync(RAWA, { recursive: true });

const ps = (script) =>
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 1 << 24,
  });

const ff = (args) =>
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

const durationOf = (f) =>
  Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', f], { encoding: 'utf8' }).trim(),
  );

const voices = ps(
  `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }`,
);
if (!voices.includes(VOICE)) {
  console.error(`voice "${VOICE}" not installed. Available:\n${voices}`);
  process.exit(1);
}

/** Sentence split that leaves "P T C C" and decimals alone. */
const sentencesOf = (text) =>
  text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Wrap to at most CUE_LINES lines of CUE_CHARS; returns the lines. */
function wrapLines(text) {
  const out = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if (line && (line + ' ' + w).length > CUE_CHARS) { out.push(line); line = w; }
    else line = line ? line + ' ' + w : w;
  }
  if (line) out.push(line);
  return out;
}

/**
 * Cut one sentence into subtitle cues of at most two lines. Timing inside a sentence is
 * shared out by character count - the error is a fraction of a second within a single
 * spoken sentence, and it buys cues that are actually readable instead of one six-line
 * wall of text per scene.
 */
function cuesFor(sentence, start, dur) {
  const lines = wrapLines(sentence);
  const groups = [];
  for (let i = 0; i < lines.length; i += CUE_LINES) groups.push(lines.slice(i, i + CUE_LINES));
  const totalChars = groups.reduce((a, g) => a + g.join(' ').length, 0) || 1;
  let t = start;
  return groups.map((g) => {
    const text = g.join('\n');
    const share = (g.join(' ').length / totalChars) * dur;
    const cue = { at: +t.toFixed(3), until: +(t + share).toFixed(3), text };
    t += share;
    return cue;
  });
}

const timings = [];
const cues = [];
let clock = 0;

for (const scene of SCENES) {
  const sentences = sentencesOf(scene.say);
  let offset = LEAD_IN;
  const clips = [];

  for (const [i, sentence] of sentences.entries()) {
    const id = `${scene.id}-${String(i + 1).padStart(2, '0')}`;
    const txt = join(RAWA, `${id}.txt`);
    const raw = join(RAWA, `${id}.wav`);
    const clean = join(AUDIO, `${id}.wav`);
    writeFileSync(txt, sentence, 'utf8');

    // 48 kHz, 16-bit, mono, straight out of SAPI - no upsampling from 22 kHz.
    ps(
      `Add-Type -AssemblyName System.Speech; ` +
        `$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, ` +
        `[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, ` +
        `[System.Speech.AudioFormat.AudioChannel]::Mono); ` +
        `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
        `$s.SelectVoice('${VOICE}'); $s.Rate = ${RATE}; ` +
        `$s.SetOutputToWaveFile('${raw.replace(/\\/g, '/')}', $fmt); ` +
        `$s.Speak([IO.File]::ReadAllText('${txt.replace(/\\/g, '/')}')); ` +
        `$s.Dispose()`,
    );
    rmSync(txt);

    // Cleanup, in order:
    //   highpass 75   removes the DC bias and any rumble - this is the click fix
    //   lowpass 11k   the voice has nothing above this; keeps resampling hiss out
    //   silenceremove trims dead air at the head so lines start on their cue
    //   afade         12 ms in/out: a boundary physically cannot click
    //   loudnorm      linear=true, so ONE constant gain is applied per clip. The
    //                 dynamic form rides the gain and pumps the noise floor up
    //                 between words, which is what made the first cut sound restless.
    ff([
      '-i', raw,
      '-af',
      'highpass=f=75,lowpass=f=11000,' +
        'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-50dB,' +
        'areverse,silenceremove=start_periods=1:start_silence=0.12:start_threshold=-50dB,areverse,' +
        'loudnorm=I=-18:TP=-2.0:LRA=9:linear=true,' +
        'afade=t=in:st=0:d=0.012',
      '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le',
      clean,
    ]);

    const d = durationOf(clean);
    // Tail fade needs the measured length, so it is a second, cheap pass.
    const faded = clean.replace('.wav', '.f.wav');
    ff(['-i', clean, '-af', `afade=t=out:st=${Math.max(0, d - 0.012).toFixed(3)}:d=0.012`,
        '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', faded]);
    rmSync(clean);
    execFileSync('cmd', ['/c', 'move', '/y', faded.replace(/\//g, '\\'), clean.replace(/\//g, '\\')], { stdio: 'ignore' });

    const dur = durationOf(clean);
    clips.push({ id, at: +(clock + offset).toFixed(3), dur: +dur.toFixed(3) });
    cues.push(...cuesFor(sentence, clock + offset, dur));
    offset += dur + SENTENCE_GAP;
  }

  const hold = offset - SENTENCE_GAP + TAIL;
  timings.push({ id: scene.id, hold: +hold.toFixed(2), clips });
  clock += hold;
  console.log(`${scene.id.padEnd(14)} ${sentences.length} sentences -> ${hold.toFixed(1)}s`);
}

rmSync(RAWA, { recursive: true, force: true });
writeFileSync(join(OUT, 'timings.json'), JSON.stringify({ total: +clock.toFixed(2), timings, cues }, null, 2));
console.log(`\n${cues.length} subtitle cues · total ${Math.floor(clock / 60)}m ${Math.round(clock % 60)}s`);
if (!existsSync(join(OUT, 'timings.json'))) process.exit(1);
