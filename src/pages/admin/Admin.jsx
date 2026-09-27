import { useEffect, useState } from 'react'
import Cabecalho from '../../components/Cabecalho.jsx'
import { mensagemErro, supabase } from '../../lib/supabase.js'
import { PainelResultado } from '../Resultado.jsx'
import Bases from './Bases.jsx'
import Candidatos from './Candidatos.jsx'
import Configuracoes from './Configuracoes.jsx'
import Dispositivos from './Dispositivos.jsx'
import Eleitores from './Eleitores.jsx'

const ABAS = [
  { id: 'config', rotulo: 'Configurações', Componente: Configuracoes },
  { id: 'candidatos', rotulo: 'Candidatos', Componente: Candidatos },
  { id: 'bases', rotulo: 'Bases', Componente: Bases },
  { id: 'dispositivos', rotulo: 'Dispositivos', Componente: Dispositivos },
  { id: 'eleitores', rotulo: 'Eleitores', Componente: Eleitores },
  { id: 'resultado', rotulo: 'Resultado', Componente: PainelResultado },
]

export default function Admin() {
  const [sessao, setSessao] = useState(undefined)
  const [ehAdmin, setEhAdmin] = useState(null)
  const [aba, setAba] = useState('config')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) return
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => setEhAdmin(Boolean(data)))
  }, [sessao])

  if (sessao === undefined) return null
  if (!sessao) return <Login />

  const sair = <button className="secundario" onClick={() => supabase.auth.signOut()}>Sair</button>

  if (ehAdmin === null) return <Cabecalho>{sair}</Cabecalho>
  if (!ehAdmin) {
    return (
      <>
        <Cabecalho>{sair}</Cabecalho>
        <main><p className="erro">Este usuário não tem permissão de administrador.</p></main>
      </>
    )
  }

  const { Componente } = ABAS.find((a) => a.id === aba)

  return (
    <>
      <Cabecalho>{sair}</Cabecalho>
      <nav className="abas">
        {ABAS.map((a) => (
          <button key={a.id} className={a.id === aba ? 'ativa' : ''} onClick={() => setAba(a.id)}>
            {a.rotulo}
          </button>
        ))}
      </nav>
      <main>
        <Componente />
      </main>
    </>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setEnviando(false)
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : mensagemErro(error))
  }

  return (
    <>
      <Cabecalho />
      <main className="centro">
        <form className="cartao estreito" onSubmit={entrar}>
          <h1>Painel administrativo</h1>
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </main>
    </>
  )
}
