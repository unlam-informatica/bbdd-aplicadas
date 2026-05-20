---
layout: default
title: SQL Dinámico
parent: Unidad 1
nav_order: 5
permalink: /unidad-1/guias/sql-dinamico/
---

## ¿Qué es SQL dinámico?

SQL dinámico consiste en construir una sentencia SQL **como una cadena de texto** en tiempo de ejecución y luego ejecutarla. Se usa cuando alguna parte de la consulta no puede determinarse hasta que el código corre: nombres de columnas, tablas, o condiciones que varían según el contexto.

```sql
-- SQL estático: la tabla siempre es la misma
SELECT * FROM Empleados

-- SQL dinámico: la tabla se decide en tiempo de ejecución
DECLARE @tabla NVARCHAR(100) = 'Empleados'
EXEC('SELECT * FROM ' + @tabla)
```

---

## Dos formas de ejecutarlo

### `EXEC` / `EXECUTE`

La forma más simple. Recibe una cadena y la ejecuta directamente.

```sql
DECLARE @sql NVARCHAR(MAX)
SET @sql = 'SELECT * FROM tablaswf.Empleados WHERE Departamento = ''IT'''
EXEC(@sql)
GO
```

> Para incluir comillas simples dentro de la cadena, se duplican: `''''` produce `'`.

### `sp_executesql` (recomendada)

Permite pasar **parámetros con tipo**, lo que evita inyección SQL y habilita la reutilización del plan de ejecución en caché.

```sql
DECLARE @sql    NVARCHAR(MAX)
DECLARE @depto  NVARCHAR(50) = 'IT'

SET @sql = N'SELECT * FROM tablaswf.Empleados WHERE Departamento = @depto'

EXEC sp_executesql @sql,
    N'@depto NVARCHAR(50)',  -- declaración de parámetros
    @depto = @depto          -- valores
GO
```

| | `EXEC` | `sp_executesql` |
|---|---|---|
| Parámetros tipados | No | Sí |
| Reutiliza plan de ejecución | No | Sí |
| Riesgo de SQL injection | Alto si se concatena input del usuario | Bajo con parámetros |
| Sintaxis | Simple | Más verbosa |

---

## Caso de uso principal: PIVOT dinámico

El uso más frecuente en la cátedra es construir un PIVOT cuyas columnas no se conocen de antemano.

```sql
DECLARE @cols  NVARCHAR(MAX)
DECLARE @query NVARCHAR(MAX)

-- 1. Obtener los valores distintos que se convertirán en columnas
SELECT @cols = STRING_AGG('[' + Departamento + ']', ', ')
FROM (SELECT DISTINCT Departamento FROM tablaswf.Empleados) AS t
GO

-- 2. Construir la consulta PIVOT
SET @query = N'
    SELECT Nombre, ' + @cols + N'
    FROM (
        SELECT Nombre, Departamento, Salario
        FROM tablaswf.Empleados
    ) AS origen
    PIVOT (
        SUM(Salario)
        FOR Departamento IN (' + @cols + N')
    ) AS pv'

EXEC sp_executesql @query
GO
```

---

## Otros casos de uso

**ORDER BY dinámico** — el usuario elige la columna de ordenamiento:

```sql
DECLARE @columna NVARCHAR(50) = 'Salario'
DECLARE @sql     NVARCHAR(MAX)

SET @sql = N'SELECT * FROM tablaswf.Empleados ORDER BY ' + QUOTENAME(@columna)
EXEC sp_executesql @sql
GO
```

**Tabla dinámica** — ejecutar la misma lógica sobre tablas distintas:

```sql
DECLARE @tabla NVARCHAR(128) = 'Empleados'
DECLARE @sql   NVARCHAR(MAX)

SET @sql = N'SELECT COUNT(*) FROM tablaswf.' + QUOTENAME(@tabla)
EXEC sp_executesql @sql
GO
```

---

## `QUOTENAME` — protección contra inyección en identificadores

Cuando el valor dinámico es un **nombre de objeto** (tabla, columna, esquema), no se puede parametrizar con `sp_executesql`. En esos casos se usa `QUOTENAME`, que envuelve el valor entre corchetes y escapa los caracteres peligrosos.

```sql
-- Sin QUOTENAME (vulnerable)
SET @sql = 'SELECT * FROM ' + @tabla           -- riesgo si @tabla = 'x; DROP TABLE x--'

-- Con QUOTENAME (seguro)
SET @sql = 'SELECT * FROM ' + QUOTENAME(@tabla) -- produce [x; DROP TABLE x--] → error de nombre, no ejecuta
```

> Regla: para **valores de datos** usá parámetros con `sp_executesql`; para **nombres de objetos** usá `QUOTENAME`.

---

## Inyección SQL — el riesgo principal

La concatenación directa de input externo en una query dinámica permite que un atacante inyecte código arbitrario.

```sql
-- Input del usuario: ' OR '1'='1
DECLARE @nombre NVARCHAR(50) = ''' OR ''1''=''1'
DECLARE @sql    NVARCHAR(MAX)

-- VULNERABLE: la query resultante devuelve toda la tabla
SET @sql = 'SELECT * FROM Empleados WHERE Nombre = ''' + @nombre + ''''
EXEC(@sql)

-- SEGURO: el parámetro se trata como dato, nunca como código
SET @sql = N'SELECT * FROM Empleados WHERE Nombre = @nombre'
EXEC sp_executesql @sql, N'@nombre NVARCHAR(50)', @nombre = @nombre
GO
```

---

## Depuración: imprimir la query antes de ejecutarla

Antes de ejecutar, conviene verificar qué cadena se construyó:

```sql
DECLARE @sql NVARCHAR(MAX)
-- ... construir @sql ...
PRINT @sql   -- muestra hasta 4000 caracteres en la ventana de mensajes
-- EXEC sp_executesql @sql  -- descomentar cuando esté validada
GO
```

> `PRINT` solo muestra los primeros 4000 caracteres. Para queries más largas usá `SELECT @sql`.
