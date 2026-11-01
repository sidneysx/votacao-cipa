import { tempoDeServico } from '../../../lib/datas.js'

// Dados da apuração no formato da planilha da empresa. Usado na prévia e no Excel.
export function dadosApuracao(config, ctx) {
  const { opcoes, eleitos } = ctx.apuracao
  const fim = new Date(config.fim)
  const ano = fim.getFullYear()
  const cargo = Object.fromEntries(eleitos.map((e) => [e.id, e.cargo]))
  return {
    ano,
    titulo: `APURAÇÃO DE VOTOS - CIPA ${ano}/${ano + 1} (RESULTADO)`,
    linhas: opcoes.map((o, i) => ({
      id: o.id,
      posicao: `${i + 1}º`,
      nome: o.nome.toUpperCase(),
      votos: o.total,
      status: cargo[o.id]?.toUpperCase() ?? '',
      tempo: tempoDeServico(o.admissao, fim),
    })),
    // Linhas reservadas para os indicados pelo empregador (mesmo número de vagas eleitas)
    vagas: (config.titulares ?? 1) + (config.suplentes ?? 0),
  }
}

// A Matriz não tem designado: não aparece no cadastro nem na planilha
export const basesComDesignacao = (bases) => bases.filter((b) => b.nome.trim().toLowerCase() !== 'matriz')

// Base sem designado preenchido não entra na planilha
export const basesComDesignado = (bases, designados) => basesComDesignacao(bases).filter((b) => designados[b.id])

const CURSO = { true: 'SIM', false: 'NÃO' }
export const textoCurso = (curso) => CURSO[curso] ?? ''

// ---------------------------------------------------------------------
// Excel (.xlsx)
// ---------------------------------------------------------------------

const AZUL = 'FF5B9BD5'
const VERDE = 'FF92D050'
const VERMELHO = 'FFFF0000'
const BRANCO = 'FFFFFFFF'

const fundo = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const linhaFina = { style: 'thin', color: { argb: 'FF000000' } }
const bordas = { top: linhaFina, left: linhaFina, bottom: linhaFina, right: linhaFina }

// indicados: linhas da tabela indicados; designados: { base_id: nome }
export async function baixarExcel(config, ctx, indicados, designados) {
  // Carrega a biblioteca só na hora de gerar (ela é grande)
  const { default: ExcelJS } = await import('exceljs')
  const d = dadosApuracao(config, ctx)

  const livro = new ExcelJS.Workbook()
  const aba = livro.addWorksheet('Apuração', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: 'frozen', ySplit: 2 }],
  })
  aba.columns = [9, 38, 11, 13, 14, 8, 26, 34, 16, 14, 8].map((width) => ({ width }))

  aba.mergeCells('A1:K1')
  const titulo = aba.getCell('A1')
  titulo.value = d.titulo
  titulo.font = { bold: true, size: 14, color: { argb: BRANCO } }
  titulo.fill = fundo(AZUL)
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  aba.getRow(1).height = 30

  function cabecalho(linha, coluna, textos) {
    textos.forEach((texto, i) => {
      const c = aba.getCell(linha, coluna + i)
      c.value = texto
      c.font = { bold: true, color: { argb: BRANCO } }
      c.fill = fundo(AZUL)
      c.border = bordas
      c.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  }

  function celula(linha, coluna, valor, { centro = false, negrito = false, cor } = {}) {
    const c = aba.getCell(linha, coluna)
    c.value = valor
    c.border = bordas
    c.alignment = { horizontal: centro ? 'center' : 'left', vertical: 'middle' }
    if (negrito) c.font = { bold: true }
    if (cor) c.fill = fundo(cor)
  }

  // Eleitos (colunas A-G)
  cabecalho(2, 1, ['Posição', 'Eleitos - Empregados', 'Apuração', 'Status', 'Gerência', 'Curso', 'Tempo de serviço'])
  d.linhas.forEach((l, i) => {
    const r = 3 + i
    celula(r, 1, l.posicao, { centro: true, negrito: true })
    celula(r, 2, l.nome, { negrito: true })
    celula(r, 3, l.votos, { centro: true, negrito: true })
    celula(r, 4, l.status, { centro: true, negrito: true, cor: l.status ? VERDE : undefined })
    celula(r, 5, '')
    celula(r, 6, '')
    celula(r, 7, l.tempo, { centro: true })
  })
  if (d.linhas.length) aba.autoFilter = { from: 'A2', to: `G${2 + d.linhas.length}` }

  // Indicados pelo empregador (colunas H-K)
  cabecalho(2, 8, ['Indicados pelo Empregador', 'Status', 'Gerência', 'Curso'])
  const qtdIndicados = Math.max(indicados.length, d.vagas)
  for (let i = 0; i < qtdIndicados; i++) {
    const ind = indicados[i]
    const r = 3 + i
    celula(r, 8, ind?.nome ?? '', { negrito: true })
    celula(r, 9, ind?.status?.toUpperCase() ?? '', { centro: true, negrito: true, cor: ind?.status ? VERDE : undefined })
    celula(r, 10, ind?.gerencia ?? '', { centro: true })
    celula(r, 11, textoCurso(ind?.curso), { centro: true, negrito: true, cor: ind?.curso === false ? VERMELHO : undefined })
  }

  // Designados por base, logo abaixo dos indicados
  const inicio = 3 + qtdIndicados + 1
  cabecalho(inicio, 8, ['Designados da CIPA', 'Base'])
  basesComDesignado(ctx.bases, designados).forEach((b, i) => {
    celula(inicio + 1 + i, 8, designados[b.id], { negrito: true })
    celula(inicio + 1 + i, 9, b.nome.toUpperCase(), { centro: true, negrito: true })
  })

  const buffer = await livro.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `apuracao-cipa-${d.ano}-${d.ano + 1}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
