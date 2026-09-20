import React, { useState, useMemo } from 'react';
import { X, Download, FileSpreadsheet, CheckCircle2, Sliders, Table, Info, FolderDown, HelpCircle } from 'lucide-react';
import { CustomerSummary, SubscriptionDateSettings } from '../types';
import { exportBulkPackageRenewExcel, SaveFileResult } from '../utils/excelExporter';

interface BulkRenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerSummary[];
  fileName?: string;
  subscriptionSettings?: SubscriptionDateSettings;
  onExportSuccess?: (res: SaveFileResult) => void;
  onOpenDownloadGuide?: () => void;
}

export const BulkRenewModal: React.FC<BulkRenewModalProps> = ({
  isOpen,
  onClose,
  customers,
  fileName,
  subscriptionSettings,
  onExportSuccess,
  onOpenDownloadGuide,
}) => {
  const [basePackageName, setBasePackageName] = useState<string>('PACK-1 (BST)');
  const [typeColHeader, setTypeColHeader] = useState<'Type (Package/Channel)' | 'Type(Package/Channel)'>('Type (Package/Channel)');
  const [pkgColHeader, setPkgColHeader] = useState<'PackageChannelName' | 'Name (Package/Channel)'>('PackageChannelName');
  const [subTypeHeader, setSubTypeHeader] = useState<'SubscriptionType(Day/Month/Year)' | 'SubscriptionType(Day/Month)' | 'SubscriptionType(Days/Month)'>('SubscriptionType(Day/Month/Year)');
  const [ncfColHeader, setNcfColHeader] = useState<'NetworkCapacityFees' | 'NetworkCapacityFee'>('NetworkCapacityFees');
  const [sheetName, setSheetName] = useState<string>('Sheet1');
  const [localPackageName, setLocalPackageName] = useState<string>('LPS LOCALS');
  const [hdPackageName, setHdPackageName] = useState<string>('LPS HD');
  const [includeLpsHd, setIncludeLpsHd] = useState<'none' | 'with-locals' | 'hd-only' | 'all'>('none');
  const [includeBillCollected, setIncludeBillCollected] = useState<boolean>(false);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    let totalLocalRows = 0;
    let totalHdRows = 0;
    let totalChannelRows = 0;
    for (const c of customers) {
      const isLocal = c.hasLocalAddon !== false;
      if (isLocal) {
        totalLocalRows++;
      }
      const isHd =
        includeLpsHd === 'all' ||
        (includeLpsHd === 'with-locals' && isLocal) ||
        (includeLpsHd !== 'none' &&
          (c.hasLpsHd ||
            c.selectedChannels.some(
              (ch) => ch.toUpperCase().includes(' HD') || ch.toUpperCase().endsWith('-HD')
            )));
      if (isHd) {
        totalHdRows++;
      }
      totalChannelRows += c.selectedChannels.length;
    }
    const totalRows = totalCustomers + totalLocalRows + totalHdRows + totalChannelRows;
    return {
      totalCustomers,
      totalLocalRows,
      totalHdRows,
      totalChannelRows,
      totalRows,
    };
  }, [customers, includeLpsHd]);

  // Preview the first rows that will be exported
  const previewRows = useMemo(() => {
    const rows: {
      name: string;
      subscriberCode: string;
      stbNo: string;
      vcNo: string;
      type: string;
      packageChannelName: string;
      subType: string;
      subValue: string | number;
      ncf: string | number;
      discount: string | number;
      serviceType: string;
      franchiseeName: string;
      billCollected?: string | number;
    }[] = [];

    for (const c of customers) {
      const isLocalActive = c.hasLocalAddon !== false;
      const isHdActive =
        includeLpsHd === 'all' ||
        (includeLpsHd === 'with-locals' && isLocalActive) ||
        (includeLpsHd !== 'none' &&
          (c.hasLpsHd ||
            c.selectedChannels.some(
              (ch) => ch.toUpperCase().includes(' HD') || ch.toUpperCase().endsWith('-HD')
            )));

      // 1. Base Package row (PACK-1 (BST))
      rows.push({
        name: c.name,
        subscriberCode: c.subscriberCode,
        stbNo: c.stbNo,
        vcNo: c.vcNo || '',
        type: 'Package',
        packageChannelName: basePackageName,
        subType: subscriptionSettings?.subscriptionType || c.subscriptionPeriod || 'Month',
        subValue: subscriptionSettings?.subscriptionValue ?? c.subscriptionCount ?? 1,
        ncf: c.networkCapacityFee ?? '0.00',
        discount: c.packageDiscount ?? '0.00',
        serviceType: c.serviceType || 'PayTV',
        franchiseeName: c.franchiseeName || '',
        billCollected: c.customBillAmount !== undefined && c.customBillAmount > 0 ? c.customBillAmount : '',
      });

      // 2. Local Package row (default LPS LOCALS)
      if (isLocalActive) {
        rows.push({
          name: c.name,
          subscriberCode: c.subscriberCode,
          stbNo: c.stbNo,
          vcNo: c.vcNo || '',
          type: 'Package',
          packageChannelName: localPackageName,
          subType: subscriptionSettings?.subscriptionType || c.subscriptionPeriod || 'Month',
          subValue: subscriptionSettings?.subscriptionValue ?? c.subscriptionCount ?? 1,
          ncf: c.networkCapacityFee ?? '0.00',
          discount: c.packageDiscount ?? '0.00',
          serviceType: c.serviceType || 'PayTV',
          franchiseeName: c.franchiseeName || '',
          billCollected: '',
        });
      }

      // 3. HD Package row (default LPS HD)
      if (isHdActive) {
        rows.push({
          name: c.name,
          subscriberCode: c.subscriberCode,
          stbNo: c.stbNo,
          vcNo: c.vcNo || '',
          type: 'Package',
          packageChannelName: hdPackageName,
          subType: subscriptionSettings?.subscriptionType || c.subscriptionPeriod || 'Month',
          subValue: subscriptionSettings?.subscriptionValue ?? c.subscriptionCount ?? 1,
          ncf: c.networkCapacityFee ?? '0.00',
          discount: c.packageDiscount ?? '0.00',
          serviceType: c.serviceType || 'PayTV',
          franchiseeName: c.franchiseeName || '',
          billCollected: '',
        });
      }

      // 4. Channel rows (A-la-carte)
      for (const ch of c.selectedChannels) {
        rows.push({
          name: c.name,
          subscriberCode: c.subscriberCode,
          stbNo: c.stbNo,
          vcNo: c.vcNo || '',
          type: 'Channel',
          packageChannelName: ch,
          subType: subscriptionSettings?.subscriptionType || c.subscriptionPeriod || 'Month',
          subValue: subscriptionSettings?.subscriptionValue ?? c.subscriptionCount ?? 1,
          ncf: c.networkCapacityFee ?? '0.00',
          discount: c.packageDiscount ?? '0.00',
          serviceType: c.serviceType || 'PayTV',
          franchiseeName: c.franchiseeName || '',
          billCollected: '',
        });
      }

      if (rows.length >= 15) break;
    }

    return rows.slice(0, 15);
  }, [customers, basePackageName, localPackageName, hdPackageName, includeLpsHd]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    const baseRawName = fileName
      ? fileName.replace(/\.[^/.]+$/, '')
      : 'PACK-1(BST)';
    const defaultName = `BulkPackageRenew_${baseRawName}.xls`;

    const result = await exportBulkPackageRenewExcel(customers, defaultName, {
      basePackageName,
      typeHeader: typeColHeader,
      packageChannelNameHeader: pkgColHeader,
      subscriptionTypeHeader: subTypeHeader,
      ncfHeader: ncfColHeader,
      sheetName,
      localPackageName,
      hdPackageName,
      includeLpsHd,
      includeBillCollected,
      subscriptionSettings,
    });

    if (result.method !== 'cancelled') {
      onExportSuccess?.(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="bulk-renew-modal"
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#212529] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#28a745] text-white flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                LPS Bulk Renew Excel Export (Official 12-Column Format)
              </h2>
              <p className="text-xs text-gray-300">
                Column 12 chiah chiah screenshot ami ang chiah khan Excel a download dawn e.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-bulk-renew-modal-btn"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
              <span className="text-[11px] text-gray-700 font-medium block">Subscribers</span>
              <span className="text-lg font-bold text-gray-900">{stats.totalCustomers}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
              <span className="text-[11px] text-blue-700 font-medium block">PACK-1 (BST) Rows</span>
              <span className="text-lg font-bold text-blue-900">{stats.totalCustomers}</span>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5">
              <span className="text-[11px] text-teal-700 font-medium block">Local Rows</span>
              <span className="text-lg font-bold text-teal-900">{stats.totalLocalRows}</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
              <span className="text-[11px] text-indigo-700 font-medium block">LPS HD Rows</span>
              <span className="text-lg font-bold text-indigo-900">{stats.totalHdRows}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <span className="text-[11px] text-amber-700 font-medium block">Channel Rows</span>
              <span className="text-lg font-bold text-amber-900">{stats.totalChannelRows}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
              <span className="text-[11px] text-emerald-700 font-medium block">Total Rows</span>
              <span className="text-lg font-bold text-emerald-900">{stats.totalRows}</span>
            </div>
          </div>

          {/* 12-Column Specification Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-700" />
                <span className="text-sm font-semibold text-slate-900">
                  Exact 12 Columns in Export (Official LPS Template Order):
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-xs text-emerald-900 font-bold">
                    Format: .xls (Excel 97-2003 BIFF8)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="sheet-name-select" className="text-xs text-slate-600 font-medium">
                    Sheet:
                  </label>
                  <select
                    id="sheet-name-select"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Sheet1">Sheet1 (Standard LPS)</option>
                    <option value="BulkPackageRenew">BulkPackageRenew</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="base-pkg-select" className="text-xs text-slate-600 font-medium">
                    Base:
                  </label>
                  <select
                    id="base-pkg-select"
                    value={basePackageName}
                    onChange={(e) => setBasePackageName(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PACK-1 (BST)">PACK-1 (BST)</option>
                    <option value="BST">BST</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="col5-format-select" className="text-xs text-slate-600 font-medium">
                    Col 5:
                  </label>
                  <select
                    id="col5-format-select"
                    value={typeColHeader}
                    onChange={(e) => setTypeColHeader(e.target.value as any)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Type (Package/Channel)">Type (Package/Channel)</option>
                    <option value="Type(Package/Channel)">Type(Package/Channel) [no space]</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="col6-format-select" className="text-xs text-slate-600 font-medium">
                    Col 6:
                  </label>
                  <select
                    id="col6-format-select"
                    value={pkgColHeader}
                    onChange={(e) => setPkgColHeader(e.target.value as any)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="PackageChannelName">PackageChannelName</option>
                    <option value="Name (Package/Channel)">Name (Package/Channel)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="col9-format-select" className="text-xs text-slate-600 font-medium">
                    Col 9:
                  </label>
                  <select
                    id="col9-format-select"
                    value={ncfColHeader}
                    onChange={(e) => setNcfColHeader(e.target.value as any)}
                    className="text-xs bg-white border border-emerald-400 rounded px-2 py-1 font-bold text-emerald-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="NetworkCapacityFees">NetworkCapacityFees (with 's')</option>
                    <option value="NetworkCapacityFee">NetworkCapacityFee (no 's')</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="local-pkg-select" className="text-xs text-slate-600 font-medium">
                    Local:
                  </label>
                  <select
                    id="local-pkg-select"
                    value={localPackageName}
                    onChange={(e) => setLocalPackageName(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="LPS LOCALS">LPS LOCALS (Official)</option>
                    <option value="Local 1-12">Local 1-12</option>
                    <option value="LOCAL">LOCAL</option>
                    <option value="LPS LOCAL">LPS LOCAL</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="hd-pkg-select" className="text-xs text-slate-600 font-medium">
                    HD Pack:
                  </label>
                  <select
                    id="hd-pkg-select"
                    value={hdPackageName}
                    onChange={(e) => setHdPackageName(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="LPS HD">LPS HD (Official)</option>
                    <option value="HD">HD</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="hd-mode-select" className="text-xs text-slate-600 font-medium">
                    LPS HD:
                  </label>
                  <select
                    id="hd-mode-select"
                    value={includeLpsHd}
                    onChange={(e) => setIncludeLpsHd(e.target.value as any)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="none">Excel ah telh loh (LPS LOCALS ah a awm sa - Default)</option>
                    <option value="with-locals">LPS LOCALS rualin telh ve rawh</option>
                    <option value="hd-only">HD Channel / Gold neite chauh</option>
                    <option value="all">Subscribers zawng zawng</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <label htmlFor="col7-format-select" className="text-xs text-slate-600 font-medium">
                    Col 7:
                  </label>
                  <select
                    id="col7-format-select"
                    value={subTypeHeader}
                    onChange={(e) => setSubTypeHeader(e.target.value as any)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                  >
                    <option value="SubscriptionType(Day/Month/Year)">SubscriptionType(Day/Month/Year)</option>
                    <option value="SubscriptionType(Day/Month)">SubscriptionType(Day/Month)</option>
                    <option value="SubscriptionType(Days/Month)">SubscriptionType(Days/Month)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-300 hover:bg-amber-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeBillCollected}
                      onChange={(e) => setIncludeBillCollected(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Include 'Bill Collected' (LPS upload dawn chuan tick suh)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* List of Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">A.</span>
                <span className="text-slate-800 font-bold">Name</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">B.</span>
                <span className="text-slate-800 font-bold">SubscriberCode</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">C.</span>
                <span className="text-slate-800 font-bold">STBNo</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">D.</span>
                <span className="text-slate-800 font-bold">VCNo</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">E.</span>
                <span className="text-slate-800 font-bold">{typeColHeader}</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">F.</span>
                <span className="text-slate-800 font-bold">{pkgColHeader}</span>
              </div>
              <div className="bg-blue-50 px-2.5 py-1.5 rounded border border-blue-200 flex items-center gap-1.5 font-mono">
                <span className="text-blue-700 font-semibold">G.</span>
                <span className="text-blue-900 font-bold">{subTypeHeader}</span>
              </div>
              <div className="bg-blue-50 px-2.5 py-1.5 rounded border border-blue-200 flex items-center gap-1.5 font-mono">
                <span className="text-blue-700 font-semibold">H.</span>
                <span className="text-blue-900 font-bold">SubscriptionValue</span>
              </div>
              <div className="bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-300 flex items-center gap-1.5 font-mono">
                <span className="text-emerald-700 font-semibold">I.</span>
                <span className="text-emerald-950 font-bold">{ncfColHeader}</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">J.</span>
                <span className="text-slate-800 font-bold">PackageDiscount</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">K.</span>
                <span className="text-slate-800 font-bold">ServiceType</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-1.5 font-mono">
                <span className="text-slate-700 font-semibold">L.</span>
                <span className="text-slate-800 font-bold">FranchiseeName</span>
              </div>
              {includeBillCollected && (
                <div className="bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-300 flex items-center gap-1.5 font-mono">
                  <span className="text-emerald-700 font-semibold">M.</span>
                  <span className="text-emerald-900 font-bold">Bill Collected</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Data Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium text-gray-700">Preview (First {previewRows.length} Rows):</span>
              <span>Showing preview of generated bulk renewal lines</span>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-x-auto shadow-xs">
              <table className="min-w-full text-xs divide-y divide-gray-200 text-left">
                <thead className="bg-[#1f4e78] text-white font-semibold whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-2 border-r border-blue-800">Name</th>
                    <th className="px-3 py-2 border-r border-blue-800">SubscriberCode</th>
                    <th className="px-3 py-2 border-r border-blue-800">STBNo</th>
                    <th className="px-3 py-2 border-r border-blue-800">VCNo</th>
                    <th className="px-3 py-2 border-r border-blue-800">{typeColHeader}</th>
                    <th className="px-3 py-2 border-r border-blue-800">{pkgColHeader}</th>
                    <th className="px-3 py-2 border-r border-blue-800 bg-blue-900">{subTypeHeader}</th>
                    <th className="px-3 py-2 border-r border-blue-800 bg-blue-900">SubscriptionValue</th>
                    <th className="px-3 py-2 border-r border-blue-800 bg-emerald-900 text-emerald-100">{ncfColHeader}</th>
                    <th className="px-3 py-2 border-r border-blue-800">PackageDiscount</th>
                    <th className="px-3 py-2 border-r border-blue-800">ServiceType</th>
                    <th className={`px-3 py-2 ${includeBillCollected ? 'border-r border-blue-800' : ''}`}>FranchiseeName</th>
                    {includeBillCollected && (
                      <th className="px-3 py-2 bg-emerald-800 text-emerald-100">Bill Collected</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white font-mono text-[11px] whitespace-nowrap">
                  {previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.type === 'Package' ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-3 py-1.5 font-sans font-medium text-gray-900 border-r border-gray-200">{row.name}</td>
                      <td className="px-3 py-1.5 text-gray-700 border-r border-gray-200">{row.subscriberCode}</td>
                      <td className="px-3 py-1.5 text-gray-700 border-r border-gray-200">{row.stbNo}</td>
                      <td className="px-3 py-1.5 text-gray-700 border-r border-gray-200">{row.vcNo || '-'}</td>
                      <td className="px-3 py-1.5 border-r border-gray-200 font-semibold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            row.type === 'Package'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-bold text-gray-900 border-r border-gray-200">{row.packageChannelName}</td>
                      <td className="px-3 py-1.5 text-blue-900 font-semibold border-r border-gray-200 bg-blue-50/20">{row.subType}</td>
                      <td className="px-3 py-1.5 text-blue-900 font-semibold border-r border-gray-200 bg-blue-50/20">{row.subValue}</td>
                      <td className="px-3 py-1.5 text-gray-600 border-r border-gray-200">{row.ncf}</td>
                      <td className="px-3 py-1.5 text-gray-600 border-r border-gray-200">{row.discount}</td>
                      <td className="px-3 py-1.5 text-gray-700 border-r border-gray-200">{row.serviceType}</td>
                      <td className={`px-3 py-1.5 text-gray-700 ${includeBillCollected ? 'border-r border-gray-200' : ''}`}>{row.franchiseeName}</td>
                      {includeBillCollected && (
                        <td className="px-3 py-1.5 font-bold text-emerald-700 bg-emerald-50/50">{row.billCollected || '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-start gap-3 text-xs text-emerald-950">
            <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-emerald-900">
                LPS Operator Portal Upload Hriattur Pawimawh:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-emerald-800 font-medium">
                <li><strong>Format dik (.xls):</strong> LPS Operator Portal-in <strong>.xls (Excel 97-2003 BIFF8)</strong> chauh a pawm a, he download button hian <strong>.xls</strong> binary dik tak a pe dawn che a ni.</li>
                <li><strong>Column 12 chiah a awm tur a ni:</strong> 'Include Bill Collected' checkbox hi LPS upload dawn chuan tick miah suh (column 13 a awm chuan portal-in format not valid a ti ang).</li>
                <li><strong>Base Package:</strong> Column F ah hian <strong>{basePackageName}</strong> tiin a chhuak e.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="cancel-bulk-renew-btn"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {onOpenDownloadGuide && (
              <button
                type="button"
                onClick={onOpenDownloadGuide}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                title="Folder thlanna (Save As) a awm ve theih dan"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Folder thlanna awm lohva siam dan</span>
              </button>
            )}
          </div>
          
          <button
            type="button"
            id="confirm-download-bulk-renew-btn"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer"
            title="Folder thlangin Bulk Renew Excel file save rawh"
          >
            <FolderDown className="w-4 h-4" />
            <span>Download 12-Column Bulk Renew (.xls - LPS Portal)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
