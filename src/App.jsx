import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from './config.jsx'
import Admin from './pages/admin/Admin.jsx'
import Resultado from './pages/Resultado.jsx'
import Urna from './pages/Urna.jsx'

function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Urna />} />
          <Route path="/resultado" element={<Resultado />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
      <footer className="rodape">Desenvolvido por Sid Dev</footer>
    </ConfigProvider>
  )
}

export default App
