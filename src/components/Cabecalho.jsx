import { Vote } from 'lucide-react'
import { useConfig } from '../config.jsx'

export default function Cabecalho({ children }) {
  const { config } = useConfig()

  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-cor to-cor/85 text-white shadow-lg shadow-cor/20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {config?.logo_url ? (
            <img src={config.logo_url} alt="" className="h-10 w-auto rounded-lg bg-white p-1 shadow-sm" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              <Vote className="h-5 w-5" />
            </div>
          )}
          <span className="truncate text-lg font-bold tracking-tight">{config?.nome ?? 'Eleição CIPA'}</span>
        </div>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
    </header>
  )
}
