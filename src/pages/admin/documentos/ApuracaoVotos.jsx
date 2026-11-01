import { ArrowLeft, Building2, FileSpreadsheet, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Alerta, Carregando, Selo, TituloSecao, Vazio } from '../../../components/ui.jsx'
import { mensagemErro, supabase } from '../../../lib/supabase.js'
import { baixarExcel, basesComDesignacao, basesComDesignado, dadosApuracao, textoCurso } from './apuracaoPlanilha.js'

// Apuração de votos no formato da planilha da empresa: cadastro dos indicados pelo
// empregador e dos designados por base, prévia e download em Excel.

function mensagem(error) {
  // Tabela ainda não criada no banco
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return 'Falta rodar a migração supabase/migracoes/2026-09-28-indicados-designados.sql no SQL Editor do Supabase.'
  }
  return mensagemErro(error)
}

export default function ApuracaoVotos({ config, ctx, voltar }) {
  const [indicados, setIndicados] = useState(null)
  const [designados, setDesignados] = useState(null)
  const [erro, setErro] = useState('')
  const [gerando, setGerando] = useState(false)

  const carregar = useCallback(async () => {
    const [ind, des] = await Promise.all([
      supabase.from('indicados').select('*').order('criado_em'),
      supabase.from('designados').select('*'),
    ])
    const error = ind.error || des.error
    if (error) return setErro(mensagem(error))
    setIndicados(ind.data)
    setDesignados(Object.fromEntries(des.data.map((d) => [d.base_id, d.nome])))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function baixar() {
    setGerando(true)
    setErro('')
    try {
      await baixarExcel(config, ctx, indicados, designados)
    } catch (error) {
      setErro(mensagemErro(error))
    } finally {
      setGerando(false)
    }
  }

  const carregado = indicados && designados

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-sec" onClick={voltar}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <button className="btn" onClick={baixar} disabled={!carregado || gerando}>
          <FileSpreadsheet className="h-4 w-4" />
          {gerando ? 'Gerando…' : 'Baixar Excel'}
        </button>
      </div>

      <Alerta>{erro}</Alerta>

      {!carregado ? (
        !erro && <Carregando />
      ) : (
        <>
          <CadastroIndicados lista={indicados} vagas={dadosApuracao(config, ctx).vagas} recarregar={carregar} />
          <CadastroDesignados bases={basesComDesignacao(ctx.bases)} designados={designados} recarregar={carregar} />
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Prévia</h2>
            <div className="overflow-x-auto">
              <div className="documento folha paisagem">
                <Planilha config={config} ctx={ctx} indicados={indicados} designados={designados} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// Cadastros
// ---------------------------------------------------------------------

const VAZIO = { nome: '', status: '', gerencia: '', curso: '' }
const CURSO_FORM = { true: 'sim', false: 'nao' }
const CURSO_BANCO = { sim: true, nao: false }

function CadastroIndicados({ lista, vagas, recarregar }) {
  const [form, setForm] = useState(VAZIO)
  const [editando, setEditando] = useState(null)
  const [erro, setErro] = useState('')

  const alterar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }))

  function cancelar() {
    setEditando(null)
    setForm(VAZIO)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const dados = {
      nome: form.nome.trim(),
      status: form.status || null,
      gerencia: form.gerencia.trim() || null,
      curso: CURSO_BANCO[form.curso] ?? null,
    }
    const { error } = editando
      ? await supabase.from('indicados').update(dados).eq('id', editando)
      : await supabase.from('indicados').insert(dados)
    if (error) return setErro(mensagem(error))
    cancelar()
    recarregar()
  }

  async function excluir(ind) {
    if (!window.confirm(`Excluir ${ind.nome}?`)) return
    const { error } = await supabase.from('indicados').delete().eq('id', ind.id)
    if (error) return setErro(mensagem(error))
    if (editando === ind.id) cancelar()
    recarregar()
  }

  function editar(ind) {
    setEditando(ind.id)
    setForm({
      nome: ind.nome,
      status: ind.status ?? '',
      gerencia: ind.gerencia ?? '',
      curso: CURSO_FORM[ind.curso] ?? '',
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={salvar} className="cartao space-y-4">
        <TituloSecao
          icone={editando ? Pencil : UserPlus}
          titulo={editando ? 'Editar indicado' : 'Indicados pelo empregador'}
          descricao={`A planilha reserva ${vagas} linhas (titulares + suplentes); se cadastrar mais, todos aparecem.`}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="campo">
            Nome
            <input className="entrada" value={form.nome} onChange={alterar('nome')} required />
          </label>
          <label className="campo">
            Status
            <select className="entrada" value={form.status} onChange={alterar('status')}>
              <option value="">—</option>
              <option value="Titular">Titular</option>
              <option value="Suplente">Suplente</option>
            </select>
          </label>
          <label className="campo">
            Gerência
            <input className="entrada" value={form.gerencia} onChange={alterar('gerencia')} />
          </label>
          <label className="campo">
            Curso
            <select className="entrada" value={form.curso} onChange={alterar('curso')}>
              <option value="">Não informado</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </label>
        </div>
        <Alerta>{erro}</Alerta>
        <div className="flex justify-end gap-3">
          {editando && (
            <button type="button" className="btn-sec" onClick={cancelar}>
              Cancelar
            </button>
          )}
          <button className="btn">{editando ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </form>

      {lista.length > 0 && (
        <div className="tabela-caixa">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Gerência</th>
                <th>Curso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((ind) => (
                <tr key={ind.id} className={editando === ind.id ? 'bg-cor/5' : ''}>
                  <td className="font-medium text-slate-900">{ind.nome}</td>
                  <td>{ind.status ? <Selo cor="verde">{ind.status}</Selo> : '—'}</td>
                  <td>{ind.gerencia ?? '—'}</td>
                  <td>
                    {ind.curso === null ? (
                      '—'
                    ) : (
                      <Selo cor={ind.curso ? 'verde' : 'vermelho'}>{ind.curso ? 'Sim' : 'Não'}</Selo>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="inline-flex gap-2">
                      <button className="btn-icone h-8 w-8" title="Editar" onClick={() => editar(ind)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="btn-icone-perigo h-8 w-8" title="Excluir" onClick={() => excluir(ind)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CadastroDesignados({ bases, designados, recarregar }) {
  const [nomes, setNomes] = useState(designados)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setAviso('')
    const preenchidos = bases
      .filter((b) => nomes[b.id]?.trim())
      .map((b) => ({ base_id: b.id, nome: nomes[b.id].trim() }))
    const vazios = bases.filter((b) => !nomes[b.id]?.trim()).map((b) => b.id)

    if (preenchidos.length) {
      const { error } = await supabase.from('designados').upsert(preenchidos)
      if (error) return setErro(mensagem(error))
    }
    if (vazios.length) {
      const { error } = await supabase.from('designados').delete().in('base_id', vazios)
      if (error) return setErro(mensagem(error))
    }
    setAviso('Designados salvos.')
    recarregar()
  }

  return (
    <form onSubmit={salvar} className="cartao space-y-4">
      <TituloSecao
        icone={Building2}
        titulo="Designados da CIPA"
        descricao="Um designado por base (a Matriz não tem). Base deixada em branco não aparece na planilha."
      />
      {bases.length === 0 ? (
        <Vazio icone={Building2}>Cadastre as bases primeiro.</Vazio>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bases.map((b) => (
            <label key={b.id} className="campo">
              {b.nome}
              <input
                className="entrada"
                value={nomes[b.id] ?? ''}
                onChange={(e) => setNomes((atual) => ({ ...atual, [b.id]: e.target.value }))}
                placeholder="Nome do designado"
              />
            </label>
          ))}
        </div>
      )}
      <Alerta>{erro}</Alerta>
      <Alerta tipo="ok">{aviso}</Alerta>
      {bases.length > 0 && (
        <div className="flex justify-end">
          <button className="btn">Salvar designados</button>
        </div>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------
// Prévia (mesmo layout do Excel)
// ---------------------------------------------------------------------

const azul = 'bg-[#5b9bd5] text-white'
const celula = 'border border-black px-1 py-0.5 align-middle'
const cabecalho = `${celula} ${azul} whitespace-nowrap text-center font-bold`
const verde = 'bg-[#92d050]'

function Planilha({ config, ctx, indicados, designados }) {
  const d = dadosApuracao(config, ctx)
  const linhasIndicados = Array.from({ length: Math.max(indicados.length, d.vagas) }, (_, i) => indicados[i])

  return (
    <div className="font-['Calibri',Arial,sans-serif] text-[8.5pt] leading-tight">
      <h1 className={`${azul} mb-2 px-4 py-2 text-center text-[14pt] font-bold`}>{d.titulo}</h1>

      <div className="flex items-start gap-3">
        <table className="min-w-0 flex-1 border-collapse">
          <thead>
            <tr>
              <th className={cabecalho}>Posição</th>
              <th className={cabecalho}>Eleitos - Empregados</th>
              <th className={cabecalho}>Apuração</th>
              <th className={cabecalho}>Status</th>
              <th className={cabecalho}>Gerência</th>
              <th className={cabecalho}>Curso</th>
              <th className={cabecalho}>Tempo de serviço</th>
            </tr>
          </thead>
          <tbody>
            {d.linhas.map((l) => (
              <tr key={l.id}>
                <td className={`${celula} text-center font-bold`}>{l.posicao}</td>
                <td className={`${celula} font-bold`}>{l.nome}</td>
                <td className={`${celula} text-center font-bold`}>{l.votos}</td>
                <td className={`${celula} text-center font-bold ${l.status ? verde : ''}`}>{l.status}</td>
                <td className={celula} />
                <td className={celula} />
                <td className={`${celula} whitespace-nowrap text-center`}>{l.tempo}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="w-[33%] shrink-0 space-y-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cabecalho}>Indicados pelo Empregador</th>
                <th className={cabecalho}>Status</th>
                <th className={cabecalho}>Gerência</th>
                <th className={cabecalho}>Curso</th>
              </tr>
            </thead>
            <tbody>
              {linhasIndicados.map((ind, i) => (
                <tr key={ind?.id ?? i}>
                  <td className={`${celula} h-[1.45em] w-1/2 font-bold`}>{ind?.nome}</td>
                  <td className={`${celula} text-center font-bold uppercase ${ind?.status ? verde : ''}`}>
                    {ind?.status}
                  </td>
                  <td className={`${celula} text-center`}>{ind?.gerencia}</td>
                  <td className={`${celula} text-center font-bold ${ind?.curso === false ? 'bg-[#ff0000]' : ''}`}>
                    {textoCurso(ind?.curso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cabecalho}>Designados da CIPA</th>
                <th className={cabecalho}>Base</th>
              </tr>
            </thead>
            <tbody>
              {basesComDesignado(ctx.bases, designados).map((b) => (
                <tr key={b.id}>
                  <td className={`${celula} w-2/3 font-bold`}>{designados[b.id]}</td>
                  <td className={`${celula} whitespace-nowrap text-center font-bold uppercase`}>{b.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
