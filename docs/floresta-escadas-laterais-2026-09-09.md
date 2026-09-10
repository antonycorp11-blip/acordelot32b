# Correção dos desníveis da floresta

As três faixas com escada frontal foram substituídas por patamares amplos:
grama no topo, parede contínua de terra exposta e escada na lateral direita.
A estrada faz a aproximação por essa lateral. O topo e a escada são caminháveis;
a frente de terra tem colisão acompanhando seu contorno. Continua sendo relevo
ilustrado em 2D, sem adicionar um sistema de salto ou altura 3D.

Arte aplicada: `public/assets/regions/echo/grass_terrace_v2.png`.
A versão anterior foi preservada em disco, mas não é mais carregada.
Modo de geração: ferramenta integrada imagegen, com transparência nativa.

## Prompt final

Use case: stylized-concept. Asset: isolated transparent terrain sprite for an elevated top-down hand-painted 2D forest RPG. A broad RAISED EARTH PLATEAU with a large empty grassy flat playable upper surface, clearly taller than ground because its SOUTH/front edge is a continuous thick exposed dark brown earth cliff wall with visible horizontal soil strata, roots, pebbles and grassy overhang. Crucial layout: NO central/front staircase, front soil wall stays uninterrupted. ONE broad staircase cut into the far RIGHT side flank runs diagonally from lower-right ground up-left onto the right edge of the grassy upper plateau, viewed from the side, with visible step risers and soil below. The landform has an irregular roughly rectangular footprint, wide and shallow, width about 1.8 times height. The upper grassy surface occupies upper 65% of silhouette and is large enough for several characters to walk on. The earth wall takes lower 25%, grass rim casts a dark shadow on that wall; small tapered rocky roots at foot. Rear/top edge blends into a thin irregular fringe of grass. Restrained muted olive green fine grass, chocolate brown earth, a few small embedded gray stones. Orthographic camera looking down at 50 degrees, south/front facing the viewer, NO isometric diamond. Match storybook fantasy game realism, detailed painted texture. Entire asset centered with 5% transparent margins, genuinely transparent background outside the plateau, no backdrop, no trees, no characters, no flowers, no text, no separate floor tile, no hovering island. NO FRONT STAIRS. Strong readable height difference and open grassy TOP with a single lateral stair on right.

## Verificação

`scripts/test-forest-expansion.mjs` percorre a rota lateral de cada patamar com
uma caixa de colisão a cada 8 pixels e verifica que o centro da parede frontal
está bloqueado. Também captura Akles no topo, na escada e no acesso inferior em
844 × 390. Os demais testes de navegação continuam cobrindo os destinos do mapa.
Inventário, experiência, missões e terreno da cidade não foram alterados.
