import { Chess, type Move } from "chess.js"

export type PuzzleKind = "tactic" | "forced-mate"

export type Puzzle = {
  id: string
  fen: string
  moves: string[]
  themes: string[]
  rating: number
  kind: PuzzleKind
  explanation?: string
}

type TacticalBucket = "beginner" | "intermediate" | "advanced"

type MateRecipe = {
  id: string
  rating: number
  themes: string[]
  explanation: string
  movesBefore: string[]
  solutionSan: string[]
}

const OPENING_LINES: string[][] = [
  ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O"],
  ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3"],
  ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3"],
  ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "Bg5", "Bb4", "e5"],
  ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3"],
  ["c4", "e5", "Nc3", "Nf6", "Nf3", "Nc6", "g3", "d5", "cxd5"],
  ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3"],
  ["d4", "d5", "Nf3", "Nf6", "e3", "e6", "Bd3", "c5", "c3"],
  ["Nf3", "d5", "g3", "c5", "Bg2", "Nc6", "d4", "Nf6", "O-O"],
  ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3"],
]

const TACTICAL_RATINGS = [
  ...Array.from({ length: 20 }, (_, index) => 420 + index * 14),
  ...Array.from({ length: 20 }, (_, index) => 720 + index * 24),
  ...Array.from({ length: 10 }, (_, index) => 1220 + index * 95),
]

const MOTIFS = [
  "fork",
  "pin",
  "double-attack",
  "discovered-attack",
  "deflection",
  "clearance",
  "zwischenzug",
  "weak-back-rank",
  "trapped-piece",
  "endgame-technique",
]

const MATE_RECIPES: MateRecipe[] = [
  {
    id: "mate_01",
    rating: 520,
    themes: ["mate-in-1", "opening-trap"],
    explanation:
      "Queen lands on f7 to force immediate mate with bishop support.",
    movesBefore: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"],
    solutionSan: ["Qxf7#"],
  },
  {
    id: "mate_02",
    rating: 560,
    themes: ["mate-in-1", "back-rank-mate"],
    explanation:
      "Black exploits weakened dark squares and delivers a direct king hunt finish.",
    movesBefore: ["f3", "e5", "g4"],
    solutionSan: ["Qh4#"],
  },
  {
    id: "mate_03",
    rating: 860,
    themes: ["mate-in-1", "opening-trap"],
    explanation:
      "Classic queen-and-bishop battery: calculate the final forcing blow.",
    movesBefore: ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6"],
    solutionSan: ["Qxf7#"],
  },
  {
    id: "mate_04",
    rating: 980,
    themes: ["mate-in-1", "opening-trap"],
    explanation: "A clean mating net appears once f7 is overloaded.",
    movesBefore: ["e4", "e5", "Bc4", "Nc6", "Qh5", "d6"],
    solutionSan: ["Qxf7#"],
  },
  {
    id: "mate_05",
    rating: 1080,
    themes: ["mate-in-1", "opening-trap"],
    explanation:
      "Same tactical idea from a slightly different setup to reinforce pattern recognition.",
    movesBefore: ["e4", "e5", "Bc4", "d6", "Qh5", "Nf6"],
    solutionSan: ["Qxf7#"],
  },
  {
    id: "mate_06",
    rating: 1180,
    themes: ["mate-in-1", "back-rank-mate"],
    explanation:
      "Fool's-mate structure: the diagonal to e1 opens and black finishes instantly.",
    movesBefore: ["g4", "e5", "f3"],
    solutionSan: ["Qh4#"],
  },
  {
    id: "mate_07",
    rating: 1340,
    themes: ["mate-in-2", "forced-checkmate"],
    explanation:
      "A forcing sequence drags the king and ends with a knight mate pattern.",
    movesBefore: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "d6",
      "Nc3",
      "Bg4",
      "h3",
      "Bh5",
      "Nxe5",
      "Bxd1",
    ],
    solutionSan: ["Bxf7+", "Ke7", "Nd5#"],
  },
  {
    id: "mate_08",
    rating: 1500,
    themes: ["mate-in-1", "smothered-mate-pattern"],
    explanation:
      "This trap ends with a direct mating move once white overreaches.",
    movesBefore: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Nd4",
      "Nxe5",
      "Qg5",
      "Nxf7",
      "Qxg2",
      "Rf1",
      "Qxe4+",
      "Be2",
    ],
    solutionSan: ["Nf3#"],
  },
  {
    id: "mate_09",
    rating: 1720,
    themes: ["mate-in-3", "forced-sequence"],
    explanation:
      "Revisit the legal-mate geometry at a faster pace and confirm every forcing response.",
    movesBefore: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "d6",
      "Nc3",
      "Bg4",
      "h3",
      "Bh5",
      "Nxe5",
      "Bxd1",
    ],
    solutionSan: ["Bxf7+", "Ke7", "Nd5#"],
  },
  {
    id: "mate_10",
    rating: 2040,
    themes: ["mate-in-1", "back-rank-mate", "forced-checkmate"],
    explanation:
      "Grandmaster warm-up: identify the immediate tactical finish under time pressure.",
    movesBefore: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"],
    solutionSan: ["Qxf7#"],
  },
]

function moveToUci(move: { from: string; to: string; promotion?: string }) {
  return `${move.from}${move.to}${move.promotion ?? ""}`
}

function getTacticalBucket(index: number): TacticalBucket {
  if (index < 20) {
    return "beginner"
  }
  if (index < 40) {
    return "intermediate"
  }
  return "advanced"
}

function pickTrainingMove(chess: Chess) {
  const legal = chess.moves({ verbose: true })
  const capture = legal.find((move: Move) => Boolean(move.captured))
  if (capture) {
    return capture
  }

  const check = legal.find((move: Move) => move.san.includes("+"))
  if (check) {
    return check
  }

  return legal[0]
}

function buildTacticalThemes(
  index: number,
  bucket: TacticalBucket,
  isCapture: boolean,
  isCheck: boolean
) {
  const themes = [bucket, MOTIFS[index % MOTIFS.length]]
  if (isCapture) {
    themes.push("capture")
  }
  if (isCheck) {
    themes.push("check")
  }
  return themes
}

function buildTacticalPuzzle(index: number): Puzzle {
  const line = OPENING_LINES[index % OPENING_LINES.length]
  const chess = new Chess()
  const prepLength = 5 + (index % 3)

  for (let i = 0; i < prepLength; i += 1) {
    chess.move(line[i % line.length])
  }

  const puzzleMove = pickTrainingMove(chess)
  const bucket = getTacticalBucket(index)

  return {
    id: `tactic_${index + 1}`,
    fen: chess.fen(),
    moves: [moveToUci(puzzleMove)],
    themes: buildTacticalThemes(
      index,
      bucket,
      Boolean(puzzleMove.captured),
      puzzleMove.san.includes("+")
    ),
    rating: TACTICAL_RATINGS[index],
    kind: "tactic",
    explanation:
      bucket === "beginner"
        ? "Focus on immediate tactical gains and safe forcing moves."
        : bucket === "intermediate"
          ? "Look for coordination between your pieces before committing."
          : "Calculate forcing lines deeply and compare candidate continuations.",
  }
}

function buildMatePuzzle(recipe: MateRecipe): Puzzle {
  const chess = new Chess()
  for (const san of recipe.movesBefore) {
    const setupMove = chess.move(san)
    if (!setupMove) {
      throw new Error(`Invalid mate setup move in ${recipe.id}: ${san}`)
    }
  }

  const fen = chess.fen()
  const moves: string[] = []

  for (const san of recipe.solutionSan) {
    let move: Move
    try {
      move = chess.move(san)
    } catch {
      throw new Error(`Invalid mate solution in ${recipe.id}: ${san}`)
    }
    if (!move) {
      throw new Error(`Invalid mate recipe: ${recipe.id}`)
    }
    moves.push(moveToUci(move))
  }

  return {
    id: recipe.id,
    fen,
    moves,
    rating: recipe.rating,
    themes: ["forced-checkmate", ...recipe.themes],
    kind: "forced-mate",
    explanation: recipe.explanation,
  }
}

const TACTICAL_PUZZLES = Array.from({ length: 50 }, (_, index) =>
  buildTacticalPuzzle(index)
)

const FORCED_MATE_PUZZLES = MATE_RECIPES.map((recipe) =>
  buildMatePuzzle(recipe)
)

export const PUZZLES: Puzzle[] = [...TACTICAL_PUZZLES, ...FORCED_MATE_PUZZLES]

export const FORCED_MATE_PUZZLE_IDS = new Set(
  FORCED_MATE_PUZZLES.map((puzzle) => puzzle.id)
)

export function getDailyPuzzle() {
  const dayNumber = Math.floor(Date.now() / 86_400_000)
  return TACTICAL_PUZZLES[dayNumber % TACTICAL_PUZZLES.length]
}
