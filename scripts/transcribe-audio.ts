import { readFile, writeFile } from "node:fs/promises";
import { pipeline } from "@huggingface/transformers";
import wavefile from "wavefile";

const [audioPath, outputPath] = process.argv.slice(2);
if (!audioPath || !outputPath) {
  console.error("Usage: npm run transcribe-audio -- <audio.wav> <transcript.json>");
  process.exit(2);
}

const wav = new wavefile.WaveFile(await readFile(audioPath));
wav.toBitDepth("32f");
wav.toSampleRate(16000);
let samples = wav.getSamples();
if (Array.isArray(samples)) {
  if (samples.length > 1) {
    const scalingFactor = Math.sqrt(2);
    for (let index = 0; index < samples[0].length; index += 1) {
      samples[0][index] = scalingFactor * (samples[0][index] + samples[1][index]) / 2;
    }
  }
  samples = samples[0];
}

const model = process.env.WHISPER_MODEL ?? "Xenova/whisper-base";
const transcriber = await pipeline("automatic-speech-recognition", model);
const result = await (transcriber as any)(samples, {
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: true
});

const payload = {
  model,
  text: result.text?.trim() ?? "",
  chunks: result.chunks ?? []
};
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, output: outputPath, chunks: payload.chunks.length }));
