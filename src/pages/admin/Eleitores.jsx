import { CheckCheck, ListChecks, Search, Trash2, Upload, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Alerta, Estatistica, Selo, TituloSecao, Vazio } from '../../components/ui.jsx'
import { formatar } from '../../lib/datas.js'
import { buscarTodos, mensagemErro, supabase } from '../../lib/supabase.js'

// Aceita "matricula;nome", "matricula,nome" ou separado por tab (colado do Excel).
function lerLista(texto) {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.split(/[;\t,]/).map((parte) => parte.trim()))
    .filter(([matricula, nome]) => matricula && nome && /\d/.test(matricula))
    .map(([matricula, nome]) => ({ matricula, nome }))
}

export default function Eleitores() {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [matricula, setMatricula] = useState('')
  const [nome, setNome] = useState('')
  const [importacao, setImportacao] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const carregar = useCallback(async () => {
    try {
      setLista(
        await buscarTodos(() => supabase.from('eleitores').select('*, bases(nome)').order('nome')),
      )
    } catch (error) {
      setErro(mensagemErro(error))
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')
    const { error } = await supabase.from('eleitores').insert({ matricula: matricula.trim(), nome: nome.trim() })
    if (error) return setErro(mensagemErro(error))
    setMatricula('')
    setNome('')
    carregar()
  }

  async function importar(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')
    const linhas = lerLista(importacao)
    if (linhas.length === 0) return setErro('Nenhuma linha válida. Use o formato: matrícula;nome')
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await supabase
        .from('eleitores')
        .upsert(linhas.slice(i, i + 500), { onConflict: 'matricula' })
      if (error) return setErro(mensagemErro(error))
    }
    setMensagem(`${linhas.length} eleitores importados.`)
    setImportacao('')
    carregar()
  }

  async function excluir(el) {
    if (!window.confirm(`Excluir ${el.nome} (${el.matricula})?`)) return
    const { error } = await supabase.from('eleitores').delete().eq('matricula', el.matricula)
    if (error) return setErro(mensagemErro(error))
    carregar()
  }

  const termo = busca.trim().toLowerCase()
  const filtrados = termo
    ? lista.filter((el) => el.nome.toLowerCase().includes(termo) || el.matricula.includes(termo))
    : lista
  const votaram = lista.filter((el) => el.votou).length
  const participacao = lista.length ? Math.round((votaram / lista.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Estatistica icone={Users} rotulo="eleitores" valor={lista.length} />
        <Estatistica icone={CheckCheck} rotulo="já votaram" valor={votaram} />
        <Estatistica icone={ListChecks} rotulo="de participação" valor={`${participacao}%`}>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-cor transition-all duration-700"
              style={{ width: `${participacao}%` }}
            />
          </div>
        </Estatistica>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={adicionar} className="cartao space-y-4">
          <TituloSecao icone={UserPlus} titulo="Adicionar eleitor" />
          <label className="campo">
            Matrícula
            <input className="entrada" value={matricula} onChange={(e) => setMatricula(e.target.value)} required />
          </label>
          <label className="campo">
            Nome
            <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <div className="flex justify-end">
            <button className="btn">Adicionar</button>
          </div>
        </form>

        <form onSubmit={importar} className="cartao space-y-4">
          <TituloSecao
            icone={Upload}
            titulo="Importar lista"
            descricao="Uma pessoa por linha: matrícula;nome. Dá para copiar duas colunas do Excel e colar aqui. Matrícula repetida atualiza o nome."
          />
          <textarea
            className="entrada font-mono text-sm"
            rows={5}
            value={importacao}
            onChange={(e) => setImportacao(e.target.value)}
            placeholder={'12345;Maria da Silva\n67890;João Souza'}
          />
          <div className="flex justify-end">
            <button className="btn">Importar</button>
          </div>
        </form>
      </div>

      <Alerta>{erro}</Alerta>
      <Alerta tipo="ok">{mensagem}</Alerta>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="entrada pl-10"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou matrícula"
          aria-label="Buscar eleitor"
        />
      </div>

      {filtrados.length === 0 ? (
        <Vazio icone={Users}>Nenhum eleitor encontrado.</Vazio>
      ) : (
        <div className="tabela-caixa">
          <table className="tabela">
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>Nome</th>
                <th>Votou?</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 300).map((el) => (
                <tr key={el.matricula}>
                  <td className="font-mono text-slate-500">{el.matricula}</td>
                  <td className="font-medium text-slate-900">{el.nome}</td>
                  <td>
                    {el.votou ? (
                      <Selo cor="verde">Sim — {el.bases?.nome}, {formatar(el.votou_em)}</Selo>
                    ) : (
                      <Selo cor="cinza">Não</Selo>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn-icone-perigo h-8 w-8"
                      title={el.votou ? 'Quem já votou não pode ser excluído' : 'Excluir'}
                      onClick={() => excluir(el)}
                      disabled={el.votou}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtrados.length > 300 && (
        <p className="dica">Mostrando 300 de {filtrados.length}. Use a busca para filtrar.</p>
      )}
    </div>
  )
}
