import Layout from '../components/Layout'

const KPIS = [
  { label: 'Turnos hoy', valor: '0' },
  { label: 'Ingresos del día', valor: '$0' },
  { label: 'Órdenes abiertas', valor: '0' },
  { label: 'Producción del mes', valor: '$0' },
]

export default function Dashboard() {
  return (
    <Layout titulo="Inicio">
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl shadow-sm border border-border p-5"
          >
            <p className="text-sm text-text-muted">{kpi.label}</p>
            <p className="text-2xl font-bold text-text mt-2">{kpi.valor}</p>
          </div>
        ))}
      </div>
    </Layout>
  )
}
