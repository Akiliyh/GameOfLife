import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import './App.css'
import GameDebug from './components/GameDebug'
import { useGameStore } from './store/gameStore'
import { useShallow } from 'zustand/react/shallow'

function App() {
  const { width, height, depth } = useGameStore(
    useShallow((s) => ({ width: s.width, height: s.height, depth: s.depth }))
  )
  const distance = Math.max(width, height, depth)

  return (
    <div id="canvas-wrap">
      <GameDebug />
      <Canvas shadows camera={{ position: [distance, distance, distance] }}>
          <Scene />
      </Canvas>
    </div>
  )
}

export default App
