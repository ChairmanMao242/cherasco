import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type SpinOutcome = 'win' | 'lose' | 'already_played' | 'out_of_time' | 'no_slots'



type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
  province: string
}



const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  postalCode: '',
  city: '',
  province: '',
}





type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

type BrickType = {
  id: string
  label: string
  color: string
  points: number
  size: number
}

type Brick = {
  id: string
  typeId: string
  x: number
  y: number
  width: number
  height: number
  vy: number
  color: string
  points: number
}

type CatchEffect = {
  id: string
  x: number
  y: number
  radius: number
  alpha: number
  color: string
}

const BRICK_TYPES: (BrickType & { img: string })[] = [
  { id: 'bronze', label: 'Moneta di bronzo', color: '#cd7f32', points: 1, size: 32, img: '/bronze.png' },
  { id: 'silver', label: 'Moneta d’argento', color: '#c0c0c0', points: 2, size: 26, img: '/silver.png' },
  { id: 'gold', label: 'Moneta d’oro', color: '#ffd700', points: 4, size: 20, img: '/gold.png' },
]




const BUCKET_IMG = '/money-box.png'



function App() {
  const [showForm, setShowForm] = useState(true)

  return (
    <div className="app">
      <header className="hero">
        <img className="hero__logo" src="/banca-di-cherasco.png" alt="Banca di Cherasco" />
        <div className="hero__copy">
          <p className="hero__eyebrow">Banca di Cherasco Mini Games</p>
          <h1>Un'esperienza di gioco <br /> firmata Banca di Cherasco</h1>
          <p className="hero__subtitle">
          Accumula, risparmia, vinci!  Corri a raccogliere tutte le monete.<br /> Riuscirai a diventare il miglior risparmiatore del giorno?
          </p>
        </div>
      </header>

      {/* Only show the form panel at first, then show the Money Saver panel after submit */}
      {showForm ? (
        <WheelFormPanel onSubmit={() => setShowForm(false)} />
      ) : (
        <BrickCatcherGame />
      )}
    </div>
  )
}

// Extracted form panel from WheelGame, disables the wheel and only shows the form
function WheelFormPanel({ onSubmit }: { onSubmit: () => void }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = Object.values(form).every((value) => value.trim().length > 0)

  const updateField = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    // Optionally, you can add a call to supabase or validation here
    // await supabase.rpc('spin_wheel', { ... })
    setTimeout(() => {
      setIsSubmitting(false)
      onSubmit()
    }, 500) // Simulate async
  }

  return (
    <main className="grid">
      <section className="panel panel--form">
        <div className="panel__header">
          <h2>Dati partecipante</h2>
          <p>Compila il modulo per accedere al gioco Money Saver.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form__grid">
            <label className="field">
              <span>Nome</span>
              <input
                type="text"
                value={form.firstName}
                onChange={updateField('firstName')}
                autoComplete="given-name"
                required
              />
            </label>
            <label className="field">
              <span>Cognome</span>
              <input
                type="text"
                value={form.lastName}
                onChange={updateField('lastName')}
                autoComplete="family-name"
                required
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={updateField('email')}
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              <span>Telefono</span>
              <input
                type="tel"
                value={form.phone}
                onChange={updateField('phone')}
                autoComplete="tel"
                required
              />
            </label>
            <label className="field field--full">
              <span>Indirizzo</span>
              <input
                type="text"
                value={form.address}
                onChange={updateField('address')}
                autoComplete="street-address"
                required
              />
            </label>
            <label className="field">
              <span>CAP</span>
              <input
                type="text"
                value={form.postalCode}
                onChange={updateField('postalCode')}
                autoComplete="postal-code"
                required
              />
            </label>
            <label className="field">
              <span>Citta</span>
              <input
                type="text"
                value={form.city}
                onChange={updateField('city')}
                autoComplete="address-level2"
                required
              />
            </label>
            <label className="field">
              <span>Provincia</span>
              <input
                type="text"
                value={form.province}
                onChange={updateField('province')}
                autoComplete="address-level1"
                required
              />
            </label>
          </div>

          {error && <p className="form__error">{error}</p>}

          <button className="cta" type="submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? 'Invio...' : 'Accedi al gioco'}
          </button>
          <p className="form__note">Partecipando accetti la privacy policy e il regolamento del concorso.</p>
        </form>
      </section>
    </main>
  )
}


function BrickCatcherGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const bricksRef = useRef<Brick[]>([])
  const effectsRef = useRef<CatchEffect[]>([])
  const brickImagesRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const bucketImageRef = useRef<HTMLImageElement | null>(null)
  const bucketAspectRef = useRef(0.68)
  const basketXRef = useRef(0)
  const basketYRef = useRef(0)
  const basketWidthRef = useRef(120)
  const basketHeightRef = useRef(42)
  const runningRef = useRef(false)
  const lastTimeRef = useRef(0)
  const nextSpawnRef = useRef(0)
  const scoreRef = useRef(0)
  const missesRef = useRef(0)
  const levelRef = useRef(1)
  const startTimeRef = useRef(0)
  const audioRef = useRef<AudioContext | null>(null)

  const [status, setStatus] = useState<'idle' | 'running' | 'over'>('idle')
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [level, setLevel] = useState(1)

  useEffect(() => {
    BRICK_TYPES.forEach((type) => {
      const image = new window.Image()
      image.src = type.img
      brickImagesRef.current.set(type.id, image)
    })

    const bucketImage = new window.Image()
    bucketImage.src = BUCKET_IMG
    bucketImage.onload = () => {
      if (bucketImage.naturalWidth > 0) {
        bucketAspectRef.current = bucketImage.naturalHeight / bucketImage.naturalWidth
      }
    }
    bucketImageRef.current = bucketImage
  }, [])

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      const stage = stageRef.current
      if (!canvas || !stage) {
        return
      }
      const rect = stage.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      basketWidthRef.current = Math.min(100, Math.max(100, rect.width * 0.2))
      basketHeightRef.current = basketWidthRef.current * .924
      basketXRef.current = rect.width / 2
      basketYRef.current = rect.height - basketHeightRef.current / 1.6
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current
    if (!stage) {
      return
    }
    const rect = stage.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const halfW = basketWidthRef.current / 2
    const halfH = basketHeightRef.current / 2
    basketXRef.current = Math.max(halfW, Math.min(rect.width - halfW, x))
    basketYRef.current = Math.max(halfH, Math.min(rect.height - halfH, y))
  }

  const playSound = (kind: 'catch' | 'miss') => {
    if (!audioRef.current) {
      audioRef.current = new AudioContext()
    }
    const ctx = audioRef.current
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined)
    }
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = kind === 'catch' ? 520 : 180
    gain.gain.value = 0.0001
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
    oscillator.start(now)
    oscillator.stop(now + 0.26)
  }

  const startGame = () => {
    bricksRef.current = []
    effectsRef.current = []
    scoreRef.current = 0
    missesRef.current = 0
    levelRef.current = 1
    startTimeRef.current = performance.now()
    lastTimeRef.current = startTimeRef.current
    nextSpawnRef.current = startTimeRef.current

    setScore(0)
    setMisses(0)
    setLevel(1)
    setStatus('running')
    runningRef.current = true

    animationRef.current = requestAnimationFrame(loop)
  }

  const loop = (time: number) => {
    if (!runningRef.current) {
      return
    }

    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const rect = stage.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const delta = Math.min(32, time - lastTimeRef.current) / 1000
    lastTimeRef.current = time

    const elapsed = (time - startTimeRef.current) / 1000
    const difficulty = Math.min(2.5, 1 + elapsed / 45)
    const nextLevel = Math.min(6, 1 + Math.floor(elapsed / 18))
    if (nextLevel !== levelRef.current) {
      levelRef.current = nextLevel
      setLevel(nextLevel)
    }

    const spawnInterval = Math.max(360, 900 - elapsed * 9)
    if (time >= nextSpawnRef.current) {
      const type = BRICK_TYPES[Math.floor(Math.random() * BRICK_TYPES.length)]
      const widthScale = 2.08
      const brickWidth = type.size * widthScale
      const brickHeight = type.size * widthScale
      const x = Math.random() * (width - brickWidth)
      const vy = (150 + Math.random() * 80) * difficulty
      bricksRef.current.push({
        id: `${time}-${Math.random()}`,
        typeId: type.id,
        x,
        y: -brickHeight,
        width: brickWidth,
        height: brickHeight,
        vy,
        color: type.color,
        points: type.points,
      })
      nextSpawnRef.current = time + spawnInterval
    }

    const basketX = basketXRef.current
    const basketY = basketYRef.current
    const basketWidth = basketWidthRef.current
    const basketHeightDisplay = basketHeightRef.current

    const bricks = bricksRef.current
    for (let i = bricks.length - 1; i >= 0; i -= 1) {
      const brick = bricks[i]
      brick.y += brick.vy * delta

      const withinX = brick.x + brick.width >= basketX - basketWidth / 2 && brick.x <= basketX + basketWidth / 2
      const withinY =
        brick.y + brick.height >= basketY - basketHeightDisplay / 2 &&
        brick.y <= basketY + basketHeightDisplay / 2
      if (withinX && withinY) {
        bricks.splice(i, 1)
        scoreRef.current += brick.points
        setScore(scoreRef.current)
        effectsRef.current.push({
          id: `${brick.id}-fx`,
          x: brick.x + brick.width / 2,
          y: brick.y + brick.height / 2,
          radius: 8,
          alpha: 0.9,
          color: brick.color,
        })
        playSound('catch')
        continue
      }

      if (brick.y > height + brick.height) {
        bricks.splice(i, 1)
        missesRef.current += 1
        setMisses(missesRef.current)
        playSound('miss')
      }
    }

    if (missesRef.current >= 10) {
      runningRef.current = false
      setStatus('over')
    }

    ctx.clearRect(0, 0, width, height)
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(255,255,255,0.85)')
    gradient.addColorStop(1, 'rgba(230,247,252,0.9)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(0, 178, 227, 0.08)'
    ctx.fillRect(0, height - 48, width, 48)

    const basketLeft = basketX - basketWidth / 2
    const basketTop = basketY - basketHeightDisplay / 2
    const bucketImage = bucketImageRef.current
    if (bucketImage && bucketImage.complete) {
      ctx.drawImage(bucketImage, basketLeft, basketTop, basketWidth, basketHeightDisplay)
    } else {
      drawBasket(ctx, basketLeft, basketTop, basketWidth, basketHeightDisplay)
    }

    bricks.forEach((brick) => {
      const brickImage = brickImagesRef.current.get(brick.typeId)
      if (brickImage && brickImage.complete) {
        ctx.drawImage(brickImage, brick.x, brick.y, brick.width, brick.height)
      } else {
        ctx.fillStyle = brick.color
        drawRoundedRect(ctx, brick.x, brick.y, brick.width, brick.height, 6)
        ctx.fill()
      }
    })

    for (let i = effectsRef.current.length - 1; i >= 0; i -= 1) {
      const effect = effectsRef.current[i]
      effect.radius += 42 * delta
      effect.alpha -= 1.6 * delta
      if (effect.alpha <= 0) {
        effectsRef.current.splice(i, 1)
        continue
      }
      ctx.beginPath()
      ctx.strokeStyle = `rgba(0, 178, 227, ${effect.alpha})`
      ctx.lineWidth = 2
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2)
      ctx.stroke()
    }

    animationRef.current = requestAnimationFrame(loop)
  }

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  const drawBasket = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const rimHeight = height * 0.35
    ctx.fillStyle = '#0b1f27'
    drawRoundedRect(ctx, x, y + rimHeight, width, height - rimHeight, 10)
    ctx.fill()

    ctx.fillStyle = '#113241'
    drawRoundedRect(ctx, x + width * 0.08, y, width * 0.84, rimHeight, 10)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x + width * 0.25, y + rimHeight * 0.15, width * 0.2, Math.PI, 2 * Math.PI)
    ctx.stroke()
  }

  return (
    <main className="grid">
      <section className="panel panel--wide">
        <div className="brick-game">
          <div className="game-hud">
            <div>
              <span>Punti</span>
              <strong>{score}</strong>
            </div>
            <div>
              <span>Errori</span>
              <strong>{misses} / 10</strong>
            </div>
            <div>
              <span>Livello</span>
              <strong>{level}</strong>
            </div>
          </div>

          <div
            className="game-stage"
            ref={stageRef}
            onPointerDown={handlePointerMove}
            onPointerMove={handlePointerMove}
          >
            <canvas className="game-canvas" ref={canvasRef} />
            {status !== 'running' && (
              <div className="game-overlay">
                <h2>{status === 'over' ? 'Game Over' : 'Pronto?'}</h2>
                <p>
                  Trascina il salvadanaio per raccogliere le monete. Dopo 10 monete mancati, la partita finisce.
                </p>
                <button className="cta" type="button" onClick={startGame}>
                  {status === 'over' ? 'Gioca di nuovo' : 'Inizia la partita'}
                </button>
              </div>
            )}
          </div>

          <div className="game-legend">
            {BRICK_TYPES.map((type) => (
              <div key={type.id} className="legend-item">
                <img
                  src={type.img}
                  alt={type.label}
                  style={{
                    width: 28,
                    height: 28,
                    objectFit: 'contain',
                    marginRight: 8,
                  }}
                />
                <div>
                  <strong>{type.points} pt</strong>
                  <span>{type.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>



export default App;