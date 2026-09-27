import { create } from 'zustand'

type GameState = {
    width: number
    height: number
    depth: number
    cells: Uint8Array
    nextCells: Uint8Array
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

// the 26 Moore-neighborhood offsets (every dx,dy,dz in {-1,0,1} except 0,0,0)
const NEIGHBOR_OFFSETS: [number, number, number][] = []
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue
            NEIGHBOR_OFFSETS.push([dx, dy, dz])
        }
    }
}

// a dead cell is born with exactly 3 neighbors, a live cell dies with 1 or 4 neighbors
const BIRTH_COUNT = new Set([13, 14, 17, 18, 19])
const DEATH_COUNTS = new Set([0,1,2,3,4,5,6,7,8,9,10,11])

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
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
        const nx = x + dx
        const ny = y + dy
        const nz = z + dz
        if (nx < 0 || nx >= width) continue
        if (ny < 0 || ny >= height) continue
        if (nz < 0 || nz >= depth) continue
        count += cells[nx + ny * width + nz * width * height]
    }
    return count
}

const initialWidth = 50
const initialHeight = 50
const initialDepth = 50

export const useGameStore = create<GameState>((set, get) => ({
    width: initialWidth,
    height: initialHeight,
    depth: initialDepth,
    cells: randomCells(initialWidth * initialHeight * initialDepth, 0.05),
    nextCells: new Uint8Array(initialWidth * initialHeight * initialDepth),
    running: false,
    tickIntervalMs: 200,
    chance: 0.05,

    setRunning: (running) => set({ running }),
    setTickIntervalMs: (tickIntervalMs) => set({ tickIntervalMs }),

    setChance: (chance) => {
        const { width, height, depth } = get()
        set({ chance, cells: randomCells(width * height * depth, chance) })
    },

    setDimensions: (width, height, depth) => {
        const { chance } = get()
        set({
            width,
            height,
            depth,
            cells: randomCells(width * height * depth, chance),
            nextCells: new Uint8Array(width * height * depth),
        })
    },

    randomize: (chance) => {
        const state = get()
        const usedChance = chance ?? state.chance
        set({ cells: randomCells(state.width * state.height * state.depth, usedChance) })
    },

    step: () => {
        const { width, height, depth, cells, nextCells } = get()

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    const i = x + y * width + z * width * height
                    const alive = cells[i] === 1
                    const neighbors = countAliveNeighbors(cells, x, y, z, width, height, depth)

                    if (alive) {
                        nextCells[i] = DEATH_COUNTS.has(neighbors) ? 0 : 1
                    } else {
                        nextCells[i] = BIRTH_COUNT.has(neighbors) ? 1 : 0
                    }
                }
            }
        }

        // swap buffers: nextCells becomes the current state, cells becomes the scratch buffer
        set({ cells: nextCells, nextCells: cells })
    },
}))
