// =============================================================
// LABORATORIO MONGODB - Ejercicios de Consultas
// Nivel 1: CRUD básico  |  Nivel 2: Queries  |  Nivel 3: Aggregation
// =============================================================

use("tienda_online");

// ╔══════════════════════════════════════════════════════════╗
// ║  NIVEL 1 — CRUD BÁSICO                                   ║
// ╚══════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────
// EJ 1.1 — CREATE: Insertar un nuevo producto
// SQL: INSERT INTO productos (nombre, categoria, precio, stock)
//      VALUES ('Teclado Mecánico', 'electrónica', 89.99, 75);
// ─────────────────────────────────────────────────────────────
db.productos.insertOne({
  nombre: "Teclado Mecánico RGB",
  categoria: "electrónica",
  subcategoria: "periféricos",
  precio: 89.99,
  stock: 75,
  marca: "KeyMaster",
  especificaciones: {
    switches: "Cherry MX Red",
    retroiluminacion: "RGB",
    conexion: "USB-C"
  },
  tags: ["teclado", "gaming", "mecánico"],
  calificacion_promedio: 0,
  total_vendidos: 0,
  fecha_alta: new Date(),
  activo: true
});

// ─────────────────────────────────────────────────────────────
// EJ 1.2 — READ: Buscar todos los productos de electrónica
// SQL: SELECT * FROM productos WHERE categoria = 'electrónica';
// ─────────────────────────────────────────────────────────────
db.productos.find({ categoria: "electrónica" });

// ─────────────────────────────────────────────────────────────
// EJ 1.3 — READ con proyección: Solo nombre y precio
// SQL: SELECT nombre, precio FROM productos WHERE categoria = 'electrónica';
// ─────────────────────────────────────────────────────────────
db.productos.find(
  { categoria: "electrónica" },
  { nombre: 1, precio: 1, _id: 0 }
);

// ─────────────────────────────────────────────────────────────
// EJ 1.4 — UPDATE: Aumentar 10% el precio de un producto
// SQL: UPDATE productos SET precio = precio * 1.10
//      WHERE nombre = 'Laptop Pro 15';
// ─────────────────────────────────────────────────────────────
db.productos.updateOne(
  { nombre: "Laptop Pro 15" },
  { $mul: { precio: 1.10 } }
);

// Verificar el cambio
db.productos.findOne({ nombre: "Laptop Pro 15" }, { nombre: 1, precio: 1 });

// ─────────────────────────────────────────────────────────────
// EJ 1.5 — UPDATE MASIVO: Descuento en categoría
// SQL: UPDATE productos SET precio = precio * 0.85
//      WHERE categoria = 'deportes';
// ─────────────────────────────────────────────────────────────
db.productos.updateMany(
  { categoria: "deportes" },
  { $mul: { precio: 0.85 } }
);

// ─────────────────────────────────────────────────────────────
// EJ 1.6 — DELETE: Borrar productos sin stock e inactivos
// SQL: DELETE FROM productos WHERE stock = 0 AND activo = false;
// ─────────────────────────────────────────────────────────────
db.productos.deleteMany({ stock: 0, activo: false });


// ╔══════════════════════════════════════════════════════════╗
// ║  NIVEL 2 — CONSULTAS AVANZADAS                           ║
// ╚══════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────
// EJ 2.1 — Filtros combinados con operadores lógicos
// SQL: SELECT * FROM productos
//      WHERE (precio BETWEEN 100 AND 500) AND stock > 0
//      ORDER BY precio ASC;
// ─────────────────────────────────────────────────────────────
db.productos.find({
  precio: { $gte: 100, $lte: 500 },
  stock: { $gt: 0 }
}).sort({ precio: 1 });

// ─────────────────────────────────────────────────────────────
// EJ 2.2 — Buscar en arrays (aquí MongoDB supera a SQL)
// No existe equivalente simple en SQL sin tabla intermedia
// ─────────────────────────────────────────────────────────────
// Productos que tienen el tag "gaming"
db.productos.find({ tags: "gaming" }, { nombre: 1, tags: 1, precio: 1 });

// Productos con varios tags a la vez ($all)
db.productos.find(
  { tags: { $all: ["gaming", "monitor"] } },
  { nombre: 1, tags: 1 }
);

// ─────────────────────────────────────────────────────────────
// EJ 2.3 — Consultar campos anidados (documentos embebidos)
// En SQL requeriría JOIN a tabla de especificaciones
// ─────────────────────────────────────────────────────────────
// Clientes premium con notificaciones activas
db.clientes.find({
  plan: "premium",
  "preferencias.notificaciones": true
}, { nombre: 1, ciudad: 1, plan: 1 });

// ─────────────────────────────────────────────────────────────
// EJ 2.4 — $or y $and explícito
// SQL: SELECT * FROM productos
//      WHERE categoria = 'libros' OR calificacion_promedio >= 4.5;
// ─────────────────────────────────────────────────────────────
db.productos.find({
  $or: [
    { categoria: "libros" },
    { calificacion_promedio: { $gte: 4.5 } }
  ]
}, { nombre: 1, categoria: 1, calificacion_promedio: 1 }).sort({ calificacion_promedio: -1 });

// ─────────────────────────────────────────────────────────────
// EJ 2.5 — Búsqueda con regex (texto parcial)
// SQL: SELECT * FROM clientes WHERE email LIKE '%gmail%';
// ─────────────────────────────────────────────────────────────
db.clientes.find(
  { email: { $regex: /email\.com$/ } },
  { nombre: 1, email: 1, _id: 0 }
);

// ─────────────────────────────────────────────────────────────
// EJ 2.6 — Consultas sobre arrays de objetos embebidos
// En SQL requeriría JOIN a tabla pedido_items
// ─────────────────────────────────────────────────────────────
// Pedidos que contienen la Laptop Pro 15
db.pedidos.find(
  { "items.nombre": { $regex: /Laptop/ } },
  { numero: 1, cliente_nombre: 1, total: 1, estado: 1 }
);

// Pedidos con al menos un item de precio > 500
db.pedidos.find(
  { "items.precio_unitario": { $gt: 500 } },
  { numero: 1, cliente_nombre: 1, total: 1 }
);

// ─────────────────────────────────────────────────────────────
// EJ 2.7 — findOne + límite y paginación
// SQL: SELECT * FROM productos ORDER BY total_vendidos DESC LIMIT 3 OFFSET 0;
// ─────────────────────────────────────────────────────────────
// Top 3 productos más vendidos
db.productos.find({}, { nombre: 1, total_vendidos: 1, precio: 1 })
  .sort({ total_vendidos: -1 })
  .limit(3);

// Paginación — página 2, 3 por página
db.productos.find({})
  .sort({ nombre: 1 })
  .skip(3)
  .limit(3);

// ─────────────────────────────────────────────────────────────
// EJ 2.8 — $exists y $type (datos incompletos)
// Clientes sin campo "saldo_fidelidad" o con tipo incorrecto
// SQL: SELECT * FROM clientes WHERE saldo_fidelidad IS NULL;
// ─────────────────────────────────────────────────────────────
db.clientes.find({ saldo_fidelidad: { $exists: false } });
db.clientes.find({ saldo_fidelidad: { $type: "number" } }, { nombre: 1, saldo_fidelidad: 1 });


// ╔══════════════════════════════════════════════════════════╗
// ║  NIVEL 3 — AGGREGATION PIPELINE                          ║
// ║  (donde MongoDB realmente brilla sobre SQL)              ║
// ╚══════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────
// EJ 3.1 — GROUP BY básico: total de pedidos por estado
// SQL: SELECT estado, COUNT(*) as cantidad, SUM(total) as ingresos
//      FROM pedidos GROUP BY estado;
// ─────────────────────────────────────────────────────────────
db.pedidos.aggregate([
  {
    $group: {
      _id: "$estado",
      cantidad: { $sum: 1 },
      ingresos: { $sum: "$total" },
      promedio: { $avg: "$total" }
    }
  },
  { $sort: { ingresos: -1 } }
]);

// ─────────────────────────────────────────────────────────────
// EJ 3.2 — MATCH + GROUP: ventas por categoría de producto
// SQL: SELECT p.categoria, SUM(i.cantidad) as unidades, SUM(i.precio * i.cantidad) as revenue
//      FROM pedidos pd JOIN items i ON ... JOIN productos p ON ...
//      WHERE pd.estado = 'entregado' GROUP BY p.categoria;
//
// En MongoDB: $unwind expande arrays — ¡sin necesidad de JOINs!
// ─────────────────────────────────────────────────────────────
db.pedidos.aggregate([
  // Solo pedidos entregados
  { $match: { estado: "entregado" } },
  // Expandir el array de items (uno por row)
  { $unwind: "$items" },
  // JOIN con productos
  {
    $lookup: {
      from: "productos",
      localField: "items.producto_id",
      foreignField: "_id",
      as: "producto_info"
    }
  },
  { $unwind: "$producto_info" },
  // Agrupar por categoría
  {
    $group: {
      _id: "$producto_info.categoria",
      unidades_vendidas: { $sum: "$items.cantidad" },
      revenue: { $sum: { $multiply: ["$items.cantidad", "$items.precio_unitario"] } }
    }
  },
  { $sort: { revenue: -1 } },
  // Renombrar campos de salida
  {
    $project: {
      categoria: "$_id",
      unidades_vendidas: 1,
      revenue: { $round: ["$revenue", 2] },
      _id: 0
    }
  }
]);

// ─────────────────────────────────────────────────────────────
// EJ 3.3 — $bucket: distribución de precios (histograma)
// En SQL es complejo con CASE WHEN o CTE
// ─────────────────────────────────────────────────────────────
db.productos.aggregate([
  {
    $bucket: {
      groupBy: "$precio",
      boundaries: [0, 50, 100, 300, 700, 1500],
      default: "1500+",
      output: {
        cantidad: { $sum: 1 },
        productos: { $push: "$nombre" },
        precio_promedio: { $avg: "$precio" }
      }
    }
  }
]);

// ─────────────────────────────────────────────────────────────
// EJ 3.4 — Análisis de clientes: gasto total por cliente
// con datos de pedidos + info del cliente
// SQL: Multi-JOIN + GROUP BY + HAVING
// ─────────────────────────────────────────────────────────────
db.pedidos.aggregate([
  { $match: { estado: { $ne: "cancelado" } } },
  {
    $group: {
      _id: "$cliente_id",
      nombre: { $first: "$cliente_nombre" },
      total_gastado: { $sum: "$total" },
      cantidad_pedidos: { $sum: 1 },
      ultimo_pedido: { $max: "$fecha" }
    }
  },
  // JOIN con clientes para traer el plan
  {
    $lookup: {
      from: "clientes",
      localField: "_id",
      foreignField: "_id",
      as: "cliente"
    }
  },
  { $unwind: "$cliente" },
  {
    $project: {
      nombre: 1,
      plan: "$cliente.plan",
      total_gastado: { $round: ["$total_gastado", 2] },
      cantidad_pedidos: 1,
      ticket_promedio: { $round: [{ $divide: ["$total_gastado", "$cantidad_pedidos"] }, 2] },
      ultimo_pedido: 1,
      _id: 0
    }
  },
  { $sort: { total_gastado: -1 } }
]);

// ─────────────────────────────────────────────────────────────
// EJ 3.5 — $facet: múltiples aggregations en paralelo
// SUPER PODER de MongoDB — imposible en SQL estándar sin CTEs múltiples
// ─────────────────────────────────────────────────────────────
db.productos.aggregate([
  {
    $facet: {
      // Faceta 1: resumen por categoría
      por_categoria: [
        { $group: { _id: "$categoria", cantidad: { $sum: 1 }, precio_prom: { $avg: "$precio" } } },
        { $sort: { cantidad: -1 } }
      ],
      // Faceta 2: top 3 más vendidos
      mas_vendidos: [
        { $sort: { total_vendidos: -1 } },
        { $limit: 3 },
        { $project: { nombre: 1, total_vendidos: 1, precio: 1, _id: 0 } }
      ],
      // Faceta 3: estadísticas generales
      estadisticas: [
        {
          $group: {
            _id: null,
            total_productos: { $sum: 1 },
            precio_minimo: { $min: "$precio" },
            precio_maximo: { $max: "$precio" },
            precio_promedio: { $avg: "$precio" }
          }
        }
      ]
    }
  }
]);

// ─────────────────────────────────────────────────────────────
// EJ 3.6 — $addFields + $map: transformar arrays en pipeline
// Calcular subtotal de cada ítem en pedidos
// ─────────────────────────────────────────────────────────────
db.pedidos.aggregate([
  { $match: { estado: "entregado" } },
  {
    $addFields: {
      items_con_subtotal: {
        $map: {
          input: "$items",
          as: "item",
          in: {
            nombre: "$$item.nombre",
            cantidad: "$$item.cantidad",
            precio_unitario: "$$item.precio_unitario",
            subtotal: { $multiply: ["$$item.cantidad", "$$item.precio_unitario"] }
          }
        }
      }
    }
  },
  { $project: { numero: 1, cliente_nombre: 1, items_con_subtotal: 1, total: 1 } }
]);


// ╔══════════════════════════════════════════════════════════╗
// ║  BONUS — CONSUMIR API EXTERNA (Open Library API)         ║
// ║  Mostrar cómo traer datos externos e insertarlos         ║
// ╚══════════════════════════════════════════════════════════╝

// Este bloque se ejecuta desde Node.js (ver script 03_api_externa.js)
// Open Library API — búsqueda de libros de programación (FREE, sin auth)
// GET https://openlibrary.org/search.json?subject=mongodb&limit=5

print("");
print("═══════════════════════════════════════════════════");
print("  CONSULTAS COMPLETADAS");
print("  Ver 03_api_externa.js para demo de API externa");
print("═══════════════════════════════════════════════════");
