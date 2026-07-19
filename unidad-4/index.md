---
layout: default
title: Unidad 4
nav_order: 5
has_children: true
---

## BD No Transaccionales (NoSQL) · 2do parcial

NoSQL, MongoDB, MongoDB Query Language (MQL), Aggregation Pipeline, Índices, Vistas, Data Lakes, KDD.

{: .note }
“No transaccionales” es la denominación curricular de la unidad. No debe interpretarse como “sin transacciones”: MongoDB moderno admite garantías ACID y transacciones multidocumento. El foco está en modelos NoSQL, distribución y consistencia configurable.

**Ruta sugerida:** apunte completo → guías temáticas → ejercicios MongoDB → integrador → guía para el parcial.

### Antes de comenzar

Conviene repasar arquitectura de bases transaccionales, propiedades ACID, control de concurrencia y transacciones. Son el punto de comparación para comprender BASE y CAP.

### Resultados de aprendizaje

Al finalizar la unidad deberías poder:

- identificar cuándo un problema justifica un modelo NoSQL y seleccionar el tipo adecuado;
- modelar documentos BSON y operar MongoDB con MQL, Compass y Aggregation Pipeline;
- medir el efecto de índices y construir vistas de solo lectura;
- integrar datos heterogéneos en un flujo Data Lake/KDD;
- explicar decisiones técnicas, costos, límites e impacto con criterio profesional y responsable;
- resolver y comunicar una solución individualmente o en equipo, incorporando herramientas nuevas de manera autónoma.

## Teoría

| Archivo | Tema |
|---------|------|
| [apunte-completo](./teoria/apunte-completo/) | Apunte completo de la unidad: NoSQL, MongoDB, MQL, Aggregation Pipeline, Data Lakes, KDD |
| [nosql-conceptos](./teoria/nosql-conceptos/) | Qué es NoSQL, por qué existe, los cuatro modelos de almacenamiento |
| [mongodb-introduccion](./teoria/mongodb-introduccion/) | BSON, terminología, tipos de datos, ObjectId, schema, shell, bases y colecciones |
| [mongodb-crud](./teoria/mongodb-crud/) | Operaciones CRUD: inserción, `find()` y sus operadores, actualización y eliminación |
| [mongodb-agregacion](./teoria/mongodb-agregacion/) | Aggregation Pipeline, gestión de índices y creación de vistas |
| [mongodb-compass](./teoria/mongodb-compass/) | Uso de la interfaz gráfica oficial de MongoDB |
| [datos-data-lake-kdd](./teoria/datos-data-lake-kdd/) | Datos estructurados, semiestructurados y no estructurados; Data Lake, OCR, NLP y proceso KDD |
| [instalacion-mongodb](./teoria/instalacion-mongodb/) | Arquitectura `mongod`/`mongosh`, instalación, conexión local y Atlas sin publicar credenciales |
| [guia-parcial](./teoria/guia-parcial/) | Mapa conceptual, comparaciones que suelen evaluarse, preguntas de parcial y autoevaluación |

## Práctica

| Archivo | Tema |
|---------|------|
| [ejercicios](./practica/ejercicios/) | Ejercicios de CRUD, filtrado, proyección, índices, vistas y aggregation pipeline |
| [laboratorio-tienda-online](./practica/laboratorio-tienda-online/) | Laboratorio de tres niveles sobre una BD de tienda online: CRUD, consultas avanzadas, Aggregation Pipeline y API externa |
| [integrador-peliculas](./practica/integrador-peliculas/) | Práctica integradora con Películas y Préstamos: documentos, arrays, fechas, `$lookup`, índices y vistas |
