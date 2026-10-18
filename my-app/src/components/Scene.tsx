import { Environment, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import Grid from './Grid'
import GameLoop from './GameLoop'

function Scene() {
  return (
    <>
      {/* dark backdrop so the bloom on alive cells reads like glowing crystals in a geode */}
      <color attach="background" args={['#050507']} />
      <OrbitControls></OrbitControls>
      <ambientLight intensity={0.1} />
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

      <EffectComposer>
        <Bloom mipmapBlur intensity={5} luminanceThreshold={0.3} luminanceSmoothing={0.3} />
      </EffectComposer>
    </>
  )
}

export default Scene
