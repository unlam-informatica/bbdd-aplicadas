---
layout: default
title: Laboratorio TCL — Tarjeta de crédito
parent: Teoría
grand_parent: Unidad 3
nav_order: 6
permalink: /unidad-3/guias/laboratorio-tcl/
---

[← Unidad 3](../)

# Laboratorio TCL — Tarjeta de crédito

Escenario de múltiples conexiones concurrentes usando transacciones de tarjeta de crédito para demostrar los niveles de aislamiento de SQL Server. Cada experimento requiere abrir varias ventanas en SSMS (una ventana = una sesión independiente).

---

## Entorno del laboratorio

```sql
USE pruebasDB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'ddbba')
    EXEC('CREATE SCHEMA ddbba');
GO

DROP TABLE IF EXISTS ddbba.transaccion;
DROP TABLE IF EXISTS ddbba.tarjeta_credito;
GO

CREATE TABLE ddbba.tarjeta_credito (
    nro_tarjeta     BIGINT          NOT NULL,
    ciudad          NVARCHAR(50)    NULL,
    limite_credito  DECIMAL(12,2)   NULL,
    CONSTRAINT PK_tarjeta_credito PRIMARY KEY CLUSTERED (nro_tarjeta ASC)
);
GO

CREATE TABLE ddbba.transaccion (
    id_transaccion          INT          NOT NULL,
    nro_tarjeta             BIGINT       NOT NULL,
    fecha                   DATETIME     NOT NULL,
    monto                   DECIMAL(12,2) NOT NULL,
    id_transaccion_reversion INT          NULL,
    tipo                    CHAR(1)      NOT NULL,   -- 'V' = venta, 'R' = reversión
    CONSTRAINT PK_transaccion PRIMARY KEY CLUSTERED (id_transaccion ASC)
);
GO

INSERT INTO ddbba.tarjeta_credito (nro_tarjeta, ciudad, limite_credito) VALUES
    (1280981422329509, 'Dallas',  6000.00),
    (9737219864179988, 'Houston', 16000.00),
    (4749889059323202, 'Auburn',  14000.00),
    (9591503562024072, 'Orlando', 18000.00);
GO

SELECT * FROM ddbba.tarjeta_credito;
SELECT * FROM ddbba.transaccion;
GO
```

---

## Experimento 0 · Compra básica con BEGIN TRANSACTION

Escenario de una sola conexión. El cliente realiza una compra con tarjeta. Si el monto supera el límite disponible, la operación no se registra.

```sql
USE pruebasDB;
GO

BEGIN TRANSACTION;
    DECLARE
        @id_transaccion   INT,
        @monto            DECIMAL(12,2),
        @nro_tarjeta      BIGINT,
        @fecha            DATETIME,
        @tipo             CHAR(1),
        @limite_actual    DECIMAL(12,2);

    SET @id_transaccion = 1001;
    SET @nro_tarjeta    = 1280981422329509;
    SET @fecha          = GETDATE();
    SET @monto          = 500.00;
    SET @tipo           = 'V';

    -- Consultar el límite disponible
    SELECT @limite_actual = limite_credito
    FROM   ddbba.tarjeta_credito
    WHERE  nro_tarjeta = @nro_tarjeta;

    IF (@limite_actual > @monto)
    BEGIN
        INSERT INTO ddbba.transaccion
            (id_transaccion, nro_tarjeta, fecha, monto, id_transaccion_reversion, tipo)
        VALUES
            (@id_transaccion, @nro_tarjeta, @fecha, @monto, NULL, @tipo);

        UPDATE ddbba.tarjeta_credito
        SET    limite_credito = limite_credito - @monto
        WHERE  nro_tarjeta = @nro_tarjeta;
    END
    ELSE
    BEGIN
        PRINT 'No se puede realizar la compra. Excede el límite de crédito disponible.';
    END;
COMMIT TRANSACTION;

-- Verificar resultado:
SELECT * FROM ddbba.transaccion   WHERE nro_tarjeta = 1280981422329509;
SELECT * FROM ddbba.tarjeta_credito WHERE nro_tarjeta = 1280981422329509;
GO
```

> Sin otra conexión involucrada no hay conflictos en lectura ni escritura.

---

## Experimento 1 · READ UNCOMMITTED — Dirty Read bancario

**Escenario:** el banco está actualizando el límite de crédito de un cliente (transacción larga, sin COMMIT). El cliente, usando READ UNCOMMITTED, ve el límite nuevo (76000) antes de que se confirme y autoriza una compra. El banco luego hace ROLLBACK. El cliente realizó la compra basándose en un dato que nunca existió.

**[CONEXIÓN A — Banco]**
```sql
USE pruebasDB;
GO

BEGIN TRANSACTION;
    -- Simula la actualización del límite (tarjeta de Dallas)
    UPDATE ddbba.tarjeta_credito
    SET    limite_credito = 76000.00
    WHERE  nro_tarjeta = 1280981422329509;

    -- Todavía no se confirma — esperar que Conexión B lea
    WAITFOR DELAY '00:00:15';

ROLLBACK TRANSACTION;
-- El límite real nunca fue 76000.
GO
```

**[CONEXIÓN B — Cliente]** — ejecutar mientras A espera:
```sql
USE pruebasDB;
GO

SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN TRANSACTION;
    DECLARE
        @id_transaccion   INT,
        @monto            DECIMAL(12,2),
        @nro_tarjeta      BIGINT,
        @fecha            DATETIME,
        @tipo             CHAR(1),
        @limite_actual    DECIMAL(12,2);

    SET @nro_tarjeta    = 1280981422329509;
    SET @id_transaccion = 1005;
    SET @fecha          = GETDATE();
    SET @monto          = 20000.00;
    SET @tipo           = 'V';

    -- Lee el límite SIN esperar el COMMIT de A → lee 76000 (sucio)
    SELECT @limite_actual = limite_credito
    FROM   ddbba.tarjeta_credito
    WHERE  nro_tarjeta = @nro_tarjeta;

    -- @limite_actual = 76000 (dato no confirmado)

    IF (@limite_actual > @monto)
    BEGIN
        INSERT INTO ddbba.transaccion
            (id_transaccion, nro_tarjeta, fecha, monto, id_transaccion_reversion, tipo)
        VALUES
            (@id_transaccion, @nro_tarjeta, @fecha, @monto, NULL, @tipo);

        UPDATE ddbba.tarjeta_credito
        SET    limite_credito = limite_credito - @monto
        WHERE  nro_tarjeta = @nro_tarjeta;
    END
    ELSE
    BEGIN
        PRINT 'No se puede realizar la compra. Excede el límite de crédito disponible.';
    END;
COMMIT TRANSACTION;
GO
```

> Con `READ COMMITTED` (nivel por defecto), la Conexión B se **bloquearía** hasta que A confirme o revierta, evitando el dirty read.

---

## Experimento 2 · REPEATABLE READ — Tres conexiones concurrentes

**Escenario:** el cliente quiere realizar una compra. Al mismo tiempo, dos empleados del banco intentan modificar su tarjeta — uno actualiza el límite, otro actualiza la ciudad. REPEATABLE READ garantiza que los datos leídos por la transacción del cliente no cambien hasta que ésta finalice.

**[CONEXIÓN A — Cliente]**
```sql
USE pruebasDB;
GO

SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION;
    DECLARE
        @limite_actual    DECIMAL(12,2),
        @monto            DECIMAL(12,2),
        @nro_tarjeta      BIGINT,
        @id_transaccion   INT,
        @fecha            DATETIME,
        @tipo             CHAR(1);

    SET @nro_tarjeta    = 1280981422329509;
    SET @id_transaccion = 1006;
    SET @fecha          = GETDATE();
    SET @monto          = 500.00;
    SET @tipo           = 'V';

    -- Lee el límite (coloca S-lock que se mantiene hasta COMMIT)
    SELECT @limite_actual = limite_credito
    FROM   ddbba.tarjeta_credito
    WHERE  nro_tarjeta = @nro_tarjeta;

    -- Ir a la Conexión B para intentar actualizar el límite.
    -- Observar que queda bloqueada mientras esta TX está abierta.

    IF (@limite_actual > @monto)
    BEGIN
        INSERT INTO ddbba.transaccion
            (id_transaccion, nro_tarjeta, fecha, monto, id_transaccion_reversion, tipo)
        VALUES
            (@id_transaccion, @nro_tarjeta, @fecha, @monto, NULL, @tipo);

        UPDATE ddbba.tarjeta_credito
        SET    limite_credito = limite_credito - @monto
        WHERE  nro_tarjeta = @nro_tarjeta;
    END
    ELSE
    BEGIN
        PRINT 'No se puede realizar la compra. Excede el límite de crédito disponible.';
    END;
COMMIT TRANSACTION;

SELECT * FROM ddbba.tarjeta_credito WHERE nro_tarjeta = 1280981422329509;
GO
```

**[CONEXIÓN B — Empleado 1: actualiza límite]** — ejecutar mientras A está abierta:
```sql
USE pruebasDB;
GO

-- Esta sentencia queda BLOQUEADA mientras la Conexión A tenga el S-lock activo.
UPDATE ddbba.tarjeta_credito
SET    limite_credito = 5500.00
WHERE  nro_tarjeta = 1280981422329509;
-- Se completa solo cuando A haga COMMIT o ROLLBACK.
GO
```

**[CONEXIÓN C — Empleado 2: actualiza ciudad]** — ejecutar mientras A está abierta:
```sql
USE pruebasDB;
GO

-- También queda BLOQUEADA por el S-lock de A sobre la misma fila.
UPDATE ddbba.tarjeta_credito
SET    ciudad = 'Ramos Mejía'
WHERE  nro_tarjeta = 1280981422329509;
GO
```

> REPEATABLE READ coloca S-locks sobre las filas leídas y los mantiene hasta el COMMIT. Esto garantiza que ninguna conexión puede modificar esas filas mientras la transacción está abierta.

---

## Experimento 3 · READ UNCOMMITTED con reversión (SERIALIZABLE en otra sesión)

**Escenario:** el cliente solicita la reversión de una compra reciente y quiere hacer otra compra nueva al mismo tiempo. La Conexión B tiene una transacción SERIALIZABLE activa que cubre el rango de datos. La Conexión A usa READ UNCOMMITTED para leer sin bloquearse.

**[CONEXIÓN A — Cliente: nueva compra con reversión]**
```sql
USE pruebasDB;
GO

SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN TRANSACTION;
    DECLARE
        @id_transaccion   INT,
        @monto            DECIMAL(12,2),
        @nro_tarjeta      BIGINT,
        @fecha            DATETIME,
        @tipo             CHAR(1),
        @limite_actual    DECIMAL(12,2);

    SET @nro_tarjeta    = 1280981422329509;
    SET @id_transaccion = 1007;
    SET @fecha          = GETDATE();
    SET @monto          = 200.00;
    SET @tipo           = 'V';

    -- Lee sin esperar locks de otras sesiones
    SELECT @limite_actual = limite_credito
    FROM   ddbba.tarjeta_credito
    WHERE  nro_tarjeta = @nro_tarjeta;

    IF (@limite_actual > @monto)
    BEGIN
        INSERT INTO ddbba.transaccion
            (id_transaccion, nro_tarjeta, fecha, monto, id_transaccion_reversion, tipo)
        VALUES
            (@id_transaccion, @nro_tarjeta, @fecha, @monto, NULL, @tipo);

        UPDATE ddbba.tarjeta_credito
        SET    limite_credito = limite_credito - @monto
        WHERE  nro_tarjeta = @nro_tarjeta;
    END
    ELSE
    BEGIN
        PRINT 'No se puede realizar la compra. Excede el límite de crédito disponible.';
    END;
    -- Verificar la tabla de transacciones antes de confirmar
    SELECT * FROM ddbba.transaccion WHERE nro_tarjeta = @nro_tarjeta;
COMMIT TRANSACTION;
GO
```

**[CONEXIÓN B — Proceso de reversión con SERIALIZABLE]** — ejecutar antes de A:
```sql
USE pruebasDB;
GO

SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN TRANSACTION;
    -- Bloquea el rango de la tarjeta para evitar cualquier inserción o modificación concurrente
    SELECT * FROM ddbba.transaccion
    WHERE  nro_tarjeta = 1280981422329509;

    -- Registrar la reversión de una transacción previa
    INSERT INTO ddbba.transaccion
        (id_transaccion, nro_tarjeta, fecha, monto, id_transaccion_reversion, tipo)
    VALUES
        (10007, 1280981422329509, GETDATE(), 500.00, 10006, 'R');

    UPDATE ddbba.tarjeta_credito
    SET    limite_credito = limite_credito + 500.00
    WHERE  nro_tarjeta = 1280981422329509;

COMMIT TRANSACTION;
GO
```

> Con SERIALIZABLE, la Conexión B aplica un range lock sobre los datos de esa tarjeta. La Conexión A, al usar READ UNCOMMITTED, puede leer sin bloquearse pero corre el riesgo de ver datos sucios. Para escrituras, A también puede verse bloqueada si intenta modificar filas bajo el range lock de B.

---

## Tabla resumen de los experimentos

| Experimento | Nivel de aislamiento | Conexiones | Fenómeno demostrado |
|-------------|----------------------|------------|---------------------|
| 0 | Explícita (default) | 1 | Atomicidad de BEGIN TRANSACTION |
| 1 | READ UNCOMMITTED | 2 | Dirty Read: lectura de dato no confirmado |
| 2 | REPEATABLE READ | 3 | S-locks que bloquean escrituras concurrentes |
| 3 | READ UNCOMMITTED + SERIALIZABLE | 2 | Range lock vs lectura sin bloqueo |
