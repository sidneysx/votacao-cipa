import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from './config.jsx'
import Admin from './pages/admin/Admin.jsx'
import Resultado from './pages/Resultado.jsx'
import Urna from './pages/Urna.jsx'

function App() {
  return (
    <ConfigProvider>
      <div className="flex min-h-screen flex-col">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Urna />} />
            <Route path="/resultado" element={<Resultado />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
        <footer className="py-6 text-center text-xs text-slate-400">
          Desenvolvido por <span className="font-semibold text-slate-500">Sid Dev</span>
        </footer>
      </div>
    </ConfigProvider>
  )
}

export default App
