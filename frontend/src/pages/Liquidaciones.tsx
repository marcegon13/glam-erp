import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'

interface FilaResumen {
  profesional: { id: number; nombre: string; apellido: string; tipo: string }
  produccion: number
  valesPendientes: number
  porcentaje: number
  comision: number
  estado: 'SIN_LIQUIDAR' | 'BORRADOR' | 'APROBADA'
  sueldoNeto: number | null
}

const ESTADO_BADGE: Record<FilaResumen['estado'], string> = {
  SIN_LIQUIDAR: 'bg-gray-100 text-gray-600',
  BORRADOR: 'bg-amber-50 text-amber-600',
  APROBADA: 'bg-green-50 text-green-700',
}

const ESTADO_LABEL: Record<FilaResumen['estado'], string> = {
  SIN_LIQUIDAR: 'Sin liquidar',
  BORRADOR: 'Borrador',
  APROBADA: 'Aprobada',
}

const TIPO_LABEL: Record<string, string> = {
  ESTILISTA: 'Estilista',
  MANICURA: 'Manicura',
  AYUDANTE: 'Ayudante',
}

function periodoActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`

export default function Liquidaciones() {
  const navigate = useNavigate()

  const [periodo, setPeriodo] = useState(periodoActual())
  const [resumen, setResumen] = useState<FilaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const fetchResumen = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get(`/liquidaciones/periodo/${periodo}`)
      setResumen(data)
    } catch {
      setError('No se pudo cargar el resumen del período')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchResumen()
  }, [periodo])

  return (
    <Layout titulo="Liquidaciones">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-text mb-2">Período</label>
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Producción</th>
              <th className="px-5 py-3 font-medium">Vales</th>
              <th className="px-5 py-3 font-medium">Comisión</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : resumen.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-text-muted">
                  No hay profesionales activos
                </td>
              </tr>
            ) : (
              resumen.map((fila, i) => (
                <tr
                  key={fila.profesional.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text font-medium">
                    {fila.profesional.nombre} {fila.profesional.apellido}
                  </td>
                  <td className="px-5 py-3 text-text-muted">
                    {TIPO_LABEL[fila.profesional.tipo] ?? fila.profesional.tipo}
                  </td>
                  <td className="px-5 py-3 text-text">{formatoMoneda(fila.produccion)}</td>
                  <td className="px-5 py-3 text-text-muted">{formatoMoneda(fila.valesPendientes)}</td>
                  <td className="px-5 py-3 text-text font-medium">{formatoMoneda(fila.comision)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[fila.estado]}`}>
                      {ESTADO_LABEL[fila.estado]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => navigate(`/liquidaciones/${fila.profesional.id}/${periodo}`)}
                      className="text-primary hover:text-primary-dark font-medium transition-colors"
                    >
                      Ver Legajo
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
