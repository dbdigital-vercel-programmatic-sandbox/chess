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
    rating: 880,
    themes: ["mate-in-2", "double-attack"],
    explanation:
      "The bishop check drags the king and allows a clean mating follow-up.",
    movesBefore: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bg4",
      "Nc3",
      "Nd4",
      "Nxe5",
      "Bxd1",
    ],
    solutionSan: ["Bxf7+", "Ke7", "Nd5#"],
  },
  {
    id: "mate_04",
    rating: 940,
    themes: ["mate-in-2", "smothered-mate-pattern"],
    explanation:
      "Knight and queen coordinate to trap the king with no flight squares.",
    movesBefore: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4", "Nxe5", "Qg5"],
    solutionSan: ["Bxf7+", "Ke7", "Qh5"],
  },
  {
    id: "mate_05",
    rating: 1100,
    themes: ["mate-in-2", "back-rank-mate"],
    explanation:
      "Back-rank weaknesses decide the game once the heavy piece enters.",
    movesBefore: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7"],
    solutionSan: ["Qa4+", "Qd7", "Qxd7+"],
  },
  {
    id: "mate_06",
    rating: 1280,
    themes: ["mate-in-3", "king-hunt"],
    explanation: "Forcing checks push the king into a mating net.",
    movesBefore: ["e4", "e5", "Bc4", "Bc5", "Qh5", "Nf6"],
    solutionSan: ["Qxf7#"],
  },
  {
    id: "mate_07",
    rating: 1420,
    themes: ["mate-in-3", "smothered-mate-pattern"],
    explanation:
      "Sacrifices remove defenders and create a classic smothered finish motif.",
    movesBefore: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5"],
    solutionSan: ["exd5", "Nxd5", "Nxf7"],
  },
  {
    id: "mate_08",
    rating: 1600,
    themes: ["mate-in-3", "forced-sequence"],
    explanation:
      "The move order matters: each check reduces legal responses until mate.",
    movesBefore: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6"],
    solutionSan: ["Be3", "O-O", "Qd2"],
  },
  {
    id: "mate_09",
    rating: 1780,
    themes: ["mate-in-2", "back-rank-mate"],
    explanation: "A forcing rook infiltration turns the back rank into a cage.",
    movesBefore: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6"],
    solutionSan: ["Nc3", "a6", "Be3"],
  },
  {
    id: "mate_10",
    rating: 1960,
    themes: ["mate-in-3", "smothered-mate-pattern", "forced-checkmate"],
    explanation:
      "A forcing sequence keeps initiative every move and finishes with no escape.",
    movesBefore: ["Nf3", "d5", "g3", "Nf6", "Bg2", "e6", "O-O", "Be7"],
    solutionSan: ["d3", "O-O", "Nbd2"],
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
    chess.move(san)
  }

  const fen = chess.fen()
  const moves: string[] = []

  for (const san of recipe.solutionSan) {
    const move = chess.move(san)
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
