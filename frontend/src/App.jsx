import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import React, { Suspense, useState, useCallback } from 'react'

import './lib/preloadAssets'

const SHOW_STATS = import.meta.env.DEV;
import GameSence from './components/GameSence'
import HealthBarHUD from './components/ui/HealthBarHUD'
import GameLoader from './components/ui/GameLoader'
import TikTokConnectForm from './components/ui/TikTokConnectForm'
import LiveChatOverlay from './components/ui/LiveChatOverlay'
import TriggerPanel from './components/ui/TriggerPanel'
import { useSocket } from './hooks/useSocket'
import { useTriggerEngine } from './hooks/useTriggerEngine'

const App = () => {
  const [tiktokSession, setTiktokSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Single socket instance shared by LiveChatOverlay and TriggerEngine
  const { socket } = useSocket();

  // Trigger Engine — lắng nghe TikTok events và spawn NPC theo trigger rules
  useTriggerEngine(socket);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  const handleLoaderDone = useCallback(() => {
    setShowLoader(false);
  }, []);

  const handleConnected = useCallback((session) => {
    setTiktokSession(session);
  }, []);

  if (tiktokSession) {
    return <TikTokConnectForm onConnected={handleConnected} />;
  }

  return (
    <div className="relative w-screen h-screen">
      <Canvas camera={{position:[3,3,3], fov: 50, near: 0.5, far: 5000}}>
        <color attach="background" args={["#87CEEB"]} />
        {SHOW_STATS && <Stats />}
        <Suspense fallback={null}>
          <GameSence onReady={handleReady} />
        </Suspense>
      </Canvas>
      {showLoader && <GameLoader ready={ready} onFadeComplete={handleLoaderDone} />}
      {!showLoader && <HealthBarHUD />}
      {!showLoader && <LiveChatOverlay socket={socket} />}
      {!showLoader && <TriggerPanel />}
    </div>
  )
}

export default App
