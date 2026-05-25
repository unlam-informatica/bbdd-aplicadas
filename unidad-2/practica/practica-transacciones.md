---
layout: default
title: Práctica — Transacciones
parent: Práctica
grand_parent: Unidad 2
nav_order: 3
permalink: /unidad-2/practica/transacciones/
---

# Práctica — Transacciones

> Ver guía de referencia: [Transacciones](/unidad-2/guias/transacciones/)

---

## Setup

```sql
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'PracticaU2')
    CREATE DATABASE PracticaU2;
GO

USE PracticaU2;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'tx')
    EXEC('CREATE SCHEMA tx');
GO

DROP TABLE IF EXISTS tx.Movimiento;
DROP TABLE IF EXISTS tx.Cuenta;
GO

CREATE TABLE tx.Cuenta (
    cuenta_id INT           IDENTITY(1,1) PRIMARY KEY,
    titular   VARCHAR(100)  NOT NULL,
    saldo     DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT ck_saldo_positivo CHECK (saldo >= 0)
);

CREATE TABLE tx.Movimiento (
    mov_id     INT           IDENTITY(1,1) PRIMARY KEY,
    cuenta_id  INT           NOT NULL REFERENCES tx.Cuenta(cuenta_id),
    tipo       CHAR(1)       NOT NULL CHECK (tipo IN ('D', 'C')),  -- D=Débito  C=Crédito
    monto      DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    fecha_hora DATETIME2     NOT NULL DEFAULT GETDATE(),
    descripcion VARCHAR(200) NULL
);
GO

INSERT INTO tx.Cuenta (titular, saldo) VALUES
    ('Valentina Torres', 5000.00),
    ('Rodrigo Méndez',   3200.00),
    ('Sofía Alvarado',    800.00);
GO
```

---

## Ejercicio 1 — Transferencia con BEGIN / COMMIT / ROLLBACK

Transferir $500 de la cuenta 1 (Valentina) a la cuenta 2 (Rodrigo). Registrar cada movimiento en `tx.Movimiento`.

1. Ejecutar la transferencia y verificar que los saldos cambiaron.
2. Volver a ejecutar pero reemplazar el COMMIT por un ROLLBACK. Verificar que los saldos vuelven al valor original.

```sql
USE PracticaU2;
GO

-- Versión con COMMIT
BEGIN TRANSACTION;
    UPDATE tx.Cuenta SET saldo = saldo - 500 WHERE cuenta_id = 1;
    UPDATE tx.Cuenta SET saldo = saldo + 500 WHERE cuenta_id = 2;

    INSERT INTO tx.Movimiento (cuenta_id, tipo, monto, descripcion) VALUES (1, 'D', 500, 'Transferencia a Rodrigo');
    INSERT INTO tx.Movimiento (cuenta_id, tipo, monto, descripcion) VALUES (2, 'C', 500, 'Transferencia de Valentina');
COMMIT TRANSACTION;

SELECT cuenta_id, titular, saldo FROM tx.Cuenta;
SELECT * FROM tx.Movimiento;
```

---

## Ejercicio 2 — TRY / CATCH con violación de constraint

Intentar debitar $6000 de la cuenta de Sofía (saldo: $800). La constraint `ck_saldo_positivo` debe impedirlo. Capturar el error y hacer ROLLBACK.

```sql
USE PracticaU2;
GO

BEGIN TRANSACTION;
BEGIN TRY
    UPDATE tx.Cuenta SET saldo = saldo - 6000 WHERE cuenta_id = 3;
    INSERT INTO tx.Movimiento (cuenta_id, tipo, monto, descripcion) VALUES (3, 'D', 6000, 'Débito grande');

    COMMIT TRANSACTION;
    PRINT 'Transferencia exitosa';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'Error capturado: ' + ERROR_MESSAGE();
    PRINT 'Número de error: ' + CAST(ERROR_NUMBER() AS VARCHAR);
END CATCH;

-- Verificar que el saldo NO cambió
SELECT cuenta_id, titular, saldo FROM tx.Cuenta WHERE cuenta_id = 3;
```

**Preguntas**:
- ¿Qué número de error devuelve `ERROR_NUMBER()`?
- ¿Qué hubiera pasado si se omitía la verificación `@@TRANCOUNT > 0`?

---

## Ejercicio 3 — SAVE TRANSACTION: reversión parcial

Registrar tres movimientos en secuencia. Si el tercero falla, revertir solo ese y conservar los dos primeros.

```sql
USE PracticaU2;
GO

-- Restaurar saldo inicial de prueba
UPDATE tx.Cuenta SET saldo = 5000 WHERE cuenta_id = 1;
GO

BEGIN TRANSACTION;

    -- Movimiento A: débito de $200
    UPDATE tx.Cuenta SET saldo = saldo - 200 WHERE cuenta_id = 1;
    INSERT INTO tx.Movimiento (cuenta_id, tipo, monto, descripcion) VALUES (1, 'D', 200, 'Mov A');

    SAVE TRANSACTION sp_antes_de_B;

    -- Movimiento B: débito de $300
    UPDATE tx.Cuenta SET saldo = saldo - 300 WHERE cuenta_id = 1;
    INSERT INTO tx.Movimiento (cuenta_id, tipo, monto, descripcion) VALUES (1, 'D', 300, 'Mov B');

    SAVE TRANSACTION sp_antes_de_C;

    -- Movimiento C: débito de $9999 (excede el saldo → rollback parcial)
    UPDATE tx.Cuenta SET saldo = saldo - 9999 WHERE cuenta_id = 1;

    IF (SELECT saldo FROM tx.Cuenta WHERE cuenta_id = 1) < 0
    BEGIN
        ROLLBACK TRANSACTION sp_antes_de_C;  -- solo deshace el mov C
        PRINT 'Mov C revertido por saldo insuficiente';
    END

COMMIT TRANSACTION;

-- Resultado esperado: Mov A y Mov B aplicados, Mov C no
SELECT cuenta_id, titular, saldo FROM tx.Cuenta WHERE cuenta_id = 1;
SELECT * FROM tx.Movimiento ORDER BY mov_id;
```

---

## Ejercicio 4 — @@TRANCOUNT y transacciones anidadas

Observar el comportamiento de `@@TRANCOUNT` con anidamiento y verificar que el ROLLBACK externo revierte todo.

```sql
USE PracticaU2;
GO

UPDATE tx.Cuenta SET saldo = 5000 WHERE cuenta_id = 1;
UPDATE tx.Cuenta SET saldo = 3200 WHERE cuenta_id = 2;
GO

SELECT @@TRANCOUNT AS nivel;         -- 0

BEGIN TRANSACTION tx_externa;
    SELECT @@TRANCOUNT AS nivel;     -- 1
    UPDATE tx.Cuenta SET saldo = saldo - 100 WHERE cuenta_id = 1;

    BEGIN TRANSACTION tx_interna;
        SELECT @@TRANCOUNT AS nivel; -- 2
        UPDATE tx.Cuenta SET saldo = saldo + 100 WHERE cuenta_id = 2;
    COMMIT TRANSACTION tx_interna;   -- @@TRANCOUNT → 1; NO confirma en disco todavía
    SELECT @@TRANCOUNT AS nivel;     -- 1

ROLLBACK TRANSACTION tx_externa;    -- revierte AMBAS operaciones
SELECT @@TRANCOUNT AS nivel;        -- 0

-- Verificar: ambos saldos deben estar en su valor original
SELECT cuenta_id, titular, saldo FROM tx.Cuenta WHERE cuenta_id IN (1, 2);
```

**Conclusión a observar**: el COMMIT de la transacción interna solo decrementó el contador pero no persistió nada. El ROLLBACK externo deshizo todo.

---

## Ejercicio 5 — SET XACT_ABORT ON

Comparar el comportamiento ante un error con `XACT_ABORT` activo y sin él.

```sql
USE PracticaU2;
GO

-- Sin XACT_ABORT: el INSERT que viola la FK falla pero la transacción sigue abierta
BEGIN TRANSACTION;
    UPDATE tx.Cuenta SET saldo = saldo + 10 WHERE cuenta_id = 1;
    INSERT INTO tx.Movimiento (cuenta_id, tipo, monto) VALUES (999, 'C', 10); -- FK inválida
    SELECT @@TRANCOUNT AS trancount_activo;  -- sigue siendo 1 (TX aún abierta)
ROLLBACK TRANSACTION;
GO

-- Con XACT_ABORT: el error revierte la TX automáticamente
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;
    UPDATE tx.Cuenta SET saldo = saldo + 10 WHERE cuenta_id = 1;
    INSERT INTO tx.Movimiento (cuenta_id, tipo, monto) VALUES (999, 'C', 10); -- FK inválida
    -- Esta línea nunca se ejecuta:
    SELECT @@TRANCOUNT AS trancount_activo;
COMMIT TRANSACTION;
GO

SET XACT_ABORT OFF;
GO
```

**Pregunta**: ¿En qué situaciones conviene combinar `XACT_ABORT ON` con `TRY/CATCH`?

---

## Ejercicio 6 — Stored procedure con patrón completo

Crear un SP `tx.usp_transferir` que encapsule una transferencia entre cuentas con validación de saldo, TRY/CATCH y XACT_ABORT.

```sql
USE PracticaU2;
GO

CREATE OR ALTER PROCEDURE tx.usp_transferir
    @origen  INT,
    @destino INT,
    @monto   DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validar existencia de cuentas
        IF NOT EXISTS (SELECT 1 FROM tx.Cuenta WHERE cuenta_id = @origen)
            THROW 50001, 'Cuenta origen no existe.', 1;

        IF NOT EXISTS (SELECT 1 FROM tx.Cuenta WHERE cuenta_id = @destino)
            THROW 50002, 'Cuenta destino no existe.', 1;

        -- Débito
        UPDATE tx.Cuenta SET saldo = saldo - @monto WHERE cuenta_id = @origen;

        -- La constraint CHECK dispara error si el saldo queda negativo
        INSERT INTO tx.Movimiento (cuenta_id, tipo, monto, descripcion)
            VALUES (@origen, 'D', @monto, 'Transferencia a cuenta ' + CAST(@destino AS VARCHAR));

        -- Crédito
        UPDATE tx.Cuenta SET saldo = saldo + @monto WHERE cuenta_id = @destino;

        INSERT INTO tx.Movimiento (cuenta_id, tipo, monto, descripcion)
            VALUES (@destino, 'C', @monto, 'Transferencia de cuenta ' + CAST(@origen AS VARCHAR));

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

-- Prueba 1: transferencia válida
EXEC tx.usp_transferir @origen = 1, @destino = 2, @monto = 200;

-- Prueba 2: monto que excede el saldo de Sofía (cuenta 3)
EXEC tx.usp_transferir @origen = 3, @destino = 1, @monto = 5000;

-- Prueba 3: cuenta inexistente
EXEC tx.usp_transferir @origen = 1, @destino = 99, @monto = 100;

SELECT cuenta_id, titular, saldo FROM tx.Cuenta;
```

---

## Ejercicio 7 — Niveles de aislamiento

Demostrar el comportamiento de READ UNCOMMITTED (lectura sucia) en dos sesiones.

**Abrir dos ventanas de consulta en SSMS** y ejecutar los pasos en el orden indicado:

**Sesión A** (ejecutar primero):
```sql
USE PracticaU2;
BEGIN TRANSACTION;
    UPDATE tx.Cuenta SET saldo = saldo + 9999 WHERE cuenta_id = 1;
    -- No hacer COMMIT ni ROLLBACK todavía — dejar la transacción abierta
    WAITFOR DELAY '00:00:15';
ROLLBACK TRANSACTION;
```

**Sesión B** (ejecutar mientras A está esperando):
```sql
USE PracticaU2;

-- READ COMMITTED (default): espera a que A libere el lock
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT titular, saldo FROM tx.Cuenta WHERE cuenta_id = 1;

-- READ UNCOMMITTED: lee el dato sin confirmar de A (puede ser basura)
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT titular, saldo FROM tx.Cuenta WHERE cuenta_id = 1;

-- Equivalente con hint:
SELECT titular, saldo FROM tx.Cuenta WITH (NOLOCK) WHERE cuenta_id = 1;
```

**Observar**: READ UNCOMMITTED devuelve el saldo inflado ($9999 extra) que A nunca confirmó.
