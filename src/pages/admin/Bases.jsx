import { useCallback, useEffect, useState } from 'react'
import { mensagemErro, supabase } from '../../lib/supabase.js'

export default function Bases() {
  const [lista, setLista] = useState([])
  const [nome, setNome] = useState('')
  const [editando, setEditando] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('bases').select('*').order('nome')
    if (error) return setErro(mensagemErro(error))
    setLista(data)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const { error } = editando
      ? await supabase.from('bases').update({ nome }).eq('id', editando)
      : await supabase.from('bases').insert({ nome })
    if (error) return setErro(mensagemErro(error))
    setNome('')
    setEditando(null)
    carregar()
  }

  async function excluir(b) {
    if (!window.confirm(`Excluir a base ${b.nome}?`)) return
    const { error } = await supabase.from('bases').delete().eq('id', b.id)
    if (error) {
      return setErro(
        error.code === '23503'
          ? `A base ${b.nome} tem dispositivos ou votos ligados a ela e não pode ser excluída.`
          : mensagemErro(error),
      )
    }
    carregar()
  }

  return (
    <>
      <form className="cartao" onSubmit={salvar}>
        <h2>{editando ? 'Renomear base' : 'Nova base'}</h2>
        <label>
          Nome da base / regional
          <input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <div className="acoes">
          {editando && (
            <button type="button" className="secundario" onClick={() => { setEditando(null); setNome('') }}>
              Cancelar
            </button>
          )}
          <button>{editando ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </form>

      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr><th>Base</th><th /></tr>
          </thead>
          <tbody>
            {lista.map((b) => (
              <tr key={b.id}>
                <td>{b.nome}</td>
                <td className="acoes-tabela">
                  <button className="secundario" onClick={() => { setEditando(b.id); setNome(b.nome) }}>
                    Renomear
                  </button>
                  <button className="excluir" onClick={() => excluir(b)}>Excluir</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={2} className="aviso">Nenhuma base cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
