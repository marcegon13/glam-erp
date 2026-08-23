import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Kpis {
  turnosHoy: number
  ingresosHoy: number
  ordenesAbiertas: number
  produccionMes: number
}

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`

export default function Dashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const fetchKpis = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/dashboard/kpis')
      setKpis(data)
    } catch {
      setError('No se pudieron cargar los indicadores')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchKpis()
  }, [])

  const tarjetas = [
    { label: 'Turnos hoy', valor: kpis ? String(kpis.turnosHoy) : '—' },
    { label: 'Ingresos del día', valor: kpis ? formatoMoneda(kpis.ingresosHoy) : '—' },
    { label: 'Órdenes abiertas', valor: kpis ? String(kpis.ordenesAbiertas) : '—' },
    { label: 'Producción del mes', valor: kpis ? formatoMoneda(kpis.produccionMes) : '—' },
  ]

  return (
    <Layout titulo="Inicio">
      <div className="flex justify-end mb-4">
        <button
          onClick={fetchKpis}
          disabled={cargando}
          title="Actualizar"
          className="text-lg w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-white hover:bg-surface transition-colors disabled:opacity-60"
        >
          🔄
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-4 gap-4">
        {tarjetas.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl shadow-sm border border-border p-5"
          >
            <p className="text-sm text-text-muted">{kpi.label}</p>
            {cargando ? (
              <div className="flex items-center mt-3">
                <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <p className="text-2xl font-bold text-text mt-2">{kpi.valor}</p>
            )}
          </div>
        ))}
      </div>
    </Layout>
  )
}
