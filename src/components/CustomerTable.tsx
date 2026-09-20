import React, { useState, useMemo } from 'react';
import { Search, Edit3, Trash2, ArrowUpDown, Filter, X, List, Rows, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CustomerSummary, ChannelItem, SubscriptionDateSettings } from '../types';
import { SubscriptionCalendarPicker } from './SubscriptionCalendarPicker';
import { getChannelPriceMap, normalizeKey } from '../utils/excelParser';
import {
  DEFAULT_BASE_PRICE,
  BST_PRICE,
  BST_LCO_SHARE,
  LOCAL_PRICE,
  LOCAL_LCO_SHARE,
  ALACARTE_LCO_COMMISSION_PERCENT,
  PRESET_300_CHANNELS,
  PRESET_350_CHANNELS,
  PRESET_50_CHANNELS,
  PRESET_60_CHANNELS,
  PRESET_100_CHANNELS,
} from '../data/defaultChannels';

interface CustomerTableProps {
  customers: CustomerSummary[];
  onSelectCustomer: (customerId: string) => void;
  onDeleteLine?: (customerId: string, channelIndex?: number, channelName?: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onBatchDeleteCustomers?: (customerIds: string[]) => void;
  onRestoreCustomers?: (restoredCustomers: CustomerSummary[]) => void;
  selectedCustomerId: string | null;
  basePrice?: number;
  availableChannels?: ChannelItem[];
  subscriptionSettings?: SubscriptionDateSettings;
  onChangeSubscriptionSettings?: (newSettings: SubscriptionDateSettings) => void;
  onBatchApplyChannels?: (
    customerIds: string[],
    newChannels: string[],
    hasLocalAddon: boolean,
    customBillAmount?: number,
    packName?: string
  ) => void;
}

type SortField = 'index' | 'name' | 'subscriberCode' | 'stbNo' | 'price';

interface TableRowData {
  rowId: string;
  customerId: string;
  originalCustomer: CustomerSummary;
  name: string;
  subscriberCode: string;
  stbNo: string;
  channelName: string;
  linePrice: number;
  lineHlawh: number;
  lineSen: number;
  franchiseeName: string;
  isModified?: boolean;
  hasExtraChannels?: boolean;
  isMultiChannelSubRow?: boolean;
  channelIndex?: number;
  channelTotalCount?: number;
}

interface LineToDeleteInfo {
  customerId: string;
  customerName: string;
  subscriberCode: string;
  channelName?: string;
  channelIndex?: number;
  isChannelLine: boolean;
}

interface DeletedBatch {
  id: string;
  customers: CustomerSummary[];
  time: string;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onSelectCustomer,
  onDeleteLine,
  onDeleteCustomer,
  onBatchDeleteCustomers,
  onRestoreCustomers,
  selectedCustomerId,
  basePrice = DEFAULT_BASE_PRICE,
  availableChannels = [],
  subscriptionSettings,
  onChangeSubscriptionSettings,
  onBatchApplyChannels,
}) => {
  const [tableSearch, setTableSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'custom_only'>('all');
  const [sortField, setSortField] = useState<SortField>('index');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lineToDelete, setLineToDelete] = useState<LineToDeleteInfo | null>(null);
  // Default to multi-line mode as requested: customer with multiple channels gets a new line per channel
  const [viewMode, setViewMode] = useState<'multi_line' | 'consolidated'>('multi_line');
  const [isEssySelectionActive, setIsEssySelectionActive] = useState<boolean>(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [deletedHistory, setDeletedHistory] = useState<DeletedBatch[]>([]);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  const totalDeletedCount = useMemo(() => {
    return deletedHistory.reduce((sum, b) => sum + b.customers.length, 0);
  }, [deletedHistory]);

  const selectedCustomersPreview = useMemo(() => {
    if (selectedCustomerIds.size === 0) return [];
    return customers.filter((c) => selectedCustomerIds.has(c.id)).slice(0, 8);
  }, [customers, selectedCustomerIds]);

  const priceMap = useMemo(() => {
    return getChannelPriceMap(availableChannels);
  }, [availableChannels]);

  // Filter list of customers
  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (filterMode === 'custom_only') {
      list = list.filter((c) => c.selectedChannels.length > 0 || c.isModified);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.subscriberCode.toLowerCase().includes(q) ||
          c.stbNo.toLowerCase().includes(q) ||
          c.selectedChannels.some((ch) => ch.toLowerCase().includes(q)) ||
          c.franchiseeName.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'subscriberCode') {
        valA = a.subscriberCode.toLowerCase();
        valB = b.subscriberCode.toLowerCase();
      } else if (sortField === 'stbNo') {
        valA = a.stbNo.toLowerCase();
        valB = b.stbNo.toLowerCase();
      } else if (sortField === 'price') {
        valA = a.channelPrice;
        valB = b.channelPrice;
      } else {
        return 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [customers, filterMode, tableSearch, sortField, sortAsc]);

  const periodRatio = useMemo(() => {
    if (!subscriptionSettings) return 1;
    if (subscriptionSettings.subscriptionType === 'Day') {
      const days = Math.max(1, Number(subscriptionSettings.subscriptionValue) || 1);
      return days / 30;
    }
    const months = Math.max(1, Number(subscriptionSettings.subscriptionValue) || 1);
    return months;
  }, [subscriptionSettings]);

  // Generate table rows based on viewMode
  // If viewMode === 'multi_line', when a customer has > 1 channel,
  // each channel gets its own row with customer name and that single channel
  const tableRows: TableRowData[] = useMemo(() => {
    const rows: TableRowData[] = [];

    for (const c of filteredCustomers) {
      const hasExtra = c.selectedChannels.length > 0;
      const isLocalActive = c.hasLocalAddon !== false;
      
      const periodLabel = subscriptionSettings 
        ? (subscriptionSettings.subscriptionType === 'Day'
            ? `Ni ${subscriptionSettings.subscriptionValue}`
            : subscriptionSettings.subscriptionValue === 1
              ? '1 Month'
              : `${subscriptionSettings.subscriptionValue} Months`)
        : (c.subscriptionPeriod && c.subscriptionCount) 
          ? `${c.subscriptionCount} ${c.subscriptionPeriod}`
          : '1 Month';

      if (viewMode === 'consolidated') {
        const basePkgName = c.basePackage || 'PACK-1 (BST)';
        const packageLabel = isLocalActive ? `${basePkgName}+Local (${periodLabel})` : `${basePkgName} chauh (${periodLabel})`;
        const channelDisplay = c.selectedChannels.length > 0
          ? `${packageLabel} • ${c.selectedChannels.join(', ')}`
          : packageLabel;

        const effectiveLinePrice = c.customBillAmount !== undefined && c.customBillAmount > 0
          ? c.customBillAmount
          : c.channelPrice;

        rows.push({
          rowId: c.id,
          customerId: c.id,
          originalCustomer: c,
          name: c.name,
          subscriberCode: c.subscriberCode,
          stbNo: c.stbNo,
          channelName: channelDisplay,
          linePrice: Number((effectiveLinePrice * periodRatio).toFixed(2)),
          lineHlawh: Number((c.lcoHlawh * periodRatio).toFixed(2)),
          lineSen: Number((c.lcoSen * periodRatio).toFixed(2)),
          franchiseeName: c.franchiseeName || '',
          isModified: c.isModified,
          hasExtraChannels: hasExtra,
          isMultiChannelSubRow: false,
        });
      } else {
        // Multi-line mode: Separate rows for PACK-1 (BST), Local, and each A-la-carte channel
        
        // 1. Mandatory Base Package (PACK-1 (BST)) Row
        const basePkgName = c.basePackage || 'PACK-1 (BST)';
        const bstLinePrice = Number((BST_PRICE * periodRatio).toFixed(2));
        const bstLineHlawh = Number((BST_LCO_SHARE * periodRatio).toFixed(2));
        const bstLineSen = Number(((BST_PRICE - BST_LCO_SHARE) * periodRatio).toFixed(2));

        rows.push({
          rowId: `${c.id}_bst`,
          customerId: c.id,
          originalCustomer: c,
          name: c.name,
          subscriberCode: c.subscriberCode,
          stbNo: c.stbNo,
          channelName: `${basePkgName} (${periodLabel})`,
          linePrice: bstLinePrice,
          lineHlawh: bstLineHlawh,
          lineSen: bstLineSen,
          franchiseeName: c.franchiseeName || '',
          isModified: c.isModified,
          hasExtraChannels: false,
          isMultiChannelSubRow: true,
          channelIndex: -2, // Using negative to distinguish from channels
          channelTotalCount: c.selectedChannels.length,
        });

        // 2. Optional LPS LOCALS Row
        if (isLocalActive) {
          const localLinePrice = Number((LOCAL_PRICE * periodRatio).toFixed(2));
          const localLineHlawh = Number((LOCAL_LCO_SHARE * periodRatio).toFixed(2));
          const localLineSen = Number(((LOCAL_PRICE - LOCAL_LCO_SHARE) * periodRatio).toFixed(2));

          rows.push({
            rowId: `${c.id}_local`,
            customerId: c.id,
            originalCustomer: c,
            name: c.name,
            subscriberCode: c.subscriberCode,
            stbNo: c.stbNo,
            channelName: `LPS LOCALS (${periodLabel})`,
            linePrice: localLinePrice,
            lineHlawh: localLineHlawh,
            lineSen: localLineSen,
            franchiseeName: c.franchiseeName || '',
            isModified: c.isModified,
            hasExtraChannels: false,
            isMultiChannelSubRow: true,
            channelIndex: -1, 
            channelTotalCount: c.selectedChannels.length,
          });
        }

        // 3. A-la-carte Channel rows
        c.selectedChannels.forEach((chName, chIdx) => {
          const chClean = chName.toLowerCase().trim();
          const baseRate = priceMap.get(chClean) ?? priceMap.get(normalizeKey(chClean)) ?? 0;
          const rate = Number((baseRate * periodRatio).toFixed(2));
          const lineHlawh = Number(((rate * (ALACARTE_LCO_COMMISSION_PERCENT / 100))).toFixed(2));
          const lineSen = Number((rate - lineHlawh).toFixed(2));

          rows.push({
            rowId: `${c.id}_ch_${chIdx}`,
            customerId: c.id,
            originalCustomer: c,
            name: c.name,
            subscriberCode: c.subscriberCode,
            stbNo: c.stbNo,
            channelName: periodRatio !== 1 ? `${chName} (${periodLabel})` : chName,
            linePrice: rate,
            lineHlawh,
            lineSen,
            franchiseeName: c.franchiseeName || '',
            isModified: c.isModified,
            hasExtraChannels: true,
            isMultiChannelSubRow: true,
            channelIndex: chIdx,
            channelTotalCount: c.selectedChannels.length,
          });
        });
      }
    }

    return rows;
  }, [filteredCustomers, viewMode, priceMap, basePrice, subscriptionSettings, periodRatio]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, currentPage, pageSize]);

  const activeFranchisee = useMemo(() => {
    return customers.find((c) => c.franchiseeName)?.franchiseeName || '';
  }, [customers]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredCustomers.length === 0) return false;
    return filteredCustomers.every((c) => selectedCustomerIds.has(c.id));
  }, [filteredCustomers, selectedCustomerIds]);

  const handleToggleCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        for (const c of filteredCustomers) {
          next.delete(c.id);
        }
        return next;
      });
    } else {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        for (const c of filteredCustomers) {
          next.add(c.id);
        }
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      for (const c of filteredCustomers) {
        next.add(c.id);
      }
      return next;
    });
  };

  const handleBatchApply = (
    presetChannels: string[],
    hasLocalAddon: boolean,
    billAmount: number,
    presetName: string
  ) => {
    if (!onBatchApplyChannels) return;
    const targetIds = Array.from(selectedCustomerIds);
    if (targetIds.length === 0) return;

    onBatchApplyChannels(targetIds, presetChannels, hasLocalAddon, billAmount, presetName);
    
    // Success feedback on button - Persistent 'bedswitch' state
    setAppliedActions((prev) => {
      const next = new Set(prev);
      if (next.has(presetName)) {
        next.delete(presetName);
      } else {
        // Remove other base plans if a new plan is applied
        const basePlans = ['₹ 300 SD Plan', '₹ 350 HD Plan', '₹ 360 Plan (300+60)', '₹ 450 Plan (350+100)'];
        if (basePlans.includes(presetName)) {
          basePlans.forEach(p => next.delete(p));
        }
        next.add(presetName);
      }
      return next;
    });

    setBatchSuccessMessage(
      `Subscribers ${targetIds.length}-ah ${presetName} (Bill: ₹ ${billAmount}) hlawhtling takin a lut vek e! Excel download tan save thar a inpeih nghal.`
    );
    setTimeout(() => {
      setBatchSuccessMessage(null);
    }, 4500);
  };

  const handleBatchApplyAddon = (
    addonChannels: string[],
    addonAmount: number,
    addonName: string
  ) => {
    if (!onBatchApplyChannels) return;
    const targetIds = Array.from(selectedCustomerIds);
    if (targetIds.length === 0) return;

    for (const id of targetIds) {
      const cust = customers.find((c) => c.id === id);
      if (!cust) continue;
      let newChannels = [...cust.selectedChannels];
      for (const ch of addonChannels) {
        if (!newChannels.includes(ch)) newChannels.push(ch);
      }
      const existingBill =
        cust.customBillAmount !== undefined && cust.customBillAmount > 0
          ? cust.customBillAmount
          : cust.channelPrice;
      const newBill = Number((existingBill + addonAmount).toFixed(2));
      onBatchApplyChannels([id], newChannels, cust.hasLocalAddon !== false, newBill, addonName);
    }

    // Success feedback on button - Persistent 'bedswitch' state
    setAppliedActions((prev) => {
      const next = new Set(prev);
      if (next.has(addonName)) {
        next.delete(addonName);
      } else {
        next.add(addonName);
      }
      return next;
    });

    setBatchSuccessMessage(
      `Subscribers ${targetIds.length}-ah ${addonName} (+₹ ${addonAmount}) hlawhtling takin belh a ni e! Excel download tan save thar a inpeih nghal.`
    );
    setTimeout(() => {
      setBatchSuccessMessage(null);
    }, 4500);
  };

  // Batch Delete handler (Essy Selection Package)
  const handleConfirmBatchDelete = () => {
    if (selectedCustomerIds.size === 0) {
      setIsBatchDeleteModalOpen(false);
      return;
    }
    const toDelete = customers.filter((c) => selectedCustomerIds.has(c.id));
    if (toDelete.length === 0) {
      setIsBatchDeleteModalOpen(false);
      return;
    }

    const batch: DeletedBatch = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customers: toDelete,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDeletedHistory((prev) => [batch, ...prev]);

    if (onBatchDeleteCustomers) {
      onBatchDeleteCustomers(Array.from(selectedCustomerIds));
    } else if (onDeleteCustomer) {
      for (const id of selectedCustomerIds) {
        onDeleteCustomer(id);
      }
    }

    setSelectedCustomerIds(new Set());
    setIsBatchDeleteModalOpen(false);
    setRestoreSuccessMessage(null);
    setBatchSuccessMessage(
      `Subscribers ${toDelete.length} hlawhtling taka paih (delete) an ni ta e.`
    );
  };

  // Restore deleted customers handler
  const handleRestoreDeleted = () => {
    if (deletedHistory.length === 0) return;
    const [lastBatch, ...remaining] = deletedHistory;

    if (onRestoreCustomers) {
      onRestoreCustomers(lastBatch.customers);
    }

    setDeletedHistory(remaining);
    setBatchSuccessMessage(null);
    setRestoreSuccessMessage(
      `Subscribers ${lastBatch.customers.length} hlawhtling taka restore a ni e!`
    );
    setTimeout(() => {
      setRestoreSuccessMessage(null);
    }, 4500);
  };

  return (
    <div className="space-y-3">
      {/* Table Top Controls & Info */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            <span>Hming List zawng zawng</span>
            <span className="text-xs font-semibold text-slate-600 font-mono">
              ({tableRows.length} lines &bull; {filteredCustomers.length} of {customers.length} subscribers)
            </span>
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-600 font-medium">
            {viewMode === 'multi_line'
              ? 'Channel 1 aia tam neite chu line thar zelah customer hming leh channel pakhat zel a inlantir'
              : 'Customer tin te line khat theuhvah an channel neih zawng zawng nen a inlantir'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Calendar Picker for Excel Subscription Settings */}
          {subscriptionSettings && onChangeSubscriptionSettings && (
            <div className="mr-auto sm:mr-0">
              <SubscriptionCalendarPicker
                settings={subscriptionSettings}
                onChangeSettings={onChangeSubscriptionSettings}
                totalSubscribers={customers.length}
              />
            </div>
          )}

          {/* View Mode Toggle: Multi-Line per channel vs Consolidated */}
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('multi_line');
                setCurrentPage(1);
              }}
              title="Channel pakhat zel line thar ah insiam rawh"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'multi_line'
                  ? 'bg-white shadow-2xs text-blue-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Rows className="w-3.5 h-3.5" />
              <span>Channel tin line thar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('consolidated');
                setCurrentPage(1);
              }}
              title="Customer pakhat line khat ah chauh"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'consolidated'
                  ? 'bg-white shadow-2xs text-blue-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Line khat-ah</span>
            </button>
          </div>

          {/* Quick Table Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="List search (zoliana, channel)..."
              className="pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56 text-slate-900 font-medium shadow-2xs"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Custom/All */}
          <button
            type="button"
            onClick={() => {
              setFilterMode(filterMode === 'all' ? 'custom_only' : 'all');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-[13px] font-bold border transition-all cursor-pointer shadow-2xs ${
              filterMode === 'custom_only'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-300'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>{filterMode === 'custom_only' ? 'Channel thlan chauh' : 'All'}</span>
          </button>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs sm:text-[13px] bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={500}>All (500)</option>
          </select>
        </div>
      </div>

      {/* Main Table Container with PayTV Green Header Banner */}
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
        {/* PayTV 'Item List' Green Banner Bar */}
        <div className="bg-[#28a745] text-white px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-black tracking-wide flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">&#9881;</span>
            <span>Customer Channel & Rate List</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Essy Selection Package Toggle */}
            <div className="flex items-center gap-2 bg-emerald-800/80 px-2.5 py-1 rounded-lg border border-emerald-400/50 shadow-2xs">
              <span className="text-xs font-bold text-white whitespace-nowrap">Essy Selection Package:</span>
              <button
                type="button"
                onClick={() => {
                  if (isEssySelectionActive) {
                    setAppliedActions(new Set());
                  }
                  setIsEssySelectionActive(!isEssySelectionActive);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEssySelectionActive ? 'bg-white' : 'bg-emerald-950/70'
                }`}
                title="Essy Selection Package toggle: ON / OFF"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                    isEssySelectionActive ? 'translate-x-4 bg-emerald-700' : 'translate-x-0 bg-slate-300'
                  }`}
                />
              </button>
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isEssySelectionActive ? 'bg-white text-emerald-900 font-extrabold' : 'bg-emerald-900/80 text-emerald-200'
                }`}
              >
                {isEssySelectionActive ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Restore button if items were deleted and toggle is switched OFF */}
            {totalDeletedCount > 0 && !isEssySelectionActive && (
              <button
                type="button"
                onClick={handleRestoreDeleted}
                className="px-2.5 py-1 text-xs font-black text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 rounded-lg cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
                title="Tih sual palh a customer paih tawhte restore-na"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-900" />
                <span>Restore ({totalDeletedCount})</span>
              </button>
            )}

            <span className="text-xs font-semibold text-emerald-100 font-mono">
              Total {tableRows.length} items{activeFranchisee ? ` • ${activeFranchisee}` : ''}
            </span>
          </div>
        </div>

        {/* Essy Selection Package Toolbar */}
        {isEssySelectionActive && (
          <div className="bg-emerald-50 border-b border-emerald-300 px-4 py-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                  Essy Selection Package Active
                </span>
                <span className="text-xs font-bold text-emerald-900 bg-white border border-emerald-300 px-2.5 py-0.5 rounded-lg shadow-2xs font-mono">
                  {selectedCustomerIds.size} of {filteredCustomers.length} subscribers thlan a ni
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  Select All ({filteredCustomers.length})
                </button>
                {selectedCustomerIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerIds(new Set())}
                    className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                  >
                    Clear
                  </button>
                )}

                {/* DELETE BUTTON: Appears as soon as items are selected */}
                {selectedCustomerIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsBatchDeleteModalOpen(true)}
                    className="px-3 py-1 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:scale-95 border border-red-700 rounded-lg cursor-pointer transition-all shadow-xs flex items-center gap-1.5 animate-in fade-in"
                    title="Select zawng zawng hi paih (delete) rawh"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedCustomerIds.size})</span>
                  </button>
                )}

                {/* RESTORE BUTTON: Appears as soon as items are deleted */}
                {totalDeletedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreDeleted}
                    className="px-3 py-1 text-xs font-black text-amber-950 bg-amber-200 hover:bg-amber-300 active:scale-95 border border-amber-400 rounded-lg cursor-pointer transition-all shadow-xs flex items-center gap-1.5 animate-in fade-in"
                    title="Tih sual palh a customer paih tawhte restore-na"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-900" />
                    <span>Restore Deleted ({totalDeletedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Presets Row */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span className="text-xs font-bold text-slate-800">
                Tick veleh a rualin Excel-ah lut tur:
              </span>

              {/* Rs. 300 SD Pack */}
              <button
                type="button"
                onClick={() => handleBatchApply(PRESET_300_CHANNELS, true, 300, '₹ 300 SD Plan')}
                disabled={selectedCustomerIds.size === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-md cursor-pointer flex items-center gap-2 transition-all transform active:scale-95 ${
                  appliedActions.has('₹ 300 SD Plan')
                    ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                    : selectedCustomerIds.size > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  appliedActions.has('₹ 300 SD Plan') 
                    ? 'bg-white text-emerald-700 border-white' 
                    : 'bg-black/10 border-black/20'
                }`}>
                  {appliedActions.has('₹ 300 SD Plan') && <span className="text-[11px] font-black leading-none">✓</span>}
                </div>
                <span className="font-mono">Bill ₹ 300</span>
              </button>

              {/* Rs. 350 HD Pack */}
              <button
                type="button"
                onClick={() => handleBatchApply(PRESET_350_CHANNELS, true, 350, '₹ 350 HD Plan')}
                disabled={selectedCustomerIds.size === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-md cursor-pointer flex items-center gap-2 transition-all transform active:scale-95 ${
                  appliedActions.has('₹ 350 HD Plan')
                    ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                    : selectedCustomerIds.size > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  appliedActions.has('₹ 350 HD Plan') 
                    ? 'bg-white text-emerald-700 border-white' 
                    : 'bg-black/10 border-black/20'
                }`}>
                  {appliedActions.has('₹ 350 HD Plan') && <span className="text-[11px] font-black leading-none">✓</span>}
                </div>
                <span className="font-mono">Bill ₹ 350</span>
              </button>

              <span className="text-slate-400 font-black px-1 select-none">+</span>

              {/* Rs. 50 Addon */}
              <button
                type="button"
                onClick={() => handleBatchApplyAddon(PRESET_50_CHANNELS, 50, '₹ 50 Addon')}
                disabled={selectedCustomerIds.size === 0}
                className={`px-3 py-1.5 border rounded-lg text-xs font-black shadow-sm cursor-pointer flex items-center gap-2 transition-all transform active:scale-95 ${
                  appliedActions.has('₹ 50 Addon')
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                    : selectedCustomerIds.size > 0
                    ? 'bg-white border-emerald-600 text-emerald-900 hover:bg-emerald-50'
                    : 'bg-slate-50 border-slate-200 text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  appliedActions.has('₹ 50 Addon') 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-slate-100 border-slate-300'
                }`}>
                  {appliedActions.has('₹ 50 Addon') ? <span className="text-[11px] font-black leading-none">✓</span> : <span className="text-[11px] font-black leading-none text-slate-400">+</span>}
                </div>
                <span className="font-mono">₹ 50</span>
              </button>

              {/* Rs. 60 Sports SD */}
              <button
                type="button"
                onClick={() => handleBatchApplyAddon(PRESET_60_CHANNELS, 60, '₹ 60 Sports SD')}
                disabled={selectedCustomerIds.size === 0}
                className={`px-3 py-1.5 border rounded-lg text-xs font-black shadow-sm cursor-pointer flex items-center gap-2 transition-all transform active:scale-95 ${
                  appliedActions.has('₹ 60 Sports SD')
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                    : selectedCustomerIds.size > 0
                    ? 'bg-white border-emerald-600 text-emerald-900 hover:bg-emerald-50'
                    : 'bg-slate-50 border-slate-200 text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  appliedActions.has('₹ 60 Sports SD') 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-slate-100 border-slate-300'
                }`}>
                  {appliedActions.has('₹ 60 Sports SD') ? <span className="text-[11px] font-black leading-none">✓</span> : <span className="text-[11px] font-black leading-none text-slate-400">+</span>}
                </div>
                <span className="font-mono">₹ 60</span>
              </button>

              {/* Rs. 100 Sports HD */}
              <button
                type="button"
                onClick={() => handleBatchApplyAddon(PRESET_100_CHANNELS, 100, '₹ 100 Sports HD')}
                disabled={selectedCustomerIds.size === 0}
                className={`px-3 py-1.5 border rounded-lg text-xs font-black shadow-sm cursor-pointer flex items-center gap-2 transition-all transform active:scale-95 ${
                  appliedActions.has('₹ 100 Sports HD')
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                    : selectedCustomerIds.size > 0
                    ? 'bg-white border-emerald-600 text-emerald-900 hover:bg-emerald-50'
                    : 'bg-slate-50 border-slate-200 text-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  appliedActions.has('₹ 100 Sports HD') 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-slate-100 border-slate-300'
                }`}>
                  {appliedActions.has('₹ 100 Sports HD') ? <span className="text-[11px] font-black leading-none">✓</span> : <span className="text-[11px] font-black leading-none text-slate-400">+</span>}
                </div>
                <span className="font-mono">₹ 100</span>
              </button>

              <span className="text-slate-300 mx-1 hidden sm:inline">|</span>

              {/* Rs. 360 Combo */}
              <button
                type="button"
                onClick={() => {
                  const channels = [...new Set([...PRESET_300_CHANNELS, ...PRESET_60_CHANNELS])];
                  handleBatchApply(channels, true, 360, '₹ 360 Plan (300+60)');
                }}
                disabled={selectedCustomerIds.size === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-md cursor-pointer flex items-center gap-2 transition-all transform active:scale-95 ${
                  appliedActions.has('₹ 360 Plan (300+60)')
                    ? 'bg-blue-700 text-white ring-2 ring-blue-400'
                    : selectedCustomerIds.size > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  appliedActions.has('₹ 360 Plan (300+60)') 
                    ? 'bg-white text-blue-700 border-white' 
                    : 'bg-black/10 border-black/20'
                }`}>
                  {appliedActions.has('₹ 360 Plan (300+60)') ? <span className="text-[11px] font-black leading-none">✓</span> : <span className="text-[11px] font-black leading-none text-white/50">⚡</span>}
                </div>
                <span className="font-mono">₹ 360</span>
              </button>

              {/* Rs. 450 Combo */}
              <button
                type="button"
                onClick={() => {
                  const channels = [...new Set([...PRESET_350_CHANNELS, ...PRESET_100_CHANNELS])];
                  handleBatchApply(channels, true, 450, '₹ 450 Plan (350+100)');
                }}
                disabled={selectedCustomerIds.size === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-md cursor-pointer flex items-center gap-2 transition-all transform active:scale-95 ${
                  appliedActions.has('₹ 450 Plan (350+100)')
                    ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                    : selectedCustomerIds.size > 0
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  appliedActions.has('₹ 450 Plan (350+100)') 
                    ? 'bg-white text-indigo-700 border-white' 
                    : 'bg-black/10 border-black/20'
                }`}>
                  {appliedActions.has('₹ 450 Plan (350+100)') ? <span className="text-[11px] font-black leading-none">✓</span> : <span className="text-[11px] font-black leading-none text-white/50">🌟</span>}
                </div>
                <span className="font-mono">₹ 450</span>
              </button>



            </div>
          </div>
        )}

        {/* Batch Success / Action Banner with Inline Restore */}
        {(batchSuccessMessage || restoreSuccessMessage) && (
          <div className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-inner flex-wrap ${
            restoreSuccessMessage ? 'bg-blue-600 text-white' : 'bg-emerald-700 text-white'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span>{restoreSuccessMessage ? '🔄' : '✓'}</span>
              <span>{restoreSuccessMessage || batchSuccessMessage}</span>
              {totalDeletedCount > 0 && !restoreSuccessMessage && (
                <button
                  type="button"
                  onClick={handleRestoreDeleted}
                  className="ml-2 px-2.5 py-0.5 rounded-md bg-amber-300 hover:bg-amber-200 text-amber-950 font-black text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-amber-900" />
                  <span>Restore Now</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setBatchSuccessMessage(null);
                setRestoreSuccessMessage(null);
              }}
              className="text-white hover:text-slate-200 font-black cursor-pointer text-base px-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
            <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-xs sticky top-0 z-10 border-b border-slate-300 shadow-2xs">
              <tr>
                {isEssySelectionActive && (
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-200 bg-emerald-50/90">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleToggleSelectAll}
                        title={isAllFilteredSelected ? 'Deselect All' : 'Select All'}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                      <span className="text-[9px] font-black uppercase text-emerald-950 tracking-tighter">
                        All
                      </span>
                    </div>
                  </th>
                )}
                <th className="py-3 px-3 w-12 text-center border-r border-slate-200">#</th>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span>Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    {isEssySelectionActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectAll();
                        }}
                        title={isAllFilteredSelected ? 'Clear All' : 'Select All'}
                        className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 transition-colors"
                      >
                        {isAllFilteredSelected ? 'Deselect' : 'Select All'}
                      </button>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('subscriberCode')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SubscriberCode</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('stbNo')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>STBNo</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3.5 min-w-[200px] border-r border-slate-200">Channel thlan</th>
                <th
                  onClick={() => toggleSort('price')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Channel Price (₹)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right border-r border-slate-200" title="PACK-1 (BST) + Local + Ala-carte (8.47%)">
                  <div className="font-extrabold text-slate-900">LCO Hlawh (₹)</div>
                  <div className="text-[11px] font-bold normal-case text-emerald-700">
                    {subscriptionSettings?.subscriptionType === 'Day'
                      ? `Ni ${subscriptionSettings.subscriptionValue} chhut`
                      : (subscriptionSettings?.subscriptionValue ?? 1) > 1
                      ? `Thla ${subscriptionSettings?.subscriptionValue} chhut`
                      : 'Local 36.2 + 8.47%'}
                  </div>
                </th>
                <th className="py-3 px-3 text-right border-r border-slate-200" title="PACK-1 (BST) + Local + Ala-carte (91.53%)">
                  <div className="font-extrabold text-slate-900">LCO Sen / Cut (₹)</div>
                  <div className="text-[11px] font-bold normal-case text-slate-600">
                    {subscriptionSettings?.subscriptionType === 'Day'
                      ? `MSO cut (Ni ${subscriptionSettings.subscriptionValue})`
                      : (subscriptionSettings?.subscriptionValue ?? 1) > 1
                      ? `MSO cut (Thla ${subscriptionSettings?.subscriptionValue})`
                      : 'PACK-1 (BST) 75.4 + 91.53%'}
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-200">FranchiseeName</th>
                <th className="py-3 px-2 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={isEssySelectionActive ? 11 : 10}
                    className="py-10 text-center text-slate-500 italic text-sm font-medium"
                  >
                    Customer hmuh a ni lo. Search term emaw filter thlak rawh.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, index) => {
                  const actualIndex = (currentPage - 1) * pageSize + index + 1;
                  const isSelected = selectedCustomerId === r.customerId;
                  const isCustomerBatchSelected =
                    isEssySelectionActive && selectedCustomerIds.has(r.customerId);
                  const isHighlighted =
                    r.hasExtraChannels ||
                    r.isModified ||
                    (tableSearch.trim() &&
                      (r.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        r.subscriberCode.toLowerCase().includes(tableSearch.toLowerCase())));

                  // Row background matching clean PayTV theme with subtle row separator
                  const rowBgClass = isSelected
                    ? 'bg-blue-50/90 hover:bg-blue-100/90 ring-1 ring-inset ring-blue-300'
                    : isCustomerBatchSelected
                    ? 'bg-emerald-100 hover:bg-emerald-200 font-bold border-2 border-emerald-500 shadow-sm'
                    : isHighlighted
                    ? 'bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-950 font-medium'
                    : index % 2 === 1
                    ? 'bg-slate-50/70 hover:bg-slate-100/80'
                    : 'bg-white hover:bg-slate-50';

                  const borderBottomClass = isSelected
                    ? 'border-b border-blue-200'
                    : isCustomerBatchSelected
                    ? 'border-b border-emerald-200'
                    : isHighlighted
                    ? 'border-b border-emerald-200'
                    : 'border-b border-slate-200';

                  const cellBorderR = isSelected
                    ? 'border-r border-blue-200/80'
                    : isCustomerBatchSelected
                    ? 'border-r border-emerald-400'
                    : isHighlighted
                    ? 'border-r border-emerald-200/80'
                    : 'border-r border-slate-200/80';

                  return (
                    <tr
                      key={r.rowId}
                      onClick={() => onSelectCustomer(r.customerId)}
                      className={`${rowBgClass} ${borderBottomClass} transition-colors cursor-pointer group`}
                    >
                      {isEssySelectionActive && (
                        <td
                          className={`py-2.5 px-3 text-center ${cellBorderR} ${
                            isCustomerBatchSelected ? 'bg-emerald-100/60' : ''
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!r.isMultiChannelSubRow ||
                          r.channelIndex === -2 ||
                          viewMode === 'consolidated' ? (
                            <input
                              type="checkbox"
                              checked={selectedCustomerIds.has(r.customerId)}
                              onChange={() => handleToggleCustomer(r.customerId)}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                              title={`Select ${r.name}`}
                            />
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">&bull;</span>
                          )}
                        </td>
                      )}
                      <td className={`py-2.5 px-3 text-center text-slate-600 font-mono text-xs sm:text-[13px] font-semibold ${cellBorderR}`}>
                        {actualIndex}
                      </td>
                      <td className={`py-2.5 px-3.5 font-bold whitespace-nowrap text-slate-950 ${cellBorderR}`}>
                        <div className="flex items-center gap-2">
                          <span>{r.name}</span>
                          {r.isMultiChannelSubRow && typeof r.channelIndex === 'number' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                              r.channelIndex < 0 
                                ? 'bg-blue-100 text-blue-900 border-blue-300' 
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}>
                              {r.channelIndex === -2 ? 'PACK-1 (BST)' : r.channelIndex === -1 ? 'Local' : `${r.channelIndex + 1}/${r.channelTotalCount}`}
                            </span>
                          )}
                          {r.isModified && !r.isMultiChannelSubRow && (
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 shrink-0 shadow-2xs" title="Modified" />
                          )}
                        </div>
                      </td>
                      <td className={`py-2.5 px-3 font-mono text-xs sm:text-[13px] font-bold text-slate-900 whitespace-nowrap ${cellBorderR}`}>
                        {r.subscriberCode}
                      </td>
                      <td className={`py-2.5 px-3 font-mono text-xs sm:text-[13px] font-bold text-slate-900 whitespace-nowrap ${cellBorderR}`}>
                        {r.stbNo}
                      </td>
                      <td className={`py-2.5 px-3.5 whitespace-normal leading-relaxed text-xs sm:text-[13px] ${cellBorderR}`} title={r.channelName}>
                        <span className={r.hasExtraChannels ? 'text-emerald-950 font-bold' : 'text-slate-700 font-medium'}>
                          {r.channelName}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-xs sm:text-[13px] ${cellBorderR}`}>
                        {r.linePrice.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono text-emerald-800 font-black whitespace-nowrap text-xs sm:text-[13px] ${cellBorderR}`}>
                        {r.lineHlawh.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono text-slate-800 font-bold whitespace-nowrap text-xs sm:text-[13px] ${cellBorderR}`}>
                        {r.lineSen.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-slate-700 whitespace-nowrap text-xs sm:text-[13px] font-medium ${cellBorderR}`}>
                        {r.franchiseeName}
                      </td>
                      <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(r.customerId)}
                            title="Channel dah belh / Edit rawh"
                            className="p-1.5 bg-[#6f42c1] hover:bg-[#5a32a3] text-white rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {(onDeleteLine || onDeleteCustomer) && (
                            <button
                              type="button"
                              onClick={() => {
                                const isChannelLine = Boolean(
                                  r.isMultiChannelSubRow && typeof r.channelIndex === 'number'
                                );
                                setLineToDelete({
                                  customerId: r.customerId,
                                  customerName: r.name,
                                  subscriberCode: r.subscriberCode,
                                  channelName: r.channelName,
                                  channelIndex: r.channelIndex,
                                  isChannelLine,
                                });
                              }}
                              title={
                                r.isMultiChannelSubRow && typeof r.channelIndex === 'number'
                                  ? `He channel line (${r.channelName}) chauh hi paih (delete) rawh`
                                  : `${r.name} line hi paih (delete) rawh`
                              }
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span>
              Showing Page {currentPage} of {totalPages} ({tableRows.length} lines &bull; {filteredCustomers.length} subscribers)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-gray-900">{currentPage}</span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Single Line Confirmation Modal */}
      {lineToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLineToDelete(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-gray-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  {lineToDelete.isChannelLine ? 'Line / Channel Khat Chauh Paih Tur' : 'Subscriber Line Paih Tur'}
                </h4>
                <p className="text-xs text-gray-500">
                  {lineToDelete.isChannelLine
                    ? 'Hming pum zawng zawng ni lo in, he line chauh hi paih a ni ang.'
                    : 'He subscriber line hi list atangin paih a ni ang.'}
                </p>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-200 rounded-lg p-3 text-xs text-red-950 mb-4 space-y-1.5">
              {lineToDelete.isChannelLine ? (
                <>
                  <div>
                    Customer: <span className="font-semibold text-gray-900">{lineToDelete.customerName}</span>
                  </div>
                  <div>
                    Paih tur line: <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-mono">{lineToDelete.channelName}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 pt-1">
                    Customer hming leh channel dang a neih te chu a bo lo vang a, an la awm reng ang.
                  </div>
                </>
              ) : (
                <div>
                  <span className="font-semibold text-gray-900">{lineToDelete.customerName}</span> (Code: {lineToDelete.subscriberCode}) line hi subscriber list atangin paih (delete) i duh tak tak em?
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLineToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLine) {
                    onDeleteLine(
                      lineToDelete.customerId,
                      lineToDelete.channelIndex,
                      lineToDelete.channelName
                    );
                  } else if (onDeleteCustomer) {
                    onDeleteCustomer(lineToDelete.customerId);
                  }
                  if (!lineToDelete.isChannelLine) {
                    const cust = customers.find((c) => c.id === lineToDelete.customerId);
                    if (cust) {
                      setDeletedHistory((prev) => [
                        {
                          id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          customers: [cust],
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        },
                        ...prev,
                      ]);
                      setBatchSuccessMessage(
                        `Customer ${cust.name} paih (delete) a ni ta e.`
                      );
                    }
                  }
                  setLineToDelete(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lineToDelete.isChannelLine ? 'He Line Khat Chauh Paih Rawh' : 'Line Paih Rawh'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal with Yes Button */}
      {isBatchDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsBatchDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">
                  Selected Subscribers Paih (Delete) Rawh le?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subscribers <span className="font-bold text-red-600">{selectedCustomerIds.size}</span> thlante hi Customer Channel & Rate List atangin paih a ni dawn e.
                </p>
              </div>
            </div>

            {/* Preview of Customers to be deleted */}
            <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-xs text-red-950 space-y-2">
              <div className="font-bold text-red-900 flex items-center justify-between">
                <span>Paih tur Subscribers List:</span>
                <span className="font-mono text-[11px] bg-red-200/80 px-2 py-0.5 rounded font-black text-red-950">
                  Total: {selectedCustomerIds.size}
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-red-200/60 pr-1 space-y-1">
                {selectedCustomersPreview.map((cust) => (
                  <div key={cust.id} className="pt-1 first:pt-0 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                      {cust.name}
                    </span>
                    <span className="font-mono text-slate-600 bg-white/80 px-1.5 py-0.5 rounded border border-red-100 shrink-0">
                      {cust.subscriberCode}
                    </span>
                  </div>
                ))}
                {selectedCustomerIds.size > selectedCustomersPreview.length && (
                  <div className="pt-1.5 text-center text-[11px] font-bold text-red-700 italic">
                    ... leh midang {selectedCustomerIds.size - selectedCustomersPreview.length} te
                  </div>
                )}
              </div>
              <div className="text-[11px] text-red-800/90 pt-1.5 border-t border-red-200 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Tih sual palh anih pawhin a hnuah <strong>Restore</strong> button hmangin i ko kir leh thei ang.</span>
              </div>
            </div>

            {/* Footer Buttons with prominent Yes Button */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Aih / Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete ({selectedCustomerIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Action Bar when items are selected in Essy Selection mode */}
      {isEssySelectionActive && selectedCustomerIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3.5 backdrop-blur-md animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold">
              <span className="text-emerald-400 font-extrabold font-mono text-sm">{selectedCustomerIds.size}</span> thlan a ni
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() => setSelectedCustomerIds(new Set())}
            className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setIsBatchDeleteModalOpen(true)}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedCustomerIds.size})</span>
          </button>
        </div>
      )}
    </div>
  );
};
