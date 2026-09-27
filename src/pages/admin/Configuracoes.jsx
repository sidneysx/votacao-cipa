import { useState } from 'react'
import { useConfig } from '../../config.jsx'
import { deInput, paraInput } from '../../lib/datas.js'
import { enviarImagem, mensagemErro, supabase } from '../../lib/supabase.js'

export default function Configuracoes() {
  const { config, recarregar } = useConfig()
  if (!config) return <p>Carregando…</p>
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
    <>
      <form className="cartao" onSubmit={salvar}>
        <h2>Aparência</h2>
        <label>
          Nome da eleição
          <input value={form.nome} onChange={alterar('nome')} required />
        </label>
        <label>
          Cor principal
          <input type="color" value={form.cor} onChange={alterar('cor')} />
        </label>
        <label>
          Logo
          <input type="file" accept="image/*" onChange={trocarLogo} />
        </label>
        {form.logo_url && (
          <div className="linha">
            <img src={form.logo_url} alt="Logo atual" className="logo-previa" />
            <button type="button" className="secundario" onClick={() => setForm({ ...form, logo_url: null })}>
              Remover logo
            </button>
          </div>
        )}

        <h2>Horário da votação</h2>
        <div className="linha">
          <label>
            Abertura
            <input type="datetime-local" value={form.inicio} onChange={alterar('inicio')} />
          </label>
          <label>
            Encerramento
            <input type="datetime-local" value={form.fim} onChange={alterar('fim')} />
          </label>
        </div>
        <p className="dica">As urnas só aceitam votos entre esses horários. O resultado só aparece depois do encerramento.</p>

        {erro && <p className="erro">{erro}</p>}
        {mensagem && <p className="sucesso">{mensagem}</p>}
        <button disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </form>

      <div className="cartao perigo">
        <h2>Nova eleição</h2>
        <p>Use ao começar a eleição do próximo ano: apaga os votos e libera todos os eleitores para votar de novo.</p>
        <button className="excluir" onClick={novaEleicao}>Zerar votos</button>
      </div>
    </>
  )
}
