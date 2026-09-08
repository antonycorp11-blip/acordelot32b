import { supabase } from '../lib/supabaseClient';
import type { GameEngine, PlayerStats } from './engine';
import type { ToolTier } from './types';

export interface AcordelotSaveData {
  id?: string;
  user_id: string;
  character_name: string;
  active_character: 'akles' | 'wins' | 'huans';
  pos_x: number;
  pos_y: number;
  direction: 'down' | 'up' | 'left' | 'right';
  current_map: string;
  level: number;
  xp: number;
  coins: number;
  stats_by_character: Record<string, Partial<PlayerStats>>;
  inventory: Record<string, number>;
  weapons: {
    equippedByCharacter: Record<string, string>;
    levels: Record<string, number>;
  };
  equipments: {
    equippedByCharacter: Record<string, Record<string, string | null>>;
    pieceLevels: Record<string, number>;
  };
  tools: {
    equippedAxe: ToolTier;
    equippedPick: ToolTier;
    ownedAxes: ToolTier[];
    ownedPicks: ToolTier[];
    equippedResonator?: ToolTier;
    ownedResonators?: ToolTier[];
  };
  passives: Record<string, unknown>;
  quests: {
    date: string;
    daily: Array<{ id: string; accepted: boolean; progress: number; claimed: boolean }>;
    mainCompleted?: string[];
  };
  settings: Record<string, unknown>;
  play_time_seconds: number;
  updated_at?: string;
}

const LOCAL_SAVE_PREFIX = 'acordelot_player_save_';
export const PROGRESSION_VERSION = '2026-09-06-campaign-reset-1';
const PROGRESSION_MARKER_KEY = 'acordelot_progression_version';
// Reset único e direcionado para a conta de testes do criador. O marcador é
// gravado no primeiro autosave novo; portanto não afeta outras contas nem
// reinicia Áquilles novamente nos acessos seguintes.
const AQUILLES_FLOW_RESET_VERSION = '2026-09-06-opening-flow-test-1';
// Migração única: a conta de testes já havia recebido as seis notas pelo fluxo
// antigo. Recuamos somente a lição harmônica para permitir testar a nova caça.
const HARMONY_LESSON_VERSION = '2026-09-07-seven-notes-lesson-1';
// Reinicia somente a narrativa da conta de validação. Nível, XP, itens,
// equipamentos, ferramentas e composições conquistadas são preservados.
const QUEST_REPLAY_VERSION = '2026-09-07-full-campaign-replay-2';

/**
 * Invalida somente progresso local antigo. Login, preferências de áudio,
 * layout do HUD e mapa publicado permanecem intactos.
 */
export function prepareProgressionVersion(): void {
  try {
    if (localStorage.getItem(PROGRESSION_MARKER_KEY) === PROGRESSION_VERSION) return;
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_SAVE_PREFIX)) localStorage.removeItem(key);
    }
    localStorage.removeItem('acordelot_tools_v1');
    localStorage.removeItem('acordelot_skill_progress_v1');
    localStorage.removeItem('acordelot_daily_quests_v1');
    localStorage.setItem(PROGRESSION_MARKER_KEY, PROGRESSION_VERSION);
  } catch {
    // O jogo ainda funciona sem cache local (ex.: modo privado restritivo).
  }
}

/** Limpa caches globais do jogo uma única vez na conta de testes de Áquilles. */
export function prepareAccountFlowReset(userId?: string | null, email?: string | null): void {
  const emailPrefix = String(email || '').trim().toLowerCase().split('@')[0];
  if (!userId || emailPrefix !== 'antonycorp11') return;
  const browserMarker = 'acordelot_aquilles_flow_reset_version';
  try {
    if (localStorage.getItem(browserMarker) === AQUILLES_FLOW_RESET_VERSION) return;
    localStorage.removeItem(LOCAL_SAVE_PREFIX + userId);
    localStorage.removeItem('acordelot_tools_v1');
    localStorage.removeItem('acordelot_skill_progress_v1');
    localStorage.removeItem('acordelot_daily_quests_v1');
    localStorage.setItem(browserMarker, AQUILLES_FLOW_RESET_VERSION);
  } catch {
    // A validação do save em nuvem ainda garante o reset sem localStorage.
  }
}

function isCurrentProgression(save: AcordelotSaveData | null): save is AcordelotSaveData {
  return !!save && (save.settings as Record<string, unknown> | undefined)?.progression_version === PROGRESSION_VERSION;
}

function isCurrentAccountReset(save: AcordelotSaveData | null, email?: string | null): boolean {
  const emailPrefix = String(email || '').trim().toLowerCase().split('@')[0];
  if (emailPrefix !== 'antonycorp11') return true;
  return (save?.settings as Record<string, unknown> | undefined)?.aquilles_flow_reset_version === AQUILLES_FLOW_RESET_VERSION;
}

function migrateAquillesHarmonyLesson(save: AcordelotSaveData | null, email?: string | null): AcordelotSaveData | null {
  if (!save) return null;
  const emailPrefix = String(email || '').trim().toLowerCase().split('@')[0];
  const settings = (save.settings || {}) as Record<string, unknown>;
  if (emailPrefix !== 'antonycorp11' || settings.harmony_lesson_version === HARMONY_LESSON_VERSION) return save;
  if (settings.echo_tutorial_stage !== 'synthesize_scale' && settings.echo_tutorial_stage !== 'completed') return save;

  const next = JSON.parse(JSON.stringify(save)) as AcordelotSaveData;
  const nextSettings = (next.settings ||= {}) as Record<string, unknown>;
  nextSettings.harmony_lesson_version = HARMONY_LESSON_VERSION;
  nextSettings.echo_tutorial_stage = 'collect_scale_notes';
  nextSettings.post_echo_stage = 'locked';
  nextSettings.fragments = Array(12).fill(0);
  nextSettings.notes_built = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  nextSettings.scales_built = {};
  nextSettings.owned_chords = {};
  nextSettings.equipped_scales_by_character = { akles: [], wins: [], huans: [] };
  nextSettings.equipped_chords_by_scale_by_character = { akles: {}, wins: {}, huans: {} };

  const lessonItems = new Set(['tone', 'semitone', ...['c', 'd', 'e', 'f', 'g', 'a', 'b'].map((key) => `frag_${key}`)]);
  next.inventory = Object.fromEntries(Object.entries(next.inventory || {}).filter(([key]) => !key.startsWith('scale_') && !lessonItems.has(key)));
  const completed = next.quests?.mainCompleted || [];
  next.quests.mainCompleted = completed.filter((id) => !id.startsWith('MQ_C1_004_ECOS_') && !id.startsWith('MQ_C1_POST_ECHO_'));
  next.quests.mainCompleted.push('MQ_C1_004_ECOS_COLLECT_SCALE_NOTES');
  return next;
}

function migrateAquillesQuestReplay(save: AcordelotSaveData | null, email?: string | null): AcordelotSaveData | null {
  if (!save) return null;
  const emailPrefix = String(email || '').trim().toLowerCase().split('@')[0];
  const settings = (save.settings || {}) as Record<string, unknown>;
  if (emailPrefix !== 'antonycorp11' || settings.quest_replay_version === QUEST_REPLAY_VERSION) return save;
  const next = JSON.parse(JSON.stringify(save)) as AcordelotSaveData;
  const nextSettings = (next.settings ||= {}) as Record<string, unknown>;
  nextSettings.quest_replay_version = QUEST_REPLAY_VERSION;
  nextSettings.echo_tutorial_stage = 'locked';
  nextSettings.post_echo_stage = 'locked';
  nextSettings.region_quest_stage = 'locked';
  nextSettings.region_crystal_progress = 0;
  next.quests = { ...(next.quests || { date: '', daily: [] }), mainCompleted: [] };
  next.active_character = 'akles';
  next.character_name = 'Akles';
  next.pos_x = 36 * 32;
  next.pos_y = 156 * 32;
  next.direction = 'down';
  next.updated_at = new Date().toISOString();
  return next;
}

/**
 * Converte o estado atual do GameEngine em um payload completo para salvar.
 */
export function serializeEngineSave(engine: GameEngine, userId: string): Omit<AcordelotSaveData, 'id'> {
  const charKey = engine.activeCharacter;
  const anyEngine = engine as any;

  // Garante a extração dos stats de cada personagem
  const statsByChar: Record<string, any> = {};
  if (anyEngine.statsByCharacter) {
    for (const [k, v] of Object.entries(anyEngine.statsByCharacter)) {
      statsByChar[k] = { ...(v as any) };
    }
  }
  statsByChar[charKey] = { ...engine.stats };

  // Armas equipadas por personagem e níveis
  const weaponByChar = anyEngine.weaponByCharacter
    ? { ...anyEngine.weaponByCharacter }
    : { akles: engine.equippedWeaponKey };
  weaponByChar[charKey] = engine.equippedWeaponKey;

  // Equipamentos por personagem
  const piecesByChar = anyEngine.piecesByCharacter
    ? { ...anyEngine.piecesByCharacter }
    : { akles: { ...engine.equippedPieces } };
  piecesByChar[charKey] = { ...engine.equippedPieces };

  // Missões
  const dailyQuests = (engine.dailyQuests || []).map((q) => ({
    id: q.def.id,
    accepted: q.accepted,
    progress: q.progress,
    claimed: q.claimed,
  }));

  return {
    user_id: userId,
    character_name: engine.stats.name || 'Akles',
    active_character: charKey,
    pos_x: Math.round(engine.player.x),
    pos_y: Math.round(engine.player.y),
    direction: engine.player.direction || 'down',
    current_map: engine.activeMapId || 'overworld',
    level: engine.stats.level || 1,
    xp: engine.stats.xp || 0,
    coins: engine.coins || 0,
    stats_by_character: statsByChar,
    inventory: { ...engine.inventory },
    weapons: {
      equippedByCharacter: weaponByChar,
      levels: { ...engine.weaponLevels },
    },
    equipments: {
      equippedByCharacter: piecesByChar,
      pieceLevels: { ...(anyEngine.pieceLevels || {}) },
    },
    tools: {
      equippedAxe: engine.equippedAxe,
      equippedPick: engine.equippedPick,
      ownedAxes: [...engine.ownedAxes],
      ownedPicks: [...engine.ownedPicks],
      equippedResonator: engine.equippedResonator,
      ownedResonators: [...engine.ownedResonators],
    },
    passives: {
      ...(anyEngine.passiveLevels || {}),
      __classLevels: { ...(anyEngine.classPassiveLevels || {}) },
      __skillLevels: { ...(anyEngine.skillLevels || {}) },
    },
    quests: {
      date: new Date().toISOString().slice(0, 10),
      daily: dailyQuests,
      mainCompleted: engine.completedMainQuestIds,
    },
    settings: {
      progression_version: PROGRESSION_VERSION,
      aquilles_flow_reset_version: AQUILLES_FLOW_RESET_VERSION,
      harmony_lesson_version: HARMONY_LESSON_VERSION,
      quest_replay_version: QUEST_REPLAY_VERSION,
      fragments: [...(engine.fragments || [])],
      notes_built: [...(engine.notesBuilt || [])],
      scales_built: { ...engine.scalesBuilt },
      owned_chords: { ...engine.ownedChords },
      equipped_scales_by_character: structuredClone(engine.equippedScalesByCharacter),
      equipped_chords_by_scale_by_character: structuredClone(engine.equippedChordsByScaleByCharacter),
      echo_tutorial_stage: engine.echoTutorialStage,
      post_echo_stage: engine.postEchoStage,
      region_quest_stage: engine.regionQuestStage,
      region_crystal_progress: engine.regionCrystalProgress,
      crystal_dungeon_run: engine.dungeonRun,
      shop_purchases: { ...engine.shopPurchases, counts: { ...engine.shopPurchases.counts } },
      bag_level: engine.bagLevel,
      hud_layout: (() => {
        try {
          const raw = localStorage.getItem('acordelot_hud_layout_v3');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })(),
      custom_map: (() => {
        try {
          const raw = localStorage.getItem('acordelot_map_v3');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })(),
    },
    play_time_seconds: Math.round(anyEngine.timeElapsed || 0),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Salva localmente de forma instantânea e síncrona (imune a fechamentos bruscos do navegador/app).
 */
export function saveToLocalInstant(payload: any): void {
  try {
    if (!payload?.user_id) return;
    localStorage.setItem(LOCAL_SAVE_PREFIX + payload.user_id, JSON.stringify(payload));
  } catch (err) {
    console.warn('[SaveManager] Falha ao salvar localmente no dispositivo:', err);
  }
}

/**
 * Lê o save local instantâneo do dispositivo.
 */
export function getLocalInstantSave(userId: string): AcordelotSaveData | null {
  try {
    const raw = localStorage.getItem(LOCAL_SAVE_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Injeta o save recuperado de volta no GameEngine de forma abrangente.
 */
export function applySaveToEngine(engine: GameEngine, save: Partial<AcordelotSaveData>): void {
  if (!save) return;
  const anyEngine = engine as any;

  // 1. Posição e Câmera
  if (typeof save.pos_x === 'number' && typeof save.pos_y === 'number') {
    engine.player.x = save.pos_x;
    engine.player.y = save.pos_y;
    // Reposiciona a câmera diretamente para o jogador sem atraso
    if (typeof engine.viewportW === 'number' && typeof engine.viewportH === 'number') {
      engine.camX = engine.player.x + 12 - engine.viewportW / 2;
      engine.camY = engine.player.y + 12 - engine.viewportH / 2;
    }
  }
  if (save.direction) {
    engine.player.direction = save.direction;
  }

  // 2. Personagem ativo
  if (save.active_character && save.active_character !== engine.activeCharacter) {
    engine.switchCharacter(save.active_character);
  }

  // 3. Stats e Nível por personagem
  if (save.stats_by_character && typeof save.stats_by_character === 'object') {
    if (anyEngine.statsByCharacter) {
      for (const [k, v] of Object.entries(save.stats_by_character)) {
        if (anyEngine.statsByCharacter[k] && v) {
          anyEngine.statsByCharacter[k] = { ...anyEngine.statsByCharacter[k], ...v };
        }
      }
    }
    const currentStats = save.stats_by_character[engine.activeCharacter];
    if (currentStats) {
      engine.stats = { ...engine.stats, ...currentStats };
      if (anyEngine.statsByCharacter) {
        anyEngine.statsByCharacter[engine.activeCharacter] = engine.stats;
      }
    }
  }

  // Garante a aplicação do Nível e XP raízes
  if (typeof save.level === 'number' && save.level > 0) {
    engine.stats.level = save.level;
    if (anyEngine.statsByCharacter?.[engine.activeCharacter]) {
      anyEngine.statsByCharacter[engine.activeCharacter].level = save.level;
    }
  }
  if (typeof save.xp === 'number') {
    engine.stats.xp = save.xp;
    if (anyEngine.statsByCharacter?.[engine.activeCharacter]) {
      anyEngine.statsByCharacter[engine.activeCharacter].xp = save.xp;
    }
  }
  engine.onStatsChange?.({ ...engine.stats });

  // 4. Economia & Inventário
  if (typeof save.coins === 'number') {
    engine.coins = save.coins;
    engine.onCoinsChange?.(engine.coins);
  }
  if (save.inventory && typeof save.inventory === 'object') {
    engine.inventory = { ...save.inventory };
    engine.onInventoryChange?.({ ...engine.inventory });
  }

  // 5. Armas
  if (save.weapons) {
    if (save.weapons.levels) {
      engine.weaponLevels = { ...engine.weaponLevels, ...save.weapons.levels };
    }
    if (save.weapons.equippedByCharacter) {
      // Migração dos protótipos T1 para as armas T2 oficiais escolhidas para
      // Wins e Huans. Outras armas selecionadas pelo jogador são preservadas.
      const equippedByCharacter = { ...save.weapons.equippedByCharacter };
      if (equippedByCharacter.wins === 'vocal_cajado_do_corista_jovem') {
        equippedByCharacter.wins = 'vocal_cajado_do_solista';
      }
      if (equippedByCharacter.huans === 'cordas_arco_do_cordel_jovem') {
        equippedByCharacter.huans = 'cordas_arco_do_violao_harmonico';
      }
      if (anyEngine.weaponByCharacter) {
        anyEngine.weaponByCharacter = {
          ...anyEngine.weaponByCharacter,
          ...equippedByCharacter,
        };
      }
      const charWeapon = equippedByCharacter[engine.activeCharacter];
      if (charWeapon) {
        engine.equippedWeaponKey = charWeapon;
        engine.onWeaponChange?.();
      }
    }
  }

  // 6. Equipamentos
  if (save.equipments) {
    if (save.equipments.pieceLevels && anyEngine.pieceLevels) {
      anyEngine.pieceLevels = { ...anyEngine.pieceLevels, ...save.equipments.pieceLevels };
    }
    if (save.equipments.equippedByCharacter) {
      if (anyEngine.piecesByCharacter) {
        anyEngine.piecesByCharacter = {
          ...anyEngine.piecesByCharacter,
          ...save.equipments.equippedByCharacter,
        };
      }
      const charPieces = save.equipments.equippedByCharacter[engine.activeCharacter];
      if (charPieces) {
        engine.equippedPieces = { ...engine.equippedPieces, ...charPieces };
        engine.onEquipChange?.();
      }
    }
  }

  // 7. Ferramentas
  if (save.tools) {
    if (save.tools.equippedAxe) engine.equippedAxe = save.tools.equippedAxe;
    if (save.tools.equippedPick) engine.equippedPick = save.tools.equippedPick;
    if (Array.isArray(save.tools.ownedAxes)) engine.ownedAxes = [...save.tools.ownedAxes];
    if (Array.isArray(save.tools.ownedPicks)) engine.ownedPicks = [...save.tools.ownedPicks];
    if (save.tools.equippedResonator) engine.equippedResonator = save.tools.equippedResonator;
    if (Array.isArray(save.tools.ownedResonators)) engine.ownedResonators = [...save.tools.ownedResonators];
    engine.onToolsChange?.({ axe: engine.equippedAxe, pick: engine.equippedPick });
  }

  // 8. Passivas
  if (save.passives && anyEngine.passiveLevels) {
    const legacy = Object.fromEntries(Object.entries(save.passives).filter(([key]) => !key.startsWith('__')));
    anyEngine.passiveLevels = { ...anyEngine.passiveLevels, ...legacy };
    if (save.passives.__classLevels && anyEngine.classPassiveLevels) anyEngine.classPassiveLevels = { ...anyEngine.classPassiveLevels, ...(save.passives.__classLevels as object) };
    if (save.passives.__skillLevels && anyEngine.skillLevels) anyEngine.skillLevels = { ...anyEngine.skillLevels, ...(save.passives.__skillLevels as object) };
  }

  // 9. Missões principais e diárias
  if (save.quests && Array.isArray(save.quests.mainCompleted)) {
    engine.restoreMainQuestProgress(save.quests.mainCompleted);
  }
  if (save.quests && Array.isArray(save.quests.daily) && anyEngine.dailyQuests) {
    const today = new Date().toISOString().slice(0, 10);
    if (save.quests.date === today) {
      for (const qData of save.quests.daily) {
        const found = engine.dailyQuests.find((x) => x.def.id === qData.id);
        if (found) {
          found.accepted = qData.accepted;
          found.progress = qData.progress;
          found.claimed = qData.claimed;
        }
      }
      engine.onQuestsChange?.();
    }
  }

  // 10. Configurações de layout, notas e Mapa customizado
  if (save.settings && typeof save.settings === 'object') {
    const s = save.settings as Record<string, any>;
    if (Array.isArray(s.fragments) && s.fragments.length === 12) {
      engine.fragments = [...s.fragments];
    }
    if (Array.isArray(s.notes_built) && s.notes_built.length === 12) {
      engine.notesBuilt = [...s.notes_built];
    }
    if (s.scales_built && typeof s.scales_built === 'object') engine.scalesBuilt = { ...s.scales_built };
    if (s.owned_chords && typeof s.owned_chords === 'object') engine.ownedChords = { ...s.owned_chords };
    if (s.equipped_scales_by_character && typeof s.equipped_scales_by_character === 'object') {
      for (const key of ['akles', 'wins', 'huans'] as const) {
        const list = s.equipped_scales_by_character[key];
        if (Array.isArray(list)) engine.equippedScalesByCharacter[key] = list.filter((v: unknown) => typeof v === 'string').slice(0, 3);
      }
    }
    if (s.equipped_chords_by_scale_by_character && typeof s.equipped_chords_by_scale_by_character === 'object') {
      for (const key of ['akles', 'wins', 'huans'] as const) {
        const source = s.equipped_chords_by_scale_by_character[key];
        if (!source || typeof source !== 'object') continue;
        engine.equippedChordsByScaleByCharacter[key] = Object.fromEntries(
          Object.entries(source).map(([scale, ids]) => [scale, Array.isArray(ids) ? ids.filter((v) => typeof v === 'string').slice(0, 3) : []]),
        );
      }
    }
    if (typeof s.echo_tutorial_stage === 'string' && ['locked', 'forge_resonator', 'return_to_lucian', 'capture_echo', 'synthesize_note', 'collect_scale_notes', 'synthesize_scale', 'completed'].includes(s.echo_tutorial_stage)) {
      engine.echoTutorialStage = s.echo_tutorial_stage as typeof engine.echoTutorialStage;
    }
    if (typeof s.post_echo_stage === 'string' && ['locked', 'antony_riddle', 'miro_bell', 'gather_dust', 'lucian_harmony', 'equip_harmony', 'antony_letter', 'completed'].includes(s.post_echo_stage)) {
      engine.postEchoStage = s.post_echo_stage as typeof engine.postEchoStage;
    } else if (engine.echoTutorialStage === 'completed') engine.postEchoStage = 'antony_riddle';
    if (typeof s.region_quest_stage === 'string' && ['locked', 'antony_invitation', 'meet_flora', 'forge_gold_pick', 'visit_sanctuary', 'gather_crystals', 'enter_cavern', 'defeat_guardian', 'return_antony', 'completed'].includes(s.region_quest_stage)) {
      engine.regionQuestStage = s.region_quest_stage as typeof engine.regionQuestStage;
    } else if (engine.postEchoStage === 'completed') engine.regionQuestStage = 'antony_invitation';
    if (typeof s.region_crystal_progress === 'number') engine.regionCrystalProgress = Math.max(0, Math.min(5, Math.floor(s.region_crystal_progress)));
    if (engine.echoTutorialStage === 'completed' && engine.postEchoStage !== 'completed') {
      const chordCount = Math.min(3, Object.values(engine.equippedChordsByScale).flat().length);
      const dustCount = Math.min(12, engine.inventory.eco_dust || 0);
      const objectives: Record<string, { title: string; text: string; progress: number; target: number; ready: boolean }> = {
        locked: { title: 'O Sino que Esqueceu o Fá', text: 'Procure o Sr. Antony', progress: 0, target: 2, ready: false },
        antony_riddle: { title: 'O Sino que Esqueceu o Fá', text: 'Procure o Sr. Antony', progress: 0, target: 2, ready: false },
        miro_bell: { title: 'O Sino que Esqueceu o Fá', text: 'Pergunte a Miro pelo sino mudo', progress: 0, target: 2, ready: false },
        gather_dust: { title: 'O Sino que Esqueceu o Fá', text: dustCount >= 12 ? 'Amostras prontas! Volte a Miro.' : 'Reúna 12 porções de Poeira de Eco', progress: dustCount, target: 12, ready: dustCount >= 12 },
        lucian_harmony: { title: 'Três Funções, Uma Intenção', text: 'Leve a leitura do sino até Lucian', progress: 0, target: 2, ready: false },
        equip_harmony: { title: 'Três Funções, Uma Intenção', text: chordCount >= 3 ? 'Composição pronta! Volte a Lucian.' : 'Equipe uma escala e 3 acordes', progress: chordCount, target: 3, ready: chordCount >= 3 },
        antony_letter: { title: 'A Carta que Ninguém Enviou', text: 'Conte a descoberta ao Sr. Antony', progress: 0, target: 1, ready: false },
      };
      engine.storyObjective = objectives[engine.postEchoStage] ?? engine.storyObjective;
    }
    if (engine.postEchoStage === 'completed' && engine.regionQuestStage !== 'completed' && engine.regionQuestStage !== 'locked') {
      const regionObjectives: Record<string, { title: string; text: string; progress: number; target: number; ready: boolean }> = {
        antony_invitation: { title: 'O Santuário que Respondeu', text: 'Fale com o Sr. Antony sobre Klassíkia', progress: 0, target: 2, ready: false },
        meet_flora: { title: 'O Santuário que Respondeu', text: 'Encontre Flora no caminho leste', progress: 0, target: 2, ready: false },
        forge_gold_pick: { title: 'O Santuário que Respondeu', text: (engine.inventory.ore || 0) >= 6 ? 'Minério suficiente. Volte a Dório e forje a Picareta Dourada' : 'Extraia 6 Minérios Ressonantes na pedreira', progress: Math.min(6, engine.inventory.ore || 0), target: 6, ready: (engine.inventory.ore || 0) >= 6 },
        visit_sanctuary: { title: 'O Santuário que Respondeu', text: 'Cruze o portal do Santuário, ao norte de Acordelot', progress: 1, target: 2, ready: false },
        gather_crystals: { title: 'Doze Luzes, Uma Ausência', text: 'Extraia 5 Cristais de Eco nas redondezas', progress: engine.regionCrystalProgress, target: 5, ready: false },
        enter_cavern: { title: 'A Caverna sob a Escala', text: 'Atravesse o bosque e a ponte na fronteira leste', progress: 0, target: 2, ready: false },
        defeat_guardian: { title: 'A Caverna sob a Escala', text: 'Derrote o Guardião Cristalino', progress: 0, target: 1, ready: false },
        return_antony: { title: 'A Caverna sob a Escala', text: 'Leve a mensagem cristalina ao Sr. Antony', progress: 1, target: 2, ready: true },
      };
      engine.storyObjective = regionObjectives[engine.regionQuestStage] ?? engine.storyObjective;
    }
    if (s.fragments || s.notes_built) {
      engine.onFragmentsChange?.({ fragments: [...engine.fragments], built: [...engine.notesBuilt] });
    }
    if (s.shop_purchases && typeof s.shop_purchases === 'object') {
      const shop = s.shop_purchases as { date?: string; counts?: Record<string, number> };
      engine.shopPurchases = {
        date: typeof shop.date === 'string' ? shop.date : new Date().toISOString().slice(0, 10),
        counts: shop.counts && typeof shop.counts === 'object' ? { ...shop.counts } : {},
      };
    }
    if (typeof s.bag_level === 'number') engine.bagLevel = Math.max(0, Math.min(5, Math.floor(s.bag_level)));
    engine.repairHarmonyMissionAfterForge(false);
    engine.restoreDungeonRun(s.crystal_dungeon_run);

    // Região salva: se o jogador desconectou fora do overworld, viaja pra lá.
    const savedMap = s.current_map as string | undefined;
    const KNOWN_MAPS = ['floresta_ecos', 'cavernas_cristal', 'dg_cristal_profundo'];
    if (savedMap && KNOWN_MAPS.includes(savedMap) && typeof (engine as any).travelTo === 'function') {
      const spawnCol = Math.round((save.pos_x ?? 0) / 32);
      const spawnRow = Math.round((save.pos_y ?? 0) / 32);
      (engine as any).travelTo(savedMap, { col: spawnCol, row: spawnRow });
    }
    try {
      if (s.hud_layout) {
        localStorage.setItem('acordelot_hud_layout_v3', JSON.stringify(s.hud_layout));
      }
      if (s.custom_map) {
        localStorage.setItem('acordelot_map_v3', JSON.stringify(s.custom_map));
      }
    } catch {}
  }
}

/**
 * Salva tanto no localStorage (instantâneo) quanto no Supabase.
 */
export async function saveToCloud(engine: GameEngine, userId: string): Promise<boolean> {
  try {
    const payload = serializeEngineSave(engine, userId);
    // Salva localmente de imediato (0ms, síncrono)
    saveToLocalInstant(payload);

    const { error } = await supabase
      .from('acordelot_player_saves')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn('[SaveManager] Erro ao salvar na nuvem Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[SaveManager] Falha de conexão ao enviar save:', err);
    return false;
  }
}

/**
 * Carrega o save combinando o cache local instantâneo e a nuvem do Supabase.
 * Se o local tiver mais progresso (ex: fechamento rápido de aba), o local é priorizado.
 */
export async function loadCloudSave(userId: string, email?: string | null): Promise<AcordelotSaveData | null> {
  const cached = getLocalInstantSave(userId);
  const localSave = isCurrentProgression(cached) && isCurrentAccountReset(cached, email)
    ? migrateAquillesHarmonyLesson(migrateAquillesQuestReplay(cached, email), email)
    : null;
  if (cached && !localSave) {
    try { localStorage.removeItem(LOCAL_SAVE_PREFIX + userId); } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('acordelot_player_saves')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return localSave;
    }

    const cloudSave = migrateAquillesHarmonyLesson(migrateAquillesQuestReplay(data as AcordelotSaveData, email), email);
    // Saves anteriores ao reset global nunca podem ressuscitar a progressão
    // apagada no PWA. O primeiro autosave grava o estado inicial versionado.
    if (!isCurrentProgression(cloudSave) || !isCurrentAccountReset(cloudSave, email)) return localSave;

    // Se o local tiver nível maior ou timestamp mais recente que a nuvem, prioriza o local
    if (localSave) {
      const localLevel = localSave.level || 1;
      const cloudLevel = cloudSave.level || 1;
      const localTime = localSave.updated_at ? new Date(localSave.updated_at).getTime() : 0;
      const cloudTime = cloudSave.updated_at ? new Date(cloudSave.updated_at).getTime() : 0;

      if (localLevel > cloudLevel || (localLevel === cloudLevel && localTime > cloudTime)) {
        // Envia o save local mais atualizado para sincronizar na nuvem
        supabase.from('acordelot_player_saves').upsert(localSave, { onConflict: 'user_id' }).then(() => {});
        return localSave;
      }
    }

    // Nuvem é mais recente ou local não existe
    saveToLocalInstant(cloudSave);
    return cloudSave;
  } catch (err) {
    console.warn('[SaveManager] Falha ao consultar nuvem, usando cache local:', err);
    return localSave;
  }
}

/**
 * Configura o sistema de auto-save infalível:
 * 1. Timer contínuo de 5 segundos (ao invés de 30s)
 * 2. Salva síncrono e na nuvem em visibilitychange (ao minimizar app/celular)
 * 3. Salva síncrono em pagehide e beforeunload
 * 4. Salva imediatamente ao subir de nível ou coletar itens
 */
export function setupAutoSave(engine: GameEngine, userId: string, intervalMs = 5000): () => void {
  const saveNow = () => {
    saveToCloud(engine, userId).catch(() => {});
  };

  // 1. Timer periódico de batimento cardíaco (a cada 5s)
  const intervalId = setInterval(saveNow, intervalMs);

  // 2. Eventos de ciclo de vida do navegador / PWA no celular
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const payload = serializeEngineSave(engine, userId);
      saveToLocalInstant(payload);
      saveNow();
    }
  };

  const onPageHide = () => {
    const payload = serializeEngineSave(engine, userId);
    saveToLocalInstant(payload);
    saveNow();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('beforeunload', onPageHide);

  // 3. Salva também em blur da janela (troca de app ou aba)
  window.addEventListener('blur', onPageHide);

  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('beforeunload', onPageHide);
    window.removeEventListener('blur', onPageHide);
  };
}
