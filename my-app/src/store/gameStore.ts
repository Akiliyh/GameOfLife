import { create } from 'zustand'
import { randomCells } from '../simulation/cells'
import { createGrid, type Cells, type NeighborCounts } from '../simulation/grid'
import { computeNeighborCounts } from '../simulation/neighbors'
import { applyRules } from '../simulation/rules'

type GameState = {
    width: number
    height: number
    depth: number
    cells: Cells
    nextCells: Cells
    neighborCounts: NeighborCounts
    nextNeighborCounts: NeighborCounts
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
    const cells = randomCells(width, height, depth, chance)
    const neighborCounts = computeNeighborCounts(cells) // grid of neighbour counts
    return { cells, neighborCounts }
}

function createEmptyBuffers(width: number, height: number, depth: number) {
    return {
        nextCells: createGrid(width, height, depth, () => false),
        nextNeighborCounts: createGrid(width, height, depth, () => 0),
    }
}

export const useGameStore = create<GameState>((set, get) => {
    const initialGrid = createRandomGrid(INITIAL_SIZE, INITIAL_SIZE, INITIAL_SIZE, INITIAL_CHANCE)

    return {
        width: INITIAL_SIZE,
        height: INITIAL_SIZE,
        depth: INITIAL_SIZE,
        cells: initialGrid.cells,
        neighborCounts: initialGrid.neighborCounts,
        ...createEmptyBuffers(INITIAL_SIZE, INITIAL_SIZE, INITIAL_SIZE), // fills the rest with dead cells
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
            const grid = createRandomGrid(width, height, depth, chance)
            set({
                width,
                height,
                depth,
                ...grid,
                ...createEmptyBuffers(width, height, depth),
                generation: generation + 1,
            })
        },

        randomize: (newChance) => {
            const { width, height, depth, generation, chance } = get()
            const grid = createRandomGrid(width, height, depth, newChance ?? chance)
            set({ ...grid, generation: generation + 1 })
        },

        step: () => {
            const { cells, neighborCounts, nextCells, nextNeighborCounts } = get()

            applyRules(cells, neighborCounts, nextCells)
            computeNeighborCounts(nextCells, nextNeighborCounts)

            // swap: the new grids become current, the old ones get reused next step
            set({
                cells: nextCells,
                neighborCounts: nextNeighborCounts,
                nextCells: cells,
                nextNeighborCounts: neighborCounts,
            })
        },
    }
})
