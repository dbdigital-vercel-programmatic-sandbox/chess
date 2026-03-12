import { Chess, type Move } from "chess.js"

export type Puzzle = {
  id: string
  fen: string
  moves: string[]
  themes: string[]
  rating: number
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

function moveToUci(move: { from: string; to: string; promotion?: string }) {
  return `${move.from}${move.to}${move.promotion ?? ""}`
}

function buildThemes(isCapture: boolean, isCheck: boolean, lineIndex: number) {
  const motifs = [
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

  const tags = [motifs[lineIndex % motifs.length]]
  if (isCapture) {
    tags.push("capture")
  }
  if (isCheck) {
    tags.push("check")
  }
  return tags
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

function buildPuzzle(index: number): Puzzle {
  const line = OPENING_LINES[index % OPENING_LINES.length]
  const chess = new Chess()
  const prepLength = 5 + (index % 3)

  for (let i = 0; i < prepLength; i += 1) {
    const sanMove = line[i % line.length]
    chess.move(sanMove)
  }

  const puzzleMove = pickTrainingMove(chess)
  const rating = Math.min(1800, 400 + index * 24)
  const themes = buildThemes(
    Boolean(puzzleMove.captured),
    puzzleMove.san.includes("+"),
    index
  )

  return {
    id: `puzzle_${index + 1}`,
    fen: chess.fen(),
    moves: [moveToUci(puzzleMove)],
    themes,
    rating,
  }
}

export const PUZZLES: Puzzle[] = Array.from({ length: 60 }, (_, index) =>
  buildPuzzle(index)
)

export function getDailyPuzzle() {
  const dayNumber = Math.floor(Date.now() / 86_400_000)
  return PUZZLES[dayNumber % PUZZLES.length]
}
