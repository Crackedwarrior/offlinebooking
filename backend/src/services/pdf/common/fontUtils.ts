/**
 * Common font utilities
 * Extracted from kannadaPdfKitService.ts and pdfPrintService.ts
 */

import fs from 'fs';
import path from 'path';
import type PDFDocument from 'pdfkit';

export interface FontPaths {
  regular: string;
  bold: string;
  fontDir: string;
}

/**
 * Find font paths in multiple possible locations
 * Supports both production and development environments
 */
export function findFontPaths(): FontPaths {
  const possibleFontDirs = [
    path.join(__dirname, 'fonts'), // Production: same directory as service
    path.join(__dirname, '..', 'fonts'), // Development: parent directory
    path.join(process.cwd(), 'fonts'), // Railway/web: current working directory
    path.join(process.cwd(), 'backend', 'fonts'), // Alternative web path
    path.join(__dirname, '..', '..', 'fonts'), // Another possible location
  ];
  
  let fontDir = possibleFontDirs[0]; // Default fallback
  
  // Find the first directory that contains the Kannada fonts
  for (const dir of possibleFontDirs) {
    const regularPath = path.join(dir, 'NotoSansKannada-Regular.ttf');
    const boldPath = path.join(dir, 'NotoSansKannada-Bold.ttf');
    
    if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
      fontDir = dir;
      console.log('[PRINT] Found Kannada fonts in directory:', dir);
      break;
    }
  }
  
  const regularFontPath = path.join(fontDir, 'NotoSansKannada-Regular.ttf');
  const boldFontPath = path.join(fontDir, 'NotoSansKannada-Bold.ttf');
  
  console.log('[PRINT] Font paths:', {
    regular: regularFontPath,
    bold: boldFontPath,
    regularExists: fs.existsSync(regularFontPath),
    boldExists: fs.existsSync(boldFontPath)
  });
  
  return {
    regular: regularFontPath,
    bold: boldFontPath,
    fontDir
  };
}

/**
 * Register fonts with PDF document
 * Returns registration status for safe font selection
 */
export function registerFonts(
  doc: typeof PDFDocument,
  regularFontPath: string,
  boldFontPath: string
): { regularRegistered: boolean; boldRegistered: boolean } {
  let regularFontRegistered = false;
  let boldFontRegistered = false;
  
  if (fs.existsSync(regularFontPath)) {
    try {
      doc.registerFont('NotoSansKannada', regularFontPath);
      regularFontRegistered = true;
      console.log('[PRINT] ✅ Successfully registered NotoSansKannada font from:', regularFontPath);
    } catch (error) {
      console.log('[ERROR] ❌ Failed to register NotoSansKannada font:', (error as Error).message);
      console.log('[ERROR] Font path attempted:', regularFontPath);
    }
  } else {
    console.log('[ERROR] ❌ Regular font not found at:', regularFontPath);
    console.log('[ERROR] Current working directory:', process.cwd());
    console.log('[ERROR] __dirname:', __dirname);
  }
  
  if (fs.existsSync(boldFontPath)) {
    try {
      doc.registerFont('NotoSansKannada-Bold', boldFontPath);
      boldFontRegistered = true;
      console.log('[PRINT] ✅ Successfully registered NotoSansKannada-Bold font from:', boldFontPath);
    } catch (error) {
      console.log('[ERROR] ❌ Failed to register NotoSansKannada-Bold font:', (error as Error).message);
      console.log('[ERROR] Font path attempted:', boldFontPath);
    }
  } else {
    console.log('[ERROR] ❌ Bold font not found at:', boldFontPath);
  }
  
  // Log font registration status
  console.log('[PRINT] Font registration status:', {
    regularFontRegistered,
    boldFontRegistered,
    fallbackToEnglish: !regularFontRegistered
  });
  
  return {
    regularRegistered: regularFontRegistered,
    boldRegistered: boldFontRegistered
  };
}

/**
 * Get safe font name with fallback
 * Returns Kannada font if available, otherwise falls back to Helvetica
 */
export function getSafeFont(
  isBold: boolean,
  regularRegistered: boolean,
  boldRegistered: boolean
): string {
  if (isBold && boldRegistered) {
    return 'NotoSansKannada-Bold';
  } else if (regularRegistered) {
    return 'NotoSansKannada';
  } else {
    console.log('[WARNING] ⚠️ Kannada fonts not available, falling back to Helvetica');
    return isBold ? 'Helvetica-Bold' : 'Helvetica';
  }
}

