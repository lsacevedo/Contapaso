/**
 * ContaPaso - Controlador Principal de la Aplicación (UI Controller)
 */

import {
  calculatePEPS,
  calculateUEPS,
  calculatePromedio,
  calculatePeriodico,
  runComparativeAnalysis,
  validateOperationsStock,
  formatCurrency,
  formatUnits
} from './kardex-engine.js';

import {
  EJERCICIOS_PREDEFINIDOS,
  obtenerEjercicios,
  guardarEjercicio
} from './firebase-config.js';

// Estado global de la aplicación
export const AppState = {
  system: 'permanente',      // 'permanente' | 'periodico'
  method: 'peps',            // 'peps' | 'ueps' | 'promedio'
  isInflation: true,
  currentStep: 1,
  operations: [
    // Se inicia por defecto con el caso oficial del PRD
    { id: 1, tipo: 'inicial', fecha: '01/Nov', detalle: 'Inventario Inicial', cantidad: 100, costoUnitario: 10000 },
    { id: 2, tipo: 'compra', fecha: '03/Nov', detalle: 'Compra Factura #01', cantidad: 50, costoUnitario: 12000 },
    { id: 3, tipo: 'venta', fecha: '05/Nov', detalle: 'Venta Factura #101', cantidad: 80, costoUnitario: 0 },
    { id: 4, tipo: 'compra', fecha: '08/Nov', detalle: 'Compra Factura #02', cantidad: 70, costoUnitario: 14000 },
    { id: 5, tipo: 'venta', fecha: '12/Nov', detalle: 'Venta Factura #102', cantidad: 90, costoUnitario: 0 }
  ]
};

// ==========================================
// NAVEGACIÓN ENTRE PASOS
// ==========================================
export function goToStep(stepNumber) {
  AppState.currentStep = stepNumber;

  // Actualizar visibilidad de secciones
  for (let i = 1; i <= 4; i++) {
    const sec = document.getElementById(`section-step-${i}`);
    if (sec) {
      if (i === stepNumber) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    }

    // Actualizar botones del nav superior
    const navBtn = document.getElementById(`nav-step-${i}`);
    if (navBtn) {
      if (i === stepNumber) {
        navBtn.className = "px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-cyan-300/40 flex items-center gap-1.5";
      } else {
        navBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-cyan-300 hover:bg-surface-container-high/80 transition-colors flex items-center gap-1.5";
      }
    }
  }

  // Desplazar suavemente arriba
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Disparar lógica según el paso
  if (stepNumber === 2) {
    renderOperationsTable();
    checkStockValidation();
  } else if (stepNumber === 3) {
    renderKardexView();
  } else if (stepNumber === 4) {
    renderComparativeView();
  }
}

// ==========================================
// PASO 1: CONFIGURAR TALLER
// ==========================================
export function selectSystem(system) {
  AppState.system = system;
  const cardPerm = document.getElementById('card-permanente');
  const cardPeri = document.getElementById('card-periodico');
  const checkPerm = document.getElementById('check-permanente');
  const checkPeri = document.getElementById('check-periodico');

  if (system === 'permanente') {
    if (cardPerm) cardPerm.className = "group relative rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 glass-panel border-2 border-cyan-400 neon-glow-blue hover:shadow-[0_0_35px_rgba(56,189,248,0.45)]";
    if (cardPeri) cardPeri.className = "group relative rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 glass-panel hover:bg-surface-container-high/80 border-2 border-slate-700/60 hover:border-slate-500 shadow-lg";

    if (checkPerm) {
      checkPerm.className = "w-6 h-6 rounded-full border-2 border-cyan-300 bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center transition-all shadow-[0_0_10px_#38bdf8]";
      checkPerm.innerHTML = '<span class="material-symbols-outlined text-[15px] font-bold">check</span>';
    }
    if (checkPeri) {
      checkPeri.className = "w-6 h-6 rounded-full border-2 border-slate-600 bg-transparent flex items-center justify-center transition-all";
      checkPeri.innerHTML = '<span class="material-symbols-outlined text-[15px] font-bold hidden">check</span>';
    }
  } else {
    if (cardPeri) cardPeri.className = "group relative rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 glass-panel border-2 border-emerald-400 neon-glow-emerald hover:shadow-[0_0_35px_rgba(52,211,153,0.45)]";
    if (cardPerm) cardPerm.className = "group relative rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 glass-panel hover:bg-surface-container-high/80 border-2 border-slate-700/60 hover:border-slate-500 shadow-lg";

    if (checkPeri) {
      checkPeri.className = "w-6 h-6 rounded-full border-2 border-emerald-300 bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center transition-all shadow-[0_0_10px_#34d399]";
      checkPeri.innerHTML = '<span class="material-symbols-outlined text-[15px] font-bold">check</span>';
    }
    if (checkPerm) {
      checkPerm.className = "w-6 h-6 rounded-full border-2 border-slate-600 bg-transparent flex items-center justify-center transition-all";
      checkPerm.innerHTML = '<span class="material-symbols-outlined text-[15px] font-bold hidden">check</span>';
    }
  }

  updateSummaryStep1();
}

export function selectMethod(method) {
  AppState.method = method;
  const methods = ['peps', 'ueps', 'promedio'];

  methods.forEach(m => {
    const card = document.getElementById(`btn-method-${m}`);
    if (!card) return;
    const check = card.querySelector('.check-icon');

    if (m === method) {
      if (m === 'peps') {
        card.className = "cursor-pointer rounded-2xl p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 text-white border-2 border-cyan-300 neon-glow-blue transition-all duration-200 transform scale-[1.015]";
      } else if (m === 'ueps') {
        card.className = "cursor-pointer rounded-2xl p-4 bg-gradient-to-br from-purple-700 via-indigo-700 to-fuchsia-600 text-white border-2 border-purple-300 shadow-[0_0_25px_rgba(167,139,250,0.4)] transition-all duration-200 transform scale-[1.015]";
      } else {
        card.className = "cursor-pointer rounded-2xl p-4 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white border-2 border-emerald-300 neon-glow-emerald transition-all duration-200 transform scale-[1.015]";
      }
      if (check) {
        check.className = "w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold check-icon shadow opacity-100";
        check.innerText = "✓";
      }
    } else {
      card.className = "cursor-pointer rounded-2xl p-4 bg-surface-container/90 hover:bg-surface-container-high text-on-surface-variant border-2 border-slate-700/60 hover:border-slate-500 transition-all duration-200";
      if (check) {
        check.className = "w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-xs check-icon opacity-0";
      }
    }
  });

  updateSummaryStep1();
}

export function updateSummaryStep1() {
  const sysEl = document.getElementById('summary-system-text');
  const methEl = document.getElementById('summary-method-text');
  const colEl = document.getElementById('summary-columns-text');

  if (sysEl) {
    if (AppState.system === 'permanente') {
      sysEl.innerHTML = '<span class="material-symbols-outlined text-[15px] text-cyan-300">table_chart_view</span> Kardex Permanente';
      if (colEl) colEl.innerText = "Entradas • Salidas • Existencias";
    } else {
      sysEl.innerHTML = '<span class="material-symbols-outlined text-[15px] text-emerald-300">inventory_2</span> Inventario Periódico';
      if (colEl) colEl.innerText = "Inv. Inicial • Compras • Físico Final";
    }
  }

  if (methEl) {
    const methodNames = {
      peps: 'PEPS (Primeras en salir)',
      ueps: 'UEPS (Últimas en salir)',
      promedio: 'Promedio Ponderado'
    };
    methEl.innerHTML = `<span class="material-symbols-outlined text-[15px] text-emerald-300">check_circle</span> ${methodNames[AppState.method]}`;
  }
}

// ==========================================
// PASO 2: OPERACIONES (REGISTRO Y VALIDACIÓN)
// ==========================================
export function renderOperationsTable() {
  const tbody = document.getElementById('operations-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  AppState.operations.forEach((op, index) => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 hover:bg-surface-container-high/40 transition-colors text-xs font-mono";

    const badgeClass = op.tipo === 'inicial'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : op.tipo === 'compra'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

    const tipoLabel = op.tipo === 'inicial' ? 'Inicial' : op.tipo === 'compra' ? 'Compra' : 'Venta';

    const subtotal = op.tipo !== 'venta' ? (op.cantidad * op.costoUnitario) : '-';

    tr.innerHTML = `
      <td class="p-3 text-center text-slate-400 font-bold">${index + 1}</td>
      <td class="p-3">
        <select onchange="updateOpType(${index}, this.value)" class="bg-surface-container-lowest border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none">
          <option value="inicial" ${op.tipo === 'inicial' ? 'selected' : ''}>Inv. Inicial</option>
          <option value="compra" ${op.tipo === 'compra' ? 'selected' : ''}>Compra</option>
          <option value="venta" ${op.tipo === 'venta' ? 'selected' : ''}>Venta</option>
        </select>
      </td>
      <td class="p-3">
        <input type="text" value="${op.fecha || ''}" onchange="updateOpField(${index}, 'fecha', this.value)" class="w-20 bg-surface-container-lowest border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none" placeholder="01/Nov">
      </td>
      <td class="p-3">
        <input type="text" value="${op.detalle || ''}" onchange="updateOpField(${index}, 'detalle', this.value)" class="w-full min-w-[140px] bg-surface-container-lowest border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none" placeholder="Detalle...">
      </td>
      <td class="p-3 text-right">
        <input type="number" min="1" value="${op.cantidad || ''}" oninput="updateOpField(${index}, 'cantidad', this.value)" class="w-24 text-right bg-surface-container-lowest border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-300 font-bold focus:border-cyan-400 focus:outline-none">
      </td>
      <td class="p-3 text-right">
        ${op.tipo !== 'venta' ? `
          <input type="number" min="0" step="100" value="${op.costoUnitario || ''}" oninput="updateOpField(${index}, 'costoUnitario', this.value)" class="w-28 text-right bg-surface-container-lowest border border-slate-700 rounded-lg px-2 py-1 text-xs text-emerald-300 font-bold focus:border-cyan-400 focus:outline-none">
        ` : `
          <span class="text-slate-500 italic text-[11px]">(Se calcula en Kardex)</span>
        `}
      </td>
      <td class="p-3 text-right font-bold text-white">
        ${typeof subtotal === 'number' ? formatCurrency(subtotal) : '<span class="text-slate-500">--</span>'}
      </td>
      <td class="p-3 text-center">
        <button onclick="removeOperation(${index})" class="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors" title="Eliminar fila">
          <span class="material-symbols-outlined text-[17px]">delete</span>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  updateOperationsSummaryBar();
}

export function updateOpType(index, newType) {
  AppState.operations[index].tipo = newType;
  if (newType === 'venta') {
    AppState.operations[index].costoUnitario = 0;
  } else if (!AppState.operations[index].costoUnitario) {
    AppState.operations[index].costoUnitario = 10000;
  }
  renderOperationsTable();
  checkStockValidation();
}

export function updateOpField(index, field, value) {
  if (field === 'cantidad' || field === 'costoUnitario') {
    AppState.operations[index][field] = Number(value) || 0;
  } else {
    AppState.operations[index][field] = value;
  }
  updateOperationsSummaryBar();
  checkStockValidation();
}

export function addOperation(tipo) {
  const nextId = AppState.operations.length + 1;
  const isVenta = tipo === 'venta';
  AppState.operations.push({
    id: nextId,
    tipo: tipo,
    fecha: `Día ${nextId}`,
    detalle: isVenta ? `Venta #${nextId}` : `Compra #${nextId}`,
    cantidad: 50,
    costoUnitario: isVenta ? 0 : 12000
  });

  renderOperationsTable();
  checkStockValidation();
}

export function removeOperation(index) {
  if (AppState.operations.length <= 1) {
    alert("El ejercicio debe tener al menos una operación.");
    return;
  }
  AppState.operations.splice(index, 1);
  renderOperationsTable();
  checkStockValidation();
}

export function clearOperations() {
  if (confirm("¿Estás segura de vaciar la tabla de operaciones?")) {
    AppState.operations = [
      { id: 1, tipo: 'inicial', fecha: '01/Nov', detalle: 'Inventario Inicial', cantidad: 100, costoUnitario: 10000 }
    ];
    renderOperationsTable();
    checkStockValidation();
  }
}

export function loadPRDExample() {
  AppState.operations = [
    { id: 1, tipo: 'inicial', fecha: '01/Nov', detalle: 'Inventario Inicial', cantidad: 100, costoUnitario: 10000 },
    { id: 2, tipo: 'compra', fecha: '03/Nov', detalle: 'Compra Factura #01', cantidad: 50, costoUnitario: 12000 },
    { id: 3, tipo: 'venta', fecha: '05/Nov', detalle: 'Venta Factura #101', cantidad: 80, costoUnitario: 0 },
    { id: 4, tipo: 'compra', fecha: '08/Nov', detalle: 'Compra Factura #02', cantidad: 70, costoUnitario: 14000 },
    { id: 5, tipo: 'venta', fecha: '12/Nov', detalle: 'Venta Factura #102', cantidad: 90, costoUnitario: 0 }
  ];
  renderOperationsTable();
  checkStockValidation();
}

export function checkStockValidation() {
  const validation = validateOperationsStock(AppState.operations);
  const alertBox = document.getElementById('stock-warning-banner');
  const alertText = document.getElementById('stock-warning-text');
  const btnCalculate = document.getElementById('btn-continue-to-kardex');

  if (!validation.isValid) {
    if (alertBox && alertText) {
      alertBox.classList.remove('hidden');
      alertText.innerText = validation.errors[0].mensaje;
    }
    if (btnCalculate) {
      btnCalculate.disabled = true;
      btnCalculate.classList.add('opacity-50', 'cursor-not-allowed');
    }
  } else {
    if (alertBox) alertBox.classList.add('hidden');
    if (btnCalculate) {
      btnCalculate.disabled = false;
      btnCalculate.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
  return validation.isValid;
}

function updateOperationsSummaryBar() {
  let entradas = 0;
  let salidas = 0;
  let valorEntradas = 0;

  AppState.operations.forEach(op => {
    const q = Number(op.cantidad) || 0;
    const c = Number(op.costoUnitario) || 0;
    if (op.tipo === 'inicial' || op.tipo === 'compra') {
      entradas += q;
      valorEntradas += q * c;
    } else if (op.tipo === 'venta') {
      salidas += q;
    }
  });

  const saldo = Math.max(0, entradas - salidas);

  const elEntradas = document.getElementById('ops-total-entradas');
  const elSalidas = document.getElementById('ops-total-salidas');
  const elSaldo = document.getElementById('ops-total-saldo');
  const elValor = document.getElementById('ops-total-valor-compras');

  if (elEntradas) elEntradas.innerText = formatUnits(entradas);
  if (elSalidas) elSalidas.innerText = formatUnits(salidas);
  if (elSaldo) elSaldo.innerText = formatUnits(saldo);
  if (elValor) elValor.innerText = formatCurrency(valorEntradas);
}

// ==========================================
// PASO 3: KARDEX PASO A PASO
// ==========================================
export function renderKardexView() {
  const isPeriodico = AppState.system === 'periodico';
  const secPermanente = document.getElementById('kardex-permanente-container');
  const secPeriodico = document.getElementById('kardex-periodico-container');

  // Actualizar selectores rápidos de método
  ['peps', 'ueps', 'promedio'].forEach(m => {
    const btn = document.getElementById(`kardex-tab-${m}`);
    if (btn) {
      if (m === AppState.method) {
        btn.className = "px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30";
      } else {
        btn.className = "px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors";
      }
    }
  });

  if (isPeriodico) {
    if (secPermanente) secPermanente.classList.add('hidden');
    if (secPeriodico) secPeriodico.classList.remove('hidden');
    renderPeriodicoDetails();
  } else {
    if (secPeriodico) secPeriodico.classList.add('hidden');
    if (secPermanente) secPermanente.classList.remove('hidden');
    renderPermanenteDetails();
  }
}

function renderPermanenteDetails() {
  let result;
  if (AppState.method === 'peps') {
    result = calculatePEPS(AppState.operations);
  } else if (AppState.method === 'ueps') {
    result = calculateUEPS(AppState.operations);
  } else {
    result = calculatePromedio(AppState.operations);
  }

  // Actualizar métricas KPI
  const elCV = document.getElementById('kpi-costo-ventas');
  const elIF = document.getElementById('kpi-inventario-final');
  const elUnids = document.getElementById('kpi-unidades-finales');
  const elCuadre = document.getElementById('kpi-mercancia-disponible');

  if (elCV) elCV.innerText = formatCurrency(result.costoVentasTotal);
  if (elIF) elIF.innerText = formatCurrency(result.inventarioFinalValor);
  if (elUnids) elUnids.innerText = formatUnits(result.inventarioFinalUnidades) + ' u';
  if (elCuadre) elCuadre.innerText = formatCurrency(result.costoVentasTotal + result.inventarioFinalValor);

  // Renderizar filas de la tabla de Kardex
  const tbody = document.getElementById('kardex-tbody');
  if (tbody) {
    tbody.innerHTML = '';

    result.kardex.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = "border-b border-slate-800/80 hover:bg-surface-container-high/40 transition-colors font-mono text-[12px]";

      const esEntrada = row.tipo === 'inicial' || row.tipo === 'compra';

      tr.innerHTML = `
        <td class="p-3 text-center text-slate-400 font-bold">${row.fecha}</td>
        <td class="p-3 font-sans font-semibold text-white">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${esEntrada ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
            ${row.detalle}
          </div>
        </td>
        <!-- ENTRADAS -->
        <td class="p-3 text-right ${row.entrada.cantidad > 0 ? 'text-emerald-300 font-bold' : 'text-slate-600'}">
          ${row.entrada.cantidad > 0 ? formatUnits(row.entrada.cantidad) : '-'}
        </td>
        <td class="p-3 text-right text-slate-300">
          ${row.entrada.costoUnitario > 0 ? formatCurrency(row.entrada.costoUnitario) : '-'}
        </td>
        <td class="p-3 text-right text-emerald-300 font-bold">
          ${row.entrada.total > 0 ? formatCurrency(row.entrada.total) : '-'}
        </td>
        <!-- SALIDAS -->
        <td class="p-3 text-right ${row.salida.cantidad > 0 ? 'text-rose-300 font-bold' : 'text-slate-600'}">
          ${row.salida.cantidad > 0 ? formatUnits(row.salida.cantidad) : '-'}
        </td>
        <td class="p-3 text-right text-slate-300">
          ${row.salida.costoUnitario > 0 ? formatCurrency(row.salida.costoUnitario) : '-'}
        </td>
        <td class="p-3 text-right text-rose-300 font-bold">
          ${row.salida.total > 0 ? formatCurrency(row.salida.total) : '-'}
        </td>
        <!-- SALDOS -->
        <td class="p-3 text-right font-extrabold text-cyan-300 bg-cyan-950/20">
          ${formatUnits(row.saldo.cantidad)}
        </td>
        <td class="p-3 text-right font-bold text-white bg-cyan-950/20">
          ${formatCurrency(row.saldo.total)}
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  // Renderizar las explicaciones didácticas de cada venta
  const stepsContainer = document.getElementById('pedagogical-steps-container');
  if (stepsContainer) {
    stepsContainer.innerHTML = '';

    const ventas = result.kardex.filter(r => r.tipo === 'venta');

    if (ventas.length === 0) {
      stepsContainer.innerHTML = `
        <div class="p-4 rounded-xl bg-surface-container-low text-center text-xs text-slate-400">
          Aún no has registrado ventas. Agrega una venta en el Paso 2 para ver de qué lote se descargan las unidades.
        </div>
      `;
    } else {
      ventas.forEach((v, idx) => {
        const card = document.createElement('div');
        card.className = "rounded-xl p-4 bg-surface-container-low/90 border border-slate-700/80 shadow-md flex flex-col gap-3";

        let desgloseHTML = '';

        if (AppState.method === 'promedio') {
          desgloseHTML = `
            <div class="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span class="text-emerald-300 font-bold">Explicación del Promedio Móvil:</span>
              <p class="text-slate-300 mt-1">${v.formulaExplicada}</p>
            </div>
          `;
        } else {
          // PEPS o UEPS (Muestra desglose lote por lote)
          desgloseHTML = `
            <div class="flex flex-col gap-2">
              <span class="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Desglose lote por lote (${AppState.method.toUpperCase()}):
              </span>
              <div class="space-y-1.5 font-mono text-xs">
                ${v.desgloseSalida.map(item => `
                  <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span class="text-slate-300">📦 ${item.lote}:</span>
                    <span class="text-cyan-200 font-semibold">${item.cantidad} unids × ${formatCurrency(item.costoUnitario)}</span>
                    <span class="text-emerald-300 font-bold">= ${formatCurrency(item.subtotal)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        // Saldo posterior a la venta
        let saldoCapasHTML = '';
        if (AppState.method !== 'promedio' && v.saldo.capas) {
          saldoCapasHTML = `
            <div class="pt-2 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span class="text-slate-400">Bodega tras esta venta:</span>
              <div class="flex items-center gap-2 font-mono">
                ${v.saldo.capas.map(c => `<span class="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[11px]">${c.cantidad} u @ ${formatCurrency(c.costoUnitario)}</span>`).join(' + ')}
              </div>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center justify-center font-mono">${idx + 1}</span>
              <span class="font-bold text-sm text-white">${v.detalle} (${v.fecha})</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400">Costo asignado:</span>
              <span class="ml-1.5 font-bold text-rose-300 text-sm font-mono">${formatCurrency(v.salida.total)}</span>
            </div>
          </div>
          ${desgloseHTML}
          ${saldoCapasHTML}
        `;

        stepsContainer.appendChild(card);
      });
    }
  }
}

function renderPeriodicoDetails() {
  const result = calculatePeriodico(AppState.operations, AppState.method);

  // Llenar tabla del juego de inventarios
  const elII = document.getElementById('periodico-ii');
  const elCompras = document.getElementById('periodico-compras');
  const elDisp = document.getElementById('periodico-disponible');
  const elIF = document.getElementById('periodico-if');
  const elCV = document.getElementById('periodico-cv');
  const elExplicacion = document.getElementById('periodico-explicacion');

  if (elII) elII.innerText = `${formatCurrency(result.invInicial.valor)} (${result.invInicial.unidades} u)`;
  if (elCompras) elCompras.innerText = `${formatCurrency(result.comprasNetas.valor)} (${result.comprasNetas.unidades} u)`;
  if (elDisp) elDisp.innerText = `${formatCurrency(result.mercanciaDisponible.valor)} (${result.mercanciaDisponible.unidades} u)`;
  if (elIF) elIF.innerText = `${formatCurrency(result.invFinal.valor)} (${result.invFinal.unidades} u)`;
  if (elCV) elCV.innerText = formatCurrency(result.costoVentas);
  if (elExplicacion) elExplicacion.innerText = result.explicacion;

  // Actualizar KPIs superiores
  const elKpiCV = document.getElementById('kpi-costo-ventas');
  const elKpiIF = document.getElementById('kpi-inventario-final');
  const elKpiUnids = document.getElementById('kpi-unidades-finales');
  const elKpiCuadre = document.getElementById('kpi-mercancia-disponible');

  if (elKpiCV) elKpiCV.innerText = formatCurrency(result.costoVentas);
  if (elKpiIF) elKpiIF.innerText = formatCurrency(result.invFinal.valor);
  if (elKpiUnids) elKpiUnids.innerText = formatUnits(result.invFinal.unidades) + ' u';
  if (elKpiCuadre) elKpiCuadre.innerText = formatCurrency(result.mercanciaDisponible.valor);
}

export function switchKardexMethod(newMethod) {
  AppState.method = newMethod;
  renderKardexView();
}

// ==========================================
// PASO 4: ANÁLISIS COMPARATIVO LADO A LADO
// ==========================================
export function renderComparativeView() {
  const analysis = runComparativeAnalysis(AppState.operations);
  const tbody = document.getElementById('comparative-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  analysis.comparativa.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-800 hover:bg-surface-container-high/40 transition-colors text-xs";

    let valPEPS = item.peps;
    let valUEPS = item.ueps;
    let valProm = item.promedio;

    if (item.formato === 'moneda') {
      valPEPS = `<span class="font-bold text-white font-mono">${formatCurrency(item.peps)}</span>`;
      valUEPS = `<span class="font-bold text-white font-mono">${formatCurrency(item.ueps)}</span>`;
      valProm = `<span class="font-bold text-white font-mono">${formatCurrency(item.promedio)}</span>`;

      // Resaltar máximos y mínimos didácticamente
      if (item.criterio.includes('Costo de Ventas')) {
        valPEPS += ' <span class="text-[10px] text-emerald-400 font-bold block">(Menor Costo)</span>';
        valUEPS += ' <span class="text-[10px] text-amber-400 font-bold block">(Mayor Costo)</span>';
      } else if (item.criterio.includes('Inventario Final')) {
        valPEPS += ' <span class="text-[10px] text-cyan-400 font-bold block">(Mayor Valor)</span>';
        valUEPS += ' <span class="text-[10px] text-purple-400 font-bold block">(Menor Valor)</span>';
      }
    } else if (item.formato === 'unidades') {
      valPEPS = `<span class="font-mono text-cyan-300 font-bold">${formatUnits(item.peps)} unids</span>`;
      valUEPS = `<span class="font-mono text-cyan-300 font-bold">${formatUnits(item.ueps)} unids</span>`;
      valProm = `<span class="font-mono text-cyan-300 font-bold">${formatUnits(item.promedio)} unids</span>`;
    }

    tr.innerHTML = `
      <td class="p-4 font-semibold text-white">
        <div class="font-bold">${item.criterio}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">${item.explicacion}</div>
      </td>
      <td class="p-4 text-center bg-blue-950/20 border-x border-slate-800">${valPEPS}</td>
      <td class="p-4 text-center bg-purple-950/20 border-r border-slate-800">${valUEPS}</td>
      <td class="p-4 text-center bg-emerald-950/20">${valProm}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ==========================================
// BANCO DE EJERCICIOS Y GEMINI
// ==========================================
export function openExerciseBankModal() {
  const modal = document.getElementById('exercise-bank-modal');
  if (modal) modal.classList.remove('hidden');
  renderExerciseBankList();
}

export function closeExerciseBankModal() {
  const modal = document.getElementById('exercise-bank-modal');
  if (modal) modal.classList.add('hidden');
}

export function renderExerciseBankList() {
  const container = document.getElementById('exercise-bank-list');
  if (!container) return;

  const exercises = obtenerEjercicios();
  container.innerHTML = '';

  exercises.forEach((ex) => {
    const card = document.createElement('div');
    card.className = "p-4 rounded-xl bg-surface-container-low border border-slate-700/80 hover:border-cyan-400/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3";

    card.innerHTML = `
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-white">${ex.titulo}</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold uppercase">${ex.metodoSugerido || 'KARDEX'}</span>
        </div>
        <p class="text-xs text-slate-300">${ex.descripcion}</p>
        <span class="text-[11px] text-slate-400">${ex.operaciones.length} operaciones registradas</span>
      </div>
      <button onclick="loadExerciseFromBank('${ex.id}')" class="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shrink-0 shadow-md active:scale-95 transition-all">
        Cargar Taller
      </button>
    `;

    container.appendChild(card);
  });
}

export function loadExerciseFromBank(exerciseId) {
  const exercises = obtenerEjercicios();
  const selected = exercises.find(e => e.id === exerciseId);
  if (!selected) return;

  AppState.operations = JSON.parse(JSON.stringify(selected.operaciones));
  if (selected.metodoSugerido) AppState.method = selected.metodoSugerido;
  if (selected.sistema) AppState.system = selected.sistema;

  closeExerciseBankModal();
  selectSystem(AppState.system);
  selectMethod(AppState.method);
  goToStep(2);
}

// Exponer controladores en el objeto global window para botones HTML onclick
window.goToStep = goToStep;
window.selectSystem = selectSystem;
window.selectMethod = selectMethod;
window.updateOpType = updateOpType;
window.updateOpField = updateOpField;
window.addOperation = addOperation;
window.removeOperation = removeOperation;
window.clearOperations = clearOperations;
window.loadPRDExample = loadPRDExample;
window.switchKardexMethod = switchKardexMethod;
window.openExerciseBankModal = openExerciseBankModal;
window.closeExerciseBankModal = closeExerciseBankModal;
window.loadExerciseFromBank = loadExerciseFromBank;

// Inicialización al cargar la ventana
window.addEventListener('DOMContentLoaded', () => {
  selectSystem(AppState.system);
  selectMethod(AppState.method);
});
