---
layout: default
title: Laboratorio — tienda_online
parent: Unidad 4
nav_order: 7
permalink: /unidad-4/guias/laboratorio-tienda-online/
---

[← Unidad 4](../)

# Laboratorio Práctico — tienda\_online

Laboratorio con ejercicios de tres niveles sobre una base de datos de tienda online. Cubre CRUD, consultas avanzadas, Aggregation Pipeline y consumo de API externa.

> **Material no oficial** — elaborado como práctica complementaria.  
> **Scripts:** `archivos/MongoDB-no-oficial/`

---

## Dataset

Base de datos `tienda_online` con 4 colecciones:

| Colección | Documentos | Campos principales |
|-----------|:-----------:|--------------------|
| `clientes` | 6 | `nombre`, `email`, `plan`, `saldo_fidelidad`, `preferencias` (obj), `historial_pagos` (array) |
| `productos` | 8 | `nombre`, `categoria`, `precio`, `stock`, `especificaciones` (obj), `tags` (array) |
| `pedidos` | 6 | `numero`, `cliente_id`, `items` (array de obj), `subtotal`, `descuento`, `total`, `envio` (obj) |
| `resenas` | 4 | `producto_id`, `cliente_id`, `calificacion`, `titulo`, `comentario`, `util` |

**Setup:**
```bash
mongosh < archivos/MongoDB-no-oficial/01_setup_datos.js
```

---

## SQL vs MongoDB — Comparativa

| Concepto | SQL / Relacional | MongoDB / Documental |
|----------|-----------------|----------------------|
| **Estructura** | Tablas + filas fijas | Colecciones + documentos BSON |
| **Schema** | Rígido (DDL obligatorio) | Flexible (schema-less) |
| **Relaciones** | JOINs entre tablas | Documentos embebidos o `$lookup` |
| **Arrays** | Tabla intermedia + JOIN | Array nativo en el documento |
| **Escalabilidad** | Vertical (más hardware) | Horizontal (sharding nativo) |
| **Transacciones** | ACID completo | ACID multi-documento (v4+) |
| **Consultas** | SQL estándar | MQL + Aggregation Pipeline |

**Documentos embebidos vs JOINs:** lo que SQL resuelve con 3 tablas + 2 JOINs, MongoDB lo resuelve en 1 documento + 1 lectura:

```javascript
// SQL: clientes + JOIN cliente_preferencias + JOIN historial_pagos
// MongoDB:
db.clientes.findOne({ email: "ana@email.com" })
// { nombre: "Ana García", preferencias: { categorias: [...] }, historial_pagos: [...] }
```

---

## Nivel 1 — CRUD Básico

### 1.1 — CREATE: insertar un producto

```javascript
// SQL: INSERT INTO productos (nombre, categoria, precio, stock) VALUES (...)
db.productos.insertOne({
  nombre: "Teclado Mecánico RGB",
  categoria: "electrónica",
  subcategoria: "periféricos",
  precio: 89.99,
  stock: 75,
  marca: "KeyMaster",
  especificaciones: { switches: "Cherry MX Red", retroiluminacion: "RGB", conexion: "USB-C" },
  tags: ["teclado", "gaming", "mecánico"],
  calificacion_promedio: 0,
  total_vendidos: 0,
  fecha_alta: new Date(),
  activo: true
})
```

### 1.2 — READ con proyección

```javascript
// SQL: SELECT nombre, precio FROM productos WHERE categoria = 'electrónica'
db.productos.find(
  { categoria: "electrónica" },
  { nombre: 1, precio: 1, _id: 0 }
)
```

### 1.3 — UPDATE con `$mul`: aumentar precio 10%

```javascript
// SQL: UPDATE productos SET precio = precio * 1.10 WHERE nombre = 'Laptop Pro 15'
db.productos.updateOne(
  { nombre: "Laptop Pro 15" },
  { $mul: { precio: 1.10 } }
)
```

### 1.4 — UPDATE MASIVO: descuento en categoría

```javascript
// SQL: UPDATE productos SET precio = precio * 0.85 WHERE categoria = 'deportes'
db.productos.updateMany(
  { categoria: "deportes" },
  { $mul: { precio: 0.85 } }
)
```

### 1.5 — DELETE condicional

```javascript
// SQL: DELETE FROM productos WHERE stock = 0 AND activo = false
db.productos.deleteMany({ stock: 0, activo: false })
```

---

## Nivel 2 — Consultas Avanzadas

### 2.1 — Filtros combinados con operadores

```javascript
// SQL: SELECT * FROM productos WHERE precio BETWEEN 100 AND 500 AND stock > 0 ORDER BY precio ASC
db.productos.find({
  precio: { $gte: 100, $lte: 500 },
  stock: { $gt: 0 }
}).sort({ precio: 1 })
```

### 2.2 — Búsqueda en arrays

```javascript
// Un tag (sin tabla intermedia — el array es nativo):
db.productos.find({ tags: "gaming" }, { nombre: 1, tags: 1, precio: 1 })

// Varios tags simultáneos con $all:
db.productos.find(
  { tags: { $all: ["gaming", "monitor"] } },
  { nombre: 1, tags: 1 }
)
```

### 2.3 — Campos anidados (dot notation)

```javascript
// SQL requeriría JOIN a tabla de preferencias
db.clientes.find({
  plan: "premium",
  "preferencias.notificaciones": true
}, { nombre: 1, ciudad: 1, plan: 1 })
```

### 2.4 — `$or` y `$and` explícito

```javascript
// SQL: SELECT * FROM productos WHERE categoria = 'libros' OR calificacion_promedio >= 4.5
db.productos.find({
  $or: [
    { categoria: "libros" },
    { calificacion_promedio: { $gte: 4.5 } }
  ]
}, { nombre: 1, categoria: 1, calificacion_promedio: 1 }).sort({ calificacion_promedio: -1 })
```

### 2.5 — Búsqueda con regex

```javascript
// SQL: SELECT * FROM clientes WHERE email LIKE '%email.com'
db.clientes.find(
  { email: { $regex: /email\.com$/ } },
  { nombre: 1, email: 1, _id: 0 }
)
```

### 2.6 — Arrays de objetos embebidos

```javascript
// Pedidos que contienen la Laptop Pro 15 (sin JOIN):
db.pedidos.find(
  { "items.nombre": { $regex: /Laptop/ } },
  { numero: 1, cliente_nombre: 1, total: 1, estado: 1 }
)

// Pedidos con al menos un ítem de precio > 500:
db.pedidos.find(
  { "items.precio_unitario": { $gt: 500 } },
  { numero: 1, cliente_nombre: 1, total: 1 }
)
```

### 2.7 — sort + limit + skip (paginación)

```javascript
// Top 3 productos más vendidos:
db.productos.find({}, { nombre: 1, total_vendidos: 1, precio: 1 })
  .sort({ total_vendidos: -1 })
  .limit(3)

// Página 2 (3 por página):
db.productos.find({}).sort({ nombre: 1 }).skip(3).limit(3)
```

### 2.8 — `$exists` y `$type`

```javascript
db.clientes.find({ saldo_fidelidad: { $exists: false } })
db.clientes.find({ saldo_fidelidad: { $type: "number" } }, { nombre: 1, saldo_fidelidad: 1 })
```

---

## Nivel 3 — Aggregation Pipeline

### 3.1 — GROUP BY básico: pedidos por estado

```javascript
// SQL: SELECT estado, COUNT(*) as cantidad, SUM(total) as ingresos FROM pedidos GROUP BY estado
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
])
```

### 3.2 — Ventas por categoría con `$lookup` + `$unwind`

```javascript
// SQL: multi-JOIN + GROUP BY — MongoDB: $unwind expande arrays sin necesidad de JOINs
db.pedidos.aggregate([
  { $match: { estado: "entregado" } },
  { $unwind: "$items" },
  { $lookup: {
      from: "productos",
      localField: "items.producto_id",
      foreignField: "_id",
      as: "producto_info"
  }},
  { $unwind: "$producto_info" },
  { $group: {
      _id: "$producto_info.categoria",
      unidades_vendidas: { $sum: "$items.cantidad" },
      revenue: { $sum: { $multiply: ["$items.cantidad", "$items.precio_unitario"] } }
  }},
  { $sort: { revenue: -1 } },
  { $project: {
      categoria: "$_id",
      unidades_vendidas: 1,
      revenue: { $round: ["$revenue", 2] },
      _id: 0
  }}
])
// Resultado: electrónica $3,279 | hogar $449 | libros $149
```

### 3.3 — `$bucket`: histograma de precios

```javascript
db.productos.aggregate([{
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
}])
```

### 3.4 — Gasto total por cliente (análisis de clientes)

```javascript
db.pedidos.aggregate([
  { $match: { estado: { $ne: "cancelado" } } },
  { $group: {
      _id: "$cliente_id",
      nombre: { $first: "$cliente_nombre" },
      total_gastado: { $sum: "$total" },
      cantidad_pedidos: { $sum: 1 },
      ultimo_pedido: { $max: "$fecha" }
  }},
  { $lookup: { from: "clientes", localField: "_id", foreignField: "_id", as: "cliente" } },
  { $unwind: "$cliente" },
  { $project: {
      nombre: 1,
      plan: "$cliente.plan",
      total_gastado: { $round: ["$total_gastado", 2] },
      cantidad_pedidos: 1,
      ticket_promedio: { $round: [{ $divide: ["$total_gastado", "$cantidad_pedidos"] }, 2] },
      ultimo_pedido: 1,
      _id: 0
  }},
  { $sort: { total_gastado: -1 } }
])
```

### 3.5 — `$facet`: múltiples análisis en paralelo

```javascript
// En SQL requeriría múltiples CTEs o queries separadas
db.productos.aggregate([{
  $facet: {
    por_categoria: [
      { $group: { _id: "$categoria", cantidad: { $sum: 1 }, precio_prom: { $avg: "$precio" } } },
      { $sort: { cantidad: -1 } }
    ],
    mas_vendidos: [
      { $sort: { total_vendidos: -1 } },
      { $limit: 3 },
      { $project: { nombre: 1, total_vendidos: 1, precio: 1, _id: 0 } }
    ],
    estadisticas: [
      { $group: {
          _id: null,
          total_productos: { $sum: 1 },
          precio_minimo: { $min: "$precio" },
          precio_maximo: { $max: "$precio" },
          precio_promedio: { $avg: "$precio" }
      }}
    ]
  }
}])
```

### 3.6 — `$addFields` + `$map`: calcular subtotales en arrays

```javascript
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
])
```

---

## BONUS — Consumo de API Externa

Importa libros sobre MongoDB desde **Open Library API** (gratuita, sin autenticación) directamente a la colección `productos`.

```bash
node archivos/MongoDB-no-oficial/03_api_externa.js
```

**Flujo:**
1. `fetch("https://openlibrary.org/search.json?subject=mongodb&limit=8")` — datos reales.
2. Mapeo al schema de `productos` (título, autor, año, ISBN, precio aleatorio).
3. `insertMany()` → 8 libros reales insertados en MongoDB.
4. Aggregation inmediata sobre los datos importados.

```javascript
// Extracto del mapper:
const productos = data.docs.map(libro => ({
  nombre: libro.title,
  categoria: "libros",
  precio: +(Math.random() * 40 + 25).toFixed(2),
  especificaciones: {
    autor: libro.author_name?.join(", "),
    anio_publicacion: libro.first_publish_year,
    isbn: libro.isbn?.[0]
  },
  importado_api: true
}))
```

---

## Índices y performance

```javascript
// Sin índice → COLLSCAN:
db.pedidos.find({ estado: "entregado" }).explain("executionStats")
// totalDocsExamined: 6

// Crear índices:
db.pedidos.createIndex({ estado: 1 })
db.clientes.createIndex({ email: 1 }, { unique: true })
db.productos.createIndex({ categoria: 1, precio: 1 })  // compuesto
db.productos.createIndex({ tags: 1 })                   // en array

// Con índice → IXSCAN:
db.pedidos.find({ estado: "entregado" }).explain("executionStats")
// totalDocsExamined: 3, executionTimeMillis: <1
```

**Tipos de índices demostrados:**

| Tipo | Ejemplo |
|------|---------|
| Simple | `{ estado: 1 }` |
| Único | `{ email: 1 }, { unique: true }` |
| Compuesto | `{ categoria: 1, precio: -1 }` |
| En array | `{ tags: 1 }` — indexa cada elemento |
| TTL | `{ fecha: 1 }, { expireAfterSeconds: 3600 }` |
