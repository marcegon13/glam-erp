import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Profesional {
  id: number
  nombre: string
  apellido: string
  tipo: string
  porcentaje: string | null
}

interface ProduccionDia {
  fecha: string
  total: number
}

interface Vale {
  id: number
  monto: string
  concepto: string | null
  fecha: string
  descontado: boolean
}

interface LiquidacionGuardada {
  id: number
  produccion: string
  comision: string
  vales: string
  cargasSociales: string
  descuentos: string
  otros: string
  notas: string | null
  sueldoNeto: string
  aprobada: boolean
  creadoEn: string
}

interface Legajo {
  profesional: Profesional
  periodo: string
  produccionDiaria: ProduccionDia[]
  vales: Vale[]
  liquidacion: LiquidacionGuardada | null
}

const TIPO_LABEL: Record<string, string> = {
  ESTILISTA: 'Estilista',
  MANICURA: 'Manicura',
  AYUDANTE: 'Ayudante',
}

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`
const formatoFecha = (fecha: string) => fecha.slice(0, 10).split('-').reverse().join('/')

function nombrePeriodo(periodo: string) {
  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const [anio, mes] = periodo.split('-').map(Number)
  return `${MESES[mes - 1]} ${anio}`
}

export default function LegajoProfesional() {
  const { profesionalId, periodo } = useParams()
  const navigate = useNavigate()

  const [legajo, setLegajo] = useState<Legajo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [cargasSociales, setCargasSociales] = useState('0')
  const [descuentos, setDescuentos] = useState('0')
  const [otros, setOtros] = useState('0')
  const [notas, setNotas] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [aprobando, setAprobando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const fetchLegajo = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get(`/liquidaciones/legajo/${profesionalId}/${periodo}`)
      setLegajo(data)
      if (data.liquidacion) {
        setCargasSociales(data.liquidacion.cargasSociales)
        setDescuentos(data.liquidacion.descuentos)
        setOtros(data.liquidacion.otros)
        setNotas(data.liquidacion.notas ?? '')
      }
    } catch {
      setError('No se pudo cargar el legajo')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchLegajo()
  }, [profesionalId, periodo])

  const produccionTotal = useMemo(
    () => (legajo ? legajo.produccionDiaria.reduce((suma, d) => suma + d.total, 0) : 0),
    [legajo]
  )

  const valesTotal = useMemo(
    () => (legajo ? legajo.vales.reduce((suma, v) => suma + Number(v.monto), 0) : 0),
    [legajo]
  )

  const comision = useMemo(() => {
    if (!legajo) return 0
    const porcentaje = Number(legajo.profesional.porcentaje ?? 0)
    return (produccionTotal * porcentaje) / 100
  }, [legajo, produccionTotal])

  const sueldoNeto = useMemo(() => {
    return comision - valesTotal - Number(cargasSociales || 0) - Number(descuentos || 0) - Number(otros || 0)
  }, [comision, valesTotal, cargasSociales, descuentos, otros])

  const aprobada = legajo?.liquidacion?.aprobada ?? false

  const handleGuardarBorrador = async () => {
    setMensaje('')
    setGuardando(true)
    try {
      await api.post('/liquidaciones/borrador', {
        profesionalId: Number(profesionalId),
        periodo,
        cargasSociales: Number(cargasSociales || 0),
        descuentos: Number(descuentos || 0),
        otros: Number(otros || 0),
        notas: notas || undefined,
      })
      setMensaje('Borrador guardado')
      await fetchLegajo()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al guardar el borrador')
    } finally {
      setGuardando(false)
    }
  }

  const handleAprobar = async () => {
    const confirmar = window.confirm(
      `¿Aprobar y cerrar la liquidación de ${legajo?.profesional.nombre} ${legajo?.profesional.apellido} por ${nombrePeriodo(periodo!)}? Esta acción marca los vales del período como descontados y genera un egreso en caja. No se puede deshacer.`
    )
    if (!confirmar) return

    setMensaje('')
    setAprobando(true)
    try {
      const { data: borrador } = await api.post('/liquidaciones/borrador', {
        profesionalId: Number(profesionalId),
        periodo,
        cargasSociales: Number(cargasSociales || 0),
        descuentos: Number(descuentos || 0),
        otros: Number(otros || 0),
        notas: notas || undefined,
      })
      await api.post(`/liquidaciones/${borrador.id}/aprobar`)
      setMensaje('Liquidación aprobada y cerrada')
      await fetchLegajo()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al aprobar la liquidación')
    } finally {
      setAprobando(false)
    }
  }

  if (cargando) {
    return (
      <Layout titulo="Legajo del profesional">
        <p className="text-text-muted">Cargando...</p>
      </Layout>
    )
  }

  if (!legajo) {
    return (
      <Layout titulo="Legajo del profesional">
        <p className="text-text-muted">{error || 'No se pudo cargar el legajo'}</p>
      </Layout>
    )
  }

  return (
    <Layout titulo="Legajo del profesional">
      <button
        onClick={() => navigate('/liquidaciones')}
        className="text-sm text-text-muted hover:text-primary transition-colors mb-4"
      >
        ← Volver a Liquidaciones
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">
            {legajo.profesional.nombre} {legajo.profesional.apellido}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {TIPO_LABEL[legajo.profesional.tipo] ?? legajo.profesional.tipo} · {nombrePeriodo(periodo!)}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-3 py-1.5 rounded-full ${
            aprobada ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {aprobada ? 'Aprobada' : 'Borrador'}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}
      {mensaje && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
          {mensaje}
        </p>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <h3 className="font-semibold text-text mb-4">Producción</h3>
            {legajo.produccionDiaria.length === 0 ? (
              <p className="text-sm text-text-muted">Sin producción registrada este período</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {legajo.produccionDiaria.map((d) => (
                    <tr key={d.fecha} className="border-b border-border last:border-0">
                      <td className="py-2 text-text-muted">{formatoFecha(d.fecha)}</td>
                      <td className="py-2 text-text text-right">{formatoMoneda(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium text-text">Total del mes</p>
              <p className="text-lg font-bold text-text">{formatoMoneda(produccionTotal)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <h3 className="font-semibold text-text mb-4">Vales</h3>
            {legajo.vales.length === 0 ? (
              <p className="text-sm text-text-muted">Sin vales registrados este período</p>
            ) : (
              <div className="flex flex-col gap-2">
                {legajo.vales.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface">
                    <div>
                      <p className="text-sm text-text">{formatoFecha(v.fecha)}</p>
                      <p className="text-xs text-text-muted">{v.concepto ?? 'Sin concepto'}</p>
                    </div>
                    <p className="text-sm font-medium text-text">{formatoMoneda(Number(v.monto))}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium text-text">Subtotal vales</p>
              <p className="text-lg font-bold text-text">{formatoMoneda(valesTotal)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {!aprobada ? (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <h3 className="font-semibold text-text mb-4">Liquidación</h3>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Comisión</span>
                  <span className="text-text font-medium">{formatoMoneda(comision)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Vales</span>
                  <span className="text-text font-medium">-{formatoMoneda(valesTotal)}</span>
                </div>
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Cargas Sociales</label>
                <input
                  type="number"
                  value={cargasSociales}
                  onChange={(e) => setCargasSociales(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Descuentos</label>
                <input
                  type="number"
                  value={descuentos}
                  onChange={(e) => setDescuentos(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Otros descuentos</label>
                <input
                  type="number"
                  value={otros}
                  onChange={(e) => setOtros(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Notas</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="font-semibold text-text">Sueldo Neto</p>
                <p className="text-2xl font-bold text-primary">{formatoMoneda(sueldoNeto)}</p>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={handleGuardarBorrador}
                  disabled={guardando || aprobando}
                  className="border border-border text-text font-medium rounded-lg py-2 transition-colors hover:bg-surface disabled:opacity-60"
                >
                  {guardando ? 'Guardando...' : 'Guardar Borrador'}
                </button>
                <button
                  onClick={handleAprobar}
                  disabled={guardando || aprobando}
                  className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {aprobando ? 'Aprobando...' : 'Aprobar y Cerrar'}
                </button>
              </div>
            </div>
          ) : (
            legajo.liquidacion && (
              <div className="bg-white rounded-2xl shadow-sm border border-border p-6" id="recibo">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text">Recibo de sueldo</h3>
                  <button
                    onClick={() => window.print()}
                    className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    Imprimir
                  </button>
                </div>

                <p className="text-sm text-text-muted">
                  {legajo.profesional.nombre} {legajo.profesional.apellido} ·{' '}
                  {TIPO_LABEL[legajo.profesional.tipo] ?? legajo.profesional.tipo}
                </p>
                <p className="text-sm text-text-muted">{nombrePeriodo(periodo!)}</p>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Producción</span>
                    <span className="text-text">{formatoMoneda(Number(legajo.liquidacion.produccion))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Comisión</span>
                    <span className="text-text">{formatoMoneda(Number(legajo.liquidacion.comision))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Vales</span>
                    <span className="text-text">-{formatoMoneda(Number(legajo.liquidacion.vales))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Cargas Sociales</span>
                    <span className="text-text">-{formatoMoneda(Number(legajo.liquidacion.cargasSociales))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Descuentos</span>
                    <span className="text-text">-{formatoMoneda(Number(legajo.liquidacion.descuentos))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Otros</span>
                    <span className="text-text">-{formatoMoneda(Number(legajo.liquidacion.otros))}</span>
                  </div>
                  {legajo.liquidacion.notas && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Notas</span>
                      <span className="text-text">{legajo.liquidacion.notas}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="font-semibold text-text">Sueldo Neto</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatoMoneda(Number(legajo.liquidacion.sueldoNeto))}
                  </p>
                </div>

                <p className="text-xs text-text-muted mt-4">
                  Aprobada el {formatoFecha(legajo.liquidacion.creadoEn)}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </Layout>
  )
}
