import { useCallback, useEffect, useState } from 'react'
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

  return (
    <>
      <div className="resumo">
        <div><strong>{lista.length}</strong> eleitores</div>
        <div><strong>{votaram}</strong> já votaram</div>
        <div><strong>{lista.length ? Math.round((votaram / lista.length) * 100) : 0}%</strong> de participação</div>
      </div>

      <div className="colunas">
        <form className="cartao" onSubmit={adicionar}>
          <h2>Adicionar eleitor</h2>
          <label>
            Matrícula
            <input value={matricula} onChange={(e) => setMatricula(e.target.value)} required />
          </label>
          <label>
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <button>Adicionar</button>
        </form>

        <form className="cartao" onSubmit={importar}>
          <h2>Importar lista</h2>
          <p className="dica">
            Uma pessoa por linha: <code>matrícula;nome</code>. Dá para copiar duas colunas do Excel e colar aqui.
            Matrícula repetida atualiza o nome.
          </p>
          <textarea rows={6} value={importacao} onChange={(e) => setImportacao(e.target.value)} />
          <button>Importar</button>
        </form>
      </div>

      {erro && <p className="erro">{erro}</p>}
      {mensagem && <p className="sucesso">{mensagem}</p>}

      <label>
        Buscar
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou matrícula" />
      </label>

      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr><th>Matrícula</th><th>Nome</th><th>Votou?</th><th /></tr>
          </thead>
          <tbody>
            {filtrados.slice(0, 300).map((el) => (
              <tr key={el.matricula}>
                <td>{el.matricula}</td>
                <td>{el.nome}</td>
                <td>
                  {el.votou
                    ? <span className="status ok">Sim — {el.bases?.nome}, {formatar(el.votou_em)}</span>
                    : <span className="status pendente">Não</span>}
                </td>
                <td className="acoes-tabela">
                  <button className="excluir" onClick={() => excluir(el)} disabled={el.votou}>Excluir</button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={4} className="aviso">Nenhum eleitor encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtrados.length > 300 && <p className="dica">Mostrando 300 de {filtrados.length}. Use a busca para filtrar.</p>}
    </>
  )
}
