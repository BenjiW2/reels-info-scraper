import { downloadAndSampleReel } from "../src/media.js";

const [url, outputDirectory] = process.argv.slice(2);
if (!url || !outputDirectory) {
  console.error("Usage: npm run extract-media -- <instagram-reel-url> <output-directory>");
  process.exit(2);
}

const result = await downloadAndSampleReel(url, outputDirectory);
console.log(JSON.stringify(result, null, 2));
