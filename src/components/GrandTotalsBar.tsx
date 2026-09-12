import React from 'react';
import { Download, FileSpreadsheet, Layers } from 'lucide-react';
import { GrandTotals } from '../types';

interface GrandTotalsBarProps {
  totals: GrandTotals;
  onExportSummary: () => void;
  onExportBulkRenew: () => void;
}

export const GrandTotalsBar: React.FC<GrandTotalsBarProps> = ({
  totals,
  onExportSummary,
  onExportBulkRenew,
}) => {
  return (
    <div className="pt-6 pb-8 border-t border-gray-200 mt-6 space-y-5">
      {/* 3 Metrics Matching Screenshot 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: GRAND TOTAL PRICE */}
        <div className="bg-white border border-slate-300 rounded-xl p-4 sm:p-5 shadow-2xs">
          <span className="block text-xs font-black tracking-wider text-slate-500 uppercase mb-1.5">
            GRAND TOTAL PRICE
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-baseline gap-1 font-mono">
            <span className="text-base sm:text-lg font-bold text-slate-600 font-sans">Rs</span>
            <span>{totals.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-xs text-slate-600 mt-1.5 block font-medium">
            Subscribers {totals.totalCustomers} ({totals.localAddonCount ?? totals.totalCustomers} Local Add-on &bull; {totals.bstOnlyCount ?? 0} BST chauh)
          </span>
        </div>

        {/* Metric 2: GRAND TOTAL LCO HLAWH */}
        <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-4 sm:p-5 shadow-2xs">
          <span className="block text-xs font-black tracking-wider text-emerald-900 uppercase mb-1.5">
            GRAND TOTAL LCO HLAWH
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight flex items-baseline gap-1 font-mono">
            <span className="text-base sm:text-lg font-bold text-emerald-700 font-sans">Rs</span>
            <span>{totals.totalLcoHlawh.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-xs text-emerald-800 mt-1.5 block font-semibold">
            BST (Rs 78.60) + Local (Rs 36.20) + Alakarte 8.47%
          </span>
        </div>

        {/* Metric 3: GRAND TOTAL LCO SEN */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 sm:p-5 shadow-2xs">
          <span className="block text-xs font-black tracking-wider text-slate-600 uppercase mb-1.5">
            GRAND TOTAL LCO SEN
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1 font-mono">
            <span className="text-base sm:text-lg font-bold text-slate-500 font-sans">Rs</span>
            <span>{totals.totalLcoSen.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-xs text-slate-600 mt-1.5 block font-medium">
            BST (Rs 75.40) + Local (Rs 34.80) + Alakarte 91.53%
          </span>
        </div>
      </div>

      {/* Actual Money Handling Summary (Always visible now) */}
      <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row justify-around items-center gap-4 shadow-2xs">
        <div className="text-center">
          <span className="block text-[10px] font-bold text-blue-600 uppercase mb-0.5">Total Bill Khawn</span>
          <div className="text-xl font-black text-blue-900 font-mono">
            Rs {totals.totalActualCollection.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {totals.totalActualCollection === totals.totalPrice && (
            <span className="text-[9px] text-blue-400 font-medium italic block">(Standard Price)</span>
          )}
        </div>
        <div className="h-8 w-px bg-blue-200 hidden sm:block"></div>
        <div className="text-center">
          <span className="block text-[10px] font-bold text-emerald-600 uppercase mb-0.5">Total Net Profit (Hlawh Tak Tak)</span>
          <div className={`text-xl font-black font-mono ${totals.totalActualNetProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            Rs {totals.totalActualNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="h-8 w-px bg-blue-200 hidden sm:block"></div>
        <div className="text-center">
           <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Standard vs Actual Difference</span>
           <div className={`text-sm font-bold ${totals.totalActualCollection === totals.totalPrice ? 'text-slate-400' : 'text-slate-700'}`}>
              {totals.totalActualCollection > totals.totalPrice ? '+' : ''}
              {(totals.totalActualCollection - totals.totalPrice).toFixed(2)}
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
          <span>Final Export Excel Siam - LCO Share nen</span>
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
          <span>LPS Bulk Renew Format Export (12-Columns)</span>
          <Download className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
