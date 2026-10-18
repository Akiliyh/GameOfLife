import { create } from 'zustand'

type GameState = {
    width: number
    height: number
    depth: number
    cells: Uint8Array
    nextCells: Uint8Array
    // each cell's live neighbor count (0-26), kept in step with cells so the
    // renderer can use it (e.g. to shade cells by how crowded they are).
    neighborCounts: Uint8Array
    nextNeighborCounts: Uint8Array
    // bumped whenever the grid is reseeded (setChance/setDimensions/randomize)
    // but not on step(), so effects can react to "new generation" without
    // also re-running on every simulation tick.
    generation: number
    running: boolean
    tickIntervalMs: number
    chance: number
    setDimensions: (width: number, height: number, depth: number) => void
    randomize: (chance?: number) => void
    step: () => void
    setRunning: (running: boolean) => void
    setTickIntervalMs: (tickIntervalMs: number) => void
    setChance: (chance: number) => void
}

function randomCells(count: number, chance: number) {
    const cells = new Uint8Array(count)
    for (let i = 0; i < count; i++) {
        cells[i] = Math.random() < chance ? 1 : 0
    }
    return cells
}

// the 26 Moore-neighborhood offsets (every dx,dy,dz in {-1,0,1} except 0,0,0),
// kept as flat typed arrays (instead of an array of [dx,dy,dz] tuples) so the
// hot loop in countAliveNeighbors doesn't destructure a tuple 26 times per cell.
const offsetsX: number[] = []
const offsetsY: number[] = []
const offsetsZ: number[] = []
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue
            offsetsX.push(dx)
            offsetsY.push(dy)
            offsetsZ.push(dz)
        }
    }
}
const NEIGHBOR_DX = Int8Array.from(offsetsX)
const NEIGHBOR_DY = Int8Array.from(offsetsY)
const NEIGHBOR_DZ = Int8Array.from(offsetsZ)

// a dead cell is born with exactly 3 neighbors, a live cell dies with 1 or 4 neighbors
const BIRTH_COUNT = new Set([13, 14, 17, 18, 19, 20, 21])
const DEATH_COUNTS = new Set([0,1,2,3,4,5,6,7,8,9,10,11])

// flattened into lookup tables (index = neighbor count, 0-26) so the hot loop
// in step() does an array read instead of a Set.has() hash lookup per cell.
const BIRTH_LOOKUP = new Uint8Array(27)
const DEATH_LOOKUP = new Uint8Array(27)
for (let n = 0; n <= 26; n++) {
    BIRTH_LOOKUP[n] = BIRTH_COUNT.has(n) ? 1 : 0
    DEATH_LOOKUP[n] = DEATH_COUNTS.has(n) ? 1 : 0
}

function countAliveNeighbors(
    cells: Uint8Array,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number
) {
    let count = 0
    for (let k = 0; k < NEIGHBOR_DX.length; k++) {
        const nx = x + NEIGHBOR_DX[k]
        const ny = y + NEIGHBOR_DY[k]
        const nz = z + NEIGHBOR_DZ[k]
        if (nx < 0 || nx >= width) continue
        if (ny < 0 || ny >= height) continue
        if (nz < 0 || nz >= depth) continue
        count += cells[nx + ny * width + nz * width * height]
    }
    return count
}

function computeNeighborCounts(cells: Uint8Array, width: number, height: number, depth: number) {
    const counts = new Uint8Array(cells.length)
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                counts[x + y * width + z * width * height] = countAliveNeighbors(
                    cells, x, y, z, width, height, depth
                )
            }
        }
    }
    return counts
}

const initialWidth = 50
const initialHeight = 50
const initialDepth = 50
const initialCells = randomCells(initialWidth * initialHeight * initialDepth, 0.05)

export const useGameStore = create<GameState>((set, get) => ({
    width: initialWidth,
    height: initialHeight,
    depth: initialDepth,
    cells: initialCells,
    nextCells: new Uint8Array(initialWidth * initialHeight * initialDepth),
    neighborCounts: computeNeighborCounts(initialCells, initialWidth, initialHeight, initialDepth),
    nextNeighborCounts: new Uint8Array(initialWidth * initialHeight * initialDepth),
    generation: 0,
    running: false,
    tickIntervalMs: 200,
    chance: 0.05,

    setRunning: (running) => set({ running }),
    setTickIntervalMs: (tickIntervalMs) => set({ tickIntervalMs }),

    setChance: (chance) => {
        const { width, height, depth, generation } = get()
        const cells = randomCells(width * height * depth, chance)
        set({
            chance,
            cells,
            neighborCounts: computeNeighborCounts(cells, width, height, depth),
            generation: generation + 1,
        })
    },

    setDimensions: (width, height, depth) => {
        const { chance, generation } = get()
        const cells = randomCells(width * height * depth, chance)
        set({
            width,
            height,
            depth,
            cells,
            nextCells: new Uint8Array(width * height * depth),
            neighborCounts: computeNeighborCounts(cells, width, height, depth),
            nextNeighborCounts: new Uint8Array(width * height * depth),
            generation: generation + 1,
        })
    },

    randomize: (chance) => {
        const state = get()
        const usedChance = chance ?? state.chance
        const cells = randomCells(state.width * state.height * state.depth, usedChance)
        set({
            cells,
            neighborCounts: computeNeighborCounts(cells, state.width, state.height, state.depth),
            generation: state.generation + 1,
        })
    },

    step: () => {
        const { width, height, depth, cells, neighborCounts, nextCells, nextNeighborCounts } = get()

        // neighborCounts always describes `cells`, so the rule can read it directly
        for (let i = 0; i < cells.length; i++) {
            const neighbors = neighborCounts[i]
            nextCells[i] = cells[i] === 1 ? 1 - DEATH_LOOKUP[neighbors] : BIRTH_LOOKUP[neighbors]
        }

        // recount against the new generation so counts stay in step with nextCells
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    nextNeighborCounts[x + y * width + z * width * height] = countAliveNeighbors(
                        nextCells, x, y, z, width, height, depth
                    )
                }
            }
        }

        // swap buffers: next* become the current state, the old current arrays become scratch buffers
        set((state) => ({
            cells: nextCells,
            nextCells: cells,
            neighborCounts: nextNeighborCounts,
            nextNeighborCounts: state.neighborCounts,
        }))
    },
}))
