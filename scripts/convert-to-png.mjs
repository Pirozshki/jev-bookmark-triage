import sharp from "sharp";
import { readFileSync } from "fs";

const webpPath = process.argv[2];
const pngPath = process.argv[3];

if (!webpPath || !pngPath) {
  console.error("Usage: node convert-to-png.js <input.webp> <output.png>");
  process.exit(1);
}

const buffer = readFileSync(webpPath);
await sharp(buffer).png().toFile(pngPath);

console.log(`Converted ${webpPath} to ${pngPath}`);
