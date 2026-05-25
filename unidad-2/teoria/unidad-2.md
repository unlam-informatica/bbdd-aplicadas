---
layout: default
title: Introducción
parent: Unidad 2
nav_order: 1
permalink: /unidad-2/teoria/bd-transaccionales/
---

- [BD Transaccionales: aspectos básicos](#bd-transaccionales-aspectos-básicos)
  - [Bases de datos transaccionales (OLTP)](#bases-de-datos-transaccionales-oltp)
    - [Propiedades ACID](#propiedades-acid)
      - [Atomicidad](#atomicidad)
      - [Consistencia](#consistencia)
      - [Isolation (Aislamiento)](#isolation-aislamiento)
  - [El problema sin aislamiento](#el-problema-sin-aislamiento)
  - [Los tres problemas clásicos](#los-tres-problemas-clásicos)
  - [Niveles de aislamiento](#niveles-de-aislamiento)
    - [OLTP vs OLAP](#oltp-vs-olap)
  - [BD, Data Warehouse y Data Lake](#bd-data-warehouse-y-data-lake)
  - [Arquitectura distribuida y clústeres](#arquitectura-distribuida-y-clústeres)
    - [Modalidades de despliegue](#modalidades-de-despliegue)
    - [Always On (SQL Server)](#always-on-sql-server)
  - [Motor de base de datos SQL Server](#motor-de-base-de-datos-sql-server)
    - [Instalación y componentes](#instalación-y-componentes)
      - [Ediciones](#ediciones)
      - [Tipos de instancia](#tipos-de-instancia)
    - [Conexión local y remota](#conexión-local-y-remota)
    - [Autenticación](#autenticación)
  - [Collation / Intercalación](#collation--intercalación)
  - [Bases de datos en memoria](#bases-de-datos-en-memoria)

# BD Transaccionales: aspectos básicos

## Bases de datos transaccionales (OLTP)

Una **base de datos transaccional** (OLTP, _Online Transaction Processing_) es aquella diseñada para procesar un gran volumen de transacciones pequeñas de forma concurrente: inserciones, actualizaciones, eliminaciones y consultas puntuales.

Una **transacción** es una unidad lógica de trabajo formada por una o más operaciones SQL que deben ejecutarse como un todo indivisible. Si alguna operación falla, todas se revierten.

Ejemplos de sistemas OLTP: banca en línea, e-commerce, sistemas de reservas de vuelos, terminales punto de venta (POS).

### Propiedades ACID

![ACID properties](../images/acid-props.png)

| Propiedad | Significado |
|-----------|-------------|
| **Atomicidad** | La transacción se ejecuta completa o no se ejecuta. No hay estados intermedios visibles. |
| **Consistencia** | La transacción lleva la base de datos de un estado consistente a otro. No viola restricciones de integridad. |
| **Isolation (Aislamiento)** | Las transacciones concurrentes se comportan como si se ejecutasen secuencialmente. Los cambios de una transacción no son visibles para otras hasta que se confirman. |
| **Durabilidad** | Una vez confirmada (commit), la transacción persiste aunque ocurra una falla del sistema. |

#### Atomicidad

La **atomicidad** garantiza que una transacción se ejecuta como una unidad indivisible: o todas sus operaciones tienen éxito, o ninguna se aplica. No existe un estado intermedio visible para la base de datos.

El ejemplo clásico es una transferencia bancaria. Supongamos que Lucía le transfiere $500 a Marcos:

```sql
BEGIN TRANSACTION;
    UPDATE cuentas SET saldo = saldo - 500 WHERE titular = 'Lucía';
    UPDATE cuentas SET saldo = saldo + 500 WHERE titular = 'Marcos';
COMMIT;
```

Si el sistema cae después del primer `UPDATE` pero antes del segundo, sin atomicidad Lucía perdería $500 y Marcos no recibiría nada. Con atomicidad, el motor hace un `ROLLBACK` automático y ambas cuentas vuelven a su estado original.

```
Estado inicial:   Lucía $1000  |  Marcos $200

Caso exitoso (COMMIT):
  1. Lucía  → $500  ✓
  2. Marcos → $700  ✓
  → ambos cambios se confirman juntos

Caso con fallo (ROLLBACK):
  1. Lucía  → $500  ✓
  2. [falla del sistema]
  → se deshace el paso 1, Lucía vuelve a $1000
```

En la práctica los motores implementan esto con un **write-ahead log (WAL)**: antes de modificar los datos reales, escriben en un log qué se va a cambiar. Si algo falla, el motor lee el log al reiniciar y revierte las operaciones incompletas.

#### Consistencia

La **consistencia** garantiza que una transacción lleva la base de datos de un estado válido a otro estado válido, respetando todas las reglas definidas (restricciones, claves foráneas, tipos de datos, etc.).

La diferencia clave con atomicidad: la atomicidad habla de *si* los cambios se aplican; la consistencia habla de *qué* cambios son válidos.

Ejemplo: un sistema de stock con restricción de que el saldo de unidades nunca puede ser negativo.

```
Estado inicial:   Auriculares → 3 unidades

Sin consistencia:
  3 - 10 = -3 unidades  ← estado inválido, viola la restricción
  → la base de datos queda rota

Con consistencia:
  La BD detecta que -3 viola CHECK (unidades >= 0)
  → rechaza la transacción completa
  → Auriculares sigue en 3 unidades (estado válido)
```

Otro ejemplo: las claves foráneas.

```sql
-- No podés agregar un pedido de un cliente que no existe
INSERT INTO pedidos (id_pedido, id_cliente, total)
VALUES (101, 9999, 500);
-- Error: id_cliente = 9999 no existe en clientes
```

Las reglas que protege la consistencia tienen dos orígenes: las que define el motor (`CHECK`, `NOT NULL`, `UNIQUE`, FK) se verifican automáticamente. Las que define la aplicación (ej: "el total debe coincidir con la suma de ítems") son responsabilidad del desarrollador.

#### Isolation (Aislamiento)

El **aislamiento** garantiza que las transacciones concurrentes no se interfieren entre sí. Cada transacción debe ejecutarse como si fuera la única en el sistema, aunque haya cientos corriendo al mismo tiempo.

Es la propiedad más compleja de ACID porque implica un balance: más aislamiento = más consistencia, pero menos rendimiento.

---

## El problema sin aislamiento

Dos cajeros atienden a la misma cuenta simultáneamente:

```
Saldo inicial de cuenta: $1000

Cajero A (retiro $700)        Cajero B (retiro $600)
────────────────────────      ────────────────────────
1. Lee saldo → $1000
                              2. Lee saldo → $1000
3. Calcula: 1000 - 700 = 300
                              4. Calcula: 1000 - 600 = 400
5. Escribe saldo → $300
                              6. Escribe saldo → $400  ← pisa el paso 5

Resultado final: $400
Debería ser:     -$300 (o rechazado por saldo insuficiente)
El banco perdió $700.
```

Esto se llama **lost update** (actualización perdida) — uno de los tres problemas clásicos de concurrencia.

---

## Los tres problemas clásicos

**1. Dirty read**

Leer un dato que otra transacción modificó pero todavía NO confirmó (no hizo commit). Si esa otra transacción después hace rollback, vos leíste algo que nunca existió realmente.

```
Transacción A                 Transacción B
─────────────────────         ─────────────────────
UPDATE saldo = 1500
                              SELECT saldo → 1500  ← lee el cambio no confirmado
ROLLBACK (falla)
                              usa 1500 para calcular algo
                              → decisión basada en un dato que nunca existió
```

**2. Non-repeatable read**

Lees un dato, otra transacción lo modifica y SÍ confirma (commit), y cuando volvés a leer el mismo registro dentro de tu transacción, obtenés un valor distinto.

```
Transacción A                 Transacción B
─────────────────────         ─────────────────────
SELECT saldo → 1000
                              UPDATE saldo = 500
                              COMMIT
SELECT saldo → 500  ← el mismo SELECT devuelve otro valor
```

**3. Phantom read** — aparecen o desaparecen filas entre dos lecturas:

Un phantom read ocurre cuando una transacción ejecuta dos veces la misma consulta y, entre ambas lecturas, otra transacción inserta o elimina filas que cumplen esa condición.

```
Transacción A                 Transacción B
─────────────────────         ─────────────────────
SELECT COUNT(*) → 10 pedidos
                              INSERT nuevo pedido
                              COMMIT
SELECT COUNT(*) → 11 pedidos  ← apareció una fila "fantasma"
```


| Problema                | Qué cambia                                         |
| ----------------------- | -------------------------------------------------- |
| **Dirty read**          | Leés datos no confirmados                          |
| **Non-repeatable read** | La misma fila cambia                               |
| **Phantom read**        | Aparecen o desaparecen filas nuevas en el conjunto |

---

## Niveles de aislamiento

SQL define cuatro niveles, cada uno bloqueando más problemas a cambio de mayor costo en rendimiento:

| Nivel | Dirty read | Non-repeatable read | Phantom read |
|---|:---:|:---:|:---:|
| `READ UNCOMMITTED` | posible | posible | posible |
| `READ COMMITTED` | bloqueado | posible | posible |
| `REPEATABLE READ` | bloqueado | bloqueado | posible |
| `SERIALIZABLE` | bloqueado | bloqueado | bloqueado |

La mayoría de los sistemas usan `READ COMMITTED` (el default en SQL Server y PostgreSQL) porque evita el problema más grave sin el costo de bloquear todo. `SERIALIZABLE` garantiza aislamiento total pero puede degradar el rendimiento en sistemas con alta concurrencia.

SQL Server agrega además `SNAPSHOT ISOLATION`, que usa versiones de fila en lugar de bloqueos. Ver la [guía de Transacciones](/unidad-2/guias/transacciones/) para la sintaxis completa de `BEGIN/COMMIT/ROLLBACK`, `TRY/CATCH`, `XACT_ABORT` y ejemplos de cada nivel.

### OLTP vs OLAP

| Característica | OLTP | OLAP |
|----------------|------|------|
| Propósito | Operaciones del día a día | Análisis e informes |
| Operaciones | INSERT, UPDATE, DELETE, SELECT puntual | SELECT con agregaciones complejas |
| Usuarios concurrentes | Miles | Decenas |
| Volumen de datos por query | Pocos registros | Millones de filas |
| Diseño | Normalizado (3FN o superior) | Desnormalizado (estrella, copo de nieve) |
| Ejemplos | ERP, banca, e-commerce | Data Warehouse, Business Intelligence |

| Ventajas OLTP | Desventajas OLTP |
|----------|-------------|
| Integridad garantizada (ACID) | No optimizado para análisis complejos |
| Alta concurrencia | Queries analíticas pesadas degradan el rendimiento |
| Recuperación ante fallos | Esquemas normalizados → múltiples JOINs |
| Historial de cambios mediante logs | Escalado costoso en volúmenes muy grandes |

---

## BD, Data Warehouse y Data Lake

| | Base de datos (OLTP) | Data Warehouse | Data Lake |
|---|---|---|---|
| **Datos** | Actuales, transaccionales | Históricos, integrados de múltiples fuentes | Crudos, cualquier formato |
| **Estructura** | Normalizada | Desnormalizada (estrella/copo de nieve) | Sin estructura predefinida (schema-on-read) |
| **Propósito** | Operaciones diarias | Análisis y reporting | Exploración, ML, big data |
| **Usuarios** | Aplicaciones, usuarios finales | Analistas, BI tools | Data scientists, ingenieros de datos |
| **Carga** | Tiempo real | ETL periódico | ELT (transformación posterior) |
| **Costo storage** | Medio | Alto | Bajo |
| **Ejemplos** | SQL Server, MySQL | SQL Server Analysis Services, Redshift | Azure Data Lake, S3 |

**ETL** (_Extract, Transform, Load_): proceso clásico de carga en un DWH. Los datos se extraen de las fuentes, se transforman (limpian, integran) y se cargan transformados.

**ELT** (_Extract, Load, Transform_): variante moderna para Data Lakes. Los datos se cargan crudos y se transforman después, cuando se necesitan.

---

## Arquitectura distribuida y clústeres

Una **base de datos distribuida** almacena datos en múltiples nodos (servidores) que cooperan como si fuesen un sistema único.

Un **clúster** es un conjunto de servidores que trabajan juntos para proporcionar:

- **Alta disponibilidad**: si un nodo falla, otro toma el control (_failover_).
- **Escalabilidad horizontal**: agregar nodos para manejar más carga.
- **Balanceo de carga**: distribuir consultas entre nodos.

### Modalidades de despliegue

**En la nube**: escalado automático según demanda, pago por uso, alta disponibilidad gestionada (ej: Azure SQL Managed Instance, Amazon RDS).

**Servidores dedicados (on-premise)**: control total sobre hardware y configuración, mayor inversión inicial, requiere administración propia.

### Always On (SQL Server)

SQL Server implementa alta disponibilidad mediante **Always On Availability Groups**:
- Un nodo primario recibe lecturas y escrituras.
- Nodos secundarios reciben réplicas del log de transacciones.
- En caso de falla del primario, un secundario asume automáticamente.

---

## Motor de base de datos SQL Server

SQL Server es el RDBMS de Microsoft. Implementa el estándar SQL con extensiones propias (T-SQL).

### Instalación y componentes

| Componente | Descripción |
|-----------|-------------|
| **SQL Server Engine** | El motor: procesa consultas, gestiona transacciones, almacena datos |
| **SSMS** | IDE gráfico para administrar instancias, ejecutar queries, diseñar esquemas |
| **SQL Server Configuration Manager** | Gestión de servicios Windows y configuración de red (protocolos, puertos) |
| **SQL Server Agent** | Automatización de tareas: jobs, alertas, mantenimiento programado |
| **SQL Server Browser** | Resuelve nombres de instancias nombradas para conexiones remotas |

#### Ediciones

| Edición | Uso |
|---------|-----|
| Developer | Gratuita, funcionalidades completas, solo para desarrollo/testing |
| Express | Gratuita, limitada (10 GB, sin Agent), para aplicaciones pequeñas |
| Standard | Licenciada, funcionalidades parciales |
| Enterprise | Licenciada, funcionalidades completas (Always On, columnstore, etc.) |

#### Tipos de instancia

- **Instancia default**: identificada solo con el nombre del servidor (`MI_SERVIDOR`). Servicio: `MSSQLSERVER`.
- **Instancia nombrada**: identificada con `SERVIDOR\NOMBRE_INSTANCIA`. Servicio: `MSSQL$NOMBRE_INSTANCIA`. Un servidor puede tener múltiples instancias nombradas.

**SQL Server Configuration Manager** permite:
- Iniciar/detener/pausar servicios.
- Habilitar protocolos de red (TCP/IP, Named Pipes, Shared Memory).
- Configurar el puerto TCP (por defecto **1433** para la instancia default).
- Gestionar alias de servidores y certificados SSL.

### Conexión local y remota

**Conexión local** — no requiere configuración adicional. Se puede usar `.`, `localhost`, nombre del equipo o `(local)`.

**Conexión remota** — pasos necesarios:
1. En Configuration Manager → habilitar **TCP/IP**.
2. Abrir el puerto **1433** en el firewall de Windows.
3. Si se usa instancia nombrada, habilitar el servicio **SQL Server Browser**.
4. En SSMS: _Server Properties → Connections → Allow remote connections_.

**Strings de conexión:**

```
-- Instancia default
Server=mi_servidor,1433;Database=mi_bd;User Id=usuario;Password=contraseña;

-- Instancia nombrada
Server=mi_servidor\INSTANCIA;Database=mi_bd;Integrated Security=True;
```

### Autenticación

| Modo | Descripción |
|------|-------------|
| **Windows Authentication** | Usa credenciales del SO. SQL Server verifica contra Active Directory. Más segura en entornos Windows. |
| **SQL Server Authentication** | Usuario y contraseña gestionados por el motor. Necesario para conexiones desde otros SO o apps externas. |

Para usar ambas, el servidor debe estar en modo **SQL Server and Windows Authentication** (_Server Properties → Security_).

---

## Collation / Intercalación

El **collation** define las reglas de comparación y ordenación de texto: si `'a'` y `'A'` son iguales, si `'a'` y `'á'` son iguales, y el orden en `ORDER BY` sobre columnas de texto.

El nombre sigue el patrón `Idioma_Sensibilidades`, por ejemplo `Modern_Spanish_CI_AI`:

| Código | Nombre | Descripción |
|--------|--------|-------------|
| **CI/CS** | Case Insensitive/Sensitive | `'a'` = `'A'` / `'a'` ≠ `'A'` |
| **AI/AS** | Accent Insensitive/Sensitive | `'a'` = `'á'` / `'a'` ≠ `'á'` |

El collation se puede definir a nivel de instancia, base de datos o columna, y heredarse en cascada. Ver la [guía de Collation](/unidad-2/guias/collation/) para consultas, cambios y cláusula `COLLATE` en queries.

---

## Bases de datos en memoria

Las bases de datos **en memoria** (_in-memory_) almacenan los datos directamente en RAM. Eliminan la latencia de I/O de disco y permiten estructuras de datos optimizadas para acceso en memoria.

SQL Server incluye soporte nativo mediante **In-Memory OLTP**. Las tablas en memoria pueden tener dos modos de durabilidad:

| Modo | Descripción |
|------|-------------|
| `SCHEMA_AND_DATA` | Esquema y datos persisten al reiniciar (durabilidad completa) |
| `SCHEMA_ONLY` | Solo el esquema persiste; los datos se pierden al reiniciar (volátil) |

| Característica | Variable de tabla (`@tabla`) | Tabla temporal (`#tabla`) | Tabla en memoria |
|----------------|------------------------------|---------------------------|-----------------|
| Almacenamiento | TempDB | TempDB | RAM |
| Persiste entre sesiones | No | No | Sí (con `SCHEMA_AND_DATA`) |
| Estadísticas | No | Sí | Sí |
| Concurrencia | Baja | Media | Muy alta (lock-free) |

Ver la [guía de BD en Memoria](/unidad-2/guias/bd-en-memoria/) para la implementación completa con `FILEGROUP`, índices hash y comparativas de rendimiento.
