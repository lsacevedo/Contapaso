# ContaPaso - Test Matemático en PowerShell

Write-Host "=== TEST MATEMATICO CASO OFICIAL DEL PRD ===" -ForegroundColor Cyan

# 1. Operaciones
# Op 1: Inv Inicial: 100 @ 10.000 ($1.000.000)
# Op 2: Compra 1: 50 @ 12.000 ($600.000)
# Op 3: Venta 1: 80 u
# Op 4: Compra 2: 70 @ 14.000 ($980.000)
# Op 5: Venta 2: 90 u

# Calculo PEPS manual paso a paso:
# Venta 1: 80 u salen del lote 1 (100 @ 10k) => Costo = 80 * 10000 = 800.000. Saldo: [20 @ 10k, 50 @ 12k]
# Compra 2: entran 70 @ 14k => Saldo: [20 @ 10k, 50 @ 12k, 70 @ 14k]
# Venta 2: 90 u => 20 @ 10k (200k) + 50 @ 12k (600k) + 20 @ 14k (280k) => Costo = 1.080.000
# Total Costo de Ventas PEPS = 800.000 + 1.080.000 = 1.880.000
# Inventario Final restante = 50 @ 14k = 700.000

$costoVentasPEPS = 800000 + 1080000
$invFinalPEPS = 50 * 14000
$disponible = (100 * 10000) + (50 * 12000) + (70 * 14000) # 2.580.000

Write-Host "PEPS Costo Ventas: $costoVentasPEPS (Esperado: 1880000)"
Write-Host "PEPS Inv Final: $invFinalPEPS (Esperado: 700000)"
Write-Host "Cuadre: $($costoVentasPEPS + $invFinalPEPS) == $disponible"

if ($costoVentasPEPS -eq 1880000 -and $invFinalPEPS -eq 700000 -and ($costoVentasPEPS + $invFinalPEPS) -eq $disponible) {
    Write-Host ">>> TEST MATEMATICO PASO EXITOSAMENTE! <<<" -ForegroundColor Green
} else {
    Write-Host ">>> FALLO EN TEST MATEMATICO <<<" -ForegroundColor Red
    exit 1
}
