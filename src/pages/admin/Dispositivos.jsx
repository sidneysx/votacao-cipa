import { KeyRound, Lock, LockOpen, MapPin, MonitorSmartphone, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Alerta, Selo, TituloSecao, Vazio } from '../../components/ui.jsx'
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
    <div className="space-y-6">
      <form onSubmit={adicionar} className="cartao space-y-5">
        <TituloSecao
          icone={MonitorSmartphone}
          titulo="Novo dispositivo"
          descricao="Cada tablet ou computador de votação fica amarrado a uma base. Depois de cadastrar, abra o site no aparelho e digite o código (funciona uma única vez)."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="campo">
            Tag / nome do aparelho
            <input
              className="entrada"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Ex.: TABLET-01"
              required
            />
          </label>
          <label className="campo">
            Base
            <select className="entrada" value={baseId} onChange={(e) => setBaseId(e.target.value)} required>
              <option value="">Selecione…</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </label>
        </div>
        {bases.length === 0 && <Alerta tipo="info">Cadastre as bases primeiro.</Alerta>}
        <Alerta>{erro}</Alerta>
        <div className="flex justify-end">
          <button className="btn">Adicionar dispositivo</button>
        </div>
      </form>

      {lista.length === 0 ? (
        <Vazio icone={MonitorSmartphone}>Nenhum dispositivo cadastrado.</Vazio>
      ) : (
        <div className="space-y-3">
          {lista.map((d, i) => (
            <div
              key={d.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className="cartao flex animate-entrar flex-col gap-4 p-4 lg:flex-row lg:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className={`rounded-xl p-2.5 ${d.ativo ? 'bg-cor/10 text-cor' : 'bg-red-50 text-red-500'}`}>
                  <MonitorSmartphone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{d.tag}</div>
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {d.bases?.nome}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:w-80">
                {!d.ativo ? (
                  <Selo cor="vermelho">Bloqueado</Selo>
                ) : d.token ? (
                  <Selo cor="verde">Ativo desde {formatar(d.ativado_em)}</Selo>
                ) : (
                  <>
                    <Selo cor="amarelo">Aguardando ativação</Selo>
                    <code className="rounded-lg bg-slate-900 px-3 py-1 font-mono text-base font-bold tracking-widest text-white">
                      {exibirCodigo(d.codigo)}
                    </code>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button className="btn-sec btn-sm" onClick={() => novoCodigo(d)}>
                  <KeyRound className="h-3.5 w-3.5" />
                  Novo código
                </button>
                <button className="btn-sec btn-sm" onClick={() => alternarBloqueio(d)}>
                  {d.ativo ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                  {d.ativo ? 'Bloquear' : 'Desbloquear'}
                </button>
                <button className="btn-icone-perigo h-8 w-8" title="Excluir" onClick={() => excluir(d)}>
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
