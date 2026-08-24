import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

type TipoTurno = 'MANIANA' | 'TARDE'
type EstadoAcreditacion = 'ACREDITADO' | 'PENDIENTE'

interface Turno {
  id: number
  tipo: TipoTurno
  cajera: string
  fondoCambio: string
  estado: 'ABIERTO' | 'CERRADO'
  efectivoContado: string | null
  diferencia: string | null
  observaciones: string | null
  abiertaEn: string
  cerradaEn: string | null
}

interface Resumen {
  porMetodo: {
    EFECTIVO: number
    TARJETA: number
    TRANSFERENCIA: number
    MERCADO_PAGO: number
  }
  estadoPorMetodo: {
    EFECTIVO: EstadoAcreditacion
    TARJETA: EstadoAcreditacion
    TRANSFERENCIA: EstadoAcreditacion
    MERCADO_PAGO: EstadoAcreditacion
  }
  totalIngresos: number
  totalEgresos: number
  egresosEfectivo: number
  egresosDetalle: { id: number; concepto: string; monto: number }[]
  fondoCambio: number
  efectivoEsperado: number
}

const TIPO_LABEL: Record<TipoTurno, string> = {
  MANIANA: 'Mañana',
  TARDE: 'Tarde',
}

const FILAS_INGRESOS: { key: 'EFECTIVO' | 'TARJETA' | 'MERCADO_PAGO'; label: string }[] = [
  { key: 'EFECTIVO', label: 'Efectivo' },
  { key: 'TARJETA', label: 'Tarjeta' },
  { key: 'MERCADO_PAGO', label: 'Mercado Pago' },
]

const FONDO_CAMBIO_DEFAULT = 5000

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`
const formatoHora = (fecha: string) =>
  new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
const formatoFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function EstadoBadge({ estado }: { estado: EstadoAcreditacion }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full ${
        estado === 'ACREDITADO' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'
      }`}
    >
      {estado === 'ACREDITADO' ? 'Acreditado' : 'Pendiente'}
    </span>
  )
}

function SeccionIngresos({ resumen }: { resumen: Resumen }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h3 className="font-semibold text-text mb-4">1. Ingresos</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border">
            <th className="py-2 font-medium">Método</th>
            <th className="py-2 font-medium text-right">Monto</th>
            <th className="py-2 font-medium text-right">Estado</th>
          </tr>
        </thead>
        <tbody>
          {FILAS_INGRESOS.map((fila) => (
            <tr key={fila.key} className="border-b border-border last:border-0">
              <td className="py-2 text-text">{fila.label}</td>
              <td className="py-2 text-text text-right">{formatoMoneda(resumen.porMetodo[fila.key])}</td>
              <td className="py-2 text-right">
                <EstadoBadge estado={resumen.estadoPorMetodo[fila.key]} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="py-2 text-text">Total Ingresos</td>
            <td className="py-2 text-text text-right" colSpan={2}>
              {formatoMoneda(resumen.totalIngresos)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function SeccionEgresos({
  resumen,
  onEliminar,
  eliminandoId,
}: {
  resumen: Resumen
  onEliminar?: (id: number) => void
  eliminandoId?: number | null
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h3 className="font-semibold text-text mb-4">2. Egresos</h3>
      {resumen.egresosDetalle.length === 0 ? (
        <p className="text-sm text-text-muted">Sin egresos registrados en este turno</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="py-2 font-medium">Concepto</th>
              <th className="py-2 font-medium text-right">Monto</th>
              {onEliminar && <th className="py-2 font-medium text-right w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {resumen.egresosDetalle.map((egreso) => (
              <tr key={egreso.id} className="border-b border-border last:border-0">
                <td className="py-2 text-text">{egreso.concepto}</td>
                <td className="py-2 text-text text-right">{formatoMoneda(egreso.monto)}</td>
                {onEliminar && (
                  <td className="py-2 text-right">
                    <button
                      onClick={() => onEliminar(egreso.id)}
                      disabled={eliminandoId === egreso.id}
                      title="Eliminar egreso"
                      className="text-text-muted hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2 text-text">Total Egresos</td>
              <td className="py-2 text-text text-right" colSpan={onEliminar ? 2 : 1}>
                {formatoMoneda(resumen.totalEgresos)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

function RegistrarEgresoForm({
  concepto,
  monto,
  onChangeConcepto,
  onChangeMonto,
  onSubmit,
  guardando,
  error,
}: {
  concepto: string
  monto: string
  onChangeConcepto: (v: string) => void
  onChangeMonto: (v: string) => void
  onSubmit: () => void
  guardando: boolean
  error: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h3 className="font-semibold text-text mb-4">Registrar Egreso</h3>
      <div className="flex gap-3 items-start">
        <input
          value={concepto}
          onChange={(e) => onChangeConcepto(e.target.value)}
          placeholder="Ej: Pago proveedor, Compra insumos..."
          className="flex-1 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors text-sm"
        />
        <input
          type="number"
          value={monto}
          onChange={(e) => onChangeMonto(e.target.value)}
          placeholder="$"
          className="w-32 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors text-sm"
        />
        <button
          onClick={onSubmit}
          disabled={guardando || !concepto.trim() || !monto}
          className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg w-10 h-9.5 flex items-center justify-center transition-colors disabled:opacity-60"
          title="Registrar egreso"
        >
          +
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}

function FilasCalculadas({ resumen }: { resumen: Resumen }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-text-muted">Fondo de cambio inicial</span>
        <span className="text-text">{formatoMoneda(resumen.fondoCambio)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text-muted">+ Ingresos en efectivo</span>
        <span className="text-text">{formatoMoneda(resumen.porMetodo.EFECTIVO)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text-muted">- Egresos en efectivo</span>
        <span className="text-text">-{formatoMoneda(resumen.egresosEfectivo)}</span>
      </div>
      <div className="flex justify-between pt-2 border-t border-border">
        <span className="font-bold text-primary">= Efectivo esperado en caja</span>
        <span className="font-bold text-primary text-lg">{formatoMoneda(resumen.efectivoEsperado)}</span>
      </div>
    </div>
  )
}

function DiferenciaBox({ diferencia }: { diferencia: number }) {
  const positiva = diferencia >= 0
  return (
    <div className={`flex items-center justify-between mt-4 rounded-lg px-3 py-3 ${positiva ? 'bg-green-50' : 'bg-red-50'}`}>
      <p className={`text-sm font-medium ${positiva ? 'text-green-700' : 'text-red-600'}`}>Diferencia</p>
      <p className={`text-lg font-bold ${positiva ? 'text-green-700' : 'text-red-600'}`}>{formatoMoneda(diferencia)}</p>
    </div>
  )
}

export default function CierreTurno() {
  const [cargando, setCargando] = useState(true)
  const [turno, setTurno] = useState<Turno | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState('')

  const [cajeraNombre, setCajeraNombre] = useState('')
  const [fondoCambio, setFondoCambio] = useState(String(FONDO_CAMBIO_DEFAULT))
  const [abriendo, setAbriendo] = useState<TipoTurno | null>(null)

  const [efectivoContado, setEfectivoContado] = useState('')
  const [modalCierre, setModalCierre] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const [cierreFinal, setCierreFinal] = useState<{ turno: Turno; resumen: Resumen } | null>(null)

  const [nuevoConcepto, setNuevoConcepto] = useState('')
  const [nuevoMonto, setNuevoMonto] = useState('')
  const [guardandoEgreso, setGuardandoEgreso] = useState(false)
  const [errorEgreso, setErrorEgreso] = useState('')
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)

  const fetchActivo = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/turnos-caja/activo')
      setTurno(data.turno)
      setResumen(data.resumen)
    } catch {
      setError('No se pudo cargar el turno activo')
    } finally {
      setCargando(false)
    }
  }

  const refrescarResumen = async () => {
    try {
      const { data } = await api.get('/turnos-caja/activo')
      setTurno(data.turno)
      setResumen(data.resumen)
    } catch {
      setError('No se pudo actualizar el resumen del turno')
    }
  }

  const handleAgregarEgreso = async () => {
    if (!nuevoConcepto.trim() || !nuevoMonto) return
    setErrorEgreso('')
    setGuardandoEgreso(true)
    try {
      await api.post('/caja', {
        tipo: 'EGRESO',
        metodo: 'EFECTIVO',
        monto: Number(nuevoMonto),
        concepto: nuevoConcepto.trim(),
      })
      setNuevoConcepto('')
      setNuevoMonto('')
      await refrescarResumen()
    } catch (err: any) {
      setErrorEgreso(err.response?.data?.error ?? 'Error al registrar el egreso')
    } finally {
      setGuardandoEgreso(false)
    }
  }

  const handleEliminarEgreso = async (id: number) => {
    setEliminandoId(id)
    try {
      await api.delete(`/caja/${id}`)
      await refrescarResumen()
    } catch {
      setError('No se pudo eliminar el egreso')
    } finally {
      setEliminandoId(null)
    }
  }

  useEffect(() => {
    fetchActivo()
  }, [])

  const handleAbrirTurno = async (tipo: TipoTurno) => {
    if (!cajeraNombre.trim() || !fondoCambio) return
    setError('')
    setAbriendo(tipo)
    try {
      await api.post('/turnos-caja/abrir', {
        tipo,
        cajera: cajeraNombre,
        fondoCambio: Number(fondoCambio),
      })
      await fetchActivo()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al abrir el turno')
    } finally {
      setAbriendo(null)
    }
  }

  const diferenciaPreview =
    turno && resumen && efectivoContado !== '' ? Number(efectivoContado) - resumen.efectivoEsperado : null

  const abrirModalCierre = () => {
    setObservaciones('')
    setErrorModal('')
    setModalCierre(true)
  }

  const handleConfirmarCierre = async () => {
    if (!turno || efectivoContado === '') return
    setErrorModal('')
    setCerrando(true)
    try {
      const { data } = await api.post(`/turnos-caja/${turno.id}/cerrar`, {
        efectivoContado: Number(efectivoContado),
        observaciones: observaciones || undefined,
      })
      setModalCierre(false)
      setCierreFinal(data)
      setTurno(null)
      setResumen(null)
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al cerrar el turno')
    } finally {
      setCerrando(false)
    }
  }

  const handleVolver = () => {
    setCierreFinal(null)
    setCajeraNombre('')
    setFondoCambio(String(FONDO_CAMBIO_DEFAULT))
    setEfectivoContado('')
    fetchActivo()
  }

  if (cargando) {
    return (
      <Layout titulo="Cierre de Turno">
        <p className="text-text-muted">Cargando...</p>
      </Layout>
    )
  }

  // Vista: recibo del turno recién cerrado
  if (cierreFinal) {
    const { turno: t, resumen: r } = cierreFinal
    return (
      <Layout titulo="Cierre de Turno">
        <div className="max-w-2xl mx-auto flex flex-col gap-6" id="recibo-turno">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-text">Planilla de Cierre de Caja</h2>
              <button
                onClick={() => window.print()}
                className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
              >
                🖨️ Imprimir
              </button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
              <span>Fecha: {formatoFecha(t.abiertaEn)}</span>
              <span>
                Hora: {formatoHora(t.abiertaEn)} - {t.cerradaEn && formatoHora(t.cerradaEn)}
              </span>
              <span>Cajera: {t.cajera}</span>
              <span>Turno: {TIPO_LABEL[t.tipo]}</span>
            </div>
          </div>

          <SeccionIngresos resumen={r} />
          <SeccionEgresos resumen={r} />

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <h3 className="font-semibold text-text mb-4">3. Arqueo de Efectivo</h3>
            <FilasCalculadas resumen={r} />
            <div className="flex justify-between mt-4 pt-4 border-t border-border text-sm font-medium">
              <span className="text-text">Efectivo contado</span>
              <span className="text-text">{formatoMoneda(Number(t.efectivoContado))}</span>
            </div>
            <DiferenciaBox diferencia={Number(t.diferencia)} />
            {t.observaciones && (
              <div className="flex justify-between mt-4 pt-4 border-t border-border text-sm">
                <span className="text-text-muted">Observaciones</span>
                <span className="text-text">{t.observaciones}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleVolver}
            className="border border-border text-text font-medium rounded-lg py-2 transition-colors hover:bg-surface"
          >
            Volver
          </button>
        </div>
      </Layout>
    )
  }

  // Vista: no hay turno abierto -> abrir uno nuevo
  if (!turno) {
    return (
      <Layout titulo="Cierre de Turno">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-text mb-4">Abrir turno de caja</h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          <div className="flex flex-col">
            <label className="text-sm font-medium text-text mb-2">Nombre de la cajera</label>
            <input
              value={cajeraNombre}
              onChange={(e) => setCajeraNombre(e.target.value)}
              placeholder="Ej: Sofía Ruiz"
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col mt-4">
            <label className="text-sm font-medium text-text mb-2">Fondo de cambio $</label>
            <input
              type="number"
              value={fondoCambio}
              onChange={(e) => setFondoCambio(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => handleAbrirTurno('MANIANA')}
              disabled={!cajeraNombre.trim() || !fondoCambio || abriendo !== null}
              className="flex flex-col items-center gap-2 border-2 border-border rounded-2xl py-8 hover:border-primary hover:bg-[#EDE9FE] transition-colors disabled:opacity-60"
            >
              <span className="text-4xl">☀️</span>
              <span className="font-medium text-text">
                {abriendo === 'MANIANA' ? 'Abriendo...' : 'Abrir Turno Mañana'}
              </span>
            </button>
            <button
              onClick={() => handleAbrirTurno('TARDE')}
              disabled={!cajeraNombre.trim() || !fondoCambio || abriendo !== null}
              className="flex flex-col items-center gap-2 border-2 border-border rounded-2xl py-8 hover:border-primary hover:bg-[#EDE9FE] transition-colors disabled:opacity-60"
            >
              <span className="text-4xl">🌙</span>
              <span className="font-medium text-text">
                {abriendo === 'TARDE' ? 'Abriendo...' : 'Abrir Turno Tarde'}
              </span>
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // Vista: turno abierto -> planilla en vivo + cierre
  return (
    <Layout titulo="Cierre de Turno">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-[#EDE9FE] text-primary">
            {turno.tipo === 'MANIANA' ? '☀️' : '🌙'} Turno {TIPO_LABEL[turno.tipo]} · {turno.cajera} · desde{' '}
            {formatoHora(turno.abiertaEn)} · Fondo {formatoMoneda(Number(turno.fondoCambio))}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        {resumen && (
          <>
            <SeccionIngresos resumen={resumen} />

            <RegistrarEgresoForm
              concepto={nuevoConcepto}
              monto={nuevoMonto}
              onChangeConcepto={setNuevoConcepto}
              onChangeMonto={setNuevoMonto}
              onSubmit={handleAgregarEgreso}
              guardando={guardandoEgreso}
              error={errorEgreso}
            />

            <SeccionEgresos resumen={resumen} onEliminar={handleEliminarEgreso} eliminandoId={eliminandoId} />

            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <h3 className="font-semibold text-text mb-4">3. Arqueo de Efectivo</h3>
              <FilasCalculadas resumen={resumen} />

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Efectivo contado $</label>
                <input
                  type="number"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              {diferenciaPreview !== null && <DiferenciaBox diferencia={diferenciaPreview} />}
            </div>

            <button
              onClick={abrirModalCierre}
              disabled={efectivoContado === ''}
              className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-3 transition-colors disabled:opacity-60"
            >
              Cerrar Turno
            </button>
          </>
        )}
      </div>

      {modalCierre && resumen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">Confirmar cierre de turno</h2>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Total Ingresos</span>
                <span className="text-text font-medium">{formatoMoneda(resumen.totalIngresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Total Egresos</span>
                <span className="text-text font-medium">{formatoMoneda(resumen.totalEgresos)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-1">
                <FilasCalculadas resumen={resumen} />
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-medium">
                <span className="text-text">Efectivo contado</span>
                <span className="text-text">{formatoMoneda(Number(efectivoContado))}</span>
              </div>
            </div>

            {diferenciaPreview !== null && <DiferenciaBox diferencia={diferenciaPreview} />}

            <div className="flex flex-col mt-4">
              <label className="text-sm font-medium text-text mb-2">
                Observaciones <span className="text-text-muted font-normal">(opcional)</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {errorModal && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                {errorModal}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModalCierre(false)}
                className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCierre}
                disabled={cerrando}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
              >
                {cerrando ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
