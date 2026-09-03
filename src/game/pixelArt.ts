/**
 * 32-bit style Pixel Art Generator
 * Generates high-fidelity pixel art sprites and tiles into offscreen canvases
 */

// Helper to create an offscreen canvas
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return c;
}

// 32-bit RPG Color Palette
export const PALETTE = {
  // Greens
  grassDeep: '#1e4827',
  grassDark: '#2c6b37',
  grassMid: '#3f8f4a',
  grassLight: '#61b456',
  grassHigh: '#8ed966',
  grassSun: '#b5ed79',
  
  // Dirt / Paths
  dirtDark: '#543b23',
  dirtMid: '#7a5a3a',
  dirtLight: '#a17a50',
  dirtSand: '#caa273',
  dirtPebble: '#4a3b30',

  // Stone / Cobblestone / Antique Limestone (Matches Tileset-Terrain2.png)
  stoneDeep: '#34301d',
  stoneDark: '#5c5636',
  stoneMid: '#8c8452',
  stoneLight: '#b8af72',
  stoneHigh: '#ded597',
  stonePaving: '#9c9462',
  stonePavingLight: '#c2ba84',
  stoneMortar: '#423d24',

  // Cliff Rock
  cliffShadow: '#28231d',
  cliffDark: '#4a3f35',
  cliffMid: '#6e5e4f',
  cliffLight: '#94806c',
  cliffRim: '#b8a38c',

  // Wood / Timbers
  woodDeep: '#26150b',
  woodDark: '#442614',
  woodMid: '#633c20',
  woodLight: '#8a5530',
  woodHigh: '#b27444',

  // Roof Tiles (Ancient Weathered Slate & Tiles)
  slateDark: '#1e293b',
  slateMid: '#334155',
  slateLight: '#475569',
  slateHigh: '#64748b',

  terracottaDark: '#5c2214',
  terracottaMid: '#8a3722',
  terracottaLight: '#b55037',
  terracottaHigh: '#d96c52',

  thatchDark: '#5c4819',
  thatchMid: '#876b26',
  thatchLight: '#b39037',
  thatchHigh: '#deb74e',

  // Wall Plaster (Antique Parchment Plaster)
  wallPlasterShadow: '#9c927c',
  wallPlaster: '#d4cbba',
  wallPlasterLight: '#ede6d8',

  // Flowers & Accents
  flowerRed: '#e63946',
  flowerYellow: '#ffbe0b',
  flowerBlue: '#3a86ff',
  flowerWhite: '#f8f9fa',
  flowerCenter: '#fb5607',

  // Character & Accents
  skinLight: '#ffd6a5',
  skinMid: '#e0a96d',
  skinShadow: '#ab7045',
  hairBlonde: '#fcd34d',
  hairBlondeDark: '#d97706',
  hairBrown: '#78350f',
  hairBrownDark: '#451a03',
  hairGrey: '#cbd5e1',
  tunicBlue: '#2563eb',
  tunicBlueDark: '#1d4ed8',
  tunicGreen: '#16a34a',
  tunicGreenDark: '#15803d',
  tunicRed: '#dc2626',
  tunicRedDark: '#991b1b',
  tunicBrown: '#854d0e',
  tunicWhite: '#f1f5f9',
  leatherBelt: '#5c3a21',
  goldBuckle: '#facc15',
  iron: '#94a3b8',
  ironDark: '#475569',
  lanternGold: '#fef08a',
  lanternGlow: '#fde047',
  shadowBlack: 'rgba(15, 23, 42, 0.35)',
};

/**
 * Generate Tiles:
 * Returns an object with pre-rendered 16x16 or 32x32 tiles
 */
export function generateTileSet() {
  const TILE = 16;
  
  // 1. Grass Variants (4 varieties + flower variants)
  const grassTiles: HTMLCanvasElement[] = [];
  
  for (let v = 0; v < 6; v++) {
    const c = makeCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    
    // Base green
    ctx.fillStyle = PALETTE.grassMid;
    ctx.fillRect(0, 0, TILE, TILE);
    
    // Sub-pixel texture dithering
    for (let x = 0; x < TILE; x++) {
      for (let y = 0; y < TILE; y++) {
        const hash = Math.sin(x * 12.9898 + y * 78.233 + v * 37.719) * 43758.5453;
        const noise = hash - Math.floor(hash);
        
        if (noise > 0.75) {
          ctx.fillStyle = PALETTE.grassLight;
          ctx.fillRect(x, y, 1, 1);
        } else if (noise < 0.2) {
          ctx.fillStyle = PALETTE.grassDark;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    // Distinct features per variant
    if (v === 1) {
      // Grass tufts / blades
      ctx.fillStyle = PALETTE.grassHigh;
      ctx.fillRect(4, 5, 1, 3);
      ctx.fillRect(5, 4, 1, 4);
      ctx.fillRect(6, 6, 1, 2);
      ctx.fillStyle = PALETTE.grassDeep;
      ctx.fillRect(4, 8, 3, 1);
    } else if (v === 2) {
      // Small white daisies
      ctx.fillStyle = PALETTE.flowerWhite;
      ctx.fillRect(3, 7, 2, 2);
      ctx.fillRect(11, 4, 2, 2);
      ctx.fillStyle = PALETTE.flowerYellow;
      ctx.fillRect(3, 7, 1, 1);
      ctx.fillRect(11, 4, 1, 1);
    } else if (v === 3) {
      // Bluebell / violet dots
      ctx.fillStyle = PALETTE.flowerBlue;
      ctx.fillRect(5, 10, 2, 2);
      ctx.fillRect(12, 11, 2, 2);
      ctx.fillStyle = PALETTE.flowerWhite;
      ctx.fillRect(6, 10, 1, 1);
    } else if (v === 4) {
      // Tiny poppy / red flower
      ctx.fillStyle = PALETTE.flowerRed;
      ctx.fillRect(8, 6, 2, 2);
      ctx.fillStyle = PALETTE.flowerYellow;
      ctx.fillRect(8, 6, 1, 1);
      // Small stone pebble
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(12, 12, 2, 1);
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(12, 13, 2, 1);
    } else if (v === 5) {
      // Forest mossy shaded grass
      ctx.fillStyle = PALETTE.grassDeep;
      for (let i = 0; i < 6; i++) {
        ctx.fillRect((i * 5) % TILE, (i * 7) % TILE, 2, 1);
      }
    }
    
    grassTiles.push(c);
  }

  // 2. Dirt Path Tiles (Center, variations, edges)
  const dirtTiles: HTMLCanvasElement[] = [];
  for (let v = 0; v < 3; v++) {
    const c = makeCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = PALETTE.dirtMid;
    ctx.fillRect(0, 0, TILE, TILE);
    
    // Texture
    for (let x = 0; x < TILE; x++) {
      for (let y = 0; y < TILE; y++) {
        const hash = Math.sin(x * 23.14 + y * 91.22 + v * 15.3) * 10000;
        const noise = hash - Math.floor(hash);
        if (noise > 0.8) {
          ctx.fillStyle = PALETTE.dirtLight;
          ctx.fillRect(x, y, 1, 1);
        } else if (noise < 0.25) {
          ctx.fillStyle = PALETTE.dirtDark;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    // Small pebbles on path
    if (v === 1) {
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(4, 6, 2, 1);
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(4, 7, 2, 1);
      ctx.fillStyle = PALETTE.dirtSand;
      ctx.fillRect(11, 11, 2, 2);
    } else if (v === 2) {
      ctx.fillStyle = PALETTE.dirtSand;
      ctx.fillRect(3, 3, 3, 2);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(10, 8, 2, 1);
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(10, 9, 2, 1);
    }
    dirtTiles.push(c);
  }

  // 3. Cobblestone / Calçada Paving Tiles
  const stonePavingTiles: HTMLCanvasElement[] = [];
  for (let v = 0; v < 3; v++) {
    const c = makeCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    
    // Base mortar
    ctx.fillStyle = PALETTE.stoneMortar;
    ctx.fillRect(0, 0, TILE, TILE);
    
    // Draw 4 distinct cobblestone pavers per 16x16 tile
    const pavers = [
      { x: 1, y: 1, w: 6, h: 6 },
      { x: 8, y: 1, w: 7, h: 6 },
      { x: 1, y: 8, w: 7, h: 7 },
      { x: 9, y: 8, w: 6, h: 7 },
    ];
    
    for (let p of pavers) {
      ctx.fillStyle = PALETTE.stonePaving;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      
      // Top/Left highlight
      ctx.fillStyle = PALETTE.stonePavingLight;
      ctx.fillRect(p.x, p.y, p.w - 1, 1);
      ctx.fillRect(p.x, p.y, 1, p.h - 1);
      
      // Bottom/Right bevel shadow
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(p.x, p.y + p.h - 1, p.w, 1);
      ctx.fillRect(p.x + p.w - 1, p.y, 1, p.h);
      
      // subtle surface stone texture
      if (v === 1 && p.w > 6) {
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(p.x + 2, p.y + 2, 1, 1);
      }
    }
    
    // Moss speckle in grout on variant 2
    if (v === 2) {
      ctx.fillStyle = PALETTE.grassDark;
      ctx.fillRect(7, 3, 1, 2);
      ctx.fillRect(3, 7, 2, 1);
    }
    
    stonePavingTiles.push(c);
  }

  // 4. Cliff Tiles (Top edge, cliff face, stairs)
  // Cliff Top Edge (Grass hanging over rock)
  const cliffTop = makeCanvas(TILE, TILE);
  {
    const ctx = cliffTop.getContext('2d')!;
    // Top is grass
    ctx.fillStyle = PALETTE.grassMid;
    ctx.fillRect(0, 0, TILE, 8);
    ctx.fillStyle = PALETTE.grassHigh;
    for (let i = 0; i < TILE; i += 2) ctx.fillRect(i, 0, 1, 2);
    
    // Overhang grass fringe
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(0, 8, TILE, 2);
    // jagged fringe
    ctx.fillStyle = PALETTE.grassLight;
    ctx.fillRect(2, 9, 2, 2);
    ctx.fillRect(7, 9, 3, 2);
    ctx.fillRect(13, 9, 2, 2);
    
    // Cliff rock strata top
    ctx.fillStyle = PALETTE.cliffShadow;
    ctx.fillRect(0, 11, TILE, 2);
    ctx.fillStyle = PALETTE.cliffMid;
    ctx.fillRect(0, 13, TILE, 3);
    ctx.fillStyle = PALETTE.cliffLight;
    ctx.fillRect(3, 13, 4, 1);
    ctx.fillRect(10, 14, 4, 1);
  }

  // Cliff Wall / Face
  const cliffWall = makeCanvas(TILE, TILE);
  {
    const ctx = cliffWall.getContext('2d')!;
    ctx.fillStyle = PALETTE.cliffMid;
    ctx.fillRect(0, 0, TILE, TILE);
    
    // Rocky horizontal strata & cracks
    ctx.fillStyle = PALETTE.cliffDark;
    ctx.fillRect(0, 3, TILE, 2);
    ctx.fillRect(0, 9, TILE, 2);
    ctx.fillRect(4, 5, 2, 4);
    ctx.fillRect(11, 10, 2, 5);
    
    ctx.fillStyle = PALETTE.cliffShadow;
    ctx.fillRect(0, 14, TILE, 2); // shadow at bottom base
    
    // Highlights on rock ledges
    ctx.fillStyle = PALETTE.cliffRim;
    ctx.fillRect(2, 2, 6, 1);
    ctx.fillRect(9, 8, 6, 1);
    
    // Moss clinging to cracks
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(1, 4, 2, 1);
    ctx.fillRect(12, 11, 2, 1);
  }

  // Cliff Stairs (allows player to walk up to plateau)
  const cliffStairs = makeCanvas(TILE, TILE);
  {
    const ctx = cliffStairs.getContext('2d')!;
    // 3 stepped stone slabs
    for (let s = 0; s < 3; s++) {
      const y = s * 5 + 1;
      ctx.fillStyle = PALETTE.stoneMortar;
      ctx.fillRect(1, y, 14, 5);
      
      ctx.fillStyle = PALETTE.stonePavingLight;
      ctx.fillRect(2, y + 1, 12, 2);
      
      ctx.fillStyle = PALETTE.stoneMid;
      ctx.fillRect(2, y + 3, 12, 2);
      
      ctx.fillStyle = PALETTE.stoneDeep;
      ctx.fillRect(1, y + 4, 14, 1);
    }
  }

  return {
    grass: grassTiles,
    dirt: dirtTiles,
    cobble: stonePavingTiles,
    cliffTop,
    cliffWall,
    cliffStairs,
  };
}

/**
 * Generate 32-bit pixel art trees (Grand Oak, Alpine Pine, Blossom Tree, Shrub)
 * High-definition organic silhouettes, textured bark, layered foliage clusters, and natural shadows.
 */
export function generateTrees() {
  // Tree 1: Grand Ancient Oak (64x80 px)
  const oak = makeCanvas(64, 80);
  {
    const ctx = oak.getContext('2d')!;

    // Soft grounded shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(32, 75, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk & Gnarled Roots
    ctx.fillStyle = '#2c1a0e';
    ctx.fillRect(27, 44, 10, 31);
    ctx.fillRect(22, 68, 6, 7); // left root
    ctx.fillRect(36, 68, 6, 7); // right root

    // Bark depth & highlights
    ctx.fillStyle = '#4a2d18';
    ctx.fillRect(28, 46, 8, 28);
    ctx.fillRect(24, 70, 4, 5);
    ctx.fillRect(36, 70, 4, 5);
    ctx.fillStyle = '#6e4425';
    ctx.fillRect(30, 48, 4, 24);
    ctx.fillRect(31, 52, 2, 16);

    // Visible primary branches extending into foliage
    ctx.fillStyle = '#3a2110';
    ctx.fillRect(24, 40, 6, 6);
    ctx.fillRect(34, 40, 6, 6);
    ctx.fillRect(20, 36, 6, 5);
    ctx.fillRect(38, 36, 6, 5);

    // Layered Organic Canopy Bunches (Rich 32-bit volumetric depth)
    const oakCanopy = [
      // Deep shaded under-clusters
      { x: 32, y: 36, rx: 24, ry: 18, c: '#14381b' },
      { x: 20, y: 38, rx: 17, ry: 15, c: '#14381b' },
      { x: 44, y: 38, rx: 17, ry: 15, c: '#14381b' },
      // Mid-tone foliage masses
      { x: 32, y: 30, rx: 25, ry: 19, c: '#235c2b' },
      { x: 18, y: 30, rx: 16, ry: 14, c: '#235c2b' },
      { x: 46, y: 30, rx: 16, ry: 14, c: '#235c2b' },
      { x: 32, y: 20, rx: 20, ry: 16, c: '#2f7435' },
      // Sunlit foliage clusters
      { x: 24, y: 22, rx: 15, ry: 12, c: '#439446' },
      { x: 40, y: 22, rx: 15, ry: 12, c: '#439446' },
      { x: 32, y: 14, rx: 16, ry: 12, c: '#439446' },
      // Bright crest highlights
      { x: 22, y: 16, rx: 10, ry: 8, c: '#66ba59' },
      { x: 38, y: 16, rx: 10, ry: 8, c: '#66ba59' },
      { x: 32, y: 9,  rx: 11, ry: 7, c: '#7ed46e' },
      { x: 30, y: 6,  rx: 6,  ry: 4, c: '#a4ed8e' },
    ];

    for (const b of oakCanopy) {
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leaf cluster micro-pixel dithering for authentic pixel art texture
    ctx.fillStyle = '#8ce27c';
    ctx.fillRect(26, 7, 4, 2);
    ctx.fillRect(34, 8, 4, 2);
    ctx.fillRect(16, 18, 3, 2);
    ctx.fillRect(44, 18, 3, 2);
    ctx.fillRect(20, 26, 3, 2);
    ctx.fillRect(40, 26, 3, 2);

    ctx.fillStyle = '#163f1e';
    ctx.fillRect(15, 42, 5, 2);
    ctx.fillRect(43, 42, 5, 2);
    ctx.fillRect(29, 44, 6, 2);
  }

  // Tree 2: Alpine Conifer / Mountain Pine (40x80 px)
  const pine = makeCanvas(40, 80);
  {
    const ctx = pine.getContext('2d')!;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.beginPath();
    ctx.ellipse(20, 76, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tall Trunk
    ctx.fillStyle = '#2c1a0e';
    ctx.fillRect(17, 48, 6, 28);
    ctx.fillStyle = '#4a2d18';
    ctx.fillRect(18, 50, 4, 26);
    ctx.fillStyle = '#6e4425';
    ctx.fillRect(19, 52, 2, 22);

    // 5 Tiered Jagged Conifer Skirts
    const tiers = [
      { y: 52, w: 36, h: 16 },
      { y: 40, w: 30, h: 15 },
      { y: 28, w: 24, h: 14 },
      { y: 17, w: 18, h: 13 },
      { y: 6,  w: 12, h: 12 },
    ];

    for (const t of tiers) {
      const x = 20 - t.w / 2;

      // Tier shadow base
      ctx.fillStyle = '#0f2916';
      ctx.beginPath();
      ctx.moveTo(x, t.y + t.h);
      ctx.lineTo(20, t.y);
      ctx.lineTo(x + t.w, t.y + t.h);
      ctx.closePath();
      ctx.fill();

      // Jagged needle fringe bottom
      ctx.fillRect(x + 2, t.y + t.h, 3, 2);
      ctx.fillRect(x + 7, t.y + t.h + 1, 3, 2);
      ctx.fillRect(x + t.w - 10, t.y + t.h + 1, 3, 2);
      ctx.fillRect(x + t.w - 5, t.y + t.h, 3, 2);

      // Mid evergreen tone
      ctx.fillStyle = '#1c4d29';
      ctx.beginPath();
      ctx.moveTo(x + 3, t.y + t.h - 2);
      ctx.lineTo(20, t.y + 1);
      ctx.lineTo(x + t.w - 3, t.y + t.h - 2);
      ctx.closePath();
      ctx.fill();

      // Sunlit needle crest (left side highlight)
      ctx.fillStyle = '#317841';
      ctx.beginPath();
      ctx.moveTo(x + 4, t.y + t.h - 4);
      ctx.lineTo(20, t.y + 2);
      ctx.lineTo(20, t.y + t.h - 3);
      ctx.closePath();
      ctx.fill();

      // Sharp bright needle tip
      ctx.fillStyle = '#55a864';
      ctx.fillRect(x + 5, t.y + t.h - 5, 4, 2);
      ctx.fillRect(19, t.y + 1, 2, 2);
    }
  }

  // Tree 3: Enchanted Blossom Tree (Sakura / Flowering Tree - 60x76 px)
  const blossomTree = makeCanvas(60, 76);
  {
    const ctx = blossomTree.getContext('2d')!;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.beginPath();
    ctx.ellipse(30, 72, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Graceful curved dark trunk
    ctx.fillStyle = '#26141a';
    ctx.fillRect(27, 44, 7, 28);
    ctx.fillRect(22, 68, 6, 4);
    ctx.fillRect(33, 68, 5, 4);

    ctx.fillStyle = '#3d222b';
    ctx.fillRect(28, 46, 5, 24);
    // Upper curved limbs
    ctx.fillRect(22, 38, 6, 6);
    ctx.fillRect(32, 36, 7, 7);
    ctx.fillRect(16, 32, 7, 5);
    ctx.fillRect(38, 30, 7, 5);

    // Multi-layered Sakura Cloud Masses
    const blossomClouds = [
      // Shadow pink base
      { x: 30, y: 34, rx: 24, ry: 16, c: '#8c3552' },
      { x: 18, y: 34, rx: 16, ry: 13, c: '#8c3552' },
      { x: 42, y: 34, rx: 16, ry: 13, c: '#8c3552' },
      // Mid sakura pink
      { x: 30, y: 26, rx: 22, ry: 16, c: '#c45c7d' },
      { x: 16, y: 26, rx: 15, ry: 12, c: '#c45c7d' },
      { x: 44, y: 26, rx: 15, ry: 12, c: '#c45c7d' },
      { x: 30, y: 16, rx: 18, ry: 14, c: '#dd7a99' },
      // Light pastel blossoms
      { x: 22, y: 18, rx: 14, ry: 10, c: '#f09ab3' },
      { x: 38, y: 18, rx: 14, ry: 10, c: '#f09ab3' },
      { x: 30, y: 11, rx: 14, ry: 9,  c: '#f7b5c8' },
      // Pure blossom white crests
      { x: 26, y: 8,  rx: 7,  ry: 5,  c: '#ffffff' },
      { x: 36, y: 9,  rx: 6,  ry: 4,  c: '#ffffff' },
    ];

    for (const b of blossomClouds) {
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Micro petal scatter
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 10, 3, 2);
    ctx.fillRect(38, 12, 3, 2);
    ctx.fillRect(12, 22, 2, 2);
    ctx.fillRect(48, 22, 2, 2);

    // Dropped petals at base of trunk
    ctx.fillStyle = '#f09ab3';
    ctx.fillRect(20, 72, 2, 1);
    ctx.fillRect(24, 73, 2, 1);
    ctx.fillRect(36, 73, 2, 1);
    ctx.fillRect(39, 71, 2, 1);
  }

  // Bush / Shrub (28x24 px)
  const bush = makeCanvas(28, 24);
  {
    const ctx = bush.getContext('2d')!;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.beginPath();
    ctx.ellipse(14, 21, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shrub body
    ctx.fillStyle = '#14381b';
    ctx.beginPath();
    ctx.arc(9, 13, 8, 0, Math.PI * 2);
    ctx.arc(19, 13, 8, 0, Math.PI * 2);
    ctx.arc(14, 9, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#26612e';
    ctx.beginPath();
    ctx.arc(9, 11, 7, 0, Math.PI * 2);
    ctx.arc(19, 11, 7, 0, Math.PI * 2);
    ctx.arc(14, 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#469c4c';
    ctx.fillRect(6, 7, 5, 3);
    ctx.fillRect(15, 5, 5, 3);
    ctx.fillRect(11, 10, 6, 3);

    // Forest Berries
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(7, 9, 2, 2);
    ctx.fillRect(17, 8, 2, 2);
    ctx.fillRect(13, 13, 2, 2);
    ctx.fillRect(21, 12, 2, 2);
  }

  return { oak, pine, blossomTree, bush };
}

/**
 * Generate 32-bit pixel art houses (cottages with timber framing, roofs, doors, windows)
 */
export function generateHouses() {
  // House 1: Village Mayor / Great House (Slate Blue Roof, 80x72 px)
  const houseSlate = makeCanvas(80, 72);
  {
    const ctx = houseSlate.getContext('2d')!;
    
    // Cast shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.fillRect(4, 66, 72, 6);

    // Stone foundation base
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(10, 56, 60, 12);
    ctx.fillStyle = PALETTE.stoneMid;
    for (let i = 12; i < 68; i += 8) {
      ctx.fillRect(i, 58, 6, 8);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(i, 58, 6, 1);
      ctx.fillStyle = PALETTE.stoneMid;
    }

    // Walls (warm plaster)
    ctx.fillStyle = PALETTE.wallPlaster;
    ctx.fillRect(10, 26, 60, 32);

    // Timber framing posts & beams
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(10, 26, 4, 32);
    ctx.fillRect(66, 26, 4, 32);
    ctx.fillRect(38, 26, 4, 32);
    ctx.fillRect(10, 26, 60, 4); // top beam
    ctx.fillRect(10, 54, 60, 3); // bottom beam
    // Diagonal timbers
    ctx.fillRect(14, 30, 2, 2);
    ctx.fillRect(16, 32, 2, 2);
    ctx.fillRect(18, 34, 2, 2);
    ctx.fillRect(60, 30, 2, 2);
    ctx.fillRect(58, 32, 2, 2);

    // Front Wooden Door
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(34, 40, 12, 18);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(36, 42, 8, 15);
    ctx.fillStyle = PALETTE.goldBuckle;
    ctx.fillRect(42, 49, 2, 2); // brass handle

    // Windows (Glass panes with warm glow)
    const windows = [
      { x: 18, y: 36, w: 10, h: 10 },
      { x: 52, y: 36, w: 10, h: 10 },
    ];
    for (let win of windows) {
      // Frame
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(win.x - 1, win.y - 1, win.w + 2, win.h + 2);
      // Glowing glass
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(win.x, win.y, win.w / 2, win.h / 2);
      // Window cross muntins
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(win.x + 4, win.y, 1, win.h);
      ctx.fillRect(win.x, win.y + 4, win.w, 1);
      // Flower planter box under window
      ctx.fillStyle = PALETTE.woodMid;
      ctx.fillRect(win.x - 1, win.y + win.h, win.w + 2, 3);
      ctx.fillStyle = PALETTE.flowerRed;
      ctx.fillRect(win.x, win.y + win.h - 1, 2, 2);
      ctx.fillStyle = PALETTE.flowerYellow;
      ctx.fillRect(win.x + 4, win.y + win.h - 1, 2, 2);
      ctx.fillStyle = PALETTE.flowerWhite;
      ctx.fillRect(win.x + 7, win.y + win.h - 1, 2, 2);
    }

    // Chimney (on left)
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(16, 2, 10, 16);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(15, 1, 12, 3);

    // Slate Blue Pitched Roof (32-bit tiered tiles)
    for (let r = 0; r < 14; r++) {
      const y = 26 - r * 2;
      const x = 6 + r * 2;
      const w = 68 - r * 4;
      
      // Shingle shadow
      ctx.fillStyle = PALETTE.slateDark;
      ctx.fillRect(x, y, w, 3);
      // Shingle mid
      ctx.fillStyle = PALETTE.slateMid;
      ctx.fillRect(x + 1, y, w - 2, 2);
      // Shingle highlight
      ctx.fillStyle = PALETTE.slateLight;
      ctx.fillRect(x + 2, y, w - 4, 1);
      
      // Tile vertical groove accents
      ctx.fillStyle = PALETTE.slateDark;
      for (let tx = x + 4; tx < x + w - 4; tx += 6) {
        ctx.fillRect(tx, y, 1, 3);
      }
    }

    // Roof Ridge
    ctx.fillStyle = PALETTE.slateHigh;
    ctx.fillRect(32, 0, 16, 2);
  }

  // House 2: Village Bakery / Cottage (Terracotta Red Roof, 72x68 px)
  const houseTerracotta = makeCanvas(72, 68);
  {
    const ctx = houseTerracotta.getContext('2d')!;
    
    // Cast shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.fillRect(4, 62, 64, 6);

    // Stone base
    ctx.fillStyle = PALETTE.stoneMid;
    ctx.fillRect(8, 52, 56, 12);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(8, 52, 56, 1);

    // Plaster Wall
    ctx.fillStyle = PALETTE.wallPlaster;
    ctx.fillRect(8, 24, 56, 30);

    // Wooden beams
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(8, 24, 4, 30);
    ctx.fillRect(60, 24, 4, 30);
    ctx.fillRect(8, 24, 56, 3);
    ctx.fillRect(8, 51, 56, 3);

    // Front door
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(20, 38, 11, 16);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(22, 40, 7, 13);
    ctx.fillStyle = PALETTE.iron;
    ctx.fillRect(26, 46, 2, 2);

    // Bakery Shop Window / Counter
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(38, 36, 18, 14);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(39, 37, 16, 12);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(36, 50, 22, 3); // wooden counter shelf

    // Bread loaves on counter
    ctx.fillStyle = PALETTE.thatchMid;
    ctx.fillRect(40, 47, 4, 3);
    ctx.fillRect(46, 47, 4, 3);

    // Awning above window (striped red & white)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? PALETTE.terracottaMid : PALETTE.flowerWhite;
      ctx.fillRect(36 + i * 4, 33, 4, 4);
    }

    // Terracotta Roof
    for (let r = 0; r < 12; r++) {
      const y = 24 - r * 2;
      const x = 4 + r * 2;
      const w = 64 - r * 4;
      
      ctx.fillStyle = PALETTE.terracottaDark;
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = PALETTE.terracottaMid;
      ctx.fillRect(x + 1, y, w - 2, 2);
      ctx.fillStyle = PALETTE.terracottaLight;
      ctx.fillRect(x + 2, y, w - 4, 1);
      
      ctx.fillStyle = PALETTE.terracottaDark;
      for (let tx = x + 3; tx < x + w - 3; tx += 5) {
        ctx.fillRect(tx, y, 1, 3);
      }
    }
  }

  // House 3: Herbalist / Cozy Thatched Cottage (Golden Thatch Roof, 68x64 px)
  const houseThatch = makeCanvas(68, 64);
  {
    const ctx = houseThatch.getContext('2d')!;
    
    // Cast shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.fillRect(4, 58, 60, 6);

    // Walls
    ctx.fillStyle = PALETTE.wallPlaster;
    ctx.fillRect(8, 22, 52, 38);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(8, 52, 52, 8);

    // Ivy climbing on left wall
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(9, 28, 4, 16);
    ctx.fillRect(11, 24, 3, 10);
    ctx.fillStyle = PALETTE.grassLight;
    ctx.fillRect(8, 30, 2, 3);
    ctx.fillRect(12, 26, 2, 3);

    // Door
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(28, 38, 12, 16);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(30, 40, 8, 13);
    ctx.fillStyle = PALETTE.goldBuckle;
    ctx.fillRect(35, 46, 2, 2);

    // Round Window
    ctx.fillStyle = PALETTE.woodDark;
    ctx.beginPath();
    ctx.arc(48, 36, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(48, 36, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(47, 31, 1, 10);
    ctx.fillRect(43, 35, 10, 1);

    // Golden Thatch Roof (Organic, rounded straw texture)
    for (let r = 0; r < 12; r++) {
      const y = 22 - r * 2;
      const x = 4 + r * 2;
      const w = 60 - r * 4;
      
      ctx.fillStyle = PALETTE.thatchDark;
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = PALETTE.thatchMid;
      ctx.fillRect(x + 1, y, w - 2, 2);
      ctx.fillStyle = PALETTE.thatchLight;
      ctx.fillRect(x + 2, y, w - 4, 1);
    }
    // Moss patch on roof
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(16, 12, 6, 3);
    ctx.fillStyle = PALETTE.grassMid;
    ctx.fillRect(18, 11, 4, 2);
  }

  // House 4: Woodcutter Cabin (Horizontal logs, 64x60 px)
  const houseLog = makeCanvas(64, 60);
  {
    const ctx = houseLog.getContext('2d')!;
    
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.fillRect(4, 54, 56, 6);

    // Walls made of horizontal logs
    for (let l = 0; l < 7; l++) {
      const y = 20 + l * 5;
      ctx.fillStyle = PALETTE.woodDeep;
      ctx.fillRect(8, y, 48, 5);
      ctx.fillStyle = PALETTE.woodMid;
      ctx.fillRect(8, y + 1, 48, 3);
      ctx.fillStyle = PALETTE.woodLight;
      ctx.fillRect(8, y + 1, 48, 1);
    }

    // Door
    ctx.fillStyle = PALETTE.woodDeep;
    ctx.fillRect(16, 36, 10, 18);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(17, 38, 8, 15);
    ctx.fillStyle = PALETTE.iron;
    ctx.fillRect(22, 44, 2, 2);

    // Small square window
    ctx.fillStyle = PALETTE.woodDeep;
    ctx.fillRect(36, 34, 10, 10);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(37, 35, 8, 8);
    ctx.fillStyle = PALETTE.woodDeep;
    ctx.fillRect(41, 35, 1, 8);
    ctx.fillRect(37, 39, 8, 1);

    // Stacked firewood logs next to cabin
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(48, 44, 10, 10);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(49, 45, 3, 3);
    ctx.fillRect(53, 45, 3, 3);
    ctx.fillRect(51, 49, 3, 3);

    // Roof (Wood shake shingles)
    for (let r = 0; r < 11; r++) {
      const y = 20 - r * 2;
      const x = 4 + r * 2;
      const w = 56 - r * 4;
      
      ctx.fillStyle = PALETTE.woodDeep;
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 1, y, w - 2, 2);
      ctx.fillStyle = PALETTE.woodMid;
      ctx.fillRect(x + 2, y, w - 4, 1);
    }
  }

  // House 5: Cozy Village Cottage (Red Tiled Roof, 68x64 px)
  const houseCozy = makeCanvas(68, 64);
  {
    const ctx = houseCozy.getContext('2d')!;
    
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.fillRect(4, 58, 60, 6);

    // Walls
    ctx.fillStyle = PALETTE.wallPlaster;
    ctx.fillRect(8, 22, 52, 38);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(8, 52, 52, 8);

    // Wooden timber beams
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(8, 22, 3, 38);
    ctx.fillRect(57, 22, 3, 38);
    ctx.fillRect(8, 22, 52, 3);

    // Door with round arch
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(28, 36, 12, 18);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(29, 38, 10, 15);
    ctx.fillStyle = PALETTE.goldBuckle;
    ctx.fillRect(36, 45, 2, 2);

    // Windows
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(14, 34, 10, 10);
    ctx.fillRect(44, 34, 10, 10);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(15, 35, 8, 8);
    ctx.fillRect(45, 35, 8, 8);

    // Roof (Terracotta / Red shingle)
    for (let r = 0; r < 12; r++) {
      const y = 22 - r * 2;
      const x = 4 + r * 2;
      const w = 60 - r * 4;
      
      ctx.fillStyle = PALETTE.terracottaDark;
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = PALETTE.terracottaMid;
      ctx.fillRect(x + 1, y, w - 2, 2);
      ctx.fillStyle = PALETTE.terracottaLight;
      ctx.fillRect(x + 2, y, w - 4, 1);
    }
  }

  return { houseSlate, houseTerracotta, houseThatch, houseLog, houseCozy };
}

/**
 * Village Props: Stone Well, Wooden Fences, Street Lamps, Benches, Barrels, Flowerbeds
 */
export function generateProps() {
  // 1. Village Stone Well (32x36 px)
  const well = makeCanvas(32, 36);
  {
    const ctx = well.getContext('2d')!;
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.beginPath();
    ctx.ellipse(16, 33, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone cylindrical base
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.beginPath();
    ctx.ellipse(16, 26, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(4, 26, 24, 7);
    ctx.fillStyle = PALETTE.stoneMid;
    ctx.fillRect(5, 27, 22, 5);
    ctx.fillStyle = PALETTE.stoneLight;
    // Individual stone bricks on well wall
    ctx.fillRect(7, 28, 4, 2);
    ctx.fillRect(15, 28, 5, 2);
    ctx.fillRect(10, 31, 5, 2);

    // Dark water inside
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(16, 25, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(14, 25, 2, 1);

    // Wooden vertical posts
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(5, 12, 3, 16);
    ctx.fillRect(24, 12, 3, 16);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(6, 12, 1, 15);
    ctx.fillRect(25, 12, 1, 15);

    // Horizontal spindle & rope
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(8, 14, 16, 3);
    ctx.fillStyle = PALETTE.dirtSand;
    ctx.fillRect(13, 14, 6, 3); // rope coil
    ctx.fillRect(15, 17, 1, 6); // dangling rope

    // Small bucket
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(14, 21, 4, 4);

    // Pitched Roof above well
    for (let r = 0; r < 7; r++) {
      const y = 10 - r * 2;
      const x = 3 + r * 2;
      const w = 26 - r * 4;
      ctx.fillStyle = PALETTE.slateDark;
      ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = PALETTE.slateMid;
      ctx.fillRect(x + 1, y, w - 2, 1);
    }
  }

  // 2. Street Lantern Post (16x32 px)
  const lamp = makeCanvas(16, 32);
  {
    const ctx = lamp.getContext('2d')!;
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.beginPath();
    ctx.ellipse(8, 30, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iron post
    ctx.fillStyle = PALETTE.ironDark;
    ctx.fillRect(7, 12, 2, 18);
    ctx.fillRect(5, 29, 6, 2); // base
    ctx.fillStyle = PALETTE.iron;
    ctx.fillRect(7, 13, 1, 16);

    // Lantern fixture
    ctx.fillStyle = PALETTE.ironDark;
    ctx.fillRect(4, 5, 8, 2); // top cap
    ctx.fillRect(5, 3, 6, 2);
    ctx.fillRect(5, 11, 6, 2); // bottom bracket

    // Glowing glass
    ctx.fillStyle = PALETTE.lanternGold;
    ctx.fillRect(5, 7, 6, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 8, 2, 2);
  }

  // 3. Wooden Fence (Horizontal piece, 16x16 px)
  const fenceH = makeCanvas(16, 16);
  {
    const ctx = fenceH.getContext('2d')!;
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.fillRect(0, 14, 16, 2);

    // 2 horizontal rails
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(0, 6, 16, 2);
    ctx.fillRect(0, 11, 16, 2);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(0, 6, 16, 1);
    ctx.fillRect(0, 11, 16, 1);

    // Vertical posts
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(1, 3, 3, 12);
    ctx.fillRect(12, 3, 3, 12);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(2, 4, 1, 10);
    ctx.fillRect(13, 4, 1, 10);
    // Pointed caps
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(13, 2, 1, 1);
  }

  // 4. Wooden Park Bench (24x18 px)
  const bench = makeCanvas(24, 18);
  {
    const ctx = bench.getContext('2d')!;
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.fillRect(2, 15, 20, 3);

    // Legs
    ctx.fillStyle = PALETTE.woodDeep;
    ctx.fillRect(3, 10, 2, 6);
    ctx.fillRect(19, 10, 2, 6);

    // Seat planks
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(2, 9, 20, 3);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(2, 9, 20, 1);

    // Backrest
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(2, 3, 20, 4);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(2, 3, 20, 1);
    ctx.fillStyle = PALETTE.woodDeep;
    ctx.fillRect(5, 7, 2, 3);
    ctx.fillRect(17, 7, 2, 3);
  }

  // 5. Wooden Barrel & Crate (20x20 px)
  const barrel = makeCanvas(20, 20);
  {
    const ctx = barrel.getContext('2d')!;
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.beginPath();
    ctx.ellipse(10, 17, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barrel body
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(5, 5, 10, 12);
    ctx.fillRect(4, 7, 12, 8);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(5, 6, 8, 10);
    // Iron hoops
    ctx.fillStyle = PALETTE.ironDark;
    ctx.fillRect(4, 8, 12, 1);
    ctx.fillRect(4, 13, 12, 1);
    // Top lid
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(6, 4, 8, 2);
  }

  // 6. Signpost (16x20 px)
  const signpost = makeCanvas(16, 20);
  {
    const ctx = signpost.getContext('2d')!;
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.beginPath();
    ctx.ellipse(8, 18, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Post
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(7, 4, 2, 15);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(7, 4, 1, 14);

    // Wooden arrow board
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(2, 4, 12, 5);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(3, 5, 10, 3);
    ctx.fillStyle = PALETTE.woodDeep;
    ctx.fillRect(5, 6, 5, 1); // text dashes
  }

  // 7. Large Mossy Boulder / Rock (28x22 px)
  const rock = makeCanvas(28, 22);
  {
    const ctx = rock.getContext('2d')!;
    // Shadow
    ctx.fillStyle = PALETTE.shadowBlack;
    ctx.beginPath();
    ctx.ellipse(14, 18, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock base
    ctx.fillStyle = PALETTE.cliffShadow;
    ctx.beginPath();
    ctx.ellipse(14, 13, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.cliffMid;
    ctx.beginPath();
    ctx.ellipse(13, 11, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlights on upper facets
    ctx.fillStyle = PALETTE.cliffLight;
    ctx.fillRect(8, 7, 6, 3);
    ctx.fillRect(15, 8, 5, 2);

    // Moss patch on top
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(7, 6, 7, 2);
    ctx.fillStyle = PALETTE.grassMid;
    ctx.fillRect(9, 5, 4, 2);
  }

  return { well, lamp, fenceH, bench, barrel, signpost, rock };
}

/**
 * Generate 32-bit Animated Character Spritesheets
 * Hero & 4 Village NPCs (each 4 directions: down, up, left, right x 4 walk frames)
 */
export function generateCharacterSprites() {
  const FRAME_W = 20;
  const FRAME_H = 28;
  const DIRECTIONS = ['down', 'up', 'left', 'right'] as const;

  // Function to create a character spritesheet canvas (4 columns for frames x 4 rows for directions)
  function buildCharacterSheet(options: {
    hairColor: string;
    hairDark: string;
    hairStyle: 'hero' | 'beard' | 'apron' | 'cap' | 'dog';
    tunicColor: string;
    tunicDark: string;
    pantsColor: string;
    accessoryColor?: string;
  }) {
    const sheet = makeCanvas(FRAME_W * 4, FRAME_H * 4);
    const ctx = sheet.getContext('2d')!;

    DIRECTIONS.forEach((dir, row) => {
      for (let frame = 0; frame < 4; frame++) {
        const ox = frame * FRAME_W;
        const oy = row * FRAME_H;

        // Walk bobbing: frames 1 and 3 are step extensions; 0 and 2 are neutral passing
        const bob = frame % 2 === 1 ? 1 : 0;
        const stepOffset = frame === 1 ? 1 : frame === 3 ? -1 : 0;

        // 1. Drop shadow under character
        ctx.fillStyle = PALETTE.shadowBlack;
        ctx.beginPath();
        ctx.ellipse(ox + 10, oy + 26, 7, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (options.hairStyle === 'dog') {
          // Cute 4-legged pet / dog sprite
          ctx.fillStyle = '#b45309'; // Golden fur
          ctx.fillRect(ox + 5, oy + 16, 10, 8); // body
          ctx.fillStyle = '#d97706';
          ctx.fillRect(ox + 6, oy + 17, 8, 6);

          // Head
          const headX = dir === 'right' ? ox + 12 : dir === 'left' ? ox + 4 : ox + 8;
          ctx.fillStyle = '#b45309';
          ctx.fillRect(headX, oy + 11, 6, 6);
          // Ears
          ctx.fillStyle = '#78350f';
          ctx.fillRect(headX + (dir === 'left' ? 4 : 0), oy + 10, 2, 4);
          // Eyes & nose
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(headX + (dir === 'right' ? 4 : dir === 'left' ? 1 : 2), oy + 13, 1, 1);
          ctx.fillRect(headX + (dir === 'right' ? 5 : dir === 'left' ? 0 : 3), oy + 15, 2, 1);

          // Paws
          ctx.fillStyle = '#78350f';
          ctx.fillRect(ox + 6 + (stepOffset * 2), oy + 23, 2, 4);
          ctx.fillRect(ox + 12 - (stepOffset * 2), oy + 23, 2, 4);

          // Wagging tail
          ctx.fillStyle = '#b45309';
          const tailX = dir === 'right' ? ox + 4 : ox + 14;
          ctx.fillRect(tailX, oy + 14 + (frame % 2) * 2, 3, 2);
          return;
        }

        // --- Humanoid Characters ---

        // Legs / Boots
        const legLeftX = ox + 7;
        const legRightX = ox + 11;
        const legY = oy + 20 + bob;

        ctx.fillStyle = options.pantsColor;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(legLeftX, legY, 2, 4);
          ctx.fillRect(legRightX, legY, 2, 4);
          // Boots
          ctx.fillStyle = PALETTE.woodDeep;
          ctx.fillRect(legLeftX, legY + 3 + (stepOffset === 1 ? -1 : 0), 2, 3);
          ctx.fillRect(legRightX, legY + 3 + (stepOffset === -1 ? -1 : 0), 2, 3);
        } else {
          // Side walking
          ctx.fillRect(ox + 8 + stepOffset * 2, legY, 3, 4);
          ctx.fillStyle = PALETTE.woodDeep;
          ctx.fillRect(ox + 8 + stepOffset * 2, legY + 3, 3, 3);
        }

        // Torso / Tunic
        const bodyY = oy + 11 + bob;
        ctx.fillStyle = options.tunicColor;
        ctx.fillRect(ox + 6, bodyY, 8, 9);
        // Tunic shadow
        ctx.fillStyle = options.tunicDark;
        ctx.fillRect(ox + 6, bodyY + 7, 8, 2);

        // Belt with buckle
        ctx.fillStyle = PALETTE.leatherBelt;
        ctx.fillRect(ox + 6, bodyY + 6, 8, 2);
        ctx.fillStyle = PALETTE.goldBuckle;
        ctx.fillRect(ox + 9, bodyY + 6, 2, 2);

        // Arms
        ctx.fillStyle = options.tunicDark;
        if (dir === 'down' || dir === 'up') {
          // Arms swing slightly opposite to legs
          ctx.fillRect(ox + 4, bodyY + 1 - stepOffset, 2, 6);
          ctx.fillRect(ox + 14, bodyY + 1 + stepOffset, 2, 6);
          // Hands
          ctx.fillStyle = PALETTE.skinLight;
          ctx.fillRect(ox + 4, bodyY + 6 - stepOffset, 2, 2);
          ctx.fillRect(ox + 14, bodyY + 6 + stepOffset, 2, 2);
        } else if (dir === 'right') {
          ctx.fillRect(ox + 9 + stepOffset, bodyY + 1, 3, 6);
          ctx.fillStyle = PALETTE.skinLight;
          ctx.fillRect(ox + 10 + stepOffset, bodyY + 6, 2, 2);
        } else {
          ctx.fillRect(ox + 8 - stepOffset, bodyY + 1, 3, 6);
          ctx.fillStyle = PALETTE.skinLight;
          ctx.fillRect(ox + 8 - stepOffset, bodyY + 6, 2, 2);
        }

        // Head / Skin
        const headY = oy + 4 + bob;
        ctx.fillStyle = PALETTE.skinMid;
        ctx.fillRect(ox + 6, headY, 8, 7);
        ctx.fillStyle = PALETTE.skinLight;
        ctx.fillRect(ox + 7, headY + 1, 6, 5);

        // Face features according to direction
        if (dir === 'down') {
          // Eyes
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(ox + 8, headY + 3, 1, 2);
          ctx.fillRect(ox + 11, headY + 3, 1, 2);
          // Rosy cheeks
          ctx.fillStyle = '#f87171';
          ctx.fillRect(ox + 7, headY + 5, 1, 1);
          ctx.fillRect(ox + 12, headY + 5, 1, 1);
        } else if (dir === 'right') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(ox + 11, headY + 3, 1, 2);
          ctx.fillStyle = '#f87171';
          ctx.fillRect(ox + 11, headY + 5, 1, 1);
        } else if (dir === 'left') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(ox + 8, headY + 3, 1, 2);
          ctx.fillStyle = '#f87171';
          ctx.fillRect(ox + 8, headY + 5, 1, 1);
        }

        // Hair / Headgear
        ctx.fillStyle = options.hairColor;
        if (options.hairStyle === 'hero') {
          // Adventurer cap + fringe
          ctx.fillRect(ox + 5, headY - 1, 10, 3);
          ctx.fillRect(ox + 6, headY - 2, 8, 2);
          ctx.fillStyle = options.hairDark;
          ctx.fillRect(ox + 5, headY + 1, 2, 4);
          ctx.fillRect(ox + 13, headY + 1, 2, 4);
          // Red adventurer scarf
          ctx.fillStyle = PALETTE.flowerRed;
          ctx.fillRect(ox + 6, headY + 6, 8, 2);
          if (dir === 'left' || dir === 'right') {
            ctx.fillRect(ox + (dir === 'left' ? 12 : 5), headY + 7, 3, 3);
          }
        } else if (options.hairStyle === 'beard') {
          // Elder: white hair & long majestic beard
          ctx.fillRect(ox + 5, headY - 1, 10, 4);
          ctx.fillStyle = options.hairColor;
          ctx.fillRect(ox + 7, headY + 4, 6, 6); // white beard
          ctx.fillRect(ox + 8, headY + 9, 4, 2);
        } else if (options.hairStyle === 'apron') {
          // Baker: white toque hat & apron
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ox + 6, headY - 3, 8, 4);
          ctx.fillRect(ox + 5, headY - 1, 10, 2);
          // White apron on chest
          ctx.fillRect(ox + 8, bodyY + 1, 4, 8);
          ctx.fillRect(ox + 7, bodyY + 4, 6, 5);
        } else if (options.hairStyle === 'cap') {
          // Gardener / Straw hat
          ctx.fillStyle = PALETTE.thatchLight;
          ctx.fillRect(ox + 3, headY, 14, 2); // wide brim
          ctx.fillRect(ox + 6, headY - 3, 8, 3);
          ctx.fillStyle = PALETTE.thatchDark;
          ctx.fillRect(ox + 6, headY - 1, 8, 1);
        }
      }
    });

    return sheet;
  }

  // Build Hero + 4 NPCs
  const hero = buildCharacterSheet({
    hairColor: PALETTE.hairBlonde,
    hairDark: PALETTE.hairBlondeDark,
    hairStyle: 'hero',
    tunicColor: PALETTE.tunicBlue,
    tunicDark: PALETTE.tunicBlueDark,
    pantsColor: PALETTE.woodDeep,
  });

  const elder = buildCharacterSheet({
    hairColor: PALETTE.hairGrey,
    hairDark: '#94a3b8',
    hairStyle: 'beard',
    tunicColor: PALETTE.tunicBrown,
    tunicDark: '#543007',
    pantsColor: '#38220f',
  });

  const baker = buildCharacterSheet({
    hairColor: PALETTE.hairBrown,
    hairDark: PALETTE.hairBrownDark,
    hairStyle: 'apron',
    tunicColor: PALETTE.tunicRed,
    tunicDark: PALETTE.tunicRedDark,
    pantsColor: '#1e293b',
  });

  const villager = buildCharacterSheet({
    hairColor: PALETTE.hairBrown,
    hairDark: PALETTE.hairBrownDark,
    hairStyle: 'cap',
    tunicColor: PALETTE.tunicGreen,
    tunicDark: PALETTE.tunicGreenDark,
    pantsColor: PALETTE.dirtDark,
  });

  const dog = buildCharacterSheet({
    hairColor: '#b45309',
    hairDark: '#78350f',
    hairStyle: 'dog',
    tunicColor: '',
    tunicDark: '',
    pantsColor: '',
  });

  return { hero, elder, baker, villager, dog };
}
