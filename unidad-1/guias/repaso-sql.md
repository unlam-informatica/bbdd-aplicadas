---
layout: default
title: Repaso de SQL
parent: Teoría
grand_parent: Unidad 1
nav_order: 2
permalink: /unidad-1/teoria/repaso-sql/
---

- [Modelo de datos y abstracción](#modelo-de-datos-y-abstracción)
- [Tipos de datos](#tipos-de-datos)
- [Catálogos y schemas](#catálogos-y-schemas)
- [DDL y DML](#ddl-y-dml)
- [Integridad referencial, PK y FK](#integridad-referencial-pk-y-fk)
- [Restricciones (constraints)](#restricciones-constraints)
- [NULL](#null)
- [Consultas básicas](#consultas-básicas)
- [JOINs y UNIONs](#joins-y-unions)
- [Funciones de agregado](#funciones-de-agregado)
- [Vistas](#vistas)
- [Procedimientos almacenados](#procedimientos-almacenados)
- [Triggers](#triggers)
- [Funciones de usuario](#funciones-de-usuario)
- [Resumen de objetos de una BD](#resumen-de-objetos-de-una-bd)

# Repaso de SQL

## Modelo de datos y abstracción

La **abstracción de datos** oculta los detalles físicos de almacenamiento y expone solo las características esenciales para comprender y trabajar con los datos.

Un **modelo de datos** es una colección de conceptos que describen la *estructura* de una base de datos: tipos de datos, relaciones entre entidades y restricciones que aplican sobre ellos.

### Tipos de restricciones (constraints)

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Implícitas** | Impuestas por el tipo de dato | Un campo `int` solo acepta números enteros |
| **Explícitas** | Definidas en el esquema (PK, FK, CHECK…) | "El cliente referenciado debe existir" |
| **Semánticas** | Reglas de negocio manejadas en la aplicación | "Descuento del 70% no válido en ciertos proveedores" |

> Las restricciones **implícitas y explícitas** las hace cumplir el RDBMS. Las **semánticas** quedan a cargo de la lógica de la aplicación.

## Tipos de datos

Los tipos básicos son estándar ANSI; cada RDBMS puede agregar los propios.

| Tipo de dato   |              Tamaño |                 Valor mínimo |                Valor máximo | Uso típico                                   |
| -------------- | ------------------: | ---------------------------: | --------------------------: | -------------------------------------------- |
| `BIT`          |        1 bit aprox. |                          `0` |                         `1` | Valores booleanos: activo/inactivo, sí/no    |
| `TINYINT`      |              1 byte |                          `0` |                       `255` | Estados, edades, cantidades muy chicas       |
| `SMALLINT`     |             2 bytes |                    `-32.768` |                    `32.767` | Cantidades chicas                            |
| `INT`          |             4 bytes |             `-2.147.483.648` |             `2.147.483.647` | IDs, contadores, cantidades generales        |
| `BIGINT`       |             8 bytes | `-9.223.372.036.854.775.808` | `9.223.372.036.854.775.807` | IDs enormes, tablas con muchísimos registros |
| `DECIMAL(p,s)` |        5 a 17 bytes |               Depende de `p` |              Depende de `p` | Importes, porcentajes, valores exactos       |
| `NUMERIC(p,s)` |        5 a 17 bytes |               Depende de `p` |              Depende de `p` | Igual que `DECIMAL`                          |
| `SMALLMONEY`   |             4 bytes |              `-214.748,3648` |              `214.748,3647` | Dinero, aunque suele preferirse `DECIMAL`    |
| `MONEY`        |             8 bytes |  `-922.337.203.685.477,5808` |  `922.337.203.685.477,5807` | Dinero, aunque suele preferirse `DECIMAL`    |
| `REAL`         |             4 bytes |           aprox. `-3.40E+38` |           aprox. `3.40E+38` | Números aproximados                          |
| `FLOAT`        | 8 bytes por defecto |          aprox. `-1.79E+308` |          aprox. `1.79E+308` | Cálculos científicos o aproximados           |

> Preferir `varchar` sobre `char` cuando la longitud varía mucho. Usar `nvarchar` cuando el sistema debe manejar caracteres de múltiples idiomas.

## Catálogos y schemas

En SQL Server, el concepto de **catálogo** se corresponde con una **base de datos**.

```text
Catálogo ≈ Database
Schema   ≈ Esquema dentro de una base de datos
Tabla    ≈ Objeto dentro de un schema
```

![db-organization](../images/db-organization.png)

### Crear una base de datos

```sql
CREATE DATABASE unlam;
USE unlam;
```

La cláusula `COLLATE` define las reglas de comparación y orden de texto (mayúsculas/minúsculas, acentos, etc.). Ver la [guía de Collation](/unidad-2/guias/collation/) para el detalle completo.

```sql
CREATE DATABASE unlam
COLLATE Latin1_General_CI_AS;
-- CI = Case Insensitive, AS = Accent Sensitive
```

### Crear un schema

```sql
CREATE SCHEMA bbdda;
```

### Crear tablas dentro del schema

```sql
CREATE TABLE bbdda.alumno (
    id_alumno INT IDENTITY(1,1) PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    apellido  VARCHAR(100) NOT NULL,
    email     VARCHAR(150) NULL
);

CREATE TABLE bbdda.materia (
    id_materia INT IDENTITY(1,1) PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    codigo     VARCHAR(20)  NOT NULL
);

CREATE TABLE bbdda.inscripcion (
    id_inscripcion INT IDENTITY(1,1) PRIMARY KEY,
    id_alumno      INT NOT NULL,
    id_materia     INT NOT NULL,
    fecha_inscripcion DATE NOT NULL,

    CONSTRAINT FK_inscripcion_alumno
        FOREIGN KEY (id_alumno) REFERENCES bbdda.alumno(id_alumno),

    CONSTRAINT FK_inscripcion_materia
        FOREIGN KEY (id_materia) REFERENCES bbdda.materia(id_materia)
);
```

### Referenciar tablas con schema

```sql
SELECT * FROM bbdda.alumno;
```

| Concepto | En SQL Server | Para qué sirve                    |
| -------- | ------------- | --------------------------------- |
| Catálogo | Base de datos | Contenedor principal de datos     |
| Schema   | Esquema       | Agrupa objetos dentro de una base |
| Tabla    | Tabla         | Guarda registros                  |
| Columna  | Campo         | Define un dato de cada registro   |

---

## DDL y DML

### DDL — Data Definition Language

Define y modifica la **estructura** de la base de datos.

| Sentencia | Propósito |
|-----------|-----------|
| `CREATE`  | Crear DB, tabla, vista, índice, SP, trigger… |
| `DROP`    | Eliminar un objeto |
| `ALTER`   | Modificar la definición de un objeto |
| `TRUNCATE`| Vaciar el contenido de una tabla (conserva la estructura) |

### DML — Data Manipulation Language

Opera sobre los **datos** dentro de las estructuras.

| Sentencia | Propósito |
|-----------|-----------|
| `INSERT`  | Insertar filas |
| `UPDATE`  | Modificar filas existentes |
| `DELETE`  | Eliminar filas |
| `MERGE`   | Insertar / actualizar / borrar según la coincidencia con una fuente |

> Los motores modernos no distinguen estrictamente entre DDL, DML, DQL (consultas), DCL (control de acceso) y TCL (transacciones): todos son sentencias SQL de primera clase.

---

## Integridad referencial, PK y FK

### Integridad referencial

Mecanismo por el que el RDBMS garantiza que un valor que aparece en una tabla como referencia a otra **exista efectivamente** en la tabla referenciada.

### Clave primaria (PK)

- Conjunto **mínimo** de atributos que identifican de forma unívoca cada fila.
- Implícitamente `NOT NULL` y `UNIQUE`.
- Define el **índice clúster** por defecto (orden físico de almacenamiento).
- Buenas prácticas: usar valores **crecientes** (p. ej. `IDENTITY`) y **no modificables**.

```sql
-- Forma corta
CREATE TABLE ddbba.alumno (
    DNI      INT PRIMARY KEY,
    Apellido CHAR(50)
);

-- Forma explícita (permite dar nombre al constraint)
CREATE TABLE ddbba.alumno (
    DNI      INT,
    Apellido CHAR(50),
    CONSTRAINT pk_alumno PRIMARY KEY CLUSTERED (DNI)
);
```

> Solo puede haber **un único índice clustered por tabla**, porque define el orden físico de almacenamiento. Si se necesita el clustered en una columna distinta a la PK, se declara la PK como `NONCLUSTERED`.

```sql
CREATE TABLE movimientos (
    ID     INT      CONSTRAINT pk_mov PRIMARY KEY NONCLUSTERED,
    fecha  DATETIME,
    monto  DECIMAL(10,2),
    INDEX ix_fecha CLUSTERED (fecha)  -- el orden físico lo dicta la fecha
);
```

| Tipo | Cantidad permitida | Almacenamiento |
|------|-------------------|----------------|
| `CLUSTERED`    | **1 por tabla** | Los datos de la tabla **son** el índice |
| `NONCLUSTERED` | Hasta 999       | Estructura separada que apunta a los datos |

### Clave foránea (FK)

- Referencia a la PK de otra tabla, estableciendo la relación entre ambas.
- Genera una restricción implícita: no se puede insertar un valor que no exista en la tabla referenciada.
- **No** crea índices automáticamente → conviene crearlos manualmente.
- Admite acciones en cascada: `ON UPDATE CASCADE` / `ON DELETE CASCADE`.

```sql
-- FK de un solo campo en línea
CREATE TABLE bbdda.comision (
    id_comision INT IDENTITY(1,1) PRIMARY KEY,
    id_materia  INT NOT NULL REFERENCES bbdda.materia(id_materia)
);

-- FK compuesta con nombre y acción en cascada
CREATE TABLE bbdda.examen (
    id_examen INT IDENTITY(1,1) PRIMARY KEY,
    dni       INT NOT NULL,
    id_curso  INT NOT NULL,
    nota      TINYINT NOT NULL,

    CONSTRAINT FK_examen_curso
        FOREIGN KEY (id_curso, dni)
        REFERENCES bbdda.curso(id_curso, dni)
        ON DELETE CASCADE
);
```

> Las columnas de FK deben tener **el mismo tipo de dato** que las columnas referenciadas.

---

## Restricciones (constraints)

| Constraint | Efecto |
|------------|--------|
| `UNIQUE`   | Prohíbe duplicados (a diferencia de PK, admite un solo `NULL`) |
| `CHECK`    | Valida que el valor cumpla una condición |
| `NOT NULL` | Prohíbe valores nulos |
| `DEFAULT`  | Asigna un valor por defecto si no se indica ninguno |

```sql
CREATE TABLE bbdda.alumno (
    dni     INT CHECK (dni > 0),
    nombre  CHAR(20) UNIQUE,
    patente CHAR(7),

    CONSTRAINT ck_alumno_patente CHECK (
        patente LIKE '[A-Z][A-Z][0-9][0-9][0-9][A-Z][A-Z]'  -- Mercosur
        OR patente LIKE '[A-Z][A-Z][A-Z][0-9][0-9][0-9]'    -- formato antiguo
    )
);
```

> Las restricciones nombradas con `CONSTRAINT` se identifican en el catálogo y facilitan su posterior eliminación o modificación.

---

## NULL

`NULL` representa un valor **ausente, desconocido o no aplicable**.

| Comportamiento | Detalle |
|----------------|---------|
| `NULL = NULL` | Siempre es **FALSE** |
| Comparación | Usar `IS NULL` / `IS NOT NULL` |
| Reemplazo | `ISNULL(valor, 0)` o `COALESCE(valor, 0)` |
| `COUNT(columna)` | **No** cuenta NULLs — sí los cuenta `COUNT(*)` |
| `AVG(columna)` | **Ignora** los NULLs al calcular el promedio |
| Concatenación | `'Hola' + NULL` → `NULL` |
| JOIN | Las filas con NULL en el campo de unión **no aparecen** en un INNER JOIN |

### ISNULL vs COALESCE

| | `ISNULL` | `COALESCE` |
|---|---|---|
| Estándar | SQL Server / Sybase | **ANSI SQL** |
| Parámetros | Exactamente 2 | 2 o más |
| Tipo de retorno | El tipo del **primer** parámetro | El tipo de **mayor precedencia** |

```sql
-- ISNULL: un solo fallback; trunca al tipo del primer argumento
SELECT ISNULL(telefono, 'Sin teléfono')

-- COALESCE: varios fallbacks encadenados
SELECT COALESCE(telefono_celular, telefono_fijo, telefono_trabajo, 'Sin teléfono')
```

```sql
DECLARE @valor CHAR(3) = NULL;

SELECT ISNULL(@valor, 'valor por defecto')   -- devuelve 'val'  ← trunca a char(3)
SELECT COALESCE(@valor, 'valor por defecto') -- devuelve 'valor por defecto'
```

> Preferir `COALESCE` por ser estándar y más predecible en cuanto a tipos.

---

## Consultas básicas

```sql
SELECT campo1, campo2
FROM   esquema.tabla
WHERE  condicion
ORDER BY campo1 ASC
```

**Orden de evaluación conceptual:**

```
FROM → (JOIN) → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
```

### Subconsultas

```sql
-- En WHERE
SELECT campo1
FROM   esquema.tabla1
WHERE  campo2 IN (
    SELECT campoX FROM esquema.tabla2 WHERE campoY IS NULL
);

-- En FROM (tabla derivada)
SELECT t.nombre, t.total
FROM (
    SELECT nombre, SUM(monto) AS total
    FROM   ventas
    GROUP BY nombre
) AS t
WHERE t.total > 1000;
```

---

## JOINs y UNIONs

![join-types](../images/joins.png)

```sql
-- INNER JOIN: solo filas que coinciden en ambas tablas
SELECT e.nombre, d.nombre AS departamento
FROM   empleados e
INNER JOIN departamentos d ON e.id_depto = d.id;

-- LEFT JOIN: todos los empleados, aunque no tengan departamento
SELECT e.nombre, d.nombre AS departamento
FROM   empleados e
LEFT JOIN departamentos d ON e.id_depto = d.id;

-- FULL OUTER JOIN: todos los empleados y todos los departamentos
SELECT e.nombre, d.nombre AS departamento
FROM   empleados e
FULL OUTER JOIN departamentos d ON e.id_depto = d.id;
```

### UNION

Combina los resultados de dos consultas. Las columnas deben ser compatibles en tipo y cantidad.

```sql
SELECT nombre FROM clientes
UNION          -- elimina duplicados
SELECT nombre FROM proveedores;

SELECT nombre FROM clientes
UNION ALL      -- mantiene duplicados (más rápido)
SELECT nombre FROM proveedores;
```

---

## Funciones de agregado

Resumen grupos de filas en un único valor por grupo.

| Función | Descripción |
|---------|-------------|
| `COUNT(*)` / `COUNT(col)` | Cantidad de filas / valores no-NULL |
| `SUM(col)` | Suma |
| `AVG(col)` | Promedio (ignora NULLs) |
| `MIN(col)` / `MAX(col)` | Mínimo / máximo |

```sql
SELECT  nombreCatedra,
        COUNT(*)          AS cantidad_comisiones,
        SUM(inscriptos)   AS total_inscriptos,
        AVG(inscriptos)   AS promedio
FROM    ddbba.curso
GROUP BY nombreCatedra
HAVING  SUM(inscriptos) > 90
ORDER BY total_inscriptos DESC;
```

> **`WHERE`** filtra filas **antes** del agrupamiento.  
> **`HAVING`** filtra grupos **después** de las funciones de agregado.  
> Usar `COUNT(DISTINCT campo)` para contar valores únicos.

---

## Vistas

Una vista es una **tabla virtual** cuya definición es una consulta almacenada. No guarda datos propios.

```sql
CREATE OR ALTER VIEW bbdda.cursos_copados
WITH SCHEMABINDING
AS
    SELECT
        nombre_catedra,
        dia_cursada,
        turno,
        SUM(inscriptos) AS total_inscriptos
    FROM bbdda.curso
    WHERE puntuacion > 3
    GROUP BY nombre_catedra, dia_cursada, turno;
```

**Usos frecuentes:**
- Simplificar consultas complejas reutilizables.
- Controlar el acceso: exponer solo ciertas columnas o filas.
- Mantener retrocompatibilidad cuando cambia la estructura de las tablas base.

> Para usar `INSERT`/`UPDATE`/`DELETE` sobre una vista hay restricciones: no puede incluir `GROUP BY`, `DISTINCT`, funciones de agregado, `UNION`, ni más de una tabla base.

---

## Procedimientos almacenados

Rutinas compiladas y almacenadas en el motor. Se ejecutan en el servidor, reduciendo el tráfico de red.

```sql
CREATE OR ALTER PROCEDURE bbdda.inscribir_alumno
    @dni        INT,
    @id_curso   INT,
    @resultado  INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM bbdda.alumno WHERE dni = @dni)
    BEGIN
        INSERT INTO bbdda.inscripcion (dni, id_curso, fecha)
        VALUES (@dni, @id_curso, GETDATE());
        SET @resultado = 1;
    END
    ELSE
        SET @resultado = -1;
END;
GO
```

**Invocación:**

```sql
DECLARE @resultado INT;

EXEC bbdda.inscribir_alumno
    @dni       = 12345678,
    @id_curso  = 10,
    @resultado = @resultado OUTPUT;

SELECT @resultado AS resultado;
```

| Elemento | Descripción |
|----------|-------------|
| `CREATE OR ALTER PROCEDURE` | Crea o reemplaza el SP |
| `OUTPUT` | Parámetro de salida |
| `SET NOCOUNT ON` | Suprime mensajes de filas afectadas |

**Ventajas:** reutilización, seguridad (permiso al SP en vez de a las tablas), plan de ejecución cacheado.

---

## Triggers

SP especial que se ejecuta **automáticamente** ante eventos DML (`INSERT`, `UPDATE`, `DELETE`) o DDL.

| Momento | Descripción |
|---------|-------------|
| `AFTER` (o `FOR`) | Se ejecuta **después** de que la operación se aplica |
| `INSTEAD OF` | **Reemplaza** la operación original (útil en vistas) |

> No reciben parámetros. Usar las pseudotablas `inserted` y `deleted` para acceder a los datos afectados.

| Objeto | Tipo de trigger | Eventos |
|--------|----------------|---------|
| **Tabla** | DML trigger | `INSERT`, `UPDATE`, `DELETE` |
| **Vista** | DML trigger (`INSTEAD OF`) | `INSERT`, `UPDATE`, `DELETE` |
| **Base de datos** | DDL trigger | `CREATE`, `ALTER`, `DROP` y otros |

### DML trigger (tabla)

```sql
CREATE TRIGGER ddbba.tg_auditoria
ON ddbba.empleados
AFTER INSERT, UPDATE
AS
BEGIN
    INSERT INTO ddbba.log (fecha, cantidad)
    SELECT GETDATE(), COUNT(*) FROM inserted;
END;
```

### INSTEAD OF trigger (vista)

Permite hacer `INSERT`/`UPDATE`/`DELETE` sobre vistas que normalmente no lo permiten.

```sql
CREATE TRIGGER ddbba.tg_vista_empleados
ON ddbba.v_empleados
INSTEAD OF INSERT
AS
BEGIN
    INSERT INTO ddbba.empleados (nombre, id_depto)
    SELECT nombre, id_depto FROM inserted;
END;
```

### DDL trigger (base de datos)

Útil para auditar o prevenir modificaciones estructurales.

```sql
CREATE TRIGGER tg_no_drop
ON DATABASE
FOR DROP_TABLE
AS
BEGIN
    PRINT 'No se permite eliminar tablas.';
    ROLLBACK;
END;
```

> También existe el **logon trigger** a nivel de instancia, que se dispara cuando un usuario inicia sesión. Se usa para restricciones de acceso como limitar conexiones simultáneas, pero es poco frecuente.

---

## Funciones de usuario

Similar a un SP pero **retorna un valor** (escalar o tabla) y puede usarse dentro de una consulta.

```sql
-- Función escalar: retorna un único valor
CREATE OR ALTER FUNCTION ddbba.fn_edad(@fechaNacimiento DATE)
RETURNS INT
AS
BEGIN
    RETURN DATEDIFF(YEAR, @fechaNacimiento, GETDATE())
         - CASE WHEN MONTH(@fechaNacimiento) * 100 + DAY(@fechaNacimiento)
                     > MONTH(GETDATE()) * 100 + DAY(GETDATE())
                THEN 1 ELSE 0 END;
END;

-- Uso en consulta
SELECT nombre, ddbba.fn_edad(fecha_nacimiento) AS edad
FROM   ddbba.alumno;
```

| | Función | Procedimiento |
|---|---------|---------------|
| Parámetros de salida | Solo retorno | Admite `OUTPUT` |
| Uso en SELECT/WHERE | ✅ | ❌ |
| Puede modificar datos | ❌ (generalmente) | ✅ |

---

## Resumen de objetos de una BD

| Objeto | Para qué sirve |
|--------|----------------|
| **Tabla** | Almacena datos persistentes |
| **Vista** | Consulta reutilizable con nombre (tabla virtual) |
| **Stored Procedure** | Lógica ejecutable en el servidor, con parámetros |
| **Función** | Como SP pero retorna valor y se usa dentro de consultas |
| **Trigger** | Se dispara automáticamente ante eventos DML/DDL |
| **Índice** | Acelera búsquedas; el clúster define el orden físico |
| **Constraint** | Regla de integridad (PK, FK, UNIQUE, CHECK, DEFAULT) |

---

## Temas con guía propia

Los siguientes temas tienen una guía dedicada con mayor profundidad y ejemplos:

| Tema | Guía |
|------|------|
| Window Functions | [Window Functions](/unidad-1/guias/window-functions/) |
| Common Table Expressions | [CTE](/unidad-1/guias/cte/) |
| SQL Dinámico | [SQL Dinámico](/unidad-1/guias/sql-dinamico/) |
| PIVOT / UNPIVOT | [PIVOT](/unidad-1/guias/pivot/) |
| Índice Clustered | [Índice Clustered](/unidad-1/guias/indice-cluster/) |
