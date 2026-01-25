import { useState, useEffect, useCallback, useRef } from 'react'
import { Zap, Trophy, Flame, Wind, RotateCcw, Volume2, VolumeX } from 'lucide-react'

interface SmokeParticle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  speed: number
}

interface GameStats {
  blinkers: number
  totalHitTime: number
  longestHit: number
  highScore: number
}

const BLINKER_TIME = 8000 // 8 seconds for a blinker
const HIGH_DECAY_RATE = 0.5 // How fast the high wears off per second
const MAX_HIGH_LEVEL = 100

export default function BlinkerGame() {
  const [isHitting, setIsHitting] = useState(false)
  const [hitProgress, setHitProgress] = useState(0)
  const [highLevel, setHighLevel] = useState(0)
  const [smokeParticles, setSmokeParticles] = useState<SmokeParticle[]>([])
  const [stats, setStats] = useState<GameStats>({
    blinkers: 0,
    totalHitTime: 0,
    longestHit: 0,
    highScore: 0
  })
  const [isBlinker, setIsBlinker] = useState(false)
  const [showBlinkerFlash, setShowBlinkerFlash] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [combo, setCombo] = useState(0)
  const [lastBlinkerTime, setLastBlinkerTime] = useState(0)
  const [cartBattery, setCartBattery] = useState(100)
  const [isCartDead, setIsCartDead] = useState(false)

  const hitStartTime = useRef<number | null>(null)
  const animationFrame = useRef<number | null>(null)
  const particleIdCounter = useRef(0)
  const audioContext = useRef<AudioContext | null>(null)

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return () => {
      audioContext.current?.close()
    }
  }, [])

  // Play sound effect
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled || !audioContext.current) return

    const oscillator = audioContext.current.createOscillator()
    const gainNode = audioContext.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.current.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.1, audioContext.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration)

    oscillator.start(audioContext.current.currentTime)
    oscillator.stop(audioContext.current.currentTime + duration)
  }, [soundEnabled])

  // Play inhale sound
  const playInhaleSound = useCallback(() => {
    if (!soundEnabled || !audioContext.current) return

    const noise = audioContext.current.createBufferSource()
    const buffer = audioContext.current.createBuffer(1, audioContext.current.sampleRate * 0.5, audioContext.current.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1
    }

    noise.buffer = buffer
    const filter = audioContext.current.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 500

    const gainNode = audioContext.current.createGain()
    gainNode.gain.value = 0.05

    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(audioContext.current.destination)

    noise.start()
  }, [soundEnabled])

  // Spawn smoke particles
  const spawnSmoke = useCallback(() => {
    const newParticle: SmokeParticle = {
      id: particleIdCounter.current++,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 45,
      size: 10 + Math.random() * 20,
      opacity: 0.6 + Math.random() * 0.4,
      speed: 1 + Math.random() * 2
    }
    setSmokeParticles(prev => [...prev, newParticle])
  }, [])

  // Update smoke particles
  useEffect(() => {
    const interval = setInterval(() => {
      setSmokeParticles(prev =>
        prev
          .map(p => ({
            ...p,
            y: p.y - p.speed,
            x: p.x + (Math.random() - 0.5) * 2,
            opacity: p.opacity - 0.02,
            size: p.size + 0.5
          }))
          .filter(p => p.opacity > 0)
      )
    }, 50)

    return () => clearInterval(interval)
  }, [])

  // Decay high level over time
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHitting) {
        setHighLevel(prev => Math.max(0, prev - HIGH_DECAY_RATE))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isHitting])

  // Handle hit progress
  useEffect(() => {
    if (isHitting && !isCartDead) {
      hitStartTime.current = Date.now()
      playInhaleSound()

      const updateProgress = () => {
        if (!hitStartTime.current) return

        const elapsed = Date.now() - hitStartTime.current
        const progress = Math.min(elapsed / BLINKER_TIME, 1)
        setHitProgress(progress)

        // Spawn smoke while hitting
        if (Math.random() < 0.3) {
          spawnSmoke()
        }

        // Increase high level
        setHighLevel(prev => Math.min(MAX_HIGH_LEVEL, prev + 0.3))

        // Drain battery
        setCartBattery(prev => {
          const newBattery = prev - 0.05
          if (newBattery <= 0) {
            setIsCartDead(true)
            setIsHitting(false)
            return 0
          }
          return newBattery
        })

        // Check for blinker
        if (progress >= 1 && !isBlinker) {
          setIsBlinker(true)
          setShowBlinkerFlash(true)
          playSound(800, 0.1, 'square')

          // Calculate combo
          const now = Date.now()
          if (now - lastBlinkerTime < 15000) {
            setCombo(prev => prev + 1)
          } else {
            setCombo(1)
          }
          setLastBlinkerTime(now)

          // Update stats
          setStats(prev => ({
            ...prev,
            blinkers: prev.blinkers + 1
          }))
        }

        // Blinker LED flash
        if (progress >= 1) {
          setShowBlinkerFlash(prev => !prev)
        }

        if (isHitting) {
          animationFrame.current = requestAnimationFrame(updateProgress)
        }
      }

      animationFrame.current = requestAnimationFrame(updateProgress)

      return () => {
        if (animationFrame.current) {
          cancelAnimationFrame(animationFrame.current)
        }
      }
    } else {
      // Hit ended
      if (hitStartTime.current) {
        const hitDuration = Date.now() - hitStartTime.current
        setStats(prev => ({
          ...prev,
          totalHitTime: prev.totalHitTime + hitDuration,
          longestHit: Math.max(prev.longestHit, hitDuration),
          highScore: Math.max(prev.highScore, prev.blinkers)
        }))
        hitStartTime.current = null
      }
      setHitProgress(0)
      setIsBlinker(false)
      setShowBlinkerFlash(false)
    }
  }, [isHitting, isBlinker, spawnSmoke, playSound, playInhaleSound, lastBlinkerTime, isCartDead])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsHitting(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsHitting(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Reset game
  const resetGame = () => {
    setHighLevel(0)
    setStats(prev => ({
      blinkers: 0,
      totalHitTime: 0,
      longestHit: 0,
      highScore: prev.highScore
    }))
    setCombo(0)
    setCartBattery(100)
    setIsCartDead(false)
    setSmokeParticles([])
  }

  // Calculate visual effects based on high level
  const blurAmount = Math.min(highLevel / 20, 4)
  const hueRotate = highLevel * 1.5
  const wobbleAmount = Math.sin(Date.now() / 200) * (highLevel / 30)

  const getHighLevelText = () => {
    if (highLevel < 10) return 'Sober'
    if (highLevel < 25) return 'Buzzed'
    if (highLevel < 50) return 'Lifted'
    if (highLevel < 75) return 'Zooted'
    if (highLevel < 90) return 'Blasted'
    return 'COUCH LOCKED'
  }

  const getHighLevelColor = () => {
    if (highLevel < 10) return 'text-gray-400'
    if (highLevel < 25) return 'text-green-400'
    if (highLevel < 50) return 'text-green-500'
    if (highLevel < 75) return 'text-yellow-400'
    if (highLevel < 90) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 relative overflow-hidden"
      style={{
        filter: `blur(${blurAmount}px) hue-rotate(${hueRotate}deg)`,
        transform: `rotate(${wobbleAmount}deg)`
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/20 pointer-events-none" />

      {/* Smoke particles */}
      {smokeParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gray-300 pointer-events-none"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(8px)'
          }}
        />
      ))}

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            BLINKER RIP
          </h1>
          <p className="text-gray-400 text-sm mt-1">Hold SPACE or click to hit</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-black/50 backdrop-blur-sm rounded-xl p-3 text-white hover:bg-black/70 transition"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={resetGame}
            className="bg-black/50 backdrop-blur-sm rounded-xl p-3 text-white hover:bg-black/70 transition"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats panel */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-xl p-4 z-10">
        <div className="flex gap-6 text-white">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-2xl font-bold">{stats.blinkers}</span>
            </div>
            <p className="text-xs text-gray-400">Blinkers</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-2xl font-bold">{combo > 1 ? `${combo}x` : '-'}</span>
            </div>
            <p className="text-xs text-gray-400">Combo</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.highScore}</span>
            </div>
            <p className="text-xs text-gray-400">Best</p>
          </div>
        </div>
      </div>

      {/* High Level Meter */}
      <div className="absolute top-32 left-4 bg-black/50 backdrop-blur-sm rounded-xl p-4 z-10 w-48">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm">Vibe Check</span>
          <span className={`text-sm font-bold ${getHighLevelColor()}`}>
            {getHighLevelText()}
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-200 rounded-full"
            style={{
              width: `${highLevel}%`,
              background: `linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)`
            }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {Math.round(highLevel)}% Elevated
        </div>
      </div>

      {/* Cart Battery */}
      <div className="absolute top-32 right-4 bg-black/50 backdrop-blur-sm rounded-xl p-4 z-10 w-48">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm">Cart Battery</span>
          <span className={`text-sm font-bold ${cartBattery > 50 ? 'text-green-400' : cartBattery > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
            {Math.round(cartBattery)}%
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-200 rounded-full"
            style={{
              width: `${cartBattery}%`,
              backgroundColor: cartBattery > 50 ? '#22c55e' : cartBattery > 20 ? '#eab308' : '#ef4444'
            }}
          />
        </div>
        {isCartDead && (
          <div className="mt-2 text-xs text-red-400 font-bold animate-pulse">
            DEAD BATTERY - RESET TO CONTINUE
          </div>
        )}
      </div>

      {/* Main game area */}
      <div className="flex flex-col items-center justify-center min-h-screen pt-20">
        {/* The Cart */}
        <div
          className="relative cursor-pointer select-none"
          onMouseDown={() => setIsHitting(true)}
          onMouseUp={() => setIsHitting(false)}
          onMouseLeave={() => setIsHitting(false)}
          onTouchStart={() => setIsHitting(true)}
          onTouchEnd={() => setIsHitting(false)}
        >
          {/* Cart body */}
          <div className="relative">
            {/* Mouthpiece */}
            <div className="w-8 h-16 bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-full mx-auto relative">
              <div className="absolute inset-x-1 top-1 bottom-4 bg-gray-600 rounded-t-full" />
            </div>

            {/* Cart tank */}
            <div className="w-16 h-32 bg-gradient-to-b from-amber-600 to-amber-800 rounded-lg mx-auto relative overflow-hidden">
              {/* Oil level */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500 to-amber-400 transition-all"
                style={{ height: `${cartBattery}%`, opacity: 0.8 }}
              />
              {/* Bubbles when hitting */}
              {isHitting && (
                <>
                  <div className="absolute bottom-2 left-2 w-2 h-2 bg-amber-300 rounded-full animate-ping" />
                  <div className="absolute bottom-4 right-3 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping animation-delay-100" />
                  <div className="absolute bottom-6 left-4 w-1 h-1 bg-amber-300 rounded-full animate-ping animation-delay-200" />
                </>
              )}
              {/* Glass shine */}
              <div className="absolute inset-y-0 left-1 w-2 bg-white/20 rounded-full" />
            </div>

            {/* Battery section */}
            <div className="w-16 h-20 bg-gradient-to-b from-gray-700 to-gray-900 rounded-b-lg mx-auto relative">
              {/* LED indicator */}
              <div
                className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-100 ${
                  isCartDead
                    ? 'bg-red-900'
                    : isHitting
                      ? showBlinkerFlash
                        ? 'bg-white shadow-lg shadow-white/80'
                        : 'bg-green-400 shadow-lg shadow-green-400/50'
                      : 'bg-gray-600'
                }`}
              />
              {/* USB port hint */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-gray-800 rounded" />
            </div>
          </div>

          {/* Vapor effect when hitting */}
          {isHitting && !isCartDead && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <Wind className="w-8 h-8 text-gray-300/50 animate-pulse" />
            </div>
          )}
        </div>

        {/* Hit progress bar */}
        <div className="mt-8 w-64">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Hit Progress</span>
            <span>{(hitProgress * 8).toFixed(1)}s / 8s</span>
          </div>
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden relative">
            <div
              className="h-full transition-all duration-100 rounded-full"
              style={{
                width: `${hitProgress * 100}%`,
                background: hitProgress >= 1
                  ? 'linear-gradient(90deg, #ef4444 0%, #ffffff 50%, #ef4444 100%)'
                  : 'linear-gradient(90deg, #22c55e 0%, #84cc16 50%, #eab308 100%)'
              }}
            />
            {hitProgress >= 1 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white animate-pulse">BLINKER!</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <p className={`text-lg font-semibold ${isHitting && !isCartDead ? 'text-green-400' : 'text-gray-400'}`}>
            {isCartDead ? '🔋 Cart is dead! Reset to continue' : isHitting ? '💨 RIPPING...' : '👆 Hold to hit the cart'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Hit a blinker by holding for 8+ seconds!
          </p>
        </div>

        {/* Stats footer */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-8 text-gray-400 text-sm">
          <div>
            Total Hit Time: <span className="text-white">{(stats.totalHitTime / 1000).toFixed(1)}s</span>
          </div>
          <div>
            Longest Hit: <span className="text-white">{(stats.longestHit / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Blinker celebration overlay */}
      {isBlinker && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-6xl font-bold text-white animate-bounce drop-shadow-lg">
            🔥 BLINKER! 🔥
          </div>
        </div>
      )}
    </div>
  )
}
