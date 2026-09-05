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
  passives: Record<string, number>;
  quests: {
    date: string;
    daily: Array<{ id: string; accepted: boolean; progress: number; claimed: boolean }>;
  };
  settings: Record<string, unknown>;
  play_time_seconds: number;
  updated_at?: string;
}

/**
 * Converte o estado atual do GameEngine em um payload completo para o Supabase.
 */
export function serializeEngineSave(engine: GameEngine, userId: string): Omit<AcordelotSaveData, 'id' | 'updated_at'> {
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
    passives: { ...(anyEngine.passiveLevels || {}) },
    quests: {
      date: new Date().toISOString().slice(0, 10),
      daily: dailyQuests,
    },
    settings: {
      fragments: [...(engine.fragments || [])],
      notes_built: [...(engine.notesBuilt || [])],
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
  };
}

/**
 * Injeta o save recuperado do Supabase de volta no GameEngine.
 */
export function applySaveToEngine(engine: GameEngine, save: Partial<AcordelotSaveData>): void {
  if (!save) return;
  const anyEngine = engine as any;

  // 1. Posição
  if (typeof save.pos_x === 'number' && typeof save.pos_y === 'number') {
    engine.player.x = save.pos_x;
    engine.player.y = save.pos_y;
  }
  if (save.direction) {
    engine.player.direction = save.direction;
  }

  // 2. Personagem ativo
  if (save.active_character && save.active_character !== engine.activeCharacter) {
    engine.switchCharacter(save.active_character);
  }

  // 3. Stats por personagem
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
      engine.onStatsChange?.({ ...engine.stats });
    }
  }

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
      if (anyEngine.weaponByCharacter) {
        anyEngine.weaponByCharacter = {
          ...anyEngine.weaponByCharacter,
          ...save.weapons.equippedByCharacter,
        };
      }
      const charWeapon = save.weapons.equippedByCharacter[engine.activeCharacter];
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
    anyEngine.passiveLevels = { ...anyEngine.passiveLevels, ...save.passives };
  }

  // 9. Missões diárias
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
 * Busca o save na nuvem pelo user_id do Supabase.
 */
export async function loadCloudSave(userId: string): Promise<AcordelotSaveData | null> {
  try {
    const { data, error } = await supabase
      .from('acordelot_player_saves')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SaveManager] Erro ao carregar save da nuvem:', error);
      return null;
    }
    return data as AcordelotSaveData | null;
  } catch (err) {
    console.error('[SaveManager] Falha de conexão ao carregar save:', err);
    return null;
  }
}

/**
 * Salva o estado completo no Supabase (upsert por user_id).
 */
export async function saveToCloud(engine: GameEngine, userId: string): Promise<boolean> {
  try {
    const payload = serializeEngineSave(engine, userId);
    const { error } = await supabase
      .from('acordelot_player_saves')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('[SaveManager] Erro ao salvar na nuvem:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[SaveManager] Falha ao enviar save para Supabase:', err);
    return false;
  }
}

/**
 * Cria um timer de auto-save periódico (ex: a cada 30 segundos) e salva ao fechar a janela.
 */
export function setupAutoSave(engine: GameEngine, userId: string, intervalMs = 30000): () => void {
  const intervalId = setInterval(() => {
    saveToCloud(engine, userId).catch((err) =>
      console.warn('[SaveManager] Falha silenciosa no auto-save:', err)
    );
  }, intervalMs);

  const onUnload = () => {
    saveToCloud(engine, userId).catch(() => {});
  };
  window.addEventListener('beforeunload', onUnload);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('beforeunload', onUnload);
  };
}
