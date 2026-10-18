import { createGrid, type Cells, type NeighborCounts } from './grid'

export const MAX_NEIGHBORS = 26

// every [dx, dy, dz] around a cell, except the cell itself
const NEIGHBOR_OFFSETS: [number, number, number][] = []
for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue
            NEIGHBOR_OFFSETS.push([dx, dy, dz])
        }
    }
}

function countAliveNeighbors(cells: Cells, x: number, y: number, z: number) {
    let count = 0
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
        // outside the grid the lookup is undefined, which counts as dead
        if (cells[x + dx]?.[y + dy]?.[z + dz]) count++
    }
    return count
}

export function computeNeighborCounts(
    cells: Cells,
    out: NeighborCounts = createGrid(cells.length, cells[0].length, cells[0][0].length, () => 0)
) {
    for (let x = 0; x < cells.length; x++) {
        for (let y = 0; y < cells[x].length; y++) {
            for (let z = 0; z < cells[x][y].length; z++) {
                out[x][y][z] = countAliveNeighbors(cells, x, y, z)
            }
        }
    }
    return out
}
