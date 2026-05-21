---
layout: default
title: Formatos de intercambio
parent: Unidad 2
nav_order: 4
permalink: /unidad-2/guias/formatos-de-intercambio/
---

[← Unidad 2](../)

- [EDI — Electronic Data Interchange](#edi--electronic-data-interchange)
- [CSV / TSV](#csv--tsv)
  - [Importar CSV en SQL Server](#importar-csv-en-sql-server)
- [Ancho fijo](#ancho-fijo)
- [XML — eXtended Markup Language](#xml--extended-markup-language)
  - [XML en SQL Server](#xml-en-sql-server)
- [JSON — JavaScript Object Notation](#json--javascript-object-notation)
  - [JSON en SQL Server](#json-en-sql-server)
- [YAML — YAML Ain't a Markup Language](#yaml--yaml-aint-a-markup-language)
- [Comparativa rápida](#comparativa-rápida)

---

Los formatos de intercambio son estándares de texto para almacenar y compartir datos entre sistemas distintos. Al adherirse a un estándar, cualquier sistema que lo implemente puede consumir o producir los datos sin necesidad de acuerdos ad-hoc.

---

## EDI — Electronic Data Interchange

EDI es un estándar de intercambio electrónico _computer-to-computer_ pensado para reemplazar documentos en papel (facturas, órdenes de compra, avisos de embarque) en intercambios B2B.

**Características**:
- Texto simple (ASCII / Unicode).
- Múltiples estándares en uso simultáneo: **ANSI X12**, **EANCOM**, **HIPAA** (salud), **ODETTE** (automotriz), **SWIFT** (banca), entre otros.
- En cada intercambio debe indicarse el estándar y la versión usada.
- Define cómo interpretar números, fechas y códigos específicos del negocio.

**Ejemplo — factura ANSI X12 (simplificada)**:

```
ST*810*0001~
BIG*20000513*SG427254*20000506*508517*1001~
N1*ST*ABC AEROSPACE CORPORATION*9*123456789-0101~
N3*1000 BOARDWALK DRIVE~
N4*SOMEWHERE*CA*98898~
TDS*14400~
SE*10*0001~
```

| Segmento | Significado |
|----------|-------------|
| `ST*810*0001~` | Inicio de transacción tipo 810 (factura), número de control 0001 |
| `BIG*...` | Datos generales: fecha emisión, número de factura, fecha y número de orden de compra |
| `N1*ST*...` | Identificación del destinatario (Ship-To) con nombre y ID fiscal |
| `N3*...` | Dirección de entrega (calle y número) |
| `N4*...` | Ciudad, estado y código postal |
| `TDS*14400~` | Total del documento (144.00 en centavos) |
| `SE*10*0001~` | Fin de transacción; 10 segmentos, control 0001 |

**Casos de uso**: facturas electrónicas, órdenes de compra, notificaciones de embarque, estados de cuenta bancarios.

---

## CSV / TSV

**CSV** (_Comma-Separated Values_): formato tabular donde cada fila es un registro y las columnas se separan por un delimitador.

**Reglas**:
- Primera fila: opcional, puede contener los nombres de las columnas.
- Delimitador: generalmente `,` (Europa usa `;` porque la coma es separador decimal).
- Campo vacío: dos delimitadores contiguos → `valor1,,valor3`.
- Si el delimitador forma parte de un valor, el valor va entre comillas dobles: `"Gómez, Juan"`.
- **TSV**: usa el carácter tabulador como delimitador.

**Ejemplo CSV**:

```
anio,mes,municipio_nombre,delegacion,genero,cantidad
2019,1,La Matanza,San Justo,masculino,74
2019,2,La Matanza,San Justo,masculino,73
2019,3,La Matanza,San Justo,femenino,66
2019,4,La Matanza,,masculino,59
```

(La cuarta fila tiene el campo `delegacion` vacío.)

### Importar CSV en SQL Server

#### BULK INSERT

```sql
-- Importar CSV con encabezado en la primera fila
BULK INSERT ventas
FROM 'C:\datos\ventas.csv'
WITH (
    FIELDTERMINATOR = ',',     -- delimitador de columnas
    ROWTERMINATOR   = '\n',    -- delimitador de filas
    FIRSTROW        = 2,       -- saltar fila de encabezado
    CODEPAGE        = '65001'  -- UTF-8
);
```

#### OPENROWSET (lectura ad-hoc)

```sql
SELECT *
FROM OPENROWSET(
    BULK 'C:\datos\ventas.csv',
    FORMATFILE = 'C:\datos\ventas.fmt',
    FIRSTROW = 2
) AS datos;
```

#### Exportar a CSV

```sql
-- Desde SSMS: Results to File
-- Desde BCP:
bcp "SELECT * FROM ventas" queryout "C:\datos\export.csv" -c -t"," -r"\n" -S servidor -T
```

---

## Ancho fijo

En el formato de **ancho fijo** no hay delimitador: cada campo ocupa siempre la misma cantidad de caracteres.

**Reglas**:
- La especificación del formato define la posición inicial y longitud de cada campo.
- Valores más cortos: relleno con espacios (texto) o ceros a la izquierda (números).
- Todos los registros tienen exactamente la misma longitud total.

**Ejemplo** — especificación: año[4], mes[2], nombre[20], cantidad[6]:

```
201901La Matanza            000074
201902La Matanza            000073
201903La Matanza            000066
```

Para leer este formato en SQL Server se puede usar `BULK INSERT` con un archivo de formato (`.fmt`) o parsear con `SUBSTRING`:

```sql
-- Leer archivo ancho fijo como una sola columna y parsear con SUBSTRING
CREATE TABLE tmp_ancho_fijo (linea CHAR(32));

BULK INSERT tmp_ancho_fijo
FROM 'C:\datos\archivo.txt'
WITH (ROWTERMINATOR = '\n');

SELECT
    CAST(SUBSTRING(linea, 1, 4)  AS INT)          AS anio,
    CAST(SUBSTRING(linea, 5, 2)  AS INT)          AS mes,
    RTRIM(SUBSTRING(linea, 7, 20))                AS municipio,
    CAST(SUBSTRING(linea, 27, 6) AS INT)          AS cantidad
FROM tmp_ancho_fijo;
```

**Casos de uso**: archivos bancarios (acreditaciones, cobranzas), sistemas legados (mainframes), AFIP, intercambios con organismos gubernamentales.

---

## XML — eXtended Markup Language

XML es un lenguaje de marcado autodescriptivo: cada dato está delimitado por etiquetas.

**Características**:
- Evolución de SGML, similar a HTML pero sin etiquetas predefinidas.
- Estructura jerárquica (árbol de nodos).
- Admite atributos dentro de las etiquetas: `<fila id="1">`.
- Se puede validar contra un esquema (DTD o XSD).
- Verboso pero muy expresivo y ampliamente soportado.

**Ejemplo**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
    <row _id="row-v4f5~xz3v-vr86">
        <brth_yr>2011</brth_yr>
        <gndr>FEMALE</gndr>
        <ethcty>HISPANIC</ethcty>
        <nm>GERALDINE</nm>
        <cnt>13</cnt>
        <rnk>75</rnk>
    </row>
    <row _id="row-gdep~mr7x-dj3u">
        <brth_yr>2011</brth_yr>
        <gndr>FEMALE</gndr>
        <ethcty>HISPANIC</ethcty>
        <nm>GIA</nm>
        <cnt>21</cnt>
        <rnk>67</rnk>
    </row>
</response>
```

### XML en SQL Server

SQL Server tiene el tipo de dato `XML` y un conjunto de métodos para manipularlo.

#### Generar XML desde una consulta

```sql
-- FOR XML AUTO: genera nodos con el nombre de la tabla/alias
SELECT nombre, apellido FROM clientes FOR XML AUTO;

-- FOR XML PATH: estructura personalizada
SELECT
    id        AS '@id',           -- atributo XML
    nombre    AS 'nombre',        -- elemento hijo
    apellido  AS 'apellido'
FROM clientes
FOR XML PATH('cliente'), ROOT('clientes');
```

Resultado de `FOR XML PATH`:

```xml
<clientes>
    <cliente id="1"><nombre>Juan</nombre><apellido>García</apellido></cliente>
    <cliente id="2"><nombre>Ana</nombre><apellido>López</apellido></cliente>
</clientes>
```

#### Leer y consultar XML

```sql
DECLARE @xml XML = '
<clientes>
    <cliente id="1"><nombre>Juan</nombre><monto>1500.00</monto></cliente>
    <cliente id="2"><nombre>Ana</nombre><monto>2300.50</monto></cliente>
</clientes>';

-- .nodes(): shred XML en filas
-- .value(): extraer un valor escalar
SELECT
    c.value('@id',       'INT')           AS id,
    c.value('nombre[1]', 'VARCHAR(50)')   AS nombre,
    c.value('monto[1]',  'DECIMAL(10,2)') AS monto
FROM @xml.nodes('/clientes/cliente') AS t(c);
```

#### Cargar XML desde archivo

```sql
-- Leer el archivo completo en una variable XML
DECLARE @xml XML;
SELECT @xml = BulkColumn
FROM OPENROWSET(BULK 'C:\datos\clientes.xml', SINGLE_BLOB) AS x;

-- Luego procesar con .nodes() y .value()
```

---

## JSON — JavaScript Object Notation

JSON es un formato de texto ligero basado en pares clave/valor.

**Sintaxis**:

| Construcción | Sintaxis | Ejemplo |
|-------------|----------|---------|
| Objeto | `{ "clave": valor, ... }` | `{"nombre": "Juan", "edad": 30}` |
| Array | `[ valor, valor, ... ]` | `[1, 2, 3]` o `[{...}, {...}]` |
| String | `"texto"` | `"Poema del Cid"` |
| Número | sin comillas | `42`, `3.14` |
| Booleano | sin comillas | `true`, `false` |
| Nulo | sin comillas | `null` |

**Ejemplo**:

```json
[
    {
        "Posición": 1,
        "Obra": "Poema del Cid.",
        "Enlace_BDH": "http://bdh.bne.es/bnesearch/detalle/bdh0000036451"
    },
    {
        "Posición": 2,
        "Obra": "Beato de Liébana: códice de Fernando I y Dña. Sancha.",
        "Enlace_BDH": "http://bdh.bne.es/bnesearch/detalle/bdh0000051522"
    }
]
```

### JSON en SQL Server

#### Generar JSON desde una consulta

```sql
-- FOR JSON AUTO
SELECT nombre, apellido FROM clientes FOR JSON AUTO;

-- FOR JSON PATH: estructura personalizada
SELECT
    id       AS 'cliente.id',
    nombre   AS 'cliente.nombre',
    apellido AS 'cliente.apellido'
FROM clientes
FOR JSON PATH, ROOT('clientes');
-- → {"clientes":[{"cliente":{"id":1,"nombre":"Juan","apellido":"García"}},…]}
```

#### Leer y shredear JSON con OPENJSON

```sql
DECLARE @json NVARCHAR(MAX) = N'
[
    {"nombre": "Juan",  "edad": 30, "ciudad": "Buenos Aires"},
    {"nombre": "Ana",   "edad": 25, "ciudad": "Córdoba"},
    {"nombre": "Pedro", "edad": 35, "ciudad": null}
]';

-- Con esquema explícito (WITH)
SELECT nombre, edad, ciudad
FROM OPENJSON(@json)
WITH (
    nombre  VARCHAR(50)  '$.nombre',
    edad    INT          '$.edad',
    ciudad  VARCHAR(100) '$.ciudad'
);
```

#### Inserción masiva desde JSON

```sql
INSERT INTO clientes (nombre, edad, ciudad)
SELECT nombre, edad, ciudad
FROM OPENJSON(@json)
WITH (
    nombre  VARCHAR(50),
    edad    INT,
    ciudad  VARCHAR(100)
);
```

#### Funciones JSON útiles

```sql
-- Verificar si una cadena es JSON válido
SELECT ISJSON('{"a":1}');  -- → 1 (sí es JSON)

-- Extraer un valor escalar
SELECT JSON_VALUE('{"nombre":"Juan","edad":30}', '$.nombre');  -- → Juan

-- Extraer un fragmento JSON
SELECT JSON_QUERY('{"usuario":{"nombre":"Juan"}}', '$.usuario');
-- → {"nombre":"Juan"}

-- Modificar un JSON
SELECT JSON_MODIFY('{"nombre":"Juan"}', '$.nombre', 'Pedro');
-- → {"nombre":"Pedro"}
```

---

## YAML — YAML Ain't a Markup Language

YAML es un formato de serialización de datos diseñado para ser fácil de leer y escribir por humanos. Se considera un superconjunto de JSON.

**Características**:
- Usa sangría con **espacios** (nunca tabuladores) para definir la jerarquía.
- Pares clave-valor separados por `:` sin comillas (excepto cuando el valor contiene caracteres especiales).
- Elementos de lista precedidos por `-`.
- Un documento comienza con `---`.
- Los comentarios usan `#`.

**Ejemplo — configuración de MongoDB**:

```yaml
# mongod.conf

storage:
  dbPath: C:\Program Files\MongoDB\Server\4.4\data
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: C:\Program Files\MongoDB\Server\4.4\log\mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1
```

**Ejemplo con lista**:

```yaml
---
clientes:
  - nombre: Juan García
    edad: 30
    ciudades:
      - Buenos Aires
      - Córdoba
  - nombre: Ana López
    edad: 25
    ciudades:
      - Rosario
```

YAML no tiene soporte nativo en SQL Server. Para importar datos YAML a una BD, el enfoque habitual es convertirlos primero a JSON (herramientas como `json2yaml`, `yq`, etc.) y luego usar `OPENJSON`.

---

## Comparativa rápida

| Formato | Estructura | Verbosidad | Legibilidad | Uso típico |
|---------|-----------|------------|-------------|------------|
| EDI | Segmentos con delimitadores | Alta | Baja | Intercambio B2B (facturas, órdenes) |
| CSV | Tabular plana | Baja | Alta | Datasets, importación masiva |
| Ancho fijo | Tabular plana | Nula | Muy baja | Sistemas bancarios/legados |
| XML | Árbol de nodos | Muy alta | Media | Documentos, configs, APIs SOAP |
| JSON | Clave/valor jerárquico | Media | Alta | APIs REST, NoSQL, configs |
| YAML | Clave/valor jerárquico | Baja | Muy alta | Configuración de herramientas, DevOps |
