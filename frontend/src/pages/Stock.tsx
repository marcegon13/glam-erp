import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { authStore } from '../store/auth'

type Tab = 'deposito' | 'laboratorio' | 'pedidos' | 'productos'
type Unidad = 'gr' | 'ml' | 'unidad' | 'litro'

interface Producto {
  id: number
  nombre: string
  marca: string
  unidad: Unidad
  precioUnitario: string
  stockMinimo: number
  activo: boolean
}

interface FilaDeposito {
  id: number
  nombre: string
  marca: string
  unidad: Unidad
  precioUnitario: number
  stockMinimo: number
  cantidad: number
  bajoMinimo: boolean
}

interface FilaLaboratorio {
  id: number
  productoId: number
  nombre: string
  marca: string
  unidad: Unidad
  cantidad: number
  fecha: string
}

interface Pedido {
  id: number
  productoId: number
  producto: string
  marca: string
  unidad: Unidad
  cantidad: number
  motivo: string | null
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  creadoPor: string | null
  autorizadoPor: string | null
  creadoEn: string
}

const UNIDADES: Unidad[] = ['gr', 'ml', 'unidad', 'litro']

const formatoMoneda = (v: number) => `$${v.toLocaleString('es-AR')}`
const formatoFecha = (f: string) => new Date(f).toLocaleDateString('es-AR')

const ESTADO_BADGE: Record<Pedido['estado'], string> = {
  PENDIENTE: 'bg-amber-50 text-amber-600',
  APROBADO: 'bg-green-50 text-green-700',
  RECHAZADO: 'bg-red-50 text-red-600',
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'deposito', label: 'Depósito' },
  { key: 'laboratorio', label: 'Laboratorio' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'productos', label: 'Productos' },
]

export default function Stock() {
  const esAdmin = authStore.getUser()?.rol === 'ADMINISTRADOR'
  const [tab, setTab] = useState<Tab>('deposito')
  const [error, setError] = useState('')

  const [deposito, setDeposito] = useState<FilaDeposito[]>([])
  const [laboratorio, setLaboratorio] = useState<FilaLaboratorio[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(false)

  // modales
  const [modal, setModal] = useState<
    | { tipo: 'compra' | 'bajar' | 'inventario'; fila: FilaDeposito }
    | { tipo: 'pedido' }
    | { tipo: 'producto'; editando: Producto | null }
    | null
  >(null)

  const fetchTab = async (t: Tab) => {
    setCargando(true)
    setError('')
    try {
      if (t === 'deposito') setDeposito((await api.get('/stock/deposito')).data)
      else if (t === 'laboratorio') setLaboratorio((await api.get('/stock/laboratorio')).data)
      else if (t === 'pedidos') setPedidos((await api.get('/stock/pedidos')).data)
      else if (t === 'productos') setProductos((await api.get('/stock/productos')).data)
    } catch {
      setError('No se pudo cargar la información')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchTab(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const recargar = () => fetchTab(tab)

  const resolverPedido = async (p: Pedido, accion: 'aprobar' | 'rechazar') => {
    try {
      await api.post(`/stock/pedidos/${p.id}/${accion}`)
      recargar()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No se pudo resolver el pedido')
    }
  }

  return (
    <Layout titulo="Stock">
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'bg-surface text-text hover:bg-[#EDE9FE]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* ── DEPÓSITO ── */}
      {tab === 'deposito' && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Marca</th>
                <th className="px-5 py-3 font-medium">Stock actual</th>
                <th className="px-5 py-3 font-medium">Mínimo</th>
                <th className="px-5 py-3 font-medium">Precio unit.</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-text-muted">Cargando...</td></tr>
              ) : deposito.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-text-muted">Sin productos activos</td></tr>
              ) : (
                deposito.map((f, i) => (
                  <tr key={f.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                    <td className="px-5 py-3 text-text font-medium">{f.nombre}</td>
                    <td className="px-5 py-3 text-text-muted">{f.marca}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          f.bajoMinimo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {f.cantidad} {f.unidad}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{f.stockMinimo} {f.unidad}</td>
                    <td className="px-5 py-3 text-text">{formatoMoneda(f.precioUnitario)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setModal({ tipo: 'compra', fila: f })}
                        className="text-primary hover:text-primary-dark font-medium mr-3 transition-colors"
                      >
                        Compra
                      </button>
                      <button
                        onClick={() => setModal({ tipo: 'bajar', fila: f })}
                        className="text-primary hover:text-primary-dark font-medium mr-3 transition-colors"
                      >
                        Bajar al Lab
                      </button>
                      <button
                        onClick={() => setModal({ tipo: 'inventario', fila: f })}
                        className="text-text-muted hover:text-text font-medium transition-colors"
                      >
                        Inventario
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LABORATORIO ── */}
      {tab === 'laboratorio' && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-x-auto">
          <div className="px-5 py-3 border-b border-border text-sm text-text-muted">
            Stock en laboratorio · {formatoFecha(new Date().toISOString())}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Marca</th>
                <th className="px-5 py-3 font-medium">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-text-muted">Cargando...</td></tr>
              ) : laboratorio.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-text-muted">No hay movimientos al laboratorio hoy</td></tr>
              ) : (
                laboratorio.map((f, i) => (
                  <tr key={f.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                    <td className="px-5 py-3 text-text font-medium">{f.nombre}</td>
                    <td className="px-5 py-3 text-text-muted">{f.marca}</td>
                    <td className="px-5 py-3 text-text">{f.cantidad} {f.unidad}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PEDIDOS ── */}
      {tab === 'pedidos' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setModal({ tipo: 'pedido' })}
              className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Nuevo pedido
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Producto</th>
                  <th className="px-5 py-3 font-medium">Cantidad</th>
                  <th className="px-5 py-3 font-medium">Motivo</th>
                  <th className="px-5 py-3 font-medium">Solicita</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={7} className="px-5 py-6 text-center text-text-muted">Cargando...</td></tr>
                ) : pedidos.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-6 text-center text-text-muted">Sin pedidos</td></tr>
                ) : (
                  pedidos.map((p, i) => (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                      <td className="px-5 py-3 text-text-muted">{formatoFecha(p.creadoEn)}</td>
                      <td className="px-5 py-3 text-text font-medium">{p.producto}</td>
                      <td className="px-5 py-3 text-text">{p.cantidad} {p.unidad}</td>
                      <td className="px-5 py-3 text-text-muted">{p.motivo ?? '—'}</td>
                      <td className="px-5 py-3 text-text-muted">{p.creadoPor ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[p.estado]}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {p.estado === 'PENDIENTE' && esAdmin ? (
                          <>
                            <button
                              onClick={() => resolverPedido(p, 'aprobar')}
                              className="text-green-700 hover:text-green-800 font-medium mr-3 transition-colors"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => resolverPedido(p, 'rechazar')}
                              className="text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              Rechazar
                            </button>
                          </>
                        ) : (
                          <span className="text-text-muted">
                            {p.autorizadoPor ? `por ${p.autorizadoPor}` : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── PRODUCTOS ── */}
      {tab === 'productos' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setModal({ tipo: 'producto', editando: null })}
              className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Nuevo Producto
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="px-5 py-3 font-medium">Nombre</th>
                  <th className="px-5 py-3 font-medium">Marca</th>
                  <th className="px-5 py-3 font-medium">Unidad</th>
                  <th className="px-5 py-3 font-medium">Precio unit.</th>
                  <th className="px-5 py-3 font-medium">Mínimo</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={7} className="px-5 py-6 text-center text-text-muted">Cargando...</td></tr>
                ) : productos.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-6 text-center text-text-muted">Sin productos en el catálogo</td></tr>
                ) : (
                  productos.map((p, i) => (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                      <td className="px-5 py-3 text-text font-medium">{p.nombre}</td>
                      <td className="px-5 py-3 text-text-muted">{p.marca}</td>
                      <td className="px-5 py-3 text-text-muted">{p.unidad}</td>
                      <td className="px-5 py-3 text-text">{formatoMoneda(Number(p.precioUnitario))}</td>
                      <td className="px-5 py-3 text-text-muted">{p.stockMinimo}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            p.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setModal({ tipo: 'producto', editando: p })}
                          className="text-primary hover:text-primary-dark font-medium transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal?.tipo === 'compra' && (
        <ModalMovimiento
          titulo={`Compra · ${modal.fila.nombre}`}
          fila={modal.fila}
          conPrecio
          onClose={() => setModal(null)}
          onGuardar={async ({ cantidad, precioUnitario, concepto }) => {
            await api.post('/stock/compra', {
              productoId: modal.fila.id,
              cantidad,
              precioUnitario,
              concepto: concepto || undefined,
            })
            setModal(null)
            recargar()
          }}
        />
      )}

      {modal?.tipo === 'bajar' && (
        <ModalMovimiento
          titulo={`Bajar al laboratorio · ${modal.fila.nombre}`}
          fila={modal.fila}
          onClose={() => setModal(null)}
          onGuardar={async ({ cantidad, concepto }) => {
            await api.post('/stock/bajar-laboratorio', {
              productoId: modal.fila.id,
              cantidad,
              concepto: concepto || undefined,
            })
            setModal(null)
            recargar()
          }}
        />
      )}

      {modal?.tipo === 'inventario' && (
        <ModalMovimiento
          titulo={`Inventario físico · ${modal.fila.nombre}`}
          fila={modal.fila}
          etiquetaCantidad={`Cantidad real contada (sistema: ${modal.fila.cantidad} ${modal.fila.unidad})`}
          sinConcepto
          onClose={() => setModal(null)}
          onGuardar={async ({ cantidad }) => {
            await api.post('/stock/inventario', { productoId: modal.fila.id, cantidadReal: cantidad })
            setModal(null)
            recargar()
          }}
        />
      )}

      {modal?.tipo === 'pedido' && (
        <ModalPedido onClose={() => setModal(null)} onGuardar={() => { setModal(null); recargar() }} />
      )}

      {modal?.tipo === 'producto' && (
        <ModalProducto
          editando={modal.editando}
          onClose={() => setModal(null)}
          onGuardar={() => { setModal(null); recargar() }}
        />
      )}
    </Layout>
  )
}

/* ── Modales ───────────────────────────────────────────────────────────── */

function ModalMovimiento({
  titulo,
  fila,
  conPrecio,
  sinConcepto,
  etiquetaCantidad,
  onClose,
  onGuardar,
}: {
  titulo: string
  fila: FilaDeposito
  conPrecio?: boolean
  sinConcepto?: boolean
  etiquetaCantidad?: string
  onClose: () => void
  onGuardar: (v: { cantidad: number; precioUnitario?: number; concepto?: string }) => Promise<void>
}) {
  const [cantidad, setCantidad] = useState('')
  const [precioUnitario, setPrecioUnitario] = useState(String(fila.precioUnitario))
  const [concepto, setConcepto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await onGuardar({
        cantidad: Number(cantidad),
        ...(conPrecio ? { precioUnitario: Number(precioUnitario) } : {}),
        ...(sinConcepto ? {} : { concepto }),
      })
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalShell titulo={titulo} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col">
        <label className="text-sm font-medium text-text mb-2">
          {etiquetaCantidad ?? `Cantidad (${fila.unidad})`}
        </label>
        <input
          type="number"
          step="any"
          min="0"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />

        {conPrecio && (
          <>
            <label className="text-sm font-medium text-text mb-2 mt-4">Precio unitario $</label>
            <input
              type="number"
              step="any"
              min="0"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </>
        )}

        {!sinConcepto && (
          <>
            <label className="text-sm font-medium text-text mb-2 mt-4">
              Concepto <span className="text-text-muted font-normal">(opcional)</span>
            </label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">{error}</p>}

        <BotonesModal guardando={guardando} onClose={onClose} />
      </form>
    </ModalShell>
  )
}

function ModalPedido({ onClose, onGuardar }: { onClose: () => void; onGuardar: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/stock/productos').then(({ data }) => {
      const activos = data.filter((p: Producto) => p.activo)
      setProductos(activos)
      if (activos[0]) setProductoId(String(activos[0].id))
    })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await api.post('/stock/pedidos', {
        productoId: Number(productoId),
        cantidad: Number(cantidad),
        motivo: motivo || undefined,
      })
      onGuardar()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al crear el pedido')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalShell titulo="Nuevo pedido" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col">
        <label className="text-sm font-medium text-text mb-2">Producto</label>
        <select
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          required
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
        >
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre} · {p.marca}</option>
          ))}
        </select>

        <label className="text-sm font-medium text-text mb-2 mt-4">Cantidad</label>
        <input
          type="number"
          step="any"
          min="0"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />

        <label className="text-sm font-medium text-text mb-2 mt-4">
          Motivo <span className="text-text-muted font-normal">(opcional)</span>
        </label>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">{error}</p>}

        <BotonesModal guardando={guardando} onClose={onClose} />
      </form>
    </ModalShell>
  )
}

function ModalProducto({
  editando,
  onClose,
  onGuardar,
}: {
  editando: Producto | null
  onClose: () => void
  onGuardar: () => void
}) {
  const [nombre, setNombre] = useState(editando?.nombre ?? '')
  const [marca, setMarca] = useState(editando?.marca ?? '')
  const [unidad, setUnidad] = useState<Unidad>(editando?.unidad ?? 'unidad')
  const [precioUnitario, setPrecioUnitario] = useState(editando ? String(editando.precioUnitario) : '')
  const [stockMinimo, setStockMinimo] = useState(String(editando?.stockMinimo ?? 0))
  const [activo, setActivo] = useState(editando?.activo ?? true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    const body = {
      nombre,
      marca,
      unidad,
      precioUnitario: Number(precioUnitario),
      stockMinimo: Number(stockMinimo) || 0,
      ...(editando ? { activo } : {}),
    }
    try {
      if (editando) await api.put(`/stock/productos/${editando.id}`, body)
      else await api.post('/stock/productos', body)
      onGuardar()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalShell titulo={editando ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col">
        <label className="text-sm font-medium text-text mb-2">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />

        <label className="text-sm font-medium text-text mb-2 mt-4">Marca</label>
        <input
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          required
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />

        <label className="text-sm font-medium text-text mb-2 mt-4">Unidad</label>
        <select
          value={unidad}
          onChange={(e) => setUnidad(e.target.value as Unidad)}
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
        >
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <label className="text-sm font-medium text-text mb-2 mt-4">Precio unitario $</label>
        <input
          type="number"
          step="any"
          min="0"
          value={precioUnitario}
          onChange={(e) => setPrecioUnitario(e.target.value)}
          required
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />

        <label className="text-sm font-medium text-text mb-2 mt-4">Stock mínimo</label>
        <input
          type="number"
          min="0"
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />

        {editando && (
          <label className="flex items-center gap-2 mt-4 text-sm text-text">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Producto activo
          </label>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">{error}</p>}

        <BotonesModal guardando={guardando} onClose={onClose} />
      </form>
    </ModalShell>
  )
}

function ModalShell({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-lg font-bold text-text">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-muted hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BotonesModal({ guardando, onClose }: { guardando: boolean; onClose: () => void }) {
  return (
    <div className="flex gap-3 mt-6">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={guardando}
        className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
      >
        {guardando ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )
}
