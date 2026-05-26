---
layout: default
title: Laboratorio — Niveles de aislamiento
parent: Teoría
grand_parent: Unidad 3
nav_order: 7
permalink: /unidad-3/practica/laboratorio-aislamiento/
---

[← Transacciones y concurrencia](/unidad-3/guias/transacciones-y-concurrencia/)

# Laboratorio — Niveles de aislamiento

Los laboratorios requieren **dos ventanas de consulta en SSMS** abiertas simultáneamente (cada ventana es una sesión independiente).

## Entorno

```sql
USE master;
GO

IF DB_ID('LabTransacciones') IS NULL
    CREATE DATABASE LabTransacciones;
GO

USE LabTransacciones;
GO

ALTER DATABASE LabTransacciones SET ALLOW_SNAPSHOT_ISOLATION OFF;
ALTER DATABASE LabTransacciones SET READ_COMMITTED_SNAPSHOT OFF;
GO

DROP TABLE IF EXISTS ddbba.cuentas;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'ddbba')
    EXEC('CREATE SCHEMA ddbba');
GO

CREATE TABLE ddbba.cuentas (
    cuenta_id   INT           PRIMARY KEY,
    titular     VARCHAR(50)   NOT NULL,
    saldo       DECIMAL(12,2) NOT NULL
);
GO

INSERT INTO ddbba.cuentas VALUES
    (1, 'Alice',   10000.00),
    (2, 'Bob',      5000.00),
    (3, 'Charlie',  2000.00);
GO
```

---

## LAB 1 — READ UNCOMMITTED: dirty read

**[SESIÓN A]** — modifica y espera sin confirmar:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 99999 WHERE cuenta_id = 1;
    WAITFOR DELAY '00:00:15';
ROLLBACK TRANSACTION;
GO
```

**[SESIÓN B]** — ejecutar mientras A espera:
```sql
-- Lee el dato no confirmado de A:
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 1;
-- Resultado: saldo = 99999  ← DIRTY READ (cuando A haga ROLLBACK, ese dato nunca existió)

-- Equivalente con hint de tabla (sin cambiar el nivel de la sesión):
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WITH (NOLOCK) WHERE cuenta_id = 1;

SET TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- restaurar
GO
```

---

## LAB 2 — READ COMMITTED: bloquea dirty reads, permite non-repeatable reads

**[SESIÓN A]** — modifica sin confirmar:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 88888 WHERE cuenta_id = 2;
    WAITFOR DELAY '00:00:15';
ROLLBACK TRANSACTION;
GO
```

**[SESIÓN B]** — dirty read bloqueado:
```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 2;
-- Esta consulta BLOQUEA hasta que A haga COMMIT o ROLLBACK.
-- Cuando A haga ROLLBACK, se verá el valor original. ✓
GO
```

**Non-repeatable read posible con READ COMMITTED** (dos sesiones):

**[SESIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION;
    SELECT saldo FROM ddbba.cuentas WHERE cuenta_id = 1;  -- primera lectura
    WAITFOR DELAY '00:00:10';
    SELECT saldo FROM ddbba.cuentas WHERE cuenta_id = 1;  -- puede diferir ← NON-REPEATABLE
COMMIT TRANSACTION;
GO
```

**[SESIÓN A]** — durante los 10 segundos:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 1111 WHERE cuenta_id = 1;
COMMIT TRANSACTION;
GO
```

---

## LAB 3 — REPEATABLE READ: evita non-repeatable, permite phantoms

**[SESIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
    SELECT cuenta_id, saldo FROM ddbba.cuentas WHERE saldo > 1000;
    -- S-locks sobre las filas leídas; se mantienen hasta COMMIT
    WAITFOR DELAY '00:00:15';
    SELECT cuenta_id, saldo FROM ddbba.cuentas WHERE saldo > 1000;
    -- Los valores son idénticos: los S-locks impiden que A los modifique ✓
COMMIT TRANSACTION;
GO
```

**[SESIÓN A]** — bloqueará hasta que B haga COMMIT:
```sql
UPDATE ddbba.cuentas SET saldo = 50 WHERE cuenta_id = 1;
GO
```

**Phantom read posible** (REPEATABLE READ no bloquea el rango):

**[SESIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
    SELECT COUNT(*) AS total FROM ddbba.cuentas;  -- ej: 3
    WAITFOR DELAY '00:00:10';
    SELECT COUNT(*) AS total FROM ddbba.cuentas;  -- puede ser 4 ← PHANTOM
COMMIT TRANSACTION;
GO
```

**[SESIÓN A]**
```sql
INSERT INTO ddbba.cuentas VALUES (4, 'Diana', 3000);  -- autocommit
GO
DELETE FROM ddbba.cuentas WHERE cuenta_id = 4;         -- limpiar
GO
```

> **Clave:** REPEATABLE READ piensa en filas individuales. SERIALIZABLE piensa en rangos.

---

## LAB 4 — SERIALIZABLE: range locks, evita los tres problemas

**[SESIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;
    SELECT COUNT(*) AS total FROM ddbba.cuentas;  -- 3
    -- Range lock: ninguna fila nueva puede insertarse en este rango
    WAITFOR DELAY '00:00:15';
    SELECT COUNT(*) AS total FROM ddbba.cuentas;  -- sigue siendo 3 ✓
COMMIT TRANSACTION;
GO
```

**[SESIÓN A]** — bloqueará hasta que B haga COMMIT:
```sql
INSERT INTO ddbba.cuentas VALUES (5, 'Eva', 1500);
GO
DELETE FROM ddbba.cuentas WHERE cuenta_id = 5;
GO
```

> **Costo:** los range locks pueden bloquear toda la tabla. Para OLTP con alta concurrencia, considerar SNAPSHOT.

---

## LAB 5 — SNAPSHOT: versionado, lectores y escritores no se bloquean

```sql
ALTER DATABASE LabTransacciones SET ALLOW_SNAPSHOT_ISOLATION ON;
GO
```

**[SESIÓN A]** — escritura larga sin confirmar:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 77777 WHERE cuenta_id = 1;
    WAITFOR DELAY '00:00:20';
ROLLBACK TRANSACTION;
GO
```

**[SESIÓN B]** — lee sin bloquearse:
```sql
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRANSACTION;
    SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 1;
    -- Ve el valor ANTES del UPDATE de A (snapshot al inicio de la TX)
    WAITFOR DELAY '00:00:05';
    SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 1;
    -- Sigue mostrando el valor antiguo (consistente con el inicio de la TX) ✓
COMMIT TRANSACTION;
GO
```

**Conflicto de escritura en SNAPSHOT (error 3960):**

```sql
-- Si dos transacciones SNAPSHOT modifican la misma fila, la segunda falla.
-- Gana quien hace COMMIT primero; la otra recibe: Snapshot isolation transaction
-- aborted due to update conflict (error 3960).
```

---

## LAB 6 — RCSI: READ_COMMITTED_SNAPSHOT

RCSI cambia el comportamiento de `READ COMMITTED` para **todas** las conexiones sin que el código de aplicación deba modificarse.

```sql
ALTER DATABASE LabTransacciones SET READ_COMMITTED_SNAPSHOT ON;
GO
```

**[SESIÓN A]** — escribe sin confirmar:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 55555 WHERE cuenta_id = 3;
    WAITFOR DELAY '00:00:15';
ROLLBACK TRANSACTION;
GO
```

**[SESIÓN B]** — sin ningún `SET` especial:
```sql
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 3;
-- NO se bloquea. Ve el último valor CONFIRMADO (no 55555). ✓
-- Sin RCSI, esta consulta habría esperado que A terminara.
GO
```

| | SNAPSHOT | RCSI |
|--|----------|------|
| Versión que lee | La del inicio de su transacción | La del último COMMIT al momento de cada sentencia |
| Activación | `SET TRANSACTION ISOLATION LEVEL SNAPSHOT` por sesión | `ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON`, transparente |
| Lecturas repetibles | Sí | No (cada sentencia puede ver datos más nuevos) |

> RCSI es la opción con mejor relación costo/beneficio para sistemas OLTP existentes: elimina la mayoría de los bloqueos lector-escritor **sin tocar una sola línea del código de aplicación**.
