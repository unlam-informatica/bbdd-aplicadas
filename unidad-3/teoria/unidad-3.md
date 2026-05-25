---
layout: default
title: Transacciones y Concurrencia
parent: Teoría
grand_parent: Unidad 3
nav_order: 1
permalink: /unidad-3/teoria/transacciones-concurrencia/
---

# Transacciones y Concurrencia

## Transacciones

Una transacción es una **unidad lógica de trabajo** compuesta por una o más operaciones que deben ejecutarse como un todo: o todas tienen efecto, o ninguna. El ejemplo clásico es una transferencia bancaria: verificar saldo → debitar cuenta origen → acreditar cuenta destino → registrar en auditoría. Si el paso 3 falla después de que el 2 ya se ejecutó, sin transacción la cuenta queda debitada y el destino nunca recibe el dinero. Con transacción, el ROLLBACK revierte todo como si nada hubiera ocurrido.

### Propiedades ACID

| Propiedad | Descripción |
|-----------|-------------|
| **Atomicity** (Atomicidad) | Todo o nada. Si cualquier parte falla, se revierten todas las operaciones. No hay estados parciales visibles. |
| **Consistency** (Consistencia) | La BD pasa de un estado válido a otro estado válido. Las reglas de integridad nunca se violan. |
| **Isolation** (Aislamiento) | Las transacciones concurrentes no interfieren entre sí. El efecto es como si se ejecutaran en serie. |
| **Durability** (Durabilidad) | Una vez confirmada (COMMIT), la transacción persiste aunque ocurra un fallo del sistema o reinicio. |

### Modos de transacción en SQL Server

**AUTOCOMMIT** (por defecto): cada sentencia DML es su propia transacción. Riesgo: dos operaciones que deben ser atómicas NO están protegidas — si la segunda falla, la primera ya está confirmada en disco.

```sql
-- Estas dos sentencias son transacciones independientes:
UPDATE ddbba.Cuentas SET Saldo = Saldo - 100 WHERE CuentaID = 1; -- TX #1, auto-commit
UPDATE ddbba.Cuentas SET Saldo = Saldo + 100 WHERE CuentaID = 2; -- TX #2, puede no ejecutarse
```

**EXPLÍCITA** (`BEGIN...COMMIT/ROLLBACK`): el programador delimita explícitamente el inicio y el fin. Es el modo recomendado para toda operación que requiera atomicidad entre dos o más sentencias.

```sql
BEGIN TRANSACTION;
    UPDATE ddbba.Cuentas SET Saldo = Saldo - 100 WHERE CuentaID = 1;
    UPDATE ddbba.Cuentas SET Saldo = Saldo + 100 WHERE CuentaID = 2;
COMMIT TRANSACTION;
```

**IMPLÍCITA** (`SET IMPLICIT_TRANSACTIONS ON`): SQL Server abre la TX automáticamente ante cualquier DML/DDL, pero el programador DEBE cerrarla. Riesgo: olvidar el COMMIT deja locks abiertos indefinidamente.

| Modo | Cómo inicia la TX | Cómo termina la TX |
|------|-------------------|-------------------|
| AUTOCOMMIT (default) | Automáticamente por sentencia | Automáticamente al finalizar cada sentencia |
| EXPLÍCITO | `BEGIN TRANSACTION` | `COMMIT` o `ROLLBACK` explícito |
| IMPLÍCITO | Automáticamente ante DML/DDL | `COMMIT` o `ROLLBACK` explícito (obligatorio) |

### Control explícito: BEGIN / COMMIT / ROLLBACK

`@@TRANCOUNT` indica el nivel de anidamiento de transacciones activas: 0 = sin TX activa, 1 = TX activa, >1 = anidado.

```sql
-- COMMIT exitoso
BEGIN TRANSACTION;
    UPDATE ddbba.Cuentas SET Saldo = Saldo - 500 WHERE CuentaID = 1;
    UPDATE ddbba.Cuentas SET Saldo = Saldo + 500 WHERE CuentaID = 2;
    INSERT INTO ddbba.AuditoriaTransacciones (Evento)
        VALUES ('Transferencia Cuenta 1 -> Cuenta 2 $500');
COMMIT TRANSACTION;

-- ROLLBACK explícito
BEGIN TRANSACTION;
    UPDATE ddbba.Cuentas SET Saldo = Saldo - 9999 WHERE CuentaID = 1;
    SELECT Saldo FROM ddbba.Cuentas WHERE CuentaID = 1; -- ver estado dentro de la TX
ROLLBACK TRANSACTION;
-- El saldo vuelve al valor original
```

### Puntos de guardado (SAVEPOINT)

Un SAVEPOINT es un marcador dentro de una transacción que permite hacer **ROLLBACK parcial** sin deshacer toda la transacción.

```sql
BEGIN TRANSACTION;
    UPDATE ddbba.Cuentas SET Saldo = Saldo + 100 WHERE CuentaID = 3; -- Op. A
    SAVE TRANSACTION PuntoA;

    UPDATE ddbba.Cuentas SET Saldo = Saldo + 200 WHERE CuentaID = 3; -- Op. B
    SAVE TRANSACTION PuntoB;

    UPDATE ddbba.Cuentas SET Saldo = Saldo + 9999 WHERE CuentaID = 3; -- Error lógico

    ROLLBACK TRANSACTION PuntoB; -- Deshace solo el +9999

COMMIT TRANSACTION;
-- Persiste Op. A (+100) y Op. B (+200) únicamente
```

### Transacciones anidadas y @@TRANCOUNT

SQL Server soporta anidado sintáctico, pero solo el **ROLLBACK más externo** revierte todo. El COMMIT de una TX interna solo decrementa `@@TRANCOUNT`; no confirma en disco hasta que el COMMIT externo se ejecuta.

```sql
BEGIN TRANSACTION TX_OUTER;   -- @@TRANCOUNT = 1
    UPDATE ddbba.Cuentas SET Saldo = Saldo + 10 WHERE CuentaID = 1;

    BEGIN TRANSACTION TX_INNER; -- @@TRANCOUNT = 2
        UPDATE ddbba.Cuentas SET Saldo = Saldo + 20 WHERE CuentaID = 2;
    COMMIT TRANSACTION TX_INNER; -- Decrementa a 1, NO confirma en disco

ROLLBACK TRANSACTION TX_OUTER; -- Revierte AMBAS operaciones
-- @@TRANCOUNT = 0
```

### Patrón TRY/CATCH

El patrón recomendado para producción:

```sql
BEGIN TRANSACTION;
BEGIN TRY
    UPDATE ddbba.Cuentas SET Saldo = Saldo - @Monto WHERE CuentaID = @Origen;

    IF (SELECT Saldo FROM ddbba.Cuentas WHERE CuentaID = @Origen) < 0
        THROW 50001, 'Saldo insuficiente.', 1;

    UPDATE ddbba.Cuentas SET Saldo = Saldo + @Monto WHERE CuentaID = @Destino;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW; -- Re-lanza el error original
END CATCH;
```

Reglas clave:
- Verificar `@@TRANCOUNT > 0` antes del ROLLBACK en el CATCH (puede ser 0 si el error ocurrió antes del BEGIN).
- Usar `THROW` en código nuevo, no `RAISERROR` — propaga el error original sin modificarlo.
- El COMMIT debe estar dentro del TRY, nunca fuera.

Ver la [guía de Transacciones y Concurrencia](/unidad-3/guias/transacciones-y-concurrencia/) para `XACT_ABORT`, el laboratorio TCL completo y detección de deadlocks con DMVs.

---

## Concurrencia

### Fenómenos de concurrencia

**01 Dirty Read (Lectura Sucia)**: la sesión B lee datos modificados por A que aún NO fueron confirmados. Si A hace ROLLBACK, B leyó datos que nunca existieron. Solo ocurre en READ UNCOMMITTED.

**02 Non-Repeatable Read (Lectura No Repetible)**: B lee la misma fila dos veces dentro de una TX y obtiene valores distintos, porque A modificó y confirmó los datos entre ambas lecturas. Ocurre en READ UNCOMMITTED y READ COMMITTED.

**03 Phantom Read (Lectura Fantasma)**: B ejecuta la misma consulta dos veces y obtiene filas distintas (nuevas o faltantes), porque A insertó o eliminó filas entre ambas ejecuciones. Ocurre en READ UNCOMMITTED, READ COMMITTED y REPEATABLE READ.

### Niveles de aislamiento

| Nivel | Dirty Read | Non-Repeatable | Phantom | Bloqueo lectura |
|-------|:----------:|:--------------:|:-------:|:---------------:|
| READ UNCOMMITTED | Posible | Posible | Posible | Ninguno |
| READ COMMITTED (default) | Evitado | Posible | Posible | S-lock (breve) |
| REPEATABLE READ | Evitado | Evitado | Posible | S-lock (toda TX) |
| SERIALIZABLE | Evitado | Evitado | Evitado | Range lock |
| SNAPSHOT | Evitado | Evitado | Evitado | No (versionado) |
| RCSI | Evitado | Posible | Posible | No (versionado) |

*RCSI = READ_COMMITTED_SNAPSHOT: se activa a nivel de base de datos, no de sesión.*

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- default
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;        -- requiere ALLOW_SNAPSHOT_ISOLATION ON en la DB

-- RCSI a nivel de base de datos:
ALTER DATABASE pruebasDB SET READ_COMMITTED_SNAPSHOT ON;
```

### Guía de selección

| Nivel | Cuándo usarlo | Advertencia |
|-------|--------------|-------------|
| READ UNCOMMITTED | Reportes de aproximación, dashboards no críticos | Nunca para operaciones transaccionales |
| READ COMMITTED | Uso general OLTP — es el default | Activar RCSI para mayor concurrencia sin código extra |
| REPEATABLE READ | Lógica que necesita múltiples lecturas consistentes de las mismas filas dentro de una TX | Agrega S-locks de mayor duración |
| SERIALIZABLE | Operaciones donde "insertar si no existe" debe ser atómica | Evitar en tablas de alto tráfico |
| SNAPSHOT | Alta concurrencia lectora/escritora; cuando los lectores no pueden bloquear a los escritores | Habilitar `ALLOW_SNAPSHOT_ISOLATION ON` en la DB |
| RCSI | Mejorar READ COMMITTED sin cambiar código — la elección pragmática para sistemas existentes | Activa versionado globalmente en la DB |

**SNAPSHOT vs. RCSI — diferencias clave:**

| | SNAPSHOT | RCSI |
|--|----------|------|
| Activación | `SET ISOLATION LEVEL SNAPSHOT` (por sesión) | `ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON` |
| Versión que lee | La del INICIO de su transacción | El último COMMIT al momento de cada sentencia |
| Lecturas repetibles | Sí | No (puede cambiar entre sentencias) |
| Bloquea lectores | No | No |
| Conflicto de escritura | Error 3960 (aborta la TX) | Sin conflicto especial |
| Migración de código | Requiere `SET` en cada sesión | Transparente — sin cambios en la app |

---

## Bloqueos

### Tipos de bloqueo

- **X-lock (exclusivo)**: lo toma el escritor (UPDATE/DELETE/INSERT). Impide que otros lean o escriban la misma fila hasta que se libere.
- **S-lock (compartido)**: lo toma el lector en niveles READ COMMITTED / REPEATABLE READ / SERIALIZABLE. Impide que otros escritores modifiquen la fila mientras está bloqueada.

En READ COMMITTED los S-locks se liberan inmediatamente después de cada lectura. En REPEATABLE READ y SERIALIZABLE se mantienen durante toda la transacción. En SERIALIZABLE además se usan **range locks** que protegen el rango contra inserciones.

### Bloqueos vs. versionado de filas

**Mecanismo de bloqueos** — READ COMMITTED, REPEATABLE READ, SERIALIZABLE:
- El escritor toma un X-lock sobre la fila; el lector debe esperar hasta que el escritor lo libere.
- Lectores y escritores se **bloquean** mutuamente.
- Ventaja: simple, sin overhead de TempDB. Desventaja: mayor contención en sistemas concurrentes.

**Versionado de filas** — SNAPSHOT, RCSI:
- Al modificar, SQL Server guarda la versión anterior de la fila en TempDB.
- El lector accede a esa versión sin esperar al escritor.
- Lectores y escritores **no se bloquean** entre sí.
- Ventaja: alta concurrencia, sin esperas en lecturas. Desventaja: mayor uso de TempDB.

### Deadlocks

Un deadlock ocurre cuando dos sesiones se bloquean mutuamente: A tiene lock en Fila 1 y quiere Fila 2; B tiene lock en Fila 2 y quiere Fila 1. SQL Server detecta el ciclo y mata a una de las sesiones (la víctima), que recibe el **error 1205**.

```
Sesión A: Lock en Fila 1 → quiere Fila 2 →
Sesión B: Lock en Fila 2 → quiere Fila 1 ← SQL Server detecta el ciclo → Error 1205
```

**Cómo prevenir deadlocks:**
1. Acceder siempre a tablas y filas en el **mismo orden** entre todas las sesiones.
2. Mantener transacciones cortas — abrir TX lo más tarde posible, cerrar lo antes posible.
3. Indexar correctamente para reducir el rango de filas bloqueadas.
4. Usar SNAPSHOT o RCSI para eliminar bloqueos de lectura como fuente de deadlocks.
5. `SET DEADLOCK_PRIORITY LOW` en la sesión que se prefiere sea víctima.

Ver la [guía de Transacciones y Concurrencia](/unidad-3/guias/transacciones-y-concurrencia/) para la query de detección de deadlocks via `system_health` y ejemplos de wait stats.

---

## Transacciones distribuidas

Una transacción distribuida afecta a **varios recursos** (múltiples instancias de SQL Server u otros DBMS). Si alguno no puede garantizar que los cambios serán permanentes, toda la transacción se revierte en todos los participantes.

La instancia que ejecuta `BEGIN DISTRIBUTED TRANSACTION` es el **originador** y controla su realización. Al ejecutarse COMMIT o ROLLBACK, solicita a **MS DTC** (Microsoft Distributed Transaction Coordinator) que coordine la confirmación entre todos los participantes.

La forma más habitual de incorporar instancias remotas es mediante una consulta que hace referencia a un **servidor vinculado** (*linked server*).

```sql
BEGIN DISTRIBUTED TRANSACTION;
    -- Borrar registro en instancia local
    DELETE FROM pruebasDB.ddbba.candidatos WHERE id = 13;
    -- Borrar registro en instancia remota (vía servidor vinculado)
    DELETE FROM ServidorRemoto.pruebasDB.ddbba.candidatos WHERE id = 13;
COMMIT TRANSACTION;
```

> El aislamiento SNAPSHOT **no admite** transacciones distribuidas.

---

## Las 10 reglas que no debés olvidar

| # | Regla |
|---|-------|
| 01 | Toda operación que modifique más de una tabla/fila y deba ser atómica va dentro de un `BEGIN TRANSACTION` explícito. |
| 02 | Siempre usar TRY/CATCH. El ROLLBACK va en el CATCH, verificando `@@TRANCOUNT > 0` antes de ejecutarlo. |
| 03 | Mantener las transacciones lo más cortas posible. Abrir tarde, cerrar temprano. Los locks se liberan al COMMIT/ROLLBACK. |
| 04 | READ COMMITTED es el default y cubre la mayoría de los casos. Activar RCSI en la DB para mejorar la concurrencia sin tocar código. |
| 05 | NOLOCK / READ UNCOMMITTED pueden leer datos que nunca existieron. Usarlos solo donde la exactitud no importa. |
| 06 | SNAPSHOT aísla sin bloqueos de lectura, pero dos escritores sobre la misma fila generan error 3960: el perdedor debe reintentar. |
| 07 | Para evitar deadlocks: acceder siempre a los objetos en el mismo orden y mantener transacciones cortas. |
| 08 | `SET IMPLICIT_TRANSACTIONS ON` es una trampa: las TX quedan abiertas y bloquean si se olvida el COMMIT. |
| 09 | SERIALIZABLE y REPEATABLE READ mantienen S-locks durante toda la transacción. A mayor duración, mayor riesgo de contención. |
| 10 | Ante un deadlock (error 1205), la aplicación debe estar preparada para **reintentar** la operación, no solo registrar el error. |
