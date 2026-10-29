// Gera os PNGs do manifest a partir de public/icon.svg (usa o Chromium do Playwright).
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const svg = fs.readFileSync('public/icon.svg', 'utf8');
  const b = await chromium.launch();
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<style>body{margin:0}</style>${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}`);
    await p.screenshot({ path: `public/icon-${s}.png`, omitBackground: true });
  }
  await b.close();
})();
