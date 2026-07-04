import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/icons/icon.svg');
const svg = readFileSync(svgPath);

await sharp(svg).resize(192, 192).png().toFile(resolve(__dirname, '../public/icons/icon-192.png'));
console.log('icon-192.png created');

await sharp(svg).resize(512, 512).png().toFile(resolve(__dirname, '../public/icons/icon-512.png'));
console.log('icon-512.png created');

await sharp(svg).resize(180, 180).png().toFile(resolve(__dirname, '../public/icons/apple-touch-icon.png'));
console.log('apple-touch-icon.png created');
