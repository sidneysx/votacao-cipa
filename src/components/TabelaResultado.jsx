import { Award, Building2, Trophy, Vote } from 'lucide-react'
import { apurar } from '../lib/apuracao.js'
import { formatarData } from '../lib/datas.js'
import { Estatistica, Foto, Selo, Vazio } from './ui.jsx'

// linhas: [{ base, candidato_id, votos }] vindas da função resultado().
// completo: false mostra só os eleitos (página pública); true inclui ranking e votos por base (admin)
export default function TabelaResultado({ linhas, candidatos, titulares = 1, suplentes = 0, completo = true }) {
  const { bases, votos, opcoes, eleitos, totalBase, totalGeral } = apurar(linhas, candidatos, titulares, suplentes)

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
