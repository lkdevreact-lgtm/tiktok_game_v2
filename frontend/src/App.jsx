import { Canvas } from '@react-three/fiber'
import React from 'react'
import GameSence from './components/GameSence'

const App = () => {
  return (
    <Canvas shadows camera={{position:[3,3,3], fov: 30}}>
       <color attach="background" args={["#ececec"]} />
       <GameSence />
    </Canvas>
  )
}

export default App