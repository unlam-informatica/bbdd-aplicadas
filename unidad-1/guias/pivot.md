---
layout: default
title: PIVOT
parent: Unidad 1
nav_order: 3
permalink: /unidad-1/guias/pivot/
---

## ¿Qué es PIVOT?

`PIVOT` transforma filas en columnas. Tomás datos que están almacenados verticalmente (una fila por valor) y los presentás horizontalmente (un valor por columna), lo que facilita comparaciones y reportes.

```
Tabla original (filas)          Resultado con PIVOT (columnas)
──────────────────────          ──────────────────────────────
Año  | Trimestre | Ventas       Año | Q1    | Q2    | Q3    | Q4
2023 | Q1        | 100          2023| 100   | 150   | 130   | 200
2023 | Q2        | 150    →     2024| 120   | 180   | 160   | 220
2023 | Q3        | 130
2023 | Q4        | 200
```

---

## Sintaxis base

```sql
SELECT <columnas_fijas>, [valor_col1], [valor_col2], ...
FROM (
    <subconsulta_con_los_datos>
) AS origen
PIVOT (
    FUNCION_AGREGADO(columna_a_agregar)
    FOR columna_a_girar IN ([valor_col1], [valor_col2], ...)
) AS tabla_pivoteada
```

Los tres componentes obligatorios dentro de `PIVOT`:
- **Función de agregado**: qué hacer con los valores (`SUM`, `COUNT`, `AVG`, etc.)
- **`FOR columna`**: qué columna contiene los valores que se van a convertir en cabeceras
- **`IN ([...])`**: cuáles de esos valores se convierten en columnas

---

## PIVOT estático

Los nombres de columna se conocen de antemano y se escriben directamente.

**Escenario:** ventas por departamento, una columna por trimestre.

```sql
-- Tabla origen: Ventas(Departamento, Trimestre, Monto)
SELECT Departamento, [Q1], [Q2], [Q3], [Q4]
FROM (
    SELECT Departamento, Trimestre, Monto
    FROM Ventas
) AS origen
PIVOT (
    SUM(Monto)
    FOR Trimestre IN ([Q1], [Q2], [Q3], [Q4])
) AS pv
GO
```

| Departamento | Q1  | Q2  | Q3  | Q4  |
|---|---|---|---|---|
| IT | 120 | 150 | 130 | 200 |
| Ventas | 300 | 280 | 320 | 410 |

> **Celdas NULL**: si no hay datos para una combinación (p. ej. IT no tuvo ventas en Q3), la celda queda en `NULL`. Usá `ISNULL(columna, 0)` para reemplazarlo.

```sql
SELECT Departamento,
    ISNULL([Q1], 0) AS Q1,
    ISNULL([Q2], 0) AS Q2,
    ISNULL([Q3], 0) AS Q3,
    ISNULL([Q4], 0) AS Q4
FROM (...) AS origen
PIVOT (SUM(Monto) FOR Trimestre IN ([Q1],[Q2],[Q3],[Q4])) AS pv
GO
```

---

## PIVOT dinámico

Cuando los valores de columna no se conocen de antemano (o cambian), se construye la lista con SQL dinámico.

```sql
DECLARE @cols   NVARCHAR(MAX)
DECLARE @query  NVARCHAR(MAX)

-- 1. Construir la lista de columnas a partir de los datos reales
SELECT @cols = STRING_AGG('[' + Trimestre + ']', ', ')
FROM (SELECT DISTINCT Trimestre FROM Ventas) AS t
GO

-- 2. Armar y ejecutar la consulta con esa lista
SET @query = '
    SELECT Departamento, ' + @cols + '
    FROM (
        SELECT Departamento, Trimestre, Monto
        FROM Ventas
    ) AS origen
    PIVOT (
        SUM(Monto)
        FOR Trimestre IN (' + @cols + ')
    ) AS pv'

EXEC sp_executesql @query
GO
```

> La diferencia clave respecto al PIVOT estático es que `@cols` se arma en tiempo de ejecución, por lo que funciona aunque aparezcan nuevos trimestres en los datos.

---

## UNPIVOT — el camino inverso

`UNPIVOT` hace lo contrario: convierte columnas en filas.

```sql
SELECT Departamento, Trimestre, Monto
FROM (
    SELECT Departamento, Q1, Q2, Q3, Q4
    FROM ResumenVentas
) AS origen
UNPIVOT (
    Monto FOR Trimestre IN (Q1, Q2, Q3, Q4)
) AS unpv
GO
```

---

## Errores frecuentes

| Error | Causa | Solución |
|---|---|---|
| La columna no aparece | El valor en `IN` no coincide exactamente (mayúsculas, espacios) | Verificar los valores con `SELECT DISTINCT` |
| Columnas duplicadas en el resultado | La subconsulta trae columnas extra que SQL Server intenta agregar como fijo | Seleccionar solo las columnas necesarias en la subconsulta |
| Error de conversión | La función de agregado recibe tipos incompatibles | Verificar el tipo de la columna que se agrega |
| `STRING_AGG` no disponible | SQL Server < 2017 | Usar `FOR XML PATH` para construir la lista |

### Alternativa a `STRING_AGG` para SQL Server < 2017

```sql
SELECT @cols = STUFF(
    (SELECT ', [' + Trimestre + ']'
     FROM (SELECT DISTINCT Trimestre FROM Ventas) t
     FOR XML PATH('')), 1, 2, '')
GO
```
