import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes');

const client = () => createClient(url, key, { auth: { persistSession: false } });
const a = client();
const b = client();
const topic = `room:smoke-${Date.now()}`;
let receivedMove = false;
let sawPresence = false;

const channelA = a.channel(topic, { config: { broadcast: { self: false }, presence: { key: 'smoke-a' } } });
const channelB = b.channel(topic, { config: { broadcast: { self: false }, presence: { key: 'smoke-b' } } });
channelB.on('broadcast', { event: 'player_move' }, ({ payload }) => {
  receivedMove = payload?.id === 'smoke-a' && payload?.x === 123;
});
channelB.on('presence', { event: 'sync' }, () => {
  sawPresence ||= Object.values(channelB.presenceState()).flat().some((entry) => entry.user_id === 'smoke-a');
});

const subscribe = (channel) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout de inscrição Realtime')), 8000);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error(status)); }
  });
});

try {
  await Promise.all([subscribe(channelA), subscribe(channelB)]);
  await channelA.track({ user_id: 'smoke-a', user_name: 'Teste A', x: 123, y: 456 });
  await channelB.track({ user_id: 'smoke-b', user_name: 'Teste B', x: 456, y: 123 });
  await channelA.send({ type: 'broadcast', event: 'player_move', payload: { id: 'smoke-a', x: 123 } });
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (!receivedMove || !sawPresence) throw new Error(`falha: broadcast=${receivedMove}, presence=${sawPresence}`);
  console.log('realtime_ok: broadcast e presence entre dois clientes');
} finally {
  await Promise.all([a.removeChannel(channelA), b.removeChannel(channelB)]);
}
