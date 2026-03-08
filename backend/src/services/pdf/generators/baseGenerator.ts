/**
 * Base generator with common PDF generation utilities
 * Provides shared layout constants and helper methods
 */

import type PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { drawCenteredText, drawLeftText, drawBox, drawRoundDotsLine } from '../common/layoutUtils';
import { registerFonts, getSafeFont } from '../common/fontUtils';
import { findFontPaths } from '../common/fontUtils';
import type { FormattedTicket } from '../common/types';

export interface PDFLayoutConfig {
  leftMargin: number;
  rightMargin: number;
  centerX: number;
  titleFontSize: number;
  normalFontSize: number;
  smallFontSize: number;
  snoFontSize: number;
}

export abstract class BaseTicketGenerator {
  protected fontPaths: ReturnType<typeof findFontPaths>;
  protected regularFontRegistered: boolean = false;
  protected boldFontRegistered: boolean = false;
  protected tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
    this.fontPaths = findFontPaths();
  }

  /**
   * Get layout configuration
   * Override in subclasses for different layouts
   */
  protected abstract getLayoutConfig(): PDFLayoutConfig;

  /**
   * Register fonts with PDF document
   */
  protected registerFontsWithDoc(doc: typeof PDFDocument): void {
    const result = registerFonts(
      doc,
      this.fontPaths.regular,
      this.fontPaths.bold
    );
    this.regularFontRegistered = result.regularRegistered;
    this.boldFontRegistered = result.boldRegistered;
  }

  /**
   * Get safe font name with fallback
   */
  protected getSafeFontName(isBold: boolean = false): string {
    return getSafeFont(
      isBold,
      this.regularFontRegistered,
      this.boldFontRegistered
    );
  }

  /**
   * Draw centered text helper
   */
  protected drawCenteredText(
    doc: typeof PDFDocument,
    text: string,
    y: number,
    centerX: number,
    fontSize: number = 10,
    font: string = 'Helvetica'
  ): number {
    return drawCenteredText(doc, text, y, centerX, fontSize, font);
  }

  /**
   * Draw left-aligned text helper
   */
  protected drawLeftText(
    doc: typeof PDFDocument,
    text: string,
    y: number,
    leftMargin: number,
    fontSize: number = 10,
    font: string = 'Helvetica'
  ): number {
    return drawLeftText(doc, text, y, leftMargin, fontSize, font);
  }

  /**
   * Draw box helper
   */
  protected drawBox(
    doc: typeof PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    drawBox(doc, x, y, width, height);
  }

  /**
   * Draw round dots line helper
   */
  protected drawRoundDotsLine(
    doc: typeof PDFDocument,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    drawRoundDotsLine(doc, x1, y1, x2, y2);
  }

  /**
   * Generate PDF ticket
   * Must be implemented by subclasses
   */
  abstract generatePDF(formattedTicket: FormattedTicket): Promise<string>;

  /**
   * Create output path for PDF
   */
  protected createOutputPath(prefix: string = 'ticket'): string {
    const outputPath = path.join(this.tempDir, `${prefix}_${Date.now()}.pdf`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    return outputPath;
  }
}

