---
layout: default
title: Apunte completo
parent: Unidad 3
nav_order: 1
permalink: /unidad-3/teoria/
---

[← Unidad 3](../)

- [Transacciones](#transacciones)
  - [Propiedades ACID](#propiedades-acid)
  - [Modos de transacción en SQL Server](#modos-de-transacción-en-sql-server)
  - [Control explícito: BEGIN / COMMIT / ROLLBACK](#control-explícito-begin--commit--rollback)
  - [Puntos de guardado (SAVEPOINT)](#puntos-de-guardado-savepoint)
  - [Transacciones anidadas y @@TRANCOUNT](#transacciones-anidadas-y-trancount)
  - [Patrón TRY/CATCH](#patrón-trycatch)
- [Concurrencia](#concurrencia)
  - [Fenómenos de concurrencia](#fenómenos-de-concurrencia)
  - [Niveles de aislamiento](#niveles-de-aislamiento)
  - [Guía de selección](#guía-de-selección)
- [Bloqueos](#bloqueos)
  - [Tipos de bloqueo](#tipos-de-bloqueo)
  - [Bloqueos vs. versionado de filas](#bloqueos-vs-versionado-de-filas)
  - [Deadlocks](#deadlocks)
- [Transacciones distribuidas](#transacciones-distribuidas)
- [Índices](#índices)
  - [Índice clustered](#índice-clustered)
  - [Índice nonclustered](#índice-nonclustered)
  - [Índice de cobertura](#índice-de-cobertura)
  - [Fill factor y page splits](#fill-factor-y-page-splits)
  - [Rebuild vs. Reorganize](#rebuild-vs-reorganize)
  - [Rowstore vs. Columnstore](#rowstore-vs-columnstore)
- [Optimización de consultas](#optimización-de-consultas)
  - [Planes de ejecución](#planes-de-ejecución)
  - [Estadísticas](#estadísticas)
  - [Tips de optimización](#tips-de-optimización)
- [Métricas de performance](#métricas-de-performance)
  - [Concepto de baseline](#concepto-de-baseline)
  - [Recuento de filas](#recuento-de-filas)
  - [Database File IO](#database-file-io)
  - [Tamaño del backup del log](#tamaño-del-backup-del-log)
  - [Modelo de recuperación](#modelo-de-recuperación)
  - [Bloqueos y esperas](#bloqueos-y-esperas)
- [Las 10 reglas que no debés olvidar](#las-10-reglas-que-no-debés-olvidar)

---

# Unidad 3 — BD Transaccionales: aspectos avanzados

## Transacciones

Una transacción es una **unidad lógica de trabajo** compuesta por una o más operaciones que deben ejecutarse como un todo: o todas tienen efecto, o ninguna. El ejemplo clásico es una transferencia bancaria: verificar saldo → debitar cuenta origen → acreditar cuenta destino → registrar en auditoría. Si el paso 3 falla después de que el 2 ya se ejecutó, sin transacción la cuenta queda debitada y el destino nunca recibe el dinero. Con transacción, el ROLLBACK revierte ambas operaciones como si nada hubiera ocurrido.

### Propiedades ACID

| Propiedad | Descripción |
|-----------|-------------|
| **Atomicity** (Atomicidad) | Todo o nada. Si cualquier parte falla, se revierten todas las operaciones. No hay estados parciales visibles. |
| **Consistency** (Consistencia) | La BD pasa de un estado válido a otro estado válido. Las reglas de integridad nunca se violan. |
| **Isolation** (Aislamiento) | Las transacciones concurrentes no interfieren entre sí. El efecto es como si se ejecutaran en serie. |
| **Durability** (Durabilidad) | Una vez confirmada (COMMIT), la transacción persiste aunque ocurra un fallo del sistema o reinicio. |

### Modos de transacción en SQL Server

SQL Server soporta tres modos de manejo de transacciones:

**AUTOCOMMIT** (por defecto): cada sentencia DML es su propia transacción. Se confirma automáticamente si tiene éxito; se revierte sola si falla. Riesgo: dos operaciones que deben ser atómicas NO están protegidas — si la segunda falla, la primera ya está confirmada en disco.

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

**IMPLÍCITA** (`SET IMPLICIT_TRANSACTIONS ON`): SQL Server abre la TX automáticamente ante cualquier DML/DDL, pero el programador DEBE cerrarla con COMMIT o ROLLBACK. Riesgo: olvidar el COMMIT deja locks abiertos indefinidamente.

```sql
SET IMPLICIT_TRANSACTIONS ON;
UPDATE ddbba.Cuentas SET Saldo = Saldo + 0 WHERE CuentaID = 1;
SELECT @@TRANCOUNT; -- 1 (TX abierta sin BEGIN explícito)
COMMIT TRANSACTION; -- OBLIGATORIO
```

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
    -- Ver el estado dentro de la TX (saldo negativo, no confirmado)
    SELECT Saldo FROM ddbba.Cuentas WHERE CuentaID = 1;
    -- Decidimos cancelar:
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
SELECT @@TRANCOUNT; -- 0

BEGIN TRANSACTION TX_OUTER;
    SELECT @@TRANCOUNT; -- 1
    UPDATE ddbba.Cuentas SET Saldo = Saldo + 10 WHERE CuentaID = 1;

    BEGIN TRANSACTION TX_INNER;
        SELECT @@TRANCOUNT; -- 2
        UPDATE ddbba.Cuentas SET Saldo = Saldo + 20 WHERE CuentaID = 2;
    COMMIT TRANSACTION TX_INNER; -- Decrementa a 1, NO confirma en disco

ROLLBACK TRANSACTION TX_OUTER; -- Revierte AMBAS operaciones
SELECT @@TRANCOUNT; -- 0
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
- El COMMIT debe estar dentro del TRY, nunca fuera: si hay error entre el último DML y el COMMIT, el CATCH lo atrapa.
- Registrar el error en una tabla de auditoría antes de hacer ROLLBACK (en una TX separada o variable).

---

## Concurrencia

### Fenómenos de concurrencia

Cuando múltiples sesiones acceden a los mismos datos simultáneamente pueden ocurrir tres categorías de anomalías:

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

Configuración por sesión:
```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED; -- default
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;        -- requiere ALLOW_SNAPSHOT_ISOLATION ON en la DB
```

Configuración de RCSI a nivel de base de datos:
```sql
ALTER DATABASE pruebasDB SET READ_COMMITTED_SNAPSHOT ON;
```

### Guía de selección

| Nivel | Cuándo usarlo | Advertencia |
|-------|--------------|-------------|
| READ UNCOMMITTED | Reportes de aproximación, dashboards no críticos | Nunca para operaciones transaccionales |
| READ COMMITTED | Uso general OLTP — es el default, cubre la mayoría de los casos | Activar RCSI para mayor concurrencia sin código extra |
| REPEATABLE READ | Lógica que necesita múltiples lecturas consistentes de las mismas filas dentro de una TX | Agrega S-locks de mayor duración |
| SERIALIZABLE | Operaciones donde "insertar si no existe" debe ser atómica; procesos batch con máxima integridad | Evitar en tablas de alto tráfico |
| SNAPSHOT | Alta concurrencia lectora/escritora; cuando los lectores no pueden bloquear a los escritores | Habilitar `ALLOW_SNAPSHOT_ISOLATION ON` en la DB |
| RCSI | Mejorar READ COMMITTED sin cambiar código — la elección pragmática para sistemas existentes | Activa versionado globalmente en la DB |

**SERIALIZABLE — poder y costo**: garantiza la máxima consistencia (elimina Dirty Read, Non-Repeatable y Phantom) mediante range locks. El costo: range locks muy amplios en queries sin filtro, mayor probabilidad de deadlocks, degradación de throughput en OLTP de alta carga. Un `SELECT COUNT(*)` puede bloquear toda la tabla. Alternativa de alta concurrencia con igual consistencia: **SNAPSHOT** (control optimista + versionado en TempDB).

**SNAPSHOT vs. RCSI — diferencias clave**:

| | SNAPSHOT | RCSI |
|--|----------|------|
| Activación | `SET ISOLATION LEVEL SNAPSHOT` (por sesión) | `ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON` |
| Versión que lee | La del INICIO de su transacción | El último COMMIT al momento de cada sentencia |
| Lecturas repetibles | Sí | No (puede cambiar entre sentencias) |
| Bloquea lectores | No | No |
| Conflicto de escritura | Error 3960 (aborta la TX) | Sin conflicto especial (escrituras sí se bloquean entre sí) |
| Migración de código | Requiere `SET` en cada sesión | Transparente — sin cambios en la app |

---

## Bloqueos

### Tipos de bloqueo

- **X-lock (exclusivo)**: lo toma el escritor (UPDATE/DELETE/INSERT). Impide que otros lean o escriban la misma fila hasta que se libere.
- **S-lock (compartido)**: lo toma el lector en niveles READ COMMITTED / REPEATABLE READ / SERIALIZABLE. Impide que otros escritores modifiquen la fila mientras está bloqueada.

En READ COMMITTED los S-locks se liberan inmediatamente después de cada lectura. En REPEATABLE READ y SERIALIZABLE se mantienen durante toda la transacción. En SERIALIZABLE además se usan **range locks** que protegen el rango de la consulta contra inserciones.

### Bloqueos vs. versionado de filas

**Mecanismo de bloqueos (Locking)** — READ COMMITTED, REPEATABLE READ, SERIALIZABLE:
- El escritor toma un X-lock sobre la fila.
- El lector debe esperar hasta que el escritor libere el lock.
- Lectores y escritores se BLOQUEAN mutuamente.
- Ventaja: simple, sin overhead de TempDB. Desventaja: mayor contención en sistemas concurrentes.

**Versionado de filas (Row Versioning)** — SNAPSHOT, RCSI:
- Al modificar, SQL Server guarda la versión anterior de la fila en TempDB.
- El lector accede a esa versión sin esperar al escritor.
- Lectores y escritores NO se bloquean entre sí.
- Ventaja: alta concurrencia, sin esperas en lecturas. Desventaja: mayor uso de TempDB; en SNAPSHOT las escrituras en conflicto abortan con error 3960.

### Deadlocks

Un deadlock ocurre cuando dos sesiones se bloquean mutuamente en un ciclo sin salida: A tiene lock en Fila 1 y quiere Fila 2; B tiene lock en Fila 2 y quiere Fila 1. SQL Server detecta el ciclo y mata a una de las sesiones (la víctima), que recibe el **error 1205**.

```
Sesión A: Lock en Fila 1 → quiere Fila 2 →
Sesión B: Lock en Fila 2 → quiere Fila 1 ← SQL Server detecta el ciclo → Error 1205
```

**Cómo prevenir deadlocks**:
1. Acceder siempre a tablas y filas en el **mismo orden** entre todas las sesiones.
2. Mantener transacciones cortas — abrir TX lo más tarde posible, cerrar lo antes posible.
3. Indexar correctamente para reducir el rango de filas bloqueadas.
4. Usar SNAPSHOT o RCSI para eliminar bloqueos de lectura como fuente de deadlocks.
5. `SET DEADLOCK_PRIORITY LOW` en la sesión que se prefiere sea víctima.

```sql
-- Detectar deadlocks recientes via system_health:
SELECT xdr.value('@timestamp', 'datetime2') AS FechaDeadlock,
       xdr.query('.') AS DetalleXML
FROM (
    SELECT CAST(target_data AS XML) AS TargetData
    FROM sys.dm_xe_session_targets t
    JOIN sys.dm_xe_sessions s ON s.address = t.event_session_address
    WHERE s.name = 'system_health' AND t.target_name = 'ring_buffer'
) AS Data
CROSS APPLY TargetData.nodes('//RingBufferTarget/event[@name="xml_deadlock_report"]')
    AS XEventData(xdr)
ORDER BY FechaDeadlock DESC;
```

---

## Transacciones distribuidas

Una transacción distribuida afecta a **varios recursos** (múltiples instancias de SQL Server u otros DBMS). Para que se confirme, todos los participantes deben garantizar que los cambios serán permanentes. Si alguno no lo garantiza, toda la transacción da error y se revierten los cambios en todos los participantes.

La instancia que ejecuta `BEGIN DISTRIBUTED TRANSACTION` es el **originador** y controla su realización. Al ejecutarse COMMIT o ROLLBACK, la instancia solicita a **MS DTC** (Microsoft Distributed Transaction Coordinator) que coordine la confirmación entre todas las instancias participantes.

La principal forma en que instancias remotas se incorporan a una transacción distribuida es cuando una sesión ejecuta una consulta que hace referencia a un **servidor vinculado** (*linked server*).

> El aislamiento de instantáneas (SNAPSHOT) **no admite** transacciones distribuidas.

```sql
BEGIN DISTRIBUTED TRANSACTION;
    -- Borrar registro en instancia local
    DELETE FROM pruebasDB.ddbba.candidatos WHERE id = 13;
    -- Borrar registro en instancia remota (vía servidor vinculado)
    DELETE FROM ServidorRemoto.pruebasDB.ddbba.candidatos WHERE id = 13;
COMMIT TRANSACTION;
```

Sintaxis completa:
```sql
BEGIN DISTRIBUTED { TRAN | TRANSACTION }
    [ nombre_transaccion | @variable_nombre ]
```

---

## Índices

Un índice es una estructura de datos auxiliar que permite acelerar las búsquedas a costa de espacio de almacenamiento adicional y overhead en escrituras. Sin índice, SQL Server debe recorrer toda la tabla (scan). Con índice puede ir directamente a las filas relevantes (seek).

### Índice clustered

Determina el **orden físico de almacenamiento** de las filas en la tabla. Solo puede haber uno por tabla. Una tabla con índice clustered se llama *tabla organizada por índice* (B-Tree); sin él se llama *heap*.

La clave del índice clustered queda incluida en todos los nonclustered indexes como "dirección" para el Key Lookup. Normalmente se crea sobre la PK (que lo crea automáticamente con `PRIMARY KEY`).

```sql
CREATE CLUSTERED INDEX ix_cuentas_id ON ddbba.Cuentas(CuentaID);
```

### Índice nonclustered

Copia separada de los datos ordenada por las columnas del índice, más un puntero (clustered key o RID) a la fila de la tabla base. Puede haber hasta 999 por tabla.

```sql
CREATE NONCLUSTERED INDEX ix_venta_ciudad ON ddbba.venta(Ciudad);
```

**Key Lookup**: si el nonclustered index tiene las columnas del WHERE pero le faltan columnas del SELECT, SQL Server debe ir al índice clustered a buscar las columnas faltantes. Operación costosa si afecta muchas filas.

### Índice de cobertura

Incluir con `INCLUDE()` las columnas que aparecen en el SELECT pero no en el WHERE para eliminar el Key Lookup:

```sql
CREATE NONCLUSTERED INDEX ix_displayname_location
    ON dbo.Users(DisplayName)
    INCLUDE (Location);

-- Ahora este query hace solo INDEX SEEK, sin Key Lookup:
SELECT Location FROM dbo.Users WHERE DisplayName LIKE 'John';
```

### Fill factor y page splits

El **fill factor** (factor de llenado) define qué porcentaje de cada página del índice se llena al crearlo o reconstruirlo. Un fill factor del 80% deja un 20% libre para futuras inserciones, reduciendo los **page splits** (divisiones de páginas que son costosas).

```sql
CREATE INDEX ix_Ciudad ON ddbba.venta(Ciudad) WITH (FILLFACTOR = 80);
```

### Rebuild vs. Reorganize

- `ALTER INDEX ix_Ciudad ON ddbba.venta REBUILD` — reconstruye desde cero, elimina toda la fragmentación. Por defecto offline; puede ser ONLINE en ediciones Enterprise. Más pesado.
- `ALTER INDEX ix_Ciudad ON ddbba.venta REORGANIZE` — desfragmenta el nivel hoja de forma incremental, siempre ONLINE. Menos pesado pero no tan efectivo para fragmentación alta.

Regla práctica: **reorganizar** si fragmentación < 30%; **reconstruir** si ≥ 30%.

### Rowstore vs. Columnstore

Las tablas siempre se almacenaron por fila (*rowstore*). Pero al realizar operaciones de agregado sobre muchas filas de pocas columnas, el almacenamiento por columna (*columnstore*) mejora drásticamente la performance.

- Los índices columnstore son ideales en tablas grandes de datawarehouse.
- Se comportan mejor si la tabla es principalmente de consulta (escrituras frecuentes reducen su eficiencia).

```sql
CREATE COLUMNSTORE INDEX ix_cs_ventas ON ddbba.venta(Ciudad, Monto, Fecha);
```

---

## Optimización de consultas

### Planes de ejecución

El **query optimizer** genera planes de ejecución: representaciones del plan de acceso elegido por el motor. El pipeline es:

**Query Parser → Algebrizer → Optimizer → Execution Engine**

El Optimizer elige el plan de menor costo estimado basándose en las estadísticas. No siempre es el plan óptimo real.

- **Plan estimado** (Ctrl+L en SSMS): qué hará el motor, sin ejecutar.
- **Plan real** (Ctrl+M en SSMS): qué hizo el motor. Muestra filas reales vs. estimadas.

**Operadores principales**:

| Operador | Cuándo ocurre |
|----------|--------------|
| TABLE SCAN | Heap sin índice clustered. Recorre toda la tabla. |
| CLUSTERED INDEX SCAN | Recorre todo el índice clustered (equivalente a full scan). |
| CLUSTERED INDEX SEEK | Navega el B-Tree para ir directo a las filas. Óptimo. |
| NONCLUSTERED INDEX SEEK | Usa un nonclustered index para localizar filas. |
| KEY LOOKUP | Va al clustered index a buscar columnas extra. Costoso si afecta muchas filas. |

TABLE SCAN puede ser razonable si la tabla es muy pequeña (pocas centenas de filas) o hay un ETL que luego la borra. En cualquier otro caso es un indicador de problema.

**Caché de planes**: SQL Server reutiliza planes compilados para evitar el costo de recompilación. Queries ad hoc con diferencias mínimas (mayúsculas, espacios) pueden generar planes duplicados. SPs y consultas parametrizadas favorecen la reutilización.

```sql
-- Ver planes en caché:
SELECT cplan.usecounts, cplan.objtype, qtext.text, qplan.query_plan
FROM sys.dm_exec_cached_plans AS cplan
    CROSS APPLY sys.dm_exec_sql_text(plan_handle) AS qtext
    CROSS APPLY sys.dm_exec_query_plan(plan_handle) AS qplan
ORDER BY cplan.usecounts DESC;

-- Limpiar caché de planes (usar con precaución en producción):
DBCC FREEPROCCACHE;
```

### Estadísticas

Información generada y mantenida automáticamente por SQL Server acerca de la **distribución de los valores** de las columnas indexadas. El optimizador las usa para estimar la **cardinalidad** (cantidad de filas) de cada operación.

**Componentes de una estadística**:
- **Encabezado**: información general del conjunto de estadísticas.
- **Grafo de densidad**: selectividad y singularidad (*uniqueness*) de los datos.
- **Histograma**: cuenta tabulada de hasta 200 puntos representativos. Columnas: `RANGE_HI_KEY`, `RANGE_ROWS`, `EQ_ROWS`, `DISTINCT_RANGE_ROWS`, `AVG_RANGE_ROWS`.

Se crean automáticamente en base a campos indexados (con `AUTO_CREATE_STATISTICS` habilitado). Por defecto muestrean un subconjunto de filas; puede forzarse el muestreo completo.

**Actualización sincrónica** (default): antes de ejecutar la query se actualizan si están desactualizadas. Garantiza uso de estadísticas actualizadas. Recomendada tras truncado, inserción masiva (bulk) o actualización de muchas filas.

**Actualización asincrónica**: el optimizador usa las estadísticas aunque no estén actualizadas. Tiempo de respuesta más predecible pero puede generar planes subóptimos.

```sql
-- Actualizar todas las estadísticas de todas las DBs de usuario:
EXEC sp_MSforeachdb 'IF DB_ID(''?'') > 4 USE [?]; EXEC sp_updatestats';

-- Actualizar un índice específico con muestreo del 50%:
UPDATE STATISTICS ddbba.venta (ix_Ciudad) WITH SAMPLE 50 PERCENT;

-- Actualizar toda una tabla con muestreo completo (consume muchos recursos):
UPDATE STATISTICS ddbba.venta WITH FULLSCAN;

-- Ver histograma de un índice:
DBCC SHOW_STATISTICS ('ddbba.venta', ix_Ciudad) WITH HISTOGRAM;
```

### Tips de optimización

**Revisar la consulta**:
- ¿Hay relaciones o tablas de sobra? Observar las subconsultas. Minimizar los `SELECT *`.
- ¿Se usan WHERE y JOIN aprovechando los índices?
- ¿Se pueden usar CTEs para facilitar el mantenimiento y la lectura del plan?

**Revisar el plan de ejecución**:
- ¿Hay algún TABLE SCAN? Evaluar creación de índices. ¿Alguna tabla es un heap? Crear índice clustered.
- ¿Hay mucha diferencia entre filas estimadas y reales? → Actualizar estadísticas.
- Reducir o eliminar el uso de tablas temporales cuando sea posible.

**Tablas temporales vs. variables**:
- Las **tablas variables** (`@t`) NO tienen estadísticas — SQL Server asume siempre 1 fila. Pueden generar planes muy subóptimos en JOINs. Pueden tener un único índice clustered.
- Las **tablas temporales** (`#t`) SÍ tienen estadísticas. Ideales para JOINs sobre conjuntos grandes. Eliminarlas tan pronto dejen de usarse.
- `tempdb` es un recurso compartido — no abusar.

**Cursores**: eliminarlos. Tecnología caduca. Si no es posible: usar solo lectura, forward-only, cerrarlos lo antes posible.

**Tipos de datos**:
- ¿Realmente necesita UNICODE? Si no, usar `CHAR`/`VARCHAR` en lugar de `NCHAR`/`NVARCHAR` → ahorra 50% de espacio.
- ¿Realmente necesita `VARCHAR`? Si el campo no varía, usar `CHAR` → mejor performance (no calcula longitud). Cuidado: rellena con espacios al final.
- Evitar abuso de `FLOAT` para datos monetarios — usar `DECIMAL`/`NUMERIC`.

**SPs y parametrización**: usar SPs o consultas parametrizadas en lugar de literales hardcodeados → facilita reutilización de planes en caché.

---

## Métricas de performance

Las métricas ayudan a entender la **utilización** de la DB y el **consumo** de recursos. Son de utilidad para detectar si un servidor tiene pocos recursos, diagnosticar problemas en desarrollo, y detectar bugs de comportamiento.

### Concepto de baseline

Antes de poder detectar anomalías se necesita una **referencia de comportamiento normal**. Se debe conocer el sistema y su uso por hora/día/período:
- ¿Cuántas transacciones se realizan habitualmente?
- ¿Cuántas filas se agregan por tabla en un período normal?
- ¿Qué ritmo de crecimiento tiene la DB?
- ¿Cuál es la duración estándar de las operaciones críticas?

Los valores fuera de lo normal indican situaciones a investigar.

### Recuento de filas

Usar `sys.dm_db_partition_stats` para obtener un conteo aproximado sin costo de scan:

```sql
-- Todas las tablas de usuario:
SELECT
    schemas.name                                                AS Esquema,
    objects.name                                                AS Tabla,
    CASE WHEN dm_db_partition_stats.index_id = 1
         THEN 'Cluster' ELSE 'Heap' END                        AS TipoTabla,
    dm_db_partition_stats.row_count                             AS CuentaDeFilas
FROM sys.dm_db_partition_stats
    INNER JOIN sys.objects ON objects.object_id = dm_db_partition_stats.object_id
    INNER JOIN sys.schemas ON schemas.schema_id = objects.schema_id
WHERE objects.is_ms_shipped = 0
    AND dm_db_partition_stats.index_id IN (0, 1);
```

> Este método arroja un resultado **aproximado** basándose en datos en memoria. Para la métrica de monitoreo alcanza; para recuento exacto usar `COUNT(*)`.

### Database File IO

La vista `sys.dm_io_virtual_file_stats` se **resetea al reiniciar el servicio SQL**. Debe guardarse a intervalos; los valores son acumulativos. Permite conocer cuántos datos se leen y escriben en cada archivo, tanto de datos como de log.

```sql
SELECT
    databases.name                              AS DB_Nombre,
    master_files.name                           AS DB_Archivo,
    master_files.type_desc                      AS TipoArchivo,
    dm_io_virtual_file_stats.num_of_reads       AS Lecturas,
    dm_io_virtual_file_stats.num_of_bytes_read  AS BytesLeidos,
    dm_io_virtual_file_stats.num_of_writes      AS Escrituras,
    dm_io_virtual_file_stats.num_of_bytes_written AS BytesEscritos
FROM sys.master_files
    INNER JOIN sys.dm_io_virtual_file_stats(NULL, NULL)
        ON master_files.database_id = dm_io_virtual_file_stats.database_id
    INNER JOIN sys.databases
        ON databases.database_id = master_files.database_id
        AND master_files.file_id = dm_io_virtual_file_stats.file_id;
```

### Tamaño del backup del log

En una DB en modelo de recuperación **Full** o **bulk-logged**, los cambios se reflejan en el tamaño del log. Un crecimiento anormal indica una situación a investigar.

> Un `UPDATE` que mantiene los mismos valores igualmente genera entradas en el log. Es un recurso común en programación porque se piensa que no tiene impacto.

```sql
SELECT
    backupset.database_name                                         AS DatabaseNombre,
    CAST(backupset.backup_size / 1024.0 / 1024.0 AS DECIMAL(18,2)) AS BackupMBs,
    backupset.backup_start_date                                     AS FechaInicio,
    backupset.backup_finish_date                                    AS FechaFin,
    backupmediafamily.physical_device_name                          AS UbicacionFisica
FROM msdb.dbo.backupset
    INNER JOIN msdb.dbo.backupmediafamily
        ON backupset.media_set_id = backupmediafamily.media_set_id
    INNER JOIN sys.databases ON databases.name = backupset.database_name
    INNER JOIN sys.master_files
        ON master_files.database_id = databases.database_id
        AND master_files.type_desc = 'ROWS'
WHERE backupset.type = 'L';
```

### Modelo de recuperación

Propiedad de la DB que controla cómo se mantiene el log de transacciones. Son tres: **Simple**, **Full** y **Bulk-logged**. Puede cambiarse en cualquier momento.

| | Simple | Full |
|--|--------|------|
| El log se libera | Al completarse las transacciones (checkpoint) | Cuando se respalda |
| Backup del log | No se respalda | Requiere backups periódicos del log |
| Recuperación posible | Solo a estados respaldados en backup | A un punto específico en el tiempo |
| AlwaysOn / Mirroring | No admite | Sí admite |

**Modelo SIMPLE**: las transacciones confirman, se genera un CHECKPOINT, el log se vuelca al archivo de datos y se libera. Solo se puede recuperar hasta el último backup completo.

**Modelo FULL**: el log de transacciones se mantiene completo hasta que se toma un backup del log. Permite recuperar hasta un punto específico en el tiempo. Requiere gestión activa de los backups del log para que el archivo no crezca indefinidamente.

### Bloqueos y esperas

Una consulta puede demorar por **lentitud intrínseca** (plan ineficiente, falta de índices) o por **esperas** (bloqueada esperando que otros procesos liberen recursos). Las wait stats son útiles para asociar la espera al SPID, al texto de la consulta y al proceso que bloquea.

```sql
SELECT
    @@SERVERNAME                        AS Servidor,
    GETDATE()                           AS HoraLocal,
    dm_exec_requests.session_id,
    dm_exec_requests.blocking_session_id,
    databases.name                      AS DB,
    dm_exec_requests.wait_time,
    dm_exec_requests.wait_type,
    dm_exec_sessions.host_name,
    dm_exec_sessions.login_name,
    SUBSTRING(dm_exec_sql_text.text, 1, 60) + ' ...' AS Begin_SQL
FROM master.sys.dm_exec_requests
    INNER JOIN master.sys.dm_exec_sessions
        ON dm_exec_requests.session_id = dm_exec_sessions.session_id
    OUTER APPLY master.sys.dm_exec_sql_text(dm_exec_requests.sql_handle)
    INNER JOIN sys.databases
        ON databases.database_id = dm_exec_requests.database_id
WHERE dm_exec_sessions.is_user_process = 1;
```

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
