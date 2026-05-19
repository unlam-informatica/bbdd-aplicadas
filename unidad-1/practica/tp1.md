---
layout: default
title: Práctica - Repaso de SQL
parent: Unidad 1
nav_order: 3
permalink: /unidad-1/practica/tp1/
---

# Trabajo Práctico 1 — Repaso de SQL

> Todos los ejercicios se resuelven con DML/DDL en SQL Server (recomendado 2019 o 2022).  

> A partir del ejercicio 5, todo INSERT/UPDATE/DELETE debe invocar el SP `insertarLog`.

---

## Ejercicio 1 — Crear la base de datos

Cree una base de datos con los valores por defecto de crecimiento, ubicación de archivos, etc. Llame a la misma con su nombre o el de su grupo.

```sql
CREATE DATABASE unlam;
```

---

## Ejercicio 2 — Crear el esquema `ddbba`

Cree un esquema denominado `ddbba` (por bases de datos aplicada). Todos los objetos creados a partir de aquí deben pertenecer a este esquema (o a otro según corresponda). No debe usar el esquema default `dbo`.

```sql
USE unlam;
CREATE SCHEMA ddbba;
```

---

## Ejercicio 3 — Tabla `registro` (bitácora)

Cree una tabla llamada `registro` con los siguientes campos:

- `id`: entero autoincremental, primary key.
- `fecha_hora`: fecha y hora con default del momento de inserción.
- `texto`: tamaño máximo de 50 caracteres.
- `modulo`: tamaño máximo de 10 caracteres.

Esta tabla funcionará como bitácora de operaciones.

```sql
CREATE TABLE ddbba.registro(
    id          INT      IDENTITY(1,1) PRIMARY KEY,
    fecha_hora  DATETIME DEFAULT GETDATE(),
    texto       VARCHAR(50),
    modulo      VARCHAR(10) 
)
```

---

## Ejercicio 4 — SP `insertarLog`

Cree un stored procedure llamado `insertarLog` que reciba los parámetros `@modulo` y `@texto`. Si `@modulo` llega vacío, usar `'N/A'`. Inserta un registro en la tabla de bitácora.

> A partir de este ejercicio, todo INSERT/UPDATE/DELETE debe invocar este SP. No se permiten INSERTs directos a la bitácora.

```sql
CREATE PROCEDURE ddbba.insertarLog
    @texto  VARCHAR(50),
    @modulo VARCHAR(10)
AS
BEGIN
    DECLARE @mod VARCHAR(10) = NULL
    SET @mod = COALESCE(@modulo, 'N/A')
-- Una sola sentencia: no necesita BEGIN/END
    IF @modulo IS NULL OR @modulo = ''
        SET @modulo = 'N/A'

    INSERT INTO ddbba.registro (
        texto,
        modulo
    ) VALUES(
        @texto,
        @mod
    )
END 
```

---

## Ejercicio 5 — Modelo Persona / Curso / Materia

Modele la relación entre Persona, Curso y Materia:

- Una materia tiene varios cursos (comisiones).
- Un curso tiene varias personas.
- Una persona puede ser alumno o docente en cada materia, pero **no ambos al mismo tiempo en la misma materia**. Puede ser docente en una materia y alumno en otra.

**Requisitos de diseño:**

- a. PK en cada tabla.
- b. FK para vincular las tablas entre sí.
- c. Las personas pueden tener opcionalmente un vehículo. Incluir patente como campo opcional con CHECK correspondiente.
- d. Los cursos/comisiones tienen un número de comisión de 4 dígitos.
- e. Las personas tienen: DNI, teléfono, localidad, fecha de nacimiento, nombre y apellido (por separado).
- f. Materias con ID autoincremental como PK (generado por el DBMS).
- g. Documentar con comentarios las decisiones de diseño.

```sql

```

---

## Ejercicio 6 — Pruebas de restricciones

Verifique que las restricciones funcionen correctamente. Genere juegos de prueba con valores no admitidos. Documente con un comentario el error de validación esperado en cada caso. Probar al menos una vez cada restricción.

```sql

```

---

## Ejercicio 7 — SP generador de alumnos aleatorios

Cree un stored procedure para generar registros aleatorios de alumnos:

- Genere una tabla de nombres con valores de nombres y apellidos que puedan combinarse aleatoriamente.
- Al generar cada alumno: tome al azar 2 valores de nombre y 1 de apellido.
- Genere aleatoriamente: localidad, fecha de nacimiento, DNI.
- El SP debe recibir un parámetro con la cantidad a generar.

```sql

```

---

## Ejercicio 8 — Generar 1000 alumnos

Utilizando el SP del ejercicio anterior, genere 1000 registros de alumnos.

```sql

```

---

## Ejercicio 9 — Eliminar duplicados con CTE

Elimine los registros duplicados utilizando Common Table Expressions (CTE).

```sql

```

---

## Ejercicio 10 — SP generador de comisiones

Cree un stored procedure para generar registros aleatorios de comisiones por materia. Cada materia debe tener entre 1 y 5 comisiones, entre los distintos turnos.

```sql

```

---

## Ejercicio 11 — SP de inscripciones

Genere un stored procedure para crear inscripciones a materias, asignando alumnos a comisiones.

```sql

```

---

## Ejercicio 12 — Vista con SCHEMABINDING

Cree una vista con `SCHEMABINDING` para visualizar comisiones con:

- Número de comisión.
- Código de materia.
- Nombre de materia.
- Apellido y nombre de los alumnos en formato `"Apellido, Nombres"`.

```sql

```

Responda las siguientes preguntas (con pruebas incluidas):

**a.** ¿Qué ocurre si intenta modificar el tamaño de un campo de texto de la tabla de alumnos?

```sql
-- Prueba a:
```

**b.** ¿Qué ocurre si intenta agregar un campo a la tabla de alumnos?

```sql
-- Prueba b:
```

**c.** ¿Qué ocurre si intenta agregar un campo que admita NULLs? ¿Hay diferencia si la tabla está vacía o tiene registros?

```sql
-- Prueba c:
```

**d.** ¿Puede usar SCHEMABINDING con `SELECT * FROM ...`?

```sql
-- Prueba d:
```

---

## Ejercicio 13 — Agregar día y turno a comisión

Agregue a la tabla de comisión soporte para día y turno de cursada. Los números de comisión son únicos por cuatrimestre.

```sql

```

---

## Ejercicio 14 — Completar día y turno con valores aleatorios

Complete los datos de día y turno con valores aleatorios.

```sql

```

---

## Ejercicio 15 — Función `validaCursada`

Genere una función `validaCursada` que devuelva la cantidad de materias superpuestas a las que está inscripto un alumno, recibiendo el DNI por parámetro.

```sql

```

---

## Ejercicio 16 — Vista con alumnos con superposición

Cree una vista que utilice la función del ejercicio anterior y muestre los alumnos con superposición de inscripciones.

```sql

```

---

## Ejercicio 17 — SP para eliminar inscripciones superpuestas

Cree un stored procedure que elimine las inscripciones superpuestas o duplicadas.

```sql

```

---

## Ejercicio 18 — Vista PIVOT por materia y turno

Cree una vista PIVOT de cantidad de inscripciones por materia para cada turno. Use su criterio para la presentación.

```sql

```

---

## Ejercicio 19 — Window Functions: inscripciones por cuatrimestre

Usando Window Functions, cree una vista que muestre los alumnos inscriptos a una materia y, en una columna adicional, la cantidad total de materias en las que ese alumno se inscribió en el mismo cuatrimestre.

```sql

```

---

## Ejercicio 20 — Window Functions: 5% más joven y menos joven

Usando Window Functions, presente el 5% más joven y el 5% menos joven del alumnado.

```sql

```