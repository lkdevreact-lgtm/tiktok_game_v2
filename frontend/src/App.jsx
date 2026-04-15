import { Canvas } from '@react-three/fiber'
import React from 'react'
import GameSence from './components/GameSence'

const App = () => {
  return (
    <Canvas camera={{position:[3,3,3], fov: 50}}>
       <color attach="background" args={["#87CEEB"]} />
       <GameSence />
    </Canvas>
  )
}

export default App