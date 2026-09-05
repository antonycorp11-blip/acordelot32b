import { supabase } from '../lib/supabaseClient';

export interface HudOrientationLayout {
  portrait: Record<string, { dx: number; dy: number }>;
  landscape: Record<string, { dx: number; dy: number }>;
}

const HUD_LS_KEY = 'acordelot_hud_layout_v3';

/**
 * Salva o layout padrão do HUD globalmente no Supabase.
 * Qualquer jogador ou celular que abrir o jogo receberá esta configuração.
 */
export async function saveGlobalHudLayout(layout: HudOrientationLayout): Promise<boolean> {
  try {
    const { error } = await supabase.from('acordelot_worlds').upsert(
      {
        id: 'hud_default',
        data: layout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('[HudSync] Erro ao salvar HUD global no Supabase:', error);
      return false;
    }

    // Salva também localmente
    try {
      localStorage.setItem(HUD_LS_KEY, JSON.stringify(layout));
    } catch {}

    return true;
  } catch (err) {
    console.warn('[HudSync] Falha ao enviar HUD global:', err);
    return false;
  }
}

/**
 * Busca o layout padrão do HUD configurado pelo admin no Supabase.
 */
export async function fetchGlobalHudLayout(): Promise<HudOrientationLayout | null> {
  try {
    const { data, error } = await supabase
      .from('acordelot_worlds')
      .select('data')
      .eq('id', 'hud_default')
      .maybeSingle();

    if (error || !data || !data.data) {
      return null;
    }

    const remoteLayout = data.data as HudOrientationLayout;

    // Atualiza o cache local
    try {
      localStorage.setItem(HUD_LS_KEY, JSON.stringify(remoteLayout));
    } catch {}

    return remoteLayout;
  } catch (err) {
    console.warn('[HudSync] Falha ao sincronizar HUD do Supabase:', err);
    return null;
  }
}
