---
layout: default
title: Apunte completo
parent: Unidad 4
nav_order: 1
permalink: /unidad-4/teoria/
---

[← Unidad 4](../)

- [NoSQL](#nosql)
  - [Historia y motivación](#historia-y-motivación)
  - [Características](#características)
  - [Tipos de datos](#tipos-de-datos)
  - [Arquitectura de clúster](#arquitectura-de-clúster)
  - [ACID vs BASE](#acid-vs-base)
  - [Teorema CAP](#teorema-cap)
  - [Modelos NoSQL](#modelos-nosql)
- [MongoDB](#mongodb)
  - [Características de MongoDB](#características-de-mongodb)
  - [BSON](#bson)
  - [Terminología](#terminología)
  - [Tipos de datos](#tipos-de-datos-en-mongodb)
  - [ObjectId](#objectid)
  - [Schema en MongoDB](#schema-en-mongodb)
  - [Shell mongosh](#shell-mongosh)
  - [Gestión de bases de datos y colecciones](#gestión-de-bases-de-datos-y-colecciones)
- [CRUD en MongoDB](#crud-en-mongodb)
  - [Inserción](#inserción)
  - [Lectura — find()](#lectura--find)
  - [Operadores de consulta](#operadores-de-consulta)
  - [Actualización](#actualización)
  - [Eliminación](#eliminación)
- [Aggregation Pipeline](#aggregation-pipeline)
  - [Etapas principales](#etapas-principales)
  - [Operadores de acumulación](#operadores-de-acumulación)
- [Índices](#índices)
- [Vistas](#vistas)
- [MongoDB Compass](#mongodb-compass)
- [Data Lake](#data-lake)
- [KDD — Knowledge Discovery in Databases](#kdd--knowledge-discovery-in-databases)

---

# Unidad 4 — BD No Transaccionales (NoSQL)

## NoSQL

### Historia y motivación

El término **NoSQL** fue acuñado en 1998 por Carlo Strozzi para nombrar su base de datos relacional ligera que no usaba SQL. Su significado actual es **"Not only SQL"**, reconociendo que puede haber múltiples formas de acceder a datos.

**Línea de tiempo de bases de datos:**

| Año | Hito |
|-----|------|
| 1960 | IDS (Integrated Data Store) |
| 1966 | IMS (IBM Information Management System) |
| 1967 | COBOL / Codasyl |
| 1970 | Modelo relacional (Codd) |
| 1982 | PL/SQL / Oracle |
| 1989 | SQL Server |
| 1995 | MySQL |
| 1998 | NoSQL |

**Limitaciones del modelo relacional** que impulsaron NoSQL:

- **Costo de escalabilidad vertical**: escalar un servidor relacional (más CPU/RAM) es caro.
- **Volúmenes masivos de datos**: tablas con miles de millones de filas degradan el rendimiento.
- **Baja latencia**: aplicaciones web de alta concurrencia necesitan respuestas en milisegundos.
- **Alta disponibilidad**: sistemas 24/7 no pueden tolerar tiempos de inactividad para mantenimiento.

### Características

- Sin esquema predefinido (schema-less): cada documento puede tener estructura diferente.
- Arquitectura distribuida: los datos se reparten en múltiples nodos.
- Escalabilidad horizontal: se agregan más servidores en lugar de uno más potente.
- Flexibilidad: permite almacenar datos estructurados, semi-estructurados y no estructurados.

### Tipos de datos

| Tipo | Ejemplos |
|------|---------|
| **Estructurados** | Enteros, cadenas, fechas, tablas relacionales |
| **Semi-estructurados** | JSON, XML, imágenes con metadatos |
| **No estructurados** | Video, audio, redes sociales, videovigilancia |

Los datos no estructurados requieren tecnologías como **OCR** (reconocimiento óptico de caracteres) y **NLP** (procesamiento de lenguaje natural) para ser procesados.

### Arquitectura de clúster

| Tipo | Descripción | Modelo de costo |
|------|-------------|-----------------|
| **Clúster en la nube** | Servidores gestionados por un proveedor (AWS, GCP, Azure) | Opex (pago por uso) |
| **Clúster de servidores dedicados** | Hardware propio en datacenter | Capex (inversión inicial) |

### ACID vs BASE

Las bases de datos relacionales garantizan propiedades **ACID**:

| Propiedad | Significado |
|-----------|-------------|
| **A**tomicidad | La transacción completa o no se aplica nada |
| **C**onsistencia | Siempre se pasa de un estado válido a otro |
| **I**solamiento | Las transacciones no se interfieren entre sí |
| **D**urabilidad | Los cambios confirmados persisten ante fallos |

Las bases de datos NoSQL priorizan disponibilidad y rendimiento con el modelo **BASE**:

| Sigla | Significado |
|-------|-------------|
| **BA** | Basically Available (disponibilidad básica garantizada) |
| **S** | Soft State (el estado puede cambiar con el tiempo) |
| **E** | Eventually Consistent (consistencia eventual, no inmediata) |

### Teorema CAP

Formulado por Eric Brewer (2000): un sistema distribuido **solo puede garantizar 2 de 3 propiedades simultáneamente**.

| Propiedad | Descripción |
|-----------|-------------|
| **C**onsistency | Todos los nodos ven los mismos datos al mismo tiempo |
| **A**vailability | El sistema siempre responde |
| **P**artition tolerance | El sistema funciona aunque la red falle entre nodos |

| Combinación | Ejemplos | Sacrificio |
|-------------|----------|------------|
| **CA** | RDBMS (SQL Server, MySQL) | No tolera particiones de red |
| **CP** | MongoDB, HBase, Redis | Puede no responder durante partición |
| **AP** | CouchDB, Cassandra, DynamoDB, Riak | Puede devolver datos desactualizados |

**MongoDB es CP**: tiene un único nodo primario que recibe todas las escrituras. Si hay una partición de red, prefiere ser consistente y puede dejar de responder momentáneamente.

### Modelos NoSQL

#### Clave-Valor

Estructura más simple: cada elemento es un par `{clave: valor}`. El valor es opaco (el motor no interpreta su contenido).

- **Uso**: sesiones, caché, configuración.
- **Ejemplos**: Redis, DynamoDB, Aerospike.

#### Documentos

Almacena documentos (JSON/BSON). Cada documento puede tener estructura diferente dentro de la misma colección.

- **Uso**: catálogos de productos, gestión de contenido, perfiles de usuarios.
- **Ejemplos**: MongoDB, CouchDB.

#### Grafos

Almacena vértices (entidades) y aristas (relaciones) con propiedades. Optimizado para consultas que atraviesan relaciones complejas.

- **Uso**: redes sociales, detección de fraudes, motores de recomendaciones, organigramas.
- **Ejemplos**: JanusGraph (Gremlin), Neo4j.
- Consulta de ejemplo (Gremlin): `g.V().has('name','hercules').out('father').out('father').values('name')` → devuelve `saturn`.

#### Columnas / Familias de columnas

Una columna es una unidad básica (nombre + valor). Un conjunto de columnas forma una fila. Las columnas pueden agruparse en **familias de columnas**. Las filas pueden tener diferentes columnas.

- **Uso**: análisis de redes sociales, telemetría, datos de sensores, series temporales.
- **Ejemplos**: Apache Cassandra, HBase.
- Acceso por celdas individuales con `GET` y `PUT`; múltiples filas con `SCAN`.

---

## MongoDB

MongoDB es una base de datos NoSQL orientada a documentos. Su nombre proviene de "hu**mongo**us" (enorme). Es una base de datos **CP** según el Teorema CAP.

### Características de MongoDB

- **Flexibilidad**: schema-less, los documentos de una colección pueden tener estructuras diferentes.
- **Escalabilidad horizontal**: sharding para distribuir datos entre nodos.
- **Alto rendimiento**: usa BSON (más rápido de procesar que JSON).
- **Desarrollo ágil**: drivers para JavaScript, Python, Java, Node.js y otros.

### BSON

MongoDB almacena los datos en **BSON** (Binary JSON):

- **Más rápido de procesar** que JSON puro.
- **Mejor almacenamiento** que JSON de texto.
- **Más tipos de datos** que JSON: incluye Integer, Double, Decimal128, Date, ObjectId, etc.

### Terminología

| MongoDB | SQL equivalente |
|---------|----------------|
| Base de datos | Base de datos |
| Colección | Tabla |
| Documento | Fila / registro |
| Clave (campo) | Columna |
| `_id` | Clave primaria (PK) |
| Índice | Índice |

### Tipos de datos en MongoDB

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **String** | UTF-8 | `"nombre": "Juan"` |
| **Integer 32-bit** | Entero: −2,147,483,648 a 2,147,483,647 | `"edad": 30` |
| **Integer 64-bit** | Entero: ±9,223,372,036,854,775,807 | `"visitas": NumberLong(9999999999)` |
| **Double** | Punto flotante de 64 bits, ~15 dígitos de precisión | `"sueldo": 1250.75` |
| **Decimal128** | Hasta 34 dígitos de precisión | `"precio": NumberDecimal("1234.5678")` |
| **Boolean** | `true` / `false` | `"activo": true` |
| **Null** | Valor nulo | `"segundoNombre": null` |
| **Array** | Lista de valores | `"hobbies": ["leer","viajar"]` |
| **Date** | ISO 8601 | `new Date("1995-12-17T03:24:00Z")` |
| **ObjectId** | Identificador único de 12 bytes | `ObjectId("64d...")` |
| **Object** | Documento embebido | `"contacto": {"email": "a@b.com"}` |

**Reglas para claves (campos):**

- Las claves son cadenas de texto.
- No se permiten bytes nulos (`\0`).
- Evitar `.` (acceso a campos anidados) y `$` (operadores).
- MongoDB es **case-sensitive** en claves y valores.
- No se permiten claves duplicadas (MongoDB conserva el último valor).
- El **orden de los campos BSON importa**.

**Operadores de fecha** disponibles en aggregation:

`$year`, `$month`, `$dayOfMonth`, `$dayOfWeek`, `$dayOfYear`, `$week`, `$hour`, `$minute`, `$second`, `$millisecond`, `$isoWeek`, `$isoDayOfWeek`, `$dateToString`, `$dateFromString`, `$dateAdd`, `$dateSubtract`, `$dateDiff`, `$dateTrunc`, `$dateFromParts`

### ObjectId

El campo `_id` es la clave primaria de cada documento. Por defecto MongoDB genera un **ObjectId** de **12 bytes**:

| Bytes | Contenido |
|-------|-----------|
| 4 bytes | Timestamp (segundos desde epoch Unix) |
| 5 bytes | Identificador de máquina + PID |
| 3 bytes | Contador aleatorio |

```
{ "_id": ObjectId("68dec97896a0c6359e5a5851") }
```

### Schema en MongoDB

MongoDB es **schema-less**: documentos de la misma colección pueden tener campos diferentes.

```javascript
db.personas.insertMany([
  { nombre: "Juan", edad: 30 },
  { nombre: "Ana", email: "ana@gmail.com", activo: true },
  { nombre: "Carlos",
    direccion: { ciudad: "Buenos Aires", calle: "Corrientes" },
    telefonos: ["1111-1111", "2222-2222"] }
])
```

Sin embargo, se pueden definir **validadores con JSON Schema** al crear la colección:

```javascript
db.createCollection("empleados", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre", "edad"],
      properties: {
        nombre: { bsonType: "string" },
        edad: { bsonType: "int", minimum: 18, maximum: 70 }
      }
    }
  }
})
```

### Shell mongosh

**Conectar a servidor local:**
```
mongosh
```

**Conectar a MongoDB Atlas:**
```
mongosh "mongodb+srv://estudiante:XJFIpIdyxgdSWkUT@cluster0.tjnu3hi.mongodb.net/"
```

**Comandos básicos del shell:**

| Comando | Descripción |
|---------|-------------|
| `show dbs` | Lista todas las bases de datos |
| `use <nombre>` | Cambia a esa base de datos (la crea si no existe al insertar) |
| `show collections` | Lista las colecciones de la BD actual |
| `db` | Muestra la BD actual |
| `db.stats()` | Estadísticas de la BD |
| `help` | Ayuda |
| `exit` | Salir |
| `cls` / Ctrl+L | Limpiar pantalla |

### Gestión de bases de datos y colecciones

**Crear base de datos** (creación diferida — se crea al insertar el primer documento):
```javascript
use MiBase
```

**Eliminar base de datos** (sin confirmación):
```javascript
db.dropDatabase()
```

**Crear colección explícitamente:**
```javascript
db.createCollection("nombre")
```

**Listar colecciones:**
```javascript
db.getCollectionNames()
show collections
```

**Eliminar colección** (dos formas):
```javascript
db.nombreColeccion.drop()        // notación de punto
db["nombreColeccion"].drop()     // notación de corchetes
```

---

## CRUD en MongoDB

| Operación | Método MongoDB | Equivalente SQL |
|-----------|---------------|-----------------|
| **Create** | `insertOne()` / `insertMany()` | INSERT |
| **Read** | `find()` | SELECT |
| **Update** | `updateOne()` / `updateMany()` | UPDATE |
| **Delete** | `deleteOne()` / `deleteMany()` | DELETE |

### Inserción

**Insertar un documento:**
```javascript
db.Estrella.insertOne({
  "Nombre": "Sirio",
  "Magnitud": -1.47,
  "Distancia_(años_luz)": 8.6,
  "Tamaño": "Enana blanca",
  "Constelacion": "Can Mayor"
})
```

Respuesta:
- `acknowledged: true` → MongoDB confirmó la inserción.
- `insertedId: ObjectId(...)` → ID generado automáticamente.

**Insertar múltiples documentos:**
```javascript
db.miColeccion.insertMany([
  { nombre: "Juan", edad: 28, ciudad: "Buenos Aires" },
  { nombre: "María", edad: 34, ciudad: "Córdoba" },
  { nombre: "Pedro", edad: 23, ciudad: "Rosario" }
])
```

Si la colección no existe, `insertOne()` e `insertMany()` la crean automáticamente.

### Lectura — find()

`find()` es equivalente al `SELECT` de SQL.

```javascript
db.coleccion.find(<filtro>, <proyección>).limit(n).sort(<orden>)
```

**Seleccionar todos los documentos:**
```javascript
db.users.find()
```

**Proyección** — controla qué campos se devuelven:
- `1` → incluir el campo.
- `0` → excluir el campo.
- `_id` se incluye siempre a menos que se excluya explícitamente con `_id: 0`.
- No se pueden mezclar inclusiones y exclusiones en la misma proyección (excepto `_id`).

```javascript
// Solo nombre y apellido, sin _id
db.socios.find({}, { nombre: 1, apellido: 1, _id: 0 })
```

**Tabla de equivalencias SQL ↔ MongoDB:**

| Operación | SQL Server | MongoDB |
|-----------|------------|---------|
| Todos los documentos | `SELECT * FROM users` | `db.users.find()` |
| Campos específicos | `SELECT id, status FROM users` | `db.users.find({}, { id:1, status:1 })` |
| Filtrar | `SELECT * FROM users WHERE status = "A"` | `db.users.find({ status: "A" })` |
| Buscar por patrón | `WHERE user_id LIKE "%bc%"` | `db.users.find({ user_id: /bc/ })` |
| Ordenar | `ORDER BY user_id ASC` | `.sort({ user_id: 1 })` |
| Limitar | `SELECT TOP 10 *` | `db.users.find().limit(10)` |

### Operadores de consulta

**Operadores de comparación:**

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$eq` | Igual a | `{ edad: { $eq: 30 } }` equivale a `{ edad: 30 }` |
| `$ne` | Distinto de | `{ ciudad: { $ne: "Morón" } }` |
| `$gt` | Mayor que | `{ numSocio: { $gt: 300 } }` |
| `$gte` | Mayor o igual | `{ edad: { $gte: 18 } }` |
| `$lt` | Menor que | `{ edad: { $lt: 18 } }` |
| `$lte` | Menor o igual | `{ edad: { $lte: 65 } }` |

**Operadores de conjuntos y existencia:**

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$in` | Coincide con alguno de los valores | `{ ciudad: { $in: ["Morón", "San Justo"] } }` |
| `$nin` | No coincide con ninguno | `{ ciudad: { $nin: ["Morón", "San Justo"] } }` |
| `$exists` | Verifica si un campo existe | `{ telefono: { $exists: true } }` |
| `$all` | El array contiene todos los valores | `{ deportes: { $all: ["Fútbol", "Natación"] } }` |

**Operadores lógicos:**

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$and` | Todas las condiciones deben cumplirse | `{ $and: [{ edad: { $gt: 18 } }, { ciudad: "Morón" }] }` |
| `$or` | Al menos una condición | `{ $or: [{ edad: { $lt: 18 } }, { ciudad: "Morón" }] }` |
| `$nor` | Ninguna condición | `{ $nor: [{ ciudad: "Morón" }, { activo: false }] }` |
| `$not` | Niega una condición (operador interno) | `{ edad: { $not: { $gt: 30 } } }` |

**Operadores de evaluación y arrays:**

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `$size` | Array con cantidad específica de elementos | `{ hobbies: { $size: 3 } }` |
| `$elemMatch` | Un elemento del array cumple varias condiciones | `{ notas: { $elemMatch: { valor: { $gt: 7 }, aprobado: true } } }` |
| `$regex` | Busca patrones en cadenas (similar a LIKE) | `{ nombre: { $regex: "^A" } }` |
| `$type` | Filtra según tipo BSON del campo | `{ edad: { $type: "int" } }` |
| `$mod` | Filtra según resto de división (módulo) | `{ numero: { $mod: [2, 0] } }` |

### Actualización

**Sintaxis:**
```javascript
db.coleccion.updateOne(<filtro>, <actualización>, <opciones>)
db.coleccion.updateMany(<filtro>, <actualización>, <opciones>)
```

**Respuesta:**
- `acknowledged`: si la operación fue reconocida.
- `matchedCount`: documentos que coincidieron con el filtro.
- `modifiedCount`: documentos efectivamente modificados.
- `upsertedId`: si se usó `upsert: true` y se insertó un nuevo documento.

**Operador `$set`** — agrega o modifica campos:
```javascript
db.datosventas.updateOne(
  { id_venta: 1 },
  { $set: { importe: 2000 } }
)

// Agregar un campo nuevo y modificar otro al mismo tiempo:
db.datosventas.updateOne(
  { id_venta: 2 },
  { $set: { importe: 2500, fecha_modificacion: new Date() } }
)
```

`$set` agrega el campo si no existe; lo actualiza si ya existe. No requiere modificar la colección previamente.

**Operador `$unset`** — elimina campos:
```javascript
// Eliminar un campo:
db.miColeccion.updateOne({ nombre: "Ana" }, { $unset: { telefono: "" } })

// Eliminar múltiples campos:
db.miColeccion.updateOne({ nombre: "Ana" }, { $unset: { edad: "", email: "" } })
```

El valor asignado dentro de `$unset` no importa; MongoDB solo usa el nombre del campo.

**Actualizar todos los documentos:**
```javascript
db.Estrella.updateMany({}, { $set: { "Fecha Descubrimiento": null } })
```

### Eliminación

```javascript
// Eliminar el primer documento que coincida:
db.personas.deleteOne({ nombre: "Juan Pérez" })

// Eliminar todos los documentos que coincidan:
db.personas.deleteMany({ "dirección.pais": "España" })
```

**Respuesta:**
- `acknowledged: true` → operación exitosa.
- `deletedCount` → cantidad de documentos eliminados (0 si no hubo coincidencia).

---

## Aggregation Pipeline

La **canalización de agregación** (Aggregation Pipeline) es la forma en que MongoDB procesa y transforma documentos. Consta de una o más **etapas (stages)** que se ejecutan secuencialmente: los documentos de salida de cada etapa son la entrada de la siguiente.

**Usos principales:**
- Agrupar valores de varios documentos.
- Operaciones matemáticas (suma, promedio, máximo, mínimo).
- Analizar cambios de datos a lo largo del tiempo.
- Construir vistas complejas.

### Etapas principales

| Etapa | Equivalente SQL | Descripción |
|-------|-----------------|-------------|
| `$match` | WHERE / filter | Filtra documentos según condición |
| `$group` | GROUP BY | Agrupa documentos por un campo |
| `$project` | SELECT | Selecciona y renombra campos |
| `$lookup` | JOIN | Une documentos de otra colección |
| `$unwind` | — | Descompone un array en documentos individuales |
| `$sort` | ORDER BY | Ordena los documentos |
| `$limit` | TOP / LIMIT | Limita la cantidad de resultados |

**Ejemplo — filtrar con `$match`:**
```javascript
db.cc_info.aggregate([{ $match: { city: "Dallas" } }])
```

**Ejemplo — agrupar con `$group` y sumar:**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: { _id: "$city", total: { $sum: "$transaction_dollar_amount" } }
}])
```

**Ejemplo — contar por grupo:**
```javascript
db.Transacciones_Estado_1.aggregate([{
  $group: { _id: "$city", totalTransacciones: { $sum: 1 } }
}])
```

**Ejemplo — combinar `$match` y `$group`:**
```javascript
db.Transacciones_Estado_1.aggregate([
  { $match: { city: "Houston" } },
  { $group: { _id: "$city", total: { $sum: "$transaction_dollar_amount" } } }
])
```

### Operadores de acumulación

| Operador | Descripción |
|----------|-------------|
| `$sum` | Suma los valores; con `1` cuenta documentos |
| `$avg` | Promedio |
| `$max` | Valor máximo |
| `$min` | Valor mínimo |
| `$cmp` | Compara dos valores: negativo (<), 0 (=), positivo (>) |

---

## Índices

Un índice posibilita el acceso directo y rápido a documentos, haciendo más eficientes las búsquedas. Sin índice, MongoDB debe recorrer secuencialmente todos los documentos (**collection scan**).

**El campo `_id` tiene un índice único creado automáticamente.**

**Características:**
- Los índices son estructuras asociadas a colecciones.
- Se actualizan automáticamente ante inserciones, actualizaciones o eliminaciones.
- **Desventaja**: consumen espacio en disco y generan costo de mantenimiento en escrituras.
- No se recomienda crear índices sobre campos que no se usan frecuentemente en consultas o en colecciones muy pequeñas.

**Visualizar índices:**
```javascript
db.cc_info.getIndexes()
```

**Crear índice:**
```javascript
db.cc_info.createIndex({ "city_indx": 1 })
// 1 = ascendente, -1 = descendente
```

**Eliminar índice:**
```javascript
db.cc_info.dropIndex("city_indx")    // un índice por nombre
db.cc_info.dropIndexes()             // todos los índices (excepto _id)
```

---

## Vistas

Las vistas en MongoDB se crean con el **Aggregation Pipeline** y son de **solo lectura**.

**Crear vista por línea de comandos:**
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

**Etapas usadas:**
- **`$lookup`**: une documentos cuando `localField` y `foreignField` coinciden. Equivale al JOIN/WHERE de SQL. Los documentos coincidentes se agregan como array (`as:`).
- **`$project`**: selecciona un subconjunto de campos. Equivale al SELECT.
  - `_id: 0` → excluir campo.
  - `credit_card: 1` → incluir campo.
  - `city: "$Transacciones_Estado.city"` → campo de la colección relacionada.
- **`$unwind`**: convierte un campo array en un valor escalar. Necesario cuando `$lookup` genera un array y se quiere un valor simple.

---

## MongoDB Compass

**MongoDB Compass** es la GUI oficial de MongoDB. Es gratuito y disponible en macOS, Windows y Linux.

**Funciones principales:**
- Conectar a instancias locales (`mongodb://localhost:27017`) o remotas (Atlas).
- Crear, visualizar y eliminar bases de datos y colecciones.
- Insertar documentos (individuales o múltiples).
- **Importar/Exportar**: acepta archivos JSON y CSV.
- Filtrar documentos con la barra de filtros (usando la misma sintaxis que `find()`).
- Modificar documentos con el ícono de lápiz o doble clic.
- Eliminar documentos con el ícono de papelera.
- Construir pipelines de agregación visualmente (pestaña Aggregations).
- Gestionar índices (pestaña Indexes).
- Ver el plan de ejecución con el botón **Explain**.
- **MongoDB Assistant**: IA integrada que ayuda a generar consultas.

**Vistas de datos disponibles:**
- **Lista**: vista compacta.
- **JSON**: muestra documentos en formato JSON.
- **Tabla**: muestra documentos como hoja de cálculo.

**Importar con `mongoimport` (línea de comandos):**
```
mongoimport --db=ejemplos --collection=empleados --file=empleado.json --jsonArray
mongoimport --db=ejemplos --collection=departamentos --type=csv --headerline --file=dptos.csv
```

---

## Data Lake

Un **Data Lake** es un repositorio centralizado que almacena **grandes volúmenes de datos en su formato original** (raw), sin transformación previa.

| | Data Lake | Data Warehouse |
|--|-----------|----------------|
| **Datos** | Sin procesar, formato original | Procesados, estructurados, curados |
| **Esquema** | Schema on read (al consultar) | Schema on write (al cargar) |
| **Formatos** | Cualquiera (JSON, CSV, imágenes, video) | Solo estructurados/tabulares |
| **Usuarios** | Data scientists, ingenieros | Analistas de negocio |

---

## KDD — Knowledge Discovery in Databases

El proceso **KDD** (Knowledge Discovery in Databases) es el proceso completo de extraer conocimiento útil a partir de grandes volúmenes de datos. También se conoce como **Data Mining** o minería de datos.

**Etapas del proceso KDD:**

1. **Selección**: identificar y seleccionar las fuentes de datos relevantes.
2. **Preprocesamiento / Limpieza**: eliminar ruido, valores faltantes y datos inconsistentes.
3. **Transformación**: convertir los datos al formato adecuado para el análisis (normalización, agregación).
4. **Minería de datos**: aplicar algoritmos para encontrar patrones (clasificación, clustering, regresión, asociación).
5. **Evaluación / Interpretación**: evaluar los patrones descubiertos y determinar si son útiles y novedosos.
6. **Presentación**: comunicar los resultados de forma comprensible.

Para datos no estructurados (texto, imágenes, audio) se usan:
- **OCR** (Optical Character Recognition): extrae texto de imágenes o documentos escaneados.
- **NLP** (Natural Language Processing): procesa y analiza texto en lenguaje natural.
