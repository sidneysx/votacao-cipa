// Os campos de data são texto (DD/MM/AAAA), porque o <input type="date"> segue o
// idioma do navegador e pode aparecer em MM/DD/AAAA.

const dois = (n) => String(n).padStart(2, '0')

// Digitação livre -> "DD/MM/AAAA" ou "DD/MM/AAAA HH:MM", só com números
export function mascaraData(texto, comHora = false) {
  const d = texto.replace(/\D/g, '').slice(0, comHora ? 12 : 8)
  let saida = d.slice(0, 2)
  if (d.length > 2) saida += '/' + d.slice(2, 4)
  if (d.length > 4) saida += '/' + d.slice(4, 8)
  if (d.length > 8) saida += ' ' + d.slice(8, 10)
  if (d.length > 10) saida += ':' + d.slice(10, 12)
  return saida
}

// "DD/MM/AAAA[ HH:MM]" -> Date local; undefined se incompleta ou inexistente (ex.: 31/02)
function lerTexto(texto, comHora) {
  const m = texto.match(comHora ? /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/ : /^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return undefined
  const [, dia, mes, ano, hora = 0, minuto = 0] = m.map(Number)
  const data = new Date(ano, mes - 1, dia, hora, minuto)
  const confere =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia &&
    data.getHours() === hora &&
    data.getMinutes() === minuto
  return confere ? data : undefined
}

// ISO (UTC) -> "DD/MM/AAAA HH:MM" no horário local
export function paraInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`
}

// "DD/MM/AAAA HH:MM" -> ISO (UTC); null se vazio, undefined se inválido
export function deInput(texto) {
  if (!texto) return null
  return lerTexto(texto, true)?.toISOString()
}

// "DD/MM/AAAA" -> "AAAA-MM-DD" (coluna date); null se vazio, undefined se inválido
export function dataParaBanco(texto) {
  if (!texto) return null
  return lerTexto(texto, false) ? texto.split('/').reverse().join('-') : undefined
}

export function formatar(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

// "2015-03-20" (coluna date) -> "20/03/2015", sem passar por Date para não mudar o dia por fuso
export function formatarData(data) {
  return data ? data.split('-').reverse().join('/') : '—'
}

export function situacaoVotacao(config, agora = Date.now()) {
  if (!config?.inicio || !config?.fim) return 'sem-horario'
  if (agora < new Date(config.inicio).getTime()) return 'antes'
  if (agora >= new Date(config.fim).getTime()) return 'encerrada'
  return 'aberta'
}
