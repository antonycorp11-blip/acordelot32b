import { supabase } from '../lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RoomInfo {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  player_count: number;
  max_players: number;
  players: Array<{
    user_id: string;
    user_name: string;
    character?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface RemotePlayerState {
  id: string;
  name: string;
  character: 'akles' | 'wins' | 'huans';
  x: number;
  y: number;
  direction: 'down' | 'up' | 'left' | 'right';
  isMoving: boolean;
  stepTimer: number;
  lastUpdate: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface EnemyDamageEvent {
  attackerId: string;
  enemyId: string;
  damage: number;
  fromX: number;
  fromY: number;
}

type PeerPacket =
  | { kind: 'move'; payload: RemotePlayerState }
  | { kind: 'chat'; payload: ChatMessage }
  | { kind: 'enemy_damage'; payload: EnemyDamageEvent };

interface RtcSignal {
  from: string;
  to: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface PeerConnection {
  pc: RTCPeerConnection;
  fast?: RTCDataChannel;
  reliable?: RTCDataChannel;
  pendingCandidates: RTCIceCandidateInit[];
}

class NetworkManager {
  private currentRoomId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private lastMoveBroadcast = 0;
  private lastRelayBroadcast = 0;
  private lastBroadcastPayload: string = '';
  private localUserId: string | null = null;
  private presentPlayerIds = new Set<string>();
  private peers = new Map<string, PeerConnection>();

  public onRemotePlayerUpdate?: (player: RemotePlayerState) => void;
  public onRemotePlayerLeave?: (playerId: string) => void;
  public onChatMessage?: (msg: ChatMessage) => void;
  public onRoomPresenceSync?: (players: RemotePlayerState[]) => void;
  public onEnemyDamage?: (event: EnemyDamageEvent) => void;

  private handlePeerPacket(packet: PeerPacket) {
    if (packet.kind === 'move') this.onRemotePlayerUpdate?.(packet.payload);
    if (packet.kind === 'chat') this.onChatMessage?.(packet.payload);
    if (packet.kind === 'enemy_damage') this.onEnemyDamage?.(packet.payload);
  }

  private bindDataChannel(peer: PeerConnection, channel: RTCDataChannel) {
    if (channel.label === 'acordelot-fast') peer.fast = channel;
    else peer.reliable = channel;
    channel.onmessage = (event) => {
      try {
        this.handlePeerPacket(JSON.parse(event.data) as PeerPacket);
      } catch {
        // Pacote inválido ou de uma versão antiga: ignora sem derrubar a sala.
      }
    };
  }

  private sendSignal(signal: Omit<RtcSignal, 'from'>) {
    if (!this.channel || !this.localUserId) return;
    this.channel.send({
      type: 'broadcast',
      event: 'rtc_signal',
      payload: { ...signal, from: this.localUserId } satisfies RtcSignal,
    });
  }

  private async ensurePeer(remoteId: string) {
    if (!this.localUserId || remoteId === this.localUserId || this.peers.has(remoteId)) return;

    const peer: PeerConnection = {
      pc: new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      }),
      pendingCandidates: [],
    };
    this.peers.set(remoteId, peer);

    peer.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.sendSignal({ to: remoteId, candidate: candidate.toJSON() });
    };
    peer.pc.ondatachannel = ({ channel }) => this.bindDataChannel(peer, channel);
    peer.pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peer.pc.connectionState)) this.closePeer(remoteId);
    };

    // Só o menor id cria os canais/oferta, evitando duas negociações simultâneas.
    if (this.localUserId.localeCompare(remoteId) < 0) {
      this.bindDataChannel(peer, peer.pc.createDataChannel('acordelot-fast', {
        ordered: false,
        maxRetransmits: 0,
      }));
      this.bindDataChannel(peer, peer.pc.createDataChannel('acordelot-reliable'));
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      this.sendSignal({ to: remoteId, description: offer });
    }
  }

  private async handleRtcSignal(signal: RtcSignal) {
    if (!this.localUserId || signal.to !== this.localUserId || signal.from === this.localUserId) return;
    await this.ensurePeer(signal.from);
    const peer = this.peers.get(signal.from);
    if (!peer) return;

    try {
      if (signal.description) {
        await peer.pc.setRemoteDescription(signal.description);
        for (const candidate of peer.pendingCandidates.splice(0)) await peer.pc.addIceCandidate(candidate);
        if (signal.description.type === 'offer') {
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          this.sendSignal({ to: signal.from, description: answer });
        }
      } else if (signal.candidate) {
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(signal.candidate);
        else peer.pendingCandidates.push(signal.candidate);
      }
    } catch (error) {
      console.warn('[NetworkManager] Falha ao negociar conexão direta:', error);
    }
  }

  private closePeer(remoteId: string) {
    const peer = this.peers.get(remoteId);
    if (!peer) return;
    peer.fast?.close();
    peer.reliable?.close();
    peer.pc.close();
    this.peers.delete(remoteId);
  }

  private sendToPeers(packet: PeerPacket, reliable: boolean) {
    const encoded = JSON.stringify(packet);
    const delivered = new Set<string>();
    for (const [id, peer] of this.peers) {
      const channel = reliable ? peer.reliable : peer.fast;
      if (channel?.readyState === 'open' && channel.bufferedAmount < 64_000) {
        channel.send(encoded);
        delivered.add(id);
      }
    }
    return delivered;
  }

  private relayToMissing(event: string, payload: unknown, delivered: Set<string>) {
    if (!this.channel) return;
    const targetIds = [...this.presentPlayerIds].filter((id) => !delivered.has(id));
    if (targetIds.length === 0) return;
    this.channel.send({ type: 'broadcast', event, payload: { payload, targetIds } });
  }

  private unwrapRelay<T>(raw: unknown): T | null {
    const relay = raw as { payload?: T; targetIds?: string[] };
    if (Array.isArray(relay?.targetIds)) {
      return this.localUserId && relay.targetIds.includes(this.localUserId) ? (relay.payload ?? null) : null;
    }
    return raw as T;
  }

  /**
   * Busca todas as salas com vagas disponíveis (máx 4).
   */
  async listAvailableRooms(): Promise<RoomInfo[]> {
    try {
      const { data, error } = await supabase
        .from('acordelot_online_rooms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('[NetworkManager] Erro ao listar salas:', error);
        return [];
      }
      return (data || []) as RoomInfo[];
    } catch (err) {
      console.warn('[NetworkManager] Falha na busca de salas:', err);
      return [];
    }
  }

  /**
   * Cria uma nova sala no Supabase.
   */
  async createRoom(name: string, user: any, character = 'akles'): Promise<RoomInfo | null> {
    try {
      const roomId = 'sala_' + Math.random().toString(36).substring(2, 9);
      const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Aventureiro';

      const newRoom: RoomInfo = {
        id: roomId,
        name: name.trim() || `Sala de ${userName}`,
        host_id: user.id,
        host_name: userName,
        player_count: 1,
        max_players: 4,
        players: [
          {
            user_id: user.id,
            user_name: userName,
            character,
          },
        ],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('acordelot_online_rooms')
        .insert(newRoom)
        .select()
        .single();

      if (error) {
        console.error('[NetworkManager] Erro ao criar sala:', error);
        return null;
      }
      return data as RoomInfo;
    } catch (err) {
      console.error('[NetworkManager] Falha ao criar sala:', err);
      return null;
    }
  }

  /**
   * Entra em uma sala e atualiza o banco de dados.
   */
  async joinRoomRecord(roomId: string, user: any, character = 'akles'): Promise<boolean> {
    try {
      const { data: room, error } = await supabase
        .from('acordelot_online_rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (error || !room) return false;
      const currentPlayers = (room.players || []) as any[];

      // Se já está na sala
      const exists = currentPlayers.some((p) => p.user_id === user.id);
      const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Aventureiro';

      let updatedPlayers = currentPlayers.map((player) => player.user_id === user.id
        ? { ...player, user_name: userName, character }
        : player);
      if (!exists) {
        if (currentPlayers.length >= 4) return false; // Cheia
        updatedPlayers = [...currentPlayers, { user_id: user.id, user_name: userName, character }];
      }

      await supabase
        .from('acordelot_online_rooms')
        .update({
          players: updatedPlayers,
          player_count: updatedPlayers.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Conecta ao canal Realtime (Broadcast + Presence).
   */
  connectToRoom(
    roomId: string,
    user: any,
    character: 'akles' | 'wins' | 'huans' = 'akles',
    initialState?: Pick<RemotePlayerState, 'x' | 'y' | 'direction' | 'isMoving' | 'stepTimer'>,
  ) {
    this.disconnectFromRoom();
    this.currentRoomId = roomId;
    this.localUserId = user.id;

    const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Aventureiro';

    const ch = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    });

    // 1. Ouve movimento de outros jogadores
    ch.on('broadcast', { event: 'player_move' }, (payload) => {
      const p = this.unwrapRelay<RemotePlayerState>(payload.payload);
      if (p && p.id !== user.id) {
        this.onRemotePlayerUpdate?.(p);
      }
    });

    // 2. Ouve mensagens de chat e balões de fala
    ch.on('broadcast', { event: 'chat_message' }, (payload) => {
      const msg = this.unwrapRelay<ChatMessage>(payload.payload);
      if (msg) {
        this.onChatMessage?.(msg);
      }
    });

    ch.on('broadcast', { event: 'enemy_damage' }, (payload) => {
      const event = this.unwrapRelay<EnemyDamageEvent>(payload.payload);
      if (event?.attackerId && event.attackerId !== user.id) this.onEnemyDamage?.(event);
    });

    ch.on('broadcast', { event: 'rtc_signal' }, (payload) => {
      void this.handleRtcSignal(payload.payload as RtcSignal);
    });

    // 3. Ouve sincronização de presença (quem entra / sai da sala)
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const allMembers: RemotePlayerState[] = [];
      const presentIds = new Set<string>();
      for (const [key, presences] of Object.entries(state)) {
        if (Array.isArray(presences) && presences[0]) {
          const presence = presences[0] as any;
          const id = presence.user_id || key;
          if (id === user.id) continue;
          presentIds.add(id);
          void this.ensurePeer(id);
          allMembers.push({
            id,
            name: presence.user_name || 'Aventureiro',
            character: presence.character || 'akles',
            x: Number.isFinite(presence.x) ? presence.x : 36 * 32,
            y: Number.isFinite(presence.y) ? presence.y : 29 * 32,
            direction: presence.direction || 'down',
            isMoving: !!presence.isMoving,
            stepTimer: presence.stepTimer || 0,
            lastUpdate: Date.now(),
          });
        }
      }
      for (const peerId of this.peers.keys()) {
        if (!presentIds.has(peerId)) this.closePeer(peerId);
      }
      this.presentPlayerIds = presentIds;
      this.onRoomPresenceSync?.(allMembers);
    });

    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (key && key !== user.id) {
        this.presentPlayerIds.delete(key);
        this.closePeer(key);
        this.onRemotePlayerLeave?.(key);
      }
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          user_id: user.id,
          user_name: userName,
          character,
          x: initialState?.x ?? 36 * 32,
          y: initialState?.y ?? 29 * 32,
          direction: initialState?.direction ?? 'down',
          isMoving: initialState?.isMoving ?? false,
          stepTimer: initialState?.stepTimer ?? 0,
          online_at: new Date().toISOString(),
        });
      }
    });

    this.channel = ch;
  }

  /**
   * Transmite a posição do jogador atual para a sala via WebSocket broadcast.
   */
  broadcastMovement(
    user: any,
    x: number,
    y: number,
    direction: 'down' | 'up' | 'left' | 'right',
    isMoving: boolean,
    stepTimer: number,
    character: 'akles' | 'wins' | 'huans'
  ) {
    if (!this.channel || !this.currentRoomId || !user) return;

    const now = Date.now();
    // P2P pode ser suave (8 FPS) sem consumir mensagens de gameplay do Supabase.
    if (now - this.lastMoveBroadcast < 120) return;

    const payload: RemotePlayerState = {
      id: user.id,
      name: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Aventureiro',
      character,
      x: Math.round(x),
      y: Math.round(y),
      direction,
      isMoving,
      stepTimer,
      lastUpdate: now,
    };

    const strKey = `${payload.x},${payload.y},${direction},${isMoving},${character}`;
    if (strKey === this.lastBroadcastPayload && !isMoving && now - this.lastMoveBroadcast < 8000) return;

    this.lastBroadcastPayload = strKey;
    this.lastMoveBroadcast = now;

    const delivered = this.sendToPeers({ kind: 'move', payload }, false);

    // Fallback econômico para redes móveis/NAT onde WebRTC não conectar: 0,25 FPS.
    if (now - this.lastRelayBroadcast >= 4000) {
      this.lastRelayBroadcast = now;
      this.relayToMissing('player_move', payload, delivered);
    }
  }

  broadcastEnemyDamage(user: any, enemyId: string, damage: number, fromX: number, fromY: number) {
    if (!this.channel || !this.currentRoomId || !user) return;
    const payload: EnemyDamageEvent = { attackerId: user.id, enemyId, damage, fromX, fromY };
    const delivered = this.sendToPeers({ kind: 'enemy_damage', payload }, true);
    this.relayToMissing('enemy_damage', payload, delivered);
  }

  /**
   * Transmite mensagem de chat para todos os outros jogadores da sala.
   */
  sendChatMessage(user: any, text: string) {
    if (!this.channel || !this.currentRoomId || !user || !text.trim()) return;

    const msg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      senderId: user.id,
      senderName: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Aventureiro',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const delivered = this.sendToPeers({ kind: 'chat', payload: msg }, true);
    this.relayToMissing('chat_message', msg, delivered);

    return msg;
  }

  /**
   * Desconecta da sala e limpa canal.
   */
  async disconnectFromRoom(userId?: string) {
    const leavingRoomId = this.currentRoomId;
    const leavingChannel = this.channel;
    this.currentRoomId = null;
    this.channel = null;
    this.localUserId = null;
    this.presentPlayerIds.clear();
    for (const peerId of [...this.peers.keys()]) this.closePeer(peerId);
    this.lastBroadcastPayload = '';
    this.lastMoveBroadcast = 0;
    this.lastRelayBroadcast = 0;

    if (leavingRoomId && userId) {
      // Remove do banco de dados se aplicável
      try {
        const { data: room } = await supabase
          .from('acordelot_online_rooms')
          .select('*')
          .eq('id', leavingRoomId)
          .maybeSingle();

        if (room) {
          const players = (room.players || []) as any[];
          const filtered = players.filter((p) => p.user_id !== userId);
          if (filtered.length <= 0) {
            await supabase.from('acordelot_online_rooms').delete().eq('id', leavingRoomId);
          } else {
            await supabase
              .from('acordelot_online_rooms')
              .update({
                players: filtered,
                player_count: filtered.length,
                updated_at: new Date().toISOString(),
              })
              .eq('id', leavingRoomId);
          }
        }
      } catch {}
    }

    if (leavingChannel) await leavingChannel.unsubscribe();
  }

  getCurrentRoomId() {
    return this.currentRoomId;
  }
}

export const networkManager = new NetworkManager();
