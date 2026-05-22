---
layout: default
title: Práctica
parent: Unidad 4
nav_order: 7
permalink: /unidad-4/practica/
---

[← Unidad 4](../)

# Práctica — Unidad 4 NoSQL / MongoDB

Ejercicios de práctica de la cátedra. Se trabajan las operaciones CRUD, operadores de filtrado, proyección, índices, vistas y aggregation pipeline sobre colecciones de datos reales.

---

## Parte 1 — Creación de BD y colecciones

### Ejercicio 1

Crear la base de datos `Astronomia`.

```javascript
use Astronomia
```

### Ejercicio 2

Dentro de `Astronomia`, crear la colección `Estrella` con los siguientes campos:

| Campo | Tipo |
|-------|------|
| Nombre | String |
| Magnitud | Double |
| Distancia_(años_luz) | Double |
| Tamaño | String |
| Constelacion | String |

```javascript
db.createCollection("Estrella")
```

---

## Parte 2 — Inserción de documentos

### Ejercicio 3

Insertar una estrella con `insertOne()`:

```javascript
db.Estrella.insertOne({
  "Nombre": "Sirio",
  "Magnitud": -1.47,
  "Distancia_(años_luz)": 8.6,
  "Tamaño": "Enana blanca",
  "Constelacion": "Can Mayor"
})
```

### Ejercicio 4

Insertar tres estrellas con `insertMany()`:

```javascript
db.Estrella.insertMany([
  { "Nombre": "Canopus", "Magnitud": -0.74, "Distancia_(años_luz)": 310, "Tamaño": "Supergigante", "Constelacion": "Carina" },
  { "Nombre": "Arturo", "Magnitud": -0.05, "Distancia_(años_luz)": 37, "Tamaño": "Gigante", "Constelacion": "Bootes" },
  { "Nombre": "Alfa Centauri A", "Magnitud": -0.01, "Distancia_(años_luz)": 4.37, "Tamaño": "Enana amarilla", "Constelacion": "Centaurus" }
])
```

### Ejercicio 5

Insertar todos los tipos de datos vistos en clase en una colección de prueba:

```javascript
db.tipoDatos.insertOne({
  campo_string: "texto de ejemplo",
  campo_int32: 42,
  campo_double: 3.14,
  campo_decimal: NumberDecimal("1234.5678901234567890"),
  campo_boolean: true,
  campo_null: null,
  campo_array: ["elemento1", "elemento2", "elemento3"],
  campo_fecha: new Date("2024-01-15T10:30:00Z"),
  campo_objeto: { subcampo1: "valor1", subcampo2: 100 }
})
```

### Ejercicio 6

Verificar los tipos de datos insertados observando el documento en Compass. ¿Qué tipo muestra el campo `campo_int32`? ¿Y `campo_decimal`?

### Ejercicio 7

Insertar la tabla completa de estrellas en la colección `Estrella`:

```javascript
db.Estrella.insertMany([
  { "Nombre": "Sirio", "Magnitud": -1.47, "Distancia_(años_luz)": 8.6, "Tamaño": "Enana blanca", "Constelacion": "Can Mayor" },
  { "Nombre": "Canopus", "Magnitud": -0.74, "Distancia_(años_luz)": 310, "Tamaño": "Supergigante", "Constelacion": "Carina" },
  { "Nombre": "Arturo", "Magnitud": -0.05, "Distancia_(años_luz)": 37, "Tamaño": "Gigante", "Constelacion": "Bootes" },
  { "Nombre": "Alfa Centauri A", "Magnitud": -0.01, "Distancia_(años_luz)": 4.37, "Tamaño": "Enana amarilla", "Constelacion": "Centaurus" },
  { "Nombre": "Vega", "Magnitud": 0.03, "Distancia_(años_luz)": 25, "Tamaño": "Enana blanca azulada", "Constelacion": "Lyra" },
  { "Nombre": "Rigel", "Magnitud": 0.13, "Distancia_(años_luz)": 860, "Tamaño": "Supergigante azul", "Constelacion": "Orion" },
  { "Nombre": "Procyon", "Magnitud": 0.34, "Distancia_(años_luz)": 11.4, "Tamaño": "Enana amarilla", "Constelacion": "Can Menor" },
  { "Nombre": "Achernar", "Magnitud": 0.46, "Distancia_(años_luz)": 139, "Tamaño": "Gigante azul", "Constelacion": "Eridanus" },
  { "Nombre": "Betelgeuse", "Magnitud": 0.50, "Distancia_(años_luz)": 700, "Tamaño": "Supergigante roja", "Constelacion": "Orion" },
  { "Nombre": "Hadar", "Magnitud": 0.61, "Distancia_(años_luz)": 390, "Tamaño": "Gigante azul", "Constelacion": "Centaurus" },
  { "Nombre": "Capella", "Magnitud": 0.71, "Distancia_(años_luz)": 43, "Tamaño": "Gigante amarilla", "Constelacion": "Auriga" },
  { "Nombre": "Altair", "Magnitud": 0.77, "Distancia_(años_luz)": 17, "Tamaño": "Enana blanca", "Constelacion": "Aquila" },
  { "Nombre": "Aldebarán", "Magnitud": 0.85, "Distancia_(años_luz)": 65, "Tamaño": "Gigante roja", "Constelacion": "Tauro" },
  { "Nombre": "Spica", "Magnitud": 0.97, "Distancia_(años_luz)": 250, "Tamaño": "Gigante azul", "Constelacion": "Virgo" },
  { "Nombre": "Antares", "Magnitud": 1.06, "Distancia_(años_luz)": 550, "Tamaño": "Supergigante roja", "Constelacion": "Scorpius" },
  { "Nombre": "Pollux", "Magnitud": 1.14, "Distancia_(años_luz)": 34, "Tamaño": "Gigante naranja", "Constelacion": "Geminis" },
  { "Nombre": "Fomalhaut", "Magnitud": 1.16, "Distancia_(años_luz)": 25, "Tamaño": "Enana blanca", "Constelacion": "Piscis Austrinus" },
  { "Nombre": "Deneb", "Magnitud": 1.25, "Distancia_(años_luz)": 2600, "Tamaño": "Supergigante blanca", "Constelacion": "Cygnus" },
  { "Nombre": "Becrux", "Magnitud": 1.25, "Distancia_(años_luz)": 350, "Tamaño": "Gigante azul", "Constelacion": "Crux" },
  { "Nombre": "Alfa Centauri B", "Magnitud": 1.33, "Distancia_(años_luz)": 4.37, "Tamaño": "Enana naranja", "Constelacion": "Centaurus" },
  { "Nombre": "Regulus", "Magnitud": 1.36, "Distancia_(años_luz)": 79, "Tamaño": "Gigante azul", "Constelacion": "Leo" },
  { "Nombre": "Acrux A", "Magnitud": 1.40, "Distancia_(años_luz)": 320, "Tamaño": "Gigante azul", "Constelacion": "Crux" },
  { "Nombre": "Shaula", "Magnitud": 1.62, "Distancia_(años_luz)": 700, "Tamaño": "Gigante azul", "Constelacion": "Scorpius" },
  { "Nombre": "Gacrux", "Magnitud": 1.64, "Distancia_(años_luz)": 88, "Tamaño": "Gigante roja", "Constelacion": "Crux" },
  { "Nombre": "Bellatrix", "Magnitud": 1.64, "Distancia_(años_luz)": 240, "Tamaño": "Gigante azul", "Constelacion": "Orion" },
  { "Nombre": "Elnath", "Magnitud": 1.65, "Distancia_(años_luz)": 130, "Tamaño": "Gigante azul", "Constelacion": "Tauro" },
  { "Nombre": "Beta Carinae", "Magnitud": 1.67, "Distancia_(años_luz)": 111, "Tamaño": "Gigante blanca", "Constelacion": "Carina" },
  { "Nombre": "Alnilam", "Magnitud": 1.69, "Distancia_(años_luz)": 1350, "Tamaño": "Supergigante azul", "Constelacion": "Orion" },
  { "Nombre": "Alnitak A", "Magnitud": 1.77, "Distancia_(años_luz)": 1200, "Tamaño": "Supergigante azul", "Constelacion": "Orion" }
])
```

---

## Parte 3 — Actualización

### Ejercicio 8

Agregar el campo `Fecha Descubrimiento` con valor `null` a todas las estrellas insertadas:

**Con `updateOne` (de a uno):**
```javascript
db.Estrella.updateOne({ Nombre: "Canopus" }, { $set: { "Fecha Descubrimiento": null } })
```

**Con `updateMany` (todos a la vez):**
```javascript
db.Estrella.updateMany({}, { $set: { "Fecha Descubrimiento": null } })
```

---

## Parte 4 — Eliminación

### Ejercicio 9

Eliminar la estrella Canopus:

```javascript
db.Estrella.deleteOne({ Nombre: "Canopus" })
```

---

## Parte 5 — Importación de datos

### Ejercicio 10 — Importar CSV de clima

1. Crear la base de datos `Clima`.
2. Crear la colección `clima_diario`.
3. Descargar datos meteorológicos de Buenos Aires (6 meses) desde open-meteo.com.
4. Importar el CSV usando Compass: **ADD DATA** → **Import JSON or CSV file**.

### Ejercicio 11 — Importar JSON (Airbnb)

> **Archivo:** `archivos/sample_airbnb.listingsAndReviews.json`

1. Crear la base de datos `Airbnb`.
2. Crear la colección `Vivienda`.
3. Importar el archivo desde Compass: **ADD DATA** → **Import JSON or CSV file**.
4. Al observar los campos de cada documento, ¿qué característica de las BD NoSQL se ve reflejada?
5. Examinar el campo `Address`.

---

## Parte 6 — Índices

### Ejercicio 12

> **Archivos:** `archivos/cc_info.csv` y `archivos/transactions.csv`

1. Crear la base de datos `Deteccion_Fraude`.
2. Crear una colección para cada archivo CSV: `cc_info` y `transactions`.
3. Importar cada archivo CSV desde Compass: **ADD DATA** → **Import JSON or CSV file**.
4. Verificar que por defecto se crea automáticamente el índice sobre el campo `_id`.

**Ver índices existentes:**
```javascript
db.cc_info.getIndexes()
```

**Crear un índice sobre el campo `city`:**
```javascript
db.cc_info.createIndex({ "city_indx": 1 })
db.cc_info.getIndexes()
```

**Usar el índice en una búsqueda:**
```javascript
db.cc_info.find({ city: "Dallas" })
```

**Eliminar el índice:**
```javascript
db.cc_info.dropIndex("city_indx")
```

---

## Parte 7 — Vistas

### Ejercicio 13 — Crear vista por línea de comandos

Crear una vista que una `transactions` con `cc_info` para mostrar la ciudad de cada tarjeta de crédito:

```javascript
db.createView("Transacciones_Estado", "transactions", [
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
])
```

**Por GUI:** ir a la colección `transactions` → pestaña **Aggregations** → agregar stages `$lookup`, `$project` y `$unwind` → **Save** → **Create View**.

---

## Parte 8 — Aggregation Pipeline

### Ejercicio 14 — Operaciones de agregación

Usar la base `Deteccion_Fraude` y la vista `Transacciones_Estado_1`.

**Filtrar con `$match`:**
```javascript
db.cc_info.aggregate([{ $match: { city: "Dallas" } }])
```

**Sumar transacciones por ciudad:**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: {
    _id: "$city",
    total: { $sum: "$transaction_dollar_amount" }
  }
}])
```

**Contar transacciones por ciudad:**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: {
    _id: "$city",
    totalTransacciones: { $sum: 1 }
  }
}])
```

**Máximo y mínimo:**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: {
    _id: "idAux",
    maximo: { $max: "$transaction_dollar_amount" },
    minimo: { $min: "$transaction_dollar_amount" }
  }
}])
```

**Suma total para una ciudad específica:**
```javascript
db.Transacciones_Estado_1.aggregate([
  { $match: { city: "Houston" } },
  { $group: { _id: "$city", total: { $sum: "$transaction_dollar_amount" } } }
])
```

**Filtrar por rango de monto (`$gte`, `$lte`):**
```javascript
db.Transacciones_Estado_1.find({
  transaction_dollar_amount: { $gte: 500, $lte: 700 }
})
```

**Filtrar por igualdad exacta (`$eq`):**
```javascript
db.Transacciones_Estado_1.find({
  transaction_dollar_amount: { $eq: 0.01 }
})
```

**Operador `$cmp` en pipeline:**
```javascript
db.Transacciones_Estado_1.aggregate([
  {
    $match: {
      credit_card: 9383760568579492,
      date: "2015-08-16 19:02:57"
    }
  },
  {
    $project: {
      result: { $cmp: ["$transaction_dollar_amount", 43.78] }
    }
  }
])
// Devuelve 1 (mayor), 0 (igual) o -1 (menor)
```

---

## Parte 9 — Práctica adicional (BD Clima)

Usando la base de datos `Clima` creada en el ejercicio 10:

1. Agregar el campo `Mes` a todos los documentos indicando el nombre del mes según la fecha del registro.
2. Agregar el campo `ciudad` con el valor "Buenos Aires" a todos los documentos.
3. Descargar un nuevo CSV con los mismos campos para la localidad de **Montevideo** e importarlo a la misma colección.
4. Crear una vista con el **promedio diario** de los campos:
   - `temperature_2m` (°C)
   - `rain` (mm)
   - `windspeed_100m` (km/h)
5. Obtener el **máximo y mínimo** de temperatura diaria promedio.
6. Obtener las fechas en las que se produjo la **temperatura diaria promedio** máxima.
7. Para un día determinado (a elección), obtener las condiciones meteorológicas de **Buenos Aires y Montevideo**.

---

## Laboratorio I — Colección datosventas

> **Archivo:** `archivos/datosventas_1.json` — importar a la base `datosventas`, colección `datosventas`.

Este laboratorio trabaja sobre la colección `datosventas`.

### Consultas con find()

```javascript
// 1. Mostrar todos los documentos:
db.datosventas.find()

// 2. Ventas donde la localidad del cliente sea "Ramos Mejía":
db.datosventas.find({ "cliente.localidad": "Ramos Mejía" })

// 3. Ventas cuya cantidad sea mayor a 4:
db.datosventas.find({ cantidad: { $gt: 4 } })

// 4. Solo nombre del cliente y cantidad vendida (sin _id):
db.datosventas.find({}, { "cliente.nombre": 1, cantidad: 1, _id: 0 })

// 5. Localidad "San Justo" O cantidad menor a 5:
db.datosventas.find({
  $or: [
    { "cliente.localidad": "San Justo" },
    { cantidad: { $lt: 5 } }
  ]
})

// 6. Cantidad mayor a 2 Y localidad "Ramos Mejía":
db.datosventas.find({
  cantidad: { $gt: 2 },
  "cliente.localidad": "Ramos Mejía"
})

// 7. Cantidad menor a 3 O producto "Teclado":
db.datosventas.find({
  $or: [
    { cantidad: { $lt: 3 } },
    { "producto.nombre": "Teclado" }
  ]
})

// 8. Cantidad que NO sea mayor a 10:
db.datosventas.find({ cantidad: { $not: { $gt: 10 } } })

// 9. Ventas que NO sean de "Morón" ni tengan cantidad menor a 5:
db.datosventas.find({
  $nor: [
    { "cliente.localidad": "Morón" },
    { cantidad: { $lt: 5 } }
  ]
})

// 10. Agregar campo zona: "Oeste" a clientes de "Ramos Mejía":
db.datosventas.updateMany(
  { "cliente.localidad": "Ramos Mejía" },
  { $set: { zona: "Oeste" } }
)

// 11. Eliminar el campo "cliente.direccion" de ventas con cantidad menor a 2:
db.datosventas.updateMany(
  { cantidad: { $lt: 2 } },
  { $unset: { "cliente.direccion": "" } }
)

// 12. Ventas realizadas durante el año 2024:
db.datosventas.find({
  fecha: { $gte: "2024-01-01", $lt: "2025-01-01" }
})

// 13. Ventas realizadas después del 1 de julio de 2025:
db.datosventas.find({ fecha: { $gt: "2025-07-01" } })

// 14. Ventas realizadas antes del 1 de junio de 2024:
db.datosventas.find({ fecha: { $lt: "2024-06-01" } })

// 15. Ventas en 2025 con cantidad mayor a 3:
db.datosventas.find({
  fecha: { $gte: "2025-01-01", $lt: "2026-01-01" },
  cantidad: { $gt: 3 }
})

// 16. Ventas cuyos clientes tengan nombre que comience con "Ma":
db.datosventas.find({ "cliente.nombre": { $regex: "^Ma" } })

// 17. Documentos donde el campo importe sea de tipo double:
db.datosventas.find({ importe: { $type: "double" } })

// 18. Si la venta con id_venta=1 no tiene campo "tags", crear un array con 5 elementos:
db.datosventas.updateOne(
  { id_venta: 1, tags: { $exists: false } },
  { $set: { tags: ["electronica", "tecnologia", "hogar", "2024", "promo"] } }
)

// 19. Si la venta con id_venta=2 no tiene campo "comentarios", crear un array con 3 elementos:
db.datosventas.updateOne(
  { id_venta: 2, comentarios: { $exists: false } },
  { $set: { comentarios: ["buena entrega", "producto ok", "recomendado"] } }
)

// 20. Ventas en 2025 con dolar:true e importe mayor a 1000, mostrando fecha, cliente y producto:
db.datosventas.find(
  {
    fecha: { $gte: "2025-01-01", $lt: "2026-01-01" },
    dolar: true,
    importe: { $gt: 1000 }
  },
  {
    _id: 0,
    fecha: 1,
    "cliente.nombre": 1,
    "producto.nombre": 1,
    importe: 1
  }
)
```
