import { useControls, button } from 'leva'
import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

function GameDebug() {
    const setDimensions = useGameStore((s) => s.setDimensions)
    const setRunning = useGameStore((s) => s.setRunning)
    const setTickIntervalMs = useGameStore((s) => s.setTickIntervalMs)
    const setChance = useGameStore((s) => s.setChance)
    const step = useGameStore((s) => s.step)
    const randomize = useGameStore((s) => s.randomize)
    const initial = useGameStore.getState()

    const { width, height, depth } = useControls('Grid', {
        width: { value: initial.width, min: 1, max: 100, step: 1 },
        height: { value: initial.height, min: 1, max: 100, step: 1 },
        depth: { value: initial.depth, min: 1, max: 100, step: 1 },
    })

    const { running, tickIntervalMs, chance } = useControls('Simulation', {
        running: { value: initial.running },
        tickIntervalMs: { value: initial.tickIntervalMs, min: 20, max: 1000, step: 10, label: 'speed (ms/tick)' },
        chance: { value: initial.chance, min: 0, max: 1, step: 0.01, label: 'alive chance' },
        'Step Once': button(() => step()),
        'Randomize': button(() => randomize()),
    })

    useEffect(() => {
        setDimensions(width, height, depth)
    }, [width, height, depth, setDimensions])

    useEffect(() => {
        setRunning(running)
    }, [running, setRunning])

    useEffect(() => {
        setTickIntervalMs(tickIntervalMs)
    }, [tickIntervalMs, setTickIntervalMs])

    useEffect(() => {
        setChance(chance)
    }, [chance, setChance])

    return null
}

export default GameDebug
