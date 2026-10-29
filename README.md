# Acordelot Treinos 🎹

App web (PWA) de treinos musicais para alunos da escola. O professor cria exercícios (escalas, arpejos, acordes ou um trecho gravado no teclado MIDI) e os atribui aos alunos. O aluno treina em casa com metrônomo e feedback em tempo real. **O metrônomo só acelera depois de N execuções perfeitas seguidas.**

Arquitetura, modelo de dados e decisões técnicas: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173  (modo demonstração, sem backend)
npm test           # testes de detecção, pontuação e regra de avanço
npm run build && npm run preview   # build de produção (PWA + offline)
```

Sem variáveis de ambiente, o app abre em **modo demonstração**: você escolhe um perfil (professora ou um dos alunos) e os dados ficam no navegador.

### Com Supabase
1. Crie um projeto em supabase.com e rode `supabase/migrations/0001_init.sql` no SQL Editor (ou `supabase db push`).
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Cadastre-se como **professor** (cria a escola). O painel mostra o código que os **alunos** usam no cadastro.
4. Para testar rápido, desligue "Confirm email" em Authentication → Providers → Email.

> Microfone e MIDI exigem contexto seguro: `localhost` ou HTTPS. Para testar no celular, faça o deploy (Vercel/Netlify/Cloudflare Pages servem `dist/`) ou use um túnel HTTPS.

## Como testar cada etapa

| Etapa | Onde | O que fazer |
|---|---|---|
| **1. MIDI e microfone** | *Ferramentas → Entrada* | Permita MIDI e/ou microfone. Cada nota aparece na lista com origem, nome e latência (MIDI → tela costuma ficar em poucos ms). O teclado acende. *Afinador* mostra nota, frequência e cents. |
| **2. Gravação e reprodução** | Professora → *Exercícios → Novo → Gravar* | Ative o MIDI, toque **Gravar**, espere a contagem e toque o trecho. **Parar** transforma as notas e os tempos em gabarito. Edite sem regravar: selecione notas para apagar, transponha, mude o tempo (×½, ×2), quantize e use **Ouvir**. Escalas, arpejos e acordes também podem ser gerados. |
| **3. Metrônomo e avanço** | *Ferramentas → Metrônomo* e qualquer treino | Metrônomo com agendamento Web Audio (tap tempo, compasso). No treino, cada execução perfeita acende uma bolinha; na 6ª seguida o BPM sobe. Um erro zera a contagem. |
| **4. Atribuições e execução** | Professora → *Exercícios → Atribuir*; aluno → *Hoje* | Defina repetições/dia, BPM inicial e alvo, aumento e N. O aluno dá play: nota certa e no tempo fica **verde**, errada ou fora do tempo fica **vermelha**, e a que faltou fica tracejada. A pontuação aparece ao final, o anel mostra as repetições do dia e a atribuição fica cumprida quando completa. Offline, o selo do topo mostra a fila, que sincroniza sozinha quando a rede volta. |
| **5. Painel e ranking** | Professora → *Painel*, aluno → *Ranking* | Status do dia e da semana por aluno. No detalhe do aluno: histórico, velocidade atual, melhor sequência e erros mais frequentes por nota. Ranking geral e por exercício (perfeitas na semana ou maior velocidade). |

Sem teclado MIDI à mão? Em Chrome e Edge, um teclado virtual como o [VMPK](https://vmpk.sourceforge.io/) com loopMIDI (Windows) ou o driver IAC (macOS) funciona como dispositivo MIDI.

## Instalar como app
- **PWA**: no Chrome/Edge, "Instalar app"; no Android, "Adicionar à tela inicial".
- **Android empacotado**: `npx cap init && npx cap add android` (Capacitor) apontando `webDir` para `dist`, ou uma TWA com Bubblewrap usando o `manifest.webmanifest`.

## Limitações conhecidas
- **Web MIDI só funciona em Chrome e Edge** (desktop e Android). No **Safari do iPhone** o app usa só o microfone.
- **Detecção por microfone é monofônica**: acordes só são validados via MIDI. Sem MIDI, o acorde vale tocado em arpejo.
- Use fones de ouvido no modo microfone para o clique não ser captado.
- Bateria fica fora do MVP.
