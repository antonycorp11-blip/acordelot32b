# Direção dos cenários — proposta para aprovação

## Limite desta entrega

Correção aplicada: o renderizador de texturas dos novos biomas deixa de atuar
em Acordelot e seus arredores. O tileset original e a edição manual do mapa
continuam responsáveis por esse chão. A água permanece numa camada separada.
Não há alteração de missões, inventário, experiência ou dimensões dos mapas.

O restante deste documento é planejamento, não uma descrição de cenários já
implementados. Primeiro validar um trecho jogável; só depois levar a direção
visual aprovada para o restante. Não gerar outro pacote grande de artes antes
de fechar enquadramento, escala e necessidades desse trecho.

## Diagnóstico do código atual

- A floresta tem 300 × 220 tiles, mas boa parte da composição nasce de elipses
  de chão e distribuição aleatória de árvores. Clareiras sem conteúdo marcante
  viram espaços vazios; variar espécies não resolve isso sozinho.
- O santuário usa um altar pequeno, um arco e pedras em disposição circular.
  Falta uma paisagem que comunique um lugar habitado pelos ecos, mesmo sem texto.
- A caverna de 280 × 200 tiles é predominantemente uma grande superfície com
  cristais espalhados. Precisa de paredes, desníveis aparentes e percursos que
  se revelem, em vez de parecer um campo aberto com outro piso.
- O chão ganhou máscaras suaves, mas a mesma imagem repetida em duas escalas
  não substitui margens, raízes, taludes e transições desenhadas para o local.
- A água já tem um shader próprio. Ainda precisa de direção visual: margens,
  profundidade e ondas discretas. Mais brilho não significa água melhor.
- O atlas mostra pontos e nomes, mas precisa comunicar áreas, passagens e
  destinos. Alguns nomes e posições diferem dos portais reais; revisar usando
  os dados dos portais como fonte, não coordenadas duplicadas.

## Trecho-piloto: chegada ao Santuário dos Ecos

Trabalhar somente no mapa `floresta_ecos`, dentro de um envelope aproximado de
colunas 126–174 e linhas 102–150, mantendo os pontos de entrada existentes.
O envelope delimita a edição, não um retângulo visível de textura.

Percurso: chegada entre árvores → curva de descoberta → travessia curta →
clareira do santuário. A paisagem deve apresentar um assunto por vez.

1. **Chegada:** copas agrupadas nas laterais, solo de folhas e raízes junto aos
   troncos, trilha legível de 3–4 tiles livres. Sem árvores sobre a faixa de
   caminhada; a copa também conta na verificação visual, não só o colisor.
2. **Curva:** pedras baixas e vegetação conduzem o olhar. O ponto focal aparece
   parcialmente antes de a clareira abrir. Evitar uma avenida reta e vazia.
3. **Travessia:** riacho estreito, margens de terra e pedra, ponte proporcional
   ao personagem. Água contínua sob o tabuleiro, colisores nas margens e
   passagem realmente caminhável. Sem uma faixa de chão desenhada sobre a água.
4. **Revelação:** árvore ancestral com raízes abraçando uma estrutura musical
   antiga. Altar integrado ao terreno, não uma peça pequena no centro de um
   círculo. Copas emolduram a cena sem cobrir Akles ou a interação.
5. **Vida:** pequenos grupos de ecos próximos ao foco, com comportamentos de
   aproximação, repouso e resposta musical. Reaproveitar os ecos existentes;
   não aumentar recompensas nem inventar novos sistemas de captura nesta etapa.

O ponto focal deve ser reconhecível numa captura de celular sem HUD explicativo.
O jogador deve enxergar a continuação do caminho na maior parte do percurso.
Medir o tempo caminhando na velocidade real; não prometer duração pelo tamanho
do grid. Um pequeno desvio opcional deve voltar à trilha, sem becos gratuitos.

### Artes necessárias para o piloto

Produzir em lotes pequenos e verificar já dentro da câmera do jogo:

- Uma árvore ancestral/estrutura central, com base e copa separáveis para
  ordenação e transparência quando o jogador estiver atrás.
- Variações de borda de terra, raízes, musgo e folhas; usar como detalhes
  sobrepostos com transparência, nunca placas retangulares opacas.
- Margens de riacho e pedras baixas em peças complementares, com cantos e
  curvas que não exponham a malha de tiles.
- Adaptar a ponte existente se perspectiva e encaixe funcionarem; gerar outra
  somente se o teste mostrar que ela não serve.

Todas as peças compartilham perspectiva, direção de luz e escala. Preservar
áreas internas opacas no recorte; testar alpha sobre fundo claro e escuro.
Não usar uma ilustração completa como cenário: chão, obstáculos, água e props
continuam elementos reais, com profundidade visual e colisão correspondentes.

## Plano por região após aprovação do piloto

### Floresta dos Ecos

Organizar conjuntos de árvores por habitat: salgueiros junto à água, árvores
floridas nas clareiras e árvores altas nos trechos fechados. Evitar misturar
todas as espécies aleatoriamente em todo lugar. Alternar passagem estreita,
clareira, vista da água e ruína; nenhuma clareira deve existir só para preencher
espaço. Ruínas do Conservatório precisam de paredes incompletas, piso gasto e
um pátio reconhecível, não só colunas espalhadas.

### Fronteira Pétrea

Fazer uma aproximação gradual dentro da região: menos flores, mais cascalho,
raízes expostas, vegetação baixa e afloramentos. Só depois introduzir rocha
escura e fendas de cristal. A entrada deve parecer inserida num paredão.
Não revelar Dissonía por placas ou diálogos antes da hora da história.
Preservar a transição de mapas criada por Claude; não reanexar a DG ao mundo.

### Cavernas de Cristal — região de exploração

Dividir a leitura espacial em vestíbulo, galeria com água, salão monumental e
aproximação da fenda. Usar paredes contínuas, pilares rochosos grandes e pontes
sobre abismos para dar forma aos percursos. Cristais crescem em veios e grupos
na rocha; recursos coletáveis permanecem distintos da decoração. Luz ciano
perto da água e ametista perto da fenda, com áreas de descanso visual entre elas.
Sem casas de floresta colocadas dentro da caverna como substitutas de cenário.

### Cristal Profundo — DG isolada

Preservar regras de entrada, seletor de dificuldade, recompensas e salas
existentes enquanto se refaz o visual. Dar identidade às salas: mineração
abandonada, galeria partida, reservatório subterrâneo e câmara do boss.
O vazio externo deve ser enquadrado por rocha, profundidade e sombras; não
apenas piso cortado contra preto. Telegráficos, monstros e baús precisam ter
contraste superior ao cenário. Não aumentar quantidade de inimigos como
substituto de uma boa arquitetura ou alterar balanceamento nesta reforma.

## Água, chão e atlas

- Água: reduzir repetição visível das cáusticas, ondas conforme o ambiente,
  espuma apenas em margens apropriadas e transição rasa/profunda contínua.
  Testar no Safari/iPhone real; manter fallback e teto de resolução do shader.
- Chão: material de base pouco contrastado; detalhes em manchas de tamanhos
  diferentes e posicionamento intencional. Bordas de caminho com terra, folhas
  e pedras. Não aplicar novas texturas globais à cidade.
- Atlas: trilhas e travessias legíveis, silhuetas de água e paredões, ícones
  distintos para santuário, recurso, saída e DG. Destino e posição do jogador
  em primeiro plano. Agrupar recursos ao afastar o zoom; separar ao aproximar.
  Mostrar conexões coerentes, sem sugerir uma rota que atravesse água ou rocha.

## Ordem de execução e aprovação

1. Restaurar chão de Acordelot e proteger o escopo com teste de regressão.
2. Construir apenas o piloto com composição e passagem funcionais.
3. Comparar antes/depois no mesmo enquadramento horizontal (844 × 390 e uma
   segunda proporção de celular); mostrar chegada, travessia e revelação.
4. Aprovação visual do usuário. Se não funcionar, corrigir o piloto sem
   espalhar a solução para todos os mapas.
5. Expandir floresta; depois fronteira; depois cavernas; por último visual da
   DG. Atualizar atlas conforme cada trecho realmente mudar.

Critérios de saída de cada etapa: rotas alcançáveis, ausência de emendas
quadradas perceptíveis, personagem legível, recortes sem buracos, passagem de
ponte correta, efeitos sem cobrir combate e desempenho comparado no mesmo
aparelho. Testes automáticos não substituem aprovação visual.
