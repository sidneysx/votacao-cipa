import { ArrowLeft, IdCard, Lock, MapPin, TabletSmartphone, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import Cabecalho from '../components/Cabecalho.jsx'
import { Alerta, Carregando, Foto, IconeTopo, Palco } from '../components/ui.jsx'
import { useConfig } from '../config.jsx'
import { formatar, situacaoVotacao } from '../lib/datas.js'
import { mensagemErro, supabase } from '../lib/supabase.js'

const CHAVE_TOKEN = 'cipa_token_dispositivo'

// Tempo de espera depois do voto antes de liberar o próximo eleitor
const ESPERA_SEGUNDOS = 10

// Som tocado depois que o voto é gravado. Basta colocar o arquivo em public/confirma.mp3
const somConfirmacao = typeof Audio !== 'undefined' ? new Audio('/confirma.mp3') : null

function tocarConfirmacao() {
  if (!somConfirmacao) return
  somConfirmacao.currentTime = 0
  somConfirmacao.play().catch(() => {
    // sem arquivo de som (ou navegador bloqueou): segue sem áudio
  })
}

function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

function gravarToken(token) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // sem localStorage o aparelho precisa ser ativado de novo a cada acesso
  }
}

export default function Urna() {
  const [token, setToken] = useState(lerToken)
  const [sessao, setSessao] = useState(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!token) return
    supabase.rpc('sessao_dispositivo', { p_token: token }).then(({ data, error }) => {
      if (error || !data?.length) {
        gravarToken(null)
        setToken(null)
        setAviso('Este dispositivo foi desconectado. Peça um novo código de ativação ao administrador.')
        return
      }
      setSessao(data[0])
    })
  }, [token])

  function desconectado() {
    gravarToken(null)
    setSessao(null)
    setToken(null)
    setAviso('Este dispositivo foi desconectado. Peça um novo código de ativação ao administrador.')
  }

  if (!token) {
    return (
      <Ativacao
        aviso={aviso}
        onAtivado={(novo) => {
          gravarToken(novo)
          setAviso('')
          setToken(novo)
        }}
      />
    )
  }

  if (!sessao) {
    return (
      <>
        <Cabecalho />
        <Palco>
          <Carregando />
        </Palco>
      </>
    )
  }

  return <Cabine token={token} sessao={sessao} onDesconectado={desconectado} />
}

function Ativacao({ aviso, onAtivado }) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function ativar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.rpc('ativar_dispositivo', { p_codigo: codigo })
    setEnviando(false)
    if (error) return setErro(mensagemErro(error))
    onAtivado(data)
  }

  return (
    <>
      <Cabecalho />
      <Palco>
        <form onSubmit={ativar} className="cartao w-full max-w-md animate-entrar p-8 text-center">
          <IconeTopo icone={TabletSmartphone} />
          <h1 className="text-2xl font-bold text-slate-900">Ativar urna</h1>
          <p className="mt-2 text-slate-500">
            Mesário: digite o código de ativação deste dispositivo, gerado no painel do administrador.
          </p>
          {aviso && (
            <div className="mt-5">
              <Alerta tipo="info">{aviso}</Alerta>
            </div>
          )}
          <div key={erro} className={erro ? 'animate-tremer' : ''}>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              aria-label="Código de ativação"
              autoComplete="off"
              autoFocus
              required
              className="entrada mt-6 text-center font-mono text-2xl font-semibold uppercase tracking-[0.3em]"
            />
          </div>
          {erro && (
            <div className="mt-4">
              <Alerta>{erro}</Alerta>
            </div>
          )}
          <button className="btn btn-lg mt-6 w-full" disabled={enviando}>
            {enviando ? 'Ativando…' : 'Ativar'}
          </button>
        </form>
      </Palco>
    </>
  )
}

function Cabine({ token, sessao, onDesconectado }) {
  const { config } = useConfig()
  const [candidatos, setCandidatos] = useState([])
  const [etapa, setEtapa] = useState('matricula')
  const [matricula, setMatricula] = useState('')
  const [eleitor, setEleitor] = useState('')
  const [escolha, setEscolha] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [, atualizarRelogio] = useState(0)
  const [restante, setRestante] = useState(0)

  useEffect(() => {
    supabase
      .from('candidatos')
      .select('*')
      .eq('ativo', true)
      .order('numero')
      .then(({ data }) => setCandidatos(data ?? []))
  }, [])

  // Reavalia a cada 30s se a votação abriu/fechou
  useEffect(() => {
    const id = setInterval(() => atualizarRelogio((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // Contagem regressiva da tela "Voto registrado"
  useEffect(() => {
    if (etapa !== 'fim') return
    const id = setTimeout(() => (restante <= 1 ? reiniciar() : setRestante(restante - 1)), 1000)
    return () => clearTimeout(id)
  }, [etapa, restante])

  function reiniciar() {
    setEtapa('matricula')
    setMatricula('')
    setEleitor('')
    setEscolha(null)
    setErro('')
  }

  function tratarErro(error) {
    if (error.message === 'Dispositivo não autorizado') return onDesconectado()
    setErro(mensagemErro(error))
  }

  async function verificar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.rpc('verificar_eleitor', { p_token: token, p_matricula: matricula })
    setEnviando(false)
    if (error) return tratarErro(error)
    setEleitor(data)
    setEtapa('candidato')
  }

  async function confirmar() {
    setEnviando(true)
    setErro('')
    const { error } = await supabase.rpc('registrar_voto', {
      p_token: token,
      p_matricula: matricula,
      p_candidato: escolha.id,
    })
    setEnviando(false)
    if (error) return tratarErro(error)
    tocarConfirmacao()
    setRestante(ESPERA_SEGUNDOS)
    setEtapa('fim')
  }

  function escolher(candidato) {
    setEscolha(candidato)
    setErro('')
    setEtapa('confirmar')
  }

  const situacao = situacaoVotacao(config)
  const fechada = situacao !== 'aberta' && etapa === 'matricula'

  let conteudo
  if (fechada) {
    conteudo = (
      <div className="cartao w-full max-w-md p-8 text-center">
        <IconeTopo icone={Lock} />
        <h1 className="text-2xl font-bold text-slate-900">Urna fechada</h1>
        <p className="mt-2 text-slate-500">
          {situacao === 'sem-horario' && 'O horário da votação ainda não foi definido.'}
          {situacao === 'antes' && `A votação começa em ${formatar(config.inicio)}.`}
          {situacao === 'encerrada' && `A votação foi encerrada em ${formatar(config.fim)}.`}
        </p>
      </div>
    )
  } else if (etapa === 'matricula') {
    conteudo = (
      <form onSubmit={verificar} className="cartao w-full max-w-md p-8 text-center">
        <IconeTopo icone={IdCard} />
        <h1 className="text-2xl font-bold text-slate-900">Identificação</h1>
        <p className="mt-2 text-slate-500">Digite a matrícula do eleitor.</p>
        <div key={erro} className={erro ? 'animate-tremer' : ''}>
          <input
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            aria-label="Matrícula do eleitor"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            required
            className="entrada mt-6 text-center text-3xl font-semibold tracking-widest"
          />
        </div>
        {erro && (
          <div className="mt-4">
            <Alerta>{erro}</Alerta>
          </div>
        )}
        <button className="btn btn-lg mt-6 w-full" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Continuar'}
        </button>
      </form>
    )
  } else if (etapa === 'candidato') {
    conteudo = (
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            <UserRound className="h-4 w-4 text-cor" />
            {eleitor}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Escolha seu candidato</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {candidatos.map((c, i) => (
            <button
              key={c.id}
              onClick={() => escolher(c)}
              style={{ animationDelay: `${i * 50}ms` }}
              className="group flex animate-entrar flex-col items-center rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-cor/10 hover:ring-2 hover:ring-cor active:scale-95"
            >
              <Foto url={c.foto_url} className="h-24 w-24 transition group-hover:ring-cor/20 sm:h-28 sm:w-28" />
              <span className="mt-4 text-3xl font-extrabold text-cor">{c.numero}</span>
              <span className="mt-1 font-semibold leading-tight text-slate-800">{c.nome}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="btn-sec" onClick={reiniciar}>
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </button>
        </div>
      </div>
    )
  } else if (etapa === 'confirmar') {
    conteudo = (
      <div className="cartao w-full max-w-md p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Confirme seu voto</p>
        <div className="mt-6 flex flex-col items-center">
          <div className="animate-pop">
            <Foto url={escolha.foto_url} className="h-36 w-36" />
          </div>
          <span className="mt-5 text-5xl font-extrabold text-cor">{escolha.numero}</span>
          <span className="mt-1 text-xl font-semibold text-slate-900">{escolha.nome}</span>
        </div>
        {erro && (
          <div className="mt-6">
            <Alerta>{erro}</Alerta>
          </div>
        )}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button className="btn-sec btn-lg" onClick={() => setEtapa('candidato')} disabled={enviando}>
            Corrigir
          </button>
          <button className="btn-confirmar btn-lg" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Gravando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  } else {
    conteudo = (
      <div className="cartao w-full max-w-md p-8 text-center">
        <ChecAnimado />
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Voto registrado!</h1>
        <p className="mt-2 text-slate-500">Obrigado por participar.</p>
        <Contagem restante={restante} total={ESPERA_SEGUNDOS} />
        <p className="mt-3 text-sm text-slate-400">Aguarde para liberar o próximo eleitor.</p>
      </div>
    )
  }

  return (
    <>
      <Cabecalho>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium ring-1 ring-white/25">
          <MapPin className="h-3.5 w-3.5" />
          {sessao.base} · {sessao.tag}
        </span>
      </Cabecalho>
      <Palco>
        {/* A key troca a cada etapa e faz a tela entrar animada */}
        <div key={fechada ? 'fechada' : etapa} className="flex w-full animate-entrar justify-center">
          {conteudo}
        </div>
      </Palco>
    </>
  )
}

function ChecAnimado() {
  return (
    <div className="mx-auto flex h-24 w-24 animate-pop items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
      <svg
        viewBox="0 0 24 24"
        className="h-12 w-12"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="48" className="animate-desenhar" />
      </svg>
    </div>
  )
}

// Anel que vai esvaziando junto com a contagem regressiva
function Contagem({ restante, total }) {
  const raio = 26
  const circunferencia = 2 * Math.PI * raio
  return (
    <div className="relative mx-auto mt-8 h-20 w-20">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={raio} fill="none" strokeWidth="5" className="stroke-slate-100" />
        <circle
          cx="32"
          cy="32"
          r={raio}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - restante / total)}
          className="stroke-cor transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums text-slate-800">
        {restante}
      </span>
    </div>
  )
}
