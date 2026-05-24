-- Enumerar, de mayor a menor, los empleados según el salario que poseen.
SELECT * FROM wf.Empleados;


SELECT Nombre,
       Salario,
       Departamento,
       AVG(Salario) OVER(PARTITION BY Departamento) AS [Salario promedio por departamento],
       AVG(Salario) OVER() AS [Salario Promedio]
FROM wf.Empleados;


-- Ejercicio 2 — RANK por departamento
-- Clasifica a los empleados según sus salarios agrupado por departamento.
SELECT Nombre,
        Salario,
        Departamento,
        DENSE_RANK() OVER(PARTITION BY Departamento ORDER BY  Salario DESC) AS [Salario promedio por departamento] FROM wf.Empleados;

-- Ejercicio 3 — NTILE en cuartiles de salario
-- Dividir a los empleados en 4 grupos basados en su salario. El grupo 1 contendrá a los empleados con los salarios más altos; el grupo 4, a los de salarios más bajos.
SELECT Nombre,
       Salario,
       Departamento,
       ntile(4) over (ORDER BY Salario DESC) FROM wf.Empleados;


