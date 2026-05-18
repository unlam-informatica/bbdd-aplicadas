# Bases de Datos Aplicada — UNLaM

Apuntes, resúmenes y ejercicios prácticos organizados por unidad.

## Estructura del repositorio

```
BBDD-APLICADAS/
├── unidad-1/               # Conceptos básicos + repaso SQL
│   ├── teoria/
│   │   └── unidad-1.md
│   ├── guias/              # Referencias de temas puntuales
│   │   └── window-functions.md
│   ├── practica/           # Ejercicios .sql
│   │   └── window-functions.sql
│   └── images/
│       └── db-organization.png
│
├── unidad-2/               # BD transaccionales: aspectos básicos
├── unidad-3/               # BD transaccionales: aspectos avanzados
├── unidad-4/               # BD no transaccionales (NoSQL)
├── unidad-5/               # Protección de los datos
└── unidad-6/               # Calidad en bases de datos
```

Cada unidad sigue la misma estructura interna: `teoria/` para resúmenes, `guias/` para referencias técnicas de temas específicos, `practica/` para archivos `.sql` e `images/` para recursos visuales referenciados desde los markdowns.

## Contenido por unidad

| Unidad | Tema | Parcial |
|--------|------|---------|
| [Unidad 1](./unidad-1/) | Conceptos básicos. Repaso SQL: DDL, DML, constraints, window functions, CTE, pivot | 1er parcial |
| [Unidad 2](./unidad-2/) | BD transaccionales: arquitectura, instalación, ODBC/JDBC, collation | 1er parcial |
| [Unidad 3](./unidad-3/) | Transacciones, concurrencia, índices, optimización de consultas | 1er parcial |
| [Unidad 4](./unidad-4/) | NoSQL, MongoDB Query Language, Data Lakes, KDD | 2do parcial |
| [Unidad 5](./unidad-5/) | Seguridad, DCL, roles, backups, alta disponibilidad, réplicas | 2do parcial |
| [Unidad 6](./unidad-6/) | Calidad de datos, GDPR, ISO/IEC 25012 | 2do parcial |

## Evaluación

| Instancia | Semana | Unidades |
|-----------|--------|----------|
| 1er parcial | 7 | 1, 2 y 3 |
| 2do parcial | 13 | 4, 5 y 6 |
| Recuperatorio | 15 | — |

Los parciales combinan preguntas teóricas y prácticas (mínimo 50% práctico). Condición necesaria para rendir: tener aprobado el TP grupal correspondiente.

## Bibliografía

- Elmasri, Navathe — *Fundamentos de Sistemas de Bases de Datos* · Pearson · 5ta ed. · 2007  
- Silberschatz, Korth, Sudarshan — *Fundamentos de Bases de Datos* · McGraw-Hill · 4ta ed. · 2002

**Recursos online**
- [Microsoft Learn — Modern Data Warehouse](https://learn.microsoft.com/en-us/training/modules/examine-components-of-modern-data-warehouse/)
- [Microsoft Learn — Azure Data Lake Storage](https://learn.microsoft.com/en-us/training/modules/intro-to-azure-data-lake-storage/)
- [MongoDB University — Introduction to MongoDB](https://learn.mongodb.com/learning-paths/introduction-to-mongodb)