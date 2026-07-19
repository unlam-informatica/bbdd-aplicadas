---
layout: default
title: Laboratorio — Backup y restore
parent: Práctica
grand_parent: Unidad 5
nav_order: 2
permalink: /unidad-5/practica/laboratorio-backup/
---

[← Unidad 5](../../)

# Laboratorio — Cadena de backup y restauración

El laboratorio produce una cadena FULL → diferencial → logs y recupera otra base. Adaptar rutas a directorios donde la **cuenta del servicio SQL Server** tenga acceso.

{: .warning }
No usar `WITH REPLACE` sobre una base real. Trabajar con `LaboratorioU5` y restaurar como `LaboratorioU5_Restore`.

## 1. Preparar modelo FULL

```sql
USE master;
GO
ALTER DATABASE LaboratorioU5 SET RECOVERY FULL;
GO
SELECT name, recovery_model_desc, log_reuse_wait_desc
FROM sys.databases
WHERE name = 'LaboratorioU5';
```

## 2. Backup full — punto A

```sql
BACKUP DATABASE LaboratorioU5
TO DISK = 'D:\SQLBackups\U5_full.bak'
WITH INIT, COMPRESSION, CHECKSUM, STATS = 10;
GO

USE LaboratorioU5;
INSERT ventas.Pedido(ClienteId, Importe, Estado)
VALUES (1, 100, 'A_FULL');
GO
```

## 3. Primer backup de log — punto B

```sql
BACKUP LOG LaboratorioU5
TO DISK = 'D:\SQLBackups\U5_log_01.trn'
WITH INIT, COMPRESSION, CHECKSUM;
GO

USE LaboratorioU5;
INSERT ventas.Pedido(ClienteId, Importe, Estado)
VALUES (1, 200, 'B_LOG1');
GO
```

## 4. Diferencial — punto C

```sql
BACKUP DATABASE LaboratorioU5
TO DISK = 'D:\SQLBackups\U5_diff.bak'
WITH DIFFERENTIAL, INIT, COMPRESSION, CHECKSUM;
GO

USE LaboratorioU5;
INSERT ventas.Pedido(ClienteId, Importe, Estado)
VALUES (1, 300, 'C_DIFF');
GO
```

Pregunta: ¿el diferencial contiene el estado `A_FULL`, `B_LOG1`, ambos o ninguno? Justificar desde “cambios acumulados desde el full base”.

## 5. Logs posteriores

```sql
BACKUP LOG LaboratorioU5
TO DISK = 'D:\SQLBackups\U5_log_02.trn'
WITH INIT, COMPRESSION, CHECKSUM;
GO

USE LaboratorioU5;
DECLARE @momento_objetivo datetime2 = SYSDATETIME();
SELECT @momento_objetivo AS MomentoAntesDelError;

WAITFOR DELAY '00:00:02';
UPDATE ventas.Pedido SET Estado = 'ERROR_LOGICO';
GO

BACKUP LOG LaboratorioU5
TO DISK = 'D:\SQLBackups\U5_log_03.trn'
WITH INIT, COMPRESSION, CHECKSUM;
```

Guardar manualmente el valor de `MomentoAntesDelError`.

## 6. Inspección

```sql
RESTORE HEADERONLY FROM DISK = 'D:\SQLBackups\U5_full.bak';
RESTORE FILELISTONLY FROM DISK = 'D:\SQLBackups\U5_full.bak';
RESTORE VERIFYONLY FROM DISK = 'D:\SQLBackups\U5_full.bak' WITH CHECKSUM;
```

Registrar:

- `FirstLSN`, `LastLSN`, `CheckpointLSN` y `DatabaseBackupLSN`;
- nombres lógicos de data y log;
- diferencia entre verificar un archivo y demostrar un restore.

## 7. Restore full y diferencial

Reemplazar los nombres lógicos por los obtenidos con `FILELISTONLY`:

```sql
USE master;
GO
RESTORE DATABASE LaboratorioU5_Restore
FROM DISK = 'D:\SQLBackups\U5_full.bak'
WITH
    MOVE 'LaboratorioU5' TO 'D:\SQLData\LaboratorioU5_Restore.mdf',
    MOVE 'LaboratorioU5_log' TO 'D:\SQLData\LaboratorioU5_Restore.ldf',
    NORECOVERY,
    STATS = 10;
GO

RESTORE DATABASE LaboratorioU5_Restore
FROM DISK = 'D:\SQLBackups\U5_diff.bak'
WITH NORECOVERY;
GO
```

¿Por qué no hace falta restaurar `U5_log_01.trn` si se aplicó el diferencial? Verificar los LSN y explicar qué logs sí son posteriores al diferencial.

## 8. Point-in-time restore

```sql
RESTORE LOG LaboratorioU5_Restore
FROM DISK = 'D:\SQLBackups\U5_log_02.trn'
WITH NORECOVERY;
GO

RESTORE LOG LaboratorioU5_Restore
FROM DISK = 'D:\SQLBackups\U5_log_03.trn'
WITH STOPAT = 'REEMPLAZAR_POR_MOMENTO_ANTES_DEL_ERROR',
     RECOVERY;
GO
```

Validar:

```sql
USE LaboratorioU5_Restore;
SELECT * FROM ventas.Pedido ORDER BY PedidoId;
DBCC CHECKDB('LaboratorioU5_Restore') WITH NO_INFOMSGS;
```

El estado `ERROR_LOGICO` no debe estar, pero las operaciones anteriores al objetivo sí.

## 9. Copy-only

```sql
BACKUP DATABASE LaboratorioU5
TO DISK = 'D:\SQLBackups\U5_copy_only.bak'
WITH COPY_ONLY, INIT, CHECKSUM;
```

Generar después otro diferencial y comprobar en `HEADERONLY` que su base continúa siendo el full convencional.

## 10. Medición RPO/RTO

Registrar:

| Métrica | Valor observado |
|---------|-----------------|
| Inicio del incidente simulado | |
| Último punto recuperado | |
| Pérdida temporal real (RPO observado) | |
| Inicio del restore | |
| Fin de validación | |
| Tiempo total (RTO observado) | |

Proponer cambios para cumplir RPO 5 minutos y RTO 30 minutos con una base cien veces mayor.

## Desafíos

1. Restaurar sin diferencial usando todos los logs desde el full.
2. Provocar una transacción abierta y observar `ACTIVE_TRANSACTION`.
3. Comparar tamaño y duración con/sin `COMPRESSION`.
4. Diseñar retención 3-2-1 con copia inmutable.
5. Documentar un runbook que otra persona pueda ejecutar sin conocimiento previo.

