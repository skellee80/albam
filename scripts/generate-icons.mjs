/**
 * public/icon.svg 에서 PWA용 PNG 아이콘을 만든다.
 *
 *   node scripts/generate-icons.mjs
 *
 * 아이콘 그림을 바꿨을 때만 다시 돌리면 된다. 결과 PNG는 저장소에 함께 커밋한다
 * (빌드 때마다 만들 필요가 없고, 빌드 환경이 sharp에 의존하지 않도록).
 */
import { readFileSync } from 'node:fs';

import sharp from 'sharp';

const svg = readFileSync('public/icon.svg');

// 홈화면·앱 목록용 일반 아이콘
for (const size of [192, 512]) {
  await sharp(svg, { density: 400 }).resize(size, size).png().toFile(`public/icon-${size}.png`);
}

// iOS 홈화면 아이콘
await sharp(svg, { density: 400 }).resize(180, 180).png().toFile('public/icon-180.png');

// maskable: 안드로이드가 가장자리를 원형 등으로 잘라내므로
// 그림을 안전영역(80%)까지 줄이고 남는 자리를 배경색으로 채운다.
const inner = await sharp(svg, { density: 400 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#6F9A57' } })
  .composite([{ input: inner, top: 51, left: 51 }])
  .png()
  .toFile('public/icon-maskable-512.png');

console.log('아이콘 생성 완료: icon-192 / icon-512 / icon-180 / icon-maskable-512');
