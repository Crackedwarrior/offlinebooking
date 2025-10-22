# wkhtmltopdf Setup Guide

## Installation

### Windows
1. Download wkhtmltopdf from: https://wkhtmltopdf.org/downloads.html
2. Choose the Windows installer (64-bit recommended)
3. Install to default location: `C:\Program Files\wkhtmltopdf\`

## Setting Up PATH

### Method 1: Add to System PATH (Recommended)
1. Open **System Properties**:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - OR Right-click "This PC" → Properties → Advanced system settings

2. Click **Environment Variables**

3. Under **System Variables**, find and select **Path**, then click **Edit**

4. Click **New** and add:
   ```
   C:\Program Files\wkhtmltopdf\bin
   ```

5. Click **OK** on all dialogs

6. **Restart your application** for changes to take effect

### Method 2: Verify Installation
Open Command Prompt and run:
```cmd
wkhtmltopdf --version
```

You should see output like:
```
wkhtmltopdf 0.12.6 (with patched qt)
```

## Testing the Fast Service

### 1. Test via API Endpoint
```bash
curl -X POST http://localhost:3001/api/thermal-printer/test-fast-kannada \
  -H "Content-Type: application/json" \
  -d '{
    "ticketData": {
      "movieName": "Test Movie",
      "date": "2024-01-15",
      "showTime": "02:45PM",
      "seatClass": "BOX",
      "seatInfo": "A 1",
      "totalAmount": 100
    },
    "printerName": "Your Printer Name"
  }'
```

### 2. Test in Your Application
The Fast Kannada service is now integrated and will be used automatically when:
- `movieSettings.printInKannada === true`
- The system calls the `/api/thermal-printer/print` endpoint

## Troubleshooting

### Common Issues

1. **"wkhtmltopdf not found"**
   - Ensure wkhtmltopdf is installed
   - Check PATH environment variable
   - Restart your application

2. **"Permission denied"**
   - Run your application as Administrator
   - Check file permissions in temp directory

3. **"Font not found"**
   - Ensure Kannada fonts are in `backend/fonts/` directory
   - Check font file path in HTML template

### Performance Comparison

- **Puppeteer (Original)**: 3-8 seconds per PDF
- **wkhtmltopdf (Fast)**: 0.5-2 seconds per PDF
- **Expected improvement**: 3-5x faster

## Configuration

The FastKannadaPrintService uses these wkhtmltopdf options:
```bash
wkhtmltopdf \
  --encoding UTF-8 \
  --page-size A4 \
  --orientation Portrait \
  --margin-top 0 \
  --margin-right 0 \
  --margin-bottom 0 \
  --margin-left 0 \
  --disable-smart-shrinking \
  --print-media-type \
  --enable-local-file-access \
  input.html output.pdf
```

## Fallback Strategy

If wkhtmltopdf fails, the service automatically falls back to:
1. Original `KannadaPdfService` (Puppeteer)
2. Manual PDF opening for user to print

This ensures your printing always works, even if wkhtmltopdf has issues.
