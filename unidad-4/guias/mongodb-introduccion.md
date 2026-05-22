---
layout: default
title: MongoDB — Introducción
parent: Unidad 4
nav_order: 3
permalink: /unidad-4/guias/mongodb-introduccion/
---

[← Unidad 4](../)

# MongoDB — Introducción

Referencia sobre BSON, terminología, tipos de datos, ObjectId, schema, shell y gestión de bases de datos y colecciones.

---

## ¿Qué es MongoDB?

MongoDB es una base de datos NoSQL orientada a **documentos**. Su nombre proviene de "hu**mongo**us" (enorme). Es una base de datos **CP** según el Teorema CAP: prioriza consistencia sobre disponibilidad durante particiones de red.

### Características principales

| Característica | Descripción |
|---------------|-------------|
| **Flexibilidad** | Schema-less: los documentos de una colección pueden tener estructuras diferentes |
| **Escalabilidad horizontal** | Sharding: los datos se distribuyen entre múltiples nodos |
| **Alto rendimiento** | Almacenamiento en BSON, más eficiente que JSON de texto |
| **Desarrollo ágil** | Drivers para JavaScript, Python, Java, Node.js y otros |

---

## BSON

MongoDB almacena los datos internamente en **BSON** (Binary JSON):

- **Más rápido de procesar** que JSON puro (formato binario).
- **Mejor almacenamiento** que JSON de texto.
- **Más tipos de datos** que JSON estándar: incluye Integer (32/64-bit), Double, Decimal128, Date, ObjectId, etc.

---

## Terminología: MongoDB vs SQL

| MongoDB | SQL equivalente |
|---------|----------------|
| Base de datos | Base de datos |
| **Colección** | Tabla |
| **Documento** | Fila / registro |
| **Clave (campo)** | Columna |
| **`_id`** | Clave primaria (PK) |
| Índice | Índice |

---

## Tipos de datos en MongoDB

| Tipo | Descripción | Ejemplo en mongosh |
|------|-------------|-------------------|
| **String** | Cadena de texto UTF-8 | `"nombre": "Juan"` |
| **Integer 32-bit** | Entero: −2,147,483,648 a 2,147,483,647 | `"edad": 30` |
| **Integer 64-bit** | Entero: ±9,223,372,036,854,775,807 | `"visitas": NumberLong(9999999999)` |
| **Double** | Flotante de 64 bits, ~15 dígitos de precisión | `"sueldo": 1250.75` |
| **Decimal128** | Hasta 34 dígitos de precisión | `"precio": NumberDecimal("1234.5678901234567890")` |
| **Boolean** | Verdadero o falso | `"activo": true` |
| **Null** | Valor nulo | `"segundoNombre": null` |
| **Array** | Lista ordenada de valores | `"hobbies": ["leer","viajar","cocinar"]` |
| **Date** | Fecha y hora en ISO 8601 | `new Date("1995-12-17T03:24:00Z")` |
| **ObjectId** | Identificador único de 12 bytes | `ObjectId("64d59...")` |
| **Object** | Documento embebido (subdocumento) | `"contacto": { "email": "a@b.com" }` |

**Trabajar con fechas:**
```javascript
// Fecha actual:
new Date()

// Fecha específica:
new Date("1995-12-17T03:24:00Z")
```

**Operadores de fecha** disponibles en aggregation:

`$year`, `$month`, `$dayOfMonth`, `$dayOfWeek`, `$dayOfYear`, `$week`, `$hour`, `$minute`, `$second`, `$millisecond`, `$isoWeek`, `$isoDayOfWeek`, `$dateToString`, `$dateFromString`, `$dateAdd`, `$dateSubtract`, `$dateDiff`, `$dateTrunc`, `$dateFromParts`

---

## ObjectId

El campo **`_id`** es la clave primaria de cada documento. Si no se especifica, MongoDB genera automáticamente un **ObjectId** de **12 bytes**:

| Bytes | Contenido |
|-------|-----------|
| 4 bytes | Timestamp en segundos desde epoch Unix |
| 5 bytes | Identificador de máquina + PID del proceso |
| 3 bytes | Contador aleatorio incremental |

```javascript
{ "_id": ObjectId("68dec97896a0c6359e5a5851") }
```

Se puede asignar un `_id` propio si se desea:
```javascript
db.coleccion.insertOne({ _id: 1, nombre: "Juan" })
```

---

## Reglas para claves (campos)

- Las claves son **cadenas de texto**.
- No se permiten bytes nulos (`\0`).
- Evitar el punto `.` (se usa para acceso anidado: `"contacto.email"`) y el signo pesos `$` (prefijo de operadores).
- MongoDB es **case-sensitive**: `"Nombre"` y `"nombre"` son campos distintos.
- No se permiten claves duplicadas en un documento (MongoDB conserva el último valor).
- El **orden de los campos BSON importa** para la identidad del documento.

---

## Schema en MongoDB

MongoDB es **schema-less**: documentos de la misma colección pueden tener campos completamente diferentes.

```javascript
db.personas.insertMany([
  { nombre: "Juan", edad: 30 },
  { nombre: "Ana", email: "ana@gmail.com", activo: true },
  { nombre: "Carlos",
    direccion: { ciudad: "Buenos Aires", calle: "Corrientes" },
    telefonos: ["1111-1111", "2222-2222"] }
])
```

Aunque todos pertenecen a `personas`, ninguno tiene los mismos campos.

### Validación con JSON Schema

Se pueden definir reglas de validación al crear la colección:

```javascript
db.createCollection("empleados", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre", "edad"],
      properties: {
        nombre: {
          bsonType: "string",
          description: "Debe ser una cadena y es obligatorio"
        },
        edad: {
          bsonType: "int",
          minimum: 18,
          maximum: 70,
          description: "Debe ser un número entero entre 18 y 70"
        }
      }
    }
  }
})
```

Intentar insertar un documento que no cumpla las reglas genera un error:
```
MongoServerError: Document failed validation
```

---

## Shell mongosh

El servidor MongoDB es `mongod.exe` (escucha en puerto **27017** por defecto).  
El cliente de shell es `mongosh` (o el antiguo `mongo.exe`).

**Conectar al servidor local:**
```
mongosh
```

**Conectar a MongoDB Atlas:**
```
mongosh "mongodb+srv://estudiante:XJFIpIdyxgdSWkUT@cluster0.tjnu3hi.mongodb.net/"
```

### Comandos del shell

| Comando | Descripción |
|---------|-------------|
| `show dbs` | Lista todas las bases de datos (solo las que tienen al menos un documento) |
| `use <nombre>` | Cambia a esa BD (la crea al hacer el primer insert) |
| `db` | Muestra el nombre de la BD actual |
| `show collections` | Lista las colecciones de la BD actual |
| `db.stats()` | Estadísticas de la BD actual |
| `db.getCollectionNames()` | Devuelve array con los nombres de las colecciones |
| `help` | Ayuda general |
| `exit` | Salir del shell |
| `cls` / Ctrl+L / `console.clear()` | Limpiar la pantalla |

---

## Gestión de bases de datos

### Crear base de datos

La creación es **diferida** (lazy): la base de datos no se crea hasta que se inserta el primer documento.

```javascript
use MiBase        // no crea nada todavía
db.coleccion.insertOne({ campo: "valor" })  // ahora se crea MiBase
```

### Eliminar base de datos

```javascript
db.dropDatabase()  // elimina la BD actual, SIN pedir confirmación
```

---

## Gestión de colecciones

### Crear colección explícitamente

```javascript
db.createCollection("nombre")
```

Permite opciones avanzadas como colecciones con límite de tamaño (capped) o con validadores.

### Creación implícita

Si se inserta en una colección que no existe, MongoDB la crea automáticamente:
```javascript
db.nuevaColeccion.insertOne({ campo: "valor" })  // crea nuevaColeccion si no existe
```

### Listar colecciones

```javascript
show collections
db.getCollectionNames()
```

### Eliminar colección

Se puede usar notación de punto o de corchetes:
```javascript
// Notación de punto:
db.nombreColeccion.drop()

// Notación de corchetes (útil cuando el nombre tiene caracteres especiales):
db["nombreColeccion"].drop()
```

`drop()` devuelve `true` si la colección existía y fue eliminada, `false` si no existía.

---

## Documento de ejemplo completo

```javascript
db.personas.insertOne({
  "nombre": "Pedro Gómez",
  "dni": 98765432,
  "fecha_nacimiento": new Date("1990-07-12T00:00:00Z"),
  "activo": true,
  "saldo": NumberDecimal("2500.50"),
  "direccion": { "calle": "Avenida Siempre Viva", "numero": 742 },
  "documentos": ["DNI", "Licencia"],
  "fecha_registro": new Date()
})
```

Respuesta exitosa:
```javascript
{
  acknowledged: true,
  insertedId: ObjectId('68271b9672d39abb55bc785a')
}
```

- **`acknowledged: true`**: la operación fue reconocida y procesada por el servidor.
- **`insertedId`**: el `_id` asignado automáticamente al nuevo documento.
