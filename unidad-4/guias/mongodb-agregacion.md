---
layout: default
title: MongoDB — Aggregation, Índices y Vistas
parent: Unidad 4
nav_order: 5
permalink: /unidad-4/guias/mongodb-agregacion/
---

[← Unidad 4](../)

# MongoDB — Aggregation Pipeline, Índices y Vistas

Referencia de las etapas del pipeline de agregación, gestión de índices y creación de vistas.

---

## Aggregation Pipeline

El **Aggregation Framework** utiliza una estructura de canalizaciones o flujos de etapas denominadas *pipeline*. En cada etapa se pueden filtrar, ordenar, agrupar, remodelar y modificar los documentos que pasan por el proceso. La salida de cada etapa es la entrada de la siguiente.

**Sintaxis:**
```javascript
db.coleccion.aggregate([
  { <etapa1> },
  { <etapa2> },
  ...
])
```

**Reglas importantes:**
- Las etapas pueden repetirse (por ejemplo: varios `$match` en distintos momentos).
- Una consulta compleja se puede dividir en varias etapas más simples.
- Los resultados se pueden guardar en una colección (`$out`) o convertirse en vistas.

**Usos principales:**
- Agrupar valores de varios documentos (sumar, contar, promediar).
- Operaciones matemáticas y transformaciones.
- Analizar cambios de datos a lo largo del tiempo.
- Construir vistas con joins entre colecciones.

---

## Categorías de etapas

| Categoría | Etapas |
|-----------|--------|
| **Filtrado** | `$match`, `$redact` |
| **Transformación / Proyección** | `$project`, `$set` / `$addFields`, `$unset`, `$replaceRoot`, `$replaceWith` |
| **Unión / Join** | `$lookup`, `$graphLookup` |
| **Agrupación** | `$group` |
| **Descomposición / Arrays** | `$unwind` |
| **Ordenamiento y control** | `$sort`, `$limit`, `$skip` |
| **Cálculo / Métricas avanzadas** | `$count`, `$sortByCount`, `$bucket`, `$bucketAuto`, `$facet`, `$setWindowFields` |
| **Salida** | `$out`, `$merge` |

---

## Etapas de filtrado

### $match

Equivalente al `WHERE` de SQL. Filtra documentos según una condición y pasa solo los que coinciden.

```javascript
db.cc_info.aggregate([{ $match: { city: "Dallas" } }])
```

⚠️ Colocar `$match` lo antes posible en el pipeline reduce el volumen de datos que procesan las etapas siguientes.

---

## Etapas de transformación

### $project — seleccionar y calcular campos

Equivalente al `SELECT` de SQL. Define qué campos incluir o excluir, renombra campos y crea campos calculados.

```javascript
{ $project: {
  _id: 0,                                        // excluir _id
  credit_card: 1,                                // incluir campo
  city: "$Transacciones_Estado.city",            // renombrar / referenciar campo externo
  total: { $multiply: ["$precio", "$cantidad"] } // campo calculado
}}
```

**Operador `$cmp`:**
```javascript
db.Transacciones_Estado_1.aggregate([
  { $match: { credit_card: 9383760568579492, date: "2015-08-16 19:02:57" } },
  { $project: { result: { $cmp: ["$transaction_dollar_amount", 43.78] } } }
])
// -1 (menor), 0 (igual), 1 (mayor)
```

---

### $addFields / $set — agregar o modificar campos

Agrega nuevos campos a los documentos o modifica campos existentes sin afectar el resto.

- Si el campo no existe, lo crea.
- Si ya existe, lo sobrescribe.

```javascript
// Calcular un campo derivado:
{ $addFields: { Total_Importe: { $multiply: ["$importe", "$cantidad"] } } }

// Concatenar nombre y apellido:
{ $addFields: {
  cliente_nombre: { $concat: ["$cliente.nombre", " ", "$cliente.apellido"] }
}}

// Formatear una fecha:
{ $addFields: {
  fecha_formateada: {
    "$dateToString": {
      "format": "%d/%m/%Y",
      "date": { "$dateFromString": { "dateString": "$fecha" } }
    }
  }
}}
```

---

### $replaceRoot + $mergeObjects — aplanar documentos

`$replaceRoot` reemplaza el documento completo actual por un nuevo documento definido en `newRoot`. Es útil para reestructurar documentos complejos o anidados.

`$mergeObjects` combina múltiples subdocumentos en un solo documento plano. Es ideal para crear vistas desnormalizadas, preparar datos para reportes o exportar a CSV/Excel.

```javascript
// Documento original tiene subdocumentos: cliente{}, producto{}, vendedor{}
// Resultado: documento plano con todos los campos al mismo nivel

db.datosventas.aggregate([
  { $lookup: { from: "datosvendedores", localField: "id_vendedor", foreignField: "Id", as: "vendedor" } },
  { $unwind: { path: "$vendedor", preserveNullAndEmptyArrays: true } },
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          {
            id_venta: "$id_venta",
            fecha: "$fecha",
            importe: "$importe",
            cliente_nombre: "$cliente.nombre",
            cliente_localidad: "$cliente.localidad",
            producto_nombre: "$producto.nombre",
          },
          {
            vendedor_nombre: "$vendedor.nombre",
            vendedor_ciudad: "$vendedor.ciudad",
            vendedor_pais: "$vendedor.pais"
          }
        ]
      }
    }
  }
])
```

⚠️ Todo lo que no se incluya en `newRoot` se pierde.

---

## Etapas de unión

### $lookup — JOIN entre colecciones

Une documentos de otra colección. Los documentos coincidentes se agregan como **array** en el campo `as`.

```javascript
db.datosventas.aggregate([{
  $lookup: {
    from: "datosvendedores",   // colección a unir
    localField: "id_vendedor", // campo de la colección actual
    foreignField: "Id",        // campo de la colección remota
    as: "vendedor"             // nombre del array resultado
  }
}])
```

El resultado incluye un campo `vendedor` que es un array con los documentos coincidentes de `datosvendedores`.

**`$graphLookup`**: variante recursiva de `$lookup`, para relaciones jerárquicas (árboles, grafos).

---

## Etapas de agrupación

### $group — agrupar documentos

Equivalente al `GROUP BY` de SQL. Agrupa documentos por un campo y aplica acumuladores.

**Sintaxis:**
```javascript
{ $group: { _id: <campo de agrupación>, <resultado>: { <acumulador>: <expresión> } } }
```

`_id` define el campo por el que se agrupa. Usar `"$campo"` (con `$`) para referenciar campos.

```javascript
// Total e ingresos por estado de pedido:
db.pedidos.aggregate([{
  $group: {
    _id: "$estado",
    cantidad: { $sum: 1 },
    ingresos: { $sum: "$total" },
    promedio: { $avg: "$total" }
  }
}])

// Primer y último valor del grupo:
db.pedidos.aggregate([{
  $group: {
    _id: "$cliente_id",
    nombre: { $first: "$cliente_nombre" },
    ultimo_pedido: { $max: "$fecha" }
  }
}])
```

---

## Etapas de descomposición

### $unwind — descomponer arrays

Convierte un campo de tipo **array** en múltiples documentos, uno por cada elemento.

```javascript
// Sintaxis simple:
{ $unwind: "$tallas" }

// Sintaxis extendida:
{ $unwind: {
  path: "$tallas",                    // campo array a descomponer
  includeArrayIndex: "indice",        // agrega campo con la posición (0, 1, 2...)
  preserveNullAndEmptyArrays: true    // mantiene documentos sin el campo o con array vacío
}}
```

**Ejemplo:**
```javascript
// Documento: { "_id": 1, "item": "ABC1", tallas: ["S","M","L"] }

db.inventario.aggregate([{ $unwind: "$tallas" }])
// Resultado:
// { "_id": 1, "item": "ABC1", "tallas": "S" }
// { "_id": 1, "item": "ABC1", "tallas": "M" }
// { "_id": 1, "item": "ABC1", "tallas": "L" }
```

**`preserveNullAndEmptyArrays`**: por defecto `$unwind` elimina los documentos cuyo campo no existe o está vacío. Con `true` los conserva en el resultado.

`$unwind` se usa antes de `$group` para poder agrupar elementos que originalmente estaban dentro de arrays.

---

## Etapas de ordenamiento y control

```javascript
{ $sort:  { campo: 1 } }   // 1 = ascendente, -1 = descendente
{ $limit: 5 }              // devuelve los primeros 5 documentos
{ $skip:  10 }             // omite los primeros 10
```

---

## Etapas analíticas avanzadas

### $count — contar documentos

```javascript
db.pedidos.aggregate([
  { $match: { estado: "entregado" } },
  { $count: "total_entregados" }
])
// { total_entregados: 3 }
```

### $sortByCount — agrupar y ordenar por frecuencia

Atajo que combina `$group` + `$sort` descendente por conteo:

```javascript
db.productos.aggregate([{ $sortByCount: "$categoria" }])
// { _id: "electrónica", count: 4 }
// { _id: "deportes",    count: 2 }
```

### $bucket — clasificar en rangos

Clasifica documentos en grupos (buckets) según rangos de un campo numérico.

```javascript
db.productos.aggregate([{
  $bucket: {
    groupBy: "$precio",
    boundaries: [0, 50, 100, 300, 700, 1500],  // límites de los rangos
    default: "1500+",                            // categoría para valores fuera de rango
    output: {
      cantidad: { $sum: 1 },
      productos: { $push: "$nombre" },
      precio_promedio: { $avg: "$precio" }
    }
  }
}])
```

### $bucketAuto — rangos automáticos

Igual que `$bucket` pero MongoDB determina los límites automáticamente intentando distribución uniforme:

```javascript
db.productos.aggregate([{
  $bucketAuto: { groupBy: "$precio", buckets: 4 }
}])
```

### $facet — múltiples pipelines en paralelo

Ejecuta varios sub-pipelines independientes sobre la misma colección en una sola operación. Imposible de replicar en SQL sin múltiples CTEs o queries separadas.

```javascript
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

---

## Ejemplo completo: pipeline encadenado

```javascript
// Ventas por categoría de producto (solo pedidos entregados):
db.pedidos.aggregate([
  { $match: { estado: "entregado" } },        // 1. filtrar
  { $unwind: "$items" },                       // 2. expandir array de items
  { $lookup: {                                 // 3. JOIN con productos
      from: "productos",
      localField: "items.producto_id",
      foreignField: "_id",
      as: "producto_info"
  }},
  { $unwind: "$producto_info" },               // 4. aplanar resultado del JOIN
  { $group: {                                  // 5. agrupar por categoría
      _id: "$producto_info.categoria",
      unidades: { $sum: "$items.cantidad" },
      revenue: { $sum: { $multiply: ["$items.cantidad", "$items.precio_unitario"] } }
  }},
  { $sort: { revenue: -1 } },                  // 6. ordenar
  { $project: {                                // 7. renombrar campos
      categoria: "$_id",
      unidades: 1,
      revenue: { $round: ["$revenue", 2] },
      _id: 0
  }}
])
```

---

## Operadores de acumulación

| Operador | Descripción | Uso |
|----------|-------------|-----|
| `$sum` | Suma los valores; con `1` cuenta documentos | `{ $sum: "$campo" }` |
| `$avg` | Promedio de los valores | `{ $avg: "$campo" }` |
| `$max` | Valor máximo del grupo | `{ $max: "$campo" }` |
| `$min` | Valor mínimo del grupo | `{ $min: "$campo" }` |
| `$first` | Primer valor del grupo | `{ $first: "$campo" }` |
| `$last` | Último valor del grupo | `{ $last: "$campo" }` |
| `$push` | Acumula valores en un array | `{ $push: "$campo" }` |
| `$cmp` | Compara dos valores: negativo (<), 0 (=), positivo (>) | `{ $cmp: ["$a", "$b"] }` |
| `$multiply` | Multiplica valores | `{ $multiply: ["$a", "$b"] }` |
| `$round` | Redondea a N decimales | `{ $round: ["$campo", 2] }` |

---

## Índices

### ¿Qué es un índice?

Un índice es una estructura de datos que permite acceso rápido a documentos sin necesidad de recorrer toda la colección. Sin índice, MongoDB realiza un **COLLSCAN** (collection scan): examina todos los documentos. Con índice realiza un **IXSCAN**: accede directamente a los relevantes.

```javascript
// Sin índice → COLLSCAN (examina todos los documentos):
db.pedidos.find({ estado: "entregado" }).explain("executionStats")
// totalDocsExamined: 6  ← toda la colección

// Crear índice y repetir la consulta → IXSCAN:
db.pedidos.createIndex({ estado: 1 })
db.pedidos.find({ estado: "entregado" }).explain("executionStats")
// totalDocsExamined: 3  ← solo los relevantes
```

**Reglas de oro:**
- Crear índices en los campos más usados en filtros (`$match`, `find()`).
- Los índices aceleran lecturas pero ralentizan escrituras.
- Usar `explain()` para diagnosticar consultas lentas.

---

### El índice `_id`

- Creado automáticamente en toda colección al insertar el primer documento.
- Es un índice **único** (`_id_`): no permite valores duplicados.
- No puede eliminarse.

```javascript
db.datosvendedores.getIndexes()
// [ { v: 2, key: { _id: 1 }, name: '_id_' } ]
```

---

### Índice simple

```javascript
db.datosvendedores.createIndex({ "Id": 1 })
// nombre automático: "Id_1"
```

- `"Id"`: campo sobre el que se crea el índice.
- `1`: orden ascendente (`-1` = descendente).
- Si ya existe, **no** se sobreescribe.

---

### Índice sobre campo embebido

```javascript
db.datosventas.createIndex({ "cliente.nombre": 1 })
// nombre automático: "cliente.nombre_1"
```

Se puede indexar cualquier campo de un subdocumento usando dot notation.

---

### Índice compuesto

```javascript
db.datosventas.createIndex({ "cliente.localidad": 1, "producto.marca": 1 })
// nombre automático: "cliente.localidad_1_producto.marca_1"
```

Permite consultas eficientes que involucren ambos campos simultáneamente. El orden de los campos importa.

```javascript
db.datosventas.getIndexes()
// [
//   { v: 2, key: { _id: 1 }, name: '_id_' },
//   { v: 2, key: { 'cliente.nombre': 1 }, name: 'cliente.nombre_1' },
//   { v: 2, key: { 'cliente.localidad': 1, 'producto.marca': 1 }, name: 'cliente.localidad_1_producto.marca_1' }
// ]
```

---

### Índice único

Garantiza que no haya valores duplicados en el campo indexado. Al intentar insertar un duplicado, MongoDB devuelve un error `E11000`.

```javascript
db.datosvendedores.createIndex({ "nombre": 1, "apellidos": 1 }, { "unique": true })
// nombre automático: "nombre_1_apellidos_1"

// Intento de duplicado → error:
// MongoServerError: E11000 duplicate key error collection: TBD00.datosvendedores
```

---

### Índice en array

MongoDB indexa arrays de forma que cada elemento del array se trata como un valor independiente. Permite búsquedas eficientes por elementos individuales del array.

```javascript
db.tipoProducto.insertOne({ _id: 1, nombre: "Laptop", categorias: ["tecnología", "computadoras", "portátiles"] })
db.tipoProducto.createIndex({ "categorias": 1 })
// nombre automático: "categorias_1"

// Búsqueda eficiente por un elemento del array:
db.tipoProducto.find({ categorias: "computadoras" })
```

---

### Índice sparse (disperso)

Solo indexa los documentos que **contienen** el campo especificado, omitiendo aquellos donde el campo no existe o es `null`. Útil en colecciones schema-less donde no todos los documentos tienen los mismos campos.

```javascript
db.datosventas.createIndex({ "producto.marca": 1 }, { "sparse": true })
// nombre automático: "producto.marca_1"
```

---

### Índice parcial

Solo indexa los documentos que **satisfacen una condición** (expresión de filtro). Requiere menos espacio y menor costo de mantenimiento que un índice completo.

```javascript
db.datosventas.createIndex(
  { "importe": 1 },
  { partialFilterExpression: { "importe": { $exists: true, $gt: 500 } } }
)
// nombre automático: "importe_1"
// Solo indexa documentos donde importe existe Y importe > 500
```

---

### Visualizar índices

```javascript
db.cc_info.getIndexes()
// [
//   { v: 2, key: { _id: 1 }, name: '_id_' },
//   { v: 2, key: { city: 1 }, name: 'city_1' }
// ]
```

---

### Eliminar índices

```javascript
// Por definición de campos:
db.datosventas.dropIndex({ "importe": 1 })
// { nIndexesWas: 2, ok: 1 }

// Por nombre:
db.datosventas.dropIndex("cliente.localidad_hashed")

// Todos los índices excepto _id:
db.datosventas.dropIndexes()
// { nIndexesWas: 6, msg: 'non-_id indexes dropped for collection', ok: 1 }
```

---

### reIndex()

Borra todos los índices de una colección y los recrea. Operación costosa para colecciones grandes. Útil cuando el tamaño de la colección cambió mucho o el espacio usado por los índices es desproporcionado.

```javascript
db.datosvendedores.reIndex()
// { nIndexesWas: 3, nIndexes: 3, indexes: [...], ok: 1 }
```

---

## Vistas

Las vistas son **colecciones de solo lectura** definidas mediante un Aggregation Pipeline. Equivalentes a las vistas de SQL.

### Crear vista por línea de comandos

```javascript
db.createView(
  "Transacciones_Estado",   // nombre de la vista
  "transactions",           // colección base
  [
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

| Etapa | Descripción |
|-------|-------------|
| `$lookup` | Une `transactions` con `cc_info` cuando `credit_card` coincide. Los resultados se agregan como array en `"Transacciones_Estado"`. |
| `$project` | Selecciona campos. `city: "$Transacciones_Estado.city"` accede al campo de la colección relacionada. |
| `$unwind: "$city"` | Convierte el array `city` generado por `$lookup` en un valor escalar. |

### Usar una vista

```javascript
db.Transacciones_Estado.find({ city: "Houston" })
```

### Crear vista por GUI (MongoDB Compass)

1. Pestaña **Aggregations** → **Add Stage**.
2. Agregar stages: `$lookup`, `$project`, `$unwind`.
3. Verificar preview.
4. **Save** → **Create View** → ingresar nombre.

La vista aparece en el panel izquierdo como READ-ONLY.

---

## Plan de ejecución (Explain)

```javascript
db.pedidos.find({ estado: "entregado" }).explain("executionStats")
```

Métricas clave:
- **`totalDocsExamined`**: documentos analizados.
- **`totalDocsReturned`**: documentos devueltos.
- **`executionTimeMillis`**: tiempo de ejecución.
- **`COLLSCAN`**: sin índice — recorrió toda la colección.
- **`IXSCAN`**: usó un índice.
