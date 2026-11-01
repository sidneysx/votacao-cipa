// Regra de apuração usada na tela de resultado e nas atas.

// Mais votos primeiro; empate = admissão mais antiga (NR-5: maior tempo de serviço).
// Sem data de admissão vai para o fim do empate.
function comparar(a, b) {
  if (b.total !== a.total) return b.total - a.total
  if (a.admissao !== b.admissao) {
    if (!a.admissao) return 1
    if (!b.admissao) return -1
    return a.admissao < b.admissao ? -1 : 1
  }
  return a.numero - b.numero
}

// linhas: [{ base, candidato_id, votos }] vindas da função resultado().
// Votos em branco de eleições antigas (candidato_id nulo) são ignorados.
export function apurar(todas, candidatos, titulares = 1, suplentes = 0) {
  const linhas = todas.filter((l) => l.candidato_id !== null)
  const bases = [...new Set(linhas.map((l) => l.base))].sort()

  const votos = (candidatoId, base) =>
    linhas
      .filter((l) => l.candidato_id === candidatoId && (base === undefined || l.base === base))
      .reduce((soma, l) => soma + Number(l.votos), 0)

  const opcoes = candidatos
    .map((c) => ({
      id: c.id,
      numero: c.numero,
      nome: c.nome,
      foto: c.foto_url,
      admissao: c.data_admissao,
      total: votos(c.id),
    }))
    .sort(comparar)

  // Candidato sem voto não é eleito
  const votados = opcoes.filter((o) => o.total > 0)
  const eleitos = votados.slice(0, titulares + suplentes).map((o, i) => ({
    ...o,
    cargo: i < titulares ? 'Titular' : 'Suplente',
    empatado: votados.some((x) => x.id !== o.id && x.total === o.total),
  }))

  const totalBase = (base) => linhas.filter((l) => l.base === base).reduce((s, l) => s + Number(l.votos), 0)
  const totalGeral = linhas.reduce((s, l) => s + Number(l.votos), 0)

  return { bases, votos, opcoes, eleitos, totalBase, totalGeral }
}
