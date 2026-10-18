import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, MathUtils, Object3D, type BufferGeometry, type Material } from 'three';
import seedrandom from 'seedrandom';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/gameStore';

const tempObject = new Object3D()
const tempColor = new Color()
const rng = seedrandom('grid')

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

    // per-cell jitter offsets, computed once per dimension change.
    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3)
        let i = 0
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    arr[i * 3] = x + rng() * 0.3
                    arr[i * 3 + 1] = y + rng() * 0.3
                    arr[i * 3 + 2] = z + rng() * 0.3
                    i++
                }
            }
        }
        return arr
    }, [width, height, depth, count])

    // per-instance rotation speed/axis so cubes don't all spin in lockstep.
    const rotationSpeeds = useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < arr.length; i++) arr[i] = (rng() - 0.5) * 2
        return arr
    }, [count])

    // per-instance pulse frequency/phase so cubes breathe on their own cycle.
    const pulseParams = useMemo(() => {
        const arr = new Float32Array(count * 2)
        for (let i = 0; i < count; i++) {
            arr[i * 2] = rng() * 5 + 1
            arr[i * 2 + 1] = rng() * Math.PI * 2
        }
        return arr
    }, [count])

    // one base hue per generation, plus a small per-cell jitter so cells
    // read as a spread of shades instead of a flat color or a rainbow clash.
    const HUE_JITTER = 0.3
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute is keyed off generation, value just draws the next shared random
    const baseHue = useMemo(() => rng(), [generation])
    const hueJitterOffsets = useMemo(() => {
        const arr = new Float32Array(count)
        for (let i = 0; i < count; i++) arr[i] = (rng() - 0.5) * HUE_JITTER
        return arr
    }, [count])

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

    // smoothly ease every active cube's scale toward its target (no bounce),
    // spin it in place, layer a per-instance sine pulse on top so alive cubes
    // grow and shrink on their own random cycle, and shade it by how crowded
    // it currently is (more live neighbors -> lighter shade of the base hue);
    // only iterates cells that are alive or still easing out, so cost tracks
    // population density, not total grid size.
    const SCALE_EASE_LAMBDA = 12
    const PULSE_AMPLITUDE = 1
    const MAX_NEIGHBORS = 26
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
            const pulse = 1 + Math.sin(t * pulseParams[i * 2] + pulseParams[i * 2 + 1]) * PULSE_AMPLITUDE
            tempObject.scale.setScalar(current * pulse)
            tempObject.updateMatrix()
            mesh.setMatrixAt(i, tempObject.matrix)
            // mark just this instance's 4x4 block dirty so the GPU upload below
            // only sends the changed instances instead of the whole buffer.
            mesh.instanceMatrix.addUpdateRange(i * 16, 16)

            const hue = (baseHue + hueJitterOffsets[i] + 1) % 1
            const lightness = MathUtils.mapLinear(neighborCounts[i], 0, MAX_NEIGHBORS, 0, 1)
            tempColor.setHSL(hue, 0.7, lightness)
            mesh.setColorAt(i, tempColor)
            mesh.instanceColor?.addUpdateRange(i * 3, 3)
        }
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })

    return (
        <group position={[-(width - 1) / 2, -(height - 1) / 2, -(depth - 1) / 2]}>
            <instancedMesh ref={meshRef} args={args} frustumCulled={false}>
                {/* larger than the 1-unit grid spacing so neighboring alive cells overlap into blobs */}
                <torusKnotGeometry args={[1, 1, 16, 2]} />
                {/* <planeGeometry args={[1, 1]} /> */}
                {/* <capsuleGeometry args={[1, 1, 4, 8, 1]} /> */}
                <meshStandardMaterial />
            </instancedMesh>
        </group>
    )
}

export default Grid;
