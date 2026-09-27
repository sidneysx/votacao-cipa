import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'

const ConfigContext = createContext(null)

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
    document.documentElement.style.setProperty('--cor', config.cor)
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
