import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'

type SpinOutcome = 'win' | 'lose' | 'already_played' | 'out_of_time' | 'no_slots'

type SpinResult = {
  result: SpinOutcome
  prize?: string | null
}

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

const SEGMENTS = [
  { key: 'tshirt', label: 'Tshirt', type: 'prize' },
  { key: 'lose-1', label: 'Ritenta', type: 'lose' },
  { key: 'cappellino', label: 'Cappellino', type: 'prize' },
  { key: 'lose-2', label: 'Ritenta', type: 'lose' },
  { key: 'portachiavi', label: 'Portachiavi', type: 'prize' },
  { key: 'lose-3', label: 'Ritenta', type: 'lose' },
]

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

const SPIN_DURATION_MS = 4200
const SPIN_TURNS = 6
const START_ANGLE = 0

const normalizePrize = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]/g, '')

const GAME_TABS = [
  { id: 'wheel', label: 'Wheel of Fortune' },
  { id: 'bricks', label: 'Brick Catcher' },
  { id: 'quiz', label: 'Quiz' },
] as const

type GameTab = (typeof GAME_TABS)[number]['id']

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

const BRICK_TYPES: BrickType[] = [
  { id: 'light', label: 'Mattone leggero', color: '#66d1f1', points: 1, size: 20 },
  { id: 'core', label: 'Mattone standard', color: '#00b2e3', points: 2, size: 26 },
  { id: 'heavy', label: 'Mattone robusto', color: '#007a9c', points: 4, size: 32 },
]

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Qual é il primo passo per ridurre i consumi energetici di un edificio?',
    options: ['Monitorare i consumi reali', 'Cambiare subito le finestre', 'Aumentare la temperatura', 'Ridurre la ventilazione'],
    correctIndex: 0,
  },
  {
    id: 'q2',
    question: 'Che cosa indica la sigla ESG?',
    options: ['Energy Service Grid', 'Environment, Social, Governance', 'Energy Saving Goal', 'Efficient Site Growth'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    question: 'Qual é una fonte rinnovabile tra queste?',
    options: ['Gas naturale', 'Carbone', 'Solare', 'Gasolio'],
    correctIndex: 2,
  },
  {
    id: 'q4',
    question: 'Un impianto fotovoltaico produce:',
    options: ['Calore', 'Elettricita', 'Vapore', 'Biogas'],
    correctIndex: 1,
  },
  {
    id: 'q5',
    question: 'Cosa misura la classe energetica di un edificio?',
    options: ['La distanza dal centro', 'Il consumo energetico', 'Il numero di piani', 'Il tipo di arredi'],
    correctIndex: 1,
  },
  {
    id: 'q6',
    question: 'Qual é una buona pratica per ridurre sprechi di energia?',
    options: ['Tenere luci accese', 'Manutenzione regolare impianti', 'Aumentare la potenza', 'Tenere finestre aperte d inverno'],
    correctIndex: 1,
  },
  {
    id: 'q7',
    question: 'La riqualificazione energetica punta a:',
    options: ['Aumentare solo la potenza elettrica', 'Ridurre consumi e emissioni', 'Cambiare colori facciata', 'Aggiungere spazio interno'],
    correctIndex: 1,
  },
  {
    id: 'q8',
    question: 'Un audit energetico serve a:',
    options: ['Definire il budget marketing', 'Valutare consumi e inefficienze', 'Cambiare personale', 'Misurare la sicurezza sismica'],
    correctIndex: 1,
  },
  {
    id: 'q9',
    question: 'Qual é un indicatore di comfort interno?',
    options: ['CO2 e temperatura', 'Numero di parcheggi', 'Altezza edificio', 'Colore pareti'],
    correctIndex: 0,
  },
  {
    id: 'q10',
    question: 'La gestione smart building aiuta a:',
    options: ['Aumentare consumi', 'Ridurre controlli', 'Ottimizzare uso energia', 'Spegne tutti i sensori'],
    correctIndex: 2,
  },
]

const BRICK_SVG_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 605.35 437.32">
  <path fill="{{c1}}" d="M0,216.22v86.3c0,2.52,1.89,5.67,5.67,7.56v-86.3C1.89,221.89,0,218.74,0,216.22Z"/>
  <polygon fill="{{c3}}" points="497.01 134.96 497.01 221.26 371.65 149.45 371.65 62.52 497.01 134.96"/>
  <polygon fill="{{c2}}" points="371.65 62.52 371.65 149.45 107.72 302.52 107.72 216.22 371.65 62.52"/>
  <path fill="{{c1}}" d="M604.72,134.96q0,.63,0,0v3.78s0,.63-.63.63v.63l-.63.63h0s-.63,0-.63.63c0,0-.63,0-.63.63,0,0-.63,0-.63.63,0,0-.63,0-.63.63v86.3h0s.63,0,.63-.63c0,0,.63,0,.63-.63,0,0,.63,0,.63-.63,0,0,.63,0,.63-.63h0l.63-.63h0s0-.63.63-.63h0v-1.26h0v-1.26h0v-1.26h0v-86.93h0Z"/>
  <path fill="{{c1}}" d="M371.65,62.52l125.35,72.44-263.94,153.07-125.35-71.81L371.65,62.52ZM277.8,189.76c13.86,8.19,36.54,8.19,50.39,0s13.86-20.79,0-28.98-36.54-8.19-50.39,0c-14.49,8.19-14.49,21.42,0,28.98M356.54,143.78c13.86,8.19,36.54,8.19,50.39,0s13.86-20.79,0-28.98-36.54-8.19-50.39,0-13.86,20.79,0,28.98M198.43,236.38c13.86,8.19,36.54,8.19,50.39,0s13.86-20.79,0-28.98-36.54-8.19-50.39,0c-14.49,7.56-13.86,20.79,0,28.98"/>
  <polygon fill="{{c5}}" points="497.01 134.96 497.01 221.26 233.07 374.96 233.07 288.03 497.01 134.96"/>
  <polygon fill="{{c6}}" points="233.07 288.03 233.07 374.96 107.72 302.52 107.72 216.22 233.07 288.03"/>
  <path fill="{{c4}}" d="M599.69,126.77c7.56,4.41,7.56,11.34,0,15.12l-353.39,205.98c-6.93,4.41-18.9,4.41-26.46,0L5.67,224.41c-7.56-4.41-7.56-11.34,0-15.12L359.06,3.31c6.93-4.41,18.9-4.41,26.46,0l214.17,123.46ZM233.07,288.03l263.94-153.07-125.35-72.44L107.72,216.22l125.35,71.81"/>
  <path fill="{{c4}}" d="M406.93,114.8c13.86,8.19,13.86,20.79,0,28.98s-36.54,8.19-50.39,0-13.86-20.79,0-28.98c13.86-8.19,36.54-8.19,50.39,0Z"/>
  <path fill="{{c4}}" d="M327.56,160.79c13.86,8.19,13.86,20.79,0,28.98s-36.54,8.19-50.39,0-13.86-20.79,0-28.98c13.86-7.56,36.54-7.56,50.39,0Z"/>
  <path fill="{{c4}}" d="M248.19,206.77c13.86,8.19,13.86,20.79,0,28.98-13.86,8.19-36.54,8.19-50.39,0s-13.86-20.79,0-28.98c13.86-7.56,36.54-7.56,50.39,0Z"/>
  <polygon fill="{{c1}}" points="246.3 347.87 245.67 434.17 599.06 228.82 599.69 142.52 246.3 347.87"/>
  <polygon fill="{{c1}}" points="5.67 223.78 5.04 310.71 219.84 434.17 219.84 347.87 5.67 223.78"/>
  <path fill="{{c1}}" d="M245.67,434.17v-86.3c-.63.63-1.89.63-2.52,1.26h-.63c-.63,0-1.26.63-1.89.63s-1.26.63-1.89.63-1.26,0-2.52.63h-8.19c-1.26,0-1.89,0-3.15-.63h-.63c-.63,0-1.89-.63-2.52-.63h-.63c-1.26-.63-1.89-.63-2.52-1.26v86.3c.63.63,1.89.63,2.52,1.26h.63c.63,0,1.26.63,1.89.63h1.89c.63,0,1.26,0,1.89.63h10.71c.63,0,1.26,0,1.89-.63h2.52c1.89-1.89,2.52-1.89,3.15-2.52Z"/>
</svg>`

const BUCKET_SVG = `<?xml version="1.0" encoding="iso-8859-1"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 491.945 491.945" xml:space="preserve">
<path fill="#76999B" d="M408.11,174.419h-24.009V45.473c0-5.545-4.537-10.082-10.106-10.082H117.948c-5.577,0-10.106,4.537-10.106,10.082v128.945H83.833V45.473c0-18.794,15.305-34.107,34.115-34.107h256.047c18.81,0,34.115,15.313,34.115,34.107V174.419z"/>
<g>
  <path fill="#5D7C7C" d="M117.948,35.391c-18.81,0-34.115,15.297-34.115,34.107v104.921h24.009V69.498V45.473c0-5.545,4.529-10.082,10.106-10.082z"/>
  <path fill="#5D7C7C" d="M373.995,35.391c5.569,0,10.106,4.537,10.106,10.082v24.025v104.921h24.009V69.498c0-18.81-15.305-34.107-34.115-34.107z"/>
</g>
<path fill="#8CAFAF" d="M364.606,461.856c0,16.612-13.462,30.082-30.082,30.082H167.439c-16.605,0-30.066-13.47-30.066-30.082l-60.156-284.05c0-16.62,13.462-30.058,30.082-30.058h277.346c16.62,0,30.074,13.438,30.074,30.058L364.606,461.856z"/>
<path fill="#76999B" d="M77.216,177.814c0-16.62,13.462-30.058,30.082-30.058h277.346c16.62,0,30.074,13.438,30.074,30.058l-50.113,284.05c0,16.612-13.462,30.082-30.082,30.082"/>
<ellipse fill="#547272" cx="245.972" cy="153.088" rx="148.488" ry="17.006"/>
<path fill="#3F5655" d="M394.467,153.088c0,9.397-66.481,17.006-148.496,17.006s-148.488-7.609-148.488-17.006"/>
<circle fill="#9DC1C0" cx="80.879" cy="166.432" r="20.015"/>
<path fill="#8CAFAF" d="M95.034,152.277c7.814,7.814,7.814,20.488,0,28.302c-7.814,7.814-20.496,7.814-28.302,0.016"/>
<circle fill="#9DC1C0" cx="411.072" cy="166.432" r="20.007"/>
<path fill="#8CAFAF" d="M425.227,152.277c7.806,7.814,7.806,20.488,0,28.302c-7.822,7.814-20.512,7.814-28.318,0.016"/>
<path fill="#FF6D00" d="M307.357,40.393c0,3.489-2.82,6.309-6.309,6.309H190.873c-3.474,0-6.294-2.812-6.294-6.309V6.309c0-3.505,2.812-6.309,6.294-6.309h110.175c3.482,0,6.309,2.796,6.309,6.309V40.393z"/>
<path fill="#FF8B00" d="M301.055,0H190.873c-3.474,0-6.294,2.796-6.294,6.309v9.405c0,3.482,2.812,6.309,6.294,6.309h110.175c3.482,0,6.309-2.82,6.309-6.309V6.309C307.357,2.804,304.537,0,301.055,0z"/>
<g>
  <circle fill="#8CAFAF" cx="163.894" cy="228.407" r="6.002"/>
  <circle fill="#8CAFAF" cx="204.933" cy="228.407" r="6.002"/>
  <circle fill="#8CAFAF" cx="245.972" cy="228.407" r="6.01"/>
  <circle fill="#8CAFAF" cx="286.987" cy="228.407" r="6.002"/>
  <circle fill="#8CAFAF" cx="328.018" cy="228.407" r="6.002"/>
</g>
</svg>`

const createDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const adjustColor = (hex: string, amount: number) => {
  const normalized = hex.replace('#', '')
  const num = parseInt(normalized, 16)
  const r = clamp((num >> 16) + Math.round(255 * amount), 0, 255)
  const g = clamp(((num >> 8) & 0xff) + Math.round(255 * amount), 0, 255)
  const b = clamp((num & 0xff) + Math.round(255 * amount), 0, 255)
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const buildBrickSvg = (baseColor: string) => {
  const c1 = adjustColor(baseColor, 0.08)
  const c2 = adjustColor(baseColor, -0.1)
  const c3 = adjustColor(baseColor, -0.28)
  const c4 = adjustColor(baseColor, 0.22)
  const c5 = adjustColor(baseColor, 0.02)
  const c6 = adjustColor(baseColor, -0.2)
  return BRICK_SVG_TEMPLATE
    .replace(/\{\{c1\}\}/g, c1)
    .replace(/\{\{c2\}\}/g, c2)
    .replace(/\{\{c3\}\}/g, c3)
    .replace(/\{\{c4\}\}/g, c4)
    .replace(/\{\{c5\}\}/g, c5)
    .replace(/\{\{c6\}\}/g, c6)
}

function App() {
  const [activeGame, setActiveGame] = useState<GameTab>('wheel')

  return (
    <div className="app">
      <header className="hero">
        <img className="hero__logo" src="/logo.svg" alt="Deerns" />
        <div className="hero__copy">
          <p className="hero__eyebrow">Deerns Mini Games</p>
          <h1>Un'esperienza di gioco firmata Deerns</h1>
          <p className="hero__subtitle">
            Sfida la fortuna con la ruota o metti alla prova i riflessi raccogliendo i mattoni in caduta libera.
          </p>
        </div>
      </header>

      <div className="game-switch">
        {GAME_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeGame ? 'is-active' : ''}
            onClick={() => setActiveGame(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeGame === 'wheel' && <WheelGame />}
      {activeGame === 'bricks' && <BrickCatcherGame />}
      {activeGame === 'quiz' && <QuizGame />}
    </div>
  )
}

function WheelGame() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [status, setStatus] = useState<'idle' | 'spinning' | 'done'>('idle')
  const [result, setResult] = useState<SpinResult | null>(null)
  const [error, setError] = useState<string>('')

  const loseIndexes = useMemo(
    () => SEGMENTS.map((segment, index) => (segment.type === 'lose' ? index : -1)).filter((i) => i >= 0),
    [],
  )

  const prizeIndexes = useMemo(
    () =>
      SEGMENTS.map((segment, index) =>
        segment.type === 'prize' ? { index, key: segment.key } : null,
      ).filter((item): item is { index: number; key: string } => Boolean(item)),
    [],
  )

  const prizeIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    SEGMENTS.forEach((segment, index) => {
      if (segment.type === 'prize') {
        map.set(normalizePrize(segment.key), index)
        map.set(normalizePrize(segment.label), index)
      }
    })
    return map
  }, [])

  const isFormValid = useMemo(() => {
    return Object.values(form).every((value) => value.trim().length > 0)
  }, [form])

  const updateField = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const spinToIndex = (targetIndex: number) => {
    const angle = 360 / SEGMENTS.length
    const targetAngle = (-START_ANGLE - angle * targetIndex - angle / 2) % 360
    const normalizedTarget = (targetAngle + 360) % 360
    setRotation((prev) => {
      const current = ((prev % 360) + 360) % 360
      const delta = SPIN_TURNS * 360 + ((normalizedTarget - current + 360) % 360)
      return prev + delta
    })
  }

  const handleSpin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSpinning || !isFormValid) {
      return
    }

    setError('')
    setResult(null)
    setIsSpinning(true)
    setStatus('spinning')

    const { data, error: spinError } = await supabase.rpc('spin_wheel', {
      p_first_name: form.firstName,
      p_last_name: form.lastName,
      p_email: form.email,
      p_phone: form.phone,
      p_address: form.address,
      p_postal_code: form.postalCode,
      p_city: form.city,
      p_province: form.province,
    })

    if (spinError) {
      setError('Errore di connessione. Riprova tra poco.')
      setIsSpinning(false)
      setStatus('idle')
      return
    }

    const outcome = data as SpinResult | null
    if (!outcome) {
      setError('Nessuna risposta dal server. Riprova.')
      setIsSpinning(false)
      setStatus('idle')
      return
    }

    setResult(outcome)

    if (outcome.result === 'win' || outcome.result === 'lose') {
      let targetIndex = loseIndexes[Math.floor(Math.random() * loseIndexes.length)]
      if (outcome.result === 'win') {
        const fallbackPrize = prizeIndexes[Math.floor(Math.random() * prizeIndexes.length)]
        targetIndex = fallbackPrize.index
        if (outcome.prize) {
          const normalizedPrize = normalizePrize(outcome.prize)
          const mappedIndex = prizeIndexMap.get(normalizedPrize)
          if (mappedIndex !== undefined) {
            targetIndex = mappedIndex
          }
        }
      }

      spinToIndex(targetIndex)
      window.setTimeout(() => {
        setIsSpinning(false)
        setStatus('done')
      }, SPIN_DURATION_MS)
    } else {
      setIsSpinning(false)
      setStatus('done')
    }
  }

  const resultMessage = useMemo(() => {
    if (!result) {
      return 'Inserisci i tuoi dati e gira la ruota per scoprire il premio.'
    }

    switch (result.result) {
      case 'win':
        return `Complimenti! Hai vinto: ${result.prize ?? 'premio Deerns'}.`
      case 'lose':
        return 'Non questa volta. Riprova domani!'
      case 'already_played':
        return 'Hai gia giocato oggi con questi dati.'
      case 'out_of_time':
        return 'La ruota si attiva dalle 8:00 alle 20:00.'
      case 'no_slots':
        return 'Premi non ancora disponibili oggi. Riprova piu tardi.'
      default:
        return 'Riprova piu tardi.'
    }
  }, [result])

  return (
    <main className="grid">
      <section className="panel panel--form">
        <div className="panel__header">
          <h2>Dati partecipante</h2>
          <p>Un solo giro al giorno per email e telefono.</p>
        </div>

        <form className="form" onSubmit={handleSpin}>
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

          <button className="cta" type="submit" disabled={!isFormValid || isSpinning}>
            {isSpinning ? 'Sto girando...' : 'Gira la ruota'}
          </button>
          <p className="form__note">Partecipando accetti la privacy policy e il regolamento del concorso.</p>
        </form>
      </section>

      <section className="panel panel--wheel">
        <div className="wheel__wrap">
          <div className="wheel__pointer" />
          <div
            className={`wheel ${status === 'spinning' ? 'wheel--spinning' : ''}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="wheel__center">
              <span>Deerns</span>
            </div>
            <ul className="wheel__labels">
              {SEGMENTS.map((segment, index) => (
                <li
                  key={segment.key}
                  style={{
                    transform: `rotate(${(360 / SEGMENTS.length) * (index + 0.5)}deg)`,
                  }}
                >
                  <span>{segment.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="wheel__meta">
          <h2>Premi in palio</h2>
          <div className="chips">
            <span>Tshirt</span>
            <span>Cappellino</span>
            <span>Portachiavi</span>
          </div>
          <p className="wheel__message">{resultMessage}</p>
          <p className="wheel__schedule">Orario di gioco: 8:00 - 20:00</p>
        </div>
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
      const image = new Image()
      image.src = createDataUrl(buildBrickSvg(type.color))
      brickImagesRef.current.set(type.id, image)
    })

    const bucketImage = new Image()
    bucketImage.src = createDataUrl(BUCKET_SVG)
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
      basketWidthRef.current = Math.min(180, Math.max(100, rect.width * 0.24))
      basketHeightRef.current = basketWidthRef.current * bucketAspectRef.current
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
      const brickHeight = type.size
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
                  Trascina il cestino per raccogliere i mattoni. Dopo 10 mattoni mancati, la partita finisce.
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
                <span className="legend-swatch" style={{ background: type.color }} />
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
  )
}

function QuizGame() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentQuestion = QUIZ_QUESTIONS[currentIndex]

  const handleSelect = (index: number) => {
    if (selectedIndex !== null || isFinished) {
      return
    }
    setSelectedIndex(index)
    if (index === currentQuestion.correctIndex) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex === null) {
      return
    }
    if (currentIndex === QUIZ_QUESTIONS.length - 1) {
      setIsFinished(true)
      return
    }
    setCurrentIndex((prev) => prev + 1)
    setSelectedIndex(null)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedIndex(null)
    setScore(0)
    setIsFinished(false)
  }

  return (
    <main className="grid">
      <section className="panel panel--wide">
        <div className="quiz">
          <div className="quiz__header">
            <div>
              <p className="quiz__eyebrow">Quiz a risposta multipla</p>
              <h2>Quanto ne sai di energia sostenibile?</h2>
            </div>
            <div className="quiz__progress">
              <span>
                Domanda {Math.min(currentIndex + 1, QUIZ_QUESTIONS.length)} / {QUIZ_QUESTIONS.length}
              </span>
              <strong>{score} punti</strong>
            </div>
          </div>

          <div className="quiz__body">
            <h3>{currentQuestion.question}</h3>
            <div className="quiz__options">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedIndex === index
                const isCorrect = currentQuestion.correctIndex === index
                const showFeedback = selectedIndex !== null
                const statusClass = showFeedback
                  ? isCorrect
                    ? 'is-correct'
                    : isSelected
                      ? 'is-wrong'
                      : ''
                  : ''
                return (
                  <button
                    key={option}
                    type="button"
                    className={`quiz__option ${statusClass}`}
                    onClick={() => handleSelect(index)}
                    disabled={selectedIndex !== null}
                  >
                    <span>{option}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="quiz__footer">
            {selectedIndex !== null && (
              <p className="quiz__feedback">
                {selectedIndex === currentQuestion.correctIndex
                  ? 'Risposta corretta!'
                  : `Risposta sbagliata. Corretta: ${currentQuestion.options[currentQuestion.correctIndex]}.`}
              </p>
            )}

            {!isFinished ? (
              <button className="cta" type="button" onClick={handleNext} disabled={selectedIndex === null}>
                {currentIndex === QUIZ_QUESTIONS.length - 1 ? 'Mostra risultato' : 'Prossima domanda'}
              </button>
            ) : (
              <div className="quiz__result">
                <p>
                  Hai totalizzato <strong>{score}</strong> risposte corrette su{' '}
                  <strong>{QUIZ_QUESTIONS.length}</strong>.
                </p>
                <button className="cta" type="button" onClick={handleRestart}>
                  Ricomincia il quiz
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
