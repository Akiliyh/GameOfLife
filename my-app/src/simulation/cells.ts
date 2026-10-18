import { createGrid } from './grid'

export function randomCells(width: number, height: number, depth: number, chance: number) {
    return createGrid(width, height, depth, () => Math.random() < chance)
}
