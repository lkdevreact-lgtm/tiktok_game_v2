import { Canvas } from '@react-three/fiber'
import React, { Suspense, useState, useCallback } from 'react'
import GameSence from './components/GameSence'
import HealthBarHUD from './components/ui/HealthBarHUD'
import GameLoader from './components/ui/GameLoader'

const App = () => {
  const [ready, setReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  const handleLoaderDone = useCallback(() => {
    setShowLoader(false);
  }, []);

  return (
    <div className="relative w-screen h-screen">
      <Canvas camera={{position:[3,3,3], fov: 50, near: 0.5, far: 5000}}>
        <color attach="background" args={["#87CEEB"]} />
        <Suspense fallback={null}>
          <GameSence onReady={handleReady} />
        </Suspense>
      </Canvas>
      {showLoader && <GameLoader ready={ready} onFadeComplete={handleLoaderDone} />}
      {!showLoader && <HealthBarHUD />}
    </div>
  )
}

export default App
