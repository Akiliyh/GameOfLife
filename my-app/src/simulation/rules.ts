import type { Cells, NeighborCounts } from './grid'

const BIRTH_COUNTS = [13, 14, 17, 18, 19, 20, 21]
const DEATH_COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export function applyRules(cells: Cells, neighborCounts: NeighborCounts, next: Cells) {
    for (let x = 0; x < cells.length; x++) {
        for (let y = 0; y < cells[x].length; y++) {
            for (let z = 0; z < cells[x][y].length; z++) {
                const neighbors = neighborCounts[x][y][z]

                if (cells[x][y][z]) {
                    next[x][y][z] = !DEATH_COUNTS.includes(neighbors) // if this number of neighbours then we kill it
                } else {
                    next[x][y][z] = BIRTH_COUNTS.includes(neighbors)
                }
            }
        }
    }
}
