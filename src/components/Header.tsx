import React from 'react';
import { Sliders, Calculator, User, BookOpen, Printer } from 'lucide-react';
import { CustomerSummary } from '../types';

interface HeaderProps {
  onClearData?: () => void;
  onOpenChannelManager: () => void;
  onOpenBillCalculator: () => void;
  onOpenTutorial?: () => void;
  onOpenPrintView?: () => void;
  basePrice: number;
  customerCount: number;
  channelCount?: number;
  franchiseeName?: string | null;
  selectedCustomer?: CustomerSummary | null;
  onSelectCustomerClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onClearData,
  onOpenChannelManager,
  onOpenBillCalculator,
  onOpenTutorial,
  onOpenPrintView,
  basePrice,
  customerCount,
  channelCount,
  franchiseeName,
  selectedCustomer,
  onSelectCustomerClick,
}) => {
  return (
    <header className="bg-[#212529] border-b border-[#343a40] text-white sticky top-0 z-30 shadow-md">
      <div className="w-full max-w-[98%] 2xl:max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/15">
            <img
              src="/lps_fee_icon.png"
              alt="LPS Icon"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                LPS Package Manager
              </h1>
              {franchiseeName ? (
                <span className="hidden sm:inline-block text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                  {franchiseeName}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-300 font-medium">
              LPS Cable TV Subscriber Channel Thlanna & LCO Commission Calculator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs sm:text-[13px]">
          {/* Selected Customer in Toolbar */}
          {selectedCustomer && (
            <button
              type="button"
              onClick={onSelectCustomerClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2b3035] border border-cyan-400/60 hover:border-cyan-300 text-cyan-200 transition-colors shadow-2xs cursor-pointer"
              title="Customer thlan mek (Hmet la customer channel thlanna ah a kal ang)"
            >
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs text-slate-300 hidden sm:inline font-semibold">Selected:</span>
              <span className="font-bold text-white text-xs sm:text-[13px] max-w-[130px] md:max-w-[180px] truncate">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.subscriberCode && (
                <span className="font-mono text-xs font-bold text-cyan-200 bg-cyan-950/90 border border-cyan-700 px-1.5 py-0.5 rounded leading-none">
                  {selectedCustomer.subscriberCode}
                </span>
              )}
            </button>
          )}

          {/* Subscribers Count */}
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#2b3035] text-slate-200 border border-slate-700 shadow-2xs font-semibold">
            Subscribers: <strong className="ml-1 text-white font-mono font-bold">{customerCount}</strong>
          </span>

          {/* Active Channels */}
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-700 shadow-2xs font-semibold" title="Active A-la-carte channels with custom rates">
            Active Channels: <strong className="ml-1 text-emerald-100 font-mono font-bold">{channelCount ?? 110}</strong>
          </span>

          {/* Base Pack */}
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#2b3035] text-amber-300 border border-amber-800 shadow-2xs font-semibold">
            Base Pack: <strong className="ml-1 text-white font-mono font-bold">₹ {basePrice.toFixed(2)}</strong>
          </span>

          {/* Upload Channel Price Button (Blue button matching PayTV) */}
          <button
            type="button"
            id="open-channel-manager-upload-btn"
            onClick={onOpenChannelManager}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold text-white bg-[#007bff] hover:bg-[#0069d9] rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Upload Channel Price / Rates</span>
          </button>

          {/* Bill Chhut Dan & Calculator Button */}
          <button
            type="button"
            id="open-bill-calculator-btn"
            onClick={onOpenBillCalculator}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold text-white bg-[#28a745] hover:bg-[#218838] rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="LPS Bill Chhut Dan Rules & Calculator"
          >
            <Calculator className="w-4 h-4" />
            <span>Bill Calculator</span>
          </button>

          {/* Print View Button */}
          {onOpenPrintView && customerCount > 0 && (
            <button
              type="button"
              id="header-print-view-btn"
              onClick={onOpenPrintView}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold text-slate-800 bg-white hover:bg-slate-100 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Customer list leh bill totals print / PDF turin tab tharah hawng rawh"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print View</span>
            </button>
          )}

          {/* Tutorial / Hman Dan Guide Button */}
          {onOpenTutorial && (
            <button
              type="button"
              id="open-tutorial-btn"
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-bold text-amber-200 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/80 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Hman dan Tutorial & Hrilhfiahna (.txt file)"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Tutorial</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
