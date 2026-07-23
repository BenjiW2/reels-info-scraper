import { chmod, mkdir, readdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import ffmpegStatic from "ffmpeg-static";

const ffmpegPath: string | null =
  typeof ffmpegStatic === "string"
    ? ffmpegStatic
    : (ffmpegStatic as { default?: string | null }).default ?? null;

export function assertPublicInstagramUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
    !/^\/(?:[A-Za-z0-9_.]+\/)?(?:reel|reels|p)\/[A-Za-z0-9_-]+\/?/.test(url.pathname)
  ) {
    throw new Error("Expected a public Instagram Reel URL");
  }
  return url.toString();
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function ensureYtDlp() {
  const cacheDir = resolve(".cache");
  const binary = join(cacheDir, "yt-dlp");
  await mkdir(cacheDir, { recursive: true });
  try {
    await chmod(binary, 0o755);
    return binary;
  } catch {
    const response = await fetch("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp");
    if (!response.ok) throw new Error(`Could not download yt-dlp (${response.status})`);
    await writeFile(binary, Buffer.from(await response.arrayBuffer()), { mode: 0o755 });
    return binary;
  }
}

export async function downloadAndSampleReel(value: string, outputDirectory: string) {
  const url = assertPublicInstagramUrl(value);
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const ytDlp = await ensureYtDlp();

  await run(ytDlp, [
    "--no-playlist",
    "--write-info-json",
    "--write-description",
    "--write-subs",
    "--write-auto-subs",
    "--sub-langs", "en.*",
    "--convert-subs", "srt",
    "--merge-output-format", "mp4",
    "-o", join(output, "reel.%(ext)s"),
    url
  ]);

  const files = await readdir(output);
  const video = files.find(name => /\.(?:mp4|mov|mkv|webm)$/i.test(name));
  if (!video) throw new Error("Reel video was not downloaded");
  if (!ffmpegPath) throw new Error("Bundled ffmpeg is unavailable");

  const frames = join(output, "frames");
  const audio = join(output, "audio.wav");
  await mkdir(frames, { recursive: true });
  await run(ffmpegPath, [
    "-hide_banner", "-loglevel", "error",
    "-i", join(output, video),
    "-t", "120",
    "-vf", "fps=1/3,scale=768:-2",
    "-q:v", "3",
    join(frames, "frame-%03d.jpg")
  ]);
  await run(ffmpegPath, [
    "-hide_banner", "-loglevel", "error",
    "-i", join(output, video),
    "-vn", "-ac", "1", "-ar", "16000",
    "-c:a", "pcm_s16le",
    audio
  ]);

  const frameFiles = (await readdir(frames))
    .filter(name => name.endsWith(".jpg"))
    .sort()
    .map(name => join(frames, name));
  if (!frameFiles.length) throw new Error("No video frames were extracted");

  return {
    url,
    outputDirectory: output,
    video: join(output, video),
    audio,
    frames: frameFiles,
    metadata: files.filter(name => name.endsWith(".info.json")).map(name => join(output, name)),
    subtitles: files.filter(name => name.endsWith(".srt")).map(name => join(output, name))
  };
}
