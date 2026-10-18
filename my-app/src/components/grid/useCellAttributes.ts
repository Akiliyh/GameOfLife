import { useMemo } from 'react'
import { HUE_JITTER, POSITION_JITTER, rng } from './config'

const randomBetween = (min: number, max: number) => min + rng() * (max - min)

// Per-instance randomness, regenerated only when the grid dimensions change
// (or, for the base hue, when a new generation is seeded).
export function useCellAttributes(width: number, height: number, depth: number, generation: number) {
    const count = width * height * depth

    // each cube's grid coordinate plus a little random jitter (x, y, z for every cube)
    const positions = useMemo(() => {
        const arr: number[] = []
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    arr.push(x + rng() * POSITION_JITTER, y + rng() * POSITION_JITTER, z + rng() * POSITION_JITTER)
                }
            }
        }
        return arr
    }, [width, height, depth])

    // spin speed around x, y and z for each cube
    const rotationSpeeds = useMemo(() => Array.from({ length: count * 3 }, () => randomBetween(-1, 1)), [count])

    // for each cube a [frequency, phase] pair for its breathing animation
    const pulseParams = useMemo(
        () => Array.from({ length: count * 2 }, (_, i) => (i % 2 === 0 ? randomBetween(1, 6) : randomBetween(0, 2 * Math.PI))),
        [count]
    )

    // one base hue per generation, plus a small per-cube offset
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute is keyed off generation, value just draws the next shared random
    const baseHue = useMemo(() => rng(), [generation])
    const hueJitterOffsets = useMemo(
        () => Array.from({ length: count }, () => randomBetween(-HUE_JITTER / 2, HUE_JITTER / 2)),
        [count]
    )

    return { positions, rotationSpeeds, pulseParams, baseHue, hueJitterOffsets }
}

export type CellAttributes = ReturnType<typeof useCellAttributes>
