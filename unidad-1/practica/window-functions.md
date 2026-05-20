---
layout: default
title: Práctica - Window Functions
parent: Unidad 1
nav_order: 8
permalink: /unidad-1/practica/window-functions/
---

# Práctica — Window Functions

> Ejercicios de la cátedra. Base de datos `PracticaWF`, esquema `tablaswf`.

---

## Setup — Crear base de datos, esquema y tablas

```sql
USE master
GO

IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = 'PracticaWF')
BEGIN
    CREATE DATABASE PracticaWF
    COLLATE Latin1_General_CI_AI
END
GO

USE PracticaWF
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'tablasWF')
BEGIN
    EXEC('CREATE SCHEMA tablasWF')
END
GO

-- Tabla Empleados
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'tablasWF' AND TABLE_NAME = 'Empleados')
BEGIN
    CREATE TABLE tablaswf.Empleados (
        EmpleadoID   INT          IDENTITY(1,1) PRIMARY KEY,
        Nombre       VARCHAR(50),
        Departamento VARCHAR(50),
        Salario      DECIMAL(10, 2)
    )
END
GO

INSERT INTO tablaswf.Empleados (Nombre, Departamento, Salario)
VALUES
    ('Juan',   'Ventas',    3000.00),
    ('María',  'Ventas',    2800.00),
    ('Pedro',  'Marketing', 3200.00),
    ('Laura',  'Marketing', 3500.00),
    ('Carlos', 'IT',        4000.00)
GO

-- Tabla Clientes
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'tablasWF' AND TABLE_NAME = 'Clientes')
BEGIN
    CREATE TABLE tablaswf.Clientes (
        id_cliente INT         IDENTITY(1,1) PRIMARY KEY,
        nombre     VARCHAR(50),
        pais       VARCHAR(50)
    )
END
GO

INSERT INTO tablaswf.Clientes (nombre, pais)
VALUES
    ('John Doe',          'Argentina'),
    ('Jane Smith',        'Australia'),
    ('Juan García',       'Brasil'),
    ('Maria Hernandez',   'Canadá'),
    ('Michael Johnson',   'China'),
    ('Sophie Martin',     'Dinamarca'),
    ('Ahmad Khan',        'Egipto'),
    ('Emily Brown',       'Francia'),
    ('Hans Müller',       'Alemania'),
    ('Sofia Rossi',       'Italia'),
    ('Takeshi Yamada',    'Japón'),
    ('Javier López',      'México'),
    ('Eva Novak',         'Países Bajos'),
    ('Rafael Silva',      'Portugal'),
    ('Olga Petrova',      'Rusia'),
    ('Fernanda Gonzalez', 'España'),
    ('Mohammed Ali',      'Egipto'),
    ('Lena Schmidt',      'Alemania'),
    ('Yuki Tanaka',       'Japón'),
    ('Lucas Costa',       'Brasil')
GO

-- Tabla Pedidos
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_SCHEMA = 'tablasWF' AND TABLE_NAME = 'Pedidos')
BEGIN
    CREATE TABLE tablaswf.Pedidos (
        id_pedido    INT PRIMARY KEY,
        id_cliente   INT,
        fecha_pedido DATE,
        monto        DECIMAL(10, 2),
        FOREIGN KEY (id_cliente) REFERENCES tablaswf.Clientes(id_cliente)
    )
END
GO

-- 100 pedidos con montos (1000–6000) y fechas aleatorias dentro de 2023
-- Cada cliente recibe 5 pedidos en round-robin
DECLARE @startDate DATE = '2023-01-01'
DECLARE @endDate   DATE = '2023-12-31'
DECLARE @orderId   INT  = 1

WHILE @orderId <= 100
BEGIN
    INSERT INTO tablaswf.Pedidos (id_pedido, id_cliente, fecha_pedido, monto)
    VALUES (
        @orderId,
        ((@orderId - 1) % 20) + 1,
        DATEADD(DAY, ABS(CHECKSUM(NEWID())) % (DATEDIFF(DAY, @startDate, @endDate) + 1), @startDate),
        ROUND(RAND(CHECKSUM(NEWID())) * 5000 + 1000, 2)
    )
    SET @orderId = @orderId + 1
END
GO
```

---

## Ejercicio 1 — ROW\_NUMBER global por salario

Enumerar, de mayor a menor, los empleados según el salario que poseen.

```sql
SELECT EmpleadoID, Nombre, Departamento, Salario,
    ROW_NUMBER() OVER (ORDER BY Salario DESC) AS OrdenEmpleadosSalario
FROM tablaswf.Empleados
GO
```

---

## Ejercicio 2 — RANK por departamento

Clasifica a los empleados según sus salarios agrupado por departamento.

Antes de resolver, se agregan más registros a la tabla:

```sql
INSERT INTO tablaswf.Empleados (Nombre, Departamento, Salario)
VALUES
    ('Ramiro',   'Ventas',      1800.00),
    ('Tomas',    'Ventas',      3200.00),
    ('Erik',     'Marketing',   1477.00),
    ('Esteban',  'Marketing',  15000.00),
    ('Laura',    'IT',           452.00),
    ('Romina',   'Ventas',      7855.00),
    ('Susana',   'Ventas',      1233.00),
    ('Mateo',    'Marketing',   4755.00),
    ('Nicolas',  'Marketing',   1236.00),
    ('Federico', 'IT',        260611.00),
    ('Miguel',   'Ventas',      4688.00),
    ('Josefina', 'Ventas',      2855.00),
    ('Franco',   'Marketing',   7456.00),
    ('Cesar',    'Marketing',   2555.00),
    ('Patricio', 'IT',          4000.00)
GO
```

```sql
SELECT EmpleadoID, Nombre, Departamento, Salario,
    RANK() OVER (PARTITION BY Departamento ORDER BY Salario DESC) AS Ranking
FROM tablaswf.Empleados
GO
```

---

## Ejercicio 3 — NTILE en cuartiles de salario

Dividir a los empleados en 4 grupos basados en su salario. El grupo 1 contendrá a los empleados con los salarios más altos; el grupo 4, a los de salarios más bajos.

```sql
SELECT EmpleadoID, Nombre, Departamento, Salario,
    NTILE(4) OVER (ORDER BY Salario DESC) AS GrupoSalario
FROM tablaswf.Empleados
GO
```

---

## Ejercicio 4 — LAG y LEAD dentro del departamento

Realizar una comparación de salarios entre empleados para analizar la diferencia entre el empleado actual y el siguiente, así como el salario del empleado anterior, dentro de un mismo departamento. La consulta debe mostrar, para cada empleado, su salario actual, el salario del empleado anterior en orden ascendente dentro del mismo departamento, y el salario del empleado siguiente en ese mismo orden.

```sql
SELECT EmpleadoID, Nombre, Departamento, Salario,
    LAG(Salario, 1, 0)  OVER (PARTITION BY Departamento ORDER BY Salario) AS SalarioAnterior,
    LEAD(Salario, 1, 0) OVER (PARTITION BY Departamento ORDER BY Salario) AS SiguienteSalario
FROM tablaswf.Empleados
GO
```

---

## Ejercicio 5 — Promedio y posición relativa de pedidos por cliente

Calcular el promedio de los montos de pedidos por cliente, mostrando también el monto de cada pedido y su posición relativa en comparación con el promedio de los montos para ese cliente.

> El resultado varía en cada ejecución porque los datos de `Pedidos` se generaron de forma aleatoria.

```sql
SELECT id_pedido, id_cliente, monto,
    AVG(monto) OVER (PARTITION BY id_cliente) AS promedio_monto_cliente,
    ROW_NUMBER() OVER (PARTITION BY id_cliente ORDER BY monto) AS posicion_rel_monto_cliente
FROM tablaswf.Pedidos
GO
```

---

## Ejercicio 6 — Top 3 clientes por monto total en cada país

Encontrar a los tres principales clientes (por monto total de pedidos) de cada país, mostrando su nombre, país y el monto total de sus pedidos.

> El resultado varía en cada ejecución porque los datos de `Pedidos` se generaron de forma aleatoria.

```sql
SELECT *
FROM (
    SELECT
        c.nombre,
        c.pais,
        SUM(p.monto) AS monto_total_pedidos,
        RANK() OVER (PARTITION BY c.pais ORDER BY SUM(p.monto) DESC) AS ranking_por_pais
    FROM tablaswf.Clientes c
    INNER JOIN tablaswf.Pedidos p ON c.id_cliente = p.id_cliente
    GROUP BY c.nombre, c.pais
) ranked_clients
WHERE ranking_por_pais <= 3
GO
```

---

## Ejercicio 7 — Diferencia de monto entre pedidos consecutivos

Calcular la diferencia de monto entre un pedido y el siguiente pedido realizado por el mismo cliente, ordenado por fecha de pedido. Mostrar el ID del pedido, el ID del cliente, la fecha del pedido y la diferencia de monto.

> El resultado varía en cada ejecución porque los datos de `Pedidos` se generaron de forma aleatoria.

```sql
SELECT id_pedido, id_cliente, fecha_pedido, monto,
    LEAD(monto) OVER (PARTITION BY id_cliente ORDER BY fecha_pedido) - monto AS diferencia_monto
FROM tablaswf.Pedidos
ORDER BY id_cliente, fecha_pedido
GO
```

---

## Ejercicio 8 — PERCENT\_RANK de pedidos por país

Determinar el percentil de monto de cada pedido en relación con todos los pedidos realizados por clientes del mismo país. Mostrar el ID del pedido, el ID del cliente, el monto del pedido y su percentil.

> El resultado varía en cada ejecución porque los datos de `Pedidos` se generaron de forma aleatoria.

```sql
SELECT p.id_pedido, p.id_cliente, c.pais, p.monto,
    PERCENT_RANK() OVER (PARTITION BY c.pais ORDER BY p.monto) AS percentil_monto
FROM tablaswf.Pedidos p
INNER JOIN tablaswf.Clientes c ON p.id_cliente = c.id_cliente
ORDER BY c.pais, p.monto
GO
```

---

## Ejercicio 9 — Total de pedidos y posición cronológica por cliente

Para cada cliente, mostrar el ID del pedido, el número total de pedidos realizados por ese cliente, su nombre y la posición relativa de cada pedido en relación con el total de pedidos del cliente (ordenados por fecha de pedido).

> El resultado varía en cada ejecución porque los datos de `Pedidos` se generaron de forma aleatoria.

```sql
SELECT p.id_pedido, p.id_cliente, c.nombre AS nombre_cliente,
    COUNT(*) OVER (PARTITION BY p.id_cliente) AS total_pedidos_cliente,
    ROW_NUMBER() OVER (PARTITION BY p.id_cliente ORDER BY p.fecha_pedido) AS posicion_rel_pedidos_cliente
FROM tablaswf.Pedidos p
JOIN tablaswf.Clientes c ON p.id_cliente = c.id_cliente
ORDER BY p.id_cliente, p.fecha_pedido
GO
```
