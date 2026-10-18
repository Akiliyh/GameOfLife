import seedrandom from 'seedrandom'

// shared seeded stream so the look of the grid is reproducible across reloads
export const rng = seedrandom('grid')

// how far a cell may be nudged off its lattice point
export const POSITION_JITTER = 0.3
// spread of per-cell hue around the generation's base hue
export const HUE_JITTER = 0.3

// a dead cell keeps its last pose, shrunk and recoloured
export const DEATH_SHRINK = 0.3
export const DEATH_LIGHTNESS = 0

export const SCALE_EASE_LAMBDA = 12
export const PULSE_AMPLITUDE = 1
export const SPIN_MIN = 0.3
export const SPIN_MAX = 4
