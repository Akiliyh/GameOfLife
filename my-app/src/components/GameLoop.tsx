import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { useGameStore } from '../store/gameStore'

function GameLoop() {
    const accumulatorMs = useRef(0)

    useFrame((_, delta) => {
        const { running, tickIntervalMs, step } = useGameStore.getState()
        if (!running) return

        accumulatorMs.current += delta * 1000
        if (accumulatorMs.current >= tickIntervalMs) {
            accumulatorMs.current = 0
            step()
        }
    })

    return null
}

export default GameLoop
