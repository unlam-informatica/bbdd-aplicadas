---
layout: default
title: Laboratorio — Calidad de datos
parent: Práctica
grand_parent: Unidad 6
nav_order: 1
permalink: /unidad-6/practica/laboratorio-calidad/
---

[← Unidad 6](../../)

# Laboratorio — Perfilado, reglas y métricas

{: .warning }
Ejecutar solo en una instancia de laboratorio. El script crea la base `LaboratorioU6Calidad` y contiene defectos deliberados para analizarlos.

## Objetivos

- detectar nulos, dominios inválidos, duplicados, contradicciones y desactualización;
- asociar hallazgos con ISO/IEC 25012;
- calcular indicadores reproducibles;
- corregir causa y fortalecer el esquema sin inventar datos.

## Preparación

```sql
USE master;
GO
IF DB_ID('LaboratorioU6Calidad') IS NULL
    CREATE DATABASE LaboratorioU6Calidad;
GO

USE LaboratorioU6Calidad;
GO
CREATE SCHEMA calidad AUTHORIZATION dbo;
GO

CREATE TABLE calidad.Cliente
(
    ClienteId int PRIMARY KEY,
    DNI varchar(20) NULL,
    Nombre nvarchar(100) NULL,
    Email varchar(256) NULL,
    PaisCodigo char(3) NULL,
    FechaNacimientoTexto varchar(20) NULL,
    FechaAlta date NOT NULL,
    FechaActualizacion datetime2 NOT NULL,
    Activo bit NOT NULL
);

CREATE TABLE calidad.Pedido
(
    PedidoId int PRIMARY KEY,
    ClienteId int NULL,
    FechaPedido date NOT NULL,
    FechaEntrega date NULL,
    TotalDeclarado decimal(12,2) NOT NULL
);

CREATE TABLE calidad.ItemPedido
(
    PedidoId int NOT NULL,
    Renglon int NOT NULL,
    Cantidad int NOT NULL,
    PrecioUnitario decimal(12,2) NOT NULL,
    CONSTRAINT PK_ItemPedido PRIMARY KEY (PedidoId, Renglon)
);

INSERT calidad.Cliente VALUES
(1,'30111222',N'Ana Pérez','ANA@EXAMPLE.TEST','ARG','1990-02-10','2025-01-10',SYSDATETIME(),1),
(2,'30111222',N'Ana Perez','ana@example.test','ARG','1990-02-10','2025-01-10',DATEADD(day,-500,SYSDATETIME()),1),
(3,NULL,N'Luis Gómez','',       'AR ', '31/02/1995','2025-03-01',SYSDATETIME(),1),
(4,'28999111',NULL,       'maria@example.test','URY','1985-05-20','2025-04-01',DATEADD(day,-20,SYSDATETIME()),1),
(5,'27777111',N'José Silva','jose@example.test','XXX','1977-09-08','2024-02-01',DATEADD(day,-900,SYSDATETIME()),0);

INSERT calidad.Pedido VALUES
(101,1,'2026-06-01','2026-05-31',150.00),
(102,3,'2026-06-02',NULL,200.00),
(103,99,'2026-06-03',NULL,50.00);

INSERT calidad.ItemPedido VALUES
(101,1,1,100.00),(101,2,1,40.00),(102,1,2,100.00),(103,1,1,50.00);
GO
```

## Parte 1 — Perfilado

```sql
SELECT
    COUNT(*) AS filas,
    SUM(CASE WHEN NULLIF(LTRIM(RTRIM(DNI)), '') IS NULL THEN 1 ELSE 0 END) AS dni_faltante,
    SUM(CASE WHEN NULLIF(LTRIM(RTRIM(Nombre)), '') IS NULL THEN 1 ELSE 0 END) AS nombre_faltante,
    SUM(CASE WHEN NULLIF(LTRIM(RTRIM(Email)), '') IS NULL THEN 1 ELSE 0 END) AS email_faltante
FROM calidad.Cliente;

SELECT DNI, COUNT(*) AS cantidad
FROM calidad.Cliente
WHERE DNI IS NOT NULL
GROUP BY DNI
HAVING COUNT(*) > 1;

SELECT ClienteId, PaisCodigo
FROM calidad.Cliente
WHERE PaisCodigo NOT IN ('ARG','URY','BRA');

SELECT ClienteId, FechaNacimientoTexto
FROM calidad.Cliente
WHERE FechaNacimientoTexto IS NOT NULL
  AND TRY_CONVERT(date, FechaNacimientoTexto, 23) IS NULL;
```

Preguntas:

1. ¿Qué hallazgo es completitud y cuál consistencia?
2. ¿El DNI duplicado prueba que existen dos personas iguales?
3. ¿Qué valores tienen forma válida pero podrían ser semánticamente falsos?
4. ¿Por qué `LIKE '%@%'` no demostraría exactitud del email?

## Parte 2 — Reglas entre tablas

```sql
-- Pedido sin cliente existente
SELECT p.*
FROM calidad.Pedido AS p
LEFT JOIN calidad.Cliente AS c ON c.ClienteId = p.ClienteId
WHERE c.ClienteId IS NULL;

-- Entrega anterior al pedido
SELECT *
FROM calidad.Pedido
WHERE FechaEntrega < FechaPedido;

-- Total declarado distinto de suma calculada
SELECT p.PedidoId, p.TotalDeclarado,
       SUM(i.Cantidad * i.PrecioUnitario) AS TotalCalculado
FROM calidad.Pedido AS p
JOIN calidad.ItemPedido AS i ON i.PedidoId = p.PedidoId
GROUP BY p.PedidoId, p.TotalDeclarado
HAVING p.TotalDeclarado <> SUM(i.Cantidad * i.PrecioUnitario);
```

Clasificá cada regla y explicá si una FK o `CHECK` puede prevenirla completamente.

## Parte 3 — Actualidad

Regla: un cliente activo debe haberse verificado durante los últimos 365 días.

```sql
SELECT ClienteId, FechaActualizacion
FROM calidad.Cliente
WHERE Activo = 1
  AND FechaActualizacion < DATEADD(day, -365, SYSDATETIME());

SELECT CAST(100.0 *
       SUM(CASE WHEN FechaActualizacion >= DATEADD(day,-365,SYSDATETIME()) THEN 1 ELSE 0 END)
       / NULLIF(COUNT(*),0) AS decimal(6,2)) AS actualidad_pct
FROM calidad.Cliente
WHERE Activo = 1;
```

Documentá alcance, numerador, denominador, instante, umbral propuesto y owner.

## Parte 4 — Plan de remediación

No ejecutes `UPDATE` arbitrarios. Para cada defecto completá:

| Regla | Filas | Impacto | Fuente autorizada | Corrección | Prevención | Owner |
|-------|-------|---------|-------------------|------------|------------|-------|
| DNI requerido | | | | | | |
| País de catálogo | | | | | | |
| Total reconciliado | | | | | | |

Después de verificar fuentes, los controles posibles son:

```sql
ALTER TABLE calidad.Pedido WITH CHECK
ADD CONSTRAINT FK_Pedido_Cliente
FOREIGN KEY (ClienteId) REFERENCES calidad.Cliente(ClienteId);

ALTER TABLE calidad.Pedido WITH CHECK
ADD CONSTRAINT CK_Pedido_Fechas
CHECK (FechaEntrega IS NULL OR FechaEntrega >= FechaPedido);
```

Los comandos fallarán mientras existan defectos. Esa falla es útil: demuestra que la base heredada no satisface todavía la regla. Corregí con evidencia y repetí.

## Entregable

Un informe con:

1. perfil y evidencia SQL;
2. característica ISO de cada hallazgo;
3. cinco reglas formalizadas;
4. métrica y umbral de tres reglas;
5. causa raíz probable y controles preventivo/detectivo/correctivo;
6. límites de la medición: qué no puede probar solo SQL.
