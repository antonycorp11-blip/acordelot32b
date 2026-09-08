# Revisão de biomas — 8 de setembro de 2026

Base preservada: commit d1c8d34 do Claude. Os quatro mapas e seus portais continuam separados; nenhuma conta, experiência, inventário ou missão foi reiniciada.

## Entrega

- Água: shader GLSL real em WebGL, ondas em coordenadas do mundo, cáusticas, brilhos, profundidade contínua e faixa de margem molhada. Uma única superfície por câmera; não há desenho independente por tile. Resolução interna limitada e fallback Canvas animado caso WebGL não esteja disponível.
- Chão: base contínua de musgo/grama e mistura de materiais por máscaras suavizadas. Cache limitado a 24 blocos e margem de amostragem maior que três vezes o raio de desfoque, evitando emendas entre blocos. Pavimento da cidade e mapa editado mantidos.
- Floresta dos Ecos: cinco espécies, cinco clareiras, bosques de densidade variável, trilhas conectadas, ilha alcançável por ponte, margem com vegetação. Preservados Santuário, 12 Ecos, ruínas, lago, fronteira e portais.
- Cavernas: observatório, jardim de ametistas, pedreira, novas formações, ruínas e piscinas; caminhos principais livres. Água agora bloqueia movimento nos dois biomas; pontes usam passagem seca.
- Atlas: zoom 1–6×, arrasto, localizar jogador com direção, região inteira, lista de locais e portais, filtros de recursos e locais, rótulos em tamanho fixo e prevenção de sobreposição. DG com enquadramento do setor útil.

## Validação

`npm run lint`, `npm run build`, `scripts/test-crystal-dungeon.mjs` e `scripts/test-biome-polish.mjs`. Os scripts de navegador aceitam PLAYWRIGHT_MODULE e usam o localhost:3000. A validação usa 844×390, sem login ou alterações em contas reais. Verifica conectividade dos locais/portais, cinco espécies, clareiras livres, GLSL compilado, água realmente animada e controles do atlas. O teste da DG cobre os 12 Ecos, 54 inimigos, oito salas, região salva e tela de preparação.

Limitação: teste em navegador Chrome com viewport de celular não substitui medição de FPS no iPhone/PWA real. O build mantém o aviso pré-existente de bundle grande; não foi feita uma reestruturação de carregamento de todos os assets do jogo.

## Artes e prompts finais

Modo: ferramenta integrada imagegen (sem CLI/API externa). Originais preservados no diretório generated_images do Codex. Arquivos usados pelo projeto:

### Chão — public/assets/regions/echo/forest_floor_v3.png

Use case: stylized-concept. Asset type: seamless repeating ground texture for an overhead 2D fantasy RPG. Square 1024x1024. A quiet natural forest floor of fine soft green moss and very short grass, tiny scattered sage blades, a few subtle brown soil flecks. Fine scale uniform detail all across the canvas, viewed perfectly straight down, no perspective, low contrast, diffuse even light, restrained olive emerald sage palette. Hand-painted pixel-art-inspired detailed game art. The whole square is flat walkable ground; not a scene. Seamlessly tileable on all four edges with no seams. No large leaves, no flowers, no rocks, no path, no central focal feature, no radial pattern, no symmetry, no border, no grid, no text. Keep surface legible and quiet beneath characters.

### Salgueiro — public/assets/regions/echo/silver_willow.png

Use case: stylized-concept. Asset type: ONE transparent tree sprite for a beautiful overhead fantasy RPG enchanted forest. A broad ancient silverleaf willow, asymmetrical graceful curved warm brown trunk, rounded layered canopy with long dangling pale mint and turquoise foliage, small subtle golden seed lights, visible roots, lush and magical but botanical. Viewpoint three-quarter overhead orthographic top-down RPG camera, full entire tree visible with generous transparent padding. Beautiful crisp hand-painted pixel-art-inspired style, cool sage green foliage with highlights and deep teal shadows. Genuine alpha transparent background. No ground square, no pedestal, no scenery, no other trees, no characters, no text, no logo. Sprite must remain readable reduced to 130 pixels tall.

### Três espécies — public/assets/regions/echo/woodland_species.png

Use case: stylized-concept. Asset type: transparent forest tree sprite atlas for a polished 2D top-down fantasy RPG. Layout STRICT: THREE equally sized columns, ONE row, three separate full trees, no overlaps between columns, generous transparent gutters. Left column one mature oak with layered olive green and copper-gold foliage; middle column one elegant full emerald spruce conifer; right column one flowering tree with restrained dusty rose blossoms and sage leaves. All three grounded on exactly the same bottom baseline, visible trunks and roots. Whole trees visible, no cropping. Similar visual weight, overhead three-quarter orthographic RPG viewpoint, detailed crisp hand-painted pixel-art-inspired illustration, sophisticated natural shadows. Genuine alpha transparent background. No ground patches or base squares, no labels, no text, no grid, no scenery, no characters. Landscape canvas. These are alternate species to complement a detailed silverleaf willow, NOT simple geometric/cartoon trees.

Os intervalos horizontais do atlas foram medidos e configurados no renderer; não são presumidos como três células iguais.
