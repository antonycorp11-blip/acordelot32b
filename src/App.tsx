/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { GameCanvas } from './components/GameCanvas';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // 1. Checa sessão existente no carregamento inicial (login persistente)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setCheckingAuth(false);
    });

    // 2. Ouve alterações de autenticação em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      // Se for SIGNED_IN durante uso da tela de login, não interrompe a transição cinematográfica do LoginScreen.
      // O LoginScreen chamará onLoginSuccess após a transição visual.
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleLoginSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
  };

  // Tela preta minimalista de carregamento inicial (enquanto valida sessão do Supabase)
  if (checkingAuth) {
    return (
      <main className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-[0.25em] text-amber-300 font-bold animate-pulse">
          Acordelot
        </span>
      </main>
    );
  }

  return (
    <main className="w-full h-full bg-slate-950 overflow-hidden">
      {user ? (
        <GameCanvas user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </main>
  );
}
