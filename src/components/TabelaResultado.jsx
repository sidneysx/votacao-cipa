import { Building2, Trophy, Vote } from 'lucide-react'
import { Estatistica, Foto, Vazio } from './ui.jsx'

// linhas: [{ base, candidato_id, votos }] vindas da função resultado()
export default function TabelaResultado({ linhas, candidatos }) {
  const bases = [...new Set(linhas.map((l) => l.base))].sort()

  const votos = (candidatoId, base) =>
    linhas
      .filter((l) => l.candidato_id === candidatoId && (base === undefined || l.base === base))
      .reduce((soma, l) => soma + Number(l.votos), 0)

  const opcoes = [
    ...candidatos.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome, foto: c.foto_url })),
    { id: null, numero: null, nome: 'Branco', foto: null },
  ]
    .map((o) => ({ ...o, total: votos(o.id) }))
    .sort((a, b) => b.total - a.total)

  const totalBase = (base) => linhas.filter((l) => l.base === base).reduce((s, l) => s + Number(l.votos), 0)
  const totalGeral = linhas.reduce((s, l) => s + Number(l.votos), 0)

  if (totalGeral === 0) return <Vazio icone={Vote}>Nenhum voto registrado.</Vazio>

  const rotulo = (o) => (o.numero === null ? o.nome : `${o.numero} — ${o.nome}`)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Estatistica icone={Vote} rotulo="votos no total" valor={totalGeral} />
        <Estatistica icone={Building2} rotulo="bases com votos" valor={bases.length} />
      </div>

      <div className="cartao">
        <h2 className="text-lg font-semibold text-slate-900">Ranking geral</h2>
        <ol className="mt-5 space-y-5">
          {opcoes.map((o, i) => {
            const pct = (o.total / totalGeral) * 100
            const lider = i === 0 && o.total > 0 && o.id !== null
            const atraso = { animationDelay: `${i * 80}ms` }
            return (
              <li key={o.id ?? 'branco'} className="animate-entrar" style={atraso}>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${lider ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {lider ? <Trophy className="h-4 w-4" /> : `${i + 1}º`}
                  </span>
                  {o.id !== null && <Foto url={o.foto} className="h-9 w-9 ring-2" />}
                  <span className={`min-w-0 flex-1 truncate ${lider ? 'font-bold text-slate-900' : 'font-medium'}`}>
                    {rotulo(o)}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-slate-500">
                    <strong className="text-slate-900">{o.total}</strong> · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full origin-left animate-barra rounded-full ${o.id === null ? 'bg-slate-400' : lider ? 'bg-gradient-to-r from-cor to-cor/70' : 'bg-cor/60'}`}
                    style={{ width: `${pct}%`, ...atraso }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="tabela-caixa animate-entrar">
        <div className="px-5 pb-3 pt-5">
          <h2 className="text-lg font-semibold text-slate-900">Votos por base</h2>
        </div>
        <table className="tabela">
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
                <td className="font-medium">{rotulo(o)}</td>
                {bases.map((b) => (
                  <td key={b} className="num">{votos(o.id, b)}</td>
                ))}
                <td className="num font-bold text-slate-900">{o.total}</td>
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
    </div>
  )
}
