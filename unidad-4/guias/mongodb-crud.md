---
layout: default
title: MongoDB — CRUD y consultas
parent: Unidad 4
nav_order: 4
permalink: /unidad-4/guias/mongodb-crud/
---

[← Unidad 4](../)

# MongoDB — CRUD y consultas

Referencia completa de operaciones CRUD: inserción, lectura con `find()` y sus operadores, actualización y eliminación.

---

## Operaciones CRUD

| Operación | Método MongoDB | Equivalente SQL | Descripción |
|-----------|---------------|-----------------|-------------|
| **Create** | `insertOne()` / `insertMany()` | INSERT | Inserta documentos en una colección |
| **Read** | `find()` | SELECT | Consulta y recupera documentos |
| **Update** | `updateOne()` / `updateMany()` | UPDATE | Modifica documentos existentes |
| **Delete** | `deleteOne()` / `deleteMany()` | DELETE | Elimina documentos de una colección |

Las operaciones CRUD se ejecutan **sobre colecciones**. Si la colección no existe, las operaciones de inserción la crean automáticamente.

---

## Create — Insertar documentos

### insertOne()

Inserta un único documento en la colección.

```javascript
db.Estrella.insertOne({
  "Nombre": "Sirio",
  "Magnitud": -1.47,
  "Distancia_(años_luz)": 8.6,
  "Tamaño": "Enana blanca",
  "Constelacion": "Can Mayor"
})
```

**Respuesta:**
```javascript
{
  acknowledged: true,
  insertedId: ObjectId('6824e606f34f30f12ffd11a7')
}
```

- `acknowledged: true` → MongoDB confirmó la inserción.
- `insertedId` → ID generado automáticamente (`_id`).

### insertMany()

Inserta múltiples documentos en una sola operación.

```javascript
db.miColeccion.insertMany([
  { nombre: "Juan", edad: 28, ciudad: "Buenos Aires" },
  { nombre: "María", edad: 34, ciudad: "Córdoba" },
  { nombre: "Pedro", edad: 23, ciudad: "Rosario" }
])
```

**Respuesta:**
```javascript
{
  acknowledged: true,
  insertedIds: {
    '0': ObjectId('6824e606f34f30f12ffd11a7'),
    '1': ObjectId('6824e606f34f30f12ffd11a8'),
    '2': ObjectId('6824e606f34f30f12ffd11a9')
  }
}
```

---

## Read — find()

`find()` es el equivalente al `SELECT` de SQL. Consulta y recupera documentos de una colección.

**Sintaxis:**
```javascript
db.coleccion.find(<filtro>, <proyección>).sort(<orden>).limit(n).skip(n)
```

### Seleccionar todos los documentos

```javascript
db.users.find()
```

Equivalente SQL: `SELECT * FROM users`

### Proyección — controlar qué campos devolver

El segundo parámetro de `find()` define qué campos incluir o excluir:

- `1` → incluir campo.
- `0` → excluir campo.
- `_id` siempre se incluye, a menos que se excluya explícitamente con `_id: 0`.
- **No se pueden mezclar inclusiones y exclusiones en la misma proyección** (excepto `_id`).

```javascript
// Solo nombre y apellido, sin _id:
db.socios.find({}, { nombre: 1, apellido: 1, _id: 0 })

// Todos los campos excepto email:
db.socios.find({}, { email: 0 })
```

### Equivalencias SQL ↔ MongoDB

| Operación | SQL Server | MongoDB |
|-----------|------------|---------|
| Todos los documentos | `SELECT * FROM users` | `db.users.find()` |
| Campos específicos | `SELECT id, status FROM users` | `db.users.find({}, { id:1, status:1 })` |
| Con filtro | `SELECT * FROM users WHERE status = "A"` | `db.users.find({ status: "A" })` |
| Filtro + proyección | `SELECT id, status FROM users WHERE status = "A"` | `db.users.find({ status: "A" }, { user_id:1, status:1, _id:0 })` |
| Búsqueda por patrón | `WHERE user_id LIKE "%bc%"` | `db.users.find({ user_id: /bc/ })` |
| Ordenar ascendente | `ORDER BY user_id ASC` | `db.users.find().sort({ user_id: 1 })` |
| Limitar resultados | `SELECT TOP 10 * FROM users` | `db.users.find().limit(10)` |

### Consulta con múltiples filtros

```javascript
// Equivalente SQL:
// WHERE (cliente.localidad = 'Ramos Mejía' OR cliente.localidad = 'San Justo')
//   AND (cantidad < 10 OR cliente.id <> 1)

db.datosventas.find({
  $and: [
    { $or: [
      { "cliente.localidad": "Ramos Mejía" },
      { "cliente.localidad": "San Justo" }
    ]},
    { $or: [
      { "cantidad": { $lt: 10 } },
      { "cliente.id": { $ne: 1 } }
    ]}
  ]
}).limit(1)
```

---

## Operadores de comparación

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$eq` | Igual a | `{ edad: { $eq: 30 } }` ← equivale a `{ edad: 30 }` |
| `$ne` | Distinto de | `{ ciudad: { $ne: "Morón" } }` |
| `$gt` | Mayor que | `{ numSocio: { $gt: 300 } }` |
| `$gte` | Mayor o igual | `{ edad: { $gte: 18 } }` |
| `$lt` | Menor que | `{ edad: { $lt: 18 } }` |
| `$lte` | Menor o igual | `{ edad: { $lte: 65 } }` |

**Rango de valores:**
```javascript
// Entre 500 y 700 inclusive:
db.Transacciones.find({ transaction_dollar_amount: { $gte: 500, $lte: 700 } })
```

---

## Operadores de conjuntos y existencia

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$in` | Coincide con alguno de los valores | `{ ciudad: { $in: ["Morón", "San Justo"] } }` |
| `$nin` | No coincide con ninguno de los valores | `{ ciudad: { $nin: ["Morón", "San Justo"] } }` |
| `$exists` | Verifica si un campo existe | `{ telefono: { $exists: true } }` |
| `$all` | El array contiene **todos** los valores indicados | `{ deportes: { $all: ["Fútbol", "Natación"] } }` |

---

## Operadores lógicos

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$and` | Todas las condiciones deben cumplirse | `{ $and: [{ edad: { $gt: 18 } }, { ciudad: "Morón" }] }` |
| `$or` | Al menos una condición debe cumplirse | `{ $or: [{ edad: { $lt: 18 } }, { ciudad: "Morón" }] }` |
| `$nor` | Ninguna condición debe cumplirse | `{ $nor: [{ ciudad: "Morón" }, { activo: false }] }` |
| `$not` | Niega una condición (se usa como operador interno) | `{ edad: { $not: { $gt: 30 } } }` |

**Operadores combinados:**
```javascript
db.socios.find({
  $and: [
    { edad: { $gt: 18 } },
    { $or: [
      { ciudad: "Morón" },
      { numSocio: { $gt: 300 } }
    ]}
  ]
})
```

---

## Operadores de evaluación y arrays

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$size` | Array con cantidad específica de elementos | `{ hobbies: { $size: 3 } }` |
| `$elemMatch` | Un elemento del array cumple varias condiciones simultáneas | `{ notas: { $elemMatch: { valor: { $gt: 7 }, aprobado: true } } }` |
| `$regex` | Busca patrones en cadenas (similar a LIKE en SQL) | `{ nombre: { $regex: "^A" } }` |
| `$type` | Filtra documentos según el tipo BSON del campo | `{ edad: { $type: "int" } }` |
| `$mod` | Filtra según el resto de una división (módulo) | `{ numero: { $mod: [2, 0] } }` |

**Búsqueda case-insensitive con regex:**
```javascript
// Apellidos que contienen "López" sin importar mayúsculas/minúsculas:
db.datosvendedores.find({ apellidos: { $regex: "López", $options: "i" } })
```

**Acceso a elementos de array por índice (base 0):**
```javascript
// Documentos donde el segundo elemento del array intereses es "lectura":
db.personas.find({ 'intereses.1': 'lectura' })
```

---

## Update — Modificar documentos

### Sintaxis

```javascript
db.coleccion.updateOne(<filtro>, <actualización>, <opciones>)
db.coleccion.updateMany(<filtro>, <actualización>, <opciones>)
```

- `<filtro>`: condición para seleccionar los documentos a modificar. Mismo formato que `find()`.
- `<actualización>`: operadores que definen qué cambiar (`$set`, `$unset`, `$inc`, etc.).
- `<opciones>`: parámetros opcionales como `upsert` (insertar si no hay coincidencia) o `arrayFilters`.

**`updateOne()`** actualiza el primer documento que coincide con el filtro.  
**`updateMany()`** actualiza **todos** los documentos que coinciden.

**Respuesta:**
```javascript
{
  acknowledged: true,
  insertedId: null,
  matchedCount: 1,
  modifiedCount: 1,
  upsertedCount: 0
}
```

- `matchedCount`: documentos que coincidieron con el filtro.
- `modifiedCount`: documentos efectivamente modificados.
- `upsertedId`: si se usó `upsert: true` y se insertó un nuevo documento, contiene su `_id`.

### Operador $set — agregar o modificar campos

```javascript
// Modificar un campo existente:
db.datosventas.updateOne(
  { id_venta: 1 },
  { $set: { importe: 2000 } }
)

// Agregar un campo nuevo + modificar otro simultáneamente:
db.datosventas.updateOne(
  { id_venta: 2 },
  { $set: { importe: 2500, fecha_modificacion: new Date() } }
)
```

`$set` **agrega el campo si no existe** y **actualiza su valor si ya existe**. No requiere modificar la colección previamente.

### Operador $unset — eliminar campos

```javascript
// Eliminar un campo:
db.miColeccion.updateOne(
  { nombre: "Ana" },
  { $unset: { telefono: "" } }
)

// Eliminar múltiples campos:
db.miColeccion.updateOne(
  { nombre: "Ana" },
  { $unset: { edad: "", email: "" } }
)
```

El valor asignado dentro de `$unset` no importa; MongoDB solo usa el nombre del campo para eliminar.

### Actualizar todos los documentos

```javascript
db.Estrella.updateMany({}, { $set: { "Fecha Descubrimiento": null } })
```

El primer parámetro `{}` es un filtro vacío que coincide con **todos** los documentos.

### Operador $inc — incrementar valores numéricos

```javascript
db.productos.updateOne(
  { _id: 1 },
  { $inc: { stock: -1 } }  // decrementa stock en 1
)
```

---

## Delete — Eliminar documentos

```javascript
// Eliminar el primer documento que coincida:
db.personas.deleteOne({ nombre: "Juan Pérez" })

// Eliminar todos los documentos que coincidan:
db.personas.deleteMany({ "dirección.pais": "España" })
```

**`deleteOne()`**: si múltiples documentos coinciden con el filtro, solo elimina el primero encontrado.  
**`deleteMany()`**: elimina todos los documentos que coincidan.

**Respuesta:**
```javascript
{ acknowledged: true, deletedCount: 4 }
```

- `acknowledged: true` → la operación fue exitosa.
- `deletedCount: 4` → cantidad de documentos eliminados (0 si no hubo coincidencia).

---

## Flexibilidad de estructura

En MongoDB no es necesario alterar la colección para agregar o eliminar campos. Los documentos pueden evolucionar dinámicamente:

```javascript
// Agregar campo "telefono" a un documento existente:
db.miColeccion.updateOne(
  { nombre: "Ana" },
  { $set: { telefono: "11-5555-5555" } }
)

// Agregar múltiples campos nuevos:
db.miColeccion.updateOne(
  { nombre: "Ana" },
  { $set: { email: "ana@gmail.com", activo: true } }
)
```

No se modifica ni la colección ni otros documentos. Solo el documento seleccionado recibe los nuevos campos.
