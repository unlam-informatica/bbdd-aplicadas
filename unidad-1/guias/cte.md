---
layout: default
title: Common Table Expressions
parent: Unidad 1
nav_order: 4
permalink: /unidad-1/guias/cte/
---

## ¿Qué es una CTE?

Una **Common Table Expression (CTE)** es un resultado temporal con nombre que solo existe durante la ejecución de la consulta que la define. Se declara con `WITH` antes del `SELECT` principal y se puede referenciar como si fuera una tabla o vista.

```sql
WITH NombreCTE AS (
    -- consulta que define el conjunto temporal
    SELECT ...
)
SELECT * FROM NombreCTE
```

> **Analogía:** una CTE es como una variable que guarda un resultado intermedio. En lugar de repetir una subconsulta compleja dos veces, la nombrás una vez y la reutilizás.

---

## CTE simple

**Sin CTE** — subconsulta repetida o anidada:

```sql
SELECT *
FROM (
    SELECT EmpleadoID, Nombre, Salario,
           AVG(Salario) OVER (PARTITION BY Departamento) AS PromedioDepto
    FROM tablaswf.Empleados
) AS sub
WHERE Salario > PromedioDepto
GO
```

**Con CTE** — más legible:

```sql
WITH SalariosPorDepto AS (
    SELECT EmpleadoID, Nombre, Departamento, Salario,
           AVG(Salario) OVER (PARTITION BY Departamento) AS PromedioDepto
    FROM tablaswf.Empleados
)
SELECT *
FROM SalariosPorDepto
WHERE Salario > PromedioDepto
GO
```

---

## Múltiples CTEs encadenadas

Se separan con coma. Cada CTE puede referenciar a las anteriores.

```sql
WITH
PedidosPorCliente AS (
    SELECT id_cliente, COUNT(*) AS total_pedidos, SUM(monto) AS total_monto
    FROM tablaswf.Pedidos
    GROUP BY id_cliente
),
ClientesTop AS (
    SELECT c.nombre, c.pais, p.total_pedidos, p.total_monto
    FROM tablaswf.Clientes c
    JOIN PedidosPorCliente p ON c.id_cliente = p.id_cliente
    WHERE p.total_pedidos >= 3
)
SELECT *
FROM ClientesTop
ORDER BY total_monto DESC
GO
```

---

## CTE recursiva

Las CTEs recursivas se referencian a sí mismas y se usan para recorrer **jerarquías** (organigramas, categorías anidadas, árboles).

Estructura obligatoria: un `UNION ALL` que une el **caso base** (punto de partida) con el **caso recursivo** (paso que avanza un nivel).

```sql
WITH Jerarquia AS (
    -- Caso base: el nodo raíz (sin jefe)
    SELECT EmpleadoID, Nombre, JefeID, 0 AS Nivel
    FROM Empleados
    WHERE JefeID IS NULL

    UNION ALL

    -- Caso recursivo: empleados cuyo jefe ya está en la CTE
    SELECT e.EmpleadoID, e.Nombre, e.JefeID, j.Nivel + 1
    FROM Empleados e
    JOIN Jerarquia j ON e.JefeID = j.EmpleadoID
)
SELECT EmpleadoID, Nombre, Nivel
FROM Jerarquia
ORDER BY Nivel, EmpleadoID
GO
```

> SQL Server limita la recursión a **100 niveles** por defecto. Se puede cambiar con `OPTION (MAXRECURSION N)` al final de la consulta (`0` = sin límite).

---

## CTE con INSERT, UPDATE y DELETE

Las CTEs no son solo para SELECT — también simplifican operaciones de escritura.

**Eliminar duplicados con CTE + `ROW_NUMBER`:**

```sql
WITH Duplicados AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY Nombre, Departamento
               ORDER BY EmpleadoID
           ) AS fila
    FROM tablaswf.Empleados
)
DELETE FROM Duplicados
WHERE fila > 1
GO
```

> Este patrón es uno de los más usados en la cátedra: la CTE etiqueta los duplicados y el `DELETE` actúa directamente sobre ella.

---

## CTE vs. subconsulta vs. tabla temporal

| | CTE | Subconsulta | Tabla temporal (`#temp`) |
|---|---|---|---|
| **Legibilidad** | Alta — tiene nombre y se define arriba | Baja — anidada dentro de la query | Alta |
| **Reutilización** | Sí, dentro de la misma query | No | Sí, en cualquier consulta de la sesión |
| **Recursión** | Sí | No | No |
| **Persiste** | No (solo durante la query) | No | Sí (hasta que se cierra la sesión o se dropea) |
| **Uso típico** | Lógica intermedia compleja, jerarquías, duplicados | Filtros simples de una sola vez | Resultados que se reutilizan en varias queries |

---

## Limitaciones

- Una CTE no puede tener `ORDER BY` en su definición (a menos que incluya `TOP`).
- No se pueden crear índices sobre una CTE.
- Las CTEs no persisten: no son vistas ni tablas temporales.
- Si la misma CTE se referencia múltiples veces en la query principal, SQL Server la **re-ejecuta** cada vez (a diferencia de una tabla temporal que se materializa).
