import { useMemo } from 'react'
import { HUE_JITTER, POSITION_JITTER, rng } from './config'

// Per-instance randomness, regenerated only when the grid dimensions change
// (or, for the base hue, when a new generation is seeded).
export function useCellAttributes(width: number, height: number, depth: number, generation: number) {
    const count = width * height * depth

    // per-cell jitter offsets
    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3)
        let i = 0
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    arr[i * 3] = x + rng() * POSITION_JITTER
                    arr[i * 3 + 1] = y + rng() * POSITION_JITTER
                    arr[i * 3 + 2] = z + rng() * POSITION_JITTER
                    i++
                }
            }
        }
        return arr
    }, [width, height, depth, count])

    // rotation speed/axis so cubes don't all spin in lockstep
    const rotationSpeeds = useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < arr.length; i++) arr[i] = (rng() - 0.5) * 2
        return arr
    }, [count])

    // pulse frequency/phase so cubes breathe on their own cycle
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute is keyed off generation, value just draws the next shared random
    const baseHue = useMemo(() => rng(), [generation])
    const hueJitterOffsets = useMemo(() => {
        const arr = new Float32Array(count)
        for (let i = 0; i < count; i++) arr[i] = (rng() - 0.5) * HUE_JITTER
        return arr
    }, [count])

    return { positions, rotationSpeeds, pulseParams, baseHue, hueJitterOffsets }
}

export type CellAttributes = ReturnType<typeof useCellAttributes>
