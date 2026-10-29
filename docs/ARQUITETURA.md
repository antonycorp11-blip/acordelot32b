# Arquitetura — Acordelot Treinos (MVP)

## Decisões técnicas principais

| Decisão | Por quê |
|---|---|
| **Vite + React + TypeScript**, sem framework de UI | Bundle pequeno (~76 kB gzip), build rápido, o mesmo `dist/` vira PWA ou app Android (Capacitor/TWA). `base: './'` permite servir de qualquer pasta. |
| **Supabase** (Auth + Postgres + RLS + RPC) | Login pronto, regras de acesso no banco (Row Level Security) e nenhum servidor próprio para manter. |
| **Regra de avanço no banco (trigger)** e espelhada no cliente | O aluno não consegue alterar a própria velocidade (só insere execuções). O cliente aplica a mesma regra de forma otimista para treinar offline. |
| **Um único `AudioContext`** | Metrônomo, síntese do gabarito e microfone usam o mesmo relógio, então os tempos são comparáveis. |
| **MIDI convertido para o relógio "ouvido"** (`getOutputTimestamp`) | O `timeStamp` do evento MIDI (performance.now) vira tempo de áudio já descontada a latência de saída: o clique que o aluno ouve e a nota que ele toca ficam na mesma escala. |
| **Metrônomo com agendamento lookahead** | Cada clique é agendado com `osc.start(time)` (precisão de amostra). Um Worker acorda o agendador a cada 20 ms só para enfileirar os próximos 120 ms; atrasos desse timer não deslocam o clique. **Nada de setTimeout para tocar o clique.** |
| **YIN para altura (microfone)** | Algoritmo clássico, preciso para instrumentos monofônicos e barato (janela de 2 períodos da nota mais grave do instrumento). |
| **Fila de sincronização (outbox) com UUID no cliente** | Execução feita offline fica no `localStorage`; quando volta a rede, vai por `upsert … ignoreDuplicates`. Reenvio não duplica nem dispara o trigger duas vezes. |
| **Modo demonstração** | Sem `VITE_SUPABASE_*`, a mesma interface `Api` usa `localStorage` com dados de exemplo, o que permite testar tudo sem backend. |

## Visão geral

```
 Navegador (PWA)                                                Supabase
┌────────────────────────────────────────────────────────┐    ┌──────────────────────────┐
│ Teclado MIDI ─ Web MIDI ─┐                              │    │ auth.users               │
│                          ├─► InputHub ─► Scorer ─► UI   │    │ profiles / schools       │
│ Microfone ─ YIN ─────────┘   (relógio de áudio)         │    │ exercises / assignments  │
│ Metronome (Web Audio, lookahead)                        │    │ executions ─► trigger    │
│                                                         │    │   (regra de avanço)      │
│ Execução ─► outbox (localStorage) ──── online ─────────────► │ school_ranking() RPC     │
│ Leituras ◄─ cache local ◄────────────────────────────────── │ RLS por escola/papel     │
│ Service Worker: app shell offline                       │    └──────────────────────────┘
└────────────────────────────────────────────────────────┘
```

## Modelo de dados

```
schools (id, name, join_code)                 ── 1:N ── profiles
school_secrets (school_id, teacher_code)      ── só professores leem
profiles (id=auth.users.id, school_id, full_name, role[teacher|student], instrument)
exercises (id, school_id, created_by, title, kind[scale|arpeggio|chord|recording], instrument,
           notes jsonb [{midi, beat, dur}], bpm_ref, beats_per_bar, timing_tol_ms, pitch_tol_cents)
assignments (id, exercise_id, student_id, reps_per_day, start_bpm, target_bpm, bpm_step,
             streak_required (padrão 6), current_bpm, current_streak, active)
executions (id uuid do cliente, assignment_id, student_id, exercise_id, performed_at, bpm,
            hits, errors, missed, score, perfect, note_errors jsonb {"C4":2}, input_mode)
```

- O gabarito fica em **batidas** (não em segundos), então a mesma gravação serve para qualquer BPM. Notas com o mesmo `beat` formam um acorde.
- O "cumprido no dia" é calculado: execuções da atribuição no dia ≥ `reps_per_day`.
- Ranking: função `school_ranking(p_since)` (SECURITY DEFINER) agrega por aluno × exercício, para o aluno ver a turma sem ler execuções alheias.

### Segurança (RLS)
- Todo acesso é restrito à escola do usuário (`my_school()`).
- Exercícios e atribuições: só o professor cria e edita.
- Execuções: o aluno só insere para atribuições dele (trigger revalida) e nunca edita ou apaga.
- O papel (`role`) não pode ser alterado pelo próprio usuário.

## Estrutura de pastas

```
src/
  types.ts              tipos de domínio + tabela de instrumentos
  lib/                  áudio e música (sem React)
    music.ts            notas, escalas, tríades, parser, transpor/quantizar, acordes→arpejo
    pitch.ts            YIN + RMS
    audio.ts            AudioContext único, clique, síntese, conversão de relógio
    metronome.ts        metrônomo lookahead
    inputHub.ts         Web MIDI + microfone → eventos de nota com timestamp de áudio
  engine/               regras puras (testadas)
    scorer.ts           avaliação nota a nota (tempo, afinação, acordes, erros por nota)
    progression.ts      regra de avanço (espelho do trigger SQL)
    stats.ts            cumprimento diário/semanal, ranking, erros frequentes
  data/
    api.ts              contrato Api + escolha Supabase/Demo
    supabaseApi.ts      implementação Supabase (com cache offline)
    demoApi.ts          implementação localStorage + dados de exemplo
    outbox.ts           fila de sincronização + estado otimista
    cache.ts            cache das leituras
  ui/                   componentes visuais (kit, piano roll, teclado, afinador, permissões)
  pages/                telas (Login, StudentHome, Practice, TeacherDashboard, StudentDetail,
                        Exercises, ExerciseEditor, Ranking, Tools)
supabase/migrations/    esquema, RLS, triggers e RPC
public/                 manifest, service worker, ícones
tests/                  vitest (detecção, pontuação, regra de avanço, teoria)
```

## Limitações conhecidas (MVP)
1. **Web MIDI** existe só em Chrome e Edge (desktop e Android). No **Safari do iPhone** não há Web MIDI: o app detecta isso (`hub.midiSupported`) e usa só o microfone.
2. **Microfone monofônico**: o detector reconhece uma nota por vez. **Acordes não são validados pelo áudio.** Sem MIDI, o acorde é convertido em arpejo (`expandChordsForMic`) e o aluno toca as notas uma a uma.
3. No microfone, a nota é aceita em qualquer oitava (erro de oitava é comum no detector e em instrumentos transpositores). A afinação em cents continua valendo.
4. O clique do metrônomo pode vazar no microfone: use fones de ouvido. A latência de entrada do microfone é ajustável em *Ferramentas → Entrada*.
5. Bateria e tablatura estão fora do MVP.
