/**
 * ContaPaso - Motor Contable de Valuación de Inventarios (Kardex Engine)
 * Métodos: PEPS (FIFO), UEPS (LIFO), Promedio Ponderado Móvil e Inventario Periódico.
 */

// Formateador de moneda en pesos colombianos ($ COP) o formato genérico
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  return '$ ' + Math.round(amount).toLocaleString('es-CO');
}

// Formateador de números (unidades)
export function formatUnits(qty) {
  if (qty === null || qty === undefined || isNaN(qty)) return '0';
  return Number(qty).toLocaleString('es-CO');
}

/**
 * Valida las operaciones cronológicamente para detectar ventas que superen el stock disponible.
 * @param {Array} operations - Lista de operaciones [{ id, tipo, fecha, detalle, cantidad, costoUnitario }]
 * @returns {Object} { isValid: boolean, errors: Array }
 */
export function validateOperationsStock(operations) {
  let currentStock = 0;
  const errors = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const qty = Number(op.cantidad) || 0;

    if (op.tipo === 'inicial' || op.tipo === 'compra') {
      currentStock += qty;
    } else if (op.tipo === 'venta') {
      if (qty > currentStock) {
        errors.push({
          index: i,
          operacion: op,
          solicitado: qty,
          disponible: currentStock,
          mensaje: `En la operación #${i + 1} (${op.detalle || 'Venta'}): Intentas vender ${qty} unidades pero solo hay ${currentStock} unidades disponibles en existencia.`
        });
      }
      currentStock = Math.max(0, currentStock - qty);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    finalStockUnits: currentStock
  };
}

/**
 * Cálculo del Método PEPS (Primeras en Entrar, Primeras en Salir / FIFO)
 */
export function calculatePEPS(operations) {
  // Capas de inventario: cada capa es { id, fecha, detalle, cantidad, costoUnitario, cantidadRestante }
  const capas = [];
  const kardexRows = [];
  let totalCostoVentas = 0;

  operations.forEach((op, index) => {
    const qty = Number(op.cantidad) || 0;
    const costoUnit = Number(op.costoUnitario) || 0;
    const row = {
      index: index + 1,
      fecha: op.fecha || `Op #${index + 1}`,
      detalle: op.detalle || (op.tipo === 'inicial' ? 'Inventario Inicial' : op.tipo === 'compra' ? 'Compra' : 'Venta'),
      tipo: op.tipo,
      entrada: { cantidad: 0, costoUnitario: 0, total: 0 },
      salida: { cantidad: 0, costoUnitario: 0, total: 0 },
      saldo: { cantidad: 0, total: 0, capas: [] },
      desgloseSalida: [] // Explica de qué lotes salieron las unidades
    };

    if (op.tipo === 'inicial' || op.tipo === 'compra') {
      const totalOperacion = qty * costoUnit;
      row.entrada = { cantidad: qty, costoUnitario: costoUnit, total: totalOperacion };
      
      capas.push({
        origen: op.detalle || (op.tipo === 'inicial' ? 'Inv. Inicial' : `Compra #${index + 1}`),
        costoUnitario: costoUnit,
        cantidadRestante: qty,
        cantidadOriginal: qty
      });
    } else if (op.tipo === 'venta') {
      let unidadesPorCubrir = qty;
      let costoTotalVenta = 0;
      const desglose = [];

      for (let c = 0; c < capas.length; c++) {
        const capa = capas[c];
        if (capa.cantidadRestante <= 0) continue;

        const tomar = Math.min(capa.cantidadRestante, unidadesPorCubrir);
        const subtotal = tomar * capa.costoUnitario;
        
        capa.cantidadRestante -= tomar;
        unidadesPorCubrir -= tomar;
        costoTotalVenta += subtotal;

        desglose.push({
          lote: capa.origen,
          cantidad: tomar,
          costoUnitario: capa.costoUnitario,
          subtotal
        });

        if (unidadesPorCubrir === 0) break;
      }

      totalCostoVentas += costoTotalVenta;
      const costoUnitarioPromedioVenta = qty > 0 ? costoTotalVenta / qty : 0;
      row.salida = {
        cantidad: qty,
        costoUnitario: costoUnitarioPromedioVenta,
        total: costoTotalVenta
      };
      row.desgloseSalida = desglose;
    }

    // Saldo acumulado al final de la operación
    let saldoCantidad = 0;
    let saldoTotal = 0;
    const saldoCapas = [];

    capas.forEach(c => {
      if (c.cantidadRestante > 0) {
        saldoCantidad += c.cantidadRestante;
        const totalCapa = c.cantidadRestante * c.costoUnitario;
        saldoTotal += totalCapa;
        saldoCapas.push({
          lote: c.origen,
          cantidad: c.cantidadRestante,
          costoUnitario: c.costoUnitario,
          total: totalCapa
        });
      }
    });

    row.saldo = {
      cantidad: saldoCantidad,
      total: saldoTotal,
      capas: saldoCapas
    };

    kardexRows.push(row);
  });

  const finalSaldo = kardexRows.length > 0 ? kardexRows[kardexRows.length - 1].saldo : { cantidad: 0, total: 0, capas: [] };

  return {
    metodo: 'PEPS',
    nombreMetodo: 'Primeras en Entrar, Primeras en Salir (PEPS / FIFO)',
    kardex: kardexRows,
    costoVentasTotal: totalCostoVentas,
    inventarioFinalValor: finalSaldo.total,
    inventarioFinalUnidades: finalSaldo.cantidad,
    capasFinales: finalSaldo.capas
  };
}

/**
 * Cálculo del Método UEPS (Últimas en Entrar, Primeras en Salir / LIFO)
 */
export function calculateUEPS(operations) {
  const capas = [];
  const kardexRows = [];
  let totalCostoVentas = 0;

  operations.forEach((op, index) => {
    const qty = Number(op.cantidad) || 0;
    const costoUnit = Number(op.costoUnitario) || 0;
    const row = {
      index: index + 1,
      fecha: op.fecha || `Op #${index + 1}`,
      detalle: op.detalle || (op.tipo === 'inicial' ? 'Inventario Inicial' : op.tipo === 'compra' ? 'Compra' : 'Venta'),
      tipo: op.tipo,
      entrada: { cantidad: 0, costoUnitario: 0, total: 0 },
      salida: { cantidad: 0, costoUnitario: 0, total: 0 },
      saldo: { cantidad: 0, total: 0, capas: [] },
      desgloseSalida: []
    };

    if (op.tipo === 'inicial' || op.tipo === 'compra') {
      const totalOperacion = qty * costoUnit;
      row.entrada = { cantidad: qty, costoUnitario: costoUnit, total: totalOperacion };
      
      capas.push({
        origen: op.detalle || (op.tipo === 'inicial' ? 'Inv. Inicial' : `Compra #${index + 1}`),
        costoUnitario: costoUnit,
        cantidadRestante: qty,
        cantidadOriginal: qty
      });
    } else if (op.tipo === 'venta') {
      let unidadesPorCubrir = qty;
      let costoTotalVenta = 0;
      const desglose = [];

      // En UEPS tomamos desde la última capa hacia la primera (de atrás hacia adelante)
      for (let c = capas.length - 1; c >= 0; c--) {
        const capa = capas[c];
        if (capa.cantidadRestante <= 0) continue;

        const tomar = Math.min(capa.cantidadRestante, unidadesPorCubrir);
        const subtotal = tomar * capa.costoUnitario;
        
        capa.cantidadRestante -= tomar;
        unidadesPorCubrir -= tomar;
        costoTotalVenta += subtotal;

        desglose.push({
          lote: capa.origen,
          cantidad: tomar,
          costoUnitario: capa.costoUnitario,
          subtotal
        });

        if (unidadesPorCubrir === 0) break;
      }

      totalCostoVentas += costoTotalVenta;
      const costoUnitarioPromedioVenta = qty > 0 ? costoTotalVenta / qty : 0;
      row.salida = {
        cantidad: qty,
        costoUnitario: costoUnitarioPromedioVenta,
        total: costoTotalVenta
      };
      row.desgloseSalida = desglose;
    }

    let saldoCantidad = 0;
    let saldoTotal = 0;
    const saldoCapas = [];

    capas.forEach(c => {
      if (c.cantidadRestante > 0) {
        saldoCantidad += c.cantidadRestante;
        const totalCapa = c.cantidadRestante * c.costoUnitario;
        saldoTotal += totalCapa;
        saldoCapas.push({
          lote: c.origen,
          cantidad: c.cantidadRestante,
          costoUnitario: c.costoUnitario,
          total: totalCapa
        });
      }
    });

    row.saldo = {
      cantidad: saldoCantidad,
      total: saldoTotal,
      capas: saldoCapas
    };

    kardexRows.push(row);
  });

  const finalSaldo = kardexRows.length > 0 ? kardexRows[kardexRows.length - 1].saldo : { cantidad: 0, total: 0, capas: [] };

  return {
    metodo: 'UEPS',
    nombreMetodo: 'Últimas en Entrar, Primeras en Salir (UEPS / LIFO)',
    kardex: kardexRows,
    costoVentasTotal: totalCostoVentas,
    inventarioFinalValor: finalSaldo.total,
    inventarioFinalUnidades: finalSaldo.cantidad,
    capasFinales: finalSaldo.capas
  };
}

/**
 * Cálculo del Método Promedio Ponderado Móvil
 */
export function calculatePromedio(operations) {
  const kardexRows = [];
  let saldoCantidad = 0;
  let saldoTotal = 0;
  let costoUnitarioPonderado = 0;
  let totalCostoVentas = 0;

  operations.forEach((op, index) => {
    const qty = Number(op.cantidad) || 0;
    const costoUnit = Number(op.costoUnitario) || 0;
    const row = {
      index: index + 1,
      fecha: op.fecha || `Op #${index + 1}`,
      detalle: op.detalle || (op.tipo === 'inicial' ? 'Inventario Inicial' : op.tipo === 'compra' ? 'Compra' : 'Venta'),
      tipo: op.tipo,
      entrada: { cantidad: 0, costoUnitario: 0, total: 0 },
      salida: { cantidad: 0, costoUnitario: 0, total: 0 },
      saldo: { cantidad: 0, costoUnitario: 0, total: 0 },
      formulaExplicada: ''
    };

    if (op.tipo === 'inicial' || op.tipo === 'compra') {
      const totalOperacion = qty * costoUnit;
      row.entrada = { cantidad: qty, costoUnitario: costoUnit, total: totalOperacion };

      const saldoAnteriorTotal = saldoTotal;
      const saldoAnteriorCant = saldoCantidad;

      saldoCantidad += qty;
      saldoTotal += totalOperacion;
      costoUnitarioPonderado = saldoCantidad > 0 ? saldoTotal / saldoCantidad : 0;

      row.formulaExplicada = op.tipo === 'inicial'
        ? `Saldo inicial registrado: ${qty} unidades a ${formatCurrency(costoUnit)} = ${formatCurrency(totalOperacion)}.`
        : `Nuevo Costo Promedio = (${formatCurrency(saldoAnteriorTotal)} + ${formatCurrency(totalOperacion)}) / (${saldoAnteriorCant} + ${qty} unids) = ${formatCurrency(costoUnitarioPonderado)} por unidad.`;
    } else if (op.tipo === 'venta') {
      const costoTotalVenta = qty * costoUnitarioPonderado;
      totalCostoVentas += costoTotalVenta;

      row.salida = {
        cantidad: qty,
        costoUnitario: costoUnitarioPonderado,
        total: costoTotalVenta
      };

      saldoCantidad = Math.max(0, saldoCantidad - qty);
      saldoTotal = Math.max(0, saldoTotal - costoTotalVenta);

      row.formulaExplicada = `Salen ${qty} unidades al costo promedio vigente de ${formatCurrency(costoUnitarioPonderado)} = ${formatCurrency(costoTotalVenta)}.`;
    }

    row.saldo = {
      cantidad: saldoCantidad,
      costoUnitario: costoUnitarioPonderado,
      total: saldoTotal
    };

    kardexRows.push(row);
  });

  return {
    metodo: 'PROMEDIO',
    nombreMetodo: 'Promedio Ponderado Móvil (PP)',
    kardex: kardexRows,
    costoVentasTotal: totalCostoVentas,
    inventarioFinalValor: saldoTotal,
    inventarioFinalUnidades: saldoCantidad,
    costoUnitarioFinal: costoUnitarioPonderado
  };
}

/**
 * Cálculo para el Sistema de Inventario Periódico (Juego de Inventarios)
 * Fórmula: Costo de Ventas = Inventario Inicial + Compras Netas - Inventario Final
 */
export function calculatePeriodico(operations, metodoValuacion = 'peps') {
  let invInicialUnidades = 0;
  let invInicialValor = 0;
  let comprasUnidades = 0;
  let comprasValor = 0;
  let ventasUnidades = 0;

  const todasCompras = [];

  operations.forEach((op) => {
    const qty = Number(op.cantidad) || 0;
    const costo = Number(op.costoUnitario) || 0;

    if (op.tipo === 'inicial') {
      invInicialUnidades += qty;
      invInicialValor += qty * costo;
      todasCompras.push({ tipo: 'inicial', cantidad: qty, costoUnitario: costo, total: qty * costo });
    } else if (op.tipo === 'compra') {
      comprasUnidades += qty;
      comprasValor += qty * costo;
      todasCompras.push({ tipo: 'compra', cantidad: qty, costoUnitario: costo, total: qty * costo });
    } else if (op.tipo === 'venta') {
      ventasUnidades += qty;
    }
  });

  const totalDisponibleUnidades = invInicialUnidades + comprasUnidades;
  const totalDisponibleValor = invInicialValor + comprasValor;
  const invFinalUnidades = Math.max(0, totalDisponibleUnidades - ventasUnidades);

  // Valoración del Inventario Final según el método escogido
  let invFinalValor = 0;
  let explicacionValuacion = '';

  if (metodoValuacion.toLowerCase() === 'peps') {
    // En PEPS periódico, el inventario final queda compuesto por las compras MÁS RECIENTES
    let porCubrir = invFinalUnidades;
    for (let i = todasCompras.length - 1; i >= 0; i--) {
      const lote = todasCompras[i];
      const tomar = Math.min(lote.cantidad, porCubrir);
      invFinalValor += tomar * lote.costoUnitario;
      porCubrir -= tomar;
      if (porCubrir <= 0) break;
    }
    explicacionValuacion = `El inventario final de ${invFinalUnidades} unidades se valora con los precios de las compras más recientes (PEPS).`;
  } else if (metodoValuacion.toLowerCase() === 'ueps') {
    // En UEPS periódico, el inventario final queda compuesto por las compras MÁS ANTIGUAS (Inv. Inicial)
    let porCubrir = invFinalUnidades;
    for (let i = 0; i < todasCompras.length; i++) {
      const lote = todasCompras[i];
      const tomar = Math.min(lote.cantidad, porCubrir);
      invFinalValor += tomar * lote.costoUnitario;
      porCubrir -= tomar;
      if (porCubrir <= 0) break;
    }
    explicacionValuacion = `El inventario final de ${invFinalUnidades} unidades se valora con los precios más antiguos / iniciales (UEPS).`;
  } else {
    // Promedio Ponderado Periódico Global
    const cpuGlobal = totalDisponibleUnidades > 0 ? totalDisponibleValor / totalDisponibleUnidades : 0;
    invFinalValor = invFinalUnidades * cpuGlobal;
    explicacionValuacion = `El inventario final de ${invFinalUnidades} unidades se valora al costo unitario medio global de ${formatCurrency(cpuGlobal)}.`;
  }

  const costoVentas = totalDisponibleValor - invFinalValor;

  return {
    metodo: 'PERIODICO',
    metodoValuacion: metodoValuacion.toUpperCase(),
    invInicial: { unidades: invInicialUnidades, valor: invInicialValor },
    comprasNetas: { unidades: comprasUnidades, valor: comprasValor },
    mercanciaDisponible: { unidades: totalDisponibleUnidades, valor: totalDisponibleValor },
    ventas: { unidades: ventasUnidades },
    invFinal: { unidades: invFinalUnidades, valor: invFinalValor },
    costoVentas: costoVentas,
    explicacion: explicacionValuacion
  };
}

/**
 * Ejecuta simultáneamente PEPS, UEPS y Promedio para el análisis comparativo
 */
export function runComparativeAnalysis(operations) {
  const peps = calculatePEPS(operations);
  const ueps = calculateUEPS(operations);
  const promedio = calculatePromedio(operations);

  return {
    peps,
    ueps,
    promedio,
    comparativa: [
      {
        criterio: 'Costo de Ventas Total',
        peps: peps.costoVentasTotal,
        ueps: ueps.costoVentasTotal,
        promedio: promedio.costoVentasTotal,
        formato: 'moneda',
        explicacion: 'Monto que se descuenta de los ingresos en el Estado de Resultados.'
      },
      {
        criterio: 'Valor del Inventario Final',
        peps: peps.inventarioFinalValor,
        ueps: ueps.inventarioFinalValor,
        promedio: promedio.inventarioFinalValor,
        formato: 'moneda',
        explicacion: 'Valor que figura como activo corriente en el Balance General.'
      },
      {
        criterio: 'Unidades en Inventario Final',
        peps: peps.inventarioFinalUnidades,
        ueps: ueps.inventarioFinalUnidades,
        promedio: promedio.inventarioFinalUnidades,
        formato: 'unidades',
        explicacion: 'La cantidad física es idéntica en todos los métodos; solo cambia su valor monetario.'
      },
      {
        criterio: 'Impacto en la Utilidad Bruta',
        peps: 'Mayor utilidad contable',
        ueps: 'Menor utilidad contable',
        promedio: 'Utilidad equilibrada / intermedia',
        formato: 'texto',
        explicacion: 'En periodos inflacionarios (precios al alza).'
      },
      {
        criterio: 'Efecto en Impuestos de Renta',
        peps: 'Mayor pago de impuestos',
        ueps: 'Menor pago de impuestos',
        promedio: 'Efecto moderado',
        formato: 'texto',
        explicacion: 'A mayor utilidad contable, mayor base gravable.'
      },
      {
        criterio: 'Aceptación NIIF (NIC 2)',
        peps: 'Totalmente permitido ✅',
        ueps: 'Prohibido por NIIF ❌',
        promedio: 'Totalmente permitido ✅',
        formato: 'texto',
        explicacion: 'UEPS distorsiona el valor real del inventario en balance.'
      }
    ]
  };
}
