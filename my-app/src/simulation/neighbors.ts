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

function getIndex(x: number, y: number, z: number, width: number, height: number) {
    return x + y * width + z * width * height
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
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
        const nx = x + dx
        const ny = y + dy
        const nz = z + dz

        const outside = nx < 0 || nx >= width || ny < 0 || ny >= height || nz < 0 || nz >= depth
        if (outside) continue

        count += cells[getIndex(nx, ny, nz, width, height)]
    }
    return count
}

export function computeNeighborCounts(
    cells: Uint8Array,
    width: number,
    height: number,
    depth: number,
    out: Uint8Array = new Uint8Array(cells.length)
) {
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                out[getIndex(x, y, z, width, height)] = countAliveNeighbors(cells, x, y, z, width, height, depth)
            }
        }
    }
    return out
}
