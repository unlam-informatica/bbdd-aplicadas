---
layout: default
title: BD en memoria
parent: Teoría
grand_parent: Unidad 2
nav_order: 2
permalink: /unidad-2/guias/bd-en-memoria/
---

[← Unidad 2](../)

## ¿Qué es una base de datos en memoria?

Una **base de datos en memoria** almacena todos los datos en la memoria principal (RAM) del servidor, en lugar de en dispositivos de almacenamiento secundario (disco duro, SSD). La CPU tiene acceso directo a los datos en RAM —sin latencia de E/S— lo que hace que las operaciones de lectura y escritura sean órdenes de magnitud más rápidas que en una base de datos basada en disco.

**Ejemplo de uso**: subastas de anuncios en tiempo real (_real-time bidding_). Mientras una página web carga, la plataforma recopila ofertas de múltiples postores, elige la ganadora y muestra el anuncio — todo en milisegundos. Solo una BD en memoria puede cumplir ese requisito de latencia.

---

## ¿Por qué las organizaciones la necesitan?

Con la llegada del **IoT** (Internet de las Cosas) y el crecimiento de las soluciones en la nube, las organizaciones deben procesar datos en tiempo real. Millones de dispositivos —monitores de salud, sensores industriales, terminales de seguridad— generan datos cada segundo que deben analizarse de inmediato.

Una organización debería considerar una BD en memoria si:

- Necesita aprovechar ventajas en tiempo real de Big Data.
- Recopila datos periódicamente y requiere acceso de baja latencia.
- La persistencia inmediata no es un requerimiento crítico (o puede manejarse con técnicas adicionales).

---

## BD en memoria vs. BD basada en disco

| Aspecto | BD basada en disco | BD en memoria |
|---------|--------------------|---------------|
| **Velocidad** | Cada operación requiere E/S al disco | Acceso directo en RAM; sin latencia de E/S |
| **Persistencia** | Persistente por defecto | Volátil — requiere técnicas adicionales |
| **Estructuras de datos** | Complejas (árboles B, páginas de 8 kB) | Simples — el acceso aleatorio en RAM ya es eficiente |
| **Sistemas embebidos** | Requiere almacenamiento secundario | Puede ejecutarse sin disco (IoT, smart TV, consolas) |
| **Límite de tamaño** | Terabytes | Limitado a la RAM disponible (típicamente GBs) |
| **Fragmentación** | Las páginas se fragmentan → requiere mantenimiento | Sin fragmentación; compactación vía proceso MERGE |

---

## Durabilidad: cómo resolver la volatilidad

La RAM es **volátil**: si el sistema falla, los datos se pierden. Para cumplir la propiedad ACID de Durabilidad, las BDs en memoria combinan tres técnicas:

### Instantáneas (snapshots)

Copias periódicas del estado completo de la BD, guardadas en almacenamiento no volátil (disco). Son una "foto" del momento en que se tomaron.

**Limitación**: si el sistema falla después de la última instantánea, se pierden los cambios posteriores. Las instantáneas solas no garantizan durabilidad completa.

### Registros de transacciones

La BD mantiene un log de cada modificación (INSERT, UPDATE, DELETE) en un archivo no volátil. En caso de falla, el log permite reconstruir el estado exacto hasta el último commit.

**Costo**: en sistemas con miles de operaciones por minuto, el log agrega sobrecarga de E/S y almacenamiento. La mayoría de las BDs en memoria combinan ambas técnicas: conservan el log hasta la próxima instantánea y luego lo descartan.

### NVRAM

RAM con respaldo de batería o EEPROM que retiene datos aunque se corte la energía. Permite confirmar transacciones a velocidad de RAM con garantía de persistencia sin recurrir al disco.

| Técnica | Velocidad | Garantía | Costo |
|---------|-----------|----------|-------|
| Instantáneas | Alta | Parcial (datos entre snapshots pueden perderse) | Bajo |
| Registros | Media (E/S al log) | Alta | Medio |
| NVRAM | Muy alta (velocidad de RAM) | Alta | Alto (hardware especializado) |

---

## Ventajas y desventajas

| | Aspecto | Detalle |
|-|---------|---------|
| ✅ | **Rendimiento** | Sin E/S de disco: lecturas/escrituras órdenes de magnitud más rápidas |
| ✅ | **Estructuras simples** | El acceso aleatorio en RAM es eficiente; no se necesitan árboles B ni bloques contiguos |
| ✅ | **Sistemas embebidos** | No requiere almacenamiento secundario — apto para dispositivos IoT sin disco |
| ✅ | **ACID completo** | Con snapshots + logs o NVRAM, garantiza las cuatro propiedades ACID |
| ✅ | **Lista para la nube** | Se ofrece como DBaaS (Database as a Service), escalando bajo demanda |
| ❌ | **Volatilidad** | Los datos se pierden ante una falla (mitigado con las técnicas de durabilidad) |
| ❌ | **Tamaño limitado** | La RAM disponible limita la capacidad — solución: clústeres que suman RAM de varios nodos |

---

## ¿Qué es In-Memory OLTP?

**In-Memory OLTP** (anteriormente "Hekaton") es la tecnología de SQL Server para tablas optimizadas para memoria. Los datos viven en RAM en lugar de en disco, eliminando la latencia de I/O y permitiendo concurrencia altísima sin bloqueos (_lock-free_).

**Cuándo usarlas**: cargas de trabajo OLTP con muy alta concurrencia y requerimientos de latencia baja — colas de mensajes, tablas de sesión, caché de precios, inventario en tiempo real.

---

## Comparativa de tipos de tabla en SQL Server

| Característica | Variable de tabla (`@t`) | Tabla temporal (`#t`) | Tabla en memoria |
|----------------|--------------------------|----------------------|-----------------|
| Alcance | Lote o procedimiento | Sesión | Base de datos (global) |
| Almacenamiento | TempDB | TempDB | RAM |
| Persiste al reiniciar | No | No | Sí (con `SCHEMA_AND_DATA`) |
| Estadísticas automáticas | No | Sí | Sí |
| Índices | Solo PK implícita | Cualquier índice | Hash y Range (nonclustered) |
| Concurrencia | Baja | Media | Muy alta (lock-free) |
| Requiere configuración previa | No | No | Sí (FILEGROUP especial) |
| Permite FK | No | No | No |

---

## Tablas temporales

Las tablas temporales se almacenan en la base de datos del sistema **TempDB** y se eliminan automáticamente cuando ya no son necesarias. Existen dos variantes: locales (`#`) y globales (`##`).

### Tabla temporal local (`#`)

```sql
CREATE TABLE #temporal (
    a INT PRIMARY KEY,
    b VARCHAR(10)
);

INSERT #temporal VALUES (11, 'Hola');
SELECT * FROM #temporal;

-- También accesible desde otras BDs en la misma sesión:
SELECT * FROM pruebasDB.dbo.#temporal;   -- misma tabla
SELECT * FROM otraBD.dbo.#temporal;      -- misma tabla
```

Comportamiento clave:

| Característica | Detalle |
|----------------|---------|
| Alcance | Solo la sesión que la crea |
| Almacenamiento | TempDB, con sufijo único automático (ej: `#temporal_____00000000001D`) |
| Sufijo único | SQL Server lo agrega para que múltiples sesiones puedan tener una `#temporal` simultánea |
| Esquema en CREATE | Se ignora: `ddbba.#temporal` queda bajo `dbo` de TempDB |
| Visibilidad cruzada (misma sesión) | La misma tabla es accesible desde cualquier BD de la sesión |
| Visibilidad entre sesiones | No — otra sesión no puede verla |
| Duración | Se elimina al cerrar la sesión o salir del bloque de alcance (procedimiento, lote) |

### Tabla temporal global (`##`)

```sql
CREATE TABLE ##temporalGlobal (
    a INT PRIMARY KEY,
    b VARCHAR(20)
);

INSERT ##temporalGlobal VALUES (1, 'Compartida');

-- Visible desde cualquier sesión activa
SELECT * FROM ##temporalGlobal;
```

Comportamiento clave:

| Característica | Detalle |
|----------------|---------|
| Alcance | Todas las sesiones activas |
| Nombre en TempDB | Sin sufijo — el nombre es exactamente `##temporalGlobal` |
| Nombres simultáneos iguales | No permitidos (colisión de nombres) |
| Duración | Se elimina cuando la sesión creadora se cierra **y** no quedan referencias abiertas |
| Transacciones | Si otra sesión inicia un `DELETE` sin confirmar, la tabla no se elimina hasta que esa transacción se resuelva (COMMIT o ROLLBACK) |

### Comparativa `#` vs `##`

| Característica | `#temporal` (local) | `##temporalGlobal` (global) |
|----------------|---------------------|-----------------------------|
| Visible en otras sesiones | No | Sí |
| Sufijo único en TempDB | Sí | No |
| Simultáneas con mismo nombre | Sí (sufijo distingue) | No (colisión) |
| Duración | Cierre de sesión | Cierre de sesión creadora + sin referencias |

> La collation de las tablas temporales (locales y globales) es la de **TempDB**, que hereda la collation de la instancia. Puede diferir de la BD de trabajo y generar conflictos de collation en comparaciones cruzadas.

---

## Modos de durabilidad

| Modo | Descripción |
|------|-------------|
| `SCHEMA_AND_DATA` | Esquema y datos persisten al reiniciar SQL Server. Usa transaction log para garantizar durabilidad ACID. |
| `SCHEMA_ONLY` | Solo el esquema persiste. Los datos se pierden al reiniciar. Útil para tablas de staging o caché. |

---

## Configuración paso a paso

### 1. Agregar FILEGROUP especial a la base de datos

La BD debe tener un filegroup de tipo `MEMORY_OPTIMIZED_DATA`:

```sql
-- Verificar si ya existe
SELECT name, type_desc
FROM sys.filegroups
WHERE type = 'FX';

-- Agregar el filegroup (solo si no existe)
ALTER DATABASE mi_bd
ADD FILEGROUP fg_inmemoria CONTAINS MEMORY_OPTIMIZED_DATA;

-- Agregar un archivo al filegroup
-- La ruta es un DIRECTORIO (SQL Server lo gestiona)
ALTER DATABASE mi_bd
ADD FILE (
    NAME     = 'fg_inmemoria_datos',
    FILENAME = 'C:\datos\mi_bd_inmemoria'
) TO FILEGROUP fg_inmemoria;
```

> El directorio especificado en `FILENAME` no debe existir; SQL Server lo crea.

### 2. Crear tabla en memoria con durabilidad completa

```sql
CREATE TABLE inventario_cache (
    producto_id  INT             NOT NULL,
    descripcion  NVARCHAR(200)   NOT NULL,
    stock        INT             NOT NULL DEFAULT 0,
    precio       DECIMAL(12, 2)  NOT NULL,
    CONSTRAINT PK_inventario PRIMARY KEY NONCLUSTERED (producto_id)
) WITH (
    MEMORY_OPTIMIZED = ON,
    DURABILITY       = SCHEMA_AND_DATA
);
```

### 3. Crear tabla en memoria volátil (staging / caché)

```sql
CREATE TABLE sesiones_activas (
    session_id   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    usuario_id   INT              NOT NULL,
    inicio       DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
    datos        NVARCHAR(MAX)    NULL,
    CONSTRAINT PK_sesiones PRIMARY KEY NONCLUSTERED (session_id)
) WITH (
    MEMORY_OPTIMIZED = ON,
    DURABILITY       = SCHEMA_ONLY
);
```

---

## Restricciones de las tablas en memoria

| Restricción | Detalle |
|-------------|---------|
| Columnas NOT NULL | Todas las columnas deben ser `NOT NULL` o tener valor por defecto. |
| PK obligatoria | Toda tabla en memoria debe tener una PRIMARY KEY. |
| PK debe ser NONCLUSTERED | No se permite `CLUSTERED` en tablas en memoria. |
| Sin claves foráneas | Las tablas en memoria no pueden tener FK referenciando otras tablas. |
| Sin columnas calculadas | No se admiten `COMPUTED COLUMNS`. |
| Tipos soportados | `INT`, `BIGINT`, `DECIMAL`, `FLOAT`, `NVARCHAR(n)`, `DATETIME2`, `BIT`, `UNIQUEIDENTIFIER`, entre otros. No se admite `VARCHAR(MAX)` como columna de índice. |
| Sin `TRUNCATE TABLE` | Usar `DELETE FROM tabla` en su lugar. |

---

## Índices en tablas en memoria

Las tablas en memoria soportan dos tipos de índices:

### Hash index

Óptimo para búsquedas de igualdad exacta (`WHERE id = 5`). No sirve para rangos.

```sql
CREATE TABLE pedidos_cache (
    pedido_id   INT          NOT NULL,
    cliente_id  INT          NOT NULL,
    total       MONEY        NOT NULL,
    CONSTRAINT PK_pedidos PRIMARY KEY NONCLUSTERED HASH (pedido_id)
        WITH (BUCKET_COUNT = 1000000),  -- estimación: 2x el max de filas esperadas
    INDEX idx_cliente HASH (cliente_id)
        WITH (BUCKET_COUNT = 500000)
) WITH (MEMORY_OPTIMIZED = ON, DURABILITY = SCHEMA_AND_DATA);
```

### Range index (Nonclustered)

Óptimo para búsquedas por rango, `ORDER BY`, `BETWEEN`. Usa una estructura de árbol B+.

```sql
CREATE TABLE log_transacciones (
    log_id   BIGINT    NOT NULL,
    fecha    DATETIME2 NOT NULL,
    monto    MONEY     NOT NULL,
    CONSTRAINT PK_log PRIMARY KEY NONCLUSTERED (log_id),
    INDEX idx_fecha NONCLUSTERED (fecha)  -- soporta ORDER BY y rangos
) WITH (MEMORY_OPTIMIZED = ON, DURABILITY = SCHEMA_AND_DATA);
```

---

## Uso desde procedimientos almacenados

Los procedimientos almacenados compilados nativamente (_natively compiled stored procedures_) se compilan a código máquina en el momento de creación, ofreciendo el mayor rendimiento posible:

```sql
CREATE PROCEDURE insertar_log
    @monto MONEY,
    @fecha DATETIME2
WITH NATIVE_COMPILATION, SCHEMABINDING, EXECUTE AS OWNER
AS
BEGIN ATOMIC WITH (TRANSACTION ISOLATION LEVEL = SNAPSHOT, LANGUAGE = 'Spanish')
    INSERT INTO dbo.log_transacciones (log_id, fecha, monto)
    VALUES (NEXT VALUE FOR seq_log, @fecha, @monto);
END;
```

Para uso general (sin compilación nativa), las tablas en memoria se usan igual que las tablas disco:

```sql
-- INSERT normal
INSERT INTO inventario_cache (producto_id, descripcion, stock, precio)
VALUES (1, 'Teclado mecánico', 50, 8500.00);

-- UPDATE normal
UPDATE inventario_cache SET stock = stock - 1 WHERE producto_id = 1;

-- SELECT normal
SELECT * FROM inventario_cache WHERE stock > 0;
```

---

## Almacenamiento interno: disco vs. memoria optimizada

La siguiente tabla resume cómo difiere el almacenamiento a nivel interno entre una tabla basada en disco y una tabla con optimización para memoria en SQL Server:

| Categoría | Tabla basada en disco | Tabla optimizada para memoria |
|-----------|----------------------|-------------------------------|
| **DDL** | Metadatos en tablas del sistema del grupo de archivos principal | Igual — metadatos accesibles vía vistas de catálogo |
| **Estructura** | Filas en páginas de 8 kB; una página almacena solo filas de la misma tabla | Filas individuales sin estructura de página; dos filas consecutivas de un archivo pueden ser de tablas distintas |
| **Índices** | Almacenados en páginas junto a los datos | Solo se conserva la definición; los índices se mantienen en RAM y se regeneran al reiniciar la BD — sin registro de cambios de índice |
| **Operaciones DML** | Primero se carga la página al buffer pool (E/S), luego se modifica | Los datos ya están en RAM — operaciones directas; un hilo de fondo escribe en los archivos de datos y delta para persistir |
| **UPDATE** | Modificación en contexto (o insert+delete para columnas de clave) | Se registra como DELETE + INSERT → genera una nueva versión de fila |
| **Fragmentación** | Las páginas se fragmentan con el tiempo → requiere `REBUILD`/`REORGANIZE` | Sin páginas → sin fragmentación; compactación mediante proceso `MERGE` en segundo plano |

> **Clave de rendimiento**: las tablas en memoria eliminan el _buffer pool_ (carga de páginas a caché) que es el principal cuello de botella de las tablas en disco bajo alta concurrencia.

---

## Consultas de monitoreo

```sql
-- Ver tablas en memoria en la BD actual
SELECT
    t.name                  AS tabla,
    t.durability_desc       AS durabilidad,
    SUM(s.memory_allocated_for_table_kb) / 1024.0 AS memoria_mb
FROM sys.tables t
JOIN sys.dm_db_xtp_table_memory_stats s ON t.object_id = s.object_id
WHERE t.is_memory_optimized = 1
GROUP BY t.name, t.durability_desc;

-- Verificar que el filegroup de memoria existe
SELECT name, type_desc FROM sys.filegroups WHERE type = 'FX';
```
