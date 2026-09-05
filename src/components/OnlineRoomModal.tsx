import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  Plus,
  RefreshCw,
  Globe,
  Compass,
  ArrowRight,
  Sparkles,
  X,
  Lock,
} from 'lucide-react';
import { networkManager, RoomInfo } from '../game/networkManager';

interface OnlineRoomModalProps {
  open: boolean;
  user: any;
  onSelectSolo: () => void;
  onJoinOnlineRoom: (roomId: string, roomName: string) => void;
  onClose?: () => void;
}

const DEFAULT_ROOM_NAMES = [
  'Vila Harmônica',
  'Acorde Dourado',
  'Floresta dos Menestréis',
  'Clave de Sol',
  'Sinfonia Antiga',
  'Refúgio dos Bardos',
];

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  open,
  user,
  onSelectSolo,
  onJoinOnlineRoom,
  onClose,
}) => {
  const [tab, setTab] = useState<'mode_select' | 'rooms_list'>('mode_select');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    setErrorMsg(null);
    const list = await networkManager.listAvailableRooms();
    setRooms(list);
    setLoading(false);
  };

  useEffect(() => {
    if (open && tab === 'rooms_list') {
      fetchRooms();
      const interval = setInterval(fetchRooms, 4000);
      return () => clearInterval(interval);
    }
  }, [open, tab]);

  if (!open) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreating(true);

    const nameToUse =
      newRoomName.trim() ||
      DEFAULT_ROOM_NAMES[Math.floor(Math.random() * DEFAULT_ROOM_NAMES.length)];

    const created = await networkManager.createRoom(nameToUse, user);
    setCreating(false);

    if (created) {
      await networkManager.joinRoomRecord(created.id, user);
      onJoinOnlineRoom(created.id, created.name);
    } else {
      setErrorMsg('Não foi possível criar a sala. Tente novamente.');
    }
  };

  const handleJoin = async (room: RoomInfo) => {
    if (room.player_count >= room.max_players) {
      setErrorMsg('Esta sala já atingiu a lotação máxima de 4 jogadores.');
      return;
    }
    setErrorMsg(null);
    const ok = await networkManager.joinRoomRecord(room.id, user);
    if (ok) {
      onJoinOnlineRoom(room.id, room.name);
    } else {
      setErrorMsg('Erro ao entrar na sala. Ela pode estar cheia ou ter sido fechada.');
      fetchRooms();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-sans animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Brilho Dourado */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* MODO SELETOR: SOLO OU ONLINE */}
        {tab === 'mode_select' ? (
          <div className="space-y-6">
            <div className="text-center">
              <img
                src="/assets/login/logo.png"
                alt="Acordelot"
                className="w-44 sm:w-52 mx-auto mb-3 drop-shadow-[0_4px_20px_rgba(245,158,11,0.4)]"
              />
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">
                Como deseja jogar hoje?
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Escolha entre explorar o mundo sozinho ou entrar em uma sala com outros jogadores.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opção 1: Mundo Solo */}
              <button
                type="button"
                onClick={onSelectSolo}
                className="cursor-pointer group relative text-left bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-400/80 rounded-2xl p-5 transition-all active:scale-98 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                    Mundo Solo
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Explore Acordelot sozinho no seu ritmo, com progresso e história individuais.
                  </p>
                </div>

                <div className="mt-4 flex items-center text-xs font-bold text-amber-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Jogar Sozinho</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Opção 2: Mundo Online (Multiplayer) */}
              <button
                type="button"
                onClick={() => setTab('rooms_list')}
                className="cursor-pointer group relative text-left bg-slate-950/80 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-400/80 rounded-2xl p-5 transition-all active:scale-98 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      Mundo Online
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                      Até 4 Players
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Entre em uma sala com outros jogadores, compartilhe o mapa e converse via balões de fala.
                  </p>
                </div>

                <div className="mt-4 flex items-center text-xs font-bold text-indigo-400 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Ver Salas Online</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* LISTA DE SALAS ONLINE */
          <div className="space-y-4">
            {/* Header com Voltar e Atualizar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setTab('mode_select')}
                  className="cursor-pointer text-xs font-bold text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  ← Voltar
                </button>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-slate-100">Salas Online</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRooms}
                  disabled={loading}
                  className="cursor-pointer p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 disabled:opacity-50"
                  title="Atualizar lista de salas"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateInput((v) => !v)}
                  className="cursor-pointer px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Sala</span>
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-fadeIn">
                <span className="text-rose-400 font-bold">!</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form de Criar Sala */}
            {showCreateInput && (
              <form
                onSubmit={handleCreateRoom}
                className="p-3 bg-slate-950/90 border border-amber-500/50 rounded-2xl space-y-2 animate-fadeIn"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    Nova Sala de Acordelot (Máx. 4)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateInput(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Ex: Vila dos Menestréis..."
                    maxLength={28}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="cursor-pointer px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
                  >
                    {creating ? 'Criando…' : 'Criar e Entrar'}
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Salas */}
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {rooms.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/50 rounded-2xl border border-slate-800/80">
                  <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-300">
                    Nenhuma sala aberta no momento
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Clique em <b>Criar Sala</b> acima para iniciar seu mundo online e convidar outros aventureiros.
                  </p>
                </div>
              ) : (
                rooms.map((room) => {
                  const isFull = room.player_count >= room.max_players;
                  const players = room.players || [];

                  return (
                    <div
                      key={room.id}
                      className="p-3.5 bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100 truncate">
                            {room.name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFull
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {room.player_count}/{room.max_players} {isFull ? '(Cheia)' : 'Jogadores'}
                          </span>
                        </div>

                        {/* Jogadores dentro da sala */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-slate-400 font-medium">Na sala:</span>
                          {players.length > 0 ? (
                            players.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-[10px] font-semibold text-amber-300"
                              >
                                <User className="w-2.5 h-2.5 text-amber-400" />
                                {p.user_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              Host: {room.host_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isFull}
                        onClick={() => handleJoin(room)}
                        className={`cursor-pointer shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow ${
                          isFull
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-indigo-900/40'
                        }`}
                      >
                        {isFull ? 'Lotada' : 'Entrar na Sala →'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
