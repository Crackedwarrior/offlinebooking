/**
 * Kannada ticket PDF generator
 * Generates PDF tickets with Kannada text and fonts
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { BaseTicketGenerator, PDFLayoutConfig } from './baseGenerator';
import type { FormattedTicket } from '../common/types';

export class KannadaTicketGenerator extends BaseTicketGenerator {
  protected getLayoutConfig(): PDFLayoutConfig {
    return {
      leftMargin: 41,
      rightMargin: 209.5,
      centerX: 125.25,
      titleFontSize: 18,
      normalFontSize: 10,
      smallFontSize: 8,
      snoFontSize: 5
    };
  }

  async generatePDF(formattedTicket: FormattedTicket): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [226, 800],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      const outputPath = this.createOutputPath('kannada_ticket');
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Register fonts
      this.registerFontsWithDoc(doc);
      const getSafeFont = (isBold = false) => this.getSafeFontName(isBold);

      const config = this.getLayoutConfig();
      let currentY = 20;

      // Helper functions using base class methods
      const drawCenteredText = (text: string, y: number, fontSize: number = 10, useBold: boolean = false, useKannada: boolean = false) => {
        const font = useKannada ? getSafeFont(useBold) : (useBold ? 'Helvetica-Bold' : 'Helvetica');
        return this.drawCenteredText(doc, text, y, config.centerX, fontSize, font);
      };

      const drawLeftText = (text: string, y: number, fontSize: number = 10, useBold: boolean = false, useKannada: boolean = false) => {
        const font = useKannada ? getSafeFont(useBold) : (useBold ? 'Helvetica-Bold' : 'Helvetica');
        return this.drawLeftText(doc, text, y, config.leftMargin, fontSize, font);
      };

      // === HEADER BOX SECTION ===
      const boxWidth = config.rightMargin - config.leftMargin;
      const boxHeight = 68.2;
      const boxX = config.leftMargin;
      const boxY = currentY;

      this.drawBox(doc, boxX, boxY, boxWidth, boxHeight);

      let textY = boxY + 4.7;
      const theaterFontSize = config.titleFontSize - 2;
      textY = drawCenteredText('ಶ್ರೀಲೇಖಾ', textY, theaterFontSize, true, true);
      textY = drawCenteredText('ಚಿತ್ರಮಂದಿರ', textY - 5, theaterFontSize, true, true);
      textY = drawCenteredText('ಚಿಕ್ಕಮಗಳೂರು', textY - 3.3, config.normalFontSize, false, true);
      textY = drawCenteredText(`GSTIN: ${formattedTicket.gstin}`, textY - 4.3, config.smallFontSize, false, false);

      // === DETAILS SECTION ===
      currentY = boxY + boxHeight + 3;

      // Date and S.No
      doc.fontSize(config.normalFontSize).font(getSafeFont(true));
      const dateLabelText = 'ದಿನಾಂಕ: ';
      const dateLabelWidth = doc.widthOfString(dateLabelText);
      const dateX = config.leftMargin + 3;
      doc.text(dateLabelText, dateX, currentY);
      doc.font('Times-Bold').text(`${formattedTicket.date}`, dateX + dateLabelWidth, currentY + 1);

      const dateEndX = dateX + dateLabelWidth + doc.widthOfString(`${formattedTicket.date}`);
      const formattedTime = formattedTicket.currentTime || this.formatCurrentTime();
      const snoText = `S.No: ${formattedTicket.ticketId} / ${formattedTime}`;

      doc.fontSize(config.snoFontSize + 1).font('Helvetica');
      doc.text(snoText, dateEndX + 5, currentY + 1);
      currentY += 15;

      // Movie - with word wrapping
      const kannadaLabel = 'ಚಲನಚಿತ್ರ: ';
      const englishMovieName = formattedTicket.movieName;

      doc.fontSize(config.normalFontSize).font(getSafeFont(true));
      doc.text(kannadaLabel, dateX, currentY);

      doc.fontSize(config.normalFontSize).font(getSafeFont(true));
      const kannadaLabelWidth = doc.widthOfString(kannadaLabel);

      doc.fontSize(config.normalFontSize).font('Times-Bold');
      const englishMovieWidth = doc.widthOfString(englishMovieName);
      const availableWidth = config.rightMargin - dateX - 20;

      if (englishMovieWidth <= (availableWidth - kannadaLabelWidth)) {
        doc.text(englishMovieName, dateX + kannadaLabelWidth, currentY);
      } else {
        const words = englishMovieName.split(' ');
        let firstLineWords: string[] = [];
        let firstLineLength = 0;
        const maxFirstLineChars = 16;
        const maxSecondLineChars = 28;

        for (const word of words) {
          const wordWithSpace = firstLineWords.length > 0 ? ' ' + word : word;
          if (firstLineLength + wordWithSpace.length <= maxFirstLineChars) {
            firstLineWords.push(word);
            firstLineLength += wordWithSpace.length;
          } else {
            break;
          }
        }

        const firstLine = firstLineWords.join(' ');
        const secondLine = words.slice(firstLineWords.length).join(' ');

        doc.text(firstLine, dateX + kannadaLabelWidth, currentY);
        doc.text(secondLine, dateX, currentY + config.normalFontSize + 8);
        currentY += config.normalFontSize + 8;
      }

      currentY += 8;

      // Show
      currentY += 5;
      doc.fontSize(config.normalFontSize).font(getSafeFont(true));
      const showLabelText = `${formattedTicket.showClass}: `;
      const showLabelWidth = doc.widthOfString(showLabelText);
      const showX = dateX;
      doc.text(showLabelText, showX, currentY);
      doc.font('Helvetica').text(`${formattedTicket.showTime}`, showX + showLabelWidth, currentY);
      currentY += 15;

      // === CLASS/SEAT BOX ===
      currentY += 2;
      const classSeatBoxHeight = 55;
      const classSeatBoxY = currentY;

      this.drawBox(doc, config.leftMargin, classSeatBoxY, boxWidth, classSeatBoxHeight);

      let classSeatTextY = classSeatBoxY + 15;
      doc.fontSize(14).font('Times-Bold');

      const classText = 'CLASS';
      const seatText = 'SEAT';
      const classTextWidth = doc.widthOfString(classText);
      const seatTextWidth = doc.widthOfString(seatText);
      const maxTextWidth = Math.max(classTextWidth, seatTextWidth);
      const alignedColonX = dateX + maxTextWidth + 3;

      doc.text('CLASS', dateX, classSeatTextY - 3);
      doc.text(':', alignedColonX, classSeatTextY - 3);
      doc.text(formattedTicket.seatClass, alignedColonX + 8, classSeatTextY - 3);

      classSeatTextY += 20;
      doc.text('SEAT', dateX, classSeatTextY);
      doc.text(':', alignedColonX, classSeatTextY);
      doc.text(formattedTicket.seatInfo, alignedColonX + 8, classSeatTextY);

      // === TAX BREAKDOWN ===
      currentY = classSeatBoxY + classSeatBoxHeight + 5.9;
      doc.fontSize(config.smallFontSize).font('Helvetica');

      const netAmount = typeof formattedTicket.net === 'number' ? formattedTicket.net : parseFloat(formattedTicket.net);
      const cgstAmount = typeof formattedTicket.cgst === 'number' ? formattedTicket.cgst : parseFloat(formattedTicket.cgst);
      const sgstAmount = typeof formattedTicket.sgst === 'number' ? formattedTicket.sgst : parseFloat(formattedTicket.sgst);
      const mcAmount = typeof formattedTicket.mc === 'number' ? formattedTicket.mc : parseFloat(formattedTicket.mc);

      const netText = 'NET';
      const cgstText = 'CGST';
      const sgstText = 'SGST';
      const mcText = 'MC';

      const netTextWidth = doc.widthOfString(netText);
      const cgstTextWidth = doc.widthOfString(cgstText);
      const sgstTextWidth = doc.widthOfString(sgstText);
      const mcTextWidth = doc.widthOfString(mcText);

      const maxTaxTextWidth = Math.max(netTextWidth, cgstTextWidth, sgstTextWidth, mcTextWidth);
      const taxAlignedColonX = dateX + maxTaxTextWidth;

      let taxY = currentY;

      // NET and CGST
      doc.font('Helvetica').text('NET', dateX, taxY);
      doc.font('Helvetica').text(':', taxAlignedColonX, taxY);
      doc.font(getSafeFont(false)).text(`₹${netAmount.toFixed(2)}`, taxAlignedColonX + 5, taxY);

      const cgstX = dateX + 70;
      doc.font('Helvetica').text('CGST', cgstX, taxY);
      doc.font('Helvetica').text(':', cgstX + maxTaxTextWidth, taxY);
      doc.font(getSafeFont(false)).text(`₹${cgstAmount.toFixed(2)}`, cgstX + maxTaxTextWidth + 5, taxY);

      taxY += 12;

      // SGST and MC
      doc.font('Helvetica').text('SGST', dateX, taxY);
      doc.font('Helvetica').text(':', taxAlignedColonX, taxY);
      doc.font(getSafeFont(false)).text(`₹${sgstAmount.toFixed(2)}`, taxAlignedColonX + 5, taxY);

      doc.font('Helvetica').text('MC', cgstX, taxY);
      doc.font('Helvetica').text(':', cgstX + maxTaxTextWidth, taxY);
      doc.font(getSafeFont(false)).text(`₹${mcAmount.toFixed(2)}`, cgstX + maxTaxTextWidth + 5, taxY);

      // === TICKET PRICE ===
      currentY = taxY + 8.9;
      doc.fontSize(config.normalFontSize).font(getSafeFont(true));
      const ticketPriceText = `ಟಿಕೆಟ್ ಬೆಲೆ (ಪ್ರತಿ ಆಸನ): ₹${formattedTicket.individualTicketPrice}`;
      doc.text(ticketPriceText, dateX, currentY);
      currentY += 15;

      // === TOTAL BOX ===
      currentY += 1.4;
      const totalBoxHeight = 37.0;
      const totalBoxY = currentY;

      this.drawBox(doc, config.leftMargin, totalBoxY, boxWidth, totalBoxHeight);

      let totalTextY = totalBoxY + 10.4;
      currentY = drawCenteredText(`ಒಟ್ಟು: ₹${formattedTicket.totalAmount}`, totalTextY, config.titleFontSize, true, true);

      // === STUB SECTION ===
      currentY = totalBoxY + totalBoxHeight + 8;
      currentY += 4.2;

      // === TEAR-OFF LINE ===
      this.drawRoundDotsLine(doc, config.leftMargin, currentY, config.rightMargin, currentY);
      currentY += 5;

      // Theater name on one line in stub
      currentY = drawCenteredText('ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ', currentY, config.normalFontSize, true, true);

      // Movie name in stub with two-line support
      doc.fontSize(config.smallFontSize).font('Times-Bold');
      const stubMovieText = formattedTicket.movieName;
      const stubMovieTextWidth = doc.widthOfString(stubMovieText);
      const availableStubWidth = config.rightMargin - config.leftMargin - 20;

      currentY -= 1.2;

      if (stubMovieTextWidth <= availableStubWidth) {
        const stubMovieX = config.centerX - (stubMovieTextWidth / 2);
        doc.text(stubMovieText, stubMovieX, currentY);
      } else {
        const words = stubMovieText.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        const firstLine = words.slice(0, midPoint).join(' ');
        const secondLine = words.slice(midPoint).join(' ');

        const firstLineWidth = doc.widthOfString(firstLine);
        const secondLineWidth = doc.widthOfString(secondLine);
        const firstLineX = config.centerX - (firstLineWidth / 2);
        const secondLineX = config.centerX - (secondLineWidth / 2);

        doc.text(firstLine, firstLineX, currentY);
        doc.text(secondLine, secondLineX, currentY + config.smallFontSize + 2);
        currentY += config.smallFontSize + 2;
      }
      currentY += config.normalFontSize + 6;

      // Stub date and time
      currentY -= 3;
      doc.fontSize(config.smallFontSize).font(getSafeFont(true));
      const stubDateLabelText = 'ದಿನಾಂಕ: ';
      const stubDateLabelWidth = doc.widthOfString(stubDateLabelText);
      const stubDateValueWidth = doc.widthOfString(`${formattedTicket.date}`);
      const stubDateTextWidth = stubDateLabelWidth + stubDateValueWidth;
      const stubDateX = config.centerX - (stubDateTextWidth / 2) - 50;
      const movedStubDateX = stubDateX + 3;
      doc.text(stubDateLabelText, movedStubDateX, currentY + 0.75);
      doc.font('Times-Bold').text(`${formattedTicket.date}`, movedStubDateX + stubDateLabelWidth + 0.9, currentY + 0.75);

      const stubDateEndX = movedStubDateX + stubDateLabelWidth + 0.9 + stubDateValueWidth;
      const stubShowLabelText = `${formattedTicket.showClass}: `;
      doc.font(getSafeFont(true));
      const stubShowLabelWidth = doc.widthOfString(stubShowLabelText);
      doc.text(stubShowLabelText, stubDateEndX + 10 - 10, currentY);
      doc.font('Helvetica').text(`${formattedTicket.showTime}`, stubDateEndX + 10 - 10 + stubShowLabelWidth, currentY);
      currentY += 15;
      currentY -= 0.6;

      currentY = drawCenteredText(`CLASS: ${formattedTicket.seatClass} | SEAT: ${formattedTicket.seatInfo}`, currentY, config.smallFontSize, false, false);

      // Stub tax breakdown
      currentY -= 5;
      const stubTaxY = currentY;
      const stubTaxStartX = config.leftMargin + 21;
      const stubTaxSpacing = 35;

      doc.fontSize(config.smallFontSize);
      doc.font('Helvetica').text('NET:', stubTaxStartX, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${netAmount.toFixed(2)}`, stubTaxStartX, stubTaxY + 8);

      doc.font('Helvetica').text('CGST:', stubTaxStartX + stubTaxSpacing, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${cgstAmount.toFixed(2)}`, stubTaxStartX + stubTaxSpacing, stubTaxY + 8);

      doc.font('Helvetica').text('SGST:', stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${sgstAmount.toFixed(2)}`, stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY + 8);

      doc.font('Helvetica').text('MC:', stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${mcAmount.toFixed(2)}`, stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY + 8);

      currentY = stubTaxY + 20;

      // Stub ticket price
      doc.fontSize(config.smallFontSize).font(getSafeFont(true));
      const stubTicketPriceText = `ಟಿಕೆಟ್ ಬೆಲೆ (ಪ್ರತಿ ಆಸನ): ₹${formattedTicket.individualTicketPrice}`;
      const stubTicketPriceTextWidth = doc.widthOfString(stubTicketPriceText);
      const stubTicketPriceX = config.centerX - (stubTicketPriceTextWidth / 2) - 0.6;
      doc.text(stubTicketPriceText, stubTicketPriceX, currentY);
      currentY += config.smallFontSize + 5;

      // Stub total
      const stubTotalFontSize = config.normalFontSize + 2;
      doc.fontSize(stubTotalFontSize).font(getSafeFont(true));
      const stubTotalText = `ಒಟ್ಟು: ₹${formattedTicket.totalAmount}`;
      const stubTotalTextWidth = doc.widthOfString(stubTotalText);
      const stubTotalX = config.centerX - (stubTotalTextWidth / 2) - 0.6;
      doc.text(stubTotalText, stubTotalX, currentY);
      currentY += stubTotalFontSize + 5;

      // Stub S.No and print time
      const stubTicketId = `S.No: ${formattedTicket.ticketId}`;
      const stubPrintTime = formattedTime;

      doc.fontSize(6).font('Helvetica');
      doc.text(stubTicketId, config.leftMargin - 5, currentY);

      const stubPrintTimeWidth = doc.widthOfString(stubPrintTime);
      const stubPrintTimeX = config.rightMargin - stubPrintTimeWidth + 5;
      doc.text(stubPrintTime, stubPrintTimeX, currentY);

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });
      stream.on('error', reject);
    });
  }

  private formatCurrentTime(): string {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
}

