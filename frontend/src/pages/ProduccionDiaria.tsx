import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

type TipoProfesional = 'ESTILISTA' | 'MANICURA' | 'AYUDANTE'
type EstadoOrden = 'ABIERTA' | 'COBRADA' | 'ANULADA'

interface OrdenFila {
  id: number
  cliente: string
  items: { descripcion: string; cantidad: number }[]
  metodos: string[]
  estado: EstadoOrden
  monto: number
}

interface Grupo {
  profesional: { id: number; nombre: string; apellido: string; tipo: TipoProfesional }
  ordenes: OrdenFila[]
  totalOrdenes: number
  totalMonto: number
}

interface Produccion {
  fecha: string
  grupos: Grupo[]
  totalDia: number
  totalOrdenesDia: number
  numerosOrden: number[]
  huecos: number[]
}

const TIPO_LABEL: Record<TipoProfesional, string> = {
  ESTILISTA: 'Estilista',
  MANICURA: 'Manicura',
  AYUDANTE: 'Ayudante',
}

const TIPO_BADGE: Record<TipoProfesional, string> = {
  ESTILISTA: 'E',
  MANICURA: 'M',
  AYUDANTE: 'A',
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
}

const METODOS_SUBTOTAL = ['EFECTIVO', 'TARJETA', 'MERCADO_PAGO'] as const

const ESTADO_BADGE: Record<EstadoOrden, string> = {
  ABIERTA: 'bg-amber-50 text-amber-600',
  COBRADA: 'bg-green-50 text-green-700',
  ANULADA: 'bg-red-50 text-red-600',
}

const ESTADO_LABEL: Record<EstadoOrden, string> = {
  ABIERTA: 'Abierta',
  COBRADA: 'Cobrada',
  ANULADA: 'Anulada',
}

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`

function hoyISO(): string {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function nombreCorto(profesional: { nombre: string; apellido: string }) {
  return `${profesional.nombre} ${profesional.apellido.charAt(0)}.`
}

function subtotalesPorMetodo(ordenes: OrdenFila[]) {
  const totales: Record<string, number> = { EFECTIVO: 0, TARJETA: 0, MERCADO_PAGO: 0 }
  for (const orden of ordenes) {
    if (orden.metodos.length === 1 && totales[orden.metodos[0]] != null) {
      totales[orden.metodos[0]] += orden.monto
    }
  }
  return totales
}

function TablaOrdenes({ ordenes }: { ordenes: OrdenFila[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-text-muted border-b border-border">
            <th className="py-2 font-medium">Nº Orden</th>
            <th className="py-2 font-medium">Cliente</th>
            <th className="py-2 font-medium">Servicios</th>
            <th className="py-2 font-medium">Método de pago</th>
            <th className="py-2 font-medium">Estado</th>
            <th className="py-2 font-medium text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map((orden) => (
            <tr key={orden.id} className="border-b border-border last:border-0 align-top">
              <td className="py-2 text-text">#{orden.id}</td>
              <td className="py-2 text-text">{orden.cliente}</td>
              <td className="py-2 text-text">
                {orden.items.map((item, i) => (
                  <div key={i}>
                    {item.descripcion}
                    {item.cantidad > 1 ? ` x${item.cantidad}` : ''}
                  </div>
                ))}
              </td>
              <td className="py-2 text-text">
                {orden.metodos.length > 0 ? orden.metodos.map((m) => METODO_LABEL[m] ?? m).join(', ') : '—'}
              </td>
              <td className="py-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[orden.estado]}`}>
                  {ESTADO_LABEL[orden.estado]}
                </span>
              </td>
              <td className="py-2 text-text text-right">{formatoMoneda(orden.monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PanelProfesional({ grupo }: { grupo: Grupo }) {
  const subtotales = subtotalesPorMetodo(grupo.ordenes)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h3 className="font-semibold text-text mb-4">
        {grupo.profesional.nombre} {grupo.profesional.apellido}{' '}
        <span className="text-text-muted font-normal">· {TIPO_LABEL[grupo.profesional.tipo]}</span>
      </h3>

      <TablaOrdenes ordenes={grupo.ordenes} />

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-sm font-medium text-text mb-3">
          Resumen · {grupo.totalOrdenes} {grupo.totalOrdenes === 1 ? 'orden' : 'órdenes'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {METODOS_SUBTOTAL.map((metodo) => (
            <div key={metodo} className="flex flex-col">
              <span className="text-text-muted">{METODO_LABEL[metodo]}</span>
              <span className="font-medium text-text">{formatoMoneda(subtotales[metodo])}</span>
            </div>
          ))}
          <div className="flex flex-col">
            <span className="text-text-muted">Total</span>
            <span className="font-bold text-primary">{formatoMoneda(grupo.totalMonto)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PanelResumen({ produccion }: { produccion: Produccion }) {
  const totalesPorMetodo: Record<string, number> = { EFECTIVO: 0, TARJETA: 0, MERCADO_PAGO: 0 }
  for (const grupo of produccion.grupos) {
    const sub = subtotalesPorMetodo(grupo.ordenes)
    for (const metodo of METODOS_SUBTOTAL) totalesPorMetodo[metodo] += sub[metodo]
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h3 className="font-semibold text-text mb-4">Resumen General</h3>

      <div className="flex justify-between text-sm mb-4">
        <span className="text-text-muted">
          Total del día · {produccion.totalOrdenesDia} {produccion.totalOrdenesDia === 1 ? 'orden' : 'órdenes'}
        </span>
        <span className="font-bold text-primary text-lg">{formatoMoneda(produccion.totalDia)}</span>
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-sm font-medium text-text mb-3">Desglose por método</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {METODOS_SUBTOTAL.map((metodo) => (
            <div key={metodo} className="flex flex-col">
              <span className="text-text-muted">{METODO_LABEL[metodo]}</span>
              <span className="font-medium text-text">{formatoMoneda(totalesPorMetodo[metodo])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-border">
        <p className="text-sm font-medium text-text mb-2">Control de correlativos</p>
        <p className="text-sm text-text-muted mb-2">
          Órdenes del día: {produccion.numerosOrden.map((n) => `#${n}`).join(', ') || '—'}
        </p>
        {produccion.huecos.length === 0 ? (
          <p className="text-sm text-green-700">✓ Sin huecos en la numeración</p>
        ) : (
          <div className="flex flex-col gap-1">
            {produccion.huecos.map((n) => (
              <p key={n} className="text-sm text-red-600 font-medium">
                ⚠️ Orden #{n} no registrada
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProduccionDiaria() {
  const [fecha, setFecha] = useState(hoyISO())
  const [produccion, setProduccion] = useState<Produccion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [tabActivo, setTabActivo] = useState<number | 'resumen'>('resumen')

  const fetchProduccion = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/produccion/diaria', { params: { fecha } })
      setProduccion(data)
      setTabActivo(data.grupos.length > 0 ? data.grupos[0].profesional.id : 'resumen')
    } catch {
      setError('No se pudo cargar la producción del día')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchProduccion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha])

  const grupoActivo =
    produccion && typeof tabActivo === 'number'
      ? produccion.grupos.find((g) => g.profesional.id === tabActivo)
      : null

  return (
    <Layout titulo="Producción Diaria">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-text mb-2">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
          />
        </div>
        <button
          onClick={fetchProduccion}
          disabled={cargando}
          className="border border-border text-text font-medium rounded-lg px-4 py-2 transition-colors hover:bg-surface disabled:opacity-60"
        >
          🔄 Refrescar
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {cargando ? (
        <p className="text-text-muted">Cargando...</p>
      ) : !produccion || produccion.grupos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <p className="text-text-muted">No hay órdenes registradas para esta fecha.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {produccion.grupos.map((grupo) => {
              const activo = tabActivo === grupo.profesional.id
              return (
                <button
                  key={grupo.profesional.id}
                  onClick={() => setTabActivo(grupo.profesional.id)}
                  className={`flex items-center gap-2 shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activo ? 'bg-primary text-white' : 'bg-surface text-text hover:bg-[#EDE9FE]'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                      activo ? 'bg-white/20 text-white' : 'bg-white text-text-muted'
                    }`}
                  >
                    {TIPO_BADGE[grupo.profesional.tipo]}
                  </span>
                  {nombreCorto(grupo.profesional)}
                </button>
              )
            })}
            <button
              onClick={() => setTabActivo('resumen')}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tabActivo === 'resumen' ? 'bg-primary text-white' : 'bg-surface text-text hover:bg-[#EDE9FE]'
              }`}
            >
              📊 Resumen
            </button>
          </div>

          {tabActivo === 'resumen' ? (
            <PanelResumen produccion={produccion} />
          ) : grupoActivo ? (
            <PanelProfesional grupo={grupoActivo} />
          ) : null}
        </div>
      )}
    </Layout>
  )
}
