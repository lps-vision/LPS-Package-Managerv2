import React, { useState, useMemo, useEffect } from 'react';
import { X, Calculator, Percent, Layers, Tv, ArrowRight, RotateCcw, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import {
  BST_PRICE,
  BST_LCO_SHARE,
  BST_MSO_CUT,
  LOCAL_PRICE,
  LOCAL_LCO_SHARE,
  LOCAL_MSO_CUT,
  ALACARTE_LCO_COMMISSION_PERCENT,
  ALACARTE_MSO_PERCENT,
} from '../data/defaultChannels';
import { GrandTotals, CustomerSummary } from '../types';

interface BillCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTotals?: GrandTotals;
  currentAlacarteSum?: number;
  customers?: CustomerSummary[];
}

export const BillCalculatorModal: React.FC<BillCalculatorModalProps> = ({
  isOpen,
  onClose,
  currentTotals,
  currentAlacarteSum = 0,
  customers = [],
}) => {
  // Derive current customer list / Excel stats
  const excelStats = useMemo(() => {
    if (!customers || customers.length === 0) {
      const subs = currentTotals?.totalCustomers || 0;
      const local = currentTotals?.localAddonCount ?? subs;
      const sum = currentAlacarteSum || 0;
      return {
        totalSubs: subs,
        localSubs: local,
        alacarteCount: sum > 0 ? 1 : 0,
        alacarteCustomersCount: sum > 0 ? 1 : 0,
        alacarteSum: sum,
        avgRate: sum > 0 ? sum : 22.42,
      };
    }

    const totalSubs = customers.length;
    const localSubs = customers.filter((c) => c.hasLocalAddon).length;
    const alacarteCount = customers.reduce((sum, c) => sum + (c.selectedChannels?.length || 0), 0);
    const alacarteCustomersCount = customers.filter((c) => c.selectedChannels && c.selectedChannels.length > 0).length;
    const alacarteSum = currentAlacarteSum || 0;
    const avgRate = alacarteCount > 0 ? Number((alacarteSum / alacarteCount).toFixed(2)) : 22.42;

    return {
      totalSubs,
      localSubs,
      alacarteCount,
      alacarteCustomersCount,
      alacarteSum,
      avgRate,
    };
  }, [customers, currentTotals, currentAlacarteSum]);

  // Calculator Interactive Inputs (Only subscriber count, local count, and a-la-carte count)
  const [calcSubscribers, setCalcSubscribers] = useState<number>(() => {
    return excelStats.totalSubs > 0 ? excelStats.totalSubs : 100;
  });

  const [calcLocalCount, setCalcLocalCount] = useState<number>(() => {
    return excelStats.totalSubs > 0 ? excelStats.localSubs : 100;
  });

  // Alacarte Channels Zat (Count) only - no amount calculation mode
  const [calcAlacarteCount, setCalcAlacarteCount] = useState<number>(() => {
    return excelStats.totalSubs > 0 ? excelStats.alacarteCount : 20;
  });

  // Automatically synchronize with current app / excel data when modal opens
  useEffect(() => {
    if (isOpen && excelStats.totalSubs > 0) {
      setCalcSubscribers(excelStats.totalSubs);
      setCalcLocalCount(excelStats.localSubs);
      setCalcAlacarteCount(excelStats.alacarteCount);
    }
  }, [isOpen, excelStats]);

  // Calculate live results
  const calculation = useMemo(() => {
    const subs = Math.max(0, calcSubscribers);
    const localSubs = Math.min(subs, Math.max(0, calcLocalCount));
    const bstOnlySubs = Math.max(0, subs - localSubs);

    const alacarteCount = Math.max(0, calcAlacarteCount);

    // Total Ala-carte amount calculated strictly from count
    let alacarte = 0;
    if (alacarteCount === excelStats.alacarteCount && excelStats.alacarteSum > 0) {
      alacarte = excelStats.alacarteSum;
    } else {
      const rate = excelStats.avgRate > 0 ? excelStats.avgRate : 22.42;
      alacarte = Number((alacarteCount * rate).toFixed(2));
    }

    // 1. BST
    const totalBstPrice = subs * BST_PRICE;
    const bstLcoShareTotal = subs * BST_LCO_SHARE;
    const bstMsoCutTotal = subs * BST_MSO_CUT;

    // 2. Local
    const totalLocalPrice = localSubs * LOCAL_PRICE;
    const localLcoShareTotal = localSubs * LOCAL_LCO_SHARE;
    const localMsoCutTotal = localSubs * LOCAL_MSO_CUT;

    // 3. Ala-carte
    const alacarteLcoShareTotal = (alacarte * ALACARTE_LCO_COMMISSION_PERCENT) / 100;
    const alacarteMsoCutTotal = (alacarte * ALACARTE_MSO_PERCENT) / 100;

    // Grand Totals
    const grandTotalPrice = totalBstPrice + totalLocalPrice + alacarte;
    const grandLcoShare = bstLcoShareTotal + localLcoShareTotal + alacarteLcoShareTotal;
    const grandMsoCut = bstMsoCutTotal + localMsoCutTotal + alacarteMsoCutTotal;

    const lcoPercent = grandTotalPrice > 0 ? (grandLcoShare / grandTotalPrice) * 100 : 0;
    const msoPercent = grandTotalPrice > 0 ? (grandMsoCut / grandTotalPrice) * 100 : 0;

    return {
      subs,
      localSubs,
      bstOnlySubs,
      alacarteCount,
      alacarte,
      totalBstPrice,
      bstLcoShareTotal,
      bstMsoCutTotal,
      totalLocalPrice,
      localLcoShareTotal,
      localMsoCutTotal,
      alacarteLcoShareTotal,
      alacarteMsoCutTotal,
      grandTotalPrice,
      grandLcoShare,
      grandMsoCut,
      lcoPercent,
      msoPercent,
    };
  }, [calcSubscribers, calcLocalCount, calcAlacarteCount, excelStats]);

  const handleSyncCurrentData = () => {
    if (excelStats.totalSubs > 0) {
      setCalcSubscribers(excelStats.totalSubs);
      setCalcLocalCount(excelStats.localSubs);
      setCalcAlacarteCount(excelStats.alacarteCount);
    }
  };

  const handleResetDefaults = () => {
    setCalcSubscribers(100);
    setCalcLocalCount(100);
    setCalcAlacarteCount(20);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#212529] text-white border-b border-[#343a40] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#28a745] flex items-center justify-center text-white shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>LPS Bill Chhut Dan & Commission Calculator</span>
                <span className="text-[10px] uppercase font-bold bg-[#007bff] text-white px-2 py-0.5 rounded">
                  Official Rate
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                LPS Cable TV bill insem dan leh LCO Share / MSO Cut chhutna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          
          {/* 1. Official Bill Split Rules Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                <span>LPS Official Bill Chhut Dan Rules (Standard Rate)</span>
              </h4>
              <span className="text-[11px] text-gray-500 font-medium">TRAI / LPS Compliant</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: BST */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5 text-blue-700" />
                    <span>1. BST (₹ {BST_PRICE.toFixed(0)}/-)</span>
                  </span>
                  <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">
                    Mandatory
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-blue-100">
                    <span className="text-gray-600">LCO Share:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      ₹ {BST_LCO_SHARE.toFixed(2)} (51.04%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">MSO Cut:</span>
                    <span className="font-bold text-gray-800 font-mono">
                      ₹ {BST_MSO_CUT.toFixed(2)} (48.96%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: LOCAL */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>2. LOCAL (₹ {LOCAL_PRICE.toFixed(0)}/-)</span>
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                    Add-on Pack
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                    <span className="text-gray-600">LCO Share:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      ₹ {LOCAL_LCO_SHARE.toFixed(2)} (50.99% ~ 51%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">MSO Cut:</span>
                    <span className="font-bold text-gray-800 font-mono">
                      ₹ {LOCAL_MSO_CUT.toFixed(2)} (49.01%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: A-LA-CARTE */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-700" />
                    <span>3. Ala-carte Channel</span>
                  </span>
                  <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded">
                    Per Channel
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-purple-100">
                    <span className="text-gray-600">LCO Share:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {ALACARTE_LCO_COMMISSION_PERCENT}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">Broadcaster / MSO:</span>
                    <span className="font-bold text-gray-800 font-mono">
                      {ALACARTE_MSO_PERCENT}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Per-Customer Example Pill Bar */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">Per Customer Standard Example:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="px-2.5 py-1 rounded bg-white border border-gray-300 shadow-2xs">
                <strong>BST Only (₹ 154)</strong>: LCO ₹ 78.60 &bull; MSO ₹ 75.40
              </span>
              <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-2xs">
                <strong>BST + Local (₹ 225)</strong>: LCO ₹ 114.80 &bull; MSO ₹ 110.20
              </span>
            </div>
          </div>

          {/* 2. Interactive Calculator Section */}
          <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Interactive Bill Calculator</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Subscriber zat leh Ala-carte hralh zat thlak la, LCO Hlawh leh MSO Cut zat chhut chhuak rawh
                </p>
              </div>

              <div className="flex items-center gap-2">
                {excelStats.totalSubs > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncCurrentData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#007bff] hover:bg-[#0069d9] rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Current App Data hmang rawh ({excelStats.totalSubs} subs &bull; {excelStats.alacarteCount} a-la-carte)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  title="Reset to 100 subs default"
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {/* Box 1: BST */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 shadow-2xs">
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  1. Total Subscribers zat (BST)
                </label>
                <input
                  type="number"
                  min="0"
                  value={calcSubscribers}
                  onChange={(e) => setCalcSubscribers(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-[10.5px] text-gray-600 mt-1.5 font-mono">
                  ₹ {BST_PRICE.toFixed(0)} x {calcSubscribers} = ₹ {(calcSubscribers * BST_PRICE).toFixed(2)}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  LCO: ₹ {(calcSubscribers * BST_LCO_SHARE).toFixed(2)} &bull; MSO: ₹ {(calcSubscribers * BST_MSO_CUT).toFixed(2)}
                </div>
              </div>

              {/* Box 2: Local */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  2. Local Add-on nei zat (₹ 71)
                </label>
                <input
                  type="number"
                  min="0"
                  max={calcSubscribers}
                  value={calcLocalCount}
                  onChange={(e) => setCalcLocalCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-[10.5px] text-emerald-800 mt-1.5 font-mono">
                  ₹ {LOCAL_PRICE.toFixed(0)} x {calcLocalCount} = ₹ {(calcLocalCount * LOCAL_PRICE).toFixed(2)}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  LCO: ₹ {(calcLocalCount * LOCAL_LCO_SHARE).toFixed(2)} &bull; MSO: ₹ {(calcLocalCount * LOCAL_MSO_CUT).toFixed(2)}
                </div>
              </div>

              {/* Box 3: Ala-carte (Channels zat chhut luhna, Amount nilo in) */}
              <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-3 shadow-2xs">
                <label className="block text-xs font-bold text-purple-950 mb-1">
                  3. Ala-carte ka neih zat
                </label>
                <input
                  type="number"
                  min="0"
                  value={calcAlacarteCount}
                  onChange={(e) => setCalcAlacarteCount(Number(e.target.value) || 0)}
                  placeholder="Ala-carte channels hralh zat"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-mono font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="text-[10.5px] text-purple-900 mt-1.5 font-mono font-semibold">
                  Ala-carte: ₹ {calculation.alacarte.toFixed(2)} ({calcAlacarteCount} channels)
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  LCO (8.47%): ₹ {calculation.alacarteLcoShareTotal.toFixed(2)} &bull; MSO (91.53%): ₹ {calculation.alacarteMsoCutTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Current Excel / Customer List Data Pill Badge */}
            {excelStats.totalSubs > 0 && (
              <div className="mt-3 px-3 py-2 bg-purple-50/80 border border-purple-200/80 rounded-lg text-xs text-purple-900 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-purple-950">📊 Excel / App Data:</span>
                  <span>
                    Subscribers <strong>{excelStats.totalSubs}</strong>, Local <strong>{excelStats.localSubs}</strong>, Ala-carte channels <strong>{excelStats.alacarteCount}</strong> {excelStats.alacarteCustomersCount > 0 ? `(Customer ${excelStats.alacarteCustomersCount}-in an thlang)` : ''}
                  </span>
                </div>
                <div className="font-mono text-purple-950 font-bold text-[11px]">
                  Excel Ala-carte: ₹ {excelStats.alacarteSum.toFixed(2)}
                </div>
              </div>
            )}

            {/* Live Calculated Results Card */}
            <div className="mt-5 bg-[#212529] text-white rounded-xl p-4 sm:p-5 shadow-lg">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Calculated Results Summary</span>
                <span className="text-emerald-400 font-mono text-[11px]">
                  {calculation.subs} Subscribers Breakdown
                </span>
              </div>

              {/* 3 Large Big-Number Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-gray-700">
                {/* Metric 1: Total Bill */}
                <div className="bg-[#2b3035] rounded-lg p-3 border border-gray-700">
                  <span className="text-[11px] font-semibold text-gray-300 block">TOTAL BILLING</span>
                  <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ₹ {calculation.grandTotalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    BST + Local + Ala-carte ({calculation.alacarteCount} ch)
                  </span>
                </div>

                {/* Metric 2: LCO Share */}
                <div className="bg-[#1e4620]/60 rounded-lg p-3 border border-emerald-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-300 block">TOTAL LCO SHARE</span>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                      {calculation.lcoPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                    ₹ {calculation.grandLcoShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-emerald-200/80 mt-0.5 block">
                    51.04% BST + 50.99% Local + 8.47% Ala-carte
                  </span>
                </div>

                {/* Metric 3: MSO Cut */}
                <div className="bg-[#3a2020]/60 rounded-lg p-3 border border-red-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-300 block">TOTAL PORTAL CUT</span>
                    <span className="text-[10px] font-bold bg-rose-700 text-white px-1.5 py-0.2 rounded">
                      {calculation.msoPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-rose-400 mt-1 font-mono">
                    ₹ {calculation.grandMsoCut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-rose-200/80 mt-0.5 block">
                    48.96% BST + 49.01% Local + 91.53% Ala-carte
                  </span>
                </div>
              </div>

              {/* Detailed Split Breakdown Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                <div className="text-gray-300">
                  <div className="font-semibold text-gray-400">BST ({calculation.subs} subs):</div>
                  <div className="font-mono text-[11px]">
                    LCO: <span className="text-emerald-400 font-bold">₹ {calculation.bstLcoShareTotal.toFixed(2)}</span> &bull; MSO: <span className="text-rose-400">₹ {calculation.bstMsoCutTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-gray-300">
                  <div className="font-semibold text-gray-400">Local ({calculation.localSubs} subs):</div>
                  <div className="font-mono text-[11px]">
                    LCO: <span className="text-emerald-400 font-bold">₹ {calculation.localLcoShareTotal.toFixed(2)}</span> &bull; MSO: <span className="text-rose-400">₹ {calculation.localMsoCutTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-gray-300">
                  <div className="font-semibold text-gray-400">Ala-carte ({calculation.alacarteCount} channels &bull; ₹ {calculation.alacarte.toFixed(2)}):</div>
                  <div className="font-mono text-[11px]">
                    LCO (8.47%): <span className="text-emerald-400 font-bold">₹ {calculation.alacarteLcoShareTotal.toFixed(2)}</span> &bull; MSO (91.53%): <span className="text-rose-400">₹ {calculation.alacarteMsoCutTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Split Bar Visual */}
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="flex justify-between text-[11px] text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    LCO Share: {calculation.lcoPercent.toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                    MSO Cut: {calculation.msoPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, calculation.lcoPercent))}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, calculation.msoPercent))}%` }}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            He calculation formula hi application-ah hman mek a ni.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#007bff] hover:bg-[#0069d9] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
