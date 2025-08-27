# Simple script to add EPSON TM-T81 printer

Write-Host "Adding EPSON TM-T81 printer..." -ForegroundColor Green

# Remove existing printer if it exists
try {
    Remove-Printer -Name "EPSON TM T81" -ErrorAction SilentlyContinue
    Write-Host "Removed existing printer" -ForegroundColor Yellow
} catch {
    Write-Host "No existing printer to remove" -ForegroundColor Yellow
}

# Add new printer with correct driver and port
try {
    Add-Printer -Name "EPSON TM-T81" -DriverName "EPSON TM-T81 ReceiptE4" -PortName "ESDPRT001"
    Write-Host "Successfully added EPSON TM-T81 printer!" -ForegroundColor Green
} catch {
    Write-Host "Failed to add printer: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    try {
        Add-Printer -Name "EPSON TM-T81" -DriverName "EPSON TM-T81 ReceiptE4" -PortName "USB001"
        Write-Host "Successfully added EPSON TM-T81 printer with USB001 port!" -ForegroundColor Green
    } catch {
        Write-Host "Alternative method also failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Check the result
$printer = Get-Printer -Name "EPSON TM-T81" -ErrorAction SilentlyContinue
if ($printer) {
    Write-Host "Printer configuration:" -ForegroundColor Green
    Write-Host "  Name: $($printer.Name)" -ForegroundColor White
    Write-Host "  Driver: $($printer.DriverName)" -ForegroundColor White
    Write-Host "  Port: $($printer.PortName)" -ForegroundColor White
    Write-Host "  Status: $($printer.PrinterStatus)" -ForegroundColor White
} else {
    Write-Host "Printer not found after configuration" -ForegroundColor Red
}
