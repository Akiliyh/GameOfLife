import { useMemo, useRef } from 'react'
import type { BufferGeometry, InstancedMesh, Material } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../../store/gameStore'
import { useCellAnimation } from './useCellAnimation'
import { useCellAttributes } from './useCellAttributes'

function Grid() {
    const { depth, height, width, cells, neighborCounts, generation } = useGameStore(
        useShallow((s) => ({
            depth: s.depth,
            height: s.height,
            width: s.width,
            cells: s.cells,
            neighborCounts: s.neighborCounts,
            generation: s.generation,
        }))
    )

    // alive cells render with an unlit basic material, dead cells with a lit one, and a
    // material is per-mesh, so each cell has an instance slot in both meshes and only
    // one of the two is ever non-zero-scale.
    const aliveRef = useRef<InstancedMesh>(null)
    const deadRef = useRef<InstancedMesh>(null)
    const count = width * height * depth

    const attributes = useCellAttributes(width, height, depth, generation)
    useCellAnimation({ aliveRef, deadRef, count, cells, neighborCounts, attributes })

    // args tuple must stay referentially stable across renders so R3F doesn't
    // recreate the InstancedMesh (and lose it) on every store update.
    const args = useMemo<[BufferGeometry | undefined, Material | undefined, number]>(
        () => [undefined, undefined, count],
        [count]
    )

    return (
        <group position={[-(width - 1) / 2, -(height - 1) / 2, -(depth - 1) / 2]}>
            <instancedMesh ref={aliveRef} args={args} frustumCulled={false}>
                <boxGeometry args={[1, 1, 5]} />
                {/* alive: unlit, so the colour goes straight to the Bloom */}
                <meshBasicMaterial />
            </instancedMesh>
            {/* dead: lit, so they stay readable instead of vanishing as unlit black */}
            <instancedMesh ref={deadRef} args={args} frustumCulled={false}>
                <boxGeometry args={[1, 1, 5]} />
                <meshStandardMaterial />
            </instancedMesh>
        </group>
    )
}

export default Grid
