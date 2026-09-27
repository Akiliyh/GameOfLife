import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, MathUtils, Object3D, type BufferGeometry, type Material } from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/gameStore';

const tempObject = new Object3D()
const tempColor = new Color()

function Grid() {
    const { depth, height, width, cells } = useGameStore(
        useShallow((s) => ({ depth: s.depth, height: s.height, width: s.width, cells: s.cells }))
    )

    const meshRef = useRef<InstancedMesh>(null)
    const scaleCurrentRef = useRef<Float32Array>(new Float32Array(0))
    const scaleTargetRef = useRef<Float32Array>(new Float32Array(0))
    const activeRef = useRef<Set<number>>(new Set())
    const count = width * height * depth

    // animation state is keyed by instance index, so it must be rebuilt (not
    // just resized) whenever the grid dimensions change.
    useEffect(() => {
        const mesh = meshRef.current
        scaleCurrentRef.current = new Float32Array(count)
        scaleTargetRef.current = new Float32Array(count)
        activeRef.current = new Set()
        if (!mesh) return
        tempObject.scale.setScalar(0)
        tempObject.updateMatrix()
        for (let i = 0; i < count; i++) {
            mesh.setMatrixAt(i, tempObject.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
    }, [count])

    // args tuple must stay referentially stable across renders so R3F doesn't
    // recreate the InstancedMesh (and lose it) on every store update.
    const args = useMemo<[BufferGeometry | undefined, Material | undefined, number]>(
        () => [undefined, undefined, count],
        [count]
    )

    // per-cell jitter offsets only depend on the grid dimensions, not on which
    // cells are alive, so they're computed once and reused every tick.
    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3)
        let i = 0
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    const seed = x + y * width + z * width * height
                    arr[i * 3] = x + MathUtils.seededRandom(seed) * 0.3
                    arr[i * 3 + 1] = y + MathUtils.seededRandom(seed + 1000000) * 0.3
                    arr[i * 3 + 2] = z + MathUtils.seededRandom(seed + 2000000) * 0.3
                    i++
                }
            }
        }
        return arr
    }, [width, height, depth, count])

    // per-instance rotation speed/axis so cubes don't all spin in lockstep.
    const rotationSpeeds = useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            const seed = i + 3000000
            arr[i * 3] = (MathUtils.seededRandom(seed) - 0.5) * 2
            arr[i * 3 + 1] = (MathUtils.seededRandom(seed + 1000000) - 0.5) * 2
            arr[i * 3 + 2] = (MathUtils.seededRandom(seed + 2000000) - 0.5) * 2
        }
        return arr
    }, [count])

    // colors are position-based (RGB from normalized x/y/z) with a little
    // random jitter mixed in so cells at the same coordinate still differ;
    // set once per dimension change since it doesn't depend on being alive.
    useEffect(() => {
        const mesh = meshRef.current
        if (!mesh) return
        const jitter = 0.25
        let i = 0
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    const r = MathUtils.clamp(x / width + (Math.random() - 0.5) * jitter, 0, 1)
                    const g = MathUtils.clamp(y / height + (Math.random() - 0.5) * jitter, 0, 1)
                    const b = MathUtils.clamp(z / depth + (Math.random() - 0.5) * jitter, 0, 1)
                    tempColor.setRGB(r, g, b)
                    mesh.setColorAt(i, tempColor)
                    i++
                }
            }
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }, [width, height, depth, count])

    // on every tick, just update each cell's spring target (0 or 1) instead
    // of snapping its matrix instantly. Newly-alive cells join the active set
    // so the per-frame loop starts easing them in; cells that just died stay
    // in the active set (added when they were born) until they finish easing out.
    useEffect(() => {
        const target = scaleTargetRef.current
        const active = activeRef.current
        for (let i = 0; i < count; i++) {
            const isAlive = cells[i] === 1
            target[i] = isAlive ? 1 : 0
            if (isAlive) active.add(i)
        }
    }, [cells, count])

    // smoothly ease every active cube's scale toward its target (no bounce)
    // and spin it in place; only iterates cells that are alive or still
    // easing out, so cost tracks population density, not total grid size.
    const SCALE_EASE_LAMBDA = 12
    useFrame((state, delta) => {
        const mesh = meshRef.current
        const active = activeRef.current
        if (!mesh || active.size === 0) return

        const scaleCurrent = scaleCurrentRef.current
        const target = scaleTargetRef.current
        const t = state.clock.elapsedTime

        for (const i of active) {
            const targetScale = target[i]
            let current = MathUtils.damp(scaleCurrent[i], targetScale, SCALE_EASE_LAMBDA, delta)

            const settled = Math.abs(targetScale - current) < 0.001
            if (settled) {
                current = targetScale
                if (targetScale === 0) active.delete(i)
            }

            scaleCurrent[i] = current

            tempObject.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
            tempObject.rotation.set(
                t * rotationSpeeds[i * 3],
                t * rotationSpeeds[i * 3 + 1],
                t * rotationSpeeds[i * 3 + 2]
            )
            tempObject.scale.setScalar(current)
            tempObject.updateMatrix()
            mesh.setMatrixAt(i, tempObject.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
    })

    return (
        <group position={[-(width - 1) / 2, -(height - 1) / 2, -(depth - 1) / 2]}>
            <instancedMesh ref={meshRef} args={args} frustumCulled={false}>
                {/* larger than the 1-unit grid spacing so neighboring alive cells overlap into blobs */}
                <boxGeometry args={[1.3, 1.3, 1.3]} />
                <meshStandardMaterial />
            </instancedMesh>
        </group>
    )
}

export default Grid;
