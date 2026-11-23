import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingScreen } from './screens/LandingScreen';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { JoinRoomScreen } from './screens/JoinRoomScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { ActiveGameFlow } from './screens/ActiveGameFlow';
import { ResultsScreen } from './screens/ResultsScreen';
import { useGameStore } from './store/gameStore';

export const App: React.FC = () => {
  const theme = useGameStore((state) => state.theme);
  const toastMessage = useGameStore((state) => state.toastMessage);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
        <Navbar />
        <main className="flex-1 w-full relative">
          {/* Global Toast Notification for server events */}
          {toastMessage && (
            <div className="fixed top-14 inset-x-4 z-50 flex justify-center pointer-events-none transition-all duration-300">
              <div className="bg-slate-900/95 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full shadow-2xl border border-white/20 flex items-center gap-2 backdrop-blur-md animate-bounce">
                <span>{toastMessage}</span>
              </div>
            </div>
          )}
          <Routes>
            <Route path="/" element={<LandingScreen />} />
            <Route path="/create" element={<CreateRoomScreen />} />
            <Route path="/join" element={<JoinRoomScreen />} />
            <Route path="/lobby/:roomId" element={<LobbyScreen />} />
            <Route path="/game/:roomId" element={<ActiveGameFlow />} />
            <Route path="/results/:roomId" element={<ResultsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
