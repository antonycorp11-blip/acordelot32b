# Acordelot — Plano de missões do Capítulo 1

Status: plano de implementação  
Objetivo: ensinar o jogo inteiro sem interromper a narrativa

## Princípio de onboarding

O Capítulo 1 não deve abrir todos os menus de uma vez. Cada sistema aparece porque Akles e Pippo precisam dele para resolver um problema imediato. Depois da demonstração guiada, o jogador recebe uma situação curta em que usa o sistema sozinho.

Cada missão principal deve cumprir pelo menos duas funções:

- avançar o vínculo entre Akles e Pippo;
- ensinar ou testar uma mecânica;
- entregar uma pista do mistério.

Tutoriais ficam registrados num Guia do Viajante e podem ser consultados novamente. Nenhuma missão principal pode travar porque o jogador vendeu, gastou ou descartou um item necessário.

## Sistemas que o primeiro capítulo precisa ensinar

| Sistema | Introdução narrativa | Validação do aprendizado |
|---|---|---|
| Movimento, câmera e HUD | Akles desperta na floresta | alcançar a luz indicada pelos Ecos |
| Ataque básico, mira e esquiva | primeiro ataque de Shinkers | derrotar uma segunda onda sem instrução passo a passo |
| Skills, recarga e Ressonância | Akles protege Pippo | combinar ataque e Skill sem esgotar o recurso |
| Efeitos, marcas e passivas | criatura resistente na estrada | abrir a ficha e usar a descrição para vencê-la |
| Ressoar Ecos | Dó, Mi e Sol reconhecem Akles | ressoar um Eco e receber fragmentos + Pó de Eco |
| Diálogo, escolhas e rastreador | chegada à vila | aceitar e acompanhar uma tarefa de Mirela |
| Coleta e ferramentas | reparo da ponte/casa | coletar madeira e pedra corretas |
| Inventário, peso, venda e descarte | mochila cheia após a coleta | liberar espaço sem perder item de missão |
| Mapa, caminhos e marcadores | viagem para Acordelot | marcar Dorn e chegar pela estrada |
| Fragmentos e síntese de notas | Eco ferido | formar a primeira nota completa |
| 12 notas, tons e semitons | coleção cromática conduzida por Pippo | montar uma escala seguindo seu padrão de intervalos |
| Escalas e acordes | oficina harmônica do Sr. Antony | escolher os graus 1–3–5 e formar uma tríade válida |
| Acordes-Cosmos | o acorde sintetizado vira constelação | equipar o cosmos e conferir os atributos recebidos |
| Partituras e subida de nível | exercício do Sr. Antony | sintetizar/usar uma partitura e distribuir atributo |
| Atributos e build | avaliação de combate | escolher uma melhoria coerente, com opção de recomendação |
| Armas separadas do personagem | oficina de Dorn | equipar e comparar a arma recebida |
| Equipamentos, slots e conjuntos | preparação para patrulha | equipar duas peças e visualizar o bônus |
| Upgrade de arma/equipamento | dano insuficiente num alvo de treino | aprimorar uma peça e vencer o teste |
| Skills e upgrade de Skill | mestre de classe | melhorar uma Skill e conferir dano/custo/requisito |
| Passivas e upgrade de passiva | desafio de especialização | ativar ou melhorar uma passiva adequada |
| Loja, moedas e limite diário | mercado de Acordelot | comprar uma poção com ouro bruto/refinado |
| Consumíveis e atalhos | patrulha fora da muralha | usar cura, escudo ou buff em combate |
| Personagens e troca de grupo | Wins e Huans ajudam numa defesa | alternar personagem para resolver duas ameaças |
| Catálogo por classe | conversa com o armeiro | filtrar itens de Teclas, Voz e Cordas |
| Gacha/sorteio | Convergência dos Ecos | realizar invocação tutorial e organizar o resultado |
| Missões diárias | quadro de Acordelot | aceitar, progredir e resgatar uma diária curta |
| Online/cooperativo | marco de ressonância da praça | tutorial opcional; nunca bloqueia a campanha solo |

O gacha ainda precisa ser implementado. Seu tutorial só entra na campanha quando existirem: probabilidades visíveis, garantia definida, histórico, regra de duplicatas e um primeiro sorteio controlado. Não deve existir botão sem explicação nem sorteio pago obrigatório para avançar.

Também faltam no código atual a ressonância não hostil dos Ecos, a construção de escalas e o equipamento de Acordes-Cosmos. Hoje os Ecos são dissipados em combate e podem soltar fragmentos/Pó de Eco; a implementação narrativa deverá oferecer a ação própria **Ressoar** e reservar o combate para Ecos corrompidos ou situações justificadas.

## Cadeia de criação musical

- **Eco:** possui uma das 12 notas cromáticas.
- **Ressoar:** interação curta de escuta, pulso ou correspondência; não é um ataque comum.
- **Recompensa:** fragmentos específicos daquela nota e Pó de Eco.
- **Nota inteira:** criada com a quantidade definida de fragmentos.
- **Coleção cromática:** reúne as 12 notas, separadas entre si por semitons; um tom corresponde a dois passos cromáticos.
- **Escala:** seleciona e ordena notas da coleção de acordo com uma fórmula de tons e semitons. A primeira ensinada é a maior (`T–T–S–T–T–T–S`).
- **Acorde:** deriva de uma escala pela combinação de graus. A primeira tríade usa `1–3–5`.
- **Acorde-Cosmos:** representação equipável do acorde, formada por estrelas/notas ligadas como constelação e responsável por bônus de atributos.

O jogador precisa completar a coleção cromática uma vez no Capítulo 1. O progresso pode atravessar várias missões, mas as notas obrigatórias devem ter fontes garantidas para evitar dependência de sorte.

## Estrutura das missões principais

### Ato I — O Som na Escuridão

#### MQ_C1_001_DESPERTAR_SEM_NOME

- História: Akles acorda na floresta sem memória.
- Ensina: movimento, câmera, interação e HUD mínimo.
- Música: paisagem sonora e altura.
- Mistério: ele reconhece direções pelo som antes de enxergá-las.

#### MQ_C1_002_SOL_BEMOL

- História: um galho quebra fora de vista; Akles identifica Sol bemol.
- Ensina: indicador de objetivo e mapa local.
- Música: uma mesma fonte produz altura e timbre.
- Mistério: Akles não sabe de onde veio esse conhecimento.

#### MQ_C1_003_CRIATURAS_DISSONANTES

- História: Shinkers cercam Akles.
- Ensina: ataque básico, mira, esquiva, dano e vida.
- Música: tensão e resolução no áudio do combate.
- Mistério: o corpo de Akles conhece técnicas que sua mente esqueceu.

#### MQ_C1_004_TRES_ECOS

- História: os Ecos Dó, Mi e Sol abrem um caminho seguro.
- Ensina: seguir entidades, reconhecer a nota de um Eco e consultar sua descrição.
- Música: tríade maior de Dó.
- Mistério: os Ecos reconhecem Akles.

#### MQ_C1_005_O_MENINO_DA_LANTERNA

- História: Pippo encontra Akles e o leva à vila.
- Ensina: companheiro, diálogo e escolha de resposta.
- Vínculo: Pippo dá a Akles um apelido provisório e divide comida.
- Mistério: Pippo percebe que Akles escuta algo que os outros não escutam.

### Ato II — Um lugar para ficar

#### MQ_C1_006_ABRIGO_DE_MIRELA

- História: Mirela acolhe Akles sob responsabilidade de Pippo.
- Ensina: aceitar missão, rastrear objetivo e repousar/salvar.
- Vínculo: Pippo assume que Akles ficará bem antes de qualquer adulto.

#### MQ_C1_007_AGUA_E_MADEIRA

- História: os dois ajudam a preparar o abrigo.
- Ensina: interação com poço, machado, coleta de madeira e regeneração de spot.
- Música: pulsação regular durante a coleta.

#### MQ_C1_008_PEDRAS_NA_PONTE

- História: a ponte para Acordelot precisa de reparos.
- Ensina: picareta, coleta de pedra, troca de ferramenta e materiais raros.
- Validação: o último recurso deve ser escolhido pelo jogador sem seta direta.

#### MQ_C1_009_MOCHILA_DE_PIPPO

- História: Pippo entrega objetos demais e brinca com a falta de organização de Akles.
- Ensina: inventário, peso/capacidade, pilhas, descarte e venda.
- Proteção: itens de missão são bloqueados contra venda e descarte.

#### MQ_C1_010_RESSOAR_ECOS

- História: Pippo impede Akles de atacar um Eco assustado e mostra que é possível entrar em sintonia com ele.
- Ensina: ação Ressoar, janela de pulso/escuta e diferença entre Eco natural e Eco corrompido.
- Recompensa: fragmentos da nota do Eco e Pó de Eco.
- Validação: o jogador ressoa sozinho com um segundo Eco de nota diferente.

#### MQ_C1_011_A_ARVORE_QUE_CANTA

- História: Akles e Pippo encontram um Eco ferido perto de uma árvore ressonante.
- Ensina: fragmentos, notas e Síntese.
- Música: 30 fragmentos formam uma nota; existem 12 notas cromáticas.
- Vínculo: Pippo guarda metade de um pingente ligado à nota criada.

### Ato III — Acordelot aprende o nome de Akles

#### MQ_C1_012_A_ESTRADA_AFINADA

- História: Akles e Pippo viajam juntos para Acordelot.
- Ensina: mapa-múndi, estradas, marcadores e acampamento.
- Combate: Pippo auxilia numa emboscada e pode ser protegido.

#### MQ_C1_013_OS_PORTOES_DE_ACORDELOT

- História: Renaldo desconfia de Akles e dos viajantes vindos da fronteira.
- Ensina: reputação local e acesso condicionado a objetivos.
- Mistério: surge o primeiro relato distorcido sobre Dissonantes.

#### MQ_C1_014_DIANTE_DO_SR_ANTONY

- História: o Sr. Antony permite que Akles permaneça, mas exige preparação.
- Ensina: ficha, nível, atributos e recomendação de build.
- Música: tônica como ponto de repouso e identidade.

#### MQ_C1_015_PARTITURA_DE_APRENDIZ

- História: Akles prova que consegue organizar fragmentos em conhecimento.
- Ensina: síntese de Partitura, XP, subida de nível e pontos de atributo.
- Validação: o jogador escolhe um atributo; a recomendação explica sem obrigar.

#### MQ_C1_016_A_OFICINA_DE_DORN

- História: Dorn prepara Akles para os perigos fora das muralhas.
- Ensina: arma flutuante/separada, atributos da arma, equipar e aprimorar.
- Validação: comparar duas armas e escolher uma para um alvo de treino.

#### MQ_C1_017_VESTIR_A_HARMONIA

- História: uma patrulha precisa de equipamento adequado.
- Ensina: slots, raridade, sets, bônus de 2/4 peças e upgrade de equipamento.
- Proteção: materiais exatos do primeiro upgrade são concedidos e reservados.

#### MQ_C1_018_DOMINAR_O_PROPRIO_SOM

- História: um instrutor avalia o estilo de Akles.
- Ensina: tela padrão de Skills, dano, custo, cooldown, requisito, passiva e upgrades.
- Validação: melhorar uma Skill e uma passiva, depois usar ambas em treino.

#### MQ_C1_019_AS_QUATRO_FORMAS

- História: Wins e Huans ajudam a defender uma caravana.
- Ensina: Teclas, Voz, Cordas e Ritmo; troca de personagem e catálogo por classe.
- Música: timbre e função musical não são a mesma coisa.
- Regra: Wins e Huans demonstram identidades diferentes, sem substituírem Pippo emocionalmente.

#### MQ_C1_020_MERCADO_E_RESSONANCIA

- História: Pippo prepara suprimentos para uma exploração dos dois.
- Ensina: loja, ouro bruto/refinado, poções, limites diários e expansão de mochila.
- Validação: usar um consumível numa luta curta.

#### MQ_C1_021_CONVERGENCIA_DOS_ECOS

- História: a melodia de Akles atrai um Eco ou aliado para uma partitura de vínculo.
- Ensina: gacha/sorteio, probabilidades, garantia, duplicatas e histórico.
- Primeira invocação: gratuita e controlada, sem moeda premium.
- Condição: só implementar após o sistema de gacha estar funcional e auditável.

#### MQ_C1_022_DOZE_NOTAS_UMA_ESCALA

- História: a coleção cromática de Pippo é completada com as notas reunidas ao longo da jornada.
- Ensina: círculo das 12 notas, semitom como um passo e tom como dois passos.
- Ação: o jogador percorre `T–T–S–T–T–T–S` para construir sua primeira escala maior.
- Proteção: notas essenciais têm obtenção garantida por missões e ressonâncias específicas.

#### MQ_C1_023_CONSTELACAO_DO_ACORDE

- História: o Sr. Antony mostra que uma escala pode produzir forças menores com identidades próprias.
- Ensina: graus da escala e formação da tríade pelos graus `1–3–5`.
- Criação: a tríade se transforma num Acorde-Cosmos visual, como uma constelação musical.
- Equipamento: o jogador equipa o cosmos e observa os atributos concedidos.
- Validação: trocar entre dois cosmos simples para adaptar a build a um desafio.

#### MQ_C1_024_UMA_MELODIA_PARA_PIPPO

- História: Akles e Pippo compõem uma pequena melodia no lugar secreto do menino.
- Ensina: combinação simples de notas/ritmo e registro no diário musical.
- Vínculo: o jogador escolhe o caráter da melodia, não o resultado do cânone.
- Persistência: a melodia e o pingente não podem ser apagados pelo sequestro.

### Ato IV — A Nota Ausente

#### MQ_C1_025_SOMBRAS_SEM_VOZ

- História: áreas de Acordelot perdem todo o som; símbolos apontam para os Remanescentes.
- Ensina: estados negativos, resistência, silêncio de Skills e preparação de build.
- Mistério: alguém estuda os horários de Pippo.

#### MQ_C1_026_A_NOITE_DO_SILENCIO

- História: uma falsa emergência afasta guardas e aliados.
- Ensina: combate mais longo, consumíveis, troca de personagem e leitura de efeitos.
- Online: se houver companhia, objetivos e dano são compartilhados; a cena funciona solo.

#### MQ_C1_027_O_SEQUESTRO_DE_PIPPO

- História: dois Dissonantes contratados capturam Pippo.
- Combate: ambos têm funções distintas e usam ferramentas preparadas para neutralizar Akles.
- Perspectiva pública: parecem agentes dos Remanescentes do Silêncio.
- Verdade secreta: a contratação foi fabricada por Klassíkia para manter o ciclo.
- Resultado fixo: Akles perde sem parecer incompetente; ele escolhe salvar civis ou alcançar Pippo por segundos, mas o sequestro ocorre.

#### MQ_C1_028_O_MENINO_QUE_NUNCA_EXISTIU

- História: todos afirmam que Pippo nunca existiu.
- Mudança de mundo: quarto, diálogos, registros e relações são reescritos.
- Persistências: Akles, pai adotivo, pingente, melodia e reação dos Ecos.
- Fecho: o pai diz apenas “Eu sei”.

### Ato V — As pistas para Dissonia

#### MQ_C1_029_MEMORIA_IMPOSSIVEL

- História: Akles tenta provar a existência de Pippo.
- Ensina: diário de pistas e reconstrução de acontecimentos.
- Resultado: provas comuns foram alteradas; resíduos musicais não foram totalmente apagados.

#### MQ_C1_030_A_MELODIA_INCOMPLETA

- História: a música compartilhada provoca lembranças fragmentadas nos Ecos.
- Música: ausência, pausa e nota esperada.
- Pista: o som de pagamento ouvido na noite não pertence aos sequestradores.

#### MQ_C1_031_DOIS_ROSTOS_DISSONANTES

- História: testemunhas e rastros identificam os dois sequestradores.
- Pista: ambos receberam pagamento e instruções com aparência remanescente.
- Cuidado: a descoberta acusa indivíduos, não o povo de Dissonia.

#### MQ_C1_032_CINZAS_DO_SILENCIO

- História: Akles encontra um ponto de entrega abandonado.
- Pista: símbolos dos Remanescentes são perfeitos demais e não apresentam desgaste real.
- Contradição: um ataque remanescente tenta recuperar as mesmas instruções.

#### MQ_C1_033_A_TESTEMUNHA_DISSONANTE

- História: um Dissonante impede que Akles seja morto e explica que Dissonia não responde pelos sequestradores.
- Decisão: confiar parcialmente ou manter distância muda diálogos, não bloqueia pistas.
- Revelação: os dois criminosos partiram para Dissonia esperando o restante do pagamento.

#### MQ_C1_034_PERMISSAO_PARA_PARTIR

- História: o Sr. Antony autoriza a investigação além da fronteira.
- Ensina: preparação de viagem, objetivos regionais e conteúdo recomendado.
- Secundárias não concluídas continuam disponíveis; nenhuma expira silenciosamente.

#### MQ_C1_035_O_PAIS_ENTRE_FREQUENCIAS

- História: Akles atravessa a fronteira a pé e avista Dissonia.
- Gancho: a melodia de Pippo toca sozinha; uma voz afirma que o ciclo falhou.
- Fim: desbloqueia o Capítulo 2 sem revelar Klassíkia como mandante.

## Missões secundárias planejadas

### Vínculo com Pippo

- SQ_PIPPO_001_INSTRUMENTO_DE_BOLSO — construir um instrumento simples.
- SQ_PIPPO_002_O_ECO_ASSUSTADO — cuidar de um Eco sem combatê-lo.
- SQ_PIPPO_003_LUGAR_SECRETO — explorar o esconderijo de Pippo.
- SQ_PIPPO_004_DESENHO_PERDIDO — recuperar um desenho que muda após o sequestro.
- SQ_PIPPO_005_PROMESSA_NA_PONTE — diálogo opcional que retorna como memória.

### Educação musical

- SQ_MUS_001_DA_ONDA_A_NOTA — frequência e altura.
- SQ_MUS_002_PASSOS_NO_COMPASSO — pulsação e subdivisão.
- SQ_MUS_003_TOM_E_SEMITOM — caminho físico representando intervalos.
- SQ_MUS_004_VOLTA_A_TONICA — tensão e resolução.
- SQ_MUS_005_DO_MI_SOL — formação de tríade.
- SQ_MUS_006_MAIOR_OU_MENOR — reconhecer caráter sem tratar emoção como regra absoluta.
- SQ_MUS_007_O_VALOR_DA_PAUSA — silêncio musical versus Silêncio de Tacéria.
- SQ_MUS_008_CIRCULO_CROMATICO — localizar vizinhos por semitons entre as 12 notas.
- SQ_MUS_009_OUTRA_TONICA — construir a mesma fórmula maior partindo de outra nota.
- SQ_MUS_010_ACORDES_DA_ESCALA — descobrir novas tríades dentro de uma escala.
- SQ_MUS_011_CEU_HARMONICO — comparar atributos de diferentes Acordes-Cosmos.

### Sistemas e economia

- SQ_SYS_001_QUADRO_DE_TAREFAS — aceitar e concluir uma missão diária.
- SQ_SYS_002_MOCHILA_MAIOR — comprar a primeira expansão.
- SQ_SYS_003_OURO_DA_TERRA — coletar, vender ou refinar ouro bruto.
- SQ_SYS_004_CONJUNTO_INCOMPLETO — ativar bônus de duas peças.
- SQ_SYS_005_SEGUNDA_AFINACAO — melhorar arma sem consumir recurso de história.
- SQ_SYS_006_TREINO_DE_PASSIVA — comparar dois caminhos de build.
- SQ_SYS_007_RESSONANCIA_COMPARTILHADA — entrar ou criar sala online, opcional.

### Investigação e mundo

- SQ_INV_001_MARCA_NA_MURALHA — símbolo falsificado dos Remanescentes.
- SQ_INV_002_O_GUARDA_DA_SEGUNDA_SOMBRA — lembrança incompleta de Pippo.
- SQ_INV_003_CARTA_SEM_TINTA — documento reescrito pelo ciclo.
- SQ_INV_004_O_DISSONANTE_ACUSADO — inocentar um viajante.
- SQ_INV_005_FREQUENCIA_RESIDUAL — seguir vestígios com a Audição Primordial.

## Ritmo de desbloqueio

- Missões 1–5: somente HUD essencial.
- Missões 6–11: coleta, inventário, ressonância de Ecos e síntese.
- Missões 12–18: mapa, progressão, build, armas, equipamentos, Skills e passivas.
- Missões 19–24: personagens, catálogo, loja, gacha, escalas, Acordes-Cosmos e vínculo final com Pippo.
- Missões 25–28: prova integrada dos sistemas durante o sequestro.
- Missões 29–35: investigação livre com menos instruções e mais autonomia.

## Requisitos técnicos do sistema de campanha

As missões narrativas devem ser separadas das missões diárias atuais.

Cada definição precisa conter:

- ID estável e versão;
- pré-requisitos por ID;
- objetivos sequenciais;
- gatilhos de conversa, região, combate, coleta, crafting e interface;
- alterações persistentes de NPC, mapa e diálogo;
- itens reservados e recuperação de itens obrigatórios;
- recompensa e desbloqueios;
- resumo para o diário;
- conceito musical e tutorial associado;
- suporte solo e regra cooperativa;
- telemetria local de abandono/falha, sem gravar eventos a cada frame no Supabase.

Estados mínimos: `locked`, `available`, `active`, `ready`, `completed` e `failed_recoverable`.

O salvamento deve registrar eventos canônicos, não apenas flags de diálogo. Exemplos:

- `met_pippo`
- `composed_pippo_melody`
- `witnessed_pippo_abduction`
- `world_forgot_pippo`
- `identified_two_dissonants`
- `departed_for_dissonia`

## Ordem de implementação

1. Criar o modelo de dados e salvamento das missões principais.
2. Criar diário com abas História, Secundárias, Diárias e Pistas.
3. Implementar as missões 1–11 como vertical slice do onboarding.
4. Validar coleta, inventário e síntese sem softlocks.
5. Implementar a ação Ressoar e a obtenção de fragmentos/Pó de Eco.
6. Implementar progressão/build das missões 12–18.
7. Implementar coleção cromática, criação de escalas e Acordes-Cosmos equipáveis.
8. Projetar e implementar o gacha antes de incluir a missão 21.
9. Implementar vínculo, sequestro e mudança global de memória.
10. Construir estrada/fronteira até Dissonia e o encerramento.
11. Fazer uma passagem completa solo e outra cooperativa.
