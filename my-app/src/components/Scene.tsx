import { Environment, OrbitControls } from '@react-three/drei'
import Grid from './Grid'
import GameLoop from './GameLoop'

function Scene() {
  return (
    <>
      <OrbitControls></OrbitControls>
      <ambientLight intensity={0.5} />
      {/* key light */}
      <directionalLight position={[3, 3, 3]} color={0xc9e4ff} intensity={Math.PI} />
      {/* fill light */}
      <directionalLight position={[-3, 3, 3]} color={0xc9e4ff} intensity={Math.PI / 2} />
      {/* back light */}
      <directionalLight position={[-3, 1, -3]} color={0xc9e4ff} intensity={Math.PI / 3} />
      {/* gives the reflective cell material something to reflect */}
      <Environment preset="city" />

      <GameLoop />
      <Grid></Grid>
    </>
  )
}

export default Scene
