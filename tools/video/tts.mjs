/**
 * Voice-over. Synthesises one WAV per scene with the Windows SAPI male voice, then
 * measures each file with ffprobe and writes the real durations to timings.json.
 *
 * Measuring rather than estimating is the whole point: record.mjs holds each scene for
 * exactly as long as its narration takes, so the picture cannot drift out of sync with
 * the voice over a four-minute runtime.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SCENES, VOICE, RATE } from './scenes.mjs';

const OUT = 'build/video';
mkdirSync(join(OUT, 'audio'), { recursive: true });

const ps = (script) =>
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 1 << 24,
  });

// Fail loudly here rather than producing a silent video.
const voices = ps(
  `Add-Type -AssemblyName System.Speech; ` +
    `(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ` +
    `ForEach-Object { $_.VoiceInfo.Name }`,
);
if (!voices.includes(VOICE)) {
  console.error(`voice "${VOICE}" not installed. Available:\n${voices}`);
  process.exit(1);
}

const durationOf = (file) =>
  Number(
    execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file,
    ], { encoding: 'utf8' }).trim(),
  );

const timings = [];
let total = 0;

for (const s of SCENES) {
  const txt = join(OUT, `${s.id}.txt`);
  const wav = join(OUT, 'audio', `${s.id}.wav`);
  // Via a file, so punctuation and quotes never have to survive a shell round-trip.
  writeFileSync(txt, s.say, 'utf8');

  ps(
    `Add-Type -AssemblyName System.Speech; ` +
      `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
      `$s.SelectVoice('${VOICE}'); ` +
      `$s.Rate = ${RATE}; ` +
      `$s.SetOutputToWaveFile('${wav.replace(/\\/g, '/')}'); ` +
      `$s.Speak([IO.File]::ReadAllText('${txt.replace(/\\/g, '/')}')); ` +
      `$s.Dispose()`,
  );
  rmSync(txt);

  // A beat either side, so a line never starts the instant a scene cuts.
  const speech = durationOf(wav);
  const dur = speech + 1.1;
  timings.push({ id: s.id, route: s.route, speech: +speech.toFixed(2), hold: +dur.toFixed(2) });
  total += dur;
  console.log(`${s.id.padEnd(14)} ${speech.toFixed(1)}s speech -> ${dur.toFixed(1)}s on screen`);
}

writeFileSync(join(OUT, 'timings.json'), JSON.stringify({ total: +total.toFixed(2), timings }, null, 2));
console.log(`\ntotal runtime ${Math.floor(total / 60)}m ${Math.round(total % 60)}s -> ${OUT}/timings.json`);
