import { LoaderCircle, UserRound } from 'lucide-react'

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="flex animate-aparecer items-center justify-center gap-3 py-16 text-slate-500">
      <LoaderCircle className="h-5 w-5 animate-spin text-cor" />
      {texto}
    </div>
  )
}

const ESTILOS_ALERTA = {
  erro: 'bg-red-50 text-red-700 ring-red-200',
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  info: 'bg-slate-100 text-slate-600 ring-slate-200',
}

// A key faz a animação rodar de novo quando a mensagem muda
export function Alerta({ tipo = 'erro', children }) {
  if (!children) return null
  return (
    <p
      key={String(children)}
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`animate-entrar rounded-xl px-4 py-3 text-sm ring-1 ${ESTILOS_ALERTA[tipo]}`}
    >
      {children}
    </p>
  )
}

const ESTILOS_SELO = {
  verde: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amarelo: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  vermelho: 'bg-red-50 text-red-700 ring-red-600/20',
  cinza: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export function Selo({ cor = 'cinza', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ESTILOS_SELO[cor]}`}
    >
      {children}
    </span>
  )
}

export function Foto({ url, className = 'h-16 w-16' }) {
  return url ? (
    <img src={url} alt="" className={`${className} shrink-0 rounded-full object-cover ring-4 ring-slate-100`} />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300 ring-4 ring-slate-50`}
    >
      <UserRound className="h-1/2 w-1/2" />
    </div>
  )
}

export function IconeTopo({ icone: Icone }) {
  return (
    <div className="mx-auto mb-5 flex h-16 w-16 animate-pop items-center justify-center rounded-2xl bg-cor/10 text-cor">
      <Icone className="h-8 w-8" />
    </div>
  )
}

export function TituloSecao({ icone: Icone, titulo, descricao }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-cor/10 p-2.5 text-cor">
        <Icone className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
        {descricao && <p className="dica">{descricao}</p>}
      </div>
    </div>
  )
}

export function Vazio({ icone: Icone, children }) {
  return (
    <div className="flex animate-aparecer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center text-slate-400">
      <Icone className="h-10 w-10" />
      <p>{children}</p>
    </div>
  )
}

export function Estatistica({ icone: Icone, rotulo, valor, children }) {
  return (
    <div className="cartao animate-entrar p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-cor/10 p-2.5 text-cor">
          <Icone className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">{valor}</div>
          <div className="text-sm text-slate-500">{rotulo}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

// Fundo com brilho na cor da eleição, usado na urna e no login
export function Palco({ children, centralizar = false }) {
  return (
    <main
      className={`relative flex flex-1 justify-center overflow-hidden px-4 py-10 sm:py-16 ${centralizar ? 'items-center' : 'items-start'}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-cor/15 blur-3xl"
      />
      <div className="relative flex w-full justify-center">{children}</div>
    </main>
  )
}
