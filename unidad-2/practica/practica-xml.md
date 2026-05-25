---
layout: default
title: Práctica — XML en SQL Server
parent: Unidad 2
nav_order: 14
permalink: /unidad-2/practica/xml/
---

# Práctica — XML en SQL Server

> Ver guía de referencia: [XML en SQL Server](/unidad-2/guias/xml-en-sql/)

---

## Setup

```sql
USE PracticaU2;
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'xml_prac')
    EXEC('CREATE SCHEMA xml_prac');
GO

DROP TABLE IF EXISTS xml_prac.Empleado;
DROP TABLE IF EXISTS xml_prac.Departamento;
GO

CREATE TABLE xml_prac.Departamento (
    dept_id   INT          IDENTITY(1,1) PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(100) NULL
);

CREATE TABLE xml_prac.Empleado (
    emp_id  INT           IDENTITY(1,1) PRIMARY KEY,
    dept_id INT           NOT NULL REFERENCES xml_prac.Departamento(dept_id),
    nombre  VARCHAR(100)  NOT NULL,
    cargo   VARCHAR(100)  NOT NULL,
    salario DECIMAL(12,2) NOT NULL,
    email   VARCHAR(200)  NULL
);
GO

INSERT INTO xml_prac.Departamento (nombre, ubicacion) VALUES
    ('Ingeniería',  'Piso 3'),
    ('Marketing',   'Piso 1'),
    ('Finanzas',    'Piso 2');

INSERT INTO xml_prac.Empleado (dept_id, nombre, cargo, salario, email) VALUES
    (1, 'Valentina Torres', 'Desarrolladora Senior', 120000, 'vtorres@empresa.com'),
    (1, 'Rodrigo Méndez',   'DevOps',                 98000, 'rmendez@empresa.com'),
    (2, 'Sofía Alvarado',   'Directora de Marketing',135000,  NULL),
    (2, 'Carlos Ruiz',      'Analista',               75000, 'cruiz@empresa.com'),
    (3, 'Elena Morales',    'CFO',                   180000, 'emorales@empresa.com'),
    (3, 'Tomás Benítez',    'Contador',               82000,  NULL);
GO
```

---

## Ejercicio 1 — FOR XML RAW: exportar tabla como XML básico

Exportar la tabla `xml_prac.Empleado` usando los distintos modos de `FOR XML RAW`.

```sql
USE PracticaU2;
GO

-- Modo básico: cada fila → elemento <row> con atributos
SELECT emp_id, nombre, cargo, salario
FROM xml_prac.Empleado
FOR XML RAW;

-- Nombre de elemento personalizado
SELECT emp_id, nombre, cargo, salario
FROM xml_prac.Empleado
FOR XML RAW('Empleado');

-- Agregar elemento raíz
SELECT emp_id, nombre, cargo, salario
FROM xml_prac.Empleado
FOR XML RAW('Empleado'), ROOT('Empleados');

-- Columnas como elementos hijo (no atributos)
SELECT emp_id, nombre, cargo, salario
FROM xml_prac.Empleado
FOR XML RAW('Empleado'), ROOT('Empleados'), ELEMENTS;
```

---

## Ejercicio 2 — ELEMENTS XSINIL: representar valores NULL en XML

Observar la diferencia entre `ELEMENTS` y `ELEMENTS XSINIL` cuando hay columnas con NULL.

```sql
-- Con ELEMENTS: los NULL simplemente no aparecen como elemento
SELECT emp_id, nombre, email
FROM xml_prac.Empleado
FOR XML RAW('Empleado'), ROOT('Empleados'), ELEMENTS;

-- Con ELEMENTS XSINIL: los NULL aparecen con atributo xsi:nil="true"
SELECT emp_id, nombre, email
FROM xml_prac.Empleado
FOR XML RAW('Empleado'), ROOT('Empleados'), ELEMENTS XSINIL;
```

**Pregunta**: ¿Por qué `ELEMENTS XSINIL` puede ser importante para aplicaciones que consumen el XML?

---

## Ejercicio 3 — FOR XML AUTO: jerarquía inferida desde el JOIN

Exportar empleados con su departamento usando `FOR XML AUTO`. Observar cómo SQL Server infiere la jerarquía a partir del orden de las columnas en el SELECT.

```sql
-- Jerarquía: Departamento contiene Empleados
SELECT
    d.dept_id,
    d.nombre    AS dept_nombre,
    e.emp_id,
    e.nombre    AS emp_nombre,
    e.cargo,
    e.salario
FROM xml_prac.Departamento d
JOIN xml_prac.Empleado e ON e.dept_id = d.dept_id
FOR XML AUTO, ROOT('Empresa'), ELEMENTS;
```

Invertir el orden (Empleado primero, Departamento después) y observar cómo cambia la jerarquía:

```sql
SELECT
    e.emp_id,
    e.nombre    AS emp_nombre,
    e.cargo,
    d.dept_id,
    d.nombre    AS dept_nombre
FROM xml_prac.Empleado e
JOIN xml_prac.Departamento d ON d.dept_id = e.dept_id
FOR XML AUTO, ROOT('Empresa'), ELEMENTS;
```

---

## Ejercicio 4 — FOR XML con subconsulta anidada

Usar una subconsulta `FOR XML ... TYPE` para construir una jerarquía explícita: cada departamento contiene su lista de empleados como XML anidado.

```sql
SELECT
    d.dept_id,
    d.nombre    AS dept_nombre,
    d.ubicacion,
    (
        SELECT
            e.emp_id,
            e.nombre AS emp_nombre,
            e.cargo,
            e.salario
        FROM xml_prac.Empleado e
        WHERE e.dept_id = d.dept_id
        FOR XML AUTO, TYPE, ELEMENTS
    ) AS empleados
FROM xml_prac.Departamento d
FOR XML AUTO, ROOT('Empresa'), ELEMENTS;
```

> `TYPE` en la subconsulta indica que el resultado es de tipo `XML` (no string), lo que permite que SQL Server lo anide correctamente en el XML padre.

---

## Ejercicio 5 — Parsear XML con .nodes() y .value()

Dado un XML en memoria, extraerlo en filas relacionales usando el método directo con `.nodes()` y `.value()`.

```sql
DECLARE @xml XML = N'
<Productos>
    <Producto>
        <Codigo>P001</Codigo>
        <Nombre>Notebook Pro 15</Nombre>
        <Categoria>Electrónica</Categoria>
        <Precio>1299.99</Precio>
        <Stock>12</Stock>
    </Producto>
    <Producto>
        <Codigo>P002</Codigo>
        <Nombre>Mouse Inalámbrico</Nombre>
        <Categoria>Periféricos</Categoria>
        <Precio>29.99</Precio>
        <Stock>85</Stock>
    </Producto>
    <Producto>
        <Codigo>P003</Codigo>
        <Nombre>Monitor 27"</Nombre>
        <Categoria>Electrónica</Categoria>
        <Precio>349.99</Precio>
        <Stock>20</Stock>
    </Producto>
</Productos>';

-- .nodes() devuelve una fila por cada nodo que coincide con el XPath
-- .value() extrae el valor escalar del elemento
SELECT
    nodo.value('(Codigo)[1]',    'VARCHAR(20)')  AS codigo,
    nodo.value('(Nombre)[1]',    'VARCHAR(100)') AS nombre,
    nodo.value('(Categoria)[1]', 'VARCHAR(50)')  AS categoria,
    nodo.value('(Precio)[1]',    'DECIMAL(10,2)') AS precio,
    nodo.value('(Stock)[1]',     'INT')           AS stock
FROM @xml.nodes('Productos/Producto') AS T(nodo);
```

---

## Ejercicio 6 — OPENXML: método clásico con sp_xml_preparedocument

Parsear el mismo XML usando el método clásico con handle. Comparar con el ejercicio anterior.

```sql
DECLARE @xml  XML = N'
<Productos>
    <Producto Codigo="P001" Nombre="Notebook Pro 15"   Precio="1299.99" Stock="12"/>
    <Producto Codigo="P002" Nombre="Mouse Inalámbrico" Precio="29.99"   Stock="85"/>
    <Producto Codigo="P003" Nombre="Monitor 27"""      Precio="349.99"  Stock="20"/>
</Productos>';

DECLARE @hDoc INT;

-- Preparar el documento y obtener el handle
EXEC sp_xml_preparedocument @hDoc OUTPUT, @xml;

-- Consultar usando OPENXML
SELECT *
FROM OPENXML(@hDoc, '/Productos/Producto')
WITH (
    Codigo  VARCHAR(20)   '@Codigo',
    Nombre  VARCHAR(100)  '@Nombre',
    Precio  DECIMAL(10,2) '@Precio',
    Stock   INT           '@Stock'
);

-- SIEMPRE liberar el handle para evitar fuga de memoria
EXEC sp_xml_removedocument @hDoc;
```

> Los atributos se referencian con `@nombre`. Los elementos hijo con solo `nombre` (sin @).

---

## Ejercicio 7 — Insertar filas desde XML

Parsear el XML del ejercicio 5 e insertar los resultados en una tabla real.

```sql
DECLARE @xml XML = N'
<Productos>
    <Producto>
        <Codigo>P101</Codigo>
        <Nombre>Webcam HD</Nombre>
        <Categoria>Periféricos</Categoria>
        <Precio>49.99</Precio>
        <Stock>60</Stock>
    </Producto>
    <Producto>
        <Codigo>P102</Codigo>
        <Nombre>Hub USB-C</Nombre>
        <Categoria>Accesorios</Categoria>
        <Precio>34.99</Precio>
        <Stock>100</Stock>
    </Producto>
</Productos>';

DROP TABLE IF EXISTS xml_prac.ProductoImportado;

CREATE TABLE xml_prac.ProductoImportado (
    codigo    VARCHAR(20)   NOT NULL PRIMARY KEY,
    nombre    VARCHAR(100)  NOT NULL,
    categoria VARCHAR(50)   NOT NULL,
    precio    DECIMAL(10,2) NOT NULL,
    stock     INT           NOT NULL
);

INSERT INTO xml_prac.ProductoImportado (codigo, nombre, categoria, precio, stock)
SELECT
    nodo.value('(Codigo)[1]',    'VARCHAR(20)')   AS codigo,
    nodo.value('(Nombre)[1]',    'VARCHAR(100)')  AS nombre,
    nodo.value('(Categoria)[1]', 'VARCHAR(50)')   AS categoria,
    nodo.value('(Precio)[1]',    'DECIMAL(10,2)') AS precio,
    nodo.value('(Stock)[1]',     'INT')           AS stock
FROM @xml.nodes('Productos/Producto') AS T(nodo);

SELECT * FROM xml_prac.ProductoImportado;
```
