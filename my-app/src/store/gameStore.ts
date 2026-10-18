import { create } from 'zustand'
import { randomCells } from '../simulation/cells'
import { computeNeighborCounts } from '../simulation/neighbors'
import { applyRules } from '../simulation/rules'

type GameState = {
    width: number
    height: number
    depth: number
    cells: Uint8Array
    nextCells: Uint8Array
    neighborCounts: Uint8Array
    nextNeighborCounts: Uint8Array
    generation: number
    running: boolean
    animated: boolean
    tickIntervalMs: number
    chance: number
    setDimensions: (width: number, height: number, depth: number) => void
    randomize: (chance?: number) => void
    step: () => void
    setRunning: (running: boolean) => void
    setAnimated: (animated: boolean) => void
    setTickIntervalMs: (tickIntervalMs: number) => void
    setChance: (chance: number) => void
}

const INITIAL_SIZE = 50
const INITIAL_CHANCE = 0.45

function createRandomGrid(width: number, height: number, depth: number, chance: number) {
    const cells = randomCells(width * height * depth, chance)
    const neighborCounts = computeNeighborCounts(cells, width, height, depth)
    return { cells, neighborCounts }
}

export const useGameStore = create<GameState>((set, get) => {
    const initialCount = INITIAL_SIZE * INITIAL_SIZE * INITIAL_SIZE
    const initialGrid = createRandomGrid(INITIAL_SIZE, INITIAL_SIZE, INITIAL_SIZE, INITIAL_CHANCE)

    return {
        width: INITIAL_SIZE,
        height: INITIAL_SIZE,
        depth: INITIAL_SIZE,
        cells: initialGrid.cells,
        neighborCounts: initialGrid.neighborCounts,
        nextCells: new Uint8Array(initialCount),
        nextNeighborCounts: new Uint8Array(initialCount),
        generation: 0,
        running: false,
        animated: true,
        tickIntervalMs: 200,
        chance: INITIAL_CHANCE,

        setRunning: (running) => set({ running }),
        setAnimated: (animated) => set({ animated }),
        setTickIntervalMs: (tickIntervalMs) => set({ tickIntervalMs }),

        setChance: (chance) => {
            const { width, height, depth, generation } = get()
            const grid = createRandomGrid(width, height, depth, chance)
            set({ chance, ...grid, generation: generation + 1 })
        },

        setDimensions: (width, height, depth) => {
            const { chance, generation } = get()
            const count = width * height * depth
            const grid = createRandomGrid(width, height, depth, chance)
            set({
                width,
                height,
                depth,
                ...grid,
                nextCells: new Uint8Array(count),
                nextNeighborCounts: new Uint8Array(count),
                generation: generation + 1,
            })
        },

        randomize: (newChance) => {
            const { width, height, depth, generation, chance } = get()
            const grid = createRandomGrid(width, height, depth, newChance ?? chance)
            set({ ...grid, generation: generation + 1 })
        },

        step: () => {
            const { width, height, depth, cells, neighborCounts, nextCells, nextNeighborCounts } = get()

            applyRules(cells, neighborCounts, nextCells)
            computeNeighborCounts(nextCells, width, height, depth, nextNeighborCounts)

            // swap: the new arrays become current, the old ones get reused next step
            set({
                cells: nextCells,
                neighborCounts: nextNeighborCounts,
                nextCells: cells,
                nextNeighborCounts: neighborCounts,
            })
        },
    }
})
