import { useEffect, useRef, useState } from 'react'
import Cabecalho from '../components/Cabecalho.jsx'
import { useConfig } from '../config.jsx'
import { formatar, situacaoVotacao } from '../lib/datas.js'
import { mensagemErro, supabase } from '../lib/supabase.js'

const CHAVE_TOKEN = 'cipa_token_dispositivo'

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
        <main className="centro"><p>Carregando…</p></main>
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
      <main className="centro">
        <form className="cartao estreito" onSubmit={ativar}>
          <h1>Ativar urna</h1>
          <p>Mesário: digite o código de ativação deste dispositivo, gerado no painel do administrador.</p>
          {aviso && <p className="aviso">{aviso}</p>}
          <label>
            Código de ativação
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              required
            />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button disabled={enviando}>{enviando ? 'Ativando…' : 'Ativar'}</button>
        </form>
      </main>
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
  const timer = useRef(null)

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
    return () => {
      clearInterval(id)
      clearTimeout(timer.current)
    }
  }, [])

  function reiniciar() {
    clearTimeout(timer.current)
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
      p_candidato: escolha?.id ?? null,
    })
    setEnviando(false)
    if (error) return tratarErro(error)
    tocarConfirmacao()
    setEtapa('fim')
    timer.current = setTimeout(reiniciar, 4000)
  }

  const situacao = situacaoVotacao(config)

  return (
    <>
      <Cabecalho>
        <span className="etiqueta">{sessao.base} · {sessao.tag}</span>
      </Cabecalho>
      <main className="centro">
        {situacao !== 'aberta' && etapa === 'matricula' ? (
          <div className="cartao estreito">
            <h1>Urna fechada</h1>
            {situacao === 'sem-horario' && <p>O horário da votação ainda não foi definido.</p>}
            {situacao === 'antes' && <p>A votação começa em {formatar(config.inicio)}.</p>}
            {situacao === 'encerrada' && <p>A votação foi encerrada em {formatar(config.fim)}.</p>}
          </div>
        ) : etapa === 'matricula' ? (
          <form className="cartao estreito" onSubmit={verificar}>
            <h1>Identificação</h1>
            <label>
              Matrícula do eleitor
              <input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                required
              />
            </label>
            {erro && <p className="erro">{erro}</p>}
            <button disabled={enviando}>{enviando ? 'Verificando…' : 'Continuar'}</button>
          </form>
        ) : etapa === 'candidato' ? (
          <div className="cartao largo">
            <h1>Escolha seu candidato</h1>
            <p>Eleitor: <strong>{eleitor}</strong></p>
            <div className="grade-candidatos">
              {candidatos.map((c) => (
                <button
                  key={c.id}
                  className="candidato"
                  onClick={() => {
                    setEscolha(c)
                    setEtapa('confirmar')
                  }}
                >
                  {c.foto_url ? <img src={c.foto_url} alt="" /> : <div className="sem-foto" />}
                  <span className="numero">{c.numero}</span>
                  <span>{c.nome}</span>
                </button>
              ))}
              <button
                className="candidato branco"
                onClick={() => {
                  setEscolha(null)
                  setEtapa('confirmar')
                }}
              >
                <span className="numero">—</span>
                <span>Votar em branco</span>
              </button>
            </div>
            <button className="secundario" onClick={reiniciar}>Cancelar</button>
          </div>
        ) : etapa === 'confirmar' ? (
          <div className="cartao estreito">
            <h1>Confirme seu voto</h1>
            {escolha ? (
              <div className="confirmacao">
                {escolha.foto_url && <img src={escolha.foto_url} alt="" />}
                <span className="numero">{escolha.numero}</span>
                <strong>{escolha.nome}</strong>
              </div>
            ) : (
              <div className="confirmacao"><strong>Voto em branco</strong></div>
            )}
            {erro && <p className="erro">{erro}</p>}
            <div className="acoes">
              <button className="secundario" onClick={() => setEtapa('candidato')} disabled={enviando}>
                Corrigir
              </button>
              <button className="confirmar" onClick={confirmar} disabled={enviando}>
                {enviando ? 'Gravando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="cartao estreito">
            <h1>Voto registrado!</h1>
            <p>Obrigado por participar.</p>
            <button onClick={reiniciar}>Próximo eleitor</button>
          </div>
        )}
      </main>
    </>
  )
}
