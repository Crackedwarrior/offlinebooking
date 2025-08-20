# PowerShell script to fix EPSON TM-T81 printer configuration

Write-Host "🔧 Fixing EPSON TM-T81 Printer Configuration..." -ForegroundColor Green

# Step 1: Check if the correct driver exists
Write-Host "`n📋 Checking available drivers..." -ForegroundColor Yellow
$drivers = Get-PrinterDriver
$tm81Driver = $drivers | Where-Object {$_.Name -like "*TM-T81*" -or $_.Name -like "*EPSON TM-T81*"}

if ($tm81Driver) {
    Write-Host "✅ Found TM-T81 driver: $($tm81Driver.Name)" -ForegroundColor Green
} else {
    Write-Host "❌ TM-T81 driver not found. Available EPSON drivers:" -ForegroundColor Red
    $epsonDrivers = $drivers | Where-Object {$_.Name -like "*EPSON*"}
    foreach ($driver in $epsonDrivers) {
        Write-Host "   - $($driver.Name)" -ForegroundColor Yellow
    }
}

# Step 2: Check available ports
Write-Host "`n🔌 Checking available ports..." -ForegroundColor Yellow
$ports = Get-PrinterPort
$esdPort = $ports | Where-Object {$_.Name -like "*ESDPRT*"}

if ($esdPort) {
    Write-Host "✅ Found EPSON port: $($esdPort.Name)" -ForegroundColor Green
} else {
    Write-Host "❌ ESDPRT port not found. Available ports:" -ForegroundColor Red
    foreach ($port in $ports) {
        Write-Host "   - $($port.Name)" -ForegroundColor Yellow
    }
}

# Step 3: Remove existing incorrect printer if it exists
Write-Host "`n🗑️ Checking for existing printer..." -ForegroundColor Yellow
$existingPrinter = Get-Printer -Name "EPSON TM T81" -ErrorAction SilentlyContinue

if ($existingPrinter) {
    Write-Host "⚠️ Found existing printer with wrong configuration. Removing..." -ForegroundColor Yellow
    Remove-Printer -Name "EPSON TM T81" -ErrorAction SilentlyContinue
    Write-Host "✅ Removed existing printer" -ForegroundColor Green
}

# Step 4: Try to add the printer with correct configuration
Write-Host "`n➕ Adding printer with correct configuration..." -ForegroundColor Yellow

# Try different driver names
$possibleDrivers = @(
    "EPSON TM-T81 ReceiptE4",
    "EPSON TM-T81",
    "EPSON TM-T81 Receipt",
    "EPSON TM-T81 Series"
)

$driverFound = $false
foreach ($driverName in $possibleDrivers) {
    try {
        if ($tm81Driver -and $esdPort) {
            Add-Printer -Name "EPSON TM-T81" -DriverName $tm81Driver.Name -PortName $esdPort.Name -ErrorAction Stop
            Write-Host "✅ Successfully added printer with driver: $($tm81Driver.Name)" -ForegroundColor Green
            $driverFound = $true
            break
        } elseif ($esdPort) {
            # Try with any available EPSON driver
            $epsonDriver = $drivers | Where-Object {$_.Name -like "*EPSON*"} | Select-Object -First 1
            if ($epsonDriver) {
                Add-Printer -Name "EPSON TM-T81" -DriverName $epsonDriver.Name -PortName $esdPort.Name -ErrorAction Stop
                Write-Host "✅ Successfully added printer with driver: $($epsonDriver.Name)" -ForegroundColor Green
                $driverFound = $true
                break
            }
        }
    } catch {
        Write-Host "❌ Failed to add printer with driver: $driverName" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if (-not $driverFound) {
    Write-Host "`n❌ Could not add printer automatically. Manual steps required:" -ForegroundColor Red
    Write-Host "1. Go to Settings → Devices → Printers & scanners" -ForegroundColor Yellow
    Write-Host "2. Click 'Add a printer or scanner'" -ForegroundColor Yellow
    Write-Host "3. Click 'The printer that I want isn't listed'" -ForegroundColor Yellow
    Write-Host "4. Choose 'Add a local printer or network printer with manual settings'" -ForegroundColor Yellow
    Write-Host "5. Select port: ESDPRT001" -ForegroundColor Yellow
    Write-Host "6. Select driver: EPSON TM-T81 ReceiptE4" -ForegroundColor Yellow
}

# Step 5: Verify the printer was added
Write-Host "`n🔍 Verifying printer configuration..." -ForegroundColor Yellow
$newPrinter = Get-Printer -Name "EPSON TM-T81" -ErrorAction SilentlyContinue

if ($newPrinter) {
    Write-Host "✅ Printer found:" -ForegroundColor Green
    Write-Host "   Name: $($newPrinter.Name)" -ForegroundColor White
    Write-Host "   Driver: $($newPrinter.DriverName)" -ForegroundColor White
    Write-Host "   Port: $($newPrinter.PortName)" -ForegroundColor White
    Write-Host "   Status: $($newPrinter.PrinterStatus)" -ForegroundColor White
} else {
    Write-Host "❌ Printer not found after configuration attempt" -ForegroundColor Red
}

Write-Host "`n🏁 Configuration complete!" -ForegroundColor Green
