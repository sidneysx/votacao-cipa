// ISO (UTC) -> valor para <input type="datetime-local"> no horário local
export function paraInput(iso) {
  if (!iso) return ''
  const data = new Date(iso)
  return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// <input type="datetime-local"> -> ISO (UTC)
export function deInput(valor) {
  return valor ? new Date(valor).toISOString() : null
}

export function formatar(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

export function situacaoVotacao(config, agora = Date.now()) {
  if (!config?.inicio || !config?.fim) return 'sem-horario'
  if (agora < new Date(config.inicio).getTime()) return 'antes'
  if (agora >= new Date(config.fim).getTime()) return 'encerrada'
  return 'aberta'
}
