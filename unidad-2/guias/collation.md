---
layout: default
title: Collation / Intercalación
parent: Unidad 2
nav_order: 2
permalink: /unidad-2/guias/collation/
---

[← Unidad 2](../)

## ¿Qué es el collation?

El **collation** (intercalación) determina dos cosas:

1. **Cómo se representan los caracteres** — qué patrón de bits corresponde a cada carácter.
2. **Cómo se comparan y ordenan** — si `'a'` y `'A'` son iguales, si `'a'` y `'á'` son iguales, y en qué orden aparecen al hacer `ORDER BY`.

> Si la columna `nombre` tiene collation `CI_AI`, entonces `WHERE nombre = 'juan'` devolverá también "Juan", "JUAN" y "Juán". Si el collation es `CS_AS`, esas tres variantes son valores distintos.

---

## Nomenclatura

El nombre de un collation sigue el patrón:

```
Idioma_Sensibilidades
```

Ejemplos:
- `Modern_Spanish_CI_AI` → español moderno, insensible a mayúsculas y acentos
- `Modern_Spanish_CS_AS` → español moderno, sensible a mayúsculas y acentos
- `SQL_Latin1_General_CP1_CI_AS` → collation por defecto de muchas instalaciones

### Tabla de sensibilidades

| Código | Significado | Efecto |
|--------|-------------|--------|
| **CI** | Case Insensitive | `'a'` = `'A'` |
| **CS** | Case Sensitive | `'a'` ≠ `'A'` |
| **AI** | Accent Insensitive | `'a'` = `'á'` = `'â'` = `'à'` |
| **AS** | Accent Sensitive | `'a'` ≠ `'á'` |
| **WI** | Width Insensitive | Ignora diferencia de ancho de carácter (relevante en japonés/chino) |
| **WS** | Width Sensitive | Distingue por ancho |
| **KI** | Kana Insensitive | Ignora Hiragana vs Katakana |
| **KS** | Kana Sensitive | Distingue Hiragana de Katakana |

---

## Niveles de collation

El collation se puede definir en tres niveles. Cada nivel hereda del superior si no se especifica explícitamente:

```
Instancia  (default para nuevas bases de datos)
  └── Base de datos  (default para nuevas columnas)
        └── Columna  (override para esa columna específica)
```

Esto permite, por ejemplo, tener una base `CI_AI` con una columna de contraseñas `CS_AS`.

---

## Consultar el collation

```sql
-- Collation de la instancia de SQL Server
SELECT SERVERPROPERTY('collation') AS collation_instancia;

-- Collation de todas las bases de datos
SELECT name, collation_name
FROM sys.databases
ORDER BY name;

-- Collation de las columnas de una tabla
SELECT
    column_name,
    data_type,
    collation_name
FROM information_schema.columns
WHERE table_name = 'mi_tabla'
  AND collation_name IS NOT NULL;

-- Listar todos los collations disponibles en la instancia
SELECT name, description
FROM fn_helpcollations()
WHERE name LIKE 'Modern_Spanish%'
ORDER BY name;
```

---

## Definir el collation

### Al crear la base de datos

```sql
CREATE DATABASE ventas COLLATE Modern_Spanish_CI_AI;
```

### Al crear una tabla con columna específica

```sql
CREATE TABLE productos (
    id          INT            NOT NULL PRIMARY KEY,
    codigo      VARCHAR(20)    COLLATE Modern_Spanish_CS_AS NOT NULL,  -- sensible a may/acent
    descripcion NVARCHAR(200)  NOT NULL  -- hereda el collation de la BD
);
```

### Al modificar una columna existente

```sql
ALTER TABLE productos
ALTER COLUMN codigo VARCHAR(20) COLLATE Modern_Spanish_CS_AS NOT NULL;
```

> Modificar el collation de una columna con datos existentes puede fallar si hay índices o constraints que la referencian. Hay que eliminarlos primero y recrearlos después.

---

## Cláusula COLLATE en queries

Se puede forzar un collation en una expresión específica sin modificar la definición de la tabla. Es útil para resolver conflictos de collation o hacer comparaciones con distintas sensibilidades.

### Búsqueda con sensibilidad distinta a la de la columna

```sql
-- La columna nombre es CI_AI, pero busco de forma CS_AS
SELECT *
FROM usuarios
WHERE nombre = 'Juan' COLLATE Modern_Spanish_CS_AS;
-- Solo devuelve 'Juan', no 'juan' ni 'JUAN'
```

```sql
-- La columna codigo es CS_AS, pero busco ignorando mayúsculas
SELECT *
FROM productos
WHERE codigo = 'ABC-01' COLLATE Modern_Spanish_CI_AI;
-- Devuelve 'ABC-01', 'abc-01', 'Abc-01', etc.
```

### JOIN entre columnas con distintos collations

Cuando se hace un JOIN entre columnas que tienen collations distintos, SQL Server lanza un error de conflicto de collation. La solución es especificar el collation a usar:

```sql
SELECT a.nombre, b.descripcion
FROM tabla_a a
JOIN tabla_b b
    ON a.codigo = b.codigo COLLATE Modern_Spanish_CI_AI;
```

### ORDER BY con collation explícito

```sql
SELECT nombre
FROM empleados
ORDER BY nombre COLLATE Modern_Spanish_CS_AS;
```

---

## Cambiar el collation de la instancia

Cambiar el collation de la instancia es una operación avanzada y destructiva. Requiere detener el servicio y ejecutar en modo monousuario. **No se hace en producción sin planificación previa.**

```batch
sqlservr -m -T4022 -T3659 -s"MSSQLSERVER" -q"Modern_Spanish_CI_AI"
```

| Parámetro | Descripción |
|-----------|-------------|
| `-m` | Modo monousuario |
| `-T4022` | Deshabilita procedimientos de inicio automático |
| `-T3659` | Log de errores de configuración |
| `-s"MSSQLSERVER"` | Nombre de la instancia (o el nombre de la instancia nombrada) |
| `-q"collation_name"` | Nuevo collation a aplicar |

---

## Casos de uso frecuentes

| Situación | Collation recomendado |
|-----------|----------------------|
| Aplicación web en español, búsquedas permisivas | `Modern_Spanish_CI_AI` |
| Columna de contraseñas (hash) | `Latin1_General_BIN` o `CS_AS` |
| Código de producto exacto | `Modern_Spanish_CS_AS` |
| Migración desde sistema legacy con latin1 | `SQL_Latin1_General_CP1_CI_AS` |
| Integración con sistema Linux (case-sensitive) | `Modern_Spanish_CS_AS` |
