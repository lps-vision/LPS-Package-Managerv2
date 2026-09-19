import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Layers, RotateCcw, ArrowRight } from 'lucide-react';
import { GrandTotals } from '../types';

interface GrandTotalsBarProps {
  totals: GrandTotals;
  onExportSummary: () => void;
  onExportBulkRenew: () => void;
  customTotalDeposit?: number | null;
  onUpdateDeposit?: (val: number | null) => void;
}

export const GrandTotalsBar: React.FC<GrandTotalsBarProps> = ({
  totals,
  onExportSummary,
  onExportBulkRenew,
  customTotalDeposit,
  onUpdateDeposit,
}) => {
  // Local input string for seamless typing and editing
  const [localInput, setLocalInput] = useState<string>(() => {
    if (customTotalDeposit !== null && customTotalDeposit !== undefined) {
      return String(customTotalDeposit);
    }
    return totals.totalActualCollection > 0 ? totals.totalActualCollection.toFixed(2) : '';
  });

  // Sync input when custom deposit resets or period/standard total changes
  useEffect(() => {
    if (customTotalDeposit !== null && customTotalDeposit !== undefined) {
      setLocalInput(String(customTotalDeposit));
    } else {
      setLocalInput(totals.totalActualCollection > 0 ? totals.totalActualCollection.toFixed(2) : '');
    }
  }, [customTotalDeposit, totals.totalActualCollection]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalInput(val);
    if (val.trim() === '') {
      onUpdateDeposit?.(null);
    } else {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0) {
        onUpdateDeposit?.(parsed);
      }
    }
  };

  const handleReset = () => {
    onUpdateDeposit?.(null);
    setLocalInput(totals.totalPrice.toFixed(2));
  };

  const isCustom = customTotalDeposit !== null && customTotalDeposit !== undefined;
  const effectiveCollection = isCustom ? customTotalDeposit : totals.totalActualCollection;
  const lcoChanTheih = Number((effectiveCollection - totals.totalLcoSen).toFixed(2));
  const diff = Number((effectiveCollection - totals.totalPrice).toFixed(2));

  return (
    <div className="pt-6 pb-8 border-t border-gray-200 mt-6 space-y-5">
      {/* 3 Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: FEE KHAWN IN PAWISA CHHUN LUH ZAT (Replacing static GRAND TOTAL PRICE) */}
        <div className="bg-gradient-to-b from-blue-50/90 to-white border-2 border-blue-400/90 hover:border-blue-500 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="block text-xs font-black tracking-wider text-blue-950 uppercase">
                BILL KHAWN CHHUAH ZAT
              </span>
              {isCustom && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-950 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Standard bill amount-a dah lehna"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Standard-ah dah rawh</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-blue-700/90 font-medium mb-2">
              Fee khawn in pawisa an rawn chhun zat type rawh: (Fee khawn hlawh cut loin.)
            </p>

            {/* Input field with Rupee font symbol */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-900 font-black text-2xl font-sans">
                ₹
              </div>
              <input
                type="number"
                step="any"
                id="fee-khawn-input"
                value={localInput}
                onChange={handleInputChange}
                placeholder={totals.totalPrice.toFixed(2)}
                className="w-full bg-white border-2 border-blue-300 focus:border-blue-600 rounded-lg pl-9 pr-3 py-2 text-2xl sm:text-3xl font-black text-slate-950 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400/40 shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1.5 px-0.5">
              <span>Standard Bill: <strong className="font-mono text-slate-800">₹ {totals.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              <span>Subscribers: <strong className="font-mono text-slate-800">{totals.totalCustomers}</strong></span>
            </div>
          </div>

          {/* Dynamic LCO Chan Theih Zat from Typed Amount */}
          <div className="mt-3.5 pt-2.5 border-t border-blue-200 bg-blue-100/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:px-4 rounded-b-xl">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                LCO CHAN THEIH:
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight flex items-baseline gap-1 ${
                  lcoChanTheih < 0 ? 'text-red-600' : 'text-emerald-800'
                }`}
              >
                <span className="text-xl sm:text-2xl font-black font-sans">₹</span>
                <span>
                  {lcoChanTheih.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-blue-900 font-medium mt-0.5 flex items-center justify-between">
              <span>Chhun luh (₹ {effectiveCollection.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) - MSO Cut (₹ {totals.totalLcoSen.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              {lcoChanTheih < 0 && <span className="text-red-600 font-bold text-[10px]">MSO Cut tling lo</span>}
            </p>
          </div>
        </div>

        {/* Metric 2: GRAND TOTAL LCO HLAWH with Rupee Font */}
        <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="block text-xs font-black tracking-wider text-emerald-900 uppercase mb-1.5">
              GRAND TOTAL FOR LCO
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-sans">₹</span>
              <span>
                {totals.totalLcoHlawh.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <span className="text-xs text-emerald-800 mt-2 block font-semibold">
              PACK-1 (BST) (₹ 78.60) + Local (₹ 36.20) + Alakarte 8.47%
            </span>
          </div>

          <div className="mt-3 pt-2 border-t border-emerald-200/80 text-[11px] text-emerald-900 font-medium">
            Standard rate zira LCO hlawh bi (100% Bill khawn a nihin)
          </div>
        </div>

        {/* Metric 3: GRAND TOTAL LCO SEN with Rupee Font */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="block text-xs font-black tracking-wider text-slate-700 uppercase mb-1.5">
              GRAND TOTAL PORTAL (MSO CUT)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl sm:text-3xl font-black text-slate-600 font-sans">₹</span>
              <span>
                {totals.totalLcoSen.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <span className="text-xs text-slate-600 mt-2 block font-medium">
              PACK-1 (BST) (₹ 75.40) + Local (₹ 34.80) + Alakarte 91.53%
            </span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-medium">
            LPS / MSO hnena chhun luh ngei ngei tur bi
          </div>
        </div>
      </div>

      {/* Actual Money Handling Summary (Always visible with Rupee Fonts) */}
      <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row justify-around items-center gap-4 shadow-2xs">
        <div className="text-center">
          <span className="block text-[10px] font-bold text-blue-700 uppercase mb-0.5">
            Total Bill Khawn (Chhun Luh)
          </span>
          <div className="text-xl font-black text-blue-900 font-mono flex items-center justify-center gap-1">
            <span className="font-sans font-bold text-lg text-blue-800">₹</span>
            <span>
              {totals.totalActualCollection.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {totals.totalActualCollection === totals.totalPrice ? (
            <span className="text-[9px] text-blue-400 font-medium italic block">
              (Standard Price nen in-ang)
            </span>
          ) : (
            <span className="text-[9px] text-blue-600 font-semibold block">
              (Custom Chhun luh zat)
            </span>
          )}
        </div>

        <div className="h-8 w-px bg-blue-200 hidden sm:block"></div>

        <div className="text-center">
          <span className="block text-[10px] font-bold text-emerald-700 uppercase mb-0.5">
            LCO Chan Theih (Hlawh Tak Tak)
          </span>
          <div
            className={`text-xl font-black font-mono flex items-center justify-center gap-1 ${
              totals.totalActualNetProfit < 0 ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            <span className="font-sans font-bold text-lg">₹</span>
            <span>
              {totals.totalActualNetProfit.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-blue-200 hidden sm:block"></div>

        <div className="text-center">
          <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
            Standard vs Chhun Luh Danglamna
          </span>
          <div
            className={`text-sm font-bold font-mono ${
              totals.totalActualCollection === totals.totalPrice
                ? 'text-slate-400'
                : totals.totalActualCollection > totals.totalPrice
                ? 'text-emerald-600'
                : 'text-red-600'
            }`}
          >
            {diff > 0 ? '+₹ ' : diff < 0 ? '-₹ ' : '₹ '}
            {Math.abs(diff).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
        {/* Main Export Button matching Screenshot 1 */}
        <button
          type="button"
          id="export-lco-share-btn"
          onClick={onExportSummary}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-white border border-slate-400 hover:border-slate-800 hover:bg-slate-50 text-slate-900 font-bold text-sm sm:text-base rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>Final Export Excel Siam - LCO Share nen (.xls)</span>
          <Download className="w-4 h-4 ml-1 text-slate-500" />
        </button>

        {/* LPS BulkPackageRenew Format Export */}
        <button
          type="button"
          id="export-bulk-renew-btn"
          onClick={onExportBulkRenew}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Layers className="w-5 h-5" />
          <span>LPS Bulk Renew Format Export (.xls)</span>
          <Download className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
