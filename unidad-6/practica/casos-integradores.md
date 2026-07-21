---
layout: default
title: Casos integradores
parent: Práctica
grand_parent: Unidad 6
nav_order: 3
permalink: /unidad-6/practica/casos-integradores/
---

[← Unidad 6](../../)

# Casos integradores — Calidad, privacidad y gobierno

Usá siempre esta plantilla:

1. datos, sensibilidad y actores;
2. finalidad, jurisdicción y base;
3. principios legales comprometidos;
4. características ISO afectadas;
5. regla, fórmula, población, frecuencia y umbral;
6. controles preventivos, detectivos y correctivos;
7. owner, evidencia, derechos y retención.

## Caso 1 — Universidad

Una universidad publica un CSV con nombre, DNI, nota y condición académica. Algunos DNI pertenecen a otros estudiantes y las notas se actualizaron solo en el sistema interno.

### Resolución orientativa

- Son datos personales; la publicación requiere finalidad y habilitación, minimización y seguridad.
- Fallan exactitud, consistencia entre fuentes, actualidad, confidencialidad y conformidad.
- Se retira o restringe el archivo, se evalúa exposición, se corrige contra actas autorizadas y se propaga.
- Métrica: calificaciones coincidentes entre acta y publicación / calificaciones contrastadas × 100; por criticidad, umbral 100 % antes de publicar.
- Prevención: publicación mediante identificador no directamente identificante si procede, doble validación, generación desde fuente oficial y aprobación.

## Caso 2 — Banco y score

Un banco rechaza automáticamente créditos por un domicilio desactualizado comprado a un tercero. No puede explicar qué versión del modelo produjo la decisión.

### Resolución orientativa

- Domicilio y perfil crediticio son personales; se revisan fuente, transparencia, habilitación, cesión y derecho de rectificación.
- ISO: actualidad, exactitud, credibilidad, trazabilidad, comprensibilidad y conformidad.
- Métricas: domicilios verificados dentro de ventana / evaluados; decisiones con versión, entradas y explicación registradas / decisiones automatizadas.
- Controles: fuente autorizada, fecha y procedencia, revisión humana aplicable, versionado del modelo, impugnación y propagación de correcciones.

## Caso 3 — IoT deportivo

Una pulsera registra pulso y ubicación cada segundo aunque la función contratada solo cuenta pasos. Los datos se conservan cinco años y se venden agregados, pero grupos muy pequeños permiten identificar usuarios.

### Resolución orientativa

- Pulso es salud y ubicación es personal; la granularidad parece excesiva para la finalidad.
- Agregar no garantiza anonimato: tamaño de grupo, rareza y datos auxiliares pueden reidentificar.
- Fallan minimización, finalidad, conservación, confidencialidad y conformidad; precisión innecesaria aumenta riesgo y costo.
- Rediseño: frecuencia mínima, función opcional separada, procesamiento local, umbral de anonimato probado, retención corta y prohibición contractual de reidentificación.

## Caso 4 — Migración

Después de migrar de SQL Server a un lago, las fechas perdieron zona horaria, los decimales se redondearon y no existe mapa entre columnas antiguas y nuevas. El nuevo entorno tiene alta disponibilidad.

### Resolución orientativa

- Alta disponibilidad no compensa portabilidad deficiente.
- Fallan portabilidad, precisión, exactitud, trazabilidad, comprensibilidad y consistencia.
- Controles: contrato de esquema, catálogo de unidades/zonas, reconciliación por totales y muestras, linaje, pruebas de ida/vuelta y criterios de aceptación antes del corte.

## Caso 5 — Backup restaurado

Una empresa recibe una supresión válida, la ejecuta en producción y seis meses después restaura un backup antiguo para investigar otra falla. El dato reaparece y vuelve a alimentar marketing.

### Resolución orientativa

- El backup puede conservarse por continuidad según política, pero no debe reactivar usos incompatibles.
- Se necesita registro mínimo de supresiones separado y protegido, procedimiento post-restore, bloqueo de campañas hasta reconciliar y vencimiento de copias.
- ISO: recuperabilidad se logró parcialmente, pero fallaron conformidad, actualidad y consistencia entre estado jurídico y restaurado.

## Actividad final

Elegí dos casos y escribí una respuesta de máximo una carilla por caso. Cada afirmación debe identificar norma/principio o característica concreta. No alcanza con decir “hay que mejorar seguridad” o “los datos tienen mala calidad”.
