---
layout: default
title: MongoDB Compass
parent: Unidad 4
nav_order: 6
permalink: /unidad-4/guias/mongodb-compass/
---

[← Unidad 4](../)

# MongoDB Compass

Guía de uso de la interfaz gráfica oficial de MongoDB.

---

## ¿Qué es MongoDB Compass?

**MongoDB Compass** es la GUI (Graphical User Interface) oficial de MongoDB. Es gratuito, de código abierto, y disponible para macOS, Windows y Linux.

Permite consultar, agregar, analizar y gestionar datos en un entorno visual sin necesidad de escribir comandos en el shell.

**Funciones principales:**
- Conectar a instancias locales o remotas (Atlas).
- Crear y eliminar bases de datos y colecciones.
- Insertar, importar, modificar y eliminar documentos.
- Filtrar documentos con la sintaxis de `find()`.
- Construir pipelines de agregación visualmente.
- Gestionar índices.
- Ver el plan de ejecución (Explain).
- MongoDB Assistant: IA integrada para generar consultas.

---

## Conexión

### Conectar a instancia local

Al abrir Compass, conectar con la URI por defecto:
```
mongodb://localhost:27017
```

### Conectar a MongoDB Atlas

```
mongodb+srv://estudiante:XJFIpIdyxgdSWkUT@cluster0.tjnu3hi.mongodb.net/
```

Pestaña **My Queries** guarda las consultas guardadas.  
Panel lateral izquierdo muestra todas las bases de datos y sus colecciones.

---

## Vistas de datos

Dentro de una colección, el panel de documentos ofrece tres vistas:

| Vista | Descripción |
|-------|-------------|
| **Lista** (≡) | Vista compacta, muestra un documento por línea |
| **JSON** ({}) | Muestra los documentos en formato JSON completo |
| **Tabla** (⊞) | Muestra los documentos como hoja de cálculo; útil para comparar campos |

---

## Crear base de datos y colección

1. Hacer clic en el botón **+** (junto a "Databases") en el panel izquierdo.
2. Completar **Database Name** y **Collection Name**.
3. Hacer clic en **Create Database**.

La base de datos y la colección aparecen inmediatamente en el panel izquierdo.

---

## Insertar documentos

### Insertar un único documento

1. Seleccionar la colección en el panel izquierdo.
2. Hacer clic en **ADD DATA** → **Insert document**.
3. Escribir el documento en formato JSON y hacer clic en **Insert**.

```json
{
  "nombre": "Pedro Gómez",
  "dni": 98765432,
  "activo": true,
  "saldo": { "$numberDecimal": "2500.50" },
  "direccion": { "calle": "Avenida Siempre Viva", "numero": 742 },
  "documentos": ["DNI", "Licencia"]
}
```

También se puede hacer desde el shell integrado en Compass:
```javascript
db.personas.insertOne({
  nombre: "Pedro Gómez",
  dni: 98765432,
  activo: true
})
```

**Respuesta exitosa:**
- `acknowledged: true`: la operación fue reconocida.
- `insertedId: ObjectId('...')`: el `_id` asignado.

### Insertar múltiples documentos

Pegar un array JSON en el cuadro "Insert Document":
```json
[
  { "nombre": "Juan", "edad": 28 },
  { "nombre": "María", "edad": 34 }
]
```

---

## Importar documentos

Compass soporta importación de archivos **JSON** y **CSV**.

### Importar JSON

1. Seleccionar la colección.
2. **ADD DATA** → **Import JSON or CSV file**.
3. Seleccionar el archivo `.json`.
4. Hacer clic en **Import**.

Equivalente en línea de comandos:
```
mongoimport --db=ejemplos --collection=empleados --file=empleado.json --jsonArray
```

### Importar CSV

1. Seleccionar la colección.
2. **ADD DATA** → **Import JSON or CSV file**.
3. Seleccionar el archivo `.csv`.
4. Configurar el delimitador (por defecto: coma).
5. Especificar el tipo de dato para cada columna (String, Int32, Double, etc.).
6. Hacer clic en **Import**.

Equivalente en línea de comandos:
```
mongoimport --db=ejemplos --collection=departamentos --type=csv --headerline --file=dptos.csv
```

---

## Filtrar documentos

La barra de filtros acepta la misma sintaxis que `find()`. Las consultas siempre van entre llaves `{}`.

**Filtros básicos:**
```javascript
{ sexo: "femenino" }                           // campo igual a valor
{ sexo: "femenino", edad: 25 }                 // AND implícito
{ sexo: "masculino", edad: { $gt: 30, $lt: 40 } }  // rango
```

**Filtros con operadores lógicos:**
```javascript
{ $or: [
  { sexo: "masculino", edad: { $gt: 30, $lt: 40 } },
  { sexo: "femenino", edad: { $gt: 30, $lt: 40 } }
]}
```

**Búsqueda por regex (case-insensitive):**
```javascript
{ apellidos: { $regex: "López", $options: "i" } }
```

**Filtro con campo anidado:**
```javascript
{ "cliente.localidad": "Ramos Mejia" }
```

### Opciones adicionales en Compass

Además del filtro, se pueden configurar:
- **Project**: campos a incluir/excluir (`{ _id:0, nombre:1 }`).
- **Sort**: orden de resultados (`{ nombre: 1 }`).
- **Skip**: cantidad de documentos a omitir.
- **Limit**: máximo de documentos a devolver.
- **Collation**: opciones de comparación de texto (locale, strength, etc.).

---

## Modificar documentos

**Con el ícono de lápiz:**
1. Pasar el cursor sobre el documento.
2. Hacer clic en el ícono de **lápiz** (Edit document), o hacer doble clic en el documento.
3. Editar el valor del campo directamente.
4. Hacer clic en **UPDATE**.

En la vista de edición, cada campo muestra su tipo BSON a la derecha (String, Int32, Boolean, Date, etc.).

---

## Eliminar documentos

1. Pasar el cursor sobre el documento.
2. Hacer clic en el ícono de **papelera** (Remove document).
3. El documento queda marcado en rojo con el mensaje "Document flagged for deletion".
4. Hacer clic en **DELETE** para confirmar.

---

## Clonar documentos

1. Hacer clic en el ícono de **clonar** (el segundo ícono después del lápiz).
2. Compass abre el cuadro "Insert Document" con los mismos campos y valores del documento original.
3. Modificar los valores que se deseen.
4. Hacer clic en **Insert**.

---

## Aggregation Pipeline (visual)

1. Seleccionar la colección y abrir la pestaña **Aggregations**.
2. Hacer clic en **Add Stage**.
3. Seleccionar la etapa en el menú desplegable: `$match`, `$group`, `$project`, `$lookup`, `$unwind`, `$sort`, `$limit`, etc.
4. Completar los parámetros de la etapa en el editor.
5. El panel derecho muestra un **preview** de los documentos de salida de esa etapa.
6. Agregar más stages con **+ Add Stage**.

**Stages disponibles:**

| Stage | Descripción |
|-------|-------------|
| `$match` | Filtra documentos (equivale a find()) |
| `$group` | Agrupa y calcula acumulaciones |
| `$project` | Selecciona y transforma campos |
| `$lookup` | Une dos colecciones (join) |
| `$unwind` | Descompone arrays en documentos |
| `$sort` | Ordena los resultados |
| `$limit` | Limita la cantidad de resultados |
| `$skip` | Omite los primeros N documentos |
| `$out` | Escribe el resultado en una nueva colección |
| `$replaceRoot` | Reemplaza el documento con un subdocumento |
| `$sample` | Selecciona aleatoriamente N documentos |

**Guardar como vista:**
1. Hacer clic en **Save** → **Create View**.
2. Ingresar el nombre de la vista.
3. Hacer clic en **Create**.

La vista aparece en el panel izquierdo junto a las colecciones (marcada como READ-ONLY).

---

## Gestión de índices

1. Seleccionar la colección y abrir la pestaña **Indexes**.
2. Ver los índices existentes (nombre, campos, tipo, tamaño, uso).

### Crear índice por GUI

1. Hacer clic en **Create Index**.
2. Seleccionar el campo y el tipo (`1 (asc)` o `-1 (desc)`).
3. Opciones:
   - **Create unique index**: garantiza que no haya valores duplicados.
   - **Index name**: nombre personalizado (o dejar en blanco para nombre automático).
   - **Create TTL**: índice especial para expirar documentos automáticamente después de un tiempo.
4. Hacer clic en **Create Index**.

### Crear índice por shell

```javascript
db.cc_info.createIndex({ "city": 1 })
db.cc_info.getIndexes()
db.cc_info.dropIndex("city_indx")
```

---

## Explain Plan

El botón **Explain** muestra métricas de ejecución de una consulta:

- **Documentos devueltos** y **documentos examinados**.
- **Tiempo de ejecución** en milisegundos.
- **COLLSCAN**: la consulta recorrió toda la colección (sin índice).
- **IXSCAN**: la consulta usó un índice.
- **No index available for this query**: advertencia de falta de índice.

Útil para detectar consultas lentas y decidir qué índices crear.

---

## MongoDB Assistant

MongoDB Assistant es una IA integrada en Compass que ayuda a generar consultas y comandos.

Se activa haciendo clic en el botón **MongoDB Assistant** en la barra inferior.

Ejemplo de uso:
- Entrada: "dame la sintaxis de como obtengo los datos de la tabla Empleado que pertenezcan al Departamento Recursos Humanos"
- Respuesta: la consulta `db.Empleado.find({ Departamento: "Recursos Humanos" })` y su versión con proyección.
