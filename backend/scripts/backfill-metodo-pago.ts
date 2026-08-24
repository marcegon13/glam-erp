/**
 * Backfill: migra el sistema de precios/métodos fijos (precioEfectivo/precioTarjeta,
 * enum MetodoPago) al modelo configurable (NivelPrecio, MetodoPagoConfig, ServicioPrecio).
 *
 * Requiere que el schema esté en el estado "Paso 1 - expandir" (tablas nuevas +
 * columnas metodoPagoId nullable, columnas/enum legacy todavía presentes).
 *
 * Solo ESCRIBE en tablas/columnas nuevas. No borra ni modifica nada del esquema
 * legacy. Es re-corrible: si un tenant ya tiene sus NivelPrecio/MetodoPagoConfig
 * creados, los reutiliza en vez de duplicar.
 *
 * Uso: npx tsx scripts/backfill-metodo-pago.ts           (aplica)
 *      npx tsx scripts/backfill-metodo-pago.ts --dry-run (solo imprime qué haría)
 */
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'

const DRY_RUN = process.argv.includes('--dry-run')

// Mapeo del método legacy -> configuración del nuevo MetodoPagoConfig.
// TARJETA/TRANSFERENCIA/MERCADO_PAGO comparten el nivel "Tarjeta" porque hoy
// cobrarOrden() ya los trata igual: `metodo === 'EFECTIVO' ? precioEfectivo : precioTarjeta`.
const METODOS_LEGACY = [
  { metodo: 'EFECTIVO', nombre: 'Efectivo', nivel: 'Efectivo', esEfectivo: true, acreditaAlInstante: true, orden: 0 },
  { metodo: 'TARJETA', nombre: 'Tarjeta', nivel: 'Tarjeta', esEfectivo: false, acreditaAlInstante: false, orden: 1 },
  { metodo: 'TRANSFERENCIA', nombre: 'Transferencia', nivel: 'Tarjeta', esEfectivo: false, acreditaAlInstante: false, orden: 2 },
  { metodo: 'MERCADO_PAGO', nombre: 'Mercado Pago', nivel: 'Tarjeta', esEfectivo: false, acreditaAlInstante: false, orden: 3 },
] as const

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no se escribe nada) ===' : '=== APLICANDO BACKFILL ===')

  const tenants = await prisma.tenant.findMany({ select: { id: true, nombre: true } })
  console.log(`Tenants a migrar: ${tenants.length}`)

  for (const tenant of tenants) {
    console.log(`\n--- Tenant ${tenant.id} (${tenant.nombre}) ---`)

    // 1) Niveles de precio: uno por cada nivel distinto usado en METODOS_LEGACY ("Efectivo", "Tarjeta").
    const nombresNivel = [...new Set(METODOS_LEGACY.map((m) => m.nivel))]
    const nivelPorNombre = new Map<string, number>()

    for (const [i, nombre] of nombresNivel.entries()) {
      const existente = await prisma.nivelPrecio.findUnique({
        where: { tenantId_nombre: { tenantId: tenant.id, nombre } }
      })
      if (existente) {
        console.log(`  NivelPrecio "${nombre}" ya existe (id=${existente.id}) — reutilizado`)
        nivelPorNombre.set(nombre, existente.id)
        continue
      }
      console.log(`  INSERT NivelPrecio { tenantId: ${tenant.id}, nombre: "${nombre}", orden: ${i} }`)
      if (!DRY_RUN) {
        const creado = await prisma.nivelPrecio.create({
          data: { tenantId: tenant.id, nombre, orden: i }
        })
        nivelPorNombre.set(nombre, creado.id)
      }
    }

    // 2) Métodos de pago configurables, uno por cada valor del enum legacy.
    const metodoConfigPorLegacy = new Map<string, number>()

    for (const m of METODOS_LEGACY) {
      const existente = await prisma.metodoPagoConfig.findUnique({
        where: { tenantId_nombre: { tenantId: tenant.id, nombre: m.nombre } }
      })
      if (existente) {
        console.log(`  MetodoPagoConfig "${m.nombre}" ya existe (id=${existente.id}) — reutilizado`)
        metodoConfigPorLegacy.set(m.metodo, existente.id)
        continue
      }
      const nivelPrecioId = DRY_RUN ? -1 : nivelPorNombre.get(m.nivel)!
      console.log(
        `  INSERT MetodoPagoConfig { tenantId: ${tenant.id}, nombre: "${m.nombre}", ` +
        `nivelPrecioId: <${m.nivel}>, esEfectivo: ${m.esEfectivo}, acreditaAlInstante: ${m.acreditaAlInstante}, orden: ${m.orden} }`
      )
      if (!DRY_RUN) {
        const creado = await prisma.metodoPagoConfig.create({
          data: {
            tenantId: tenant.id,
            nombre: m.nombre,
            nivelPrecioId,
            esEfectivo: m.esEfectivo,
            acreditaAlInstante: m.acreditaAlInstante,
            orden: m.orden
          }
        })
        metodoConfigPorLegacy.set(m.metodo, creado.id)
      }
    }

    // 3) ServicioPrecio: copia precioEfectivo/precioTarjeta de cada Servicio del tenant.
    const servicios = await prisma.servicio.findMany({ where: { tenantId: tenant.id } })
    for (const servicio of servicios) {
      for (const [nivel, precio] of [
        ['Efectivo', servicio.precioEfectivo],
        ['Tarjeta', servicio.precioTarjeta]
      ] as const) {
        const nivelPrecioId = DRY_RUN ? -1 : nivelPorNombre.get(nivel)!
        const yaExiste = DRY_RUN
          ? false
          : await prisma.servicioPrecio.findUnique({
              where: { servicioId_nivelPrecioId: { servicioId: servicio.id, nivelPrecioId } }
            })
        if (yaExiste) {
          console.log(`  ServicioPrecio (servicio=${servicio.id}, nivel=${nivel}) ya existe — omitido`)
          continue
        }
        console.log(
          `  INSERT ServicioPrecio { servicioId: ${servicio.id} ("${servicio.nombre}"), nivel: "${nivel}", precio: ${precio} }`
        )
        if (!DRY_RUN) {
          await prisma.servicioPrecio.create({
            data: { servicioId: servicio.id, nivelPrecioId, precio }
          })
        }
      }
    }

    // 4) Pago.metodoPagoId: reescribe cada Pago de órdenes del tenant según su `metodo` legacy.
    const pagos = await prisma.pago.findMany({
      where: { orden: { tenantId: tenant.id }, metodoPagoId: null }
    })
    for (const pago of pagos) {
      const metodoPagoId = DRY_RUN ? -1 : metodoConfigPorLegacy.get(pago.metodo)!
      console.log(`  UPDATE Pago SET metodoPagoId = <${pago.metodo}> WHERE id = ${pago.id}`)
      if (!DRY_RUN) {
        await prisma.pago.update({ where: { id: pago.id }, data: { metodoPagoId } })
      }
    }

    // 5) Caja.metodoPagoId: mismo reemplazo para los movimientos de caja del tenant.
    const movimientos = await prisma.caja.findMany({
      where: { tenantId: tenant.id, metodoPagoId: null }
    })
    for (const mov of movimientos) {
      const metodoPagoId = DRY_RUN ? -1 : metodoConfigPorLegacy.get(mov.metodo)!
      console.log(`  UPDATE Caja SET metodoPagoId = <${mov.metodo}> WHERE id = ${mov.id}`)
      if (!DRY_RUN) {
        await prisma.caja.update({ where: { id: mov.id }, data: { metodoPagoId } })
      }
    }
  }

  console.log(DRY_RUN ? '\n=== DRY RUN completo, nada escrito ===' : '\n=== Backfill completo ===')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
