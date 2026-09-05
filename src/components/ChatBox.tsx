import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { ChatMessage } from '../game/networkManager';

interface ChatBoxProps {
  onlineRoomName: string | null;
  onSendMessage: (text: string) => void;
  messages: ChatMessage[];
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  onlineRoomName,
  onSendMessage,
  messages,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Tecla Enter para abrir chat no PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se não for elemento de input e apertar Enter
      if (e.key === 'Enter') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    onSendMessage(clean);
    setText('');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-24 sm:bottom-6 left-4 z-30 select-none font-sans pointer-events-none">
      {/* Últimas mensagens flutuantes (Fade out suave) */}
      {!isOpen && messages.length > 0 && (
        <div className="flex flex-col gap-1 mb-2 max-w-xs pointer-events-none">
          {messages.slice(-3).map((m) => (
            <div
              key={m.id}
              className="bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 rounded-xl px-2.5 py-1 text-xs shadow-lg animate-fadeIn"
            >
              <span className="font-bold text-amber-300 mr-1.5">{m.senderName}:</span>
              <span className="text-slate-100">{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Caixa de Texto Aberta */}
      {isOpen ? (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-2xl p-3 shadow-2xl w-80 sm:w-96 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">
                Chat da Sala {onlineRoomName ? `· ${onlineRoomName}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="cursor-pointer text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Histórico Recente */}
          <div className="max-h-36 overflow-y-auto space-y-1.5 mb-2 pr-1 text-xs scrollbar-thin">
            {messages.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic block py-2 text-center">
                Nenhuma mensagem ainda. Diga oi!
              </span>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="leading-snug">
                  <span className="font-bold text-amber-400 mr-1">{m.senderName}:</span>
                  <span className="text-slate-200 break-words">{m.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Input de Envio */}
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite sua mensagem (balão de fala)..."
              maxLength={80}
              className="flex-1 px-3 py-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="cursor-pointer p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-95 transition-all shadow"
              title="Enviar mensagem"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ) : (
        /* Botão para Abrir o Chat */
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="pointer-events-auto cursor-pointer flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-xl transition-all active:scale-95"
          title="Abrir Chat (ou aperte Enter no teclado)"
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold hidden sm:inline">Chat</span>
          <span className="text-[10px] text-amber-400/70 font-mono hidden md:inline">[Enter]</span>
        </button>
      )}
    </div>
  );
};
