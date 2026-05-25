---
layout: default
title: Índice Clustered
parent: Teoría
grand_parent: Unidad 1
nav_order: 7
permalink: /unidad-1/guias/indice-cluster/
---

## Inserción en una tabla con índice clustered en SQL Server

En SQL Server, un **índice clustered** define el orden físico/lógico de almacenamiento de las filas de una tabla.

Cuando una tabla tiene `PRIMARY KEY CLUSTERED`, la tabla **es el índice clustered**.

Ejemplo:

```sql
CREATE TABLE bbdda.Producto (
    id_producto INT IDENTITY(1,1) PRIMARY KEY CLUSTERED,
    nombre NVARCHAR(100) NOT NULL
);
```

En este caso, las filas se organizan por `id_producto`.

---

## 1. Llega el `INSERT`

```sql
INSERT INTO bbdda.Producto (nombre)
VALUES ('Casco LS2');
```

SQL Server debe hacer varias cosas:

```text
1. Iniciar o usar una transacción
2. Generar el valor IDENTITY
3. Buscar dónde insertar la fila en el índice clustered
4. Modificar páginas de datos
5. Registrar todo en el transaction log
6. Confirmar la transacción con COMMIT
```

---

## 2. Se genera el valor `IDENTITY`

Si la tabla tiene:

```sql
id_producto INT IDENTITY(1,1)
```

SQL Server genera el siguiente valor disponible.

Ejemplo:

```text
último id = 10
nuevo id = 11
```

Importante:

```text
IDENTITY no garantiza ausencia absoluta de huecos.
```

Puede haber saltos si:

```text
- una transacción falla
- se hace rollback
- se reinicia el servidor
- SQL Server cachea valores de identity
```

Ejemplo:

```text
1, 2, 3, 7, 8...
```

Eso no rompe nada. Un ID técnico no debería depender de ser perfectamente consecutivo.

---

## 3. SQL Server busca la página destino

El índice clustered internamente usa una estructura tipo **B+Tree**.

Simplificado:

```text
Root page
   ↓
Intermediate pages
   ↓
Leaf pages
```

En un índice clustered, las **leaf pages** contienen la fila completa.

Ejemplo conceptual:

```text
Root
 ├── ids 1-100
 ├── ids 101-200
 └── ids 201-300
```

Si insertás `id_producto = 250`, SQL Server navega el árbol hasta encontrar la página hoja correspondiente.

---

## 4. Caso ideal con `IDENTITY`

Con `IDENTITY(1,1)`, los valores crecen:

```text
1, 2, 3, 4, 5...
```

Entonces la mayoría de inserts van al final del índice.

```text
Página hoja final:

[101, 102, 103, 104]

Insertás 105:

[101, 102, 103, 104, 105]
```

Esto es eficiente porque:

```text
- no tiene que insertar en el medio
- reduce page splits
- mantiene baja fragmentación
- favorece escrituras secuenciales
```

---

## 5. Caso problemático con clave aleatoria

Si la clustered key fuera:

```sql
id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY CLUSTERED
```

Los valores no llegan ordenados.

Entonces SQL Server puede tener que insertar en cualquier página del árbol.

```text
Página existente:

[A100, B200, D400, F600]

Nuevo GUID:

C300
```

Debe entrar en el medio:

```text
[A100, B200, C300, D400, F600]
```

Si la página no tiene espacio, ocurre un **page split**.

---

## 6. Qué es un `page split`

SQL Server almacena datos en páginas de **8 KB**.

Si una página está llena:

```text
Página 1:

[10, 20, 30, 40]
```

y necesitás insertar `25`, no entra ordenadamente.

SQL Server divide la página:

```text
Página 1:
[10, 20]

Página 2:
[25, 30, 40]
```

Luego actualiza el árbol para apuntar correctamente a ambas páginas.

Esto genera:

```text
- más escrituras
- más transaction log
- fragmentación
- más páginas ocupadas
- posible peor performance en lecturas
```

---

## 7. Se modifica la página en memoria

SQL Server no suele escribir directamente al archivo `.mdf` en cada insert.

Primero trabaja en memoria, en el **buffer pool**.

Flujo simplificado:

```text
Disco
  ↓
Página cargada al buffer pool
  ↓
SQL Server modifica la página en memoria
  ↓
La página queda marcada como dirty page
```

Una **dirty page** es una página modificada en memoria que todavía no fue escrita al archivo de datos.

---

## 8. Se registra en el transaction log

Antes de que el cambio sea considerado confirmado, SQL Server escribe información en el **transaction log**.

El archivo de log suele ser:

```text
.ldf
```

Este log registra operaciones necesarias para:

```text
- confirmar transacciones
- hacer rollback
- recuperar la base ante fallos
- replicación
- backups incrementales/diferenciales según configuración
```

SQL Server usa un mecanismo equivalente al principio de **Write-Ahead Logging**:

```text
Primero se escribe el log.
Después se pueden escribir las páginas de datos.
```

En SQL Server se suele hablar de **transaction log**, no tanto de “WAL” como en PostgreSQL, pero el principio es similar.

---

## 9. Qué se escribe en el transaction log

Para un `INSERT`, el log puede registrar cosas como:

```text
- inicio de transacción
- asignación de páginas si hizo falta
- inserción de la fila
- modificación de estructuras del índice
- cambios en índices nonclustered
- page splits si ocurrieron
- commit de la transacción
```

No necesariamente guarda “el SQL original”.

Guarda información suficiente para:

```text
- rehacer la operación si estaba confirmada
- deshacerla si no estaba confirmada
```

Esto responde al modelo:

```text
REDO / UNDO
```

---

## 10. El `COMMIT`

Cuando se ejecuta:

```sql
COMMIT;
```

SQL Server debe garantizar que el registro de log de commit llegue a almacenamiento durable.

Conceptualmente:

```text
1. Se escriben los registros de log
2. Se escribe el commit en el log
3. La transacción queda confirmada
```

Esto no significa que la página de datos ya esté escrita en el `.mdf`.

Puede estar todavía en memoria como dirty page.

---

## 11. ¿Cuándo se escribe el dato al archivo `.mdf`?

Las páginas modificadas se escriben al archivo de datos después, por procesos internos como:

```text
- checkpoint
- lazy writer
- flushing por presión de memoria
```

Entonces puede pasar esto:

```text
Transaction log:
ya tiene el INSERT confirmado

Data file:
todavía no tiene la página escrita físicamente
```

Eso está bien porque, si el servidor se cae, SQL Server puede recuperar usando el log.

---

## 12. Qué pasa si SQL Server se cae después del COMMIT

Supongamos:

```text
1. Insertaste una fila
2. Se escribió el commit en el transaction log
3. La página de datos todavía no llegó al .mdf
4. Se corta la luz
```

Al levantar, SQL Server hace recovery.

Como el log dice que la transacción estaba confirmada, SQL Server hace **REDO**:

```text
Reaplica el cambio en el archivo de datos.
```

Resultado:

```text
La fila no se pierde.
```

---

## 13. Qué pasa si SQL Server se cae antes del COMMIT

Supongamos:

```text
1. Insertaste una fila
2. Se modificó una página en memoria
3. Se registraron cambios en el log
4. No llegó el COMMIT
5. Se cae el servidor
```

Al recuperar, SQL Server detecta que la transacción no estaba confirmada.

Entonces hace **UNDO**:

```text
Deshace los cambios parciales.
```

Resultado:

```text
La fila no queda insertada.
```

---

## 14. Qué pasa con índices nonclustered

Si la tabla tiene índices adicionales:

```sql
CREATE INDEX IX_Producto_Nombre
ON bbdda.Producto(nombre);
```

Entonces cada `INSERT` no solo actualiza el índice clustered.

También actualiza los índices nonclustered.

Ejemplo:

```text
INSERT Producto
   ↓
Actualiza clustered index
   ↓
Actualiza IX_Producto_Nombre
   ↓
Registra ambos cambios en transaction log
```

Por eso demasiados índices hacen más costosas las escrituras.

---

## 15. Diferencia entre clustered y nonclustered en el insert

### Clustered index

Contiene la fila completa en sus páginas hoja.

```text
Clustered index leaf page:
[id_producto, nombre, precio, stock, fecha_creacion, ...]
```

### Nonclustered index

Contiene la clave del índice y una referencia a la fila.

Si la tabla tiene clustered index, el nonclustered suele guardar la clustered key como localizador.

```text
IX_Producto_Nombre leaf page:
[nombre, id_producto]
```

Entonces, si insertás:

```text
id_producto = 10
nombre = 'Casco LS2'
```

Se actualiza:

```text
Clustered:
[10, 'Casco LS2', ...]

Nonclustered:
['Casco LS2', 10]
```

---

## 16. Flujo completo resumido

```text
INSERT
  ↓
Genera IDENTITY
  ↓
Busca posición en el B+Tree del clustered index
  ↓
Carga página al buffer pool si no estaba en memoria
  ↓
Inserta la fila en la página
  ↓
Si no hay espacio, hace page split
  ↓
Actualiza índices nonclustered
  ↓
Escribe registros en transaction log
  ↓
COMMIT escribe confirmación en log
  ↓
La página queda dirty en memoria
  ↓
Más tarde checkpoint/lazy writer escribe al .mdf
```

---

## 17. Comparación `IDENTITY` vs `NEWID()` en este proceso

| Aspecto                  | `INT IDENTITY` clustered | `NEWID()` clustered |
| ------------------------ | ------------------------ | ------------------- |
| Orden de inserción       | Secuencial               | Aleatorio           |
| Página destino           | Casi siempre la última   | Cualquier página    |
| Page splits              | Pocos                    | Muchos              |
| Fragmentación            | Baja                     | Alta                |
| Transaction log generado | Menor                    | Mayor               |
| Uso de cache/buffer      | Más eficiente            | Más disperso        |
| Tamaño de clave          | 4 bytes con `INT`        | 16 bytes            |
| Índices nonclustered     | Más chicos               | Más grandes         |

---

## 18. Punto importante sobre el log

El transaction log no existe solo para auditoría.

Existe principalmente para garantizar:

```text
Atomicidad
Durabilidad
Rollback
Recovery
Consistencia
```

Cuando una transacción hace `COMMIT`, SQL Server garantiza durabilidad porque el log fue persistido.

Por eso el log es crítico.

Si el archivo `.ldf` tiene problemas, la base puede quedar comprometida.

---

## 19. Ejemplo mental simple

Con `IDENTITY`:

```text
Libro ordenado por número de página.

Ya tenés páginas:
1, 2, 3, 4

Agregás:
5

Lo ponés al final.
```

Con `NEWID()`:

```text
Libro ordenado por códigos aleatorios.

Ya tenés:
A100, C300, F900

Agregás:
B200

Tenés que meterlo en el medio.
Si no hay espacio, dividís páginas.
```

El segundo caso genera más trabajo interno.

---

## Conclusión

Cuando insertás en una tabla con índice clustered, SQL Server no solo “guarda una fila”.

Hace esto:

```text
- ubica la posición correcta en el B+Tree
- modifica páginas de datos en memoria
- puede dividir páginas si no hay espacio
- actualiza índices relacionados
- registra todo en el transaction log
- confirma con COMMIT en el log
- escribe los datos físicos al .mdf más tarde
- usa el log para REDO/UNDO si ocurre una caída
```

La elección de la clave clustered impacta directamente en cuántas páginas toca, cuánto log genera, cuánta fragmentación aparece y cuánto cuesta insertar.
