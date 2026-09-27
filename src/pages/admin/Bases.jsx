import { Building2, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Alerta, TituloSecao, Vazio } from '../../components/ui.jsx'
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

  function cancelar() {
    setEditando(null)
    setNome('')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="cartao space-y-4">
        <TituloSecao
          icone={editando ? Pencil : Building2}
          titulo={editando ? 'Renomear base' : 'Nova base'}
          descricao="Cada voto é contado na base do dispositivo em que foi feito."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="entrada flex-1"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da base / regional"
            aria-label="Nome da base"
            required
          />
          {editando && (
            <button type="button" className="btn-sec" onClick={cancelar}>
              Cancelar
            </button>
          )}
          <button className="btn">{editando ? 'Salvar' : 'Adicionar'}</button>
        </div>
        <Alerta>{erro}</Alerta>
      </form>

      {lista.length === 0 ? (
        <Vazio icone={Building2}>Nenhuma base cadastrada.</Vazio>
      ) : (
        <ul className="cartao divide-y divide-slate-100 p-0">
          {lista.map((b, i) => (
            <li
              key={b.id}
              style={{ animationDelay: `${i * 30}ms` }}
              className={`flex animate-entrar items-center gap-3 px-5 py-3.5 transition-colors ${editando === b.id ? 'bg-cor/5' : 'hover:bg-slate-50/70'}`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-cor" />
              <span className="flex-1 font-medium text-slate-800">{b.nome}</span>
              <button
                className="btn-icone"
                title="Renomear"
                onClick={() => {
                  setEditando(b.id)
                  setNome(b.nome)
                }}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button className="btn-icone-perigo" title="Excluir" onClick={() => excluir(b)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
