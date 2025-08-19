# 🖨️ Thermal Printer Encoding Fix

## Problem Description

The thermal printer was outputting corrupted text with question marks (`?`) instead of readable characters. This was caused by encoding issues when sending ESC/POS commands to the printer.

**Before (Corrupted Output):**
```
?@?a??!2SREELEKHA THE
?????????????????????
||
============
18/08/2025 | 9:30 PM | ID:
============
a THANK YOU FOR CHO
============
a SREELEKHA THEATER
```

**After (Clean Output):**
```
==========================================
            SREELEKHA THEATER
               Chickmagalur
==========================================

Date : 06/08/2025
Film : Mahavatar Narsim
Class: STAR
Time : 02:45 PM
==========================================

             ** SEAT INFO **
==========================================
Row: A - Seat: [18]
==========================================

             ** FINANCIAL **
==========================================
NET  : Rs.125.12
CGST : Rs.11.44
SGST : Rs.11.44
MC   : Rs.2.00
==========================================

               ** TOTAL **
==========================================
TOTAL: Rs.150.00
==========================================

06/08/2025 / 02:45 PM
ID: 060812CSH 00290001/001
==========================================

                THANK YOU!
==========================================
            SREELEKHA THEATER
==========================================
```

## Root Cause

The issue was caused by:

1. **Encoding Mismatch**: ESC/POS commands were being sent as binary data, but the printer expected UTF-8 encoded text
2. **Complex ESC/POS Commands**: The printer was receiving complex formatting commands that it couldn't interpret properly
3. **Character Set Issues**: The printer's character set wasn't properly configured for the incoming data

## Solution Implemented

### 1. Frontend Changes (`frontend/src/services/printerService.ts`)

- **Switched to Plain Text**: Instead of sending ESC/POS commands, the system now generates clean plain text
- **Simplified Format**: Reduced complexity and removed problematic formatting commands
- **Better Compatibility**: Plain text works reliably across different printer models

```typescript
// Before: Complex ESC/POS commands
const escPosCommands = this.generateEscPosTicket(ticket);

// After: Simple plain text
const plainTextTicket = this.generatePlainTextTicket(ticket);
```

### 2. Backend Changes (`backend/src/escposPrintService.ts`)

- **UTF-8 Encoding**: Added proper UTF-8 encoding with BOM for Windows compatibility
- **Text Conversion**: Added function to convert ESC/POS commands to plain text
- **Better File Handling**: Improved file writing with proper encoding

```typescript
// Write as UTF-8 with BOM for better Windows compatibility
const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
const dataBuffer = Buffer.concat([bom, Buffer.from(plainTextData, 'utf8')]);
fs.writeFileSync(filePath, dataBuffer);
```

### 3. Server Changes (`backend/src/server.ts`)

- **Flexible Data Handling**: Updated to handle both `commands` and `text` fields
- **UTF-8 Buffer**: Changed from binary to UTF-8 encoding for text data
- **Better Error Handling**: Improved error messages and logging

```typescript
// Extract the text data from the ticket (could be commands or plain text)
const ticketText = ticket.commands || ticket.text || ticket;
```

## Files Modified

1. **`frontend/src/services/printerService.ts`**
   - Updated `generatePlainTextTicket()` method
   - Modified `printTicket()` to use plain text
   - Updated data sending format

2. **`backend/src/escposPrintService.ts`**
   - Added `convertEscposToPlainText()` method
   - Updated `printViaDirectFile()` with UTF-8 encoding
   - Improved error handling

3. **`backend/src/server.ts`**
   - Updated printer endpoints to handle plain text
   - Modified buffer encoding from binary to UTF-8
   - Improved data extraction logic

## Testing

### Test Script
Created `test-printing-fix.js` to generate sample tickets:

```bash
node test-printing-fix.js
```

### Direct Testing
Test printing directly with PowerShell:

```powershell
powershell -Command "Get-Content 'test_ticket_fixed.txt' | Out-Printer -Name 'EPSON TM-T81 ReceiptE4'"
```

## Benefits

1. **Reliability**: Plain text printing is much more reliable than ESC/POS commands
2. **Compatibility**: Works with a wider range of thermal printers
3. **Maintainability**: Simpler code that's easier to debug and modify
4. **Performance**: Faster printing without complex command processing
5. **Readability**: Clean, readable output that matches the expected format

## Future Improvements

1. **Printer Detection**: Automatically detect printer capabilities
2. **Format Options**: Add different ticket formats for different use cases
3. **Error Recovery**: Better error handling for printer connection issues
4. **Print Preview**: Add preview functionality before printing

## Troubleshooting

If you still see encoding issues:

1. **Check Printer Settings**: Ensure printer is set to UTF-8 or ASCII mode
2. **Verify Printer Name**: Make sure the correct printer name is configured
3. **Test with Simple Text**: Try printing a simple text file first
4. **Check Windows Encoding**: Ensure Windows is set to UTF-8

## Commands to Test

```bash
# Generate test ticket
node test-printing-fix.js

# Print test ticket
powershell -Command "Get-Content 'test_ticket_fixed.txt' | Out-Printer -Name 'EPSON TM-T81 ReceiptE4'"

# Check printer status
powershell -Command "Get-Printer | Where-Object {$_.Name -like '*EPSON*'}"
```
