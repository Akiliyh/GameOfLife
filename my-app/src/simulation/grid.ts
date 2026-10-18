// A 3D grid indexed as grid[x][y][z]
export type Grid<T> = T[][][]

export type Cells = Grid<boolean>
export type NeighborCounts = Grid<number>

// Instances are numbered in x -> y -> z order (z fastest); this maps that
// instance number back to its [x, y, z] position in the grid.
export function instanceToCoords(i: number, height: number, depth: number): [number, number, number] {
    return [Math.floor(i / (height * depth)), Math.floor(i / depth) % height, i % depth]
}

export function createGrid<T>(width: number, height: number, depth: number, fill: (x: number, y: number, z: number) => T): Grid<T> {
    return Array.from({ length: width }, (_, x) =>
        Array.from({ length: height }, (_, y) => Array.from({ length: depth }, (_, z) => fill(x, y, z)))
    )
}
