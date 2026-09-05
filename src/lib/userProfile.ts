import { supabase } from './supabaseClient';

/** Completa os dois cadastros antigos, criados antes do campo de nome existir. */
export async function ensureUsername(user: any): Promise<any> {
  if (!user || user.user_metadata?.username) return user;
  const emailPrefix = String(user.email || '').split('@')[0].toLowerCase();
  const username = emailPrefix === 'antonycorp11' ? 'Áquilles' : 'Cadência';
  const { data, error } = await supabase.auth.updateUser({
    data: { ...(user.user_metadata || {}), username },
  });
  if (error) {
    console.warn('[Perfil] Não foi possível completar o nome de usuário:', error.message);
    return user;
  }
  const updatedUser = data.user || { ...user, user_metadata: { ...(user.user_metadata || {}), username } };

  // Corrige também nomes gravados nas salas antigas, sem precisar recriá-las.
  const { data: rooms } = await supabase.from('acordelot_online_rooms').select('id, host_id, players');
  for (const room of rooms || []) {
    const players = Array.isArray(room.players) ? room.players : [];
    if (room.host_id !== user.id && !players.some((player: any) => player.user_id === user.id)) continue;
    const renamedPlayers = players.map((player: any) => player.user_id === user.id ? { ...player, user_name: username } : player);
    await supabase.from('acordelot_online_rooms').update({
      players: renamedPlayers,
      ...(room.host_id === user.id ? { host_name: username } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', room.id);
  }
  return updatedUser;
}
