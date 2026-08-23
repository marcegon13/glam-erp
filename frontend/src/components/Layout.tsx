import { useNavigate, useLocation } from 'react-router-dom'
import { authStore } from '../store/auth'

const MENU = [
  { key: 'inicio', label: 'Inicio', icon: '🏠', path: '/dashboard' },
  { key: 'recepcion', label: 'Recepción', icon: '🗓️', path: '/recepcion' },
  { key: 'turnos', label: 'Turnos', icon: '📅', path: '/turnos' },
  { key: 'clientes', label: 'Clientes', icon: '👥', path: '/clientes' },
  { key: 'profesionales', label: 'Profesionales', icon: '💇', path: '/profesionales' },
  { key: 'servicios', label: 'Servicios', icon: '✨', path: '/servicios' },
  { key: 'caja', label: 'Caja', icon: '💰', path: '/caja' },
  { key: 'vales', label: 'Vales', icon: '💰', path: '/vales' },
  { key: 'liquidaciones', label: 'Liquidaciones', icon: '📊', path: '/liquidaciones' },
]

interface LayoutProps {
  titulo: string
  children: React.ReactNode
}

export default function Layout({ titulo, children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = authStore.getUser()

  const handleSalir = () => {
    authStore.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-[#DDDDE8] flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-6">
          <span className="text-2xl">✂</span>
          <span className="font-bold text-[#7C3AED]">Glam ERP</span>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {MENU.map((item) => {
            const activo = location.pathname === item.path
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                  activo
                    ? 'bg-[#EDE9FE] text-[#7C3AED]'
                    : 'text-[#6B6B80] hover:bg-[#F8F8FC]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto px-5 py-5 border-t border-[#DDDDE8]">
          <p className="text-sm font-medium text-[#1A1A2E] truncate">
            {usuario?.nombre ?? 'Usuario'}
          </p>
          <button
            onClick={handleSalir}
            className="mt-3 text-sm text-[#6B6B80] hover:text-[#7C3AED] transition-colors"
          >
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-[#F8F8FC] min-h-screen">
        <header className="px-8 py-6 border-b border-[#DDDDE8]">
          <h1 className="text-xl font-bold text-[#1A1A2E]">{titulo}</h1>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
