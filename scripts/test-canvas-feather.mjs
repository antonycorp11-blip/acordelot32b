/**
 * O feather do terreno tem que borrar SEM `ctx.filter`.
 *
 * `CanvasRenderingContext2D.filter` só chegou ao Safari no iOS 17, e onde não
 * existe ele falha calado: `blur()` vira no-op, a máscara mantém a borda dura
 * dos tiles e o mapa ganha cantos quadrados. Este teste roda com a propriedade
 * apagada do protótipo — Safari velho simulado — e cobra transição real.
 *
 * O controle negativo é a segunda metade: com a propriedade apagada, o método
 * antigo (`ctx.filter='blur()'`) TEM que falhar. Se passar, o teste não está
 * medindo nada.
 */
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
// A porta pode mudar quando ha outro vite aberto na maquina; 3000 e so o padrao.
const PORTA = process.env.PORTA || '3000';
const browser = await chromium.launch({channel: 'chrome', headless: true});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  await page.goto(`http://localhost:${PORTA}`);

  const r = await page.evaluate(async () => {
    // Safari sem suporte: some com a propriedade antes de qualquer desenho.
    const proto = CanvasRenderingContext2D.prototype;
    const tinhaFilter = 'filter' in proto;
    delete proto.filter;

    const {feather} = await import('/src/game/canvasBlur.ts');

    // Máscara: metade esquerda branca, borda vertical exata no meio.
    const N = 256, meio = N / 2;
    const mask = Object.assign(document.createElement('canvas'), {width: N, height: N});
    const mc = mask.getContext('2d');
    mc.fillStyle = '#fff';
    mc.fillRect(0, 0, meio, N);

    // Conta quantas colunas ficam em meio-tom na linha do meio: é a largura da
    // transição. Borda dura = 0 colunas intermediárias.
    const medirTransicao = (cv) => {
      const px = cv.getContext('2d').getImageData(0, N / 2, N, 1).data;
      let intermediarias = 0;
      for (let x = 0; x < N; x++) {
        const a = px[x * 4 + 3];
        if (a > 20 && a < 235) intermediarias++;
      }
      return intermediarias;
    };

    const suave = feather(mask, 24);
    const larguraNova = medirTransicao(suave);

    // Controle negativo: o jeito antigo, no mesmo ambiente sem `ctx.filter`.
    const velho = Object.assign(document.createElement('canvas'), {width: N, height: N});
    const vc = velho.getContext('2d');
    vc.filter = 'blur(24px)';
    vc.drawImage(mask, 0, 0);
    const larguraVelha = medirTransicao(velho);

    if (tinhaFilter) Object.defineProperty(proto, 'filter', {value: 'none', writable: true, configurable: true});
    return {larguraNova, larguraVelha};
  });

  assert.ok(
    r.larguraNova >= 20,
    `o feather novo precisa borrar sem ctx.filter — transicao de apenas ${r.larguraNova}px`,
  );
  assert.equal(
    r.larguraVelha, 0,
    `controle negativo furado: ctx.filter borrou ${r.larguraVelha}px mesmo apagado, o teste nao mede nada`,
  );
  assert.deepEqual(errors, [], 'erros de pagina');

  console.log(`OK  feather sem ctx.filter: transicao de ${r.larguraNova}px`);
  console.log(`OK  controle negativo: o metodo antigo deu ${r.larguraVelha}px (borda dura), como esperado`);
} finally {
  await browser.close();
}
