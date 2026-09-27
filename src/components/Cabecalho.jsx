import { useConfig } from '../config.jsx'

export default function Cabecalho({ children }) {
  const { config } = useConfig()

  return (
    <header className="cabecalho">
      <div className="cabecalho-marca">
        {config?.logo_url && <img src={config.logo_url} alt="" className="logo" />}
        <span>{config?.nome ?? 'Eleição CIPA'}</span>
      </div>
      {children}
    </header>
  )
}
