/**
 * English ticket PDF generator
 * Generates PDF tickets with English text
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import { BaseTicketGenerator, PDFLayoutConfig } from './baseGenerator';
import type { FormattedTicket } from '../common/types';

export class EnglishTicketGenerator extends BaseTicketGenerator {
  protected getLayoutConfig(): PDFLayoutConfig {
    return {
      leftMargin: 39, // LEFT_OFFSET
      rightMargin: 209, // LEFT_OFFSET + 170
      centerX: 124, // Approximate center
      titleFontSize: 12,
      normalFontSize: 10,
      smallFontSize: 8,
      snoFontSize: 6
    };
  }

  async generatePDF(formattedTicket: FormattedTicket): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [226, 500],
        margins: {
          top: 5,
          bottom: 5,
          left: 0,
          right: 0
        },
        layout: 'portrait'
      });

      const outputPath = this.createOutputPath('ticket');
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Register fonts for rupee symbol support
      this.registerFontsWithDoc(doc);
      const getSafeFont = (isBold = false) => this.getSafeFontName(isBold);

      const rupeeSymbol = '₹';
      const config = this.getLayoutConfig();
      const LEFT_OFFSET = config.leftMargin;
      const TEXT_OFFSET = LEFT_OFFSET + 5; // 44
      const RIGHT_OFFSET = LEFT_OFFSET + 55; // 94
      const SNO_OFFSET = LEFT_OFFSET + 75; // 114

      let currentY = 10;

      // Header box with theater info
      this.drawBox(doc, LEFT_OFFSET, 5, 170, 65);

      // Bold AND italic theater name
      doc.fontSize(16).font('Times-BoldItalic');
      doc.text(formattedTicket.theaterName, LEFT_OFFSET, 12, {
        width: 176,
        align: 'center',
        characterSpacing: 1
      });

      doc.fontSize(config.normalFontSize).font('Helvetica');
      doc.text(formattedTicket.location, LEFT_OFFSET, 46, { width: 176, align: 'center' });
      doc.text(`GSTIN: ${formattedTicket.gstin}`, LEFT_OFFSET, 58, { width: 176, align: 'center' });

      currentY = 75;

      // Date and Show info
      doc.fontSize(config.normalFontSize).font('Times-Bold');
      doc.text(`DATE: ${formattedTicket.date}`, TEXT_OFFSET, currentY);
      doc.fontSize(config.snoFontSize).font('Helvetica');
      const formattedTime = formattedTicket.currentTime || this.formatCurrentTime();
      doc.text(`S.No:${formattedTicket.ticketId}/${formattedTime}`, SNO_OFFSET + 12, currentY + 1);
      currentY += 15;

      // Movie name - with word wrapping
      doc.fontSize(config.normalFontSize).font('Times-Bold');
      doc.text(`FILM: ${formattedTicket.movieName}`, TEXT_OFFSET, currentY, {
        width: 160,
        align: 'left'
      });
      currentY += 25;

      doc.fontSize(config.normalFontSize).font('Helvetica');
      doc.text(`${formattedTicket.showClass} (${formattedTicket.showTime})`, TEXT_OFFSET, currentY);
      currentY += 18;

      // Seat info box
      this.drawBox(doc, LEFT_OFFSET, currentY, 170, 55);

      doc.fontSize(14).font('Times-Bold');
      doc.text(`CLASS : ${formattedTicket.seatClass}`, TEXT_OFFSET, currentY + 10, {
        width: 176,
        characterSpacing: -0.5
      });
      doc.fontSize(14).font('Times-Bold');
      doc.text(`SEAT  : ${formattedTicket.seatInfo}`, TEXT_OFFSET, currentY + 32);

      currentY += 60;

      // Price breakdown - compact horizontal layout (2x2 format)
      doc.fontSize(config.smallFontSize).font('Helvetica');
      const priceStartY = currentY;

      const netText = 'NET';
      const cgstText = 'CGST';
      const sgstText = 'SGST';
      const mcText = 'MC';

      const netTextWidth = doc.widthOfString(netText);
      const cgstTextWidth = doc.widthOfString(cgstText);
      const sgstTextWidth = doc.widthOfString(sgstText);
      const mcTextWidth = doc.widthOfString(mcText);

      const maxLeftTextWidth = Math.max(netTextWidth, sgstTextWidth);
      const maxRightTextWidth = Math.max(cgstTextWidth, mcTextWidth);

      const leftColonX = TEXT_OFFSET + maxLeftTextWidth;
      const rightColonX = TEXT_OFFSET + maxLeftTextWidth + 50 + maxRightTextWidth;

      // First row: NET and CGST
      doc.text(netText, TEXT_OFFSET, currentY);
      doc.text(':', leftColonX, currentY);
      const netValue = typeof formattedTicket.net === 'string' ? formattedTicket.net : formattedTicket.net.toFixed(2);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${netValue}`, leftColonX + 5, currentY);

      doc.font('Helvetica').text(cgstText, TEXT_OFFSET + maxLeftTextWidth + 50, currentY);
      doc.text(':', rightColonX, currentY);
      const cgstValue = typeof formattedTicket.cgst === 'string' ? formattedTicket.cgst : formattedTicket.cgst.toFixed(2);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${cgstValue}`, rightColonX + 5, currentY);

      currentY += 12;

      // Second row: SGST and MC
      doc.font('Helvetica').text(sgstText, TEXT_OFFSET, currentY);
      doc.text(':', leftColonX, currentY);
      const sgstValue = typeof formattedTicket.sgst === 'string' ? formattedTicket.sgst : formattedTicket.sgst.toFixed(2);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${sgstValue}`, leftColonX + 5, currentY);

      doc.font('Helvetica').text(mcText, TEXT_OFFSET + maxLeftTextWidth + 50, currentY);
      doc.text(':', rightColonX, currentY);
      const mcValue = typeof formattedTicket.mc === 'string' ? formattedTicket.mc : formattedTicket.mc.toFixed(2);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${mcValue}`, rightColonX + 5, currentY);
      currentY += 12;

      // TICKET COST
      const ticketCostFormatted = typeof formattedTicket.individualTicketPrice === 'string' 
        ? formattedTicket.individualTicketPrice 
        : formattedTicket.individualTicketPrice.toFixed(2);
      const ticketCostLabel = "TICKET COST (per seat):";
      const ticketCostAmount = `${rupeeSymbol}${ticketCostFormatted}`;

      doc.fontSize(config.normalFontSize).font('Times-Bold');
      const ticketCostLabelWidth = doc.widthOfString(ticketCostLabel);
      doc.fontSize(config.normalFontSize).font(getSafeFont(true));
      const ticketCostAmountWidth = doc.widthOfString(ticketCostAmount);

      doc.fontSize(config.normalFontSize).font('Times-Bold');
      doc.text(ticketCostLabel, TEXT_OFFSET, currentY);

      doc.fontSize(config.normalFontSize).font(getSafeFont(true));
      doc.text(ticketCostAmount, TEXT_OFFSET + ticketCostLabelWidth, currentY);
      doc.font('Helvetica');
      currentY += 18;

      // Total price box
      this.drawBox(doc, LEFT_OFFSET, priceStartY + 36, 170, 40);
      const totalText = "TOTAL:";
      const totalAmountValue = typeof formattedTicket.totalAmount === 'string' 
        ? formattedTicket.totalAmount 
        : formattedTicket.totalAmount.toString();
      const totalAmount = `${rupeeSymbol}${totalAmountValue}`;

      doc.fontSize(config.titleFontSize).font('Times-Bold');
      const totalTextWidth = doc.widthOfString(totalText);
      doc.fontSize(config.titleFontSize).font(getSafeFont(true));
      const totalAmountWidth = doc.widthOfString(totalAmount);

      const totalCombinedWidth = totalTextWidth + totalAmountWidth;
      const totalStartX = LEFT_OFFSET + (176 - totalCombinedWidth) / 2;
      const totalY = priceStartY + 51;

      doc.fontSize(config.titleFontSize).font('Times-Bold');
      doc.text(totalText, totalStartX, totalY);

      try {
        doc.fontSize(config.titleFontSize).font(getSafeFont(true));
      } catch (error) {
        doc.fontSize(config.titleFontSize).font('Times-Bold');
      }
      doc.text(totalAmount, totalStartX + totalTextWidth, totalY);

      // === STUB SECTION ===
      currentY = priceStartY + 86;
      currentY += 4.2;

      // === TEAR-OFF LINE ===
      this.drawRoundDotsLine(doc, LEFT_OFFSET, currentY, LEFT_OFFSET + 170, currentY);
      currentY += 5;

      // Theater name on one line in stub
      doc.fontSize(config.normalFontSize).font('Times-BoldItalic');
      const theaterNameText = formattedTicket.theaterName;
      const theaterNameWidth = doc.widthOfString(theaterNameText);
      const centerX = LEFT_OFFSET + 85;
      const theaterNameX = centerX - (theaterNameWidth / 2);
      doc.text(theaterNameText, theaterNameX, currentY);
      currentY += config.normalFontSize + 6;

      // Movie name with two-line support
      doc.fontSize(config.smallFontSize).font('Times-Bold');
      const stubMovieText = formattedTicket.movieName;
      const stubMovieTextWidth = doc.widthOfString(stubMovieText);
      const availableStubWidth = 150;

      currentY -= 1.2;

      if (stubMovieTextWidth <= availableStubWidth) {
        const stubMovieX = centerX - (stubMovieTextWidth / 2);
        doc.text(stubMovieText, stubMovieX, currentY);
      } else {
        const words = stubMovieText.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        const firstLine = words.slice(0, midPoint).join(' ');
        const secondLine = words.slice(midPoint).join(' ');

        const firstLineWidth = doc.widthOfString(firstLine);
        const secondLineWidth = doc.widthOfString(secondLine);
        const firstLineX = centerX - (firstLineWidth / 2);
        const secondLineX = centerX - (secondLineWidth / 2);

        doc.text(firstLine, firstLineX, currentY);
        doc.text(secondLine, secondLineX, currentY + config.smallFontSize + 2);
        currentY += config.smallFontSize + 2;
      }
      currentY += config.normalFontSize + 6;

      // Stub date and time
      currentY -= 3;
      doc.fontSize(config.smallFontSize).font('Times-Bold');
      const stubDateLabelText = 'DATE: ';
      const stubDateLabelWidth = doc.widthOfString(stubDateLabelText);
      const stubDateValueWidth = doc.widthOfString(`${formattedTicket.date}`);
      const stubDateTextWidth = stubDateLabelWidth + stubDateValueWidth;
      const stubDateX = centerX - (stubDateTextWidth / 2) - 50;
      const movedStubDateX = stubDateX + 3;
      doc.text(stubDateLabelText, movedStubDateX, currentY + 0.75);
      doc.font('Times-Bold').text(`${formattedTicket.date}`, movedStubDateX + stubDateLabelWidth + 0.9, currentY + 0.75);

      const stubDateEndX = movedStubDateX + stubDateLabelWidth + 0.9 + stubDateValueWidth;
      const stubShowLabelText = `${formattedTicket.showClass}: `;
      doc.font('Times-Bold');
      const stubShowLabelWidth = doc.widthOfString(stubShowLabelText);
      doc.text(stubShowLabelText, stubDateEndX + 10 - 7, currentY);
      doc.font('Helvetica').text(`${formattedTicket.showTime}`, stubDateEndX + 10 - 7 + stubShowLabelWidth, currentY);
      currentY += 15;
      currentY -= 0.6;

      // CLASS and SEAT on same line
      doc.fontSize(8).font('Helvetica');
      const classSeatText = `CLASS: ${formattedTicket.seatClass} | SEAT: ${formattedTicket.seatInfo}`;
      const classSeatWidth = doc.widthOfString(classSeatText);
      const classSeatX = centerX - (classSeatWidth / 2);
      doc.text(classSeatText, classSeatX, currentY);
      currentY += config.smallFontSize + 5;

      // Stub tax breakdown
      currentY += 1.5;
      const stubTaxY = currentY;
      const stubTaxStartX = LEFT_OFFSET + 21;
      const stubTaxSpacing = 35;

      doc.fontSize(config.smallFontSize);
      doc.font('Helvetica').text('NET:', stubTaxStartX, stubTaxY);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${netValue}`, stubTaxStartX, stubTaxY + 8);

      doc.font('Helvetica').text('CGST:', stubTaxStartX + stubTaxSpacing, stubTaxY);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${cgstValue}`, stubTaxStartX + stubTaxSpacing, stubTaxY + 8);

      doc.font('Helvetica').text('SGST:', stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${sgstValue}`, stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY + 8);

      doc.font('Helvetica').text('MC:', stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY);
      doc.font(getSafeFont(false)).text(`${rupeeSymbol}${mcValue}`, stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY + 8);

      currentY = stubTaxY + 20;

      // Stub ticket price
      const stubTicketCostLabel = "TICKET COST (per seat):";
      const stubTicketCostAmount = `${rupeeSymbol}${ticketCostFormatted}`;

      doc.fontSize(config.smallFontSize).font('Times-Bold');
      const stubTicketCostLabelWidth = doc.widthOfString(stubTicketCostLabel);
      doc.fontSize(config.smallFontSize).font(getSafeFont(true));
      const stubTicketCostAmountWidth = doc.widthOfString(stubTicketCostAmount);

      const stubTicketCostCombinedWidth = stubTicketCostLabelWidth + stubTicketCostAmountWidth;
      const stubTicketCostStartX = centerX - (stubTicketCostCombinedWidth / 2) - 0.6;

      doc.fontSize(config.smallFontSize).font('Times-Bold');
      doc.text(stubTicketCostLabel, stubTicketCostStartX, currentY);

      doc.fontSize(config.smallFontSize).font(getSafeFont(true));
      doc.text(stubTicketCostAmount, stubTicketCostStartX + stubTicketCostLabelWidth, currentY);
      currentY += config.smallFontSize + 5;

      // Stub total
      const stubTotalFontSize = config.normalFontSize + 2;
      const stubTotalText = "TOTAL:";
      const stubTotalAmount = `${rupeeSymbol}${totalAmountValue}`;

      doc.fontSize(stubTotalFontSize).font('Times-Bold');
      const stubTotalTextWidth = doc.widthOfString(stubTotalText);
      doc.fontSize(stubTotalFontSize).font(getSafeFont(true));
      const stubTotalAmountWidth = doc.widthOfString(stubTotalAmount);

      const stubTotalCombinedWidth = stubTotalTextWidth + stubTotalAmountWidth;
      const stubTotalStartX = centerX - (stubTotalCombinedWidth / 2) - 0.6;

      doc.fontSize(stubTotalFontSize).font('Times-Bold');
      doc.text(stubTotalText, stubTotalStartX, currentY);

      try {
        doc.fontSize(stubTotalFontSize).font(getSafeFont(true));
      } catch (error) {
        doc.fontSize(stubTotalFontSize).font('Times-Bold');
      }
      doc.text(stubTotalAmount, stubTotalStartX + stubTotalTextWidth, currentY);
      currentY += stubTotalFontSize + 5;

      // Stub S.No and print time
      const stubTicketId = `S.No: ${formattedTicket.ticketId}`;
      const stubPrintTime = formattedTime;

      doc.fontSize(6).font('Helvetica');
      doc.text(stubTicketId, LEFT_OFFSET - 5, currentY);

      const stubPrintTimeWidth = doc.widthOfString(stubPrintTime);
      const stubPrintTimeX = LEFT_OFFSET + 170 - stubPrintTimeWidth + 5;
      doc.text(stubPrintTime, stubPrintTimeX, currentY);

      // Finalize the PDF
      doc.end();

      stream.on('finish', () => {
        console.log(`[PRINT] PDF generated: ${outputPath}`);
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

