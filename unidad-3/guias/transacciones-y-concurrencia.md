---
layout: default
title: Transacciones y concurrencia
parent: Teoría
grand_parent: Unidad 3
nav_order: 3
permalink: /unidad-3/guias/transacciones-y-concurrencia/
---

# Transacciones y concurrencia en SQL Server

Una **transacción** es una unidad lógica de trabajo compuesta por una o más operaciones SQL que se ejecutan como un bloque indivisible: o todas tienen éxito (`COMMIT`) o ninguna se aplica (`ROLLBACK`). Es el mecanismo que garantiza las propiedades ACID.

---

## Modos de transacción

| Modo | Cómo inicia | Cómo termina |
|------|-------------|--------------|
| **Autocommit** *(defecto)* | Automáticamente por sentencia | Al finalizar cada sentencia |
| **Explícito** | `BEGIN TRANSACTION` | `COMMIT` o `ROLLBACK` explícito |
| **Implícito** | Automáticamente ante cualquier DML/DDL | `COMMIT` o `ROLLBACK` explícito (obligatorio) |

### Autocommit

Cada sentencia es su propia transacción. No hay `BEGIN TRANSACTION` activo.

```sql
UPDATE cuentas SET saldo = saldo + 0 WHERE cuenta_id = 1;  -- TX #1, auto-commit
UPDATE cuentas SET saldo = saldo + 0 WHERE cuenta_id = 2;  -- TX #2, auto-commit

SELECT @@TRANCOUNT AS transacciones_activas;  -- 0
-- Riesgo: si la segunda sentencia falla, la primera ya está confirmada.
```

### Implícito

```sql
SET IMPLICIT_TRANSACTIONS ON;

UPDATE cuentas SET saldo = saldo + 0 WHERE cuenta_id = 1;
SELECT @@TRANCOUNT AS activas;  -- 1 (abierta implícitamente)

-- La TX no se cierra sola: HAY QUE hacer COMMIT o ROLLBACK.
COMMIT TRANSACTION;
SELECT @@TRANCOUNT AS activas;  -- 0

SET IMPLICIT_TRANSACTIONS OFF;
```

> **Recomendación:** usar siempre el modo **Explícito** para operaciones que requieran atomicidad. El modo Implícito es fuente frecuente de bugs por transacciones olvidadas y locks no liberados.

---

## Sintaxis base — BEGIN / COMMIT / ROLLBACK

```sql
BEGIN TRANSACTION      -- o BEGIN TRAN

    -- operaciones SQL

COMMIT TRANSACTION     -- confirma todos los cambios
-- o
ROLLBACK TRANSACTION   -- deshace todos los cambios
```

**Ejemplo — transferencia bancaria:**

```sql
BEGIN TRANSACTION;
    UPDATE cuentas SET saldo = saldo - 500 WHERE cuenta_id = 1;  -- débito
    UPDATE cuentas SET saldo = saldo + 500 WHERE cuenta_id = 2;  -- crédito

    IF EXISTS (SELECT 1 FROM cuentas WHERE saldo < 0)
    BEGIN
        ROLLBACK TRANSACTION;
        PRINT 'Fondos insuficientes — transacción revertida';
        RETURN;
    END
COMMIT TRANSACTION;
PRINT 'Transferencia exitosa';
```

**Rollback explícito:**

```sql
BEGIN TRANSACTION;
    UPDATE cuentas SET saldo = saldo - 9999 WHERE cuenta_id = 1;

    -- Ver el estado DENTRO de la transacción (no confirmado):
    SELECT saldo FROM cuentas WHERE cuenta_id = 1;  -- muestra saldo negativo

ROLLBACK TRANSACTION;
-- El cambio fue revertido
SELECT saldo FROM cuentas WHERE cuenta_id = 1;  -- vuelve al valor original
```

---

## SAVE TRANSACTION — puntos de guardado

Un savepoint marca un punto dentro de una transacción al que se puede hacer rollback parcial sin cancelar toda la transacción.

```sql
BEGIN TRANSACTION;

    UPDATE cuentas SET saldo = saldo + 100 WHERE cuenta_id = 3;
    SAVE TRANSACTION punto_a;

    UPDATE cuentas SET saldo = saldo + 200 WHERE cuenta_id = 3;
    SAVE TRANSACTION punto_b;

    UPDATE cuentas SET saldo = saldo + 9999 WHERE cuenta_id = 3;  -- error lógico

    -- Revertir SOLO desde punto_b (deshace el +9999):
    ROLLBACK TRANSACTION punto_b;

    -- Saldo: original + 100 + 200
    SELECT saldo FROM cuentas WHERE cuenta_id = 3;

COMMIT TRANSACTION;
```

```
Estado después del ROLLBACK al savepoint:
  punto_a → conservado (el +100 persiste)
  punto_b → conservado (el +200 persiste)
  después de punto_b → revertido (el +9999 deshecho)
  @@TRANCOUNT → sigue en 1, la transacción sigue abierta
```

> `ROLLBACK TRANSACTION <nombre>` no cierra la transacción — solo vuelve a ese punto. Todavía hay que ejecutar un `COMMIT` o `ROLLBACK` final.

---

## @@TRANCOUNT — nivel de anidamiento

`@@TRANCOUNT` indica cuántas transacciones explícitas están abiertas en la sesión actual.

- `BEGIN TRANSACTION` → incrementa en 1
- `COMMIT TRANSACTION` → decrementa en 1 (los datos solo se confirman en disco cuando llega a **0**)
- `ROLLBACK` sin savepoint → lleva directamente a **0** y revierte todo

```sql
SELECT @@TRANCOUNT;      -- 0

BEGIN TRANSACTION;
SELECT @@TRANCOUNT;      -- 1

BEGIN TRANSACTION;       -- anidada
SELECT @@TRANCOUNT;      -- 2

COMMIT;                  -- @@TRANCOUNT → 1 (todavía no confirma en disco)
COMMIT;                  -- @@TRANCOUNT → 0 (recién aquí confirma todo)
```

**Transacciones anidadas — el ROLLBACK externo lo deshace todo:**

```sql
BEGIN TRANSACTION tx_outer;          -- @@TRANCOUNT = 1
    UPDATE cuentas SET saldo = saldo + 10 WHERE cuenta_id = 1;

    BEGIN TRANSACTION tx_inner;      -- @@TRANCOUNT = 2
        UPDATE cuentas SET saldo = saldo + 20 WHERE cuenta_id = 2;

    COMMIT TRANSACTION tx_inner;     -- @@TRANCOUNT = 1 (no confirma nada todavía)

ROLLBACK TRANSACTION tx_outer;      -- revierte AMBAS operaciones
SELECT @@TRANCOUNT;                  -- 0

-- Ninguno de los +10 ni +20 se guardó
SELECT saldo FROM cuentas WHERE cuenta_id IN (1, 2);
```

> Un `ROLLBACK` en cualquier nivel deshace **todo**, sin importar cuántos `COMMIT` internos se hayan ejecutado.

---

## Control de errores con TRY / CATCH

El patrón estándar en SQL Server para transacciones robustas. Si ocurre cualquier error dentro del bloque `TRY`, la ejecución salta automáticamente al `CATCH`.

```sql
BEGIN TRANSACTION;       -- va ANTES del TRY, no dentro

BEGIN TRY

    UPDATE cuentas SET saldo = saldo - 500 WHERE cuenta_id = 1;
    UPDATE cuentas SET saldo = saldo + 500 WHERE cuenta_id = 2;

    COMMIT TRANSACTION;

END TRY
BEGIN CATCH

    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;   -- relanza el error original al llamador

END CATCH;
```

> El `BEGIN TRANSACTION` va **antes** del `BEGIN TRY` para que el `ROLLBACK` del `CATCH` pueda revertirla. Si lo ponés dentro del `TRY` y el propio `BEGIN TRANSACTION` falla, no habría nada que revertir.

### Funciones de error disponibles en el CATCH

| Función | Qué devuelve |
|---------|-------------|
| `ERROR_MESSAGE()` | Texto descriptivo del error |
| `ERROR_NUMBER()` | Código numérico del error |
| `ERROR_SEVERITY()` | Nivel de severidad (1–25) |
| `ERROR_STATE()` | Estado del error |
| `ERROR_LINE()` | Línea donde ocurrió |
| `ERROR_PROCEDURE()` | Nombre del SP o trigger donde ocurrió |

```sql
BEGIN CATCH
    SELECT
        ERROR_NUMBER()    AS numero,
        ERROR_MESSAGE()   AS mensaje,
        ERROR_SEVERITY()  AS severidad,
        ERROR_LINE()      AS linea,
        ERROR_PROCEDURE() AS procedimiento;
END CATCH;
```

---

## XACT_ABORT — fallar rápido

`SET XACT_ABORT ON` hace que cualquier error en tiempo de ejecución revierte la transacción completa y la termina automáticamente, sin necesidad de lógica explícita en el `CATCH`.

```sql
SET XACT_ABORT ON;

BEGIN TRANSACTION;
    INSERT INTO tabla_a VALUES (1);
    INSERT INTO tabla_b VALUES (NULL);  -- viola NOT NULL → rollback automático
    INSERT INTO tabla_c VALUES (3);     -- nunca se ejecuta
COMMIT TRANSACTION;
-- la transacción ya fue revertida por el segundo INSERT
```

| | `XACT_ABORT OFF` *(defecto)* | `XACT_ABORT ON` |
|---|---|---|
| Error leve (overflow aritmético) | Solo cancela la sentencia, la TX sigue | Cancela toda la transacción |
| Error grave (violación de constraint) | Cancela la transacción | Cancela la transacción |
| En stored procedures | El SP puede continuar | El SP termina |

> **Recomendación:** usar `SET XACT_ABORT ON` en stored procedures que manejan transacciones. Combinado con `TRY/CATCH` es la forma más segura.

---

## Patrón recomendado para stored procedures

```sql
CREATE OR ALTER PROCEDURE dbo.transferir_saldo
    @origen  INT,
    @destino INT,
    @monto   DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @monto <= 0
        THROW 50001, 'El monto debe ser mayor a cero.', 1;

    BEGIN TRANSACTION;
    BEGIN TRY

        UPDATE cuentas SET saldo = saldo - @monto WHERE cuenta_id = @origen;

        IF (SELECT saldo FROM cuentas WHERE cuenta_id = @origen) < 0
            THROW 50002, 'Saldo insuficiente.', 1;

        UPDATE cuentas SET saldo = saldo + @monto WHERE cuenta_id = @destino;

        INSERT INTO auditoria (evento)
            VALUES (CONCAT('Transferencia ', @origen, '->', @destino, ' $', @monto));

        COMMIT TRANSACTION;
        PRINT 'Transferencia completada.';

    END TRY
    BEGIN CATCH

        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;

    END CATCH;
END;
GO

-- Prueba: transferencia válida
EXEC dbo.transferir_saldo @origen = 1, @destino = 2, @monto = 200;

-- Prueba: saldo insuficiente
EXEC dbo.transferir_saldo @origen = 3, @destino = 1, @monto = 99999;

-- Prueba: monto inválido
EXEC dbo.transferir_saldo @origen = 1, @destino = 2, @monto = -50;
```

---

## Bloqueos

Las transacciones usan bloqueos para mantener el aislamiento. Los tipos básicos:

| Tipo | Cuándo se usa | Compatibilidad |
|------|---------------|----------------|
| **Shared (S)** | `SELECT` (lecturas) | Compatible con otros S, incompatible con X |
| **Exclusive (X)** | `INSERT`, `UPDATE`, `DELETE` | Incompatible con cualquier otro |
| **Update (U)** | Fase previa a un UPDATE | Compatible con S, incompatible con X y U |
| **Intent (IS, IX)** | Indica intención de bloquear filas hijas | Varía |

```sql
-- Timeout de espera para obtener un bloqueo (en milisegundos):
SET LOCK_TIMEOUT 5000;   -- -1 = esperar indefinidamente
```

---

## Niveles de aislamiento

Controlan qué ve una transacción respecto de cambios no confirmados de otras. Más aislamiento = más consistencia, pero mayor contención.

### Los tres problemas de concurrencia

| Problema | Descripción |
|----------|-------------|
| **Dirty read** | Leer datos que otra transacción modificó pero todavía no confirmó |
| **Non-repeatable read** | La misma fila devuelve distintos valores en dos lecturas dentro de la misma TX |
| **Phantom read** | Una consulta devuelve filas distintas porque otra TX insertó o borró filas entre dos ejecuciones |

### Tabla de niveles

```sql
SET TRANSACTION ISOLATION LEVEL <nivel>;
```

| Nivel | Dirty read | Non-repeatable | Phantom | Mecanismo |
|-------|:---:|:---:|:---:|---|
| `READ UNCOMMITTED` | posible | posible | posible | Sin bloqueos de lectura |
| `READ COMMITTED` *(defecto)* | bloqueado | posible | posible | S-lock por sentencia |
| `REPEATABLE READ` | bloqueado | bloqueado | posible | S-lock hasta COMMIT |
| `SERIALIZABLE` | bloqueado | bloqueado | bloqueado | Range lock |
| `SNAPSHOT` | bloqueado | bloqueado | bloqueado | Versionado en TempDB |
| `RCSI` | bloqueado | posible | posible | Versionado transparente |

---

## Laboratorio de niveles de aislamiento

Los laboratorios requieren **dos ventanas de consulta en SSMS** abiertas simultáneamente (cada ventana es una sesión independiente).

### Entorno

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

### LAB 1 — READ UNCOMMITTED: dirty read

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

### LAB 2 — READ COMMITTED: bloquea dirty reads, permite non-repeatable reads

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

### LAB 3 — REPEATABLE READ: evita non-repeatable, permite phantoms

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

### LAB 4 — SERIALIZABLE: range locks, evita los tres problemas

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

### LAB 5 — SNAPSHOT: versionado, lectores y escritores no se bloquean

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

### LAB 6 — RCSI: READ_COMMITTED_SNAPSHOT

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

---

## Deadlocks

Un deadlock ocurre cuando dos sesiones se bloquean mutuamente esperando recursos que la otra tiene. Ninguna puede avanzar.

SQL Server detecta deadlocks automáticamente, elige una transacción como **víctima** (la de menor costo de rollback), la revierte y lanza el **error 1205**. La otra puede continuar.

**[SESIÓN A]**
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 1;  -- lock fila 1
    WAITFOR DELAY '00:00:05';
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 2;  -- espera fila 2 → DEADLOCK
COMMIT TRANSACTION;
GO
```

**[SESIÓN B]** — ejecutar inmediatamente después de A:
```sql
BEGIN TRANSACTION;
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 2;  -- lock fila 2
    WAITFOR DELAY '00:00:05';
    UPDATE ddbba.cuentas SET saldo = saldo + 1 WHERE cuenta_id = 1;  -- espera fila 1 → DEADLOCK
COMMIT TRANSACTION;
GO
```

**Capturar el error 1205:**

```sql
BEGIN TRY
    BEGIN TRANSACTION;
        UPDATE pedidos  SET estado = 'x' WHERE pedido_id = 1;
        UPDATE clientes SET activo = 0   WHERE cliente_id = 10;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 1205    -- víctima de deadlock
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        -- reintentar o notificar al cliente
    END
    ELSE
        THROW;
END CATCH;
```

### Detección de deadlocks con system_health

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

### Prevención

1. Acceder a tablas/filas siempre en el **mismo orden** en todas las transacciones.
2. Mantener transacciones lo más **cortas** posible.
3. Usar **índices adecuados** para reducir el rango de filas bloqueadas.
4. Considerar SNAPSHOT o RCSI para eliminar bloqueos de lectura.
5. Usar `SET DEADLOCK_PRIORITY LOW` para designar la víctima preferida.

---

## Queries de diagnóstico

```sql
-- Nivel de aislamiento de la sesión actual:
SELECT CASE transaction_isolation_level
           WHEN 1 THEN 'READ UNCOMMITTED'
           WHEN 2 THEN 'READ COMMITTED'
           WHEN 3 THEN 'REPEATABLE READ'
           WHEN 4 THEN 'SERIALIZABLE'
           WHEN 5 THEN 'SNAPSHOT'
       END AS nivel_aislamiento
FROM sys.dm_exec_sessions
WHERE session_id = @@SPID;
GO

-- Locks activos en la base de datos:
SELECT  request_session_id,
        resource_type,
        resource_description,
        request_mode,
        request_status
FROM    sys.dm_tran_locks
WHERE   resource_database_id = DB_ID('LabTransacciones')
ORDER BY request_session_id;
GO

-- Transacciones activas:
SELECT  s.session_id,
        s.login_name,
        s.status,
        t.transaction_begin_time,
        t.transaction_type,
        t.transaction_state
FROM    sys.dm_exec_sessions             s
JOIN    sys.dm_tran_session_transactions st ON st.session_id    = s.session_id
JOIN    sys.dm_tran_active_transactions  t  ON t.transaction_id = st.transaction_id
WHERE   s.session_id <> @@SPID;
GO
```

---

## Buenas prácticas

**Mantener las transacciones cortas.** Cuanto más larga la transacción, más tiempo se mantienen los bloqueos y más probable es la contención.

```sql
-- MAL: transacción larga con procesamiento en el medio
BEGIN TRANSACTION;
    SELECT datos FROM tabla;
    -- [procesamiento que tarda 5 segundos]  ← bloqueo abierto todo este tiempo
    UPDATE tabla SET resultado = @valor;
COMMIT TRANSACTION;

-- BIEN: calcular primero, transaccionar solo el cambio
DECLARE @valor INT;
SELECT @valor = ... FROM tabla;     -- sin transacción abierta
-- [procesamiento]
BEGIN TRANSACTION;
    UPDATE tabla SET resultado = @valor;
COMMIT TRANSACTION;
```

**Nunca dejar una transacción abierta esperando input del usuario.** Un formulario con confirmación pendiente puede mantener bloqueos indefinidamente.

**Siempre verificar `@@TRANCOUNT` antes de `ROLLBACK`.** Si no hay transacción activa, un `ROLLBACK` genera error.

**Usar `THROW` en lugar de `RAISERROR` para relanzar errores.** `THROW` sin argumentos dentro de un `CATCH` preserva toda la información del error original.

---

## Referencia rápida

```sql
BEGIN TRANSACTION                         -- abrir transacción
COMMIT TRANSACTION                        -- confirmar
ROLLBACK TRANSACTION                      -- deshacer todo
SAVE TRANSACTION <nombre>                 -- crear savepoint
ROLLBACK TRANSACTION <nombre>             -- deshacer hasta savepoint

SELECT @@TRANCOUNT                        -- nivel de anidamiento actual

SET XACT_ABORT ON                         -- rollback automático ante cualquier error
SET TRANSACTION ISOLATION LEVEL <nivel>  -- cambiar aislamiento de la sesión
SET LOCK_TIMEOUT <ms>                     -- timeout para obtener un bloqueo

SELECT * FROM tabla WITH (NOLOCK)         -- lectura sucia a nivel de tabla
```

| Concepto | Descripción |
|----------|-------------|
| `BEGIN TRANSACTION` | Inicia una transacción explícita |
| `COMMIT TRANSACTION` | Confirma los cambios permanentemente |
| `ROLLBACK TRANSACTION` | Deshace todos los cambios de la transacción |
| `SAVE TRANSACTION nombre` | Define un punto de restauración parcial |
| `ROLLBACK TRANSACTION nombre` | Revierte hasta el savepoint (sin cerrar la TX) |
| `@@TRANCOUNT` | Nivel de anidamiento de transacciones activo |
| `SET XACT_ABORT ON` | Revierte automáticamente ante cualquier error |
| `SET LOCK_TIMEOUT ms` | Tiempo máximo de espera para obtener un bloqueo |
| `ERROR_MESSAGE()` | Texto del error (usar dentro del CATCH) |
| `THROW` | Relanza el error original desde el CATCH |
