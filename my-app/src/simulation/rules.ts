const BIRTH_COUNTS = [13, 14, 17, 18, 19, 20, 21]
const DEATH_COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export function applyRules(cells: Uint8Array, neighborCounts: Uint8Array, next: Uint8Array) {
    for (let i = 0; i < cells.length; i++) {
        const neighbors = neighborCounts[i]

        if (cells[i] === 1) {
            next[i] = DEATH_COUNTS.includes(neighbors) ? 0 : 1
        } else {
            next[i] = BIRTH_COUNTS.includes(neighbors) ? 1 : 0
        }
    }
}
