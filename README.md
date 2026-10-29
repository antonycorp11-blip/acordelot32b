# Acordelot Treinos 🎹

Versão enxuta: **gravar exercícios de teclado**.

- **Gravar exercício de teclado**: conecte o teclado MIDI (cabo USB). Cada tecla apertada acende no teclado virtual com a cor e o nome da nota. A gravação é feita pelos eventos do teclado (MIDI), não pelo som. Sem MIDI, o app usa o microfone.
- **Exercícios gravados**: ouça cada exercício, com as teclas acendendo no teclado virtual, ou apague.

Os exercícios ficam salvos no próprio aparelho.

## Rodar
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes de detecção (microfone), pontuação e regra de avanço
npm run build    # produção (pasta dist/, publicada pela Vercel a cada push no main)
```

## Microfone
- Detecção **monofônica** (uma nota por vez). Acordes só são reconhecidos pelo MIDI.
- O limiar se ajusta sozinho ao ruído do ambiente. O controle **Sensibilidade** aparece quando o microfone está ativo, com um medidor de nível: a barra fica verde quando o som passa do limiar (linha amarela).
- Análise a cada ~10 ms por AudioWorklet, com detecção de ataque. Pega notas rápidas (testado até 80 ms por nota) e a mesma nota tocada de novo.

## Limitações
- Web MIDI só funciona em **Chrome e Edge** (computador e Android). No Safari do iPhone, só o microfone.
- Microfone e MIDI exigem HTTPS (ou `localhost`).
