import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authStore } from '../store/auth'

type Item = {
  key: string
  label: string
  path: string
  roles: string[]
  icon?: string
  // Para rutas dinámicas (ej. /clientes/:id) que no matchean por igualdad exacta.
  match?: (pathname: string) => boolean
}

const itemActivo = (item: Item, pathname: string) =>
  item.match ? item.match(pathname) : pathname === item.path

type Grupo = {
  key: string
  label: string
  icon: string
  items: Item[]
}

const TODOS = ['ADMINISTRADOR', 'CAJERA', 'OFICINA', 'ESTILISTA', 'MANICURA']
const ADMIN_CAJERA = ['ADMINISTRADOR', 'CAJERA']
const ADMIN_CAJERA_OFICINA = ['ADMINISTRADOR', 'CAJERA', 'OFICINA']
const ADMIN_OFICINA = ['ADMINISTRADOR', 'OFICINA']
const ADMIN_DEPOSITO = ['ADMINISTRADOR', 'DEPOSITO']
const SOLO_ADMIN = ['ADMINISTRADOR']

const GRUPOS: Grupo[] = [
  {
    key: 'operacion',
    label: 'Operación',
    icon: '🏠',
    items: [
      { key: 'inicio', label: 'Inicio', path: '/dashboard', roles: TODOS },
      { key: 'recepcion', label: 'Recepción', path: '/recepcion', roles: ADMIN_CAJERA },
      { key: 'turnos', label: 'Turnos', path: '/turnos', roles: ADMIN_CAJERA },
    ],
  },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: '👥',
    items: [
      { key: 'clientes', label: 'Clientes', path: '/clientes', roles: ADMIN_CAJERA_OFICINA },
      {
        key: 'fichero',
        label: 'Fichero',
        path: '/clientes',
        roles: ADMIN_CAJERA_OFICINA,
        match: (p) => /^\/clientes\/[^/]+$/.test(p),
      },
    ],
  },
  {
    key: 'caja',
    label: 'Caja',
    icon: '💰',
    items: [
      { key: 'caja', label: 'Caja', path: '/caja', roles: ADMIN_CAJERA_OFICINA },
      { key: 'cierre-turno', label: 'Cierre de Turno', path: '/cierre-turno', roles: ADMIN_CAJERA },
    ],
  },
  {
    key: 'produccion',
    label: 'Producción',
    icon: '📊',
    items: [
      { key: 'produccion-diaria', label: 'Producción Diaria', path: '/produccion-diaria', roles: ADMIN_OFICINA },
      { key: 'liquidaciones', label: 'Liquidaciones', path: '/liquidaciones', roles: ADMIN_OFICINA },
      { key: 'vales', label: 'Vales', path: '/vales', roles: ADMIN_OFICINA },
    ],
  },
  {
    key: 'administracion',
    label: 'Administración',
    icon: '🏛️',
    items: [
      { key: 'gastos-admin', label: 'Gastos Administrativos', path: '/gastos-admin', roles: ADMIN_OFICINA },
    ],
  },
  {
    key: 'deposito',
    label: 'Depósito',
    icon: '📦',
    items: [
      { key: 'stock', label: 'Stock', path: '/stock', roles: ADMIN_DEPOSITO },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    icon: '⚙️',
    items: [
      { key: 'profesionales', label: 'Profesionales', path: '/profesionales', roles: SOLO_ADMIN },
      { key: 'servicios', label: 'Servicios', path: '/servicios', roles: SOLO_ADMIN },
      { key: 'usuarios', label: 'Gestión de Usuarios', path: '/usuarios', roles: SOLO_ADMIN },
      { key: 'importar', label: 'Importar Datos', path: '/importar', roles: SOLO_ADMIN, icon: '📥' },
    ],
  },
]

interface LayoutProps {
  titulo: string
  children: React.ReactNode
}

export default function Layout({ titulo, children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = authStore.getUser()
  const rol = usuario?.rol

  const gruposVisibles = GRUPOS.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => !rol || item.roles.includes(rol)),
  })).filter((grupo) => grupo.items.length > 0)

  const grupoDeRuta = gruposVisibles.find((grupo) =>
    grupo.items.some((item) => itemActivo(item, location.pathname))
  )?.key

  const [abiertos, setAbiertos] = useState<Set<string>>(
    () => new Set(grupoDeRuta ? [grupoDeRuta] : [])
  )

  useEffect(() => {
    if (grupoDeRuta) {
      setAbiertos((prev) => {
        if (prev.has(grupoDeRuta)) return prev
        const next = new Set(prev)
        next.add(grupoDeRuta)
        return next
      })
    }
  }, [grupoDeRuta])

  const toggleGrupo = (key: string) => {
    setAbiertos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
          {gruposVisibles.map((grupo) => {
            const expandido = abiertos.has(grupo.key)
            return (
              <div key={grupo.key}>
                <button
                  onClick={() => toggleGrupo(grupo.key)}
                  aria-expanded={expandido}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-left text-[#1A1A2E] hover:bg-[#F8F8FC] transition-colors"
                >
                  <span>{grupo.icon}</span>
                  <span className="flex-1">{grupo.label}</span>
                  <span
                    className={`text-[10px] text-[#6B6B80] transition-transform duration-200 ${
                      expandido ? 'rotate-90' : ''
                    }`}
                  >
                    ▶
                  </span>
                </button>

                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    expandido ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-1 py-1">
                      {grupo.items.map((item) => {
                        const activo = itemActivo(item, location.pathname)
                        return (
                          <button
                            key={item.key}
                            onClick={() => navigate(item.path)}
                            style={{ paddingLeft: 'calc(0.75rem + 12px)' }}
                            className={`flex items-center gap-2 pr-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                              activo
                                ? 'bg-[#EDE9FE] text-[#7C3AED]'
                                : 'text-[#6B6B80] hover:bg-[#F8F8FC]'
                            }`}
                          >
                            {item.icon && <span>{item.icon}</span>}
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
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
