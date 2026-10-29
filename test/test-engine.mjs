import {
  calculatePEPS,
  calculateUEPS,
  calculatePromedio,
  calculatePeriodico,
  validateOperationsStock,
  formatCurrency
} from '../js/kardex-engine.js';

console.log('🧪 INICIANDO PRUEBAS UNITARIAS DE CONTAPASO...\n');

// 1. CASO DE PRUEBA OFICIAL DEL PRD
const operacionesPRD = [
  { id: 1, tipo: 'inicial', fecha: 'Día 1', detalle: 'Inventario Inicial', cantidad: 100, costoUnitario: 10000 },
  { id: 2, tipo: 'compra', fecha: 'Día 2', detalle: 'Compra Factura #01', cantidad: 50, costoUnitario: 12000 },
  { id: 3, tipo: 'venta', fecha: 'Día 3', detalle: 'Venta Factura #101', cantidad: 80, costoUnitario: 0 },
  { id: 4, tipo: 'compra', fecha: 'Día 4', detalle: 'Compra Factura #02', cantidad: 70, costoUnitario: 14000 },
  { id: 5, tipo: 'venta', fecha: 'Día 5', detalle: 'Venta Factura #102', cantidad: 90, costoUnitario: 0 }
];

// Validación de stock
const validacion = validateOperationsStock(operacionesPRD);
console.log('1. Validación de Stock:', validacion.isValid ? '✅ VÁLIDO (Sin sobreventas)' : '❌ ERROR');
if (!validacion.isValid) {
  console.error(validacion.errors);
  process.exit(1);
}

// Cálculo PEPS
const resPEPS = calculatePEPS(operacionesPRD);
console.log('\n2. Verificación de PEPS (Caso oficial del PRD):');
console.log('   - Costo de Ventas obtenido: ' + formatCurrency(resPEPS.costoVentasTotal));
console.log('   - Costo de Ventas esperado: $ 1.880.000');
console.log('   - Inventario Final obtenido: ' + formatCurrency(resPEPS.inventarioFinalValor));
console.log('   - Inventario Final esperado: $ 700.000');
console.log('   - Unidades restantes: ' + resPEPS.inventarioFinalUnidades + ' (Esperado: 50)');

if (resPEPS.costoVentasTotal === 1880000 && resPEPS.inventarioFinalValor === 700000 && resPEPS.inventarioFinalUnidades === 50) {
  console.log('   👉 RESULTADO: ✅ ¡CUMPLE 100% EL PRD!');
} else {
  console.error('   👉 RESULTADO: ❌ DISCREPANCIA EN EL CÁLCULO');
  process.exit(1);
}

// Cálculo UEPS
const resUEPS = calculateUEPS(operacionesPRD);
console.log('\n3. Verificación de UEPS:');
console.log('   - Costo de Ventas: ' + formatCurrency(resUEPS.costoVentasTotal) + ' (Esperado: $ 2.080.000)');
console.log('   - Inventario Final: ' + formatCurrency(resUEPS.inventarioFinalValor) + ' (Esperado: $ 500.000)');
if (resUEPS.costoVentasTotal === 2080000 && resUEPS.inventarioFinalValor === 500000) {
  console.log('   👉 RESULTADO: ✅ UEPS EXACTO');
} else {
  console.error('   👉 RESULTADO: ❌ ERROR EN UEPS');
  process.exit(1);
}

// Cálculo Promedio Ponderado
const resProm = calculatePromedio(operacionesPRD);
console.log('\n4. Verificación de Promedio Ponderado Móvil:');
console.log('   - Costo de Ventas: ' + formatCurrency(resProm.costoVentasTotal));
console.log('   - Inventario Final: ' + formatCurrency(resProm.inventarioFinalValor));
console.log('   - Suma cuadre: ' + formatCurrency(resProm.costoVentasTotal + resProm.inventarioFinalValor) + ' (Debe ser $ 2.580.000)');
if (Math.round(resProm.costoVentasTotal + resProm.inventarioFinalValor) === 2580000) {
  console.log('   👉 RESULTADO: ✅ PROMEDIO CUADRADO EXACTO');
} else {
  console.error('   👉 RESULTADO: ❌ ERROR EN CUADRE DE PROMEDIO');
  process.exit(1);
}

// Prueba de Sobreventa (debe fallar la validación)
const operacionesConSobreventa = [
  { id: 1, tipo: 'inicial', cantidad: 50, costoUnitario: 10000 },
  { id: 2, tipo: 'venta', cantidad: 60, costoUnitario: 0 } // Intenta vender 60 habiendo solo 50
];
const valSobreventa = validateOperationsStock(operacionesConSobreventa);
console.log('\n5. Prueba de Alerta de Sobreventa:');
if (!valSobreventa.isValid && valSobreventa.errors.length > 0) {
  console.log('   👉 RESULTADO: ✅ ALERTA DETECTADA CORRECTAMENTE: ' + valSobreventa.errors[0].mensaje);
} else {
  console.error('   👉 RESULTADO: ❌ NO SE DETECTÓ LA SOBREVENTA');
  process.exit(1);
}

// Prueba de Inventario Periódico
const resPeriodico = calculatePeriodico(operacionesPRD, 'peps');
console.log('\n6. Prueba de Inventario Periódico:');
console.log('   - Mercancía Disponible: ' + formatCurrency(resPeriodico.mercanciaDisponible.valor) + ' (' + resPeriodico.mercanciaDisponible.unidades + ' u)');
console.log('   - Inventario Final PEPS: ' + formatCurrency(resPeriodico.invFinal.valor) + ' (' + resPeriodico.invFinal.unidades + ' u)');
console.log('   - Costo de Ventas: ' + formatCurrency(resPeriodico.costoVentas));
if (resPeriodico.costoVentas === 1880000) {
  console.log('   👉 RESULTADO: ✅ PERIÓDICO CUADRA CON PEPS');
} else {
  console.error('   👉 RESULTADO: ❌ ERROR EN PERIÓDICO');
  process.exit(1);
}

console.log('\n🎉 ¡TODAS LAS PRUEBAS MATEMÁTICAS Y DE VALIDACIÓN PASARON EXITOSAMENTE!');
