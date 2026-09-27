import { CalendarClock, Palette, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Alerta, Carregando, TituloSecao } from '../../components/ui.jsx'
import { useConfig } from '../../config.jsx'
import { deInput, paraInput } from '../../lib/datas.js'
import { enviarImagem, mensagemErro, supabase } from '../../lib/supabase.js'

export default function Configuracoes() {
  const { config, recarregar } = useConfig()
  if (!config) return <Carregando />
  return <Formulario key={JSON.stringify(config)} config={config} recarregar={recarregar} />
}

function Formulario({ config, recarregar }) {
  const [form, setForm] = useState({
    nome: config.nome,
    cor: config.cor,
    logo_url: config.logo_url,
    inicio: paraInput(config.inicio),
    fim: paraInput(config.fim),
  })
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function trocarLogo(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    try {
      setErro('')
      setForm({ ...form, logo_url: await enviarImagem(arquivo, 'logo') })
    } catch (error) {
      setErro(mensagemErro(error))
    }
  }

  async function salvar(e) {
    e.preventDefault()
    if (form.inicio && form.fim && form.fim <= form.inicio) {
      return setErro('O encerramento precisa ser depois da abertura.')
    }
    setSalvando(true)
    setErro('')
    setMensagem('')
    const { error } = await supabase
      .from('config')
      .update({
        nome: form.nome,
        cor: form.cor,
        logo_url: form.logo_url,
        inicio: deInput(form.inicio),
        fim: deInput(form.fim),
      })
      .eq('id', 1)
    setSalvando(false)
    if (error) return setErro(mensagemErro(error))
    setMensagem('Configurações salvas.')
    recarregar()
  }

  async function novaEleicao() {
    const ok = window.confirm(
      'Isto apaga TODOS os votos e marca todos os eleitores como "não votou".\n' +
        'Candidatos, bases, dispositivos e eleitores continuam cadastrados.\n\nContinuar?',
    )
    if (!ok) return
    const { error } = await supabase.rpc('nova_eleicao')
    if (error) return setErro(mensagemErro(error))
    setMensagem('Votos zerados. Pronto para a nova eleição.')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="cartao space-y-8">
        <section className="space-y-5">
          <TituloSecao icone={Palette} titulo="Aparência" descricao="Nome, cor e logo exibidos em todo o site." />
          <label className="campo">
            Nome da eleição
            <input className="entrada" value={form.nome} onChange={alterar('nome')} required />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="campo">
              Cor principal
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.cor}
                  onChange={alterar('cor')}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
                <span
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors"
                  style={{ backgroundColor: form.cor }}
                >
                  Prévia
                </span>
                <span className="font-mono text-sm text-slate-400">{form.cor}</span>
              </div>
            </label>
            <label className="campo">
              Logo
              <input type="file" accept="image/*" onChange={trocarLogo} className="entrada-arquivo" />
            </label>
          </div>
          {form.logo_url && (
            <div className="flex animate-entrar items-center gap-4 rounded-xl bg-slate-50 p-3">
              <img src={form.logo_url} alt="Logo atual" className="h-14 w-auto rounded-lg bg-white p-1 shadow-sm" />
              <button type="button" className="btn-sec btn-sm" onClick={() => setForm({ ...form, logo_url: null })}>
                Remover logo
              </button>
            </div>
          )}
        </section>

        <section className="space-y-5">
          <TituloSecao
            icone={CalendarClock}
            titulo="Horário da votação"
            descricao="As urnas só aceitam votos nesse intervalo. O resultado só aparece depois do encerramento."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="campo">
              Abertura
              <input className="entrada" type="datetime-local" value={form.inicio} onChange={alterar('inicio')} />
            </label>
            <label className="campo">
              Encerramento
              <input className="entrada" type="datetime-local" value={form.fim} onChange={alterar('fim')} />
            </label>
          </div>
        </section>

        <div className="space-y-3">
          <Alerta>{erro}</Alerta>
          <Alerta tipo="ok">{mensagem}</Alerta>
        </div>
        <div className="flex justify-end">
          <button className="btn btn-lg" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </form>

      <div className="cartao flex flex-col gap-4 bg-red-50/40 ring-red-200 sm:flex-row sm:items-center">
        <div className="rounded-xl bg-red-100 p-2.5 text-red-600 sm:self-start">
          <TriangleAlert className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Nova eleição</h2>
          <p className="dica">
            Use ao começar a eleição do próximo ano: apaga os votos e libera todos os eleitores para votar de novo.
          </p>
        </div>
        <button className="btn-perigo" onClick={novaEleicao}>
          Zerar votos
        </button>
      </div>
    </div>
  )
}
