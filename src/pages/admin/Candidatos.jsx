import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Alerta, Foto, Selo, TituloSecao, Vazio } from '../../components/ui.jsx'
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

  function editar(c) {
    setForm({ ...c, numero: String(c.numero) })
    setErro('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="cartao space-y-5">
        <TituloSecao
          icone={form.id ? Pencil : UserPlus}
          titulo={form.id ? 'Editar candidato' : 'Novo candidato'}
          descricao="Número, nome e foto que aparecem na urna."
        />
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <label className="campo">
            Número
            <input
              className="entrada"
              type="number"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              required
            />
          </label>
          <label className="campo">
            Nome
            <input
              className="entrada"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <Foto url={form.foto_url} className="h-16 w-16" />
          <label className="campo flex-1">
            Foto (opcional)
            <input type="file" accept="image/*" onChange={trocarFoto} className="entrada-arquivo" />
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="h-5 w-5 cursor-pointer rounded accent-cor"
          />
          Ativo (aparece na urna)
        </label>
        <Alerta>{erro}</Alerta>
        <div className="flex justify-end gap-3">
          {form.id && (
            <button type="button" className="btn-sec" onClick={() => setForm(VAZIO)}>
              Cancelar
            </button>
          )}
          <button className="btn">{form.id ? 'Salvar alterações' : 'Adicionar candidato'}</button>
        </div>
      </form>

      {lista.length === 0 ? (
        <Vazio icone={Users}>Nenhum candidato cadastrado.</Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c, i) => (
            <div
              key={c.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`cartao flex animate-entrar items-center gap-4 p-4 transition hover:shadow-md ${form.id === c.id ? 'ring-2 ring-cor' : ''}`}
            >
              <Foto url={c.foto_url} className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-extrabold leading-none text-cor">{c.numero}</div>
                <div className="mt-1 truncate font-semibold text-slate-900">{c.nome}</div>
                <div className="mt-1.5">
                  <Selo cor={c.ativo ? 'verde' : 'cinza'}>{c.ativo ? 'Ativo' : 'Inativo'}</Selo>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="btn-icone" title="Editar" onClick={() => editar(c)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="btn-icone-perigo" title="Excluir" onClick={() => excluir(c)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
