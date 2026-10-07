const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#2563eb" />
  <path d="M150 256h212v-50l80 80-80 80v-50H150v50l-80-80 80-80v50z" fill="#ffffff"/>
</svg>`;

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

async function generate() {
  await sharp(Buffer.from(svg))
    .resize(192, 192)
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  await sharp(Buffer.from(svg))
    .resize(180, 180)
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
  console.log('Icons generated!');
}

generate().catch(console.error);
