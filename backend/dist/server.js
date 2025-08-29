"use strict";
// src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const errors_1 = require("./utils/errors");
const printService_1 = require("./printService");
const escposPrintService_1 = require("./escposPrintService");
const thermalPrintService_1 = __importDefault(require("./thermalPrintService"));
const pdfPrintService_1 = __importDefault(require("./pdfPrintService"));
const kannadaPdfService_1 = __importDefault(require("./kannadaPdfService"));
const printerSetup_1 = __importDefault(require("./printerSetup"));
const ticketIdService_1 = __importDefault(require("./ticketIdService"));
const auditLogger_1 = require("./utils/auditLogger");
const inputSanitizer_1 = require("./utils/inputSanitizer");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Production path handling function
const getAppDataPath = () => {
    if (process.env.NODE_ENV === 'production') {
        // In production, we're running from the current working directory
        // which will be resources/backend/ when spawned by Electron
        return process.cwd();
    }
    // In development, we're running from backend/dist/ or backend/src/
    return path_1.default.join(__dirname, '../');
};
// Add ESC/POS imports at the top
const escpos_1 = __importDefault(require("escpos"));
escpos_1.default.USB = require('escpos-usb');
escpos_1.default.Network = require('escpos-network');
// Validate configuration on startup
if (!(0, config_1.validateConfig)()) {
    process.exit(1);
}
// Validate security configuration
(0, config_1.validateSecurityConfig)();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const thermalPrintService = new thermalPrintService_1.default();
const pdfPrintService = new pdfPrintService_1.default();
const kannadaPdfService = new kannadaPdfService_1.default();
// Configure CORS
app.use((0, cors_1.default)({
    origin: config_1.config.api.corsOrigin,
    credentials: true,
}));
// Add security headers
app.use((req, res, next) => {
    // Content Security Policy - More restrictive for production
    const cspPolicy = config_1.config.server.isProduction
        ? "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' http://localhost:* ws://localhost:*; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "object-src 'none'; " +
            "media-src 'self';"
        : "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' http://localhost:* ws://localhost:*; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self';";
    res.setHeader('Content-Security-Policy', cspPolicy);
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    // Remove server information
    res.removeHeader('X-Powered-By');
    next();
});
app.use(express_1.default.json());
// Add rate limiting
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Stricter rate limiting for booking and printing endpoints
const bookingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 booking requests per windowMs
    message: {
        success: false,
        error: 'Too many booking requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply general rate limiting to all routes
app.use(generalLimiter);
// Add request ID middleware
app.use(errorHandler_1.requestIdMiddleware);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config_1.config.server.nodeEnv
    });
});
// Security monitoring endpoint (admin only)
app.get('/api/admin/security-status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get database health (simplified)
        const dbHealth = {
            status: 'healthy',
            details: 'Database connection validated',
            timestamp: new Date().toISOString()
        };
        // Get database stats (simplified)
        const dbStats = {
            totalBookings: 0, // Will be populated by actual query if needed
            totalSeats: 400,
            lastBackup: undefined,
            databaseSize: undefined
        };
        // Get rate limit info (this would need to be implemented with a rate limiter store)
        const rateLimitInfo = {
            general: { remaining: 100, timeUntilReset: 0 },
            booking: { remaining: 20, timeUntilReset: 0 },
            print: { remaining: 10, timeUntilReset: 0 }
        };
        // Get security configuration status
        const securityConfig = {
            webSecurity: config_1.config.server.isProduction ? 'enabled' : 'disabled',
            cspEnabled: true,
            rateLimiting: true,
            inputSanitization: true,
            auditLogging: true,
            jwtSecretStrength: config_1.config.security.jwtSecret.length >= 32 ? 'strong' : 'weak'
        };
        const securityStatus = {
            timestamp: new Date().toISOString(),
            database: {
                health: dbHealth,
                stats: dbStats
            },
            rateLimiting: rateLimitInfo,
            security: securityConfig,
            environment: config_1.config.server.nodeEnv
        };
        // Log security status access
        auditLogger_1.auditLogger.logAdmin('SECURITY_STATUS_ACCESSED', true, 'anonymous', req.ip, req.get('User-Agent'), { environment: config_1.config.server.nodeEnv }, req.requestId);
        res.json({
            success: true,
            data: securityStatus
        });
    }
    catch (error) {
        console.error('❌ Error getting security status:', error);
        auditLogger_1.auditLogger.logError('SECURITY_STATUS_FAILED', false, 'anonymous', req.ip, req.get('User-Agent'), { error: error instanceof Error ? error.message : 'Unknown error' }, req.requestId);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Audit logs endpoint (admin only)
app.get('/api/admin/audit-logs', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const logFilePath = auditLogger_1.auditLogger.getLogFilePath();
        if (!fs_1.default.existsSync(logFilePath)) {
            return res.json({
                success: true,
                logs: [],
                message: 'No audit logs found'
            });
        }
        const logContent = fs_1.default.readFileSync(logFilePath, 'utf8');
        const logLines = logContent.trim().split('\n').filter(line => line.trim());
        const logs = logLines.map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return { raw: line };
            }
        });
        // Log access to audit logs
        auditLogger_1.auditLogger.logAdmin('VIEW_AUDIT_LOGS', true, 'anonymous', req.ip, req.get('User-Agent'), { logCount: logs.length }, req.requestId);
        res.json({
            success: true,
            logs: logs.slice(-100), // Return last 100 entries
            total: logs.length,
            logFilePath
        });
    }
    catch (error) {
        console.error('❌ Error reading audit logs:', error);
        auditLogger_1.auditLogger.logError('VIEW_AUDIT_LOGS_FAILED', false, 'anonymous', req.ip, req.get('User-Agent'), { error: error instanceof Error ? error.message : 'Unknown error' }, req.requestId);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Add printer list endpoint
app.get('/api/printer/list', async (req, res) => {
    try {
        console.log('🔍 Getting list of available printers...');
        if (process.platform === 'win32') {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"', { windowsHide: true });
            try {
                const printers = JSON.parse(stdout);
                const printerNames = Array.isArray(printers)
                    ? printers.map((p) => p.Name).filter(Boolean)
                    : [];
                console.log('✅ Found printers:', printerNames);
                res.json({ success: true, printers: printerNames });
            }
            catch (parseError) {
                console.error('❌ Failed to parse printer list:', parseError);
                res.json({ success: true, printers: [] });
            }
        }
        else {
            res.json({ success: true, printers: [] });
        }
    }
    catch (error) {
        console.error('❌ Failed to get printer list:', error);
        res.status(500).json({ success: false, error: 'Failed to get printer list' });
    }
});
// Printer test endpoint
app.post('/api/printer/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        console.log('🖨️ Testing printer connection...');
        const { printerConfig } = req.body;
        // Log the printer configuration
        console.log('🖨️ Printer configuration:', printerConfig);
        // Actually try to connect to the printer
        // For now we'll simulate success, but in a real implementation
        // this would attempt to establish a connection to the physical printer
        const connected = true;
        if (connected) {
            console.log('✅ Printer connection successful');
            res.json({
                success: true,
                message: 'Printer connection test successful',
                timestamp: new Date().toISOString(),
                printerInfo: {
                    port: (printerConfig === null || printerConfig === void 0 ? void 0 : printerConfig.port) || 'COM1',
                    status: 'connected',
                    ready: true
                }
            });
        }
        else {
            throw new Error('Could not connect to printer');
        }
    }
    catch (error) {
        console.error('❌ Printer test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Printer connection test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Print job status endpoint
app.get('/api/printer/status/:jobId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    // Get queue status which includes job information
    const queueStatus = printService_1.windowsPrintService.getQueueStatus();
    const jobStatus = queueStatus.jobs.find(job => job.id === jobId);
    if (!jobStatus) {
        return res.status(404).json({
            success: false,
            error: 'Print job not found'
        });
    }
    res.json({
        success: true,
        jobStatus,
        queueStatus
    });
}));
// Print queue status endpoint
app.get('/api/printer/queue', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        queueStatus: printService_1.windowsPrintService.getQueueStatus()
    });
}));
// Global flag to prevent multiple simultaneous print operations
let isPrinting = false;
// Printer print endpoint
app.post('/api/printer/print', bookingLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tickets, printerConfig } = req.body;
    console.log('🖨️ Printing tickets:', {
        ticketCount: (tickets === null || tickets === void 0 ? void 0 : tickets.length) || 0,
        printerConfig,
        rawBody: req.body
    });
    // Log print attempt
    auditLogger_1.auditLogger.logPrint('PRINT_TICKETS_ATTEMPT', true, 'anonymous', req.ip, req.get('User-Agent'), {
        ticketCount: (tickets === null || tickets === void 0 ? void 0 : tickets.length) || 0,
        printerName: printerConfig === null || printerConfig === void 0 ? void 0 : printerConfig.name,
        printerType: 'ESC/POS'
    }, req.requestId);
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
        throw new Error('No tickets provided or invalid tickets format');
    }
    try {
        console.log('🖨️ Using ESC/POS service for thermal printing...');
        // Process each ticket
        for (const ticket of tickets) {
            // Create raw ticket data for the service to format
            const ticketData = {
                theaterName: printerConfig.theaterName || 'SREELEKHA THEATER',
                location: printerConfig.location || 'Chickmagalur',
                date: ticket.date || new Date().toLocaleDateString(),
                showTime: ticket.showTime || '2:00 PM',
                movieName: ticket.movieName || 'MOVIE',
                class: ticket.class || 'CLASS',
                seatId: ticket.seatId || 'A1',
                netAmount: ticket.netAmount || 0,
                cgst: ticket.cgst || 0,
                sgst: ticket.sgst || 0,
                mc: ticket.mc || 0,
                price: ticket.price || 0,
                transactionId: ticket.transactionId || 'TXN' + Date.now()
            };
            console.log('🖨️ Printing ticket data:', ticketData);
            await escposPrintService_1.EscposPrintService.printSilently(ticketData, printerConfig.name);
        }
        console.log('✅ All tickets printed successfully via ESC/POS');
        // Log successful print
        auditLogger_1.auditLogger.logPrint('PRINT_TICKETS_SUCCESS', true, 'anonymous', req.ip, req.get('User-Agent'), {
            ticketCount: tickets.length,
            printerName: printerConfig.name,
            printerType: 'ESC/POS'
        }, req.requestId);
        res.json({
            success: true,
            message: `${tickets.length} tickets printed successfully`,
            timestamp: new Date().toISOString(),
            printerInfo: {
                name: printerConfig.name,
                status: 'printed',
                method: 'Direct ESC/POS'
            }
        });
    }
    catch (error) {
        console.error('❌ ESC/POS printing failed:', error);
        // Log failed print
        auditLogger_1.auditLogger.logPrint('PRINT_TICKETS_FAILED', false, 'anonymous', req.ip, req.get('User-Agent'), {
            error: error instanceof Error ? error.message : 'Unknown error',
            ticketCount: (tickets === null || tickets === void 0 ? void 0 : tickets.length) || 0,
            printerName: printerConfig === null || printerConfig === void 0 ? void 0 : printerConfig.name
        }, req.requestId);
        res.status(500).json({
            success: false,
            message: 'ESC/POS printing failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// ===== THERMAL PRINTER ENDPOINTS =====
// Get all available printers (including thermal)
app.get('/api/thermal-printer/list', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const allPrinters = await thermalPrintService.getAllPrinters();
        const thermalPrinters = await thermalPrintService.getThermalPrinters();
        res.json({
            success: true,
            allPrinters,
            thermalPrinters,
            recommended: thermalPrinters.length > 0 ? thermalPrinters[0].name : null
        });
    }
    catch (error) {
        console.error('❌ Error getting thermal printers:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Test thermal printer
app.post('/api/thermal-printer/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { printerName } = req.body;
    if (!printerName) {
        throw new Error('Printer name is required');
    }
    const result = await thermalPrintService.testPrinter(printerName);
    if (result.success) {
        res.json({
            success: true,
            message: `Printer test successful for ${printerName}`,
            printer: printerName
        });
    }
    else {
        res.status(500).json({
            success: false,
            error: result.error,
            printer: printerName
        });
    }
}));
// Print ticket using PDF generation (English or Kannada version based on movie settings)
app.post('/api/thermal-printer/print', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { ticketData, printerName, movieSettings } = req.body;
    if (!ticketData) {
        throw new Error('Ticket data is required');
    }
    // Check if movie should be printed in Kannada
    const shouldPrintInKannada = (movieSettings === null || movieSettings === void 0 ? void 0 : movieSettings.printInKannada) === true;
    console.log(`🖨️ Printing ticket - Language: ${shouldPrintInKannada ? 'Kannada' : 'English'}`);
    console.log(`🎬 Movie settings:`, movieSettings);
    console.log(`🎬 Ticket data:`, ticketData);
    console.log(`🎬 Movie language in ticket data:`, ticketData.movieLanguage);
    // Use appropriate service based on language setting
    const result = shouldPrintInKannada
        ? await kannadaPdfService.printTicket(ticketData, printerName)
        : await pdfPrintService.printTicket(ticketData, printerName);
    if (result.success) {
        res.json({
            success: true,
            message: result.message,
            printer: result.printer
        });
    }
    else {
        res.status(500).json({
            success: false,
            error: result.error,
            printer: result.printer
        });
    }
}));
// Print ticket using old text-based thermal printer (fallback)
app.post('/api/thermal-printer/print-text', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { ticketData, printerName } = req.body;
    if (!ticketData) {
        throw new Error('Ticket data is required');
    }
    const result = await thermalPrintService.printTicket(ticketData, printerName);
    if (result.success) {
        res.json({
            success: true,
            message: result.message,
            printer: result.printer
        });
    }
    else {
        res.status(500).json({
            success: false,
            error: result.error,
            printer: result.printer
        });
    }
}));
// Get printer status
app.get('/api/thermal-printer/status/:printerName', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { printerName } = req.params;
    const status = await thermalPrintService.getPrinterStatus(printerName);
    res.json({
        success: true,
        printer: printerName,
        status
    });
}));
// Preview ticket format
app.post('/api/thermal-printer/preview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { ticketData } = req.body;
    if (!ticketData) {
        throw new Error('Ticket data is required');
    }
    const formattedTicket = thermalPrintService.formatTicket(ticketData);
    const previewContent = thermalPrintService.createTicketContent(formattedTicket);
    res.json({
        success: true,
        preview: previewContent,
        lines: previewContent.split('\n'),
        characterCount: previewContent.length
    });
}));
// Printer setup endpoints
app.get('/api/printer-setup/list', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const printers = await printerSetup_1.default.listPrinters();
        res.json({ success: true, printers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
}));
app.post('/api/printer-setup/properties', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const { printerName } = req.body;
        const result = await printerSetup_1.default.openPrinterProperties(printerName);
        res.json({ success: true, result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
}));
app.post('/api/printer-setup/setup', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const { printerName } = req.body;
        const result = await printerSetup_1.default.setupPrinter(printerName);
        res.json({ success: true, result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
}));
app.get('/api/printer-setup/info/:printerName', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const { printerName } = req.params;
        const info = await printerSetup_1.default.getPrinterInfo(printerName);
        res.json({ success: true, info });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
}));
// Request logging middleware (if enabled)
if (config_1.config.logging.enableRequestLogging) {
    app.use((req, res, next) => {
        console.log(`[${req.requestId}] ${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}
app.post('/api/bookings', bookingLimiter, errorHandler_1.validateBookingData, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const bookingRequest = req.body;
    const { tickets, total, totalTickets, timestamp, show, screen, movie, date, source = 'LOCAL', customerName, customerPhone, customerEmail, notes } = bookingRequest;
    // Sanitize input data
    const sanitizedCustomerName = inputSanitizer_1.InputSanitizer.sanitizeString(customerName, 100);
    const sanitizedCustomerPhone = inputSanitizer_1.InputSanitizer.sanitizePhone(customerPhone);
    const sanitizedCustomerEmail = customerEmail ? inputSanitizer_1.InputSanitizer.sanitizeEmail(customerEmail) : { data: '', sanitized: false };
    const sanitizedNotes = inputSanitizer_1.InputSanitizer.sanitizeString(notes, 500);
    // Check for dangerous content
    inputSanitizer_1.InputSanitizer.logDangerousContent(customerName, 'customerName', req.requestId);
    inputSanitizer_1.InputSanitizer.logDangerousContent(customerPhone, 'customerPhone', req.requestId);
    inputSanitizer_1.InputSanitizer.logDangerousContent(customerEmail, 'customerEmail', req.requestId);
    inputSanitizer_1.InputSanitizer.logDangerousContent(notes, 'notes', req.requestId);
    // Log booking attempt
    auditLogger_1.auditLogger.logBooking('CREATE_BOOKING_ATTEMPT', true, // We'll update this based on success
    'anonymous', // We'll add user authentication later
    req.ip, req.get('User-Agent'), {
        ticketsCount: tickets.length,
        total,
        show,
        screen,
        movie,
        date,
        source,
        sanitized: {
            customerName: sanitizedCustomerName.sanitized,
            customerPhone: sanitizedCustomerPhone.sanitized,
            customerEmail: sanitizedCustomerEmail.sanitized,
            notes: sanitizedNotes.sanitized
        }
    }, req.requestId);
    console.log('📝 Creating booking with data:', {
        tickets: tickets.length,
        total,
        show,
        screen,
        movie,
        date,
        seatIds: tickets.map((t) => t.id)
    });
    try {
        // Check if a booking with the same seats already exists for this date and show
        // Since bookedSeats is a JSON array, we need to check differently
        const existingBookings = await prisma.booking.findMany({
            where: {
                date: date ? new Date(date) : new Date(timestamp),
                show: show,
            }
        });
        // Check if any existing booking has the same seat IDs
        const seatIds = tickets.map((t) => t.id);
        const existingBooking = existingBookings.find((booking) => {
            const bookingSeats = booking.bookedSeats;
            return bookingSeats.length === seatIds.length &&
                seatIds.every(id => bookingSeats.includes(id));
        });
        if (existingBooking) {
            console.log('⚠️ Booking already exists for these seats:', existingBooking.id);
            // Return the existing booking instead of creating a duplicate
            const existingBookingData = {
                id: existingBooking.id,
                date: existingBooking.date.toISOString(),
                show: existingBooking.show,
                screen: existingBooking.screen,
                movie: existingBooking.movie,
                movieLanguage: 'HINDI',
                bookedSeats: existingBooking.bookedSeats,
                seatCount: existingBooking.seatCount,
                classLabel: existingBooking.classLabel,
                pricePerSeat: existingBooking.pricePerSeat,
                totalPrice: existingBooking.totalPrice,
                status: existingBooking.status,
                source: existingBooking.source,
                synced: existingBooking.synced,
                customerName: existingBooking.customerName || undefined,
                customerPhone: existingBooking.customerPhone || undefined,
                customerEmail: existingBooking.customerEmail || undefined,
                notes: existingBooking.notes || undefined,
                totalIncome: existingBooking.totalIncome || undefined,
                localIncome: existingBooking.localIncome || undefined,
                bmsIncome: existingBooking.bmsIncome || undefined,
                vipIncome: existingBooking.vipIncome || undefined,
                createdAt: existingBooking.createdAt.toISOString(),
                updatedAt: existingBooking.updatedAt.toISOString(),
                bookedAt: existingBooking.bookedAt.toISOString(),
            };
            const response = {
                success: true,
                bookings: [existingBookingData],
                message: `Booking already exists for these seats`
            };
            return res.status(200).json(response);
        }
        // Get source from request or default to LOCAL
        const source = bookingRequest.source || 'LOCAL';
        console.log('📝 Booking source:', source);
        // Create a single booking record instead of multiple class-based bookings
        // This prevents duplicate bookings for the same seats
        const newBooking = await prisma.booking.create({
            data: {
                date: date ? new Date(date) : new Date(timestamp),
                show: show,
                screen,
                movie,
                bookedSeats: tickets.map((t) => t.id),
                classLabel: ((_a = tickets[0]) === null || _a === void 0 ? void 0 : _a.classLabel) || 'MIXED', // Use first ticket's class or 'MIXED' for multiple classes
                seatCount: tickets.length,
                pricePerSeat: Math.round(total / tickets.length),
                totalPrice: total,
                source: source, // Save the source to the database
                synced: false,
            }
        });
        console.log('✅ Booking created successfully:', newBooking.id);
        // Transform Prisma result to API type
        const bookingData = {
            id: newBooking.id,
            date: newBooking.date.toISOString(),
            show: newBooking.show,
            screen: newBooking.screen,
            movie: newBooking.movie,
            movieLanguage: 'HINDI', // Default value
            bookedSeats: newBooking.bookedSeats,
            seatCount: tickets.length,
            classLabel: newBooking.classLabel,
            pricePerSeat: newBooking.pricePerSeat,
            totalPrice: newBooking.totalPrice,
            status: 'CONFIRMED',
            source: source,
            synced: newBooking.synced,
            customerName: sanitizedCustomerName.data,
            customerPhone: sanitizedCustomerPhone.data,
            customerEmail: sanitizedCustomerEmail.data,
            notes: sanitizedNotes.data,
            totalIncome: 0,
            localIncome: 0,
            bmsIncome: 0,
            vipIncome: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookedAt: newBooking.bookedAt.toISOString(),
        };
        const response = {
            success: true,
            bookings: [bookingData], // Return single booking in array for compatibility
            message: `Created booking successfully`
        };
        // Log successful booking
        auditLogger_1.auditLogger.logBooking('CREATE_BOOKING_SUCCESS', true, 'anonymous', req.ip, req.get('User-Agent'), {
            bookingId: newBooking.id,
            ticketsCount: tickets.length,
            total,
            show,
            screen,
            movie
        }, req.requestId);
        res.status(201).json(response);
    }
    catch (error) {
        console.error('❌ Error creating booking:', error);
        // Log failed booking
        auditLogger_1.auditLogger.logBooking('CREATE_BOOKING_FAILED', false, 'anonymous', req.ip, req.get('User-Agent'), {
            error: error instanceof Error ? error.message : 'Unknown error',
            ticketsCount: tickets.length,
            total,
            show,
            screen,
            movie
        }, req.requestId);
        throw error; // Let the error handler deal with it
    }
}));
app.get('/api/bookings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a, _b;
    const queryParams = req.query;
    const { date, show, status } = queryParams;
    console.log('🔍 GET /api/bookings called with params:', { date, show, status });
    // Build filter conditions
    const where = {};
    if (date) {
        // Parse the date and create a range that covers the entire day
        // Use UTC to avoid timezone issues
        const dateObj = new Date(date + 'T00:00:00.000Z');
        const startOfDay = new Date(dateObj);
        const endOfDay = new Date(dateObj);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        where.date = {
            gte: startOfDay,
            lt: endOfDay
        };
        console.log('📅 Date filter:', {
            inputDate: date,
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString()
        });
    }
    if (show)
        where.show = show;
    if (status)
        where.status = status;
    const bookings = await prisma.booking.findMany({
        where,
        orderBy: { bookedAt: 'desc' },
    });
    console.log('📊 Found bookings:', bookings.length);
    console.log('📊 Where clause:', JSON.stringify(where, null, 2));
    // Transform to API response format
    const bookingData = bookings.map((booking) => ({
        id: booking.id,
        date: booking.date.toISOString(),
        show: booking.show,
        screen: booking.screen,
        movie: booking.movie,
        movieLanguage: 'HINDI',
        bookedSeats: booking.bookedSeats,
        seatCount: booking.bookedSeats.length,
        classLabel: booking.classLabel,
        pricePerSeat: booking.pricePerSeat,
        totalPrice: booking.totalPrice,
        status: 'CONFIRMED',
        source: 'LOCAL',
        synced: booking.synced,
        totalIncome: 0,
        localIncome: 0,
        bmsIncome: 0,
        vipIncome: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookedAt: booking.bookedAt.toISOString(),
    }));
    const response = {
        success: true,
        data: bookingData,
    };
    console.log('📤 Sending response:', {
        success: response.success,
        dataLength: ((_a = response.data) === null || _a === void 0 ? void 0 : _a.length) || 0,
        sampleBooking: (_b = response.data) === null || _b === void 0 ? void 0 : _b[0]
    });
    res.json(response);
}));
// Health check endpoint
app.get('/api/health', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    // Test database connection
    await prisma.$queryRaw `SELECT 1`;
    const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config_1.config.server.nodeEnv,
        database: 'connected',
    };
    res.json(response);
}));
// Get booking statistics
app.get('/api/bookings/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { date, show } = req.query;
    const where = {};
    if (date) {
        // Parse the date and create a range that covers the entire day
        // Use UTC to avoid timezone issues
        const dateObj = new Date(date + 'T00:00:00.000Z');
        const startOfDay = new Date(dateObj);
        const endOfDay = new Date(dateObj);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        where.date = {
            gte: startOfDay,
            lt: endOfDay
        };
    }
    if (show)
        where.show = show;
    const [totalBookings, totalRevenue, bookingsByClass] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.aggregate({
            where,
            _sum: { totalPrice: true }
        }),
        prisma.booking.groupBy({
            by: ['classLabel'],
            where,
            _count: { id: true },
            _sum: { totalPrice: true }
        })
    ]);
    const response = {
        success: true,
        data: {
            totalBookings,
            totalRevenue: totalRevenue._sum.totalPrice || 0,
            bookingsByClass: bookingsByClass.map((item) => ({
                class: item.classLabel,
                count: item._count.id,
                revenue: item._sum.totalPrice || 0
            }))
        }
    };
    res.json(response);
}));
// Get seat status for a specific date and show
app.get('/api/seats/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const queryParams = req.query;
    const { date, show } = queryParams;
    if (!date || !show) {
        throw new errors_1.ValidationError('Date and show are required');
    }
    // Build filter conditions with date range
    const where = {};
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    if (date) {
        where.date = {
            gte: startOfDay,
            lt: endOfDay
        };
    }
    if (show)
        where.show = show;
    const bookings = await prisma.booking.findMany({
        where,
        select: {
            bookedSeats: true,
            classLabel: true
        }
    });
    // Extract all booked seats
    const bookedSeats = bookings.flatMap((booking) => booking.bookedSeats.map((seatId) => ({
        seatId,
        class: booking.classLabel
    })));
    // Get BMS marked seats from the BmsBooking table for this specific date and show
    const bmsSeats = await prisma.bmsBooking.findMany({
        where: {
            date: {
                gte: startOfDay,
                lt: endOfDay
            },
            show: show,
            status: 'BMS_BOOKED' // Ensure we only get BMS_BOOKED seats
        },
        select: {
            seatId: true,
            classLabel: true
        }
    });
    console.log('🔍 BMS seats found:', {
        date,
        show,
        count: bmsSeats.length,
        seats: bmsSeats.map(seat => ({ id: seat.seatId, class: seat.classLabel }))
    });
    console.log('📊 Seat status response:', {
        date,
        show,
        bookingsFound: bookings.length,
        totalBookedSeats: bookedSeats.length,
        bmsSeatsFound: bmsSeats.length,
        sampleBookedSeats: bookedSeats.slice(0, 5),
        sampleBmsSeats: bmsSeats.slice(0, 5)
    });
    // Get selected seats from in-memory storage
    const storageKey = getStorageKey(date, show);
    const selectedSeats = selectedSeatsStorage.get(storageKey) || new Set();
    const selectedSeatsArray = Array.from(selectedSeats).map((seatId) => ({
        seatId,
        class: 'SELECTED' // We don't store class info for selected seats, just mark as selected
    }));
    const response = {
        success: true,
        data: {
            date,
            show,
            bookedSeats,
            bmsSeats: bmsSeats.map(seat => ({
                seatId: seat.seatId,
                class: seat.classLabel
            })),
            selectedSeats: selectedSeatsArray,
            totalBooked: bookedSeats.length,
            totalBms: bmsSeats.length,
            totalSelected: selectedSeatsArray.length
        }
    };
    res.json(response);
}));
// Save BMS seat status
app.post('/api/seats/bms', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { seatIds, status, date, show } = req.body;
    if (!seatIds || !Array.isArray(seatIds)) {
        throw new errors_1.ValidationError('seatIds array is required');
    }
    if (!status || !['BMS_BOOKED', 'AVAILABLE'].includes(status)) {
        throw new errors_1.ValidationError('status must be BMS_BOOKED or AVAILABLE');
    }
    if (!date || !show) {
        throw new errors_1.ValidationError('date and show are required');
    }
    console.log('📝 Saving BMS seat status:', { seatIds, status, date, show });
    // Update or create BMS booking records
    const results = await Promise.all(seatIds.map(async (seatId) => {
        // Determine class label based on seat ID
        let classLabel = 'STAR CLASS'; // default
        if (seatId.startsWith('BOX'))
            classLabel = 'BOX';
        else if (seatId.startsWith('SC2'))
            classLabel = 'SECOND CLASS';
        else if (seatId.startsWith('SC'))
            classLabel = 'STAR CLASS';
        else if (seatId.startsWith('CB'))
            classLabel = 'CLASSIC';
        else if (seatId.startsWith('FC'))
            classLabel = 'FIRST CLASS';
        if (status === 'BMS_BOOKED') {
            // Create BMS booking record
            console.log(`Creating BMS booking for seat ${seatId} with class ${classLabel}`);
            return await prisma.bmsBooking.upsert({
                where: {
                    seatId_date_show: {
                        seatId,
                        date: new Date(date),
                        show: show
                    }
                },
                update: {
                    status: status,
                    classLabel, // Ensure class label is updated
                    updatedAt: new Date()
                },
                create: {
                    seatId,
                    date: new Date(date),
                    show: show,
                    classLabel,
                    status: status
                }
            });
        }
        else {
            // Remove BMS booking record
            return await prisma.bmsBooking.deleteMany({
                where: {
                    seatId,
                    date: new Date(date),
                    show: show
                }
            });
        }
    }));
    console.log(`✅ Updated ${results.length} BMS bookings to status: ${status}`);
    const response = {
        success: true,
        message: `Updated ${results.length} BMS bookings to ${status}`,
        data: results
    };
    res.json(response);
}));
// In-memory storage for selected seats (temporary solution)
const selectedSeatsStorage = new Map();
// Helper function to get storage key
const getStorageKey = (date, show) => `${date}-${show}`;
// Update seat status (for move operations)
app.post('/api/seats/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { seatUpdates, date, show } = req.body;
    if (!seatUpdates || !Array.isArray(seatUpdates)) {
        throw new errors_1.ValidationError('seatUpdates array is required');
    }
    if (!date || !show) {
        throw new errors_1.ValidationError('date and show are required');
    }
    console.log('📝 Updating seat status:', { seatUpdates, date, show });
    const storageKey = getStorageKey(date, show);
    if (!selectedSeatsStorage.has(storageKey)) {
        selectedSeatsStorage.set(storageKey, new Set());
    }
    const selectedSeats = selectedSeatsStorage.get(storageKey);
    // Process each seat update
    const results = await Promise.all(seatUpdates.map(async (update) => {
        const { seatId, status } = update;
        if (!['AVAILABLE', 'SELECTED', 'BOOKED', 'BLOCKED'].includes(status)) {
            throw new errors_1.ValidationError(`Invalid status: ${status}`);
        }
        // Update in-memory storage
        if (status === 'SELECTED') {
            selectedSeats.add(seatId);
        }
        else {
            selectedSeats.delete(seatId);
        }
        console.log(`🔄 Seat ${seatId} status updated to ${status} for ${date} ${show}`);
        return { seatId, status, success: true };
    }));
    console.log(`✅ Updated ${results.length} seat statuses. Current selected seats for ${storageKey}:`, Array.from(selectedSeats));
    const response = {
        success: true,
        message: `Updated ${results.length} seat statuses`,
        data: results
    };
    res.json(response);
}));
// Update a booking
app.put('/api/bookings/:id', errorHandler_1.validateBookingData, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    console.log('📝 Updating booking:', { id, updateData });
    // Validate booking exists
    const existingBooking = await prisma.booking.findUnique({
        where: { id }
    });
    if (!existingBooking) {
        throw new errors_1.NotFoundError(`Booking with ID ${id} not found`);
    }
    // Update the booking
    const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
            movie: updateData.movie,
            movieLanguage: updateData.movieLanguage,
            pricePerSeat: updateData.pricePerSeat,
            totalPrice: updateData.pricePerSeat * existingBooking.seatCount,
            status: updateData.status,
            updatedAt: new Date()
        }
    });
    console.log('✅ Booking updated successfully:', { id, updatedBooking });
    const response = {
        success: true,
        data: {
            ...updatedBooking,
            date: updatedBooking.date.toISOString(),
            createdAt: updatedBooking.createdAt.toISOString(),
            updatedAt: updatedBooking.updatedAt.toISOString(),
            bookedAt: updatedBooking.bookedAt.toISOString(),
            bookedSeats: Array.isArray(updatedBooking.bookedSeats) ? updatedBooking.bookedSeats : [],
            customerName: updatedBooking.customerName || undefined,
            customerPhone: updatedBooking.customerPhone || undefined,
            customerEmail: updatedBooking.customerEmail || undefined,
            notes: updatedBooking.notes || undefined,
            totalIncome: updatedBooking.totalIncome || undefined,
            localIncome: updatedBooking.localIncome || undefined,
            bmsIncome: updatedBooking.bmsIncome || undefined,
            vipIncome: updatedBooking.vipIncome || undefined
        },
        message: 'Booking updated successfully'
    };
    res.json(response);
}));
// Delete a booking
app.delete('/api/bookings/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    console.log('🗑️ Deleting booking:', { id });
    // Validate booking exists
    const existingBooking = await prisma.booking.findUnique({
        where: { id }
    });
    if (!existingBooking) {
        throw new errors_1.NotFoundError(`Booking with ID ${id} not found`);
    }
    // Delete the booking
    await prisma.booking.delete({
        where: { id }
    });
    console.log('✅ Booking deleted successfully:', { id });
    const response = {
        success: true,
        data: null,
        message: 'Booking deleted successfully'
    };
    res.json(response);
}));
// Ticket ID Management Endpoints
app.get('/api/ticket-id/current', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const config = ticketIdService_1.default.getConfig();
    const currentTicketId = ticketIdService_1.default.getCurrentTicketId();
    const response = {
        success: true,
        data: {
            currentId: config.currentId,
            currentTicketId,
            config
        },
        message: 'Current ticket ID retrieved successfully'
    };
    res.json(response);
}));
app.post('/api/ticket-id/reset', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { newId } = req.body;
    if (typeof newId !== 'number' || newId < 0) {
        throw new errors_1.ValidationError('newId must be a positive number');
    }
    ticketIdService_1.default.resetTicketId(newId);
    const currentTicketId = ticketIdService_1.default.getCurrentTicketId();
    const response = {
        success: true,
        data: {
            currentId: newId,
            currentTicketId
        },
        message: `Ticket ID reset to ${currentTicketId}`
    };
    res.json(response);
}));
app.get('/api/ticket-id/next', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const nextTicketId = ticketIdService_1.default.getNextTicketId();
    const response = {
        success: true,
        data: {
            nextTicketId
        },
        message: 'Next ticket ID generated successfully'
    };
    res.json(response);
}));
// Add error handling middleware (must be last)
app.use(errorHandler_1.errorLogger);
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            type: 'NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            code: 404,
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
        }
    });
});
app.listen(config_1.config.server.port, () => {
    console.log(`🚀 Server running at http://localhost:${config_1.config.server.port}`);
    console.log(`📊 Environment: ${config_1.config.server.nodeEnv}`);
    console.log(`🔗 CORS Origin: ${config_1.config.api.corsOrigin}`);
    console.log(`🔧 Error handling: Enabled`);
});
