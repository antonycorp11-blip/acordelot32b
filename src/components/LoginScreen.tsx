import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Volume2,
  VolumeX,
  Mail,
  Lock,
  Sparkles,
  UserPlus,
  LogIn,
  ArrowRight,
  Eye,
  EyeOff,
  Smartphone,
  RotateCcw,
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

const VIDEOS = [
  { id: 'video1', src: '/assets/login/bg_video_1.mp4', name: 'background_1' },
  { id: 'video2', src: '/assets/login/bg_video_2.mp4', name: 'background_2' },
  { id: 'som', src: '/assets/login/som.mp4', name: 'som' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Escolha aleatória inicial do vídeo visual
  const [currentVideoIdx, setCurrentVideoIdx] = useState(() => Math.floor(Math.random() * VIDEOS.length));
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [, setHasInteracted] = useState(false);

  // Estados de animação de entrada
  const [showLogo, setShowLogo] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isTransitioningToGame, setIsTransitioningToGame] = useState(false);
  const [waitingForLandscape, setWaitingForLandscape] = useState(false);
  const [authedUser, setAuthedUser] = useState<any>(null);

  // Formulário de autenticação
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sequência de animação de entrada:
  // 1. Vídeo surge imediatamente
  // 2. Logo surge em 400ms
  // 3. Formulário de login/cadastro surge em 1100ms
  useEffect(() => {
    const t1 = setTimeout(() => setShowLogo(true), 400);
    const t2 = setTimeout(() => setShowForm(true), 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Inicialização e loop do áudio do vídeo "som.mp4"
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.55;
    audio.loop = true;

    // Tentativa de autoplay de áudio
    const startAudio = async () => {
      try {
        await audio.play();
        setHasInteracted(true);
      } catch {
        // Bloqueado pelo navegador até o primeiro toque/clique
      }
    };
    startAudio();

    // Primeiro toque em qualquer lugar da tela desbloqueia o áudio
    const handleFirstGesture = () => {
      if (audio && audio.paused) {
        audio.play().catch(() => {});
      }
      setHasInteracted(true);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Monitora se o usuário virou o celular após o login
  useEffect(() => {
    if (!waitingForLandscape || !authedUser) return;
    const checkOrientation = () => {
      if (window.innerWidth > window.innerHeight) {
        setWaitingForLandscape(false);
        onLoginSuccess(authedUser);
      }
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [waitingForLandscape, authedUser, onLoginSuccess]);

  // Próximo vídeo aleatório ao finalizar o atual
  const handleVideoEnded = () => {
    setCurrentVideoIdx((prev) => {
      let next = Math.floor(Math.random() * VIDEOS.length);
      if (next === prev) next = (prev + 1) % VIDEOS.length;
      return next;
    });
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    audioRef.current.muted = next;
    if (!next && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Por favor preencha seu e-mail e sua senha.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('E-mail ou senha incorretos.');
          } else {
            setErrorMsg(error.message);
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          triggerGameEntry(data.user);
        }
      } else {
        // Modo Cadastro
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        // Login direto e imediato sem confirmação de e-mail
        const loginRes = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (loginRes.data.user) {
          triggerGameEntry(loginRes.data.user);
        } else if (data.user) {
          triggerGameEntry(data.user);
        } else {
          setErrorMsg(loginRes.error?.message || 'Conta criada, por favor faça login.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
      setLoading(false);
    }
  };

  // Efeito de transição: tela preta cinemática e checagem de orientação horizontal
  const triggerGameEntry = (user: any) => {
    setAuthedUser(user);
    setIsTransitioningToGame(true);

    // Fade out suave do áudio
    if (audioRef.current) {
      let vol = audioRef.current.volume;
      const fadeInterval = setInterval(() => {
        vol = Math.max(0, vol - 0.1);
        if (audioRef.current) audioRef.current.volume = vol;
        if (vol <= 0) {
          clearInterval(fadeInterval);
          audioRef.current?.pause();
        }
      }, 70);
    }

    // Se estiver em modo retrato (vertical), pede para virar
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
      setWaitingForLandscape(true);
    } else {
      setTimeout(() => {
        onLoginSuccess(user);
      }, 1000);
    }
  };

  const currentVideo = VIDEOS[currentVideoIdx];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans text-slate-100 flex items-center justify-center">
      {/* Elemento de áudio contínuo do som.mp4 (sempre ativo em loop com o áudio oficial) */}
      <audio ref={audioRef} src="/assets/login/som.mp4" preload="auto" />

      {/* Background Vídeo Visual (sempre mudo para não conflitar com o som.mp4) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          ref={videoRef}
          key={currentVideo.id}
          src={currentVideo.src}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          className="w-full h-full object-cover filter brightness-[0.75] contrast-[1.05] transition-opacity duration-1000 ease-in-out"
        />
        {/* Overlay escuro em degradê para realce de contraste */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/80 pointer-events-none" />
        {/* Vinheta sutil nas bordas */}
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] pointer-events-none" />
      </div>

      {/* Botão de Som no Canto Superior Direito */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMute}
          className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800/90 text-amber-300 border border-amber-500/30 backdrop-blur-md text-xs font-semibold shadow-lg transition-all active:scale-95"
          title={isAudioMuted ? 'Ativar Música' : 'Desativar Música'}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />}
          <span>{isAudioMuted ? 'Mudo' : 'Música'}</span>
        </button>
      </div>

      {/* Conteúdo Central: Logo + Formulário */}
      <div className="relative z-20 flex flex-col items-center justify-center max-w-md w-full px-5 py-4">
        {/* LOGO com animação de surgimento e flutuação */}
        <div
          className={`transition-all duration-1000 ease-out transform ${
            showLogo
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 -translate-y-8 scale-95'
          } flex flex-col items-center mb-5`}
        >
          <img
            src="/assets/login/logo.png"
            alt="Acordelot Logo"
            className="w-64 sm:w-80 md:w-96 max-h-36 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] transition-transform duration-700 hover:scale-105"
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-400/80" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-semibold text-shadow">
              O RPG Musical
            </span>
            <span className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-400/80" />
          </div>
        </div>

        {/* CARD DE LOGIN / CADASTRO */}
        <div
          className={`w-full transition-all duration-1000 ease-out transform ${
            showForm
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-amber-500/25 rounded-2xl p-6 sm:p-7 shadow-[0_15px_45px_rgba(0,0,0,0.7)] relative overflow-hidden">
            {/* Brilho decorativo dourado no topo do card */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/90 to-transparent" />

            {/* Alternador Entrar / Criar Conta */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/75 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`cursor-pointer py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`cursor-pointer py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Criar Conta</span>
              </button>
            </div>

            {/* Mensagens de Erro ou Sucesso */}
            {errorMsg && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-fadeIn">
                <span className="text-red-400 font-bold">!</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400/70">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/85 border border-slate-700/90 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/90 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400/70">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950/85 border border-slate-700/90 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/90 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão Principal */}
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-[0_4px_18px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_24px_rgba(245,158,11,0.5)] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <span>Entrar no Mundo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Criar Minha Conta</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-[11px] text-slate-400">
                Seu progresso, itens e mapa ficam salvos em nuvem na sua conta.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TELA PRETA CINEMÁTICA / AVISO DE GIRAR TELA APÓS O LOGIN */}
      <div
        className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700 ease-in-out px-6 text-center ${
          isTransitioningToGame ? 'opacity-100 pointer-events-auto' : 'opacity-0'
        }`}
      >
        <img
          src="/assets/login/logo.png"
          alt="Acordelot"
          className="w-48 sm:w-56 mb-5 drop-shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-pulse"
        />

        {waitingForLandscape ? (
          <div className="flex flex-col items-center max-w-sm animate-fadeIn">
            {/* Ícone de rotação com animação */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-16 h-24 border-3 border-amber-400/90 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-bounce">
                <Smartphone className="w-8 h-8 text-amber-400" />
              </div>
              <RotateCcw className="absolute -top-2 -right-3 w-6 h-6 text-amber-300 animate-spin" />
            </div>

            <h2 className="text-lg font-bold text-amber-300 tracking-wide mt-2">
              Gire o celular para a horizontal
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              O mundo de Acordelot foi afinado para ser jogado com a tela deitada.
            </p>

            <button
              type="button"
              onClick={() => onLoginSuccess(authedUser)}
              className="mt-6 cursor-pointer px-5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 transition-all active:scale-95 shadow-lg"
            >
              Continuar assim mesmo →
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-amber-300 tracking-wider">
              Sintonizando o Mundo de Acordelot…
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
