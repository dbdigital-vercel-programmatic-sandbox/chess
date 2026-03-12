"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type BoardTheme = "classic" | "wood" | "blue" | "dark"
export type PieceStyle = "classic" | "minimal" | "modern"
export type TimerMode = "none" | "30s" | "60s"
export type BackgroundMode = "light" | "dark" | "club"

type SettingsState = {
  boardTheme: BoardTheme
  pieceStyle: PieceStyle
  orientation: "white" | "black"
  soundEnabled: boolean
  timerMode: TimerMode
  backgroundMode: BackgroundMode
  highContrast: boolean
  reducedMotion: boolean
  showCoordinates: boolean
  animatedHints: boolean
  setBoardTheme: (value: BoardTheme) => void
  setPieceStyle: (value: PieceStyle) => void
  setOrientation: (value: "white" | "black") => void
  setSoundEnabled: (value: boolean) => void
  setTimerMode: (value: TimerMode) => void
  setBackgroundMode: (value: BackgroundMode) => void
  setHighContrast: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
  setShowCoordinates: (value: boolean) => void
  setAnimatedHints: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set: (partial: Partial<SettingsState>) => void) => ({
      boardTheme: "classic",
      pieceStyle: "classic",
      orientation: "white",
      soundEnabled: true,
      timerMode: "none",
      backgroundMode: "club",
      highContrast: false,
      reducedMotion: false,
      showCoordinates: false,
      animatedHints: true,
      setBoardTheme: (boardTheme: BoardTheme) => set({ boardTheme }),
      setPieceStyle: (pieceStyle: PieceStyle) => set({ pieceStyle }),
      setOrientation: (orientation: "white" | "black") => set({ orientation }),
      setSoundEnabled: (soundEnabled: boolean) => set({ soundEnabled }),
      setTimerMode: (timerMode: TimerMode) => set({ timerMode }),
      setBackgroundMode: (backgroundMode: BackgroundMode) =>
        set({ backgroundMode }),
      setHighContrast: (highContrast: boolean) => set({ highContrast }),
      setReducedMotion: (reducedMotion: boolean) => set({ reducedMotion }),
      setShowCoordinates: (showCoordinates: boolean) =>
        set({ showCoordinates }),
      setAnimatedHints: (animatedHints: boolean) => set({ animatedHints }),
    }),
    {
      name: "chess-puzzle-settings-v1",
      partialize: (state: SettingsState) => ({
        boardTheme: state.boardTheme,
        pieceStyle: state.pieceStyle,
        orientation: state.orientation,
        soundEnabled: state.soundEnabled,
        timerMode: state.timerMode,
        backgroundMode: state.backgroundMode,
        highContrast: state.highContrast,
        reducedMotion: state.reducedMotion,
        showCoordinates: state.showCoordinates,
        animatedHints: state.animatedHints,
      }),
    }
  )
)
