import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'

const ConfigContext = createContext(null)

// "#1d4ed8" -> "29 78 216" (formato usado pelo Tailwind em rgb(var(--cor-rgb) / alpha))
function hexParaRgb(hex) {
  const valor = parseInt(hex.replace('#', ''), 16)
  return `${(valor >> 16) & 255} ${(valor >> 8) & 255} ${valor & 255}`
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null)

  const recarregar = useCallback(async () => {
    const { data } = await supabase.from('config').select('*').eq('id', 1).single()
    if (data) setConfig(data)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  useEffect(() => {
    if (!config) return
    document.documentElement.style.setProperty('--cor-rgb', hexParaRgb(config.cor))
    document.title = config.nome
  }, [config])

  return (
    <ConfigContext.Provider value={{ config, recarregar }}>
      {children}
    </ConfigContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useConfig() {
  return useContext(ConfigContext)
}
