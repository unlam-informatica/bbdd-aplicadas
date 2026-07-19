---
layout: default
title: Laboratorio — Seguridad y permisos
parent: Práctica
grand_parent: Unidad 5
nav_order: 1
permalink: /unidad-5/practica/laboratorio-seguridad/
---

[← Unidad 5](../../)

# Laboratorio — Seguridad, roles y permisos

El objetivo es comprobar permisos efectivos, no limitarse a ejecutar `GRANT`.

{: .warning }
Ejecutar únicamente en una instancia de laboratorio. Crear logins requiere privilegios de servidor. Sustituir contraseñas de ejemplo y no reutilizarlas.

## Escenario

Una empresa necesita:

- vendedores que consulten clientes visibles y registren pedidos mediante un procedimiento;
- auditores que consulten pedidos, pero no los modifiquen;
- supervisores que administren datos del esquema `ventas`;
- ninguna cuenta funcional debe ser `db_owner`.

## Preparación

```sql
USE master;
GO
IF DB_ID('LaboratorioU5') IS NULL
    CREATE DATABASE LaboratorioU5;
GO

USE LaboratorioU5;
GO
CREATE SCHEMA ventas AUTHORIZATION dbo;
GO
CREATE SCHEMA operaciones AUTHORIZATION dbo;
GO

CREATE TABLE ventas.Cliente
(
    ClienteId int IDENTITY PRIMARY KEY,
    Nombre nvarchar(100) NOT NULL,
    Email varchar(256) NULL,
    LimiteCuenta decimal(18,2) NOT NULL,
    Pais char(3) NOT NULL,
    Activo bit NOT NULL DEFAULT 1
);

CREATE TABLE ventas.Pedido
(
    PedidoId int IDENTITY PRIMARY KEY,
    ClienteId int NOT NULL REFERENCES ventas.Cliente(ClienteId),
    Fecha datetime2 NOT NULL DEFAULT SYSDATETIME(),
    Importe decimal(18,2) NOT NULL CHECK (Importe > 0),
    Estado varchar(20) NOT NULL DEFAULT 'NUEVO'
);

INSERT ventas.Cliente(Nombre, Email, LimiteCuenta, Pais)
VALUES (N'Darth Vader', 'vader@example.test', 10000, 'ARG'),
       (N'Mace Windu', 'mace@example.test', 8000, 'ARG'),
       (N'Darth Maul', 'maul@example.test', 6000, 'USA');
GO
```

## Parte 1 — Login y user

```sql
USE master;
GO
CREATE LOGIN login_vendedor_u5
WITH PASSWORD = 'Cambiar_Vendedor_U5_2026!', CHECK_POLICY = ON;
CREATE LOGIN login_auditor_u5
WITH PASSWORD = 'Cambiar_Auditor_U5_2026!', CHECK_POLICY = ON;
CREATE LOGIN login_supervisor_u5
WITH PASSWORD = 'Cambiar_Supervisor_U5_2026!', CHECK_POLICY = ON;
GO

USE LaboratorioU5;
GO
CREATE USER usr_vendedor FOR LOGIN login_vendedor_u5
WITH DEFAULT_SCHEMA = ventas;
CREATE USER usr_auditor FOR LOGIN login_auditor_u5;
CREATE USER usr_supervisor FOR LOGIN login_supervisor_u5;
GO
```

### Preguntas

1. ¿Puede alguno ejecutar `SELECT * FROM ventas.Cliente` inmediatamente?
2. ¿Qué creó `DEFAULT_SCHEMA` y qué permiso otorgó?
3. ¿En qué catálogo aparecen logins y users?

```sql
SELECT name, type_desc FROM sys.server_principals
WHERE name LIKE 'login_%_u5';

USE LaboratorioU5;
SELECT name, type_desc, default_schema_name
FROM sys.database_principals
WHERE name LIKE 'usr_%';
```

## Parte 2 — Roles funcionales

```sql
CREATE ROLE rol_vendedores AUTHORIZATION dbo;
CREATE ROLE rol_auditores AUTHORIZATION dbo;
CREATE ROLE rol_supervisores AUTHORIZATION dbo;

ALTER ROLE rol_vendedores ADD MEMBER usr_vendedor;
ALTER ROLE rol_auditores ADD MEMBER usr_auditor;
ALTER ROLE rol_supervisores ADD MEMBER usr_supervisor;

GRANT SELECT ON OBJECT::ventas.Pedido TO rol_auditores;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::ventas TO rol_supervisores;
```

Comprobar:

```sql
EXECUTE AS USER = 'usr_auditor';
SELECT * FROM ventas.Pedido;       -- permitido
SELECT * FROM ventas.Cliente;      -- debería fallar
SELECT * FROM fn_my_permissions('ventas.Pedido', 'OBJECT');
REVERT;
```

## Parte 3 — Vista que oculta datos

```sql
CREATE OR ALTER VIEW ventas.ClientesVisibles
AS
SELECT ClienteId, Nombre, Email, Pais
FROM ventas.Cliente
WHERE Activo = 1 AND Pais <> 'USA';
GO

GRANT SELECT ON OBJECT::ventas.ClientesVisibles TO rol_vendedores;
```

```sql
EXECUTE AS USER = 'usr_vendedor';
SELECT * FROM ventas.ClientesVisibles; -- permitido
SELECT * FROM ventas.Cliente;          -- no permitido
REVERT;
```

Explicar:

- qué columnas y filas quedan ocultas;
- por qué funciona el ownership chain;
- por qué esto no equivale a cifrar `LimiteCuenta`.

## Parte 4 — Procedimiento como interfaz

```sql
CREATE OR ALTER PROCEDURE operaciones.RegistrarPedido
    @ClienteId int,
    @Importe decimal(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    IF @Importe <= 0
        THROW 50001, 'El importe debe ser positivo.', 1;

    INSERT ventas.Pedido(ClienteId, Importe)
    VALUES (@ClienteId, @Importe);

    SELECT SCOPE_IDENTITY() AS PedidoId;
END;
GO

GRANT EXECUTE ON OBJECT::operaciones.RegistrarPedido TO rol_vendedores;
```

```sql
EXECUTE AS USER = 'usr_vendedor';
EXEC operaciones.RegistrarPedido @ClienteId = 1, @Importe = 1250;
INSERT ventas.Pedido(ClienteId, Importe) VALUES (1, 999); -- debería fallar
REVERT;
```

## Parte 5 — `REVOKE` y `DENY`

```sql
GRANT SELECT ON OBJECT::ventas.Cliente TO rol_auditores;
GRANT SELECT ON SCHEMA::ventas TO usr_auditor;

REVOKE SELECT ON OBJECT::ventas.Cliente FROM rol_auditores;
-- usr_auditor todavía puede heredar SELECT desde el permiso de esquema directo.

DENY SELECT ON OBJECT::ventas.Cliente TO usr_auditor;
-- ahora el DENY explícito debe impedir la lectura normal.
```

Verificar con `EXECUTE AS` y luego eliminar el `DENY`:

```sql
REVOKE SELECT ON OBJECT::ventas.Cliente FROM usr_auditor;
```

La última sentencia revoca el `DENY`; no vuelve a conceder nada.

## Parte 6 — Auditoría

Resolver consultas para:

1. listar membresías de los tres roles;
2. listar permisos de base, esquema y objeto sin perder los que no pertenecen a `sys.objects`;
3. mostrar propietarios de los esquemas;
4. comprobar con `HAS_PERMS_BY_NAME` si cada usuario puede `SELECT`, `INSERT` y `DELETE`;
5. explicar por qué consultar solo `sys.database_permissions` no entrega siempre el permiso efectivo completo.

## Parte 7 — Delegación controlada

```sql
GRANT SELECT ON OBJECT::ventas.Pedido
TO usr_supervisor WITH GRANT OPTION;
```

Simular que el supervisor concede a otro user de laboratorio y luego intentar:

```sql
REVOKE SELECT ON OBJECT::ventas.Pedido FROM usr_supervisor;
```

Observar el error y evaluar `CASCADE`. Documentar a quién se le revoca antes de usarlo.

## Desafíos

1. Crear `rol_operador_backup` y decidir si usar rol fijo o permiso granular.
2. Impedir a vendedores ver pedidos ajenos sin crear una vista por vendedor.
3. Investigar cómo firmar un procedimiento que necesita permisos adicionales sin otorgarlos al caller.
4. Construir una matriz de acceso final y demostrar cada celda con una prueba.

