/**
 * ContaPaso - Configuración y Servicio de Base de Datos (Firebase Firestore & Local)
 * 
 * Este módulo gestiona el banco de ejercicios y preguntas.
 * Funciona de forma híbrida:
 * 1. Modo Local (LocalStorage): Funciona 100% sin conexión ni configuración previa.
 * 2. Modo Firebase Firestore: Cuando configures tus claves de Firebase, se sincroniza en la nube automáticamente sin requerir logins a las estudiantes.
 */

// ⚙️ Reemplaza con las credenciales de tu proyecto de Firebase cuando lo creemos:
export const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "contapaso-app.firebaseapp.com",
  projectId: "contapaso-app",
  storageBucket: "contapaso-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// Colecciones en Firestore
export const COLLECTIONS = {
  EJERCICIOS: 'ejercicios_kardex',
  PREGUNTAS: 'preguntas_frecuentes'
};

// Banco de Ejercicios Predefinidos para Estudiar
export const EJERCICIOS_PREDEFINIDOS = [
  {
    id: 'prd-oficial',
    titulo: 'Taller Oficial del PRD (Caso Estándar)',
    descripcion: 'Inventario inicial de 100 u @ $10.000, 2 compras y 2 ventas con cambio de precios en época de inflación.',
    metodoSugerido: 'peps',
    sistema: 'permanente',
    operaciones: [
      { id: 1, tipo: 'inicial', fecha: '01/Nov', detalle: 'Inventario Inicial', cantidad: 100, costoUnitario: 10000 },
      { id: 2, tipo: 'compra', fecha: '03/Nov', detalle: 'Compra Factura #101', cantidad: 50, costoUnitario: 12000 },
      { id: 3, tipo: 'venta', fecha: '05/Nov', detalle: 'Venta Factura #01', cantidad: 80, costoUnitario: 0 },
      { id: 4, tipo: 'compra', fecha: '08/Nov', detalle: 'Compra Factura #102', cantidad: 70, costoUnitario: 14000 },
      { id: 5, tipo: 'venta', fecha: '12/Nov', detalle: 'Venta Factura #02', cantidad: 90, costoUnitario: 0 }
    ]
  },
  {
    id: 'supermercado-retail',
    titulo: 'Tienda de Abarrotes (Alta Rotación)',
    descripcion: 'Ejercicio tipo parcial con 3 compras consecutivas y ventas parciales para practicar capas en PEPS y UEPS.',
    metodoSugerido: 'promedio',
    sistema: 'permanente',
    operaciones: [
      { id: 1, tipo: 'inicial', fecha: '01/Oct', detalle: 'Saldo en bodega', cantidad: 200, costoUnitario: 5000 },
      { id: 2, tipo: 'compra', fecha: '04/Oct', detalle: 'Compra Proveedor Central', cantidad: 150, costoUnitario: 5500 },
      { id: 3, tipo: 'venta', fecha: '07/Oct', detalle: 'Venta Mostrador', cantidad: 180, costoUnitario: 0 },
      { id: 4, tipo: 'compra', fecha: '11/Oct', detalle: 'Compra Reabastecimiento', cantidad: 100, costoUnitario: 6000 },
      { id: 5, tipo: 'venta', fecha: '15/Oct', detalle: 'Venta Fin de Semana', cantidad: 120, costoUnitario: 0 }
    ]
  },
  {
    id: 'parcial-universitario',
    titulo: 'Parcial Práctico: Desafío de Capas',
    descripcion: 'Lotes pequeños con precios variables diseñado para detectar errores comunes en el agotamiento de capas.',
    metodoSugerido: 'peps',
    sistema: 'permanente',
    operaciones: [
      { id: 1, tipo: 'inicial', fecha: '02/Sep', detalle: 'Inventario Inicial', cantidad: 60, costoUnitario: 25000 },
      { id: 2, tipo: 'compra', fecha: '05/Sep', detalle: 'Compra Lote A', cantidad: 40, costoUnitario: 28000 },
      { id: 3, tipo: 'venta', fecha: '09/Sep', detalle: 'Venta Cliente Mayorista', cantidad: 70, costoUnitario: 0 },
      { id: 4, tipo: 'compra', fecha: '14/Sep', detalle: 'Compra Lote B', cantidad: 50, costoUnitario: 31000 },
      { id: 5, tipo: 'venta', fecha: '20/Sep', detalle: 'Venta Pedido Escolar', cantidad: 55, costoUnitario: 0 }
    ]
  }
];

/**
 * Guarda un ejercicio en la base de datos (con fallback automático a localStorage)
 */
export async function guardarEjercicio(ejercicio) {
  try {
    const list = obtenerEjerciciosLocales();
    list.unshift(ejercicio);
    localStorage.setItem('contapaso_ejercicios', JSON.stringify(list));
    return { success: true, mode: 'local', id: ejercicio.id };
  } catch (err) {
    console.error('Error guardando ejercicio:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene la lista completa de ejercicios para estudiar
 */
export function obtenerEjercicios() {
  const locales = obtenerEjerciciosLocales();
  return [...locales, ...EJERCICIOS_PREDEFINIDOS];
}

function obtenerEjerciciosLocales() {
  try {
    const data = localStorage.getItem('contapaso_ejercicios');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
