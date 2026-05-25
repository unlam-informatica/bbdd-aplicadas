---
layout: default
title: Formatos y Conectividad
parent: Unidad 2
nav_order: 5
permalink: /unidad-2/teoria/formatos-conectividad/
---

- [ODBC y JDBC](#odbc-y-jdbc)
- [Formatos de intercambio de datos](#formatos-de-intercambio-de-datos)
  - [EDI](#edi--electronic-data-interchange)
  - [CSV / TSV](#csv--tsv)
  - [Ancho fijo](#ancho-fijo)
  - [XML](#xml--extended-markup-language)
  - [JSON](#json--javascript-object-notation)
  - [YAML](#yaml--yaml-aint-a-markup-language)
- [APIs](#apis--application-programming-interface)

# Formatos y Conectividad

## ODBC y JDBC

ODBC y JDBC son **APIs de conectividad** que permiten a las aplicaciones comunicarse con bases de datos de forma independiente del motor específico.

### ODBC

**ODBC** (_Open Database Connectivity_) es una API desarrollada por Microsoft para lenguajes como C y C++. Permite que una aplicación acceda a cualquier base de datos que tenga un driver ODBC instalado, sin cambiar el código de la aplicación.

**Flujo de conexión:**

```
Aplicación cliente
      ↓
Administrador de controladores ODBC (Driver Manager)
      ↓
Controlador específico del motor (ej: SQL Server ODBC Driver)
      ↓
Fuente de datos SQL (SQL Server, MySQL, Oracle, etc.)
```

**String de conexión ODBC (SQL Server):**

```
Driver={ODBC Driver 17 for SQL Server};
Server=mi_servidor,1433;
Database=mi_bd;
Uid=usuario;
Pwd=contraseña;
```

Los DSN (_Data Source Names_) se crean desde el panel "Orígenes de datos ODBC" de Windows, o mediante string de conexión directa en el código.

### JDBC

**JDBC** (_Java Database Connectivity_) es la API equivalente para Java. Forma parte del JDK estándar y permite acceder a cualquier base de datos relacional mediante el driver JDBC correspondiente.

**String de conexión JDBC (SQL Server):**

```
jdbc:sqlserver://mi_servidor:1433;
    databaseName=mi_bd;
    user=usuario;
    password=contraseña;
    encrypt=true;
    trustServerCertificate=true;
```

**Dependencia Maven (driver Microsoft):**

```xml
<dependency>
    <groupId>com.microsoft.sqlserver</groupId>
    <artifactId>mssql-jdbc</artifactId>
    <version>12.4.2.jre11</version>
</dependency>
```

| | ODBC | JDBC |
|--|------|------|
| Lenguaje | C, C++ y cualquier lenguaje con binding ODBC | Java |
| Estándar | Microsoft (ampliamente adoptado) | Sun/Oracle (Java EE) |
| Drivers | ODBC Driver Manager + driver específico | Driver JAR del proveedor |
| Configuración | DSN en el SO o string de conexión | String de conexión o DataSource |

---

## Formatos de intercambio de datos

Los formatos de intercambio son **estándares de texto** para almacenar y compartir información entre sistemas:

- Siempre de texto simple (ASCII, Unicode).
- Poseen estructura y reglas (sintaxis).
- Existen bibliotecas en todos los lenguajes para generarlos e interpretarlos.
- Al adherirse a un estándar no es necesario saber de antemano quién consumirá los datos.

### EDI — Electronic Data Interchange

**EDI** es un estándar de intercambio electrónico de datos de tipo _computer-to-computer_, diseñado para reemplazar documentos en papel (facturas, órdenes de compra) en intercambios B2B.

**Características:**
- Texto simple (ASCII, Unicode).
- Múltiples estándares en uso: **ANSI X12**, **EANCOM**, **HIPAA**, **ODETTE**, **SWIFT**.
- En cada intercambio debe indicarse el estándar y versión utilizada.

**Ejemplo (ANSI X12 — factura):**

```
ST*810*0001~
BIG*20000513*SG427254*20000506*508517*1001~
N1*ST*ABC AEROSPACE CORPORATION*9*123456789-0101~
N3*1000 BOARDWALK DRIVE~
N4*SOMEWHERE*CA*98898~
TDS*14400~
SE*10*0001~
```

`ST*810*0001~` → inicio de transacción tipo 810 (factura), control 0001.  
`BIG*...` → datos generales (fecha emisión, número, orden de compra).

### CSV / TSV

**CSV** (_Comma-Separated Values_): formato tabular donde cada fila es un registro y las columnas se separan con un delimitador (generalmente `,` o `;`).

- La primera fila puede contener los nombres de las columnas.
- Si el delimitador aparece dentro de un valor, el campo debe ir entre comillas dobles.
- Campos vacíos: dos delimitadores contiguos (`valor1,,valor3`).
- **TSV** usa el carácter tabulador como delimitador.

**Ejemplo:**

```
anio,mes,municipio_nombre,genero,cantidad
2019,1,La Matanza,masculino,74
2019,2,La Matanza,masculino,73
2019,3,La Matanza,femenino,66
```

Ver la [guía de Importación de Archivos](/unidad-2/guias/importacion-de-archivos/) para `BULK INSERT` y opciones de T-SQL.

### Ancho fijo

En el formato de **ancho fijo** cada columna ocupa exactamente una cantidad determinada de caracteres, sin delimitador.

- Cada campo tiene una posición y longitud conocidas de antemano.
- Los valores más cortos se rellenan con espacios (texto) o ceros a la izquierda (números).
- Todos los registros tienen la misma longitud total.

**Ejemplo** (campos: año[4], mes[2], nombre[20], cantidad[6]):

```
201901La Matanza            000074
201902La Matanza            000073
201903La Matanza            000066
```

Se usa en sistemas legados (mainframes), archivos bancarios (COBRANZA, ACREDITACIONES) y algunos formatos gubernamentales.

### XML — eXtended Markup Language

**XML** es un lenguaje de marcado autodescriptivo: cada dato está delimitado por etiquetas que describen su significado.

- No tiene etiquetas predefinidas: el usuario define su propio vocabulario.
- Admite anidado de elementos (estructura jerárquica).
- Ampliamente usado para archivos de configuración y formatos propietarios (Office Open XML, SVG, etc.).
- Admite validación mediante DTD o XML Schema.

**Estructura básica:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<respuesta>
    <fila id="1">
        <nombre>GERALDINE</nombre>
        <genero>FEMALE</genero>
        <cantidad>13</cantidad>
    </fila>
    <fila id="2">
        <nombre>GIA</nombre>
        <genero>FEMALE</genero>
        <cantidad>21</cantidad>
    </fila>
</respuesta>
```

Ver la [guía de XML en SQL](/unidad-2/guias/xml-en-sql/) para `FOR XML`, `OPENXML`, `.nodes()` y más.

### JSON — JavaScript Object Notation

**JSON** es un formato de texto ligero basado en pares clave/valor y estructuras anidadas.

- Los objetos se delimitan con llaves `{ }`.
- Los arrays se delimitan con corchetes `[ ]`.
- Las claves deben ser cadenas entre comillas dobles.
- Los valores pueden ser: cadenas, números, booleanos, `null`, objetos o arrays.

**Ejemplo:**

```json
[
    {
        "Posición": "1",
        "Obra": "Poema del Cid.",
        "Enlace": "http://bdh.bne.es/detalle/bdh0000036451"
    },
    {
        "Posición": "2",
        "Obra": "Beato de Liébana: códice de Fernando I.",
        "Enlace": "http://bdh.bne.es/detalle/bdh0000051522"
    }
]
```

Ver la [guía de JSON en SQL](/unidad-2/guias/json-en-sql/) para `OPENJSON`, `FOR JSON`, `JSON_VALUE`, `JSON_QUERY` y `JSON_MODIFY`.

### YAML — YAML Ain't a Markup Language

**YAML** es un formato minimalista que usa indentación para definir la estructura, pensado para ser legible para humanos.

- Superconjunto de JSON (todo JSON válido es YAML válido).
- Usa indentación con espacios (nunca tabuladores) para definir la jerarquía.
- Los pares clave-valor se separan con `:` sin comillas.
- Los elementos de lista se preceden con `-`.

**Ejemplo (configuración de MongoDB):**

```yaml
---
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

YAML es muy común en configuración de aplicaciones (Docker Compose, Kubernetes, GitHub Actions). No es el formato más habitual para intercambio de datos en BD, pero aparece en pipelines de datos y herramientas de DevOps.

---

## APIs — Application Programming Interface

Una **API** es un contrato implementado en software que permite el acceso a datos o servicios de un sistema desde otro. Es la interfaz a través de la cual dos sistemas se comunican.

Analogía: la API es el mozo de un restaurante — el cliente (aplicación) hace un pedido (request) al mozo (API), el mozo lo lleva a la cocina (sistema/datos) y trae la respuesta (response).

### Tipos de API

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Abierta / Pública** | Disponible para uso general. Puede requerir API key. | Google Maps, OpenWeather |
| **Interna / Privada** | Solo usada dentro de la organización. | Microservicios internos |
| **De socios** | Permite intercambio de información con proveedores o clientes. | API de banco para fintech socio |

### Protocolos de comunicación

| Protocolo | Descripción |
|-----------|-------------|
| **REST** | Usa HTTP. Recursos identificados por URLs. Operaciones: GET, POST, PUT, DELETE. Respuestas en JSON o XML. El más difundido. |
| **SOAP** | Protocolo basado en XML. Más verboso, tipado estricto. Usado en entornos empresariales heredados. |
| **XML-RPC** | Llamadas a procedimientos remotos usando XML. Predecesor de SOAP. |
| **JSON-RPC** | Llamadas a procedimientos remotos usando JSON. Más ligero que SOAP. |

### Ejemplo de interacción REST

```
GET https://api.ejemplo.com/productos/42
Authorization: Bearer mi_token

→ 200 OK
{
    "id": 42,
    "nombre": "Monitor 27\"",
    "precio": 45000.00,
    "stock": 12
}
```

```
POST https://api.ejemplo.com/ventas
Content-Type: application/json

{
    "producto_id": 42,
    "cantidad": 2,
    "cliente_id": 101
}

→ 201 Created
{ "venta_id": 9875, "total": 90000.00 }
```

### Postman

**Postman** es la herramienta estándar para explorar y probar APIs. Permite:
- Construir y enviar requests HTTP (GET, POST, PUT, DELETE, etc.).
- Organizar requests en colecciones.
- Definir entornos y variables (para cambiar entre dev/staging/prod).
- Escribir tests automatizados para las respuestas.
- Generar documentación de la API.

Ver la [guía de APIs desde SQL](/unidad-2/guias/apis-desde-sql/) para hacer llamadas HTTP directamente desde T-SQL con Ole Automation Procedures.
