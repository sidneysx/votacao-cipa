// linhas: [{ base, candidato_id, votos }] vindas da função resultado()
export default function TabelaResultado({ linhas, candidatos }) {
  const bases = [...new Set(linhas.map((l) => l.base))].sort()

  const votos = (candidatoId, base) =>
    linhas
      .filter((l) => l.candidato_id === candidatoId && (base === undefined || l.base === base))
      .reduce((soma, l) => soma + Number(l.votos), 0)

  const opcoes = [
    ...candidatos.map((c) => ({ id: c.id, rotulo: `${c.numero} — ${c.nome}` })),
    { id: null, rotulo: 'Branco' },
  ]
    .map((o) => ({ ...o, total: votos(o.id) }))
    .sort((a, b) => b.total - a.total)

  const totalBase = (base) => linhas.filter((l) => l.base === base).reduce((s, l) => s + Number(l.votos), 0)
  const totalGeral = linhas.reduce((s, l) => s + Number(l.votos), 0)

  if (totalGeral === 0) return <p className="aviso">Nenhum voto registrado.</p>

  return (
    <div className="tabela-rolagem">
      <table>
        <thead>
          <tr>
            <th>Candidato</th>
            {bases.map((b) => (
              <th key={b} className="num">{b}</th>
            ))}
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {opcoes.map((o) => (
            <tr key={o.id ?? 'branco'}>
              <td>{o.rotulo}</td>
              {bases.map((b) => (
                <td key={b} className="num">{votos(o.id, b)}</td>
              ))}
              <td className="num"><strong>{o.total}</strong></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            {bases.map((b) => (
              <th key={b} className="num">{totalBase(b)}</th>
            ))}
            <th className="num">{totalGeral}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
