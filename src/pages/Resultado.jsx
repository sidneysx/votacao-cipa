import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import Cabecalho from '../components/Cabecalho.jsx'
import TabelaResultado from '../components/TabelaResultado.jsx'
import { Alerta, Carregando, Vazio } from '../components/ui.jsx'
import { useConfig } from '../config.jsx'
import { formatar, situacaoVotacao } from '../lib/datas.js'
import { mensagemErro, supabase } from '../lib/supabase.js'

export function PainelResultado({ completo = true }) {
  const { config } = useConfig()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const encerrada = situacaoVotacao(config) === 'encerrada'

  useEffect(() => {
    if (!encerrada) return
    Promise.all([
      supabase.rpc('resultado'),
      supabase.from('candidatos').select('*').order('numero'),
    ]).then(([resultado, candidatos]) => {
      const error = resultado.error || candidatos.error
      if (error) return setErro(mensagemErro(error))
      setDados({ linhas: resultado.data, candidatos: candidatos.data })
    })
  }, [encerrada])

  if (!config) return <Carregando />
  if (!encerrada) {
    return (
      <Vazio icone={Clock}>
        {config.fim
          ? `O resultado fica disponível após o encerramento da votação, em ${formatar(config.fim)}.`
          : 'O horário de encerramento ainda não foi definido.'}
      </Vazio>
    )
  }
  if (erro) return <Alerta>{erro}</Alerta>
  if (!dados) return <Carregando texto="Apurando…" />
  return (
    <TabelaResultado
      linhas={dados.linhas}
      candidatos={dados.candidatos}
      titulares={config.titulares ?? 1}
      suplentes={config.suplentes ?? 0}
      completo={completo}
    />
  )
}

export default function Resultado() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-6 animate-entrar text-3xl font-bold tracking-tight text-slate-900">Resultado</h1>
        <PainelResultado completo={false} />
      </main>
    </>
  )
}
