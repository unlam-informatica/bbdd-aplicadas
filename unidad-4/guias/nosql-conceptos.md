---
layout: default
title: NoSQL — Conceptos y modelos
parent: Unidad 4
nav_order: 2
permalink: /unidad-4/guias/nosql-conceptos/
---

[← Unidad 4](../)

# NoSQL — Conceptos y modelos

Referencia rápida sobre qué es NoSQL, por qué existe, y los cuatro modelos de almacenamiento.

---

## ¿Qué es NoSQL?

**NoSQL** ("Not only SQL") es una categoría de bases de datos diseñadas para casos de uso donde el modelo relacional resulta insuficiente o costoso: volúmenes masivos de datos, alta concurrencia, baja latencia, o datos sin esquema fijo.

El término fue acuñado en 1998 por Carlo Strozzi. Su significado actual reconoce que SQL puede coexistir con otros modelos de acceso.

### Limitaciones del modelo relacional

- **Escala vertical costosa**: más CPU y RAM para un solo servidor tiene un techo y un precio muy alto.
- **Esquema rígido**: agregar o cambiar columnas en tablas con miles de millones de filas es una operación lenta y disruptiva.
- **Latencia**: los joins entre múltiples tablas grandes pueden ser lentos para aplicaciones de tiempo real.
- **Alta disponibilidad**: los RDBMS tradicionales complican la replicación y el failover automático.

---

## Tipos de datos que maneja NoSQL

| Tipo | Descripción | Ejemplos |
|------|-------------|---------|
| **Estructurados** | Esquema fijo, tipos definidos | Enteros, cadenas, fechas; tablas SQL |
| **Semi-estructurados** | Estructura flexible, autodescriptivos | JSON, XML, imágenes con metadatos EXIF |
| **No estructurados** | Sin estructura formal | Video, audio, publicaciones en redes sociales, videovigilancia |

Los datos no estructurados requieren herramientas adicionales para ser procesados:
- **OCR** (Optical Character Recognition): extrae texto de imágenes o documentos escaneados.
- **NLP** (Natural Language Processing): analiza texto en lenguaje natural.

---

## ACID vs BASE

### ACID (bases de datos relacionales)

| Propiedad | Descripción |
|-----------|-------------|
| **A**tomicidad | La transacción entera tiene éxito o falla por completo |
| **C**onsistencia | Los datos siempre pasan de un estado válido a otro |
| **I**solamiento | Las transacciones concurrentes no se interfieren |
| **D**urabilidad | Los cambios confirmados persisten ante fallos |

### BASE (bases de datos NoSQL)

| Sigla | Descripción |
|-------|-------------|
| **BA** | Basically Available — disponibilidad básica siempre garantizada |
| **S** | Soft State — el estado puede cambiar con el tiempo sin intervención del usuario |
| **E** | Eventually Consistent — la consistencia se alcanza eventualmente, no de forma inmediata |

BASE prioriza disponibilidad y rendimiento sobre la consistencia inmediata.

---

## Teorema CAP

Formulado por Eric Brewer (2000): un sistema distribuido **solo puede garantizar 2 de estas 3 propiedades** simultáneamente.

| Propiedad | Descripción |
|-----------|-------------|
| **C**onsistency | Todos los nodos ven los mismos datos al mismo tiempo |
| **A**vailability | El sistema siempre responde a las solicitudes |
| **P**artition tolerance | El sistema sigue funcionando aunque la red entre nodos falle |

### Combinaciones posibles

| Combinación | Sacrificio | Ejemplos |
|-------------|-----------|---------|
| **CA** | No tolera particiones de red | RDBMS (SQL Server, MySQL, PostgreSQL) |
| **CP** | Puede no responder durante una partición | MongoDB, HBase, Redis |
| **AP** | Puede devolver datos desactualizados | CouchDB, Cassandra, DynamoDB, Riak |

**MongoDB es CP**: un único nodo primario recibe todas las escrituras. Si hay una partición de red, el sistema puede dejar de responder momentáneamente para mantener la consistencia.

Cada modelo NoSQL usa un almacenamiento **optimizado para sus requisitos específicos**; no existe un modelo único que se adapte a todos los casos de uso.

---

## Arquitectura de clúster

| Tipo | Descripción | Modelo de costo |
|------|-------------|-----------------|
| **Clúster en la nube** | Servidores gestionados por un proveedor (AWS, GCP, Azure, MongoDB Atlas) | Opex — pago por uso, sin inversión inicial |
| **Clúster de servidores dedicados** | Hardware propio en datacenter | Capex — inversión inicial alta, menor costo a largo plazo |

---

## Los cuatro modelos NoSQL

### 1. Clave-Valor

La estructura más simple: cada elemento es un par `{clave: valor}`. El motor no interpreta el contenido del valor (es opaco).

**Características:**
- Lecturas y escrituras muy rápidas (O(1) con la clave).
- Ideal para caché y sesiones.
- No permite consultar por el contenido del valor.

**Casos de uso:** sesiones web, caché de aplicación, configuración distribuida, tablas de símbolos.

**Ejemplos de bases de datos:** Redis, DynamoDB, Aerospike.

```
key         value
123         Address@23
126         "Booya"
```

---

### 2. Documentos

Almacena documentos (generalmente JSON o BSON). Cada documento es autodescriptivo y puede tener una estructura diferente al resto de la colección.

**Características:**
- No requiere esquema fijo.
- Admite documentos embebidos y arrays.
- Soporta consultas sobre cualquier campo del documento.
- Escalabilidad horizontal mediante sharding.

**Casos de uso:** catálogos de productos, gestión de contenido, perfiles de usuario, sistemas de e-commerce.

**Ejemplos de bases de datos:** MongoDB, CouchDB, Firebase.

```json
{
  "usuario": "perez_juan",
  "nombre_completo": "Juan Pérez",
  "edad": 34,
  "activo": true,
  "hobbies": ["lectura", "senderismo"],
  "contacto": {
    "email": "juan@email.com",
    "telefono": "+5491112345678"
  }
}
```

---

### 3. Grafos

Almacena **vértices** (entidades) y **aristas** (relaciones), ambos con propiedades. Optimizado para consultas que atraviesan múltiples relaciones.

**Características:**
- Consultas de relaciones complejas son muy eficientes.
- Pensar en grafos en lugar de tablas y joins.
- Las aristas tienen dirección y pueden tener propiedades.

**Casos de uso:** redes sociales, detección de fraudes, motores de recomendaciones, organigramas, gestión de dependencias.

**Ejemplos de bases de datos:** JanusGraph (lenguaje Gremlin), Neo4j.

**Ejemplo de consulta Gremlin** (encontrar el abuelo de Hércules):
```
g.V().has('name', 'hercules').out('father').out('father').values('name')
→ saturn
```

Donde:
- `g` = recorrido del grafo actual.
- `V()` = todos los vértices.
- `has('name','hercules')` = filtra el vértice con ese nombre.
- `out('father')` = atraviesa el borde "padre" saliente.
- `values('name')` = obtiene el valor del campo nombre.

---

### 4. Columnas / Familias de columnas

Una **columna** es una unidad básica (nombre + valor). Un conjunto de columnas forma una **fila**. Las columnas pueden agruparse en **familias de columnas**.

**Diferencia clave con el modelo relacional:** las filas pueden tener diferentes columnas. Soporta millones de columnas por tabla.

**Características:**
- Escrituras muy rápidas.
- Baja latencia en acceso a un subconjunto de campos dentro de un registro grande.
- Escalable a gran escala.
- Acceso a celdas individuales con `GET` y `PUT`; múltiples filas con `SCAN`.

**Casos de uso:** análisis de redes sociales, telemetría, datos de sensores, series temporales, análisis web, mensajería.

**Ejemplos de bases de datos:** Apache Cassandra, HBase.

**Ejemplo de consulta CQL (Cassandra):**
```sql
SELECT name, occupation FROM users WHERE userid IN (199, 200, 207);
SELECT time, value FROM events
WHERE event_type = 'myEvent'
  AND time > '2011-02-03' AND time <= '2012-01-01';
```

---

## Resumen comparativo de los modelos

| Modelo | Estructura | Mejor para | Ejemplos |
|--------|-----------|-----------|---------|
| **Clave-Valor** | par clave:valor | Caché, sesiones | Redis, DynamoDB |
| **Documentos** | JSON/BSON autodescriptivos | Contenido flexible, perfiles | MongoDB, CouchDB |
| **Grafos** | Vértices y aristas | Relaciones complejas | Neo4j, JanusGraph |
| **Columnas** | Familias de columnas | Series temporales, analítica | Cassandra, HBase |
