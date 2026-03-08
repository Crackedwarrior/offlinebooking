/**
 * ClassIncomeBreakdown Component
 * Displays class-wise income breakdown table with booking and online counts/amounts
 */

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ShowTime } from '@/store/bookingStore';
import type { ShowInfo, ClassCountRow } from '@/types/bookingHistory';
import type { BookingAccentTheme } from '../utils/accentThemes';

interface ClassIncomeBreakdownProps {
  selectedShow: ShowTime | null;
  showOrder: ShowInfo[];
  classCountsData: ClassCountRow[];
  selectedClass: string | null;
  getPriceForClass: (classLabel: string) => number;
  onClassSelect: (classLabel: string | null) => void;
  accentTheme: BookingAccentTheme;
  selectedDate: string;
}

export const ClassIncomeBreakdown: React.FC<ClassIncomeBreakdownProps> = ({
  selectedShow,
  showOrder,
  classCountsData,
  selectedClass,
  getPriceForClass,
  onClassSelect,
  accentTheme,
  selectedDate
}) => {
  const classRows = useMemo(() => {
    return classCountsData.map(row => {
      const bookingAmount = row.regular * getPriceForClass(row.label);
      const onlineAmount = row.bms * getPriceForClass(row.label);
      return {
        ...row,
        bookingAmount,
        onlineAmount,
        totalAmount: bookingAmount + onlineAmount
      };
    });
  }, [classCountsData, getPriceForClass]);

  // Calculate totals
  const totals = useMemo(() => {
    return classRows.reduce(
      (acc, row) => ({
        booking: acc.booking + row.regular,
        online: acc.online + row.bms,
        seats: acc.seats + row.total,
        bookingIncome: acc.bookingIncome + row.bookingAmount,
        onlineIncome: acc.onlineIncome + row.onlineAmount,
        totalIncome: acc.totalIncome + row.totalAmount
      }),
      {
        booking: 0,
        online: 0,
        seats: 0,
        bookingIncome: 0,
        onlineIncome: 0,
        totalIncome: 0
      }
    );
  }, [classRows]);

  const accentRowColor = accentTheme.sidebarBackground || '#EEF2FF';
  const accentBorder = accentTheme.sidebarBorder || '#9AE6B4';
  const accentText = accentTheme.sidebarText || '#047857';
  const accentButton = accentTheme.sidebarButton || '#059669';

  return (
    <div className="p-0 overflow-x-hidden -mt-1">
      <div 
        className="border rounded-[28px] shadow-sm overflow-hidden"
        style={{
          backgroundColor: accentTheme.cardSurface,
          borderColor: accentTheme.surfaceBorder
        }}
      >
        <div className="divide-y" style={{ borderColor: accentTheme.surfaceBorder + '40' }}>
          {classRows.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-[1.2fr_2.4fr] items-center px-4 sm:px-5 py-3 sm:py-3.5 transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  selectedClass === row.label
                    ? accentRowColor
                    : i % 2 === 0
                      ? accentTheme.cardSurface
                      : accentTheme.sidebarBackground + '40'
              }}
              onClick={() => onClassSelect(selectedClass === row.label ? null : row.label)}
            >
              <div className="text-sm sm:text-base font-semibold uppercase tracking-wide" style={{ color: accentText }}>
                {row.label}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
                <div>
                  <div className="uppercase tracking-wide font-semibold" style={{ color: accentText }}>
                    Booking ({row.regular})
                  </div>
                  <div className="text-base font-bold" style={{ color: accentButton }}>
                    ₹{row.bookingAmount.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-wide font-semibold" style={{ color: accentText }}>
                    Online ({row.bms})
                  </div>
                  <div className="text-base font-bold" style={{ color: accentButton }}>
                    ₹{row.onlineAmount.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-wide font-semibold" style={{ color: accentText }}>
                    Total ({row.total})
                  </div>
                  <div className="text-base font-bold" style={{ color: accentButton }}>
                    ₹{row.totalAmount.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3.5 -mx-4">
          <SummaryFooter totals={totals} accentTheme={accentTheme} selectedDate={selectedDate} />
        </div>
      </div>
    </div>
  );
};

const SummaryFooter = ({
  totals,
  accentTheme,
  selectedDate
}: {
  totals: {
    booking: number;
    online: number;
    seats: number;
    bookingIncome: number;
    onlineIncome: number;
    totalIncome: number;
  };
  accentTheme: BookingAccentTheme;
  selectedDate: string;
}) => {
  const formattedDate = useMemo(() => {
    try {
      return format(new Date(selectedDate), 'dd MMM yyyy');
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const summaryBlocks = [
    { label: 'BOOKING', seats: totals.booking, income: totals.bookingIncome },
    { label: 'ONLINE', seats: totals.online, income: totals.onlineIncome },
    { label: 'TOTAL', seats: totals.seats, income: totals.totalIncome }
  ];

  const cardBorder = accentTheme.sidebarBorder;
  const accentText = accentTheme.sidebarText;
  const accentButton = accentTheme.sidebarButton;
  const accentBg = accentTheme.sidebarBackground;
  const lightGradient = `linear-gradient(135deg, ${accentBg} 0%, ${accentTheme.cardSurface} 60%, ${accentBg} 100%)`;

  return (
    <div className="px-4 pb-3">
      <div
        className="w-full border shadow-sm rounded-b-[28px]"
        style={{ 
          borderColor: accentTheme.surfaceBorder, 
          background: lightGradient 
        }}
      >
        <div className="flex flex-wrap items-center gap-4 p-3.5 sm:p-5">
          <div
            className="flex flex-col justify-center rounded-[28px] px-6 py-4 shadow-sm"
            style={{ 
              background: accentTheme.cardSurface, 
              border: `1px solid ${cardBorder}`, 
              minWidth: '210px' 
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.45em] mb-1.5" style={{ color: accentText }}>
              Grand Total
            </p>
            <p className="text-3xl font-black" style={{ color: accentButton }}>{formattedDate}</p>
          </div>

          {summaryBlocks.map(block => (
            <div
              key={block.label}
              className="flex-1 min-w-[150px] rounded-[26px] px-5 py-3.5 text-center shadow-sm"
              style={{ 
                border: `1px solid ${cardBorder}`,
                background: accentTheme.cardSurface
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.4em] mb-0.5" style={{ color: accentText }}>
                {block.label} ({block.seats.toLocaleString('en-IN')})
              </p>
              <p className="text-3xl font-bold" style={{ color: accentButton }}>{formatCurrency(block.income)}</p>
            </div>
          ))}

          <div
            className="flex flex-col justify-center text-white rounded-[34px] px-6 py-4 shadow-lg min-w-[240px]"
            style={{
              background: `linear-gradient(120deg, ${accentButton}, ${accentButton}CC)`
            }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/80 mb-1.5">Total Revenue</p>
            <p className="text-4xl font-black tracking-wide">{formatCurrency(totals.totalIncome)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassIncomeBreakdown;
