import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { ColorRepresentation, Mesh } from 'three'

type BoxProps = {
    color: ColorRepresentation
    position: [number, number, number]
    args?: [number, number, number]
}

function Box({ color, position, args = [1, 1, 1] }: BoxProps) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.8
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={args} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export default Box