---
layout: default
title: Práctica — JSON en SQL Server
parent: Unidad 2
nav_order: 13
permalink: /unidad-2/practica/json/
---

# Práctica — JSON en SQL Server

> Ver guía de referencia: [JSON en SQL Server](/unidad-2/guias/json-en-sql/)

---

## Setup

Todos los ejercicios usan variables y tablas en memoria. No requieren archivos externos.

```sql
USE PracticaU2;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'js')
    EXEC('CREATE SCHEMA js');
GO

DROP TABLE IF EXISTS js.Producto;
DROP TABLE IF EXISTS js.Pedido;
GO

CREATE TABLE js.Producto (
    producto_id INT           IDENTITY(1,1) PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    categoria   VARCHAR(50)   NOT NULL,
    precio      DECIMAL(10,2) NOT NULL,
    stock       INT           NOT NULL DEFAULT 0,
    atributos   NVARCHAR(MAX) NULL       -- columna JSON
);

CREATE TABLE js.Pedido (
    pedido_id   INT           IDENTITY(1,1) PRIMARY KEY,
    cliente     VARCHAR(100)  NOT NULL,
    fecha       DATE          NOT NULL DEFAULT GETDATE(),
    detalle_json NVARCHAR(MAX) NOT NULL  -- array de líneas en JSON
);
GO

INSERT INTO js.Producto (nombre, categoria, precio, stock, atributos) VALUES
    ('Notebook Pro 15',  'Electrónica', 1299.99, 12,
     N'{"marca":"Dell","ram_gb":16,"ssd_gb":512,"color":"Negro"}'),
    ('Mouse Inalámbrico','Periféricos',   29.99, 85,
     N'{"marca":"Logitech","dpi":1600,"color":"Gris","bateria":"AA"}'),
    ('Monitor 27"',      'Electrónica',  349.99, 20,
     N'{"marca":"LG","resolucion":"2560x1440","panel":"IPS","hz":144}'),
    ('Teclado Mecánico', 'Periféricos',   89.99, 40,
     N'{"marca":"Keychron","switch":"Brown","retroiluminado":true}'),
    ('Auriculares BT',   'Audio',         59.99, 55,
     N'{"marca":"Sony","autonomia_hs":30,"anc":true,"color":"Negro"}');

INSERT INTO js.Pedido (cliente, fecha, detalle_json) VALUES
    ('Valentina Torres', '2024-03-10',
     N'[{"producto_id":1,"cantidad":1,"precio_unit":1299.99},{"producto_id":2,"cantidad":2,"precio_unit":29.99}]'),
    ('Rodrigo Méndez', '2024-03-11',
     N'[{"producto_id":3,"cantidad":1,"precio_unit":349.99},{"producto_id":5,"cantidad":1,"precio_unit":59.99}]'),
    ('Sofía Alvarado', '2024-03-12',
     N'[{"producto_id":4,"cantidad":2,"precio_unit":89.99}]');
GO
```

---

## Ejercicio 1 — ISJSON: validar que una columna contiene JSON

Verificar qué filas de `js.Producto` tienen JSON válido en la columna `atributos`.

```sql
SELECT producto_id, nombre,
       ISJSON(atributos) AS es_json_valido
FROM js.Producto;
```

Agregar una fila intencionalmente inválida y repetir la consulta:

```sql
INSERT INTO js.Producto (nombre, categoria, precio, stock, atributos)
VALUES ('Producto roto', 'Test', 0, 0, 'campo: sin apertura, estructura invalida');

SELECT producto_id, nombre, ISJSON(atributos) AS es_json_valido
FROM js.Producto;

-- Limpiar la fila de prueba
DELETE FROM js.Producto WHERE nombre = 'Producto roto';
```

---

## Ejercicio 2 — JSON_VALUE: extraer un valor escalar

Extraer la marca y el color de cada producto desde la columna `atributos`.

```sql
SELECT
    nombre,
    JSON_VALUE(atributos, '$.marca')  AS marca,
    JSON_VALUE(atributos, '$.color')  AS color
FROM js.Producto;
```

Ahora filtrar solo los productos de la marca 'Logitech':

```sql
SELECT nombre, precio
FROM js.Producto
WHERE JSON_VALUE(atributos, '$.marca') = 'Logitech';
```

---

## Ejercicio 3 — JSON_QUERY: extraer un fragmento JSON

`JSON_VALUE` solo funciona para valores escalares. Para extraer un sub-objeto o array completo se usa `JSON_QUERY`.

{% raw %}
```sql
DECLARE @json NVARCHAR(MAX) = N'{
    "cliente": "Valentina Torres",
    "direccion": {
        "calle": "Av. Corrientes 1234",
        "ciudad": "Buenos Aires",
        "cp": "C1043"
    },
    "tags": ["premium", "frecuente"]
}';

-- JSON_VALUE para escalares:
SELECT JSON_VALUE(@json, '$.cliente')           AS cliente;
SELECT JSON_VALUE(@json, '$.direccion.ciudad')  AS ciudad;

-- JSON_QUERY para el sub-objeto completo (devuelve JSON):
SELECT JSON_QUERY(@json, '$.direccion')         AS direccion_json;

-- JSON_QUERY para el array:
SELECT JSON_QUERY(@json, '$.tags')              AS tags_json;

-- JSON_VALUE sobre un elemento del array (por índice):
SELECT JSON_VALUE(@json, '$.tags[0]')           AS primer_tag;
```
{% endraw %}

---

## Ejercicio 4 — OPENJSON: convertir JSON en filas

Parsear un JSON de pedido y expandirlo en filas relacionales.

```sql
DECLARE @pedido NVARCHAR(MAX) = N'[
    {"producto_id": 1, "cantidad": 2, "precio_unit": 1299.99},
    {"producto_id": 4, "cantidad": 1, "precio_unit":   89.99},
    {"producto_id": 5, "cantidad": 3, "precio_unit":   59.99}
]';

-- Sin WITH: devuelve key/value/type genérico
SELECT * FROM OPENJSON(@pedido);

-- Con WITH: tipado explícito — una fila por elemento del array
SELECT *
FROM OPENJSON(@pedido)
WITH (
    producto_id INT           '$.producto_id',
    cantidad    INT           '$.cantidad',
    precio_unit DECIMAL(10,2) '$.precio_unit',
    subtotal    AS JSON       -- columna calculada no soportada en WITH; hacerlo afuera
);
```

Calcular el subtotal afuera del WITH:

```sql
SELECT
    producto_id,
    cantidad,
    precio_unit,
    cantidad * precio_unit AS subtotal
FROM OPENJSON(@pedido)
WITH (
    producto_id INT           '$.producto_id',
    cantidad    INT           '$.cantidad',
    precio_unit DECIMAL(10,2) '$.precio_unit'
);
```

---

## Ejercicio 5 — OPENJSON con JOIN: expandir pedidos reales

Expandir todos los pedidos de `js.Pedido` y cruzarlos con `js.Producto` para obtener el nombre del producto y el total de cada línea.

```sql
SELECT
    p.pedido_id,
    p.cliente,
    p.fecha,
    prod.nombre                                 AS producto,
    linea.cantidad,
    linea.precio_unit,
    linea.cantidad * linea.precio_unit          AS subtotal
FROM js.Pedido p
CROSS APPLY OPENJSON(p.detalle_json)
WITH (
    producto_id INT           '$.producto_id',
    cantidad    INT           '$.cantidad',
    precio_unit DECIMAL(10,2) '$.precio_unit'
) AS linea
JOIN js.Producto prod ON prod.producto_id = linea.producto_id
ORDER BY p.pedido_id;
```

Agregar el total por pedido:

```sql
SELECT
    p.pedido_id,
    p.cliente,
    SUM(linea.cantidad * linea.precio_unit) AS total_pedido
FROM js.Pedido p
CROSS APPLY OPENJSON(p.detalle_json)
WITH (
    cantidad    INT           '$.cantidad',
    precio_unit DECIMAL(10,2) '$.precio_unit'
) AS linea
GROUP BY p.pedido_id, p.cliente;
```

---

## Ejercicio 6 — JSON_MODIFY: actualizar un valor dentro de un JSON

Actualizar la RAM del producto "Notebook Pro 15" de 16 GB a 32 GB y agregar un campo nuevo `garantia_anios`.

```sql
-- Ver el JSON actual
SELECT atributos FROM js.Producto WHERE nombre = 'Notebook Pro 15';

-- Modificar un campo existente y agregar uno nuevo
UPDATE js.Producto
SET atributos = JSON_MODIFY(
                    JSON_MODIFY(atributos, '$.ram_gb', 32),
                    '$.garantia_anios', 2
                )
WHERE nombre = 'Notebook Pro 15';

-- Verificar
SELECT
    nombre,
    JSON_VALUE(atributos, '$.ram_gb')         AS ram_gb,
    JSON_VALUE(atributos, '$.garantia_anios') AS garantia_anios
FROM js.Producto
WHERE nombre = 'Notebook Pro 15';
```

Eliminar un campo del JSON:

```sql
UPDATE js.Producto
SET atributos = JSON_MODIFY(atributos, '$.color', NULL)
WHERE nombre = 'Notebook Pro 15';
```

---

## Ejercicio 7 — FOR JSON PATH: exportar tabla como JSON

Exportar la tabla `js.Producto` como un array JSON con estructura personalizada.

```sql
-- Array simple
SELECT producto_id, nombre, precio, categoria
FROM js.Producto
FOR JSON PATH;

-- Con elemento raíz
SELECT producto_id, nombre, precio, categoria
FROM js.Producto
FOR JSON PATH, ROOT('productos');

-- Anidar la marca dentro de un objeto "detalles"
SELECT
    producto_id,
    nombre,
    precio,
    JSON_VALUE(atributos, '$.marca') AS [detalles.marca],
    stock                            AS [detalles.stock]
FROM js.Producto
FOR JSON PATH, ROOT('catalogo');
```

---

## Ejercicio 8 — FOR JSON AUTO

Exportar un JOIN de pedidos con sus líneas usando `FOR JSON AUTO`. Observar cómo infiere la jerarquía.

```sql
SELECT
    p.pedido_id,
    p.cliente,
    p.fecha,
    prod.nombre  AS producto,
    linea.cantidad,
    linea.precio_unit
FROM js.Pedido p
CROSS APPLY OPENJSON(p.detalle_json)
WITH (
    producto_id INT           '$.producto_id',
    cantidad    INT           '$.cantidad',
    precio_unit DECIMAL(10,2) '$.precio_unit'
) AS linea
JOIN js.Producto prod ON prod.producto_id = linea.producto_id
FOR JSON AUTO, ROOT('pedidos');
```

**Pregunta**: ¿En qué difiere el resultado de `FOR JSON AUTO` respecto a `FOR JSON PATH`?
