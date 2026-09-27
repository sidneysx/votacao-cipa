import { useCallback, useEffect, useState } from 'react'
import { enviarImagem, mensagemErro, supabase } from '../../lib/supabase.js'

const VAZIO = { id: null, numero: '', nome: '', foto_url: null, ativo: true }

export default function Candidatos() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('candidatos').select('*').order('numero')
    if (error) return setErro(mensagemErro(error))
    setLista(data)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function trocarFoto(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    try {
      setForm({ ...form, foto_url: await enviarImagem(arquivo, 'candidato') })
    } catch (error) {
      setErro(mensagemErro(error))
    }
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const dados = { numero: Number(form.numero), nome: form.nome, foto_url: form.foto_url, ativo: form.ativo }
    const { error } = form.id
      ? await supabase.from('candidatos').update(dados).eq('id', form.id)
      : await supabase.from('candidatos').insert(dados)
    if (error) return setErro(mensagemErro(error))
    setForm(VAZIO)
    carregar()
  }

  async function excluir(c) {
    if (!window.confirm(`Excluir ${c.nome}?`)) return
    const { error } = await supabase.from('candidatos').delete().eq('id', c.id)
    if (error) {
      return setErro(
        error.code === '23503'
          ? `${c.nome} já recebeu votos e não pode ser excluído. Desmarque "Ativo" para tirá-lo da urna.`
          : mensagemErro(error),
      )
    }
    carregar()
  }

  return (
    <>
      <form className="cartao" onSubmit={salvar}>
        <h2>{form.id ? 'Editar candidato' : 'Novo candidato'}</h2>
        <div className="linha">
          <label className="curto">
            Número
            <input
              type="number"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              required
            />
          </label>
          <label>
            Nome
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </label>
        </div>
        <label>
          Foto (opcional)
          <input type="file" accept="image/*" onChange={trocarFoto} />
        </label>
        {form.foto_url && <img src={form.foto_url} alt="" className="foto-previa" />}
        <label className="check">
          <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
          Ativo (aparece na urna)
        </label>
        {erro && <p className="erro">{erro}</p>}
        <div className="acoes">
          {form.id && (
            <button type="button" className="secundario" onClick={() => setForm(VAZIO)}>
              Cancelar
            </button>
          )}
          <button>{form.id ? 'Salvar alterações' : 'Adicionar'}</button>
        </div>
      </form>

      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Foto</th>
              <th>Nome</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td>{c.numero}</td>
                <td>{c.foto_url && <img src={c.foto_url} alt="" className="miniatura" />}</td>
                <td>{c.nome}</td>
                <td>{c.ativo ? 'Ativo' : 'Inativo'}</td>
                <td className="acoes-tabela">
                  <button className="secundario" onClick={() => setForm({ ...c, numero: String(c.numero) })}>
                    Editar
                  </button>
                  <button className="excluir" onClick={() => excluir(c)}>Excluir</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={5} className="aviso">Nenhum candidato cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
