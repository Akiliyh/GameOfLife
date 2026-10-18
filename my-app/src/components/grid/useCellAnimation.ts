import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MathUtils, Object3D, type InstancedMesh } from 'three'
import { MAX_NEIGHBORS } from '../../simulation/neighbors'
import { useGameStore } from '../../store/gameStore'
import {
    DEATH_LIGHTNESS,
    DEATH_SHRINK,
    PULSE_AMPLITUDE,
    SCALE_EASE_LAMBDA,
    SPIN_MAX,
    SPIN_MIN,
} from './config'
import type { CellAttributes } from './useCellAttributes'

const tempObject = new Object3D()
const tempColor = new Color()

function hideInstance(mesh: InstancedMesh, i: number) {
    tempObject.scale.setScalar(0)
    tempObject.updateMatrix()
    mesh.setMatrixAt(i, tempObject.matrix)
    mesh.instanceMatrix.addUpdateRange(i * 16, 16)
    mesh.instanceMatrix.needsUpdate = true
}

type Params = {
    aliveRef: RefObject<InstancedMesh | null>
    deadRef: RefObject<InstancedMesh | null>
    count: number
    cells: Uint8Array
    neighborCounts: Uint8Array
    attributes: CellAttributes
}

// Drives both instanced meshes: alive cells animate every frame, cells that
// just died are handed over to the (frozen) dead mesh.
export function useCellAnimation({ aliveRef, deadRef, count, cells, neighborCounts, attributes }: Params) {
    const { positions, rotationSpeeds, pulseParams, baseHue, hueJitterOffsets } = attributes
    const scaleCurrentRef = useRef<Float32Array>(new Float32Array(0))
    const activeRef = useRef<Set<number>>(new Set())
    // our own clock, so rotation and pulsing can freeze and resume without jumping
    const animationTimeRef = useRef(0)

    // animation state is keyed by instance index, so it must be rebuilt (not
    // just resized) whenever the grid dimensions change.
    useEffect(() => {
        const alive = aliveRef.current
        const dead = deadRef.current
        scaleCurrentRef.current = new Float32Array(count)
        activeRef.current = new Set()
        if (!alive || !dead) return
        for (let i = 0; i < count; i++) {
            hideInstance(alive, i)
            hideInstance(dead, i)
        }
    }, [aliveRef, deadRef, count])

    // on every tick, newly-alive cells join the active set so the per-frame
    // loop starts easing them in and spinning them; cells that just died are
    // dropped from it instead and get one final look baked in - darker and
    // a touch smaller - so they read as dead, then stay frozen exactly like
    // that rather than animating them back out of existence.
    useEffect(() => {
        const alive = aliveRef.current
        const dead = deadRef.current
        const active = activeRef.current
        const scaleCurrent = scaleCurrentRef.current
        if (!alive || !dead) return
        for (let i = 0; i < count; i++) {
            if (cells[i] === 1) {
                if (!active.has(i)) {
                    active.add(i)
                    hideInstance(dead, i) // coming back to life: hide its dead copy
                }
                continue
            }
            if (!active.delete(i)) continue

            scaleCurrent[i] *= DEATH_SHRINK
            // move the cube's last pose from the alive mesh to the dead mesh, shrunk
            alive.getMatrixAt(i, tempObject.matrix)
            tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale)
            tempObject.scale.multiplyScalar(DEATH_SHRINK)
            tempObject.updateMatrix()
            dead.setMatrixAt(i, tempObject.matrix)
            dead.instanceMatrix.addUpdateRange(i * 16, 16)
            dead.instanceMatrix.needsUpdate = true

            hideInstance(alive, i)

            tempColor.setHSL(baseHue, 0.3, DEATH_LIGHTNESS)
            dead.setColorAt(i, tempColor)
            dead.instanceColor?.addUpdateRange(i * 3, 3)
            if (dead.instanceColor) dead.instanceColor.needsUpdate = true
        }
    }, [aliveRef, deadRef, cells, count, baseHue])

    // ease every active cube's scale up to full size, spin it at a speed driven
    // by its neighbor count, layer a per-instance sine pulse on top, and shade
    // it by how crowded it is (more neighbors -> lighter shade of the base hue).
    // Only iterates alive cells, so cost tracks population, not grid size.
    useFrame((_, delta) => {
        const mesh = aliveRef.current
        const active = activeRef.current
        if (!mesh || active.size === 0) return

        const scaleCurrent = scaleCurrentRef.current
        if (useGameStore.getState().animated) animationTimeRef.current += delta
        const t = animationTimeRef.current

        for (const i of active) {
            const current = MathUtils.damp(scaleCurrent[i], 1, SCALE_EASE_LAMBDA, delta)
            scaleCurrent[i] = current

            const spin = MathUtils.mapLinear(neighborCounts[i], 0, MAX_NEIGHBORS, SPIN_MIN, SPIN_MAX)
            tempObject.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
            tempObject.rotation.set(
                t * rotationSpeeds[i * 3] * spin,
                t * rotationSpeeds[i * 3 + 1] * spin,
                t * rotationSpeeds[i * 3 + 2] * spin
            )
            const pulse = 1 + Math.sin(t * pulseParams[i * 2] + pulseParams[i * 2 + 1]) * PULSE_AMPLITUDE
            tempObject.scale.setScalar(current * pulse)
            tempObject.updateMatrix()
            mesh.setMatrixAt(i, tempObject.matrix)
            // mark just this instance's 4x4 block dirty so the GPU upload only sends changed instances
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
}
