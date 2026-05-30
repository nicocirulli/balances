# CASOS DE PRUEBA MANUAL - Reportes Mejorados

## Requisitos Previos
1. Tener transacciones con múltiples categorías
2. Mezclar ingresos y egresos en algunas categorías (ej: INSUMOS con ingresos y egresos)
3. Datos de al menos 6 meses anteriores para ver evolución

## CASO 1: Validación de Separación Ingresos/Egresos

### Paso 1: Crear transacciones de prueba
Si no tienes datos, agregar:
- INSUMOS Ingreso: $100 USD (puede ser ajuste de inventario)
- INSUMOS Egreso: $50 USD (compra de insumos)
- TURNOS Ingreso: $300 USD
- CLASES Egreso: $80 USD

### Paso 2: Abrir Reporte
1. Ir a "Reporte Financiero"
2. Seleccionar período que incluya las transacciones

### Paso 3: Verificar Tablas
✅ **Tabla "Ingresos por categoría"**
- INSUMOS debe aparecer con $100 (solo ingresos)
- TURNOS debe aparecer con $300

✅ **Tabla "Egresos por categoría"**
- INSUMOS debe aparecer con $50 (solo egresos)
- CLASES debe aparecer con $80

❌ **NO debe ocurrir**:
- INSUMOS aparecer en ambas tablas con valores mezclados
- Count incorrecto (debe contar solo los de su tipo)

### Paso 4: Verificar Pie Charts
✅ **Pie Chart "Distribución de ingresos"**
- Solo categorías con ingresos
- INSUMOS $100 
- TURNOS $300
- Total mostrado = $400

✅ **Pie Chart "Distribución de egresos"**
- Solo categorías con egresos
- INSUMOS $50
- CLASES $80
- Total mostrado = $130

---

## CASO 2: Validación de KPIs

### Paso 1: Abrir Reporte con datos
Usar el período de prueba anterior

### Paso 2: Verificar SummaryCards
✅ **Total Ingresos**: $400 USD
✅ **Total Egresos**: $130 USD
✅ **Balance Neto**: $270 USD (color azul porque es positivo)
✅ **Cantidad de Movimientos**: 4 registros

### Paso 3: Validar Coincidencia
```
Total Ingresos (KPI) = 400
Suma de Ingresos por Categoría:
  - INSUMOS: 100
  - TURNOS: 300
  Total: 400 ✅ COINCIDEN

Total Egresos (KPI) = 130
Suma de Egresos por Categoría:
  - INSUMOS: 50
  - CLASES: 80
  Total: 130 ✅ COINCIDEN

Balance = 400 - 130 = 270 ✅ CORRECTO
```

---

## CASO 3: Validación de Bar Charts

### Paso 1: Bar Chart "Ingresos vs Egresos"
✅ **Debe mostrar**:
- Barra verde (Ingresos): $400
- Barra roja (Egresos): $130
- Tooltip con: "Ingresos: $400, Egresos: $130, Balance: $270"

✅ **Responsividad**:
- Desktop: Visible lado a lado
- Mobile: Stack vertical (1 columna)

### Paso 2: Bar Chart "Evolución Mensual"
✅ **Debe mostrar**:
- Últimos 6 meses (ej: Jun, Jul, Ago, Sep, Oct, Nov)
- Barras verdes (ingresos) y rojas (egresos) por mes
- Valores correctos de cada mes

✅ **Ejemplo esperado** (si tienes datos de 6 meses):
```
Mes | Ingresos | Egresos | Balance
Jun |   500    |   200   |   300
Jul |   450    |   180   |   270
Ago |   600    |   300   |   300
Sep |   550    |   250   |   300
Oct |   400    |   100   |   300
Nov |   400    |   130   |   270
```

---

## CASO 4: Validación de Porcentajes

### Paso 1: Verificar suma de porcentajes
En tabla "Ingresos por categoría":
```
TURNOS:  75%  (300/400)
INSUMOS: 25%  (100/400)
Total:   100% ✅
```

En tabla "Egresos por categoría":
```
CLASES:  61%  (80/130)
INSUMOS: 38%  (50/130)  [puede ser 39% por redondeo]
Total:   ~100% ✅
```

Tolerancia: ±1% por redondeo es aceptable

### Paso 2: Verificar pie charts
Pie charts deben mostrar los mismos porcentajes que las tablas

---

## CASO 5: Cambio de Rango de Fechas

### Paso 1: Seleccionar rango corto (1 día)
1. Usar date picker para seleccionar solo un día con transacciones
2. Verificar que los datos se actualizan correctamente
3. Los gráficos deben actualizarse sin errores

### Paso 2: Seleccionar rango largo (6 meses)
1. Seleccionar los últimos 6 meses
2. Todos los gráficos deben actualizarse
3. Bar chart de evolución debe mostrar 6 meses

### Paso 3: Seleccionar rango vacío
1. Seleccionar un período sin transacciones
2. Debe aparecer mensaje "Sin datos en el período"
3. No deben haber gráficos rotos o errores en consola

---

## CASO 6: Validación de Moneda

### Verificar formato USD
✅ En Summary Cards:
```
Ingresos: $ 400.00 USD
Egresos:  $ 130.00 USD
Balance:  $ 270.00 USD
```

✅ En Tablas:
```
Total: $ 400.00
Ingresos por categoría: $ 100.00, $ 300.00
```

✅ En Gráficos (tooltip):
```
Ingresos: $ 400.00
Egresos: $ 130.00
```

---

## CASO 7: Estados Vacíos

### Paso 1: Sin ingresos
Crear período con solo egresos:
✅ Pie chart "Distribución de ingresos" → "Sin ingresos en el período"
✅ Tabla "Ingresos por categoría" → "Sin datos"
✅ KPI "Total Ingresos" → $0.00

### Paso 2: Sin egresos
Crear período con solo ingresos:
✅ Pie chart "Distribución de egresos" → "Sin egresos en el período"
✅ Tabla "Egresos por categoría" → "Sin datos"
✅ KPI "Total Egresos" → $0.00

---

## CASO 8: Responsive Design

### Desktop (1024px+)
✅ Grid 2 columnas:
```
[Pie Ingresos] [Pie Egresos]
[Bar Comparación] [Bar Evolución]
[Tabla Ingresos] [Tabla Egresos]
```

### Tablet (640px-1023px)
✅ Grid 2 columnas (igual a desktop)
Opcional: Grid 1 columna si necesario

### Mobile (< 640px)
✅ Grid 1 columna:
```
[Pie Ingresos]
[Pie Egresos]
[Bar Comparación]
[Bar Evolución]
[Tabla Ingresos]
[Tabla Egresos]
```

---

## CASO 9: Exportación (Excel/PDF)

### Paso 1: Exportar CSV
1. Botón "Excel" debe estar habilitado con datos
2. Descargar archivo CSV
3. Verificar que contiene:
   - Resumen (Ingresos, Egresos, Balance)
   - Listado de transacciones

### Paso 2: Exportar PDF
1. Botón "PDF" debe estar habilitado con datos
2. Descargar archivo PDF
3. Verificar que contiene tabla de transacciones

### Paso 3: Sin datos
1. Seleccionar período vacío
2. Botones Excel/PDF deben estar deshabilitados (grayed out)

---

## CASO 10: Performance

### Paso 1: Carga inicial
1. Abrir página de reportes
2. Verificar que carga en < 2 segundos
3. No debe haber spinner indefinido

### Paso 2: Cambio de rango
1. Seleccionar nuevo rango de fechas
2. Datos deben actualizarse en < 1 segundo
3. Gráficos deben re-renderizar suavemente

### Paso 3: Consola del navegador
1. Abrir DevTools (F12)
2. Cambiar rangos de fecha
3. Verificar que NO hay errores rojos en consola
4. Warnings aceptables: deprecación de Tailwind classes

---

## RESUMEN DE VALIDACIÓN

Usar esta checklist:

- [ ] Ingresos y egresos separados en tablas
- [ ] Ninguna categoría aparece con datos mezclados
- [ ] KPIs coinciden exactamente con suma de categorías
- [ ] Porcentajes suman ~100% (tolerancia ±1%)
- [ ] Bar Chart Ingresos vs Egresos muestra correctamente
- [ ] Bar Chart Evolución Mensual muestra 6 meses
- [ ] Pie Charts son exactos
- [ ] Estados vacíos funcionan
- [ ] Responsive design funciona en mobile
- [ ] Formato USD es consistente
- [ ] Sin errores en consola
- [ ] Exportación funciona

**Si todo está ✅ → Reporte exitoso**
