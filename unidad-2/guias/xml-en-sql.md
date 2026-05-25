---
layout: default
title: XML en SQL Server
parent: Teoría
grand_parent: Unidad 2
nav_order: 8
permalink: /unidad-2/guias/xml-en-sql/
---

[← Unidad 2](../)

- [Importar XML — método directo](#importar-xml--método-directo)
- [Importar XML — vía tabla intermedia y OPENXML](#importar-xml--vía-tabla-intermedia-y-openxml)
- [Exportar XML con FOR XML](#exportar-xml-con-for-xml)
  - [FOR XML RAW](#for-xml-raw)
  - [FOR XML AUTO](#for-xml-auto)
  - [Valores nulos y ELEMENTS XSINIL](#valores-nulos-y-elements-xsinil)
  - [Relaciones entre tablas](#relaciones-entre-tablas)

---

Dado el siguiente archivo XML de ejemplo (`C:\pruebas\Clientes.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<Clientes>
  <Cliente>
    <Documento>300 000 000</Documento>
    <Nombre>Ponzio</Nombre>
    <Direccion>Belgrano 2011</Direccion>
    <Ocupacion>Sufridor</Ocupacion>
  </Cliente>
  <Cliente>
    <Documento>300 000 001</Documento>
    <Nombre>JJ Lopez</Nombre>
    <Direccion>Belgrano 0626</Direccion>
    <Ocupacion>Conductor</Ocupacion>
  </Cliente>
</Clientes>
```

Y la tabla destino:

```sql
CREATE TABLE ddbba.cliente (
    ID        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Documento VARCHAR(20)       NOT NULL,
    Nombre    VARCHAR(50)       NOT NULL,
    Direccion VARCHAR(50)       NULL,
    Ocupacion VARCHAR(50)       NOT NULL
);
```

---

## Importar XML — método directo

Usa `OPENROWSET` para leer el archivo y `.nodes()` + `.value()` para shredear el XML en filas. Es el método más conciso.

```sql
INSERT INTO ddbba.cliente (Documento, Nombre, Direccion, Ocupacion)
SELECT
    XMLClientes.Cliente.query('Documento').value('.', 'VARCHAR(20)'),
    XMLClientes.Cliente.query('Nombre').value('.', 'VARCHAR(50)'),
    XMLClientes.Cliente.query('Direccion').value('.', 'VARCHAR(50)'),
    XMLClientes.Cliente.query('Ocupacion').value('.', 'VARCHAR(50)')
FROM (
    SELECT CAST(XMLClientes AS XML)
    FROM OPENROWSET(BULK 'C:\pruebas\Clientes.xml', SINGLE_BLOB) AS T(XMLClientes)
) AS T(XMLClientes)
CROSS APPLY XMLClientes.nodes('Clientes/Cliente') AS XMLClientes(Cliente);
```

### Piezas clave

| Componente | Rol |
|-----------|-----|
| `OPENROWSET(BULK ..., SINGLE_BLOB)` | Lee el archivo como bytes sin conversión (preserva el encoding declarado en el XML) |
| `CAST(... AS XML)` | Convierte la cadena de bytes al tipo XML de SQL Server |
| `.nodes('ruta')` | Shredea el XML: devuelve una fila por cada nodo que coincide con la ruta XPath |
| `.query('elemento')` | Extrae un nodo XML dentro del nodo actual |
| `.value('.', 'TIPO')` | Extrae el texto del nodo y lo convierte al tipo T-SQL indicado |

---

## Importar XML — vía tabla intermedia y OPENXML

Este método carga el XML en una tabla, luego usa `sp_xml_preparedocument` para crear un handle interno y `OPENXML` para consultar el documento. Requiere liberar el handle con `sp_xml_removedocument`.

### Paso 1: Cargar el XML en una tabla

```sql
CREATE TABLE ddbba.XMLCrudo (
    Id             INT IDENTITY PRIMARY KEY,
    XMLData        XML,
    FechaHoraCarga DATETIME
);

INSERT INTO ddbba.XMLCrudo (XMLData, FechaHoraCarga)
SELECT CONVERT(XML, BulkColumn) AS BulkColumn, GETDATE()
FROM OPENROWSET(BULK 'C:\pruebas\Clientes.xml', SINGLE_BLOB) AS x;
```

### Paso 2: Parsear con OPENXML

```sql
DECLARE @XML  AS XML;
DECLARE @hDoc AS INT;

SELECT @XML = XMLData FROM ddbba.XMLCrudo;

-- Prepara el documento y obtiene un handle
EXEC sp_xml_preparedocument @hDoc OUTPUT, @XML;

-- Consulta el documento usando el handle
SELECT *
FROM OPENXML(@hDoc, 'Clientes/Cliente')
WITH (
    Documento VARCHAR(50)  'Documento',
    Nombre    VARCHAR(100) 'Nombre',
    Direccion VARCHAR(100) 'Direccion',
    Ocupacion VARCHAR(100) 'Ocupacion'
);

-- Liberar el handle (importante: ocupa memoria interna)
EXEC sp_xml_removedocument @hDoc;
```

> **Importante**: siempre liberar el handle con `sp_xml_removedocument`. Si no se libera, el documento queda cacheado en memoria hasta que termina la sesión.

---

## Exportar XML con FOR XML

`FOR XML` se agrega al final de un `SELECT` para obtener el resultado en formato XML.

### FOR XML RAW

La forma más simple. Cada fila se convierte en un elemento `<row>` y cada columna en un atributo.

```sql
SELECT * FROM ddbba.cliente FOR XML RAW;
-- <row ID="1" Documento="300 000 000" Nombre="Ponzio" .../>

-- Personalizar el nombre del elemento
SELECT * FROM ddbba.cliente FOR XML RAW('Cliente');
-- <Cliente ID="1" Documento="300 000 000" .../>

-- Agregar elemento raíz
SELECT * FROM ddbba.cliente FOR XML RAW('Cliente'), ROOT('DocCliente');

-- Columnas como elementos hijo en vez de atributos
SELECT * FROM ddbba.cliente FOR XML RAW('Cliente'), ROOT('DocCliente'), ELEMENTS;
```

Comparación de modos:

| Modo | Estructura | Atributos o elementos |
|------|-----------|----------------------|
| `RAW` | `<row col="val"/>` | Atributos |
| `RAW('nombre')` | `<nombre col="val"/>` | Atributos |
| `RAW + ELEMENTS` | `<row><col>val</col></row>` | Elementos hijo |
| `AUTO` | Usa alias de tabla/columna | Atributos (por defecto) |

### FOR XML AUTO

Infiere la estructura del XML a partir de los nombres de tabla/alias usados en la consulta.

```sql
SELECT * FROM ddbba.cliente FOR XML AUTO, ROOT('DocCliente'), ELEMENTS XSINIL;
```

### Valores nulos y ELEMENTS XSINIL

Con `ELEMENTS`, los valores `NULL` directamente no se incluyen en el XML (el elemento no aparece).  
Con `ELEMENTS XSINIL`, los nulos se representan con el atributo `xsi:nil="true"`.

```sql
-- Actualizar un cliente para que tenga dirección NULL
UPDATE ddbba.cliente SET Direccion = NULL WHERE Nombre LIKE 'Pipi%';

-- Sin XSINIL: el elemento <Direccion> no aparece para ese cliente
SELECT * FROM ddbba.cliente FOR XML RAW('Cliente'), ROOT('DocCliente'), ELEMENTS;

-- Con XSINIL: aparece <Direccion xsi:nil="true"/>
SELECT * FROM ddbba.cliente FOR XML RAW('Cliente'), ROOT('DocCliente'), ELEMENTS XSINIL;
```

### Incluir el esquema XSD

```sql
SELECT * FROM ddbba.cliente
FOR XML RAW('Cliente'), ROOT('DocCliente'), ELEMENTS, XMLSCHEMA;
```

---

## Relaciones entre tablas

### Usando JOIN + FOR XML AUTO

`FOR XML AUTO` organiza los datos relacionados de forma jerárquica automáticamente basándose en el orden del `SELECT`.

```sql
SELECT Jugador.Nombre, Jugador.ID, Gol.rival, Gol.fecha
FROM ddbba.cliente Jugador
INNER JOIN ddbba.gol Gol ON Jugador.id = Gol.idCliente
FOR XML AUTO, ROOT('Clientes'), ELEMENTS XSINIL;
```

### Usando subconsulta anidada

Permite mayor control sobre la jerarquía usando una subconsulta `FOR XML` dentro del `SELECT` principal.

```sql
SELECT
    Jugador.Nombre,
    Jugador.ID,
    (
        SELECT Gol.rival, Gol.fecha
        FROM ddbba.gol
        WHERE Gol.idCliente = Jugador.id
        FOR XML AUTO, TYPE, ELEMENTS
    )
FROM ddbba.cliente Jugador
FOR XML AUTO;
```

`TYPE` en la subconsulta indica que el resultado se devuelve como tipo XML (no como cadena), lo que permite que SQL Server lo anide correctamente.
