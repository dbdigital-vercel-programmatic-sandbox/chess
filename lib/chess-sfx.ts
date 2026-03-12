type SfxName = "move" | "capture" | "check" | "success" | "wrong" | "hint"

const FREQUENCIES: Record<SfxName, number[]> = {
  move: [520],
  capture: [420, 360],
  check: [780, 660],
  success: [640, 820, 980],
  wrong: [220, 180],
  hint: [560, 700],
}

let audioContext: AudioContext | null = null

function getAudioContext() {
  if (typeof window === "undefined") {
    return null
  }

  if (!audioContext) {
    const Context =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Context) {
      return null
    }
    audioContext = new Context()
  }

  return audioContext
}

export function playSound(name: SfxName, enabled: boolean) {
  if (!enabled) {
    return
  }

  const context = getAudioContext()
  if (!context) {
    return
  }

  if (context.state === "suspended") {
    context.resume()
  }

  const sequence = FREQUENCIES[name]
  const start = context.currentTime

  sequence.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const noteStart = start + index * 0.065
    const noteEnd = noteStart + 0.08

    oscillator.type = name === "wrong" ? "triangle" : "sine"
    oscillator.frequency.value = frequency

    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(0.14, noteStart + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd)

    oscillator.connect(gain)
    gain.connect(context.destination)

    oscillator.start(noteStart)
    oscillator.stop(noteEnd)
  })
}
