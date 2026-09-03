/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameCanvas } from './components/GameCanvas';

export default function App() {
  return (
    <main className="w-full h-full min-h-screen bg-slate-950 overflow-hidden">
      <GameCanvas />
    </main>
  );
}

