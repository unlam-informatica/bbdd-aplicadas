---
layout: default
title: Conceptos básicos
parent: Teoría
grand_parent: Unidad 1
nav_order: 1
permalink: /unidad-1/teoria/conceptos-basicos/
---

- [Qué es una base de datos](#qué-es-una-base-de-datos)
- [Qué es un DBMS](#qué-es-un-dbms)
- [¿Siempre conviene usar un DBMS?](#siempre-conviene-usar-un-dbms)
- [DBMS más utilizados](#dbms-más-utilizados)
- [Cómo elegir un DBMS](#cómo-elegir-un-dbms)
- [DBA vs programador de base de datos](#dba-vs-programador-de-base-de-datos)

# Conceptos básicos

## Qué es una base de datos

Una base de datos es una colección organizada de datos que representa algún
aspecto del mundo real. No es simplemente un archivo con información — tiene
un significado coherente, está diseñada para un propósito específico y apunta
a un grupo de usuarios concreto.

La diferencia clave con manejar datos en archivos individuales es que una BD
centraliza todo en un único repositorio, eliminando redundancias e
inconsistencias. Pensá en intentar mantener sincronizados los datos de alumnos,
notas, exámenes e inscripciones en archivos separados — ese caos es exactamente
lo que una BD resuelve.

## Qué es un DBMS

El DBMS (Database Management System) es el software que gestiona la base de
datos. No es la BD en sí, sino la capa que permite crearla, consultarla,
protegerla y mantenerla. SQL Server, PostgreSQL, MySQL y MongoDB son ejemplos
de DBMS.

Un buen DBMS debe ser eficiente, confiable, seguro y multiusuario. Sus
responsabilidades van desde permitir el acceso concurrente de múltiples
aplicaciones hasta proteger los datos ante fallos de hardware, accesos no
autorizados o errores de software.

## ¿Siempre conviene usar un DBMS?

No siempre. Un DBMS agrega complejidad y overhead que en ciertos contextos no
se justifica:

- Si los datos son estáticos y no van a cambiar durante el ciclo de vida del sistema.
- Si el entorno tiene recursos limitados, como sistemas embebidos.
- Si la aplicación es monousuario y simple.
- Si el costo de licenciamiento, hardware y capacitación supera el beneficio.

La regla general es: si necesitás concurrencia, integridad, seguridad o escala,
usá un DBMS. Si no, puede ser sobredimensionado.

## DBMS más utilizados

A nivel mundial los más populares son Oracle, MySQL, SQL Server, PostgreSQL y
MongoDB. En Argentina el ranking es similar: MySQL lidera, seguido por SQL
Server, PostgreSQL, MongoDB y MariaDB.

Un dato relevante: SQL es el lenguaje más usado en Argentina según la encuesta
de sueldos de OpenQube 2025, por encima de JavaScript y Python. Saber SQL bien
es una de las habilidades más transversales del mercado.

## Cómo elegir un DBMS

No existe un DBMS universalmente mejor. La elección depende del contexto:

| Factor | Qué evaluar |
|---|---|
| Costo | Licenciamiento pago vs código abierto |
| Despliegue | Embebido, on premise o cloud |
| Características | Encriptación, alta disponibilidad, escalabilidad |
| Equipo | Curva de aprendizaje y conocimiento disponible |

## DBA vs programador de base de datos

Son roles distintos que suelen confundirse:

| | DBA | Programador de BD |
|---|---|---|
| Objetivo | Garantizar disponibilidad y continuidad del sistema | Diseñar e implementar los objetos y la lógica de la BD |
| Tareas | Accesos, backups, monitoreo, hardware, performance del servidor | Tablas, vistas, índices, SPs, funciones, triggers, performance del código |
| Perfil | Especialista en pocas tecnologías | Puede trabajar con varias tecnologías |

En términos simples: el DBA se asegura de que el sistema *funcione y esté
disponible*. El programador se asegura de que *esté bien construido*. En equipos
pequeños, una misma persona suele cumplir ambos roles.
