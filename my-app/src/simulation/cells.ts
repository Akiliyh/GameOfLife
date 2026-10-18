export function randomCells(count: number, chance: number) {
    const cells = new Uint8Array(count)
    for (let i = 0; i < count; i++) {
        cells[i] = Math.random() < chance ? 1 : 0
    }
    return cells
}
