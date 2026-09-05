import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  CloudCheck,
  RefreshCw,
  LogOut,
  Settings,
  Music,
  ShieldCheck,
} from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  musicVolume: number;
  onVolumeChange: (vol: number) => void;
  isMusicMuted: boolean;
  onToggleMute: () => void;
  onManualSave: () => Promise<boolean>;
  onLogout: () => void;
  lastSavedText?: string;
  roomName?: string | null;
  onChangeMode?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  musicVolume,
  onVolumeChange,
  isMusicMuted,
  onToggleMute,
  onManualSave,
  onLogout,
  lastSavedText = 'há poucos instantes',
  roomName,
  onChangeMode,
}) => {
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  if (!open) return null;

  const handleSaveClick = async () => {
    setSaving(true);
    setSaveFeedback(null);
    const success = await onManualSave();
    setSaving(false);
    if (success) {
      setSaveFeedback('✅ Progresso salvo com sucesso na nuvem!');
      setTimeout(() => setSaveFeedback(null), 3000);
    } else {
      setSaveFeedback('❌ Erro ao salvar. Tente novamente.');
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none font-sans animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-amber-500/40 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Brilho dourado no topo */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-wide">
                Configurações
              </h2>
              <span className="text-[11px] text-amber-300/80 font-medium">
                Acordelot · Menu do Jogador
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo das Configurações */}
        <div className="py-4 space-y-4">
          {/* 1. Status de Jogo Salvo */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">
                  Status de Salvamento
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                Nuvem Ativa
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Seu nível, inventário, armas e mapa são sincronizados automaticamente a cada 5s.
              <span className="block text-slate-500 text-[10px] mt-0.5">
                Último save: {lastSavedText}
              </span>
            </p>

            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saving}
              className="cursor-pointer w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'Sincronizando com Supabase…' : 'Salvar Agora na Nuvem'}</span>
            </button>

            {saveFeedback && (
              <div className="mt-2 text-center text-xs font-bold animate-fadeIn">
                {saveFeedback}
              </div>
            )}
          </div>

          {/* 2. Volume da Música: Whispers of the Village */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  Música: Whispers of the Village
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleMute}
                className="cursor-pointer p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                title={isMusicMuted ? 'Desmutar Música' : 'Mutar Música'}
              >
                {isMusicMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={isMusicMuted ? 0 : Math.round(musicVolume * 100)}
                onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-xs font-mono font-bold text-amber-300 w-9 text-right">
                {isMusicMuted ? '0%' : `${Math.round(musicVolume * 100)}%`}
              </span>
            </div>
          </div>

          {/* 3. Trocar Sala Online ou Voltar ao Modo Solo */}
          {roomName && onChangeMode && (
            <div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChangeMode();
                }}
                className="cursor-pointer w-full py-2.5 px-4 rounded-2xl bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-600/50 text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>🌐 Trocar de Sala / Voltar ao Modo Solo</span>
              </button>
            </div>
          )}

          {/* 4. Sair da Conta (Logout) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="cursor-pointer w-full py-3 px-4 rounded-2xl bg-rose-950/70 hover:bg-rose-900/90 text-rose-200 border border-rose-600/50 text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sair da Conta (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
