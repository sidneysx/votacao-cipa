import { Award, Building2, Trophy, Vote } from 'lucide-react'
import { formatarData } from '../lib/datas.js'
import { Estatistica, Foto, Selo, Vazio } from './ui.jsx'

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
// completo: false mostra só os eleitos (página pública); true inclui ranking e votos por base (admin)
export default function TabelaResultado({ linhas: todas, candidatos, titulares = 1, suplentes = 0, completo = true }) {
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

  if (totalGeral === 0) return <Vazio icone={Vote}>Nenhum voto registrado.</Vazio>

  const rotulo = (o) => `${o.numero} — ${o.nome}`

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Estatistica icone={Vote} rotulo="votos no total" valor={totalGeral} />
        <Estatistica icone={Building2} rotulo="bases com votos" valor={bases.length} />
      </div>

      <div className="cartao">
        <h2 className="text-lg font-semibold text-slate-900">Eleitos</h2>
        <p className="dica">
          {titulares} {titulares === 1 ? 'titular' : 'titulares'}
          {suplentes > 0 && ` e ${suplentes} ${suplentes === 1 ? 'suplente' : 'suplentes'}`}. Em caso de empate, fica
          quem tem mais tempo de empresa.
        </p>
        {eleitos.length === 0 ? (
          <p className="mt-5 text-slate-500">Nenhum candidato recebeu votos.</p>
        ) : (
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {eleitos.map((o, i) => (
              <li
                key={o.id}
                style={{ animationDelay: `${i * 80}ms` }}
                className={`flex animate-entrar items-center gap-4 rounded-2xl p-4 ring-1 ${o.cargo === 'Titular' ? 'bg-cor/5 ring-cor/20' : 'bg-slate-50 ring-slate-200'}`}
              >
                <Foto url={o.foto} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {o.cargo === 'Titular' ? (
                      <Award className="h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">{i + 1}º</span>
                    )}
                    <Selo cor={o.cargo === 'Titular' ? 'verde' : 'cinza'}>{o.cargo}</Selo>
                  </div>
                  <div className="mt-1 truncate font-semibold text-slate-900">{rotulo(o)}</div>
                  <div className="text-sm text-slate-500">
                    <strong className="tabular-nums text-slate-900">{o.total}</strong>{' '}
                    {o.total === 1 ? 'voto' : 'votos'}
                    {o.empatado && ` · empate, admissão ${formatarData(o.admissao)}`}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {completo && (
        <>
          <div className="cartao">
            <h2 className="text-lg font-semibold text-slate-900">Ranking geral</h2>
            <ol className="mt-5 space-y-5">
              {opcoes.map((o, i) => {
                const pct = (o.total / totalGeral) * 100
                const lider = i === 0 && o.total > 0
                const atraso = { animationDelay: `${i * 80}ms` }
                return (
                  <li key={o.id} className="animate-entrar" style={atraso}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${lider ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {lider ? <Trophy className="h-4 w-4" /> : `${i + 1}º`}
                      </span>
                      <Foto url={o.foto} className="h-9 w-9 ring-2" />
                      <span className={`min-w-0 flex-1 truncate ${lider ? 'font-bold text-slate-900' : 'font-medium'}`}>
                        {rotulo(o)}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-slate-500">
                        <strong className="text-slate-900">{o.total}</strong> · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full origin-left animate-barra rounded-full ${lider ? 'bg-gradient-to-r from-cor to-cor/70' : 'bg-cor/60'}`}
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
                    <th key={b} className="num">
                      {b}
                    </th>
                  ))}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {opcoes.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">{rotulo(o)}</td>
                    {bases.map((b) => (
                      <td key={b} className="num">
                        {votos(o.id, b)}
                      </td>
                    ))}
                    <td className="num font-bold text-slate-900">{o.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  {bases.map((b) => (
                    <th key={b} className="num">
                      {totalBase(b)}
                    </th>
                  ))}
                  <th className="num">{totalGeral}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
