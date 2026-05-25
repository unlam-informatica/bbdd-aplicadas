---
layout: default
title: Transacciones y concurrencia
parent: Unidad 3
nav_order: 3
permalink: /unidad-3/guias/transacciones-y-concurrencia/
---

[← Unidad 3](../)

# Transacciones y concurrencia

Guía de laboratorio completa con los niveles de aislamiento de SQL Server. Cada sección demuestra un concepto mediante código reproducible en múltiples ventanas de SSMS (una ventana = una sesión independiente).

---

## Entorno del laboratorio

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

DROP TABLE IF EXISTS ddbba.auditoria_transacciones;
DROP TABLE IF EXISTS ddbba.cuentas;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'ddbba')
    EXEC('CREATE SCHEMA ddbba');
GO

CREATE TABLE ddbba.cuentas (
    cuenta_id          INT            PRIMARY KEY,
    titular            VARCHAR(50)    NOT NULL,
    saldo              DECIMAL(12,2)  NOT NULL,
    ultima_actualizacion DATETIME2    DEFAULT SYSDATETIME()
);
GO

CREATE TABLE ddbba.auditoria_transacciones (
    log_id   INT IDENTITY(1,1) PRIMARY KEY,
    evento   VARCHAR(200),
    momento  DATETIME2 DEFAULT SYSDATETIME()
);
GO

INSERT INTO ddbba.cuentas (cuenta_id, titular, saldo) VALUES
    (1, 'Alice',   10000.00),
    (2, 'Bob',      5000.00),
    (3, 'Charlie',  2000.00);
GO

SELECT * FROM ddbba.cuentas;
-- Alice=10000, Bob=5000, Charlie=2000
GO
```

---

## LAB 1 · BEGIN / COMMIT / ROLLBACK

### Commit exitoso

```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = saldo - 500 WHERE cuenta_id = 1; -- Alice -500
    UPDATE ddbba.cuentas SET saldo = saldo + 500 WHERE cuenta_id = 2; -- Bob   +500
    INSERT INTO ddbba.auditoria_transacciones (evento)
        VALUES ('Transferencia Alice->Bob $500');
COMMIT TRANSACTION;

-- Verificar: Alice=9500, Bob=5500
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas;
GO
```

### Rollback explícito

```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = saldo - 9999 WHERE cuenta_id = 1;

    -- Ver el estado DENTRO de la transacción (no confirmado)
    SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 1;
    -- Alice muestra saldo negativo aquí (dentro de la TX)

ROLLBACK TRANSACTION;

-- El cambio fue revertido
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 1;
-- Alice vuelve a 9500
GO
```

### ROLLBACK automático por error

```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 1000 WHERE cuenta_id = 2;
    -- Error forzado: NULL en columna NOT NULL
    INSERT INTO ddbba.cuentas (cuenta_id, titular, saldo) VALUES (99, NULL, 0);
    -- Si el error es grave (batch-aborting) SQL revierte implícitamente.
    -- Si no, la transacción queda ABIERTA y hay que cerrarla manualmente.
ROLLBACK TRANSACTION;
GO
```

---

## LAB 1b · Modos de transacción

SQL Server tiene tres modos de manejo de transacciones:

| Modo | Cómo inicia la TX | Cómo termina la TX |
|------|-------------------|--------------------|
| **AUTOCOMMIT** (default) | Automáticamente por sentencia | Automáticamente al finalizar cada sentencia |
| **EXPLÍCITO** | `BEGIN TRANSACTION` | `COMMIT` o `ROLLBACK` explícito |
| **IMPLÍCITO** | Automáticamente ante DML/DDL | `COMMIT` o `ROLLBACK` explícito (obligatorio) |

### Autocommit

```sql
-- Cada sentencia es su propia transacción. Sin BEGIN TRANSACTION activo.
UPDATE ddbba.cuentas SET saldo = saldo + 0 WHERE cuenta_id = 1; -- TX #1, auto-commit
UPDATE ddbba.cuentas SET saldo = saldo + 0 WHERE cuenta_id = 2; -- TX #2, auto-commit

SELECT @@TRANCOUNT AS transacciones_activas; -- 0

-- Riesgo: si se necesita atomicidad entre dos sentencias, autocommit no alcanza.
-- Si la segunda falla, la primera ya está confirmada.
GO
```

### Implícito

```sql
SET IMPLICIT_TRANSACTIONS ON;

-- SQL Server abre una TX implícita automáticamente:
UPDATE ddbba.cuentas SET saldo = saldo + 0 WHERE cuenta_id = 1;

SELECT @@TRANCOUNT AS transacciones_activas; -- 1 (abierta implícitamente)

UPDATE ddbba.cuentas SET saldo = saldo + 0 WHERE cuenta_id = 2;
SELECT @@TRANCOUNT AS transacciones_activas; -- Sigue siendo 1

-- La TX no se cierra sola: HAY QUE hacer COMMIT o ROLLBACK.
COMMIT TRANSACTION;
SELECT @@TRANCOUNT AS transacciones_activas; -- 0

-- Riesgo: olvidar el COMMIT deja locks abiertos bloqueando a otras sesiones.
ROLLBACK TRANSACTION;

SET IMPLICIT_TRANSACTIONS OFF;
GO

-- Consultar el modo de la sesión actual:
SELECT s.session_id,
       s.implicit_transaction_mode AS modo_implicito, -- 1=ON, 0=OFF
       s.transaction_isolation_level,
       @@TRANCOUNT AS tran_count
FROM   sys.dm_exec_sessions s
WHERE  session_id = @@SPID;
GO
```

> **Recomendación de producción:** usar siempre el modo EXPLÍCITO (`BEGIN TRANSACTION`) para operaciones que requieran atomicidad. Evitar el modo IMPLÍCITO en código nuevo: es fuente frecuente de bugs por transacciones olvidadas y locks no liberados.

---

## LAB 2 · SAVEPOINTs

Un savepoint permite hacer rollback parcial dentro de una transacción activa sin cancelarla por completo.

```sql
BEGIN TRANSACTION;

    UPDATE ddbba.cuentas SET saldo = saldo + 100 WHERE cuenta_id = 3; -- Charlie +100
    SAVE TRANSACTION punto_a;

    UPDATE ddbba.cuentas SET saldo = saldo + 200 WHERE cuenta_id = 3; -- Charlie +200
    SAVE TRANSACTION punto_b;

    UPDATE ddbba.cuentas SET saldo = saldo + 9999 WHERE cuenta_id = 3; -- Error lógico

    -- Revertir SOLO hasta punto_b (deshace el +9999)
    ROLLBACK TRANSACTION punto_b;

    -- Charlie: 2000 + 100 + 200 = 2300
    SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 3;

COMMIT TRANSACTION;

SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id = 3;
-- Charlie = 2300
GO
```

> `ROLLBACK TRANSACTION punto_b` revierte hasta ese marcador pero **no cierra** la transacción. El `COMMIT` final confirma los cambios previos al savepoint.

---

## LAB 3 · Transacciones anidadas y @@TRANCOUNT

SQL Server permite anidado sintáctico, pero solo el **ROLLBACK más externo** revierte todo. Los `COMMIT` internos solo decrementan `@@TRANCOUNT`.

```sql
SELECT @@TRANCOUNT AS nivel; -- 0

BEGIN TRANSACTION tx_outer;
    SELECT @@TRANCOUNT AS nivel; -- 1
    UPDATE ddbba.cuentas SET saldo = saldo + 10 WHERE cuenta_id = 1;

    BEGIN TRANSACTION tx_inner;
        SELECT @@TRANCOUNT AS nivel; -- 2
        UPDATE ddbba.cuentas SET saldo = saldo + 20 WHERE cuenta_id = 2;

    COMMIT TRANSACTION tx_inner;   -- Decrementa @@TRANCOUNT a 1, NO confirma en disco
    SELECT @@TRANCOUNT AS nivel; -- 1

ROLLBACK TRANSACTION tx_outer;    -- Revierte AMBAS operaciones (inner + outer)
SELECT @@TRANCOUNT AS nivel; -- 0

-- Verificar: ninguno de los +10 ni +20 se guardó
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas WHERE cuenta_id IN (1, 2);
GO
```

---

## LAB 4 · Manejo de errores con TRY / CATCH

Patrón recomendado para stored procedures en producción:

```sql
CREATE OR ALTER PROCEDURE ddbba.transferir_fondos
    @origen    INT,
    @destino   INT,
    @monto     DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;

    IF @monto <= 0
        THROW 50001, 'El monto debe ser mayor a cero.', 1;

    BEGIN TRANSACTION;
    BEGIN TRY
        UPDATE ddbba.cuentas
        SET    saldo = saldo - @monto
        WHERE  cuenta_id = @origen;

        IF (SELECT saldo FROM ddbba.cuentas WHERE cuenta_id = @origen) < 0
            THROW 50002, 'Saldo insuficiente.', 1;

        UPDATE ddbba.cuentas
        SET    saldo = saldo + @monto
        WHERE  cuenta_id = @destino;

        INSERT INTO ddbba.auditoria_transacciones (evento)
            VALUES (CONCAT('Transferencia cuenta ', @origen,
                           ' -> ', @destino, ' $', @monto));

        COMMIT TRANSACTION;
        PRINT 'Transferencia completada con éxito.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @msg NVARCHAR(500) = ERROR_MESSAGE();
        DECLARE @num INT           = ERROR_NUMBER();
        PRINT CONCAT('ERROR (', @num, '): ', @msg);
        THROW;
    END CATCH;
END;
GO

-- Prueba 1: Transferencia válida
EXEC ddbba.transferir_fondos @origen = 1, @destino = 2, @monto = 200;
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas;
GO

-- Prueba 2: Saldo insuficiente (hace ROLLBACK)
EXEC ddbba.transferir_fondos @origen = 3, @destino = 1, @monto = 99999;
SELECT cuenta_id, titular, saldo FROM ddbba.cuentas;
GO

-- Prueba 3: Monto inválido
EXEC ddbba.transferir_fondos @origen = 1, @destino = 2, @monto = -50;
GO
```

> El patrón correcto es: `BEGIN TRANSACTION` antes del `BEGIN TRY`, y verificar `@@TRANCOUNT > 0` en el `CATCH` antes de hacer `ROLLBACK`.

---

## LAB 5 · READ UNCOMMITTED — Dirty Read

**Escenario:** Conexión A modifica datos sin confirmar. Conexión B lee esos datos sucios. Cuando A hace ROLLBACK, B ya vio datos que nunca existieron.

**[CONEXIÓN A]**
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 99999 WHERE cuenta_id = 1;
    WAITFOR DELAY '00:00:15'; -- 15 segundos sin COMMIT
ROLLBACK TRANSACTION;
GO
```

**[CONEXIÓN B]** — ejecutar mientras A espera:
```sql
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT cuenta_id, titular, saldo
FROM   ddbba.cuentas
WHERE  cuenta_id = 1;
-- Resultado: saldo = 99999  ← DIRTY READ (dato no confirmado)
-- Cuando A haga ROLLBACK, ese dato nunca existió.
GO

-- Equivalente con hint de tabla:
SELECT cuenta_id, titular, saldo
FROM   ddbba.cuentas WITH (NOLOCK)
WHERE  cuenta_id = 1;
GO

-- Volver al nivel por defecto:
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
GO
```

---

## LAB 6 · READ COMMITTED — Non-Repeatable Read

READ COMMITTED (nivel por defecto) **evita** dirty reads pero **permite** non-repeatable reads.

### Dirty read evitado

**[CONEXIÓN A]**
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 88888 WHERE cuenta_id = 2;
    WAITFOR DELAY '00:00:15';
ROLLBACK TRANSACTION;
GO
```

**[CONEXIÓN B]** — ejecutar mientras A espera:
```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT cuenta_id, titular, saldo
FROM   ddbba.cuentas
WHERE  cuenta_id = 2;
-- Esta consulta BLOQUEA hasta que A haga COMMIT o ROLLBACK.
-- Cuando A haga ROLLBACK, se verá el valor original. ✓
GO
```

### Non-Repeatable Read posible

**[CONEXIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION;
    SELECT saldo FROM ddbba.cuentas WHERE cuenta_id = 1; -- Primera lectura
    WAITFOR DELAY '00:00:10';
    SELECT saldo FROM ddbba.cuentas WHERE cuenta_id = 1; -- Segunda lectura: puede diferir
    -- Si A hizo COMMIT entre ambas lecturas → NON-REPEATABLE READ
COMMIT TRANSACTION;
GO
```

**[CONEXIÓN A]** — durante los 10 segundos:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 1111 WHERE cuenta_id = 1;
COMMIT TRANSACTION;
GO
```

---

## LAB 7 · REPEATABLE READ

REPEATABLE READ **evita** dirty reads y non-repeatable reads, pero **permite** phantom reads.

### Non-Repeatable Read evitado

**[CONEXIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
    SELECT cuenta_id, saldo FROM ddbba.cuentas WHERE saldo > 1000;
    -- S-locks sobre las filas leídas; se mantienen hasta COMMIT

    WAITFOR DELAY '00:00:15';

    SELECT cuenta_id, saldo FROM ddbba.cuentas WHERE saldo > 1000;
    -- Los valores son idénticos: los S-locks impiden que A modifique esas filas ✓
COMMIT TRANSACTION;
GO
```

**[CONEXIÓN A]** — durante los 15 segundos:
```sql
-- BLOQUEARÁ hasta que B haga COMMIT:
UPDATE ddbba.cuentas SET saldo = 50 WHERE cuenta_id = 1;
GO
```

### Phantom Read posible

**[CONEXIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
    SELECT COUNT(*) AS total_cuentas FROM ddbba.cuentas; -- Ej: 3
    WAITFOR DELAY '00:00:10';
    SELECT COUNT(*) AS total_cuentas FROM ddbba.cuentas; -- Puede ser 4 (Phantom!)
COMMIT TRANSACTION;
GO
```

**[CONEXIÓN A]** — durante los 10 segundos:
```sql
-- REPEATABLE READ no bloquea el rango, solo las filas existentes:
INSERT INTO ddbba.cuentas (cuenta_id, titular, saldo) VALUES (4, 'Diana', 3000);
GO -- autocommit

DELETE FROM ddbba.cuentas WHERE cuenta_id = 4; -- limpiar
GO
```

> **Clave:** REPEATABLE READ piensa en filas individuales. SERIALIZABLE piensa en rangos. Para condiciones de tipo `COUNT(*)`, `WHERE saldo > X` o cualquier rango, REPEATABLE READ no alcanza.

---

## LAB 8 · SERIALIZABLE

SERIALIZABLE evita los tres fenómenos aplicando **range locks** sobre el conjunto de datos cubierto por la consulta.

**[CONEXIÓN B]**
```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;
    SELECT COUNT(*) AS total_cuentas FROM ddbba.cuentas; -- 3
    -- Range lock: ninguna fila nueva puede insertarse en este rango
    WAITFOR DELAY '00:00:15';
    SELECT COUNT(*) AS total_cuentas FROM ddbba.cuentas; -- Sigue siendo 3 ✓
COMMIT TRANSACTION;
GO
```

**[CONEXIÓN A]** — durante los 15 segundos:
```sql
-- BLOQUEARÁ hasta que B haga COMMIT:
INSERT INTO ddbba.cuentas (cuenta_id, titular, saldo) VALUES (5, 'Eva', 1500);
GO

DELETE FROM ddbba.cuentas WHERE cuenta_id = 5; -- limpiar
GO
```

> **Costo:** los range locks pueden ser muy amplios. Un `SELECT COUNT(*) FROM cuentas` sin filtro puede bloquear inserciones en toda la tabla. Mayor probabilidad de deadlocks en sistemas de alta concurrencia. Para OLTP con mucha concurrencia, considerar SNAPSHOT en su lugar.

---

## LAB 9 · SNAPSHOT

SNAPSHOT usa **versionado de filas en TempDB** en lugar de locks de lectura. Lectores y escritores no se bloquean entre sí.

### Habilitar SNAPSHOT

```sql
ALTER DATABASE LabTransacciones SET ALLOW_SNAPSHOT_ISOLATION ON;
GO
```

### Lecturas sin bloqueo

**[CONEXIÓN A]** — escritura larga sin COMMIT:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 77777 WHERE cuenta_id = 1;
    WAITFOR DELAY '00:00:20';
ROLLBACK TRANSACTION;
GO
```

**[CONEXIÓN B]** — lee sin bloquearse:
```sql
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRANSACTION;
    SELECT cuenta_id, titular, saldo
    FROM   ddbba.cuentas
    WHERE  cuenta_id = 1;
    -- Verá el valor ANTES del UPDATE de A (versión al inicio de la TX)
    WAITFOR DELAY '00:00:05';
    SELECT cuenta_id, titular, saldo
    FROM   ddbba.cuentas
    WHERE  cuenta_id = 1;
    -- Sigue mostrando el valor antiguo (consistente con el inicio de la TX)
COMMIT TRANSACTION;
GO
```

### Conflicto de escritura (error 3960)

Si dos transacciones SNAPSHOT intentan modificar la misma fila, la segunda falla.

**[CONEXIÓN A]** — gana quien hace COMMIT primero:
```sql
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRANSACTION;
    SELECT saldo FROM ddbba.cuentas WHERE cuenta_id = 2;
    WAITFOR DELAY '00:00:10';
    UPDATE ddbba.cuentas SET saldo = saldo + 100 WHERE cuenta_id = 2;
    -- ERROR 3960: Snapshot isolation transaction aborted due to update conflict
COMMIT TRANSACTION;
GO
```

**[CONEXIÓN B]** — ejecutar durante los 10 segundos de A:
```sql
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRANSACTION;
    SELECT saldo FROM ddbba.cuentas WHERE cuenta_id = 2;
    UPDATE ddbba.cuentas SET saldo = saldo + 200 WHERE cuenta_id = 2;
    -- B hace COMMIT primero → A recibe el error 3960
COMMIT TRANSACTION;
GO
```

> **Regla:** gana quien hace COMMIT primero. El perdedor es la transacción que intenta escribir sobre una fila modificada por otra transacción **después** de que empezó su snapshot.

---

## LAB 10 · RCSI (READ_COMMITTED_SNAPSHOT)

RCSI es una opción de base de datos que cambia el comportamiento interno de READ COMMITTED para **todas** las conexiones, sin que el código de aplicación deba modificarse.

```sql
-- [CONEXIÓN A] Habilitar RCSI (requiere uso exclusivo de la DB)
ALTER DATABASE LabTransacciones SET READ_COMMITTED_SNAPSHOT ON;
GO
```

**[CONEXIÓN A]** — escritura sin confirmar:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = 55555 WHERE cuenta_id = 3;
    WAITFOR DELAY '00:00:15';
ROLLBACK TRANSACTION;
GO
```

**[CONEXIÓN B]** — sin SET especial (usa READ COMMITTED):
```sql
SELECT cuenta_id, titular, saldo
FROM   ddbba.cuentas
WHERE  cuenta_id = 3;
-- NO se bloquea. Ve el último valor CONFIRMADO (no 55555).
-- Sin RCSI, esta consulta habría esperado que A terminara.
GO
```

| | SNAPSHOT | RCSI |
|--|----------|------|
| Versión que lee | La del inicio de su transacción | La del último COMMIT al momento de cada sentencia |
| Activación | `SET TRANSACTION ISOLATION LEVEL SNAPSHOT` por sesión | `ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON`, transparente para las sesiones |
| Lecturas repetibles | Sí | No (cada sentencia puede ver datos más nuevos) |

> RCSI es la opción con mejor relación costo/beneficio para sistemas OLTP existentes: elimina la mayoría de los bloqueos lector-escritor **sin tocar una sola línea del código de aplicación**.

---

## LAB 11 · Deadlocks

Un deadlock ocurre cuando dos sesiones se bloquean mutuamente. SQL Server lo detecta en segundos y termina una de ellas (la víctima recibe error **1205**).

**[CONEXIÓN A]**
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 1; -- Lock en fila 1
    WAITFOR DELAY '00:00:05';
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 2; -- Espera fila 2 → DEADLOCK
COMMIT TRANSACTION;
GO
```

**[CONEXIÓN B]** — ejecutar inmediatamente después de A:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 2; -- Lock en fila 2
    WAITFOR DELAY '00:00:05';
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 1; -- Espera fila 1 → DEADLOCK
    -- SQL Server mata a la sesión con menor costo → Error 1205
COMMIT TRANSACTION;
GO
```

### Detección via system_health

```sql
SELECT  xdr.value('@timestamp', 'datetime2') AS fecha_deadlock,
        xdr.query('.')                        AS detalle_xml
FROM (
    SELECT CAST(target_data AS XML) AS TargetData
    FROM   sys.dm_xe_session_targets t
    JOIN   sys.dm_xe_sessions        s ON s.address = t.event_session_address
    WHERE  s.name        = 'system_health'
    AND    t.target_name = 'ring_buffer'
) AS data
CROSS APPLY TargetData.nodes('//RingBufferTarget/event[@name="xml_deadlock_report"]') AS XEventData(xdr)
ORDER BY fecha_deadlock DESC;
GO
```

### Prevención de deadlocks

1. Acceder a las tablas/filas siempre en el **mismo orden** en todas las transacciones.
2. Mantener transacciones lo más **cortas** posible.
3. Usar **índices adecuados** para reducir el rango de bloqueo.
4. Considerar SNAPSHOT/RCSI para eliminar bloqueos de lectura.
5. Usar `SET DEADLOCK_PRIORITY LOW` para designar la víctima preferida.

---

## LAB 12 · Resumen comparativo

| Nivel de aislamiento | Dirty Read | Non-Repeatable Read | Phantom Read | Bloqueos de lectura |
|----------------------|------------|---------------------|--------------|---------------------|
| READ UNCOMMITTED | Posible | Posible | Posible | Ninguno |
| READ COMMITTED (default) | Evitado ✓ | Posible | Posible | S-lock (libera por sentencia) |
| REPEATABLE READ | Evitado ✓ | Evitado ✓ | Posible | S-lock (mantiene hasta COMMIT) |
| SERIALIZABLE | Evitado ✓ | Evitado ✓ | Evitado ✓ | Range lock |
| SNAPSHOT | Evitado ✓ | Evitado ✓ | Evitado ✓ | No (versionado) |
| RCSI | Evitado ✓ | Posible | Posible | No (versionado) |

### Queries de diagnóstico

```sql
-- Ver nivel de aislamiento de la sesión actual:
SELECT CASE transaction_isolation_level
           WHEN 1 THEN 'READ UNCOMMITTED'
           WHEN 2 THEN 'READ COMMITTED'
           WHEN 3 THEN 'REPEATABLE READ'
           WHEN 4 THEN 'SERIALIZABLE'
           WHEN 5 THEN 'SNAPSHOT'
       END AS nivel_aislamiento
FROM   sys.dm_exec_sessions
WHERE  session_id = @@SPID;
GO

-- Ver locks activos en la base de datos:
SELECT  request_session_id,
        resource_type,
        resource_description,
        request_mode,
        request_status
FROM    sys.dm_tran_locks
WHERE   resource_database_id = DB_ID('LabTransacciones')
ORDER BY request_session_id;
GO

-- Ver transacciones activas:
SELECT  s.session_id,
        s.login_name,
        s.status,
        t.transaction_begin_time,
        t.transaction_type,
        t.transaction_state
FROM    sys.dm_exec_sessions               s
JOIN    sys.dm_tran_session_transactions   st ON st.session_id     = s.session_id
JOIN    sys.dm_tran_active_transactions    t  ON t.transaction_id  = st.transaction_id
WHERE   s.session_id <> @@SPID;
GO
```
