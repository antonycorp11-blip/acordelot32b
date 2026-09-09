# Santuário — trecho-piloto, 9 setembro 2026

Implementação restrita à chegada/clareira da Floresta dos Ecos. Acordelot,
cavernas, inventário e progressão não foram alterados.

## Artes
Modo: ferramenta integrada de geração de imagens (imagegen), sem CLI.
Arquivos aplicados:
- public/assets/regions/echo/sanctuary_tree_v1.png
- public/assets/regions/echo/sanctuary_bridge_v1.png
- public/assets/regions/echo/sanctuary_dressing_v1.png

## Prompts finais
### Árvore
Use case: stylized-concept. Asset type: isolated transparent PNG landmark sprite for a hand-painted 2D top-down fantasy RPG, seen from elevated three-quarter FRONT view, orthographic no horizon. Subject: a magnificent ancient sanctuary tree, broad asymmetrical pale twisted trunk with roots embracing a weathered small circular stone altar at its foot, delicate bronze lyre in the trunk, dense soft rounded emerald and sage foliage, tiny warm golden buds and a few turquoise glowing seed lanterns. Tree crown occupies upper two thirds, visible roots and altar bottom third. Warm storybook game art with crisp painted details, matching old-school high-quality RPG sprites, not pixel art, not photorealistic. Single tree full silhouette centered with clear 5% margin, no cropping. Natural muted greens, warm ivory bark, restrained magic. The altar belongs to the tree base, no large island or ground disc. Light from upper left. Genuinely transparent background including outside roots. NO environment background, no checkerboard, no text, no people, no drop shadow rectangle, no giant neon aura. Large readable silhouette at 400px in game.
### Ponte
Use case: stylized-concept. Asset type: single transparent sprite for a top-down 2D RPG. Primary request: a small ancient mossy stone footbridge aligned NORTH-SOUTH, the walking deck runs straight from BOTTOM CENTER to TOP CENTER of image. Camera orthographic elevated almost top down, see deck surface, entrance at bottom edge and exit at top edge, NOT a sideways horizontal bridge. Low carved pale stone parapets on left and right, gently weathered flat flagstone deck, a few ivy leaves outside rails, bronze lyre medallions discreet on rails. Full bridge isolated with 8% transparent margin, no scenery, no water, no ground island, no text. Hand-painted storybook fantasy RPG sprite, soft sage moss, warm grey sandstone, same illumination from upper left. Short broad bridge, width of deck suitable for two game characters to pass, a square-ish sprite with length 1.3 times total width. Genuinely transparent background. Keep deck opaque and clean, visible clear walking lane.
### Vegetação
Use case: stylized-concept. Asset type: transparent 2D RPG environment sprite atlas. Exactly FOUR isolated low-growing environmental clusters in a clean 2 by 2 grid, each safely inside its own quadrant with broad transparent gutters. Top left: curved cluster of natural mossy grey riverbank stones, warm earth roots and 3 ferns. Top right: low spreading lush fern cluster with a few tiny cream flowers, no rocks. Bottom left: crooked fallen pale branch with moss, leaf litter, a few round river stones. Bottom right: low river reeds and small rounded mossy stones with tiny lavender flowers. Each cluster horizontal, seen from elevated three-quarter front orthographic camera, entirely visible. Hand-painted storybook fantasy game style, finely painted but clear at 100px. Muted sage and forest greens, grey brown stones, light upper left. Natural irregular silhouettes, no rectangular ground, no ground island platform, no water painted in, no background, genuinely transparent alpha. No text labels, no borders, no shadow rectangle. Consistent perspective all 4, no duplicates, no characters, no tall trees.
### Refinamento do recorte da vegetação
Use case: background-extraction. Change ONLY the background of this four-sprite atlas to genuine transparent alpha. Remove ALL blurry olive/black background surrounding and between the four object clusters. Preserve the four plants/rocks/log clusters exactly with opaque interior pixels and clean detailed cutout edges. Keep the same 2x2 layout, same size, positions, colors, no added elements. This is for sprites composited over a game map, so absolutely no backdrop, no gradient, no checkerboard painted in. Actual transparent PNG.

A transparência foi inspecionada no PNG; o preview da geração exibe RGB de
pixels transparentes, por isso o recorte também deve ser avaliado no jogo.

## Entrega e verificação
- Percurso curvo com ponte norte-sul, margens e vegetação em grupos.
- Árvore ancestral com colisão na base e copa translúcida se cobrir Akles.
- Os 12 ecos mantêm suas regras de captura e vagueiam em torno dos novos lares.
- Recursos removidos da composição anterior são reposicionados preservando IDs
  e quantidade; não foi alterada a recompensa nem a progressão.
- Perfil de água mais discreto apenas na Floresta dos Ecos. Cidade e cavernas
  mantêm o perfil anterior. Ponte indicada no atlas.
- Testes: TypeScript, build, acesso às regiões, água GPU/fallback, atlas móvel,
  percurso inteiro do piloto, colisão da ponte, preservação de recursos e chão
  fora do envelope; capturas em 844 × 390 e 932 × 430.
- Não houve teste em iPhone físico nesta sessão. As demais regiões ainda não
  receberam a reforma visual proposta no plano.
