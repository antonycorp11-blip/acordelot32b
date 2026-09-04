/**
 * Asset Loader for Ancient Ruins Town Master Plan & Village Buildings
 */
export interface LoadedAssets {
  terrain: HTMLImageElement;
  wall: HTMLImageElement;
  animatedWater: HTMLImageElement;
  propsAtlas: HTMLImageElement;
  altar: HTMLImageElement;
  shrine: HTMLImageElement;
  chalice: HTMLImageElement;
  merchantIdle: HTMLImageElement;
  creatureIdle: HTMLImageElement;
  creatureRun: HTMLImageElement;
  iconPotion: HTMLImageElement;
  iconSword: HTMLImageElement;
  iconBow: HTMLImageElement;

  // Hero Animated
  heroAnimated: HTMLImageElement;
  heroAuthenticAnimated: HTMLImageElement;
  knightWalk: HTMLImageElement;
  knightIdle: HTMLImageElement;
  knightSlash: HTMLImageElement;

  // Monstros
  monAranha: HTMLImageElement;
  monNocturno: HTMLImageElement;
  monMaestro: HTMLImageElement;
  monColosso: HTMLImageElement;
  monDama: HTMLImageElement;

  // Props da Floresta Sombria
  darkDeadtree: HTMLImageElement;
  darkBigpine: HTMLImageElement;
  darkBigrock: HTMLImageElement;
  darkIcecrystal: HTMLImageElement;
  darkThorn: HTMLImageElement;

  // Ferramentas de coleta (machado / picareta), 3 tiers
  toolAxeWood: HTMLImageElement;
  toolAxeGold: HTMLImageElement;
  toolAxeCrystal: HTMLImageElement;
  toolPickWood: HTMLImageElement;
  toolPickGold: HTMLImageElement;
  toolPickCrystal: HTMLImageElement;

  // Armas (sistema de arma flutuante)
  weaponAcordelaminaT2: HTMLImageElement;
  weaponAcordelaminaT2Energized: HTMLImageElement;

  // Muralhas musicais (props de construção)
  wallMusical1: HTMLImageElement;
  wallMusical2: HTMLImageElement;
  wallMusical3: HTMLImageElement;
  wallMusical4: HTMLImageElement;
  wallMusical5: HTMLImageElement;
  wallMusical6: HTMLImageElement;
  wallMusical7: HTMLImageElement;
  wallMusical8: HTMLImageElement;
  wallGate: HTMLImageElement;

  // Nós de extração
  spotWood: HTMLImageElement;
  spotMineral: HTMLImageElement;
  spotGold: HTMLImageElement;
  spotCrystalBlue: HTMLImageElement;
  spotCrystalRed: HTMLImageElement;
  spotEcoEssence: HTMLImageElement;

  // Ecos musicais
  ecoDo: HTMLImageElement;
  ecoDoS: HTMLImageElement;
  ecoRe: HTMLImageElement;
  ecoReS: HTMLImageElement;
  ecoMi: HTMLImageElement;
  ecoFa: HTMLImageElement;
  ecoFaS: HTMLImageElement;
  ecoSol: HTMLImageElement;
  ecoSolS: HTMLImageElement;
  ecoLa: HTMLImageElement;
  ecoLaS: HTMLImageElement;
  ecoSi: HTMLImageElement;

  // NPCs
  npcCadencia: HTMLImageElement;
  npcTonico: HTMLImageElement;
  npcSetimo: HTMLImageElement;
  npcSeminima: HTMLImageElement;
  npcDiapasao: HTMLImageElement;

  // Akles - Herói Cavaleiro (sprite sheets 32-bit processadas)
  aklesIdle: HTMLImageElement;
  aklesWalk: HTMLImageElement;
  aklesRun: HTMLImageElement;
  aklesSlash: HTMLImageElement;
  aklesThrust: HTMLImageElement;
  aklesSpin: HTMLImageElement;
  aklesSpecial: HTMLImageElement;
  aklesCast: HTMLImageElement;

  // Town Buildings
  townHallFront: HTMLImageElement;
  townHallDiag: HTMLImageElement;
  townHallBack: HTMLImageElement;
  townHallSide: HTMLImageElement;
  bakeryFront: HTMLImageElement;
  bakeryDiag: HTMLImageElement;
  bakeryBack: HTMLImageElement;
  bakerySide: HTMLImageElement;
  lodgeEast: HTMLImageElement;
  lodgeWest: HTMLImageElement;
  herbalistWest: HTMLImageElement;
  herbalistEast: HTMLImageElement;
  blacksmithFront: HTMLImageElement;
  residentialFront: HTMLImageElement;
  apothecaryFront: HTMLImageElement;

  // 6 Authentic Back Houses
  houseBackCottage: HTMLImageElement;
  houseBackBlueWoodshed: HTMLImageElement;
  houseBackTavernMossy: HTMLImageElement;
  houseBackBlueCellar: HTMLImageElement;
  houseSideView: HTMLImageElement;

  // Fan-tasy Architecture
  houseHaySmall: HTMLImageElement;
  houseHayWing: HTMLImageElement;
  houseHayTerrace: HTMLImageElement;
  houseHayBalcony: HTMLImageElement;
  villageWell: HTMLImageElement;
  cityStoneGate: HTMLImageElement;

  // Quarry & Rocks
  stoneQuarry: HTMLImageElement;
  limestoneBoulders: HTMLImageElement;
  rockCluster: HTMLImageElement;
  rockPair: HTMLImageElement;
  rockMonolith: HTMLImageElement;
  rockFlatSlab: HTMLImageElement;

  // Street Props & 32-bit Elements
  streetLantern: HTMLImageElement;
  woodenBench: HTMLImageElement;
  woodenBenchRustic: HTMLImageElement;
  bulletinBoard: HTMLImageElement;
  barrelWood: HTMLImageElement;
  barrelStack: HTMLImageElement;
  crateWood: HTMLImageElement;
  wagonCart: HTMLImageElement;
  marketStall: HTMLImageElement;
  hayBaleStack: HTMLImageElement;

  // Catálogo (armas/equipamentos da classe Teclas) — chaves dinâmicas
  // weapon_<slug> / equip_<slug>, ver CATALOG_WEAPON_SLUGS/CATALOG_EQUIP_SLUGS.
  [key: string]: HTMLImageElement;
}

const ASSET_PATHS: Record<keyof LoadedAssets, string> = {
  terrain: '/assets/ancient-ruins/Tilesets/Tileset-Terrain2.png',
  wall: '/assets/ancient-ruins/Tilesets/wall-8 - 2 tiles tall-transparency.png',
  animatedWater: '/assets/ancient-ruins/Tilesets/Tileset-Animated Terrains-8 frames- transparency.png',
  propsAtlas: '/assets/ancient-ruins/Props/Atlas-Props.png',
  altar: '/assets/ancient-ruins/Props/altar 224x288 - standing on grass.png',
  shrine: '/assets/ancient-ruins/Props/shrine or fountain 160x128-on grass.png',
  chalice: '/assets/ancient-ruins/Props/golden chalice 64x64-spirits.png',
  merchantIdle: '/assets/ancient-ruins/Characters/NPC Merchant-idle.png',
  creatureIdle: '/assets/ancient-ruins/Characters/luck creature-idle.png',
  creatureRun: '/assets/ancient-ruins/Characters/luck creature-run.png',
  iconPotion: '/assets/ancient-ruins/Characters/NPC Merchant-icons-potion.png',
  iconSword: '/assets/ancient-ruins/Characters/NPC Merchant-icons-sword.png',
  iconBow: '/assets/ancient-ruins/Characters/NPC Merchant-icons-bow.png',

  // Hero Animated
  heroAnimated: '/assets/characters/hero_animated.png',
  heroAuthenticAnimated: '/assets/characters/hero_authentic_animated.png',
  knightWalk: '/assets/characters/knight_walk.png',
  knightIdle: '/assets/characters/knight_idle.png',
  knightSlash: '/assets/characters/knight_slash.png',

  // Monstros
  monAranha: '/assets/monsters/aranha.png',
  monNocturno: '/assets/monsters/nocturno.png',
  monMaestro: '/assets/monsters/maestro.png',
  monColosso: '/assets/monsters/colosso.png',
  monDama: '/assets/monsters/dama.png',

  // Props da Floresta Sombria
  darkDeadtree: '/assets/props/dark_deadtree.png',
  darkBigpine: '/assets/props/dark_bigpine.png',
  darkBigrock: '/assets/props/dark_bigrock.png',
  darkIcecrystal: '/assets/props/dark_icecrystal.png',
  darkThorn: '/assets/props/dark_thorn_p.png',
  toolAxeWood: '/assets/tools/axe_wood.png',
  toolAxeGold: '/assets/tools/axe_gold.png',
  toolAxeCrystal: '/assets/tools/axe_crystal.png',
  toolPickWood: '/assets/tools/pick_wood.png',
  toolPickGold: '/assets/tools/pick_gold.png',
  toolPickCrystal: '/assets/tools/pick_crystal.png',
  weaponAcordelaminaT2: '/assets/weapons/acordelamina_t2.png',
  weaponAcordelaminaT2Energized: '/assets/weapons/acordelamina_t2_energized.png',
  wallMusical1: '/assets/props/wall_musical_1.png',
  wallMusical2: '/assets/props/wall_musical_2.png',
  wallMusical3: '/assets/props/wall_musical_3.png',
  wallMusical4: '/assets/props/wall_musical_4.png',
  wallMusical5: '/assets/props/wall_musical_5.png',
  wallMusical6: '/assets/props/wall_musical_6.png',
  wallMusical7: '/assets/props/wall_musical_7.png',
  wallMusical8: '/assets/props/wall_musical_8.png',
  wallGate: '/assets/props/wall_gate.png',

  // Nós de extração (spots)
  spotWood: '/assets/props/wood2_spot.png',
  spotMineral: '/assets/props/mineral_spot.png',
  spotGold: '/assets/props/gold_spot.png',
  spotCrystalBlue: '/assets/props/crystal_blue_spot.png',
  spotCrystalRed: '/assets/props/crystal_red_spot.png',
  spotEcoEssence: '/assets/props/eco_essence_spot.png',

  // Ecos musicais (12 notas)
  ecoDo: '/assets/ecos/do.png',
  ecoDoS: '/assets/ecos/do_s.png',
  ecoRe: '/assets/ecos/re.png',
  ecoReS: '/assets/ecos/re_s.png',
  ecoMi: '/assets/ecos/mi.png',
  ecoFa: '/assets/ecos/fa.png',
  ecoFaS: '/assets/ecos/fa_s.png',
  ecoSol: '/assets/ecos/sol.png',
  ecoSolS: '/assets/ecos/sol_s.png',
  ecoLa: '/assets/ecos/la.png',
  ecoLaS: '/assets/ecos/la_s.png',
  ecoSi: '/assets/ecos/si.png',

  // NPCs
  npcCadencia: '/assets/characters/npcs/cadencia.png',
  npcTonico: '/assets/characters/npcs/tonico.png',
  npcSetimo: '/assets/characters/npcs/setimo.png',
  npcSeminima: '/assets/characters/npcs/seminima.png',
  npcDiapasao: '/assets/characters/npcs/diapasao.png',

  // Wins - Classe da Voz (personagem temporária)
  winsMove: '/assets/characters/wins/wins_move.png',
  winsIcon: '/assets/characters/wins/wins_icon.png',
  // Huans - Classe Cordas (personagem temporária)
  huansMove: '/assets/characters/huans/huans_move.png',
  huansIcon: '/assets/characters/huans/huans_icon.png',

  // Akles - Herói Cavaleiro
  aklesIdle: '/assets/characters/akles/akles_idle.png',
  aklesWalk: '/assets/characters/akles/akles_walk.png',
  aklesRun: '/assets/characters/akles/akles_run.png',
  aklesSlash: '/assets/characters/akles/akles_slash.png',
  aklesThrust: '/assets/characters/akles/akles_thrust.png',
  aklesSpin: '/assets/characters/akles/akles_spin.png',
  aklesSpecial: '/assets/characters/akles/akles_special.png',
  aklesCast: '/assets/characters/akles/akles_cast.png',

  // Buildings
  townHallFront: '/assets/buildings/town_hall_front.png',
  townHallDiag: '/assets/buildings/town_hall_diag.png',
  townHallBack: '/assets/buildings/town_hall_back.png',
  townHallSide: '/assets/buildings/town_hall_side.png',
  bakeryFront: '/assets/buildings/bakery_front.png',
  bakeryDiag: '/assets/buildings/bakery_diag.png',
  bakeryBack: '/assets/buildings/bakery_back.png',
  bakerySide: '/assets/buildings/bakery_side.png',
  lodgeEast: '/assets/buildings/lodge_east.png',
  lodgeWest: '/assets/buildings/lodge_west.png',
  herbalistWest: '/assets/buildings/herbalist_west.png',
  herbalistEast: '/assets/buildings/herbalist_east.png',
  blacksmithFront: '/assets/buildings/blacksmith_front.png',
  residentialFront: '/assets/buildings/residential_front.png',
  apothecaryFront: '/assets/buildings/apothecary_front.png',

  // 6 Authentic Back Houses
  houseBackCottage: '/assets/buildings/house_back_cottage.png',
  houseBackBlueWoodshed: '/assets/buildings/house_back_blue_woodshed.png',
  houseBackTavernMossy: '/assets/buildings/house_back_tavern_mossy.png',
  houseBackBlueCellar: '/assets/buildings/house_back_blue_cellar.png',
  houseSideView: '/assets/buildings/house_side_view.png',

  // Fan-tasy Architecture
  houseHaySmall: '/assets/buildings/house_hay_small.png',
  houseHayWing: '/assets/buildings/house_hay_wing.png',
  houseHayTerrace: '/assets/buildings/house_hay_terrace.png',
  houseHayBalcony: '/assets/buildings/house_hay_balcony.png',
  villageWell: '/assets/buildings/village_well.png',
  cityStoneGate: '/assets/buildings/city_stone_gate.png',

  // Quarry & Rocks
  stoneQuarry: '/assets/buildings/stone_quarry.png',
  limestoneBoulders: '/assets/buildings/limestone_boulders.png',
  rockCluster: '/assets/props/rock_cluster.png',
  rockPair: '/assets/props/rock_pair.png',
  rockMonolith: '/assets/props/rock_monolith.png',
  rockFlatSlab: '/assets/props/rock_flat_slab.png',

  // Street Props & 32-bit Elements
  streetLantern: '/assets/props/street_lantern.png',
  woodenBench: '/assets/props/wooden_bench.png',
  woodenBenchRustic: '/assets/props/wooden_bench_rustic.png',
  bulletinBoard: '/assets/props/bulletin_board.png',
  barrelWood: '/assets/props/barrel_wood.png',
  barrelStack: '/assets/props/barrel_stack.png',
  crateWood: '/assets/props/crate_wood.png',
  wagonCart: '/assets/props/wagon_cart.png',
  marketStall: '/assets/props/market_stall.png',
  hayBaleStack: '/assets/props/hay_bale_stack.png',
};

// Catálogo — armas e equipamentos da classe Teclas (Tier 1-5). Gerado em
// loop pra não repetir 51 linhas manuais; ver src/game/catalogData.ts.
export const CATALOG_WEAPON_SLUGS = [
  'tecla_de_carvalho', 'ferro_do_pianista', 'cravo_de_batalha', 'acordeonita',
  'cravo_azul', 'teclado_resonante', 'acordeon_de_aco', 'orgao_do_peregrino',
  'piano_de_cristal', 'cravo_real_de_acordelot', 'orgao_resonante_arma', 'celesta_lunar_arma',
  'piano_do_maestro', 'catedral_harmonica_arma', 'cravo_do_rei', 'concerto_de_cristal',
  'virtuose_arma', 'orgao_celestial', 'requiem_do_cravo',
];
export const CATALOG_EQUIP_SLUGS = [
  'colar_do_pianista_solitario', 'anel_do_pianista_solitario', 'reliquia_do_pianista_solitario', 'aura_do_pianista_solitario',
  'colar_do_acordeonista', 'anel_do_acordeonista', 'reliquia_do_acordeonista', 'aura_do_acordeonista',
  'colar_do_orgao_resonante', 'anel_do_orgao_resonante', 'reliquia_do_orgao_resonante', 'aura_do_orgao_resonante',
  'colar_da_celesta_lunar', 'anel_da_celesta_lunar', 'reliquia_da_celesta_lunar', 'aura_da_celesta_lunar',
  'colar_do_maestro', 'anel_do_maestro', 'reliquia_do_maestro', 'aura_do_maestro',
  'colar_da_catedral_harmonica', 'anel_da_catedral_harmonica', 'reliquia_da_catedral_harmonica', 'aura_da_catedral_harmonica',
  'colar_virtuose', 'anel_virtuose', 'reliquia_virtuose', 'aura_virtuose',
  'colar_do_concerto_celestial', 'anel_do_concerto_celestial', 'reliquia_do_concerto_celestial', 'aura_do_concerto_celestial',
];
for (const slug of CATALOG_WEAPON_SLUGS) {
  ASSET_PATHS[`weapon_${slug}`] = `/assets/catalogo/armas/${slug}.png`;
}
for (const slug of CATALOG_EQUIP_SLUGS) {
  ASSET_PATHS[`equip_${slug}`] = `/assets/catalogo/equipamentos/${slug}.png`;
}

let cachedAssets: LoadedAssets | null = null;
let loadPromise: Promise<LoadedAssets> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.warn(`[AssetLoader] Failed to load ${src}:`, err);
      resolve(img);
    };
    img.src = src;
  });
}

export function loadGameAssets(): Promise<LoadedAssets> {
  if (cachedAssets) {
    return Promise.resolve(cachedAssets);
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const entries = Object.entries(ASSET_PATHS) as [keyof LoadedAssets, string][];
    const loadedImages = await Promise.all(
      entries.map(async ([key, path]) => {
        const img = await loadImage(path);
        return [key, img] as const;
      })
    );

    const assetsRecord = {} as LoadedAssets;
    for (const [key, img] of loadedImages) {
      assetsRecord[key] = img;
    }

    cachedAssets = assetsRecord;
    return cachedAssets;
  })();

  return loadPromise;
}
