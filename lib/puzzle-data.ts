import tacticalPuzzlesRaw from "@/data/puzzles.json"
// import forcedCheckmatesRaw from "@/data/forced-checkmates.json"

export type PuzzleKind = "tactic" | "forced-mate"

export type ForcedMateType = "mateIn1" | "mateIn2" | "mateIn3"

export interface TacticalPuzzle {
  id: string
  fen: string
  moves: string[]
  rating: number
  themes: string[]
  popularity?: number
  plays?: number
  gameUrl?: string
  openingTags?: string[]
}

export type TacticalPuzzleFile = TacticalPuzzle[]

export type ForcedCheckmatePuzzle = {
  id: string
  fen: string
  moves: string[]
  rating: number
  type: ForcedMateType
}

export type Puzzle = TacticalPuzzle & {
  kind: PuzzleKind
  explanation?: string
}

type TacticalPuzzleInput = {
  id?: unknown
  fen?: unknown
  moves?: unknown
  rating?: unknown
  themes?: unknown
  popularity?: unknown
  plays?: unknown
  gameUrl?: unknown
  openingTags?: unknown
}

// type ForcedMatePuzzleInput = {
//   id?: unknown
//   fen?: unknown
//   moves?: unknown
//   rating?: unknown
//   type?: unknown
// }

export const EMPTY_PUZZLE: Puzzle = {
  id: "empty",
  fen: "8/8/8/8/8/8/8/8 w - - 0 1",
  moves: [],
  themes: ["placeholder"],
  rating: 400,
  kind: "tactic",
  explanation: "No puzzles loaded yet.",
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isString(entry) && entry.length > 0)
  )
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function normalizeRating(value: unknown) {
  if (!isNumber(value)) {
    return null
  }
  if (value < 400 || value > 2000) {
    return null
  }
  return Math.round(value)
}

function toOptionalNumber(value: unknown) {
  if (!isNumber(value)) {
    return undefined
  }
  return Math.round(value)
}

function toTacticalPuzzle(value: TacticalPuzzleInput): Puzzle | null {
  const rating = normalizeRating(value.rating)
  if (
    !isString(value.id) ||
    !isString(value.fen) ||
    !isStringArray(value.moves)
  ) {
    return null
  }
  if (
    !isStringArray(value.themes) ||
    value.themes.length === 0 ||
    rating === null
  ) {
    return null
  }

  return {
    id: value.id,
    fen: value.fen,
    moves: value.moves,
    themes: value.themes,
    rating,
    kind: "tactic",
    popularity: toOptionalNumber(value.popularity),
    plays: toOptionalNumber(value.plays),
    gameUrl: isString(value.gameUrl) ? value.gameUrl : undefined,
    openingTags: isStringArray(value.openingTags)
      ? value.openingTags
      : undefined,
  }
}

// function toForcedMatePuzzle(value: ForcedMatePuzzleInput): Puzzle | null {
//   const rating = normalizeRating(value.rating)
//   if (!isString(value.id) || !isString(value.fen) || !isStringArray(value.moves)) {
//     return null
//   }
//   if (rating === null) {
//     return null
//   }
//
//   const mateType =
//     value.type === "mateIn1" || value.type === "mateIn2" || value.type === "mateIn3"
//       ? value.type
//       : "mateIn1"
//
//   return {
//     id: value.id,
//     fen: value.fen,
//     moves: value.moves,
//     rating,
//     themes: ["forced-checkmate", mateType],
//     kind: "forced-mate",
//   }
// }

const TACTICAL_PUZZLES: Puzzle[] = (
  Array.isArray(tacticalPuzzlesRaw) ? tacticalPuzzlesRaw : []
)
  .map((entry) => toTacticalPuzzle(entry as TacticalPuzzleInput))
  .filter((puzzle): puzzle is Puzzle => puzzle !== null)

// const FORCED_MATE_PUZZLES: Puzzle[] = (Array.isArray(forcedCheckmatesRaw)
//   ? forcedCheckmatesRaw
//   : []
// )
//   .map((entry) => toForcedMatePuzzle(entry as ForcedMatePuzzleInput))
//   .filter((puzzle): puzzle is Puzzle => puzzle !== null)

export const PUZZLES: Puzzle[] = [...TACTICAL_PUZZLES]

export function getDailyPuzzle() {
  if (TACTICAL_PUZZLES.length === 0) {
    return null
  }

  const dayNumber = Math.floor(Date.now() / 86_400_000)
  return TACTICAL_PUZZLES[dayNumber % TACTICAL_PUZZLES.length]
}
