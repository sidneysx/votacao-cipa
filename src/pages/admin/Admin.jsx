import { Building2, ListChecks, LogOut, MonitorSmartphone, Settings, ShieldCheck, Trophy, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import Cabecalho from '../../components/Cabecalho.jsx'
import { Alerta, Carregando, IconeTopo, Palco } from '../../components/ui.jsx'
import { mensagemErro, supabase } from '../../lib/supabase.js'
import { PainelResultado } from '../Resultado.jsx'
import Bases from './Bases.jsx'
import Candidatos from './Candidatos.jsx'
import Configuracoes from './Configuracoes.jsx'
import Dispositivos from './Dispositivos.jsx'
import Eleitores from './Eleitores.jsx'

const ABAS = [
  { id: 'config', rotulo: 'Configurações', icone: Settings, Componente: Configuracoes },
  { id: 'candidatos', rotulo: 'Candidatos', icone: Users, Componente: Candidatos },
  { id: 'bases', rotulo: 'Bases', icone: Building2, Componente: Bases },
  { id: 'dispositivos', rotulo: 'Dispositivos', icone: MonitorSmartphone, Componente: Dispositivos },
  { id: 'eleitores', rotulo: 'Eleitores', icone: ListChecks, Componente: Eleitores },
  { id: 'resultado', rotulo: 'Resultado', icone: Trophy, Componente: PainelResultado },
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

  const sair = (
    <button className="btn-cabecalho" onClick={() => supabase.auth.signOut()}>
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Sair</span>
    </button>
  )

  if (ehAdmin === null) {
    return (
      <>
        <Cabecalho>{sair}</Cabecalho>
        <Carregando />
      </>
    )
  }
  if (!ehAdmin) {
    return (
      <>
        <Cabecalho>{sair}</Cabecalho>
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
          <Alerta>Este usuário não tem permissão de administrador.</Alerta>
        </main>
      </>
    )
  }

  const atual = ABAS.find((a) => a.id === aba)

  return (
    <>
      <Cabecalho>{sair}</Cabecalho>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:flex md:gap-8 md:py-8">
        <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 pb-1 md:sticky md:top-24 md:mx-0 md:mb-0 md:w-56 md:shrink-0 md:flex-col md:self-start md:overflow-visible md:px-0">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                id === aba
                  ? 'bg-cor text-white shadow-md shadow-cor/25'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              <Icone className="h-4 w-4" />
              {rotulo}
            </button>
          ))}
        </nav>
        <main key={aba} className="min-w-0 flex-1 animate-entrar">
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">{atual.rotulo}</h1>
          <atual.Componente />
        </main>
      </div>
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
      <Palco>
        <form onSubmit={entrar} className="cartao w-full max-w-sm animate-entrar space-y-4 p-8">
          <div className="text-center">
            <IconeTopo icone={ShieldCheck} />
            <h1 className="text-2xl font-bold text-slate-900">Painel administrativo</h1>
            <p className="mt-1 text-slate-500">Entre com sua conta de administrador.</p>
          </div>
          <label className="campo">
            E-mail
            <input className="entrada" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="campo">
            Senha
            <input
              className="entrada"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>
          <div key={erro} className={erro ? 'animate-tremer' : ''}>
            <Alerta>{erro}</Alerta>
          </div>
          <button className="btn btn-lg w-full" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </Palco>
    </>
  )
}
