import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alerta, Carregando, Vazio } from '../../components/ui.jsx'
import { useConfig } from '../../config.jsx'
import { apurar } from '../../lib/apuracao.js'
import { situacaoVotacao } from '../../lib/datas.js'
import { buscarTodos, mensagemErro, supabase } from '../../lib/supabase.js'
import ApuracaoVotos from './documentos/ApuracaoVotos.jsx'

// Cada documento: { id, titulo, descricao, Modelo ou Tela, depois?, paisagem? }
// ctx = { candidatos, bases: [{ id, nome }], eleitores, apuracao }.
// Modelo recebe { config, ctx } e ganha a tela padrão: prévia A4 + imprimir/PDF.
// Tela recebe { config, ctx, voltar } e cuida de tudo sozinha (cadastros, Excel...).
// depois: true = só libera após o encerramento (apuracao só existe então).
// paisagem: true = folha A4 deitada (só para Modelo).
const DOCUMENTOS = [
  {
    id: 'apuracao',
    titulo: 'Apuração de votos',
    descricao: 'Planilha em Excel com eleitos, tempo de serviço, indicados pelo empregador e designados.',
    Tela: ApuracaoVotos,
    depois: true,
  },
]

export default function Documentos() {
  const { config } = useConfig()
  const [ctx, setCtx] = useState(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null)
  const encerrada = situacaoVotacao(config) === 'encerrada'

  useEffect(() => {
    if (!config) return
    async function carregar() {
      const [candidatos, bases, resultado] = await Promise.all([
        supabase.from('candidatos').select('*').order('numero'),
        supabase.from('bases').select('id, nome').order('nome'),
        encerrada ? supabase.rpc('resultado') : Promise.resolve({ data: null }),
      ])
      const error = candidatos.error || bases.error || resultado.error
      if (error) throw error
      const eleitores = await buscarTodos(() =>
        supabase.from('eleitores').select('*, bases(nome)').order('nome'),
      )
      setCtx({
        candidatos: candidatos.data.filter((c) => c.ativo),
        bases: bases.data,
        eleitores,
        apuracao:
          resultado.data &&
          apurar(resultado.data, candidatos.data, config.titulares ?? 1, config.suplentes ?? 0),
      })
    }
    carregar().catch((error) => setErro(mensagemErro(error)))
  }, [config, encerrada])

  if (erro) return <Alerta>{erro}</Alerta>
  if (!config || !ctx) return <Carregando />
  if (DOCUMENTOS.length === 0) return <Vazio icone={FileText}>Nenhum documento cadastrado ainda.</Vazio>

  const documento = DOCUMENTOS.find((d) => d.id === aberto)
  if (documento?.Tela) return <documento.Tela config={config} ctx={ctx} voltar={() => setAberto(null)} />
  if (documento) {
    const folha = <documento.Modelo config={config} ctx={ctx} />
    const classe = `documento ${documento.paisagem ? 'paisagem' : ''}`
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-sec" onClick={() => setAberto(null)}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <button className="btn" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir / salvar PDF
          </button>
          <p className="dica">Para gerar o PDF, escolha “Salvar como PDF” na janela de impressão.</p>
        </div>
        <div className="overflow-x-auto">
          <article className={`${classe} folha`}>{folha}</article>
        </div>
        {/* Cópia usada só na impressão, fora do layout do painel */}
        {createPortal(<article className={`${classe} area-impressao`}>{folha}</article>, document.body)}
      </div>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {DOCUMENTOS.map((d) => {
        const bloqueado = d.depois && !encerrada
        return (
          <li key={d.id}>
            <button
              onClick={() => setAberto(d.id)}
              disabled={bloqueado}
              title={bloqueado ? 'Liberado após o encerramento da votação' : undefined}
              className="cartao flex h-full w-full items-start gap-3 p-4 text-left transition hover:ring-cor/40 disabled:pointer-events-none disabled:opacity-50"
            >
              <div className="rounded-lg bg-cor/10 p-2 text-cor">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">{d.titulo}</div>
                <div className="dica">{d.descricao}</div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
