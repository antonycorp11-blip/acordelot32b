# Floresta dos Ecos — água, habitats e relevo

## Escopo e preservação

Esta entrega continua os commits `2055743`, `8f9ada0` e `f6a3fbb` do Claude,
preservando o recorte corrigido do Akles, a suavização sem Canvas filter,
os quatro habitats musicais e o Seu Tônico na Clareira do Primeiro Canto.
Os dois PNGs soltos na raiz do projeto pertencem ao usuário e não foram tocados.
Nenhuma conta, experiência, inventário ou missão foi resetada.

- Piso 9010 da floresta agora usa pedra antiga com musgo, sem o bege anterior.
- Ecos extras também respeitam o habitat da nota. Mantidos 34 ecos no total.
- Guardião das Teclas/Sentinela do Órgão apenas nas ruínas da floresta, nível 12.
- 18 criaturas novas de dois tipos, com combate e recompensas do sistema real,
  alcance de agressão curto, fora das clareiras de ensino.
- Duas cachoeiras, novas lagoas conectadas por riachos, travessias, três
  escadarias entre taludes, maciços rochosos e depressões com colisão.
- Relevo continua sendo geometria 2D com bloqueio das faces e passagem nas
  escadas; não é um motor novo de altura 3D, salto ou queda.
- Arcos ilustrados substituem os portais desenhados com retângulos. Destinos
  e regras de acesso não mudam. Recursos em água nova vão para a margem seca.

## Artes geradas

Modo: ferramenta integrada imagegen, sem CLI. PNGs com alpha preservado;
somente a textura de pavimentação é opaca. Caminhos relativos ao repositório:

- `public/assets/regions/echo/old_stone_path_v1.png`
- `public/assets/regions/echo/forest_waterfall_v1.png`
- `public/assets/regions/echo/grass_terrace_v1.png`
- `public/assets/regions/echo/region_arch_v1.png`
- `public/assets/regions/echo/woodland_fauna_v1.png`
- `public/assets/regions/echo/forest_mountain_v1.png`

## Prompts usados

### Pavimentação
Use case: stylized-concept. Asset: seamless top-down tileable game ground texture, square opaque image. Weathered small irregular grey-green stone paving remnants half overtaken by fine soft moss and little blades of grass. Stones mostly muted cool olive slate grey, never beige sand, never marble, no giant cracks. Moss in joints, patches where paving is missing, restrained contrast, fine scale, uniform lighting, no shadows from unseen objects, no perspective or horizon. Hand-painted 2D storybook RPG terrain, perfectly seamless all four edges. NO scenery, trees, buildings or text.

### Cachoeira
Use case: stylized-concept. Asset: isolated transparent 2D RPG environment landmark. A broad moss-covered grey rock escarpment with a beautiful narrow waterfall cascading from a tiny spring at its top down two uneven rocky shelves, exposed roots and lush grassy top, small ferns. Almost top-down elevated three-quarter front orthographic game camera. Full waterfall including foot visible, no horizon, no sky, NO big ground island, NO rectangular background. Lower cascade ends in translucent pale turquoise spray that can overlay game water. Hand-painted high quality storybook fantasy, natural soft greens and slate rock, afternoon light upper left, no glowing crystals. One silhouette centered with ample transparent margin, genuine transparent PNG.

### Talude e escadaria
Use case: stylized-concept. Transparent sprite for top-down 2D RPG: one WIDE low grass-covered rocky terrace embankment, horizontal grey stone cliff face with exposed strata, tufts of moss, ferns and trailing roots, green grassy walkable upper rim. At the CENTER a broad worn stone staircase ascends from bottom/front to top/back through the ledge, both sides taper organically into rocks. Elevated three-quarter front orthographic camera, hand-painted storybook fantasy same as quality 2D RPG assets. Landscape 3:1 silhouette entirely visible with 8% margin. No sky, no rectangular ground, no background, genuine transparency. Steps walkable visibly clear, not covered in vines. No trees or characters. Restrained colors cool olive grass/slate grey stone, no neon, no text.

### Arco
Use case: stylized-concept. Single transparent PNG portal arch sprite for a hand-painted top-down fantasy musical RPG. Ancient carved sandstone arch made of elegant curved interlocking stones, bronze lyre at keystone, ivy and small ferns around foot, organic weathering and restrained gold inlays. Wide open archway EMPTY and genuinely transparent inside, tall enough for people to walk through. Entire object visible front three-quarter elevated orthographic view, no horizon, NO floor plate, no background, no glowing disk filling opening, no text, no people. Light upper left, muted grey moss and ivory stone, clean readable silhouette, generous transparent margins.

### Criaturas
Use case: stylized-concept. Asset: transparent sprite sheet for gentle fantasy woodland monsters in top-down RPG. EXACT grid of 4 columns and 2 rows, evenly spaced equal cells, generous transparent gutters. ROW 1: same small rounded moss boar in 4 poses: idle, walking foot forward, gently charging head down, recoiling. The boar has slate grey round body, moss tuft on back, acorn-like small tusks, friendly amber eyes, NOT scary. ROW 2: same small mushroom guardian in 4 poses: idle, walking, swinging short wooden arm, recoiling. Beige mushroom body, moss green cap, round eyes, leaf scarf, no weapon. All eight sprites face three-quarter toward viewer's RIGHT. Keep size, anatomy, palette consistent across frames and feet at same baseline in each cell. Hand-painted crisp storybook 2D RPG art, elevated orthographic camera, full bodies no cropping. No scenery, no text, no shadows rectangles. Genuine transparent background including gutters. Square-ish sheet landscape.

### Maciço rochoso
Use case: stylized-concept. Transparent 2D game environment sprite: a forest mountain outcrop, tall layered grey granite crags with a rounded grassy summit and descending mossy shelves, a few small pines rooted on ledges, weathered natural stone. Elevated three-quarter front orthographic top-down RPG view. Full mountain silhouette entirely visible, no sky, no horizon, no scenery background or rectangular base. Base tapers organically into mossy rocks. Hand-painted storybook fantasy, muted olive grass, cool grey stone, soft upper-left light. Single isolated object with generous transparent margin, no snow, no purple evil crystals, no text or characters. Genuine transparent PNG.

## Verificação

`test-forest-expansion.mjs` mede as botas em 120 quadros do Akles, confere
habitats, número de criaturas, localização única do guardião, passagem nas
escadas e renderiza com Canvas filter desativado. Os testes existentes cobrem
Seu Tônico, os destinos da floresta, ponte do Santuário e isolamento da cidade.
Capturas em celular horizontal em localhost; não substituem o teste no iPhone.
