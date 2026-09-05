import { supabase } from '../lib/supabaseClient';
import type { GameEngine } from './engine';

export interface WorldMapRecord {
  id: string;
  data: Array<{ id: string; type: string; x: number; y: number; scale?: number }>;
  updated_at?: string;
}

/**
 * Salva o mapa editado diretamente no Supabase em tempo real.
 * Isso permite que todos os celulares, PWAs e outros dispositivos
 * recebam a alteração instantaneamente sem esperar deploy da Vercel.
 */
export async function saveWorldMapToCloud(mapData: unknown): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('acordelot_worlds')
      .upsert(
        {
          id: 'main',
          data: mapData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[WorldMapSync] Erro ao salvar mapa no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[WorldMapSync] Falha ao enviar mapa para o Supabase:', err);
    return false;
  }
}

/**
 * Busca o mapa mais recente no Supabase e atualiza o motor e o localStorage.
 */
export async function syncWorldMapFromCloud(engine: GameEngine): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('acordelot_worlds')
      .select('data, updated_at')
      .eq('id', 'main')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.data) || data.data.length === 0) {
      return false;
    }

    // Salva no localStorage local para offline/cache
    try {
      localStorage.setItem('acordelot_map_v3', JSON.stringify(data.data));
    } catch {}

    // Recarrega o mapa no engine se ele já estiver inicializado
    engine.loadMapFromStorage();
    engine.ensureBossArena();
    engine.rebuildColliderGrid();
    return true;
  } catch (err) {
    console.warn('[WorldMapSync] Falha ao sincronizar mapa do Supabase:', err);
    return false;
  }
}
