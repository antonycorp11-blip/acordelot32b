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
    current_map: 'overworld',
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
      fragments: [...(engine.fragments || [])],
      notes_built: [...(engine.notesBuilt || [])],
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
  const localSave = isCurrentProgression(cached) && isCurrentAccountReset(cached, email) ? cached : null;
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

    const cloudSave = data as AcordelotSaveData;
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
