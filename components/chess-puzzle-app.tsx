"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Chess, type Move, type Square } from "chess.js"
import { Chessboard } from "react-chessboard"
import type { ChessboardOptions, PieceRenderObject } from "react-chessboard"
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Flame,
  Lightbulb,
  Moon,
  RefreshCcw,
  Settings,
  Sparkles,
  Sun,
  Target,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  type BackgroundMode,
  type BoardTheme,
  type PieceStyle,
  type TimerMode,
  useSettingsStore,
} from "@/lib/chess-store"
import { playSound } from "@/lib/chess-sfx"
import { PUZZLES, getDailyPuzzle, type Puzzle } from "@/lib/puzzle-data"

type Screen = "home" | "puzzle" | "result"
type PlayMode = "standard" | "rush" | "daily"
type SettingsTab = "board" | "pieces" | "sounds" | "hints" | "accessibility"

const RUSH_TIME = 180

const BOARD_THEME_COLORS: Record<
  BoardTheme,
  { light: string; dark: string; border: string }
> = {
  classic: { light: "#f0d9b5", dark: "#769656", border: "#4f6633" },
  wood: { light: "#e8d0ad", dark: "#a1774d", border: "#6d4c35" },
  blue: { light: "#dce6f6", dark: "#4f6f96", border: "#314c6e" },
  dark: { light: "#b9c0c9", dark: "#3f4753", border: "#1f252f" },
}

const PIECE_SYMBOLS: Record<string, string> = {
  wK: "\u2654",
  wQ: "\u2655",
  wR: "\u2656",
  wB: "\u2657",
  wN: "\u2658",
  wP: "\u2659",
  bK: "\u265A",
  bQ: "\u265B",
  bR: "\u265C",
  bB: "\u265D",
  bN: "\u265E",
  bP: "\u265F",
}

const HOME_MODES: Array<{
  id: "standard" | "rush" | "daily" | "settings"
  title: string
  description: string
  icon: LucideIcon
  ribbon: string
  gradient: string
}> = [
  {
    id: "standard",
    title: "Start Puzzle",
    description: "Classic tactical run with progressive hints.",
    icon: Target,
    ribbon: "Core",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
  },
  {
    id: "rush",
    title: "Puzzle Rush",
    description: "Beat the clock and stack your streak.",
    icon: Flame,
    ribbon: "Timed",
    gradient: "from-amber-400/20 via-orange-400/10 to-transparent",
  },
  {
    id: "daily",
    title: "Daily Puzzle",
    description: "One curated challenge refreshed every day.",
    icon: Crown,
    ribbon: "Daily",
    gradient: "from-cyan-400/20 via-sky-400/10 to-transparent",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Tune board, sounds, hints, and accessibility.",
    icon: Settings,
    ribbon: "Custom",
    gradient: "from-stone-300/18 via-amber-200/12 to-transparent",
  },
]

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "board", label: "Board" },
  { id: "pieces", label: "Pieces" },
  { id: "sounds", label: "Sounds" },
  { id: "hints", label: "Hints" },
  { id: "accessibility", label: "Accessibility" },
]

function parseUci(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: (uci.slice(4, 5) || undefined) as
      | "q"
      | "r"
      | "b"
      | "n"
      | undefined,
  }
}

function toUci(move: Move) {
  return `${move.from}${move.to}${move.promotion ?? ""}`
}

function formatTime(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function getRandomPuzzleIndex() {
  return Math.floor(Math.random() * PUZZLES.length)
}

function getCheckSquare(chess: Chess) {
  if (!chess.inCheck()) {
    return null
  }

  const currentTurn = chess.turn()
  const board = chess.board()
  for (let rank = 0; rank < board.length; rank += 1) {
    for (let file = 0; file < board[rank].length; file += 1) {
      const piece = board[rank][file]
      if (piece && piece.type === "k" && piece.color === currentTurn) {
        return `${"abcdefgh"[file]}${8 - rank}` as Square
      }
    }
  }

  return null
}

function buildCustomPieces(style: PieceStyle): PieceRenderObject | undefined {
  if (style === "classic") {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(PIECE_SYMBOLS).map(([pieceCode, glyph]) => [
      pieceCode,
      (props?: {
        fill?: string
        square?: string
        svgStyle?: React.CSSProperties
      }) => {
        const fill =
          props?.fill ?? (pieceCode.startsWith("w") ? "#f8fafc" : "#0f172a")
        const svgStyle = props?.svgStyle

        return (
          <svg viewBox="0 0 45 45" style={svgStyle}>
            {style === "modern" && (
              <circle
                cx="22.5"
                cy="22.5"
                r="20"
                fill={pieceCode.startsWith("w") ? "#dbeafe" : "#1f2937"}
                opacity="0.55"
              />
            )}
            <text
              x="22.5"
              y="29"
              textAnchor="middle"
              fontSize={style === "modern" ? "28" : "23"}
              fontFamily={
                style === "modern" ? "Georgia, serif" : "system-ui, sans-serif"
              }
              fontWeight={style === "modern" ? "700" : "600"}
              fill={fill}
            >
              {style === "minimal" ? pieceCode[1] : glyph}
            </text>
          </svg>
        )
      },
    ])
  )
}

export function ChessPuzzleApp() {
  const isMobile = useIsMobile()
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  const {
    boardTheme,
    pieceStyle,
    orientation,
    soundEnabled,
    backgroundMode,
    timerMode,
    highContrast,
    reducedMotion,
    showCoordinates,
    setBoardTheme,
    setPieceStyle,
    setOrientation,
    setSoundEnabled,
    setBackgroundMode,
    setTimerMode,
    setHighContrast,
    setReducedMotion,
    setShowCoordinates,
  } = useSettingsStore()

  const { resolvedTheme, setTheme } = useTheme()

  const [screen, setScreen] = useState<Screen>("home")
  const [mode, setMode] = useState<PlayMode>("standard")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("board")

  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(PUZZLES[0])
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [fen, setFen] = useState(currentPuzzle.fen)
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null
  )
  const [checkSquare, setCheckSquare] = useState<Square | null>(null)
  const [moveIndex, setMoveIndex] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalTargets, setLegalTargets] = useState<Square[]>([])
  const [hintLevel, setHintLevel] = useState(0)
  const [shake, setShake] = useState(false)
  const [locked, setLocked] = useState(false)
  const [score, setScore] = useState(0)
  const [puzzleScore, setPuzzleScore] = useState(100)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [liveElapsed, setLiveElapsed] = useState(0)

  const puzzleStartedAt = useRef(0)
  const totalPausedMs = useRef(0)
  const pauseStartAt = useRef<number | null>(null)

  const expectedMove = currentPuzzle.moves[moveIndex]
  const expectedParsed = expectedMove ? parseUci(expectedMove) : null
  const boardColors = BOARD_THEME_COLORS[boardTheme as BoardTheme]
  const customPieces = useMemo(
    () => buildCustomPieces(pieceStyle),
    [pieceStyle]
  )
  const boardSize = useBoardSize(boardRef, isMobile)

  const effectiveOrientation = orientation
  const timerActive = mode === "rush" || timerMode !== "none"
  const interactionsLocked = locked || settingsOpen

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!settingsOpen) {
      if (pauseStartAt.current !== null) {
        totalPausedMs.current += Date.now() - pauseStartAt.current
        pauseStartAt.current = null
      }
      return
    }

    if (screen === "puzzle" && pauseStartAt.current === null) {
      pauseStartAt.current = Date.now()
    }
  }, [screen, settingsOpen])

  useEffect(() => {
    if (!settingsOpen) {
      return
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false)
      }
    }

    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [settingsOpen])

  const initializePuzzle = useCallback(
    (nextPuzzle: Puzzle, nextMode: PlayMode) => {
      const game = new Chess(nextPuzzle.fen)
      setCurrentPuzzle(nextPuzzle)
      setFen(nextPuzzle.fen)
      setMoveIndex(0)
      setHintLevel(0)
      setSelectedSquare(null)
      setLegalTargets([])
      setLastMove(null)
      setCheckSquare(getCheckSquare(game))
      setShake(false)
      setLocked(false)
      setPuzzleScore(100)

      puzzleStartedAt.current = Date.now()
      totalPausedMs.current = 0
      pauseStartAt.current = null
      setElapsed(0)
      setLiveElapsed(0)

      if (nextMode === "rush") {
        setTimeLeft((value) => value ?? RUSH_TIME)
      } else if (timerMode === "30s") {
        setTimeLeft(30)
      } else if (timerMode === "60s") {
        setTimeLeft(60)
      } else {
        setTimeLeft(null)
      }

      setScreen("puzzle")
    },
    [timerMode]
  )

  const finishPuzzle = useCallback(
    (success: boolean) => {
      const pausedNow = pauseStartAt.current
        ? Date.now() - pauseStartAt.current
        : 0
      const spent = Math.floor(
        (Date.now() -
          puzzleStartedAt.current -
          totalPausedMs.current -
          pausedNow) /
          1000
      )
      setElapsed(Math.max(0, spent))

      if (mode === "rush") {
        if (success) {
          playSound("success", soundEnabled)
          setScore((value) => value + 1)
          const idx = getRandomPuzzleIndex()
          setPuzzleIndex(idx)
          window.setTimeout(() => initializePuzzle(PUZZLES[idx], "rush"), 600)
        } else {
          setScreen("result")
        }
        return
      }

      playSound(success ? "success" : "wrong", soundEnabled)
      setScreen("result")
    },
    [initializePuzzle, mode, soundEnabled]
  )

  useEffect(() => {
    if (screen !== "puzzle" || settingsOpen) {
      return
    }

    const id = window.setInterval(() => {
      const pausedNow = pauseStartAt.current
        ? Date.now() - pauseStartAt.current
        : 0
      const spent = Math.floor(
        (Date.now() -
          puzzleStartedAt.current -
          totalPausedMs.current -
          pausedNow) /
          1000
      )
      setLiveElapsed(Math.max(0, spent))

      if (!timerActive || timeLeft === null) {
        return
      }

      setTimeLeft((prev) => {
        if (prev === null) {
          return prev
        }
        if (prev <= 1) {
          window.clearInterval(id)
          finishPuzzle(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [finishPuzzle, screen, settingsOpen, timeLeft, timerActive])

  function startMode(nextMode: PlayMode) {
    setMode(nextMode)
    if (nextMode === "rush") {
      setScore(0)
      const idx = getRandomPuzzleIndex()
      setPuzzleIndex(idx)
      setTimeLeft(RUSH_TIME)
      initializePuzzle(PUZZLES[idx], nextMode)
      return
    }

    if (nextMode === "daily") {
      initializePuzzle(getDailyPuzzle(), nextMode)
      return
    }

    const idx = (puzzleIndex + 1) % PUZZLES.length
    setPuzzleIndex(idx)
    initializePuzzle(PUZZLES[idx], nextMode)
  }

  function handleHomeTileClick(modeId: (typeof HOME_MODES)[number]["id"]) {
    if (modeId === "settings") {
      setSettingsOpen(true)
      return
    }
    startMode(modeId)
  }

  function resetPuzzle() {
    initializePuzzle(currentPuzzle, mode)
  }

  function nextPuzzle() {
    const idx = (puzzleIndex + 1) % PUZZLES.length
    setPuzzleIndex(idx)
    setMode("standard")
    initializePuzzle(PUZZLES[idx], "standard")
  }

  function applyHint() {
    setHintLevel((value) => Math.min(value + 1, 3))
    setPuzzleScore((value) => Math.max(0, value - 15))
    playSound("hint", soundEnabled)
  }

  function setSelection(square: Square | null) {
    setSelectedSquare(square)
    if (!square) {
      setLegalTargets([])
      return
    }

    const game = new Chess(fen)
    const options = game
      .moves({ square, verbose: true })
      .map((move: Move) => move.to as Square)
    setLegalTargets(options)
  }

  function handleWrongMove() {
    playSound("wrong", soundEnabled)
    setShake(true)
    window.setTimeout(() => setShake(false), 320)
    setHintLevel(0)
    setPuzzleScore((value) => Math.max(0, value - 10))
    if (mode === "rush") {
      setTimeLeft((value) => (value === null ? null : Math.max(0, value - 5)))
    }
  }

  function runAutoReply(nextFen: string, nextMoveIndex: number) {
    if (nextMoveIndex >= currentPuzzle.moves.length) {
      finishPuzzle(true)
      return
    }

    const autoMove = currentPuzzle.moves[nextMoveIndex]
    if (!autoMove) {
      finishPuzzle(true)
      return
    }

    setLocked(true)
    window.setTimeout(() => {
      const game = new Chess(nextFen)
      const applied = game.move(parseUci(autoMove))
      if (!applied) {
        setLocked(false)
        finishPuzzle(false)
        return
      }

      playSound(applied.flags.includes("c") ? "capture" : "move", soundEnabled)
      setFen(game.fen())
      setLastMove({ from: applied.from as Square, to: applied.to as Square })
      setCheckSquare(getCheckSquare(game))
      setMoveIndex(nextMoveIndex + 1)
      setLocked(false)

      if (nextMoveIndex + 1 >= currentPuzzle.moves.length) {
        finishPuzzle(true)
      }
    }, 340)
  }

  function tryMove(from: Square, to: Square) {
    if (interactionsLocked || screen !== "puzzle") {
      return false
    }

    const game = new Chess(fen)
    const promotion =
      expectedParsed && expectedParsed.from === from && expectedParsed.to === to
        ? expectedParsed.promotion
        : "q"
    const move = game.move({ from, to, promotion })
    if (!move) {
      return false
    }

    if (toUci(move) !== expectedMove) {
      handleWrongMove()
      return false
    }

    if (move.flags.includes("c") || move.flags.includes("e")) {
      playSound("capture", soundEnabled)
    } else if (move.san.includes("+")) {
      playSound("check", soundEnabled)
    } else {
      playSound("move", soundEnabled)
    }

    setFen(game.fen())
    setLastMove({ from: move.from as Square, to: move.to as Square })
    setCheckSquare(getCheckSquare(game))
    setSelectedSquare(null)
    setLegalTargets([])

    const nextIndex = moveIndex + 1
    setMoveIndex(nextIndex)

    if (nextIndex >= currentPuzzle.moves.length) {
      finishPuzzle(true)
      return true
    }

    runAutoReply(game.fen(), nextIndex)
    return true
  }

  function onSquareClick(squareValue: string) {
    if (interactionsLocked) {
      return
    }

    const square = squareValue as Square
    const game = new Chess(fen)

    if (selectedSquare) {
      const moved = tryMove(selectedSquare, square)
      if (moved) {
        return
      }
    }

    const piece = game.get(square)
    if (!piece || piece.color !== game.turn()) {
      setSelection(null)
      return
    }
    setSelection(square)
  }

  const boardHighlights = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    legalTargets.forEach((target) => {
      styles[target] = {
        background:
          "radial-gradient(circle, rgba(34,197,94,0.55) 0%, rgba(34,197,94,0.25) 38%, transparent 40%)",
      }
    })

    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow: "inset 0 0 0 3px rgba(59,130,246,0.95)",
      }
    }

    if (lastMove) {
      styles[lastMove.from] = {
        ...(styles[lastMove.from] ?? {}),
        boxShadow: "inset 0 0 0 3px rgba(250,204,21,0.85)",
      }
      styles[lastMove.to] = {
        ...(styles[lastMove.to] ?? {}),
        boxShadow: "inset 0 0 0 3px rgba(250,204,21,0.85)",
      }
    }

    if (checkSquare) {
      styles[checkSquare] = {
        ...(styles[checkSquare] ?? {}),
        background: "rgba(239,68,68,0.65)",
      }
    }

    if (hintLevel >= 1 && expectedParsed) {
      styles[expectedParsed.from] = {
        ...(styles[expectedParsed.from] ?? {}),
        boxShadow: "inset 0 0 0 3px rgba(16,185,129,0.95)",
      }
    }
    if (hintLevel >= 2 && expectedParsed) {
      styles[expectedParsed.to] = {
        ...(styles[expectedParsed.to] ?? {}),
        boxShadow: "inset 0 0 0 3px rgba(16,185,129,0.95)",
      }
    }

    return styles
  }, [
    checkSquare,
    expectedParsed,
    hintLevel,
    lastMove,
    legalTargets,
    selectedSquare,
  ])

  const hintArrows =
    hintLevel >= 3 && expectedParsed
      ? [
          {
            startSquare: expectedParsed.from,
            endSquare: expectedParsed.to,
            color: "rgba(16,185,129,0.8)",
          },
        ]
      : []

  const boardOptions: ChessboardOptions = {
    id: "puzzle-board",
    position: fen,
    boardOrientation: effectiveOrientation,
    boardStyle: {
      borderRadius: 18,
      boxShadow: highContrast
        ? "0 20px 55px rgba(0,0,0,0.5)"
        : "0 24px 60px rgba(15,23,42,0.28)",
      border: `3px solid ${boardColors.border}`,
      overflow: "hidden",
    },
    darkSquareStyle: { backgroundColor: boardColors.dark },
    lightSquareStyle: { backgroundColor: boardColors.light },
    squareStyles: boardHighlights,
    pieces: customPieces,
    arrows: hintArrows,
    onPieceDrop: ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string
      targetSquare?: string | null
    }) => {
      if (!targetSquare) {
        return false
      }
      return tryMove(sourceSquare as Square, targetSquare as Square)
    },
    onSquareClick: ({ square }: { square: string }) => onSquareClick(square),
    allowDragging: !interactionsLocked,
    animationDurationInMs: reducedMotion ? 0 : 220,
    allowDragOffBoard: false,
    allowDrawingArrows: false,
    showNotation: showCoordinates,
  }

  const previewBoardOptions: ChessboardOptions = {
    id: "settings-preview-board",
    position: "r2q1rk1/pp3ppp/2n1bn2/2bp4/4P3/2NP1N2/PPQ2PPP/R1B2RK1 w - - 0 1",
    boardOrientation: orientation,
    boardStyle: {
      borderRadius: 16,
      border: `2px solid ${boardColors.border}`,
      boxShadow: "0 22px 55px rgba(0,0,0,0.35)",
      overflow: "hidden",
    },
    darkSquareStyle: { backgroundColor: boardColors.dark },
    lightSquareStyle: { backgroundColor: boardColors.light },
    pieces: customPieces,
    allowDragging: false,
    showNotation: showCoordinates,
    animationDurationInMs: reducedMotion ? 0 : 380,
  }

  const isDarkTheme = (mounted ? resolvedTheme : "dark") === "dark"
  const backgroundClass =
    backgroundMode === "light"
      ? "from-[#efe8dc] via-[#f4ede0] to-[#ddd4c2]"
      : backgroundMode === "dark"
        ? "from-[#0d1111] via-[#12181a] to-[#1a1612]"
        : "from-[#1a1f1b] via-[#202523] to-[#2a2218]"

  return (
    <div
      className={`relative min-h-svh overflow-hidden bg-gradient-to-br ${backgroundClass} text-foreground transition-colors duration-300`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(214,167,78,0.22),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(29,127,98,0.24),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(16,16,16,0.26),transparent_45%)]" />

      <GlobalControls
        isMobile={isMobile}
        isDarkTheme={isDarkTheme}
        settingsOpen={settingsOpen}
        soundEnabled={soundEnabled}
        onToggleTheme={() => setTheme(isDarkTheme ? "light" : "dark")}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onToggleSettings={() => setSettingsOpen((value) => !value)}
      />

      <main className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col p-4 pt-20 md:p-8 md:pt-24">
        <AnimatePresence mode="wait">
          {screen === "home" && (
            <motion.section
              key="home"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mx-auto flex w-full flex-1 flex-col justify-center"
            >
              <div className="rounded-[30px] border border-white/12 bg-black/30 p-5 shadow-[0_30px_110px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-4 py-1 text-[11px] tracking-[0.22em] text-emerald-100 uppercase">
                      <Sparkles className="size-3.5" /> Chess Puzzle Trainer
                    </p>
                    <h1 className="mt-4 text-5xl leading-[0.93] font-semibold text-stone-50 sm:text-6xl lg:text-7xl">
                      Train Like a Grandmaster
                    </h1>
                    <p className="mt-5 max-w-xl text-sm leading-relaxed text-stone-200/90 sm:text-base">
                      Sharpen tactical vision through handcrafted sessions,
                      progressive hints, and speed drills. Fast feedback,
                      premium board feel, and real training momentum.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3 text-xs sm:text-sm">
                      <InfoChip icon={WandSparkles} label="60 local puzzles" />
                      <InfoChip icon={Target} label="Rating 400-1800" />
                      <InfoChip icon={Flame} label="Rush ready" />
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button
                        size="lg"
                        onClick={() => startMode("standard")}
                        className="h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-300 px-7 text-sm font-semibold text-stone-950 shadow-[0_12px_45px_rgba(99,210,166,0.35)]"
                      >
                        Start Training
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => startMode("rush")}
                        className="h-12 rounded-2xl border-white/25 bg-white/10 px-7 text-sm text-stone-100 backdrop-blur-sm hover:bg-white/20"
                      >
                        Puzzle Rush
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/14 to-white/5 p-4 shadow-2xl backdrop-blur-lg">
                    <div className="mx-auto w-full max-w-[420px]">
                      <Chessboard options={previewBoardOptions} />
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-stone-100">
                      <p className="font-medium">Find the tactical shot</p>
                      <p className="mt-1 text-xs text-stone-300">
                        Live preview reflects settings instantly
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 w-full rounded-[28px] border border-white/10 bg-black/24 p-4 backdrop-blur-lg md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm tracking-[0.16em] text-stone-200/80 uppercase">
                    Game modes
                  </p>
                  <p className="text-xs text-stone-300">Tap a tile to begin</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {HOME_MODES.map((modeItem) => (
                    <GameModeTile
                      key={modeItem.id}
                      title={modeItem.title}
                      description={modeItem.description}
                      ribbon={modeItem.ribbon}
                      icon={modeItem.icon}
                      gradient={modeItem.gradient}
                      onClick={() => handleHomeTileClick(modeItem.id)}
                    />
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {screen === "puzzle" && (
            <motion.section
              key="puzzle"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]"
            >
              <div className={`${shake ? "board-shake" : ""}`} ref={boardRef}>
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/20 bg-black/35 px-4 py-2 text-sm text-white shadow-xl backdrop-blur">
                  <div className="font-medium">
                    {mode === "rush"
                      ? "Puzzle Rush"
                      : `Puzzle ${puzzleIndex + 1}`}
                  </div>
                  <div className="font-mono text-base tracking-wide">
                    {timerActive && timeLeft !== null
                      ? formatTime(timeLeft)
                      : formatTime(liveElapsed)}
                  </div>
                </div>
                <div style={{ width: boardSize }}>
                  <Chessboard options={boardOptions} />
                </div>
              </div>

              <aside className="rounded-3xl border border-white/20 bg-white/75 p-5 shadow-2xl backdrop-blur dark:bg-slate-900/65">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-3xl font-semibold">Puzzle Brief</h2>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setScreen("home")}
                  >
                    <X />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Rating" value={String(currentPuzzle.rating)} />
                  <Stat label="Theme" value={currentPuzzle.themes.join(", ")} />
                  <Stat
                    label="Moves"
                    value={`${moveIndex}/${currentPuzzle.moves.length}`}
                  />
                  <Stat label="Puzzle score" value={String(puzzleScore)} />
                </div>

                <div className="mt-5 grid gap-2">
                  <Button
                    variant="outline"
                    onClick={applyHint}
                    className="justify-start"
                  >
                    <Lightbulb /> Hint {hintLevel}/3
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetPuzzle}
                    className="justify-start"
                  >
                    <RefreshCcw /> Reset puzzle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={nextPuzzle}
                    className="justify-start"
                  >
                    <ArrowRight /> Next puzzle
                  </Button>
                </div>

                <div className="mt-6 rounded-2xl bg-black/5 p-3 text-xs leading-relaxed dark:bg-white/10">
                  <p className="font-semibold">Hint levels</p>
                  <p>
                    1: piece highlight. 2: destination highlight. 3: directional
                    arrow. Each hint lowers puzzle score.
                  </p>
                </div>
              </aside>
            </motion.section>
          )}

          {screen === "result" && (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center"
            >
              <div className="relative w-full overflow-hidden rounded-3xl border border-emerald-300/30 bg-white/85 p-8 text-center shadow-2xl backdrop-blur dark:bg-slate-900/65">
                <h2 className="text-5xl font-semibold">
                  {mode === "rush" && timeLeft === 0 ? "Time Up" : "Solved"}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {mode === "rush"
                    ? `Final score: ${score}`
                    : `Time: ${formatTime(elapsed)} | Puzzle score: ${puzzleScore}`}
                </p>

                <div className="mt-4 rounded-2xl bg-black/5 p-3 text-left text-sm dark:bg-white/10">
                  <p className="mb-1 font-semibold">Solution moves</p>
                  <p className="font-mono break-words">
                    {currentPuzzle.moves.join(" ")}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button onClick={nextPuzzle}>Next Puzzle</Button>
                  <Button variant="outline" onClick={resetPuzzle}>
                    Retry Puzzle
                  </Button>
                  <Button variant="ghost" onClick={() => setScreen("home")}>
                    Home
                  </Button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          >
            <motion.section
              initial={
                isMobile ? { y: "100%" } : { opacity: 0, y: 16, scale: 0.97 }
              }
              animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={
                isMobile ? { y: "100%" } : { opacity: 0, y: 10, scale: 0.98 }
              }
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(event: React.MouseEvent) => event.stopPropagation()}
              className={
                isMobile
                  ? "absolute inset-0 overflow-y-auto bg-gradient-to-b from-white to-stone-100 p-4 dark:from-slate-950 dark:to-slate-900"
                  : "absolute top-1/2 left-1/2 grid w-[min(100%-2rem,980px)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-3xl border border-white/20 bg-white/90 p-5 shadow-2xl backdrop-blur-xl md:grid-cols-[220px_minmax(0,1fr)] md:p-6 dark:bg-slate-900/80"
              }
            >
              <div className={isMobile ? "mb-4" : "md:col-span-2 md:mb-1"}>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSettingsOpen(false)}
                  >
                    <ArrowLeft />
                  </Button>
                  <h2 className="text-2xl font-semibold md:text-3xl">
                    Settings
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Changes are applied instantly.
                </p>
              </div>

              {isMobile ? (
                <div className="flex flex-col gap-4">
                  <SettingsContent
                    tab={settingsTab}
                    setTab={setSettingsTab}
                    boardTheme={boardTheme}
                    pieceStyle={pieceStyle}
                    orientation={orientation}
                    timerMode={timerMode}
                    backgroundMode={backgroundMode}
                    soundEnabled={soundEnabled}
                    highContrast={highContrast}
                    reducedMotion={reducedMotion}
                    showCoordinates={showCoordinates}
                    setBoardTheme={setBoardTheme}
                    setPieceStyle={setPieceStyle}
                    setOrientation={setOrientation}
                    setTimerMode={setTimerMode}
                    setBackgroundMode={setBackgroundMode}
                    setSoundEnabled={setSoundEnabled}
                    setHighContrast={setHighContrast}
                    setReducedMotion={setReducedMotion}
                    setShowCoordinates={setShowCoordinates}
                    onPlaySound={(name) => playSound(name, soundEnabled)}
                    previewOptions={previewBoardOptions}
                  />
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/15 dark:bg-white/5">
                    <p className="mb-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
                      Categories
                    </p>
                    <div className="grid gap-2">
                      {SETTINGS_TABS.map((tab) => (
                        <Button
                          key={tab.id}
                          variant={settingsTab === tab.id ? "default" : "ghost"}
                          className="justify-start"
                          onClick={() => setSettingsTab(tab.id)}
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_330px]">
                    <SettingsPanel
                      tab={settingsTab}
                      boardTheme={boardTheme}
                      pieceStyle={pieceStyle}
                      orientation={orientation}
                      timerMode={timerMode}
                      backgroundMode={backgroundMode}
                      soundEnabled={soundEnabled}
                      highContrast={highContrast}
                      reducedMotion={reducedMotion}
                      showCoordinates={showCoordinates}
                      setBoardTheme={setBoardTheme}
                      setPieceStyle={setPieceStyle}
                      setOrientation={setOrientation}
                      setTimerMode={setTimerMode}
                      setBackgroundMode={setBackgroundMode}
                      setSoundEnabled={setSoundEnabled}
                      setHighContrast={setHighContrast}
                      setReducedMotion={setReducedMotion}
                      setShowCoordinates={setShowCoordinates}
                      onPlaySound={(name) => playSound(name, soundEnabled)}
                    />
                    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/5">
                      <p className="mb-3 text-xs tracking-[0.16em] text-muted-foreground uppercase">
                        Live preview
                      </p>
                      <Chessboard options={previewBoardOptions} />
                    </div>
                  </div>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GlobalControls({
  isMobile,
  isDarkTheme,
  settingsOpen,
  soundEnabled,
  onToggleTheme,
  onToggleSound,
  onToggleSettings,
}: {
  isMobile: boolean
  isDarkTheme: boolean
  settingsOpen: boolean
  soundEnabled: boolean
  onToggleTheme: () => void
  onToggleSound: () => void
  onToggleSettings: () => void
}) {
  return (
    <div className="fixed top-3 right-3 z-50 md:top-5 md:right-5">
      <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 p-1.5 shadow-xl backdrop-blur-xl">
        <Button
          size={isMobile ? "icon-sm" : "icon"}
          variant="ghost"
          className="rounded-full text-stone-100 hover:bg-white/15"
          onClick={onToggleTheme}
        >
          {isDarkTheme ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
        <Button
          size={isMobile ? "icon-sm" : "icon"}
          variant="ghost"
          className="rounded-full text-stone-100 hover:bg-white/15"
          onClick={onToggleSound}
        >
          {soundEnabled ? (
            <Volume2 className="size-4" />
          ) : (
            <VolumeX className="size-4" />
          )}
        </Button>
        <Button
          size={isMobile ? "icon-sm" : "icon"}
          variant="ghost"
          className="rounded-full text-stone-100 hover:bg-white/15"
          data-state={settingsOpen ? "open" : "closed"}
          onClick={onToggleSettings}
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function SettingsContent(
  props: SettingsPanelProps & {
    setTab: (value: SettingsTab) => void
    previewOptions: ChessboardOptions
  }
) {
  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SETTINGS_TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={props.tab === tab.id ? "default" : "outline"}
            onClick={() => props.setTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <SettingsPanel {...props} />
      <div className="rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/20 dark:bg-white/5">
        <p className="mb-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Live preview
        </p>
        <Chessboard options={props.previewOptions} />
      </div>
    </>
  )
}

type SettingsPanelProps = {
  tab: SettingsTab
  boardTheme: BoardTheme
  pieceStyle: PieceStyle
  orientation: "white" | "black"
  timerMode: TimerMode
  backgroundMode: BackgroundMode
  soundEnabled: boolean
  highContrast: boolean
  reducedMotion: boolean
  showCoordinates: boolean
  setBoardTheme: (value: BoardTheme) => void
  setPieceStyle: (value: PieceStyle) => void
  setOrientation: (value: "white" | "black") => void
  setTimerMode: (value: TimerMode) => void
  setBackgroundMode: (value: BackgroundMode) => void
  setSoundEnabled: (value: boolean) => void
  setHighContrast: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
  setShowCoordinates: (value: boolean) => void
  onPlaySound: (
    name: "move" | "capture" | "check" | "success" | "wrong" | "hint"
  ) => void
}

function SettingsPanel({
  tab,
  boardTheme,
  pieceStyle,
  orientation,
  timerMode,
  backgroundMode,
  soundEnabled,
  highContrast,
  reducedMotion,
  showCoordinates,
  setBoardTheme,
  setPieceStyle,
  setOrientation,
  setTimerMode,
  setBackgroundMode,
  setSoundEnabled,
  setHighContrast,
  setReducedMotion,
  setShowCoordinates,
  onPlaySound,
}: SettingsPanelProps) {
  if (tab === "board") {
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/5">
        <OptionGroup<BoardTheme>
          label="Board Theme"
          value={boardTheme}
          options={["classic", "wood", "blue", "dark"]}
          onSelect={setBoardTheme}
        />
        <OptionGroup<"white" | "black">
          label="Orientation"
          value={orientation}
          options={["white", "black"]}
          onSelect={setOrientation}
        />
        <OptionGroup<BackgroundMode>
          label="Background"
          value={backgroundMode}
          options={["light", "dark", "club"]}
          onSelect={setBackgroundMode}
        />
        <OptionGroup<TimerMode>
          label="Timer mode"
          value={timerMode}
          options={["none", "30s", "60s"]}
          onSelect={setTimerMode}
        />
      </div>
    )
  }

  if (tab === "pieces") {
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/5">
        <OptionGroup<PieceStyle>
          label="Piece style"
          value={pieceStyle}
          options={["classic", "minimal", "modern"]}
          onSelect={setPieceStyle}
        />
        <OptionToggle
          label="Show coordinates"
          value={showCoordinates}
          onChange={setShowCoordinates}
        />
      </div>
    )
  }

  if (tab === "sounds") {
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/5">
        <OptionToggle
          label="Enable sounds"
          value={soundEnabled}
          onChange={setSoundEnabled}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPlaySound("move")}
          >
            Move
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPlaySound("capture")}
          >
            Capture
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPlaySound("check")}
          >
            Check
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPlaySound("hint")}
          >
            Hint
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPlaySound("success")}
          >
            Success
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPlaySound("wrong")}
          >
            Fail
          </Button>
        </div>
      </div>
    )
  }

  if (tab === "hints") {
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/5">
        <p className="text-sm text-muted-foreground">
          Hints are progressive: piece, destination, and arrow. Each hint
          reduces puzzle score.
        </p>
        <div className="rounded-xl bg-black/5 p-3 text-sm dark:bg-white/10">
          <p>
            Wrong move penalty: <strong>-10 score</strong>
          </p>
          <p>
            Rush mode penalty: <strong>-5 seconds</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/5">
      <OptionToggle
        label="High contrast board frame"
        value={highContrast}
        onChange={setHighContrast}
      />
      <OptionToggle
        label="Reduced motion"
        value={reducedMotion}
        onChange={setReducedMotion}
      />
      <OptionToggle
        label="Show coordinates"
        value={showCoordinates}
        onChange={setShowCoordinates}
      />
    </div>
  )
}

function OptionToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-sm dark:border-white/15">
      <span>{label}</span>
      <Button
        size="sm"
        variant={value ? "default" : "outline"}
        onClick={() => onChange(!value)}
      >
        {value ? "On" : "Off"}
      </Button>
    </div>
  )
}

function GameModeTile({
  title,
  description,
  ribbon,
  gradient,
  onClick,
  icon: Icon,
}: {
  title: string
  description: string
  ribbon: string
  gradient: string
  onClick: () => void
  icon: LucideIcon
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-black/45 to-black/20 p-5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.24)]"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-85 transition duration-300 group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[11px] font-semibold tracking-wide text-stone-100 uppercase">
          <Icon className="size-3.5" />
          <span>{ribbon}</span>
        </div>
        <ArrowRight className="size-4 text-stone-300 transition group-hover:translate-x-1 group-hover:text-stone-100" />
      </div>
      <p className="relative mt-6 text-2xl font-semibold text-stone-50">
        {title}
      </p>
      <p className="relative mt-2 text-sm leading-relaxed text-stone-200/85">
        {description}
      </p>
    </motion.button>
  )
}

function OptionGroup<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: T
  options: T[]
  onSelect: (value: T) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={value === option ? "default" : "outline"}
            onClick={() => onSelect(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}

function InfoChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-stone-100 backdrop-blur-sm">
      <Icon className="size-3.5" />
      <span>{label}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/20 dark:bg-slate-900/60">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  )
}

function useBoardSize(
  ref: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean
) {
  const [size, setSize] = useState(600)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const update = () => {
      const width = element.getBoundingClientRect().width
      setSize(Math.max(280, Math.min(width, isMobile ? 420 : 640)))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref, isMobile])

  return size
}
