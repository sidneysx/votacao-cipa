import { useCallback, useEffect, useState } from 'react'
import { formatar } from '../../lib/datas.js'
import { mensagemErro, supabase } from '../../lib/supabase.js'

// Sem 0/O e 1/I/L para não confundir na hora de digitar
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function gerarCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('')
}

const exibirCodigo = (codigo) => `${codigo.slice(0, 4)}-${codigo.slice(4)}`

export default function Dispositivos() {
  const [lista, setLista] = useState([])
  const [bases, setBases] = useState([])
  const [tag, setTag] = useState('')
  const [baseId, setBaseId] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [dispositivos, basesResp] = await Promise.all([
      supabase.from('dispositivos').select('*, bases(nome)').order('tag'),
      supabase.from('bases').select('*').order('nome'),
    ])
    const error = dispositivos.error || basesResp.error
    if (error) return setErro(mensagemErro(error))
    setLista(dispositivos.data)
    setBases(basesResp.data)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function executar(promessa) {
    setErro('')
    const { error } = await promessa
    if (error) return setErro(mensagemErro(error))
    carregar()
  }

  async function adicionar(e) {
    e.preventDefault()
    await executar(supabase.from('dispositivos').insert({ tag, base_id: baseId, codigo: gerarCodigo() }))
    setTag('')
  }

  function novoCodigo(d) {
    const aviso = d.token
      ? `Gerar um novo código desconecta o aparelho "${d.tag}" atual. Continuar?`
      : `Gerar um novo código para "${d.tag}"?`
    if (!window.confirm(aviso)) return
    executar(
      supabase.from('dispositivos').update({ codigo: gerarCodigo(), token: null, ativado_em: null }).eq('id', d.id),
    )
  }

  function alternarBloqueio(d) {
    executar(supabase.from('dispositivos').update({ ativo: !d.ativo }).eq('id', d.id))
  }

  function excluir(d) {
    if (!window.confirm(`Excluir o dispositivo "${d.tag}"?`)) return
    executar(supabase.from('dispositivos').delete().eq('id', d.id))
  }

  return (
    <>
      <form className="cartao" onSubmit={adicionar}>
        <h2>Novo dispositivo</h2>
        <p className="dica">
          Cadastre cada tablet ou computador de votação. Todo voto feito nele conta para a base escolhida aqui.
          Depois, abra o site no aparelho e digite o código de ativação (só funciona uma vez).
        </p>
        <div className="linha">
          <label>
            Tag / nome do aparelho
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex.: TABLET-01" required />
          </label>
          <label>
            Base
            <select value={baseId} onChange={(e) => setBaseId(e.target.value)} required>
              <option value="">Selecione…</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </label>
        </div>
        {bases.length === 0 && <p className="aviso">Cadastre as bases primeiro.</p>}
        {erro && <p className="erro">{erro}</p>}
        <button>Adicionar</button>
      </form>

      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr><th>Tag</th><th>Base</th><th>Situação</th><th /></tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id}>
                <td>{d.tag}</td>
                <td>{d.bases?.nome}</td>
                <td>
                  {!d.ativo ? (
                    <span className="status bloqueado">Bloqueado</span>
                  ) : d.token ? (
                    <span className="status ok">Ativo desde {formatar(d.ativado_em)}</span>
                  ) : (
                    <span className="status pendente">
                      Aguardando ativação — código <code>{exibirCodigo(d.codigo)}</code>
                    </span>
                  )}
                </td>
                <td className="acoes-tabela">
                  <button className="secundario" onClick={() => novoCodigo(d)}>Novo código</button>
                  <button className="secundario" onClick={() => alternarBloqueio(d)}>
                    {d.ativo ? 'Bloquear' : 'Desbloquear'}
                  </button>
                  <button className="excluir" onClick={() => excluir(d)}>Excluir</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={4} className="aviso">Nenhum dispositivo cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
