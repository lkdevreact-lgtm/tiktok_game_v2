import { Canvas } from '@react-three/fiber'
import React from 'react'
import GameSence from './components/GameSence'
import HealthBarHUD from './components/ui/HealthBarHUD'

const App = () => {
  return (
    <div className="relative w-screen h-screen">
      <Canvas camera={{position:[3,3,3], fov: 50}}>
        <color attach="background" args={["#87CEEB"]} />
        <GameSence />
      </Canvas>
      <HealthBarHUD />
    </div>
  )
}

export default App
