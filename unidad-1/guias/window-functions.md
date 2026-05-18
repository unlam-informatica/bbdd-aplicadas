---
layout: default
title: "Window Functions"
permalink: /unidad-1/guias/window-functions/
---

## ¿Qué son las Window Functions?

Las Window Functions (funciones de ventana) permiten realizar cálculos **sobre un conjunto de filas relacionadas con la fila actual**, sin colapsar el resultado en una sola fila como hacen las funciones de agregado (`GROUP BY`). Esto significa que podés rankear, comparar, acumular o navegar entre filas **manteniendo todo el detalle del resultado**.

La sintaxis base que comparten todas es:

```sql
FUNCION() OVER (PARTITION BY columna ORDER BY columna) AS alias
```

### Los dos argumentos clave dentro del `OVER`

| Cláusula | ¿Qué hace? | ¿Es obligatoria? |
|---|---|---|
| `PARTITION BY` | Divide el resultado en grupos (particiones). Si se omite, toda la tabla es un único grupo. | No |
| `ORDER BY` | Define el orden dentro de cada partición antes de aplicar la función. | En la mayoría, sí |

> **Analogía:** `PARTITION BY` es como un `GROUP BY` que **no elimina filas**. Cada grupo vive en su propia "ventana" y la función se aplica dentro de ella.



## Parte 1 - Funciones de Categoría (Ranking)

Devuelven un valor de posición para cada fila dentro de su partición. Son **no deterministas**: con valores iguales, distintas funciones se comportan diferente.

### `RANK()`

Asigna un número de posición a cada fila. Si dos filas empatan, reciben el **mismo número**, pero el siguiente número **se saltea**.

```sql
RANK() OVER (PARTITION BY LocationID ORDER BY Quantity DESC) AS Rank
```

**Ejemplo con empate:**

| Producto | Cantidad | RANK |
|---|---|---|
| Paint - Silver | 49 | 1 |
| Paint - Blue | 49 | 1 |
| Paint - Red | 41 | **3** ← se saltea el 2 |
| Paint - Yellow | 30 | 4 |

> El "salto" en la numeración refleja cuántas filas ocupan esa posición.

---

### `DENSE_RANK()`

Idéntica a `RANK()` pero **sin saltos**: los números siempre son consecutivos, aunque haya empates.

```sql
DENSE_RANK() OVER (PARTITION BY LocationID ORDER BY Quantity DESC) AS Rank
```

**Misma situación con DENSE_RANK:**

| Producto | Cantidad | DENSE_RANK |
|---|---|---|
| Paint - Silver | 49 | 1 |
| Paint - Blue | 49 | 1 |
| Paint - Red | 41 | **2** ← sin salto |
| Paint - Yellow | 30 | 3 |

> **¿Cuándo usar cada una?** Usá `RANK` cuando el número refleje "cuántas personas te superan". Usá `DENSE_RANK` cuando necesités que los grupos sean consecutivos (ej: top 3 sin importar empates).

---

### `NTILE(n)`

Distribuye las filas en `n` grupos iguales (o lo más iguales posible) y le asigna a cada fila el número de su grupo. Muy útil para calcular **cuartiles, quintiles, deciles**, etc.

```sql
NTILE(4) OVER (PARTITION BY PostalCode ORDER BY SalesYTD DESC) AS Quartile
```

Si el total de filas no es divisible exactamente por `n`, los grupos más grandes van primero.  
Ej: 53 filas en 5 grupos → grupos de 11, 11, 11, 10, 10.

---

### `ROW_NUMBER()`

Asigna un número secuencial único a cada fila dentro de su partición, empezando desde 1. **Nunca hay empates**: aunque dos filas tengan el mismo valor, cada una recibe un número distinto.

```sql
-- Sin PARTITION BY: numeración global
ROW_NUMBER() OVER (ORDER BY name ASC) AS Row#

-- Con PARTITION BY: reinicia el contador en cada partición
ROW_NUMBER() OVER (PARTITION BY recovery_model_desc ORDER BY name ASC) AS Row#
```

> `ROW_NUMBER` es ideal para paginar resultados o para quedarse con "la primera fila de cada grupo" usando un filtro `WHERE Row# = 1`.

---

## Parte 2 — Funciones Analíticas

Calculan valores a partir de grupos de filas pero, a diferencia de las de agregado, **pueden devolver múltiples filas por grupo**. Se usan para medias móviles, totales acumulados, porcentajes y comparaciones entre filas.

---

### `PERCENT_RANK()`

Calcula el **rango relativo porcentual** de cada fila dentro de su partición. El resultado siempre está en el rango **(0, 1]**, y la primera fila siempre devuelve 0.

```sql
PERCENT_RANK() OVER (PARTITION BY Department ORDER BY Rate) AS PctRank
```

La fórmula interna es: `(rank - 1) / (total_filas - 1)`

---

### `CUME_DIST()`

Calcula la **distribución acumulativa**: qué proporción de filas tiene un valor menor o igual al de la fila actual. El resultado está en el rango **(0, 1]**.

```sql
CUME_DIST() OVER (PARTITION BY Department ORDER BY Rate) AS CumeDist
```

> **Diferencia clave con `PERCENT_RANK`:** `CUME_DIST` incluye la fila actual en el conteo; `PERCENT_RANK` no. Por eso `CUME_DIST` nunca devuelve 0.

---

### `LEAD()`

Accede al valor de una fila **siguiente** (hacia adelante) dentro de la partición. Permite comparar la fila actual con filas futuras sin necesidad de un self-join.

```sql
LEAD(scalar_expression [, offset] [, default])
  OVER ([PARTITION BY ...] ORDER BY ...)
```

- `offset`: cuántas filas hacia adelante (por defecto: 1)
- `default`: valor si no existe la fila destino (por defecto: `NULL`)

```sql
LEAD(SalesQuota, 1, 0) OVER (ORDER BY YEAR(QuotaDate)) AS NextQuota
```

---

### `LAG()`

Igual que `LEAD()` pero accede a una fila **anterior** (hacia atrás). La función espejo perfecta.

```sql
LAG(scalar_expression [, offset] [, default])
  OVER ([PARTITION BY ...] ORDER BY ...)
```

```sql
LAG(SalesQuota, 1, 0) OVER (ORDER BY YEAR(QuotaDate)) AS PreviousQuota
```

> **Caso de uso clásico:** calcular la variación entre el período actual y el anterior.  
> `SalesQuota - LAG(SalesQuota, 1, 0) OVER (ORDER BY fecha)` → diferencia período a período.

---

### `FIRST_VALUE()`

Devuelve el **primer valor** de la expresión dentro de la ventana ordenada. Es útil para saber, para cada fila, cuál es el "mejor" o "primero" de su grupo.

```sql
FIRST_VALUE(LastName) OVER (
  PARTITION BY JobTitle
  ORDER BY VacationHours ASC
  ROWS UNBOUNDED PRECEDING
) AS FewestVacationHours
```

> La cláusula `ROWS UNBOUNDED PRECEDING` le dice a la función que considere desde el inicio de la partición hasta la fila actual.

---

### `LAST_VALUE()`

Devuelve el **último valor** de la expresión dentro de la ventana. Funciona simétricamente a `FIRST_VALUE`.

```sql
LAST_VALUE(HireDate) OVER (
  PARTITION BY Department
  ORDER BY Rate
) AS LastValue
```

---

## Tabla comparativa rápida

| Función | Categoría | ¿Hay empates posibles? | ¿Números consecutivos? |
|---|---|---|---|
| `RANK()` | Ranking | Sí | No (hay saltos) |
| `DENSE_RANK()` | Ranking | Sí | Siempre |
| `ROW_NUMBER()` | Ranking | No | Siempre |
| `NTILE(n)` | Ranking | Sí (grupos) | — |
| `PERCENT_RANK()` | Analítica | — | Valor entre 0 y 1 |
| `CUME_DIST()` | Analítica | — | Valor entre 0 y 1 |
| `LEAD()` | Analítica | — | Accede a fila siguiente |
| `LAG()` | Analítica | — | Accede a fila anterior |
| `FIRST_VALUE()` | Analítica | — | Primer valor de la ventana |
| `LAST_VALUE()` | Analítica | — | Último valor de la ventana |