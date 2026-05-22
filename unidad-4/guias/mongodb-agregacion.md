---
layout: default
title: MongoDB — Aggregation, Índices y Vistas
parent: Unidad 4
nav_order: 5
permalink: /unidad-4/guias/mongodb-agregacion/
---

[← Unidad 4](../)

# MongoDB — Aggregation Pipeline, Índices y Vistas

Referencia de las etapas del pipeline de agregación, operadores de acumulación, gestión de índices y creación de vistas.

---

## Aggregation Pipeline

La **canalización de agregación** (Aggregation Pipeline) es la forma en que MongoDB procesa y transforma documentos. Consta de una o más **etapas (stages)** que se ejecutan secuencialmente: la salida de cada etapa es la entrada de la siguiente.

**Sintaxis:**
```javascript
db.coleccion.aggregate([
  { <etapa1> },
  { <etapa2> },
  ...
])
```

**Usos principales:**
- Agrupar valores de varios documentos (sumar, contar, promediar).
- Operaciones matemáticas y transformaciones.
- Analizar cambios de datos a lo largo del tiempo.
- Construir vistas con joins entre colecciones.

Los resultados se pueden guardar como **consultas (queries)** o como **vistas**.

---

## Etapas del pipeline

### $match — filtrar documentos

Equivalente al `WHERE` de SQL o al `find()`. Filtra documentos según una condición y pasa al siguiente stage solo los que coinciden.

```javascript
// Filtrar ventas de la ciudad "Dallas":
db.cc_info.aggregate([{ $match: { city: "Dallas" } }])
```

Se recomienda colocar `$match` lo antes posible en el pipeline para reducir el volumen de datos que procesan las etapas siguientes.

---

### $group — agrupar documentos

Equivalente al `GROUP BY` de SQL. Agrupa documentos por un campo y calcula acumulaciones.

**Sintaxis:**
```javascript
{ $group: { _id: <campo de agrupación>, <campo_resultado>: { <acumulador>: <expresión> } } }
```

`_id` define el campo por el que se agrupa. Usar `"$nombre_campo"` (con el signo `$`) para referenciar campos.

**Suma por ciudad:**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: {
    _id: "$city",
    total: { $sum: "$transaction_dollar_amount" }
  }
}])
```

**Contar documentos por grupo (`$sum: 1`):**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: {
    _id: "$city",
    totalTransacciones: { $sum: 1 }
  }
}])
```

**Máximo y mínimo por grupo:**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: {
    _id: "idAux",
    maximo: { $max: "$transaction_dollar_amount" },
    minimo: { $min: "$transaction_dollar_amount" }
  }
}])
```

---

### $project — seleccionar campos

Equivalente al `SELECT` de SQL. Define qué campos incluir o excluir en los documentos de salida. Puede crear campos calculados y renombrar campos.

```javascript
{ $project: {
  _id: 0,                          // excluir _id
  credit_card: 1,                  // incluir campo
  date: 1,
  transaction_dollar_amount: 1,
  city: "$Transacciones_Estado.city"  // campo de colección relacionada
}}
```

- `_id: 0` → excluir campo (false).
- `campo: 1` → incluir campo (true).
- `campo: "$otroCampo"` → renombrar o referenciar un campo externo.

**Uso de `$cmp` en `$project`:**
```javascript
db.Transacciones_Estado_1.aggregate([
  { $match: { credit_card: 9383760568579492, date: "2015-08-16 19:02:57" } },
  { $project: { result: { $cmp: ["$transaction_dollar_amount", 43.78] } } }
])
// $cmp devuelve: -1 (menor), 0 (igual), 1 (mayor)
```

---

### $lookup — unir colecciones (JOIN)

Equivalente al `JOIN` de SQL. Une documentos de otra colección cuando los campos especificados coinciden. Los documentos coincidentes se agregan como **array** en el campo `as`.

```javascript
{ $lookup: {
  from: "cc_info",              // colección a unir
  localField: "credit_card",   // campo de la colección actual
  foreignField: "credit_card", // campo de la colección remota
  as: "Transacciones_Estado"   // nombre del array resultado
}}
```

---

### $unwind — descomponer arrays

Convierte un campo de tipo **array** en múltiples documentos, uno por cada elemento del array.

Cuando `$lookup` genera un array y se necesita acceder a sus valores como escalares, se usa `$unwind`.

```javascript
{ $unwind: "$city" }
```

Sin `$unwind`, el campo quedaría como `Array (1)` en lugar de un valor de texto.

---

### Combinar etapas

```javascript
db.Transacciones_Estado_1.aggregate([
  { $match: { city: "Houston" } },
  { $group: { _id: "$city", total: { $sum: "$transaction_dollar_amount" } } }
])
// Resultado: { _id: 'Houston', total: 1809789.05 }
```

---

## Operadores de acumulación

| Operador | Descripción | Uso |
|----------|-------------|-----|
| `$sum` | Suma los valores; con `1` cuenta documentos | `{ $sum: "$campo" }` |
| `$avg` | Promedio de los valores | `{ $avg: "$campo" }` |
| `$max` | Valor máximo del grupo | `{ $max: "$campo" }` |
| `$min` | Valor mínimo del grupo | `{ $min: "$campo" }` |
| `$cmp` | Compara dos valores: negativo (<), 0 (=), positivo (>) | `{ $cmp: ["$a", "$b"] }` |

---

## Índices

Un índice posibilita el acceso directo y rápido a documentos. Sin índice, MongoDB debe recorrer secuencialmente **todos** los documentos de la colección (**collection scan**).

### Características

- El campo **`_id` tiene un índice único creado automáticamente** en toda colección.
- Los índices son estructuras asociadas a la colección; almacenan los valores de los campos indexados.
- Se actualizan **automáticamente** ante inserciones, actualizaciones o eliminaciones.
- **Ventaja**: acelera las consultas sobre el campo indexado.
- **Desventaja**: consume espacio en disco y genera costo de mantenimiento en cada escritura.
- No se recomienda crear índices sobre campos poco usados en consultas o en colecciones muy pequeñas.

### Visualizar índices existentes

```javascript
db.cc_info.getIndexes()
// Resultado:
// [
//   { v: 2, key: { _id: 1 }, name: '_id_' },
//   { v: 2, key: { city: 1 }, name: 'city_indx' },
//   { v: 2, key: { state: 1 }, name: 'state_1' }
// ]
```

### Crear índice

```javascript
// Índice ascendente (1) sobre el campo "city":
db.cc_info.createIndex({ "city_indx": 1 })

// 1 = orden ascendente
// -1 = orden descendente
```

Al crear un índice único, MongoDB garantiza que no haya valores duplicados en ese campo:
```javascript
db.cc_info.createIndex({ "credit_card": 1 }, { unique: true })
```

### Eliminar índices

```javascript
// Eliminar un índice por nombre:
db.cc_info.dropIndex("city_indx")
// Respuesta: { nIndexesWas: 3, ok: 1 }

// Eliminar todos los índices (excepto _id):
db.cc_info.dropIndexes()
```

### Uso del índice en búsquedas

MongoDB usa automáticamente el índice cuando se consulta por el campo indexado:
```javascript
db.cc_info.find({ city: "Dallas" })
```

Para ver si una consulta usa el índice, se puede usar el botón **Explain** en Compass o `.explain()` en el shell.

---

## Vistas

Las vistas en MongoDB son **colecciones de solo lectura** definidas mediante un Aggregation Pipeline. Son equivalentes a las vistas de SQL.

### Crear vista por línea de comandos

```javascript
db.createView(
  "Transacciones_Estado",   // nombre de la vista
  "transactions",           // colección base
  [                         // pipeline de agregación
    {
      $lookup: {
        from: "cc_info",
        localField: "credit_card",
        foreignField: "credit_card",
        as: "Transacciones_Estado"
      }
    },
    {
      $project: {
        _id: 0,
        credit_card: 1,
        date: 1,
        transaction_dollar_amount: 1,
        city: "$Transacciones_Estado.city"
      }
    },
    { $unwind: "$city" }
  ]
)
```

**Explicación de cada etapa:**

| Etapa | Descripción |
|-------|-------------|
| `$lookup` | Une `transactions` con `cc_info` cuando `credit_card` coincide. Equivale a `JOIN/WHERE` en SQL. Los documentos coincidentes se agregan como array en `"Transacciones_Estado"`. |
| `$project` | Selecciona qué campos mostrar. `city: "$Transacciones_Estado.city"` accede al campo de la colección relacionada mediante el prefijo `$` y el nombre del array (`as`). |
| `$unwind: "$city"` | Convierte el array `city` (generado por `$lookup`) en un valor escalar. Sin este paso, `city` aparecería como `Array (1)`. |

### Crear vista por GUI (MongoDB Compass)

1. Abrir la pestaña **Aggregations** en la colección.
2. Hacer clic en **Add Stage** y seleccionar la etapa (`$lookup`, `$project`, `$unwind`, etc.).
3. Completar los campos de cada etapa.
4. Verificar el preview de documentos.
5. Hacer clic en **Save** → **Create View** y darle un nombre.

### Usar una vista

Una vez creada, la vista aparece junto a las colecciones. Se consulta igual que cualquier colección:

```javascript
db.Transacciones_Estado.find({ city: "Houston" })
```

### Plan de ejecución

En Compass, el botón **Explain** muestra el plan de ejecución con métricas:
- Documentos devueltos.
- Documentos examinados.
- Tiempo de ejecución.
- Si usó índice o no (COLLSCAN vs INDEX).
