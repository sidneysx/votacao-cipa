import { useEffect, useState } from 'react'
import Cabecalho from '../components/Cabecalho.jsx'
import TabelaResultado from '../components/TabelaResultado.jsx'
import { useConfig } from '../config.jsx'
import { formatar, situacaoVotacao } from '../lib/datas.js'
import { mensagemErro, supabase } from '../lib/supabase.js'

export function PainelResultado() {
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

  if (!config) return <p>Carregando…</p>
  if (!encerrada) {
    return (
      <p className="aviso">
        {config.fim
          ? `O resultado fica disponível após o encerramento da votação, em ${formatar(config.fim)}.`
          : 'O horário de encerramento ainda não foi definido.'}
      </p>
    )
  }
  if (erro) return <p className="erro">{erro}</p>
  if (!dados) return <p>Carregando…</p>
  return <TabelaResultado linhas={dados.linhas} candidatos={dados.candidatos} />
}

export default function Resultado() {
  return (
    <>
      <Cabecalho />
      <main>
        <h1>Resultado</h1>
        <PainelResultado />
      </main>
    </>
  )
}
