import * as XLSX from 'xlsx';
import { CustomerSummary, ChannelItem, SubscriptionDateSettings } from '../types';
import { getChannelPriceMap, calculateCustomerPricing, normalizeKey } from './excelParser';
import {
  BST_PRICE,
  LOCAL_PRICE,
  ALACARTE_LCO_COMMISSION_PERCENT,
} from '../data/defaultChannels';

export async function exportSummaryExcel(
  customers: CustomerSummary[],
  fileName: string = 'Final_Export_LCO_Share.xls',
  customChannels?: ChannelItem[],
  bstPrice: number = BST_PRICE,
  localAddonPrice: number = LOCAL_PRICE,
  subscriptionSettings?: SubscriptionDateSettings,
  customTotalDeposit?: number | null,
  options?: {
    forceDirectDownload?: boolean;
  }
): Promise<SaveFileResult> {
  // Format matching Official LPS Bill Formula:
  // 1. BST Rs 154: LCO Share Rs 78.60 (51.04%), MSO Cut Rs 75.40 (48.96%)
  // 2. Local Rs 71: LCO Share Rs 36.20 (50.99%), MSO Cut Rs 34.80 (49.01%)
  // 3. Ala-carte channels: 8.47% LCO Share, 91.53% Broadcaster/MSO Cut
  // If customer has >1 channel: each channel gets its own row with customer name
  const priceMap = getChannelPriceMap(customChannels);
  const dataRows: Record<string, unknown>[] = [];
  let rowNumber = 1;

  let periodRatio = 1;
  let periodLabel = '1 Month';
  if (subscriptionSettings) {
    if (subscriptionSettings.subscriptionType === 'Day') {
      const days = Math.max(1, Number(subscriptionSettings.subscriptionValue) || 1);
      periodRatio = days / 30;
      periodLabel = `Ni ${days}`;
    } else {
      const months = Math.max(1, Number(subscriptionSettings.subscriptionValue) || 1);
      periodRatio = months;
      periodLabel = months === 1 ? '1 Month' : `${months} Months`;
    }
  }

  for (const c of customers) {
    const isLocalActive = c.hasLocalAddon !== false;
    const pricing = calculateCustomerPricing(
      c.selectedChannels,
      isLocalActive,
      bstPrice,
      localAddonPrice,
      ALACARTE_LCO_COMMISSION_PERCENT,
      priceMap
    );

    const hasCustomBill = c.customBillAmount !== undefined && c.customBillAmount > 0;
    const baseBill = hasCustomBill ? c.customBillAmount! : pricing.price;
    const billCollected = Number((baseBill * periodRatio).toFixed(2));
    const totalStandardPrice = Number((pricing.price * periodRatio).toFixed(2));
    const totalStandardHlawh = Number((pricing.lcoHlawh * periodRatio).toFixed(2));
    const totalStandardSen = Number((pricing.lcoSen * periodRatio).toFixed(2));
    const actualNetProfit = Number((billCollected - totalStandardSen).toFixed(2));

    // Deduplicate channels for export so double channels never appear twice
    const uniqueChannels: string[] = [];
    const seenNorm = new Set<string>();
    for (const ch of c.selectedChannels) {
      const norm = normalizeKey(ch);
      if (norm && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        uniqueChannels.push(ch);
      }
    }

    if (uniqueChannels.length === 0) {
      const channelDisplay = isLocalActive ? 'PACK-1 (BST) + Local' : 'PACK-1 (BST)';
      const packageAddonDisplay = isLocalActive ? 'PACK-1 (BST) + Local' : 'PACK-1 (BST) chauh';

      dataRows.push({
        '#': rowNumber++,
        'Name': c.name,
        'SubscriberCode': c.subscriberCode,
        'STBNo': c.stbNo,
        'Package / Addon': packageAddonDisplay,
        'Channel thlan': channelDisplay,
        'Standard Rate': totalStandardPrice,
        'LCO Hlawh (Standard)': totalStandardHlawh,
        'LCO Sen (Cut)': totalStandardSen,
        'Bill Collected': billCollected,
        'Actual Profit (Net)': actualNetProfit,
        'FranchiseeName': c.franchiseeName || '',
      });
    } else {
      const packageAddonDisplay = isLocalActive ? 'PACK-1 (BST) + Local' : 'PACK-1 (BST) chauh';
      
      uniqueChannels.forEach((channelName, chIdx) => {
        const cleanName = channelName.toLowerCase().trim();
        const rawChRate = priceMap.get(cleanName) || 0;
        const chRate = Number(rawChRate.toFixed(2));

        // Base components share for this specific line
        const chLcoHlawh = Number(((chRate * ALACARTE_LCO_COMMISSION_PERCENT) / 100).toFixed(2));
        const chLcoSen = Number((chRate - chLcoHlawh).toFixed(2));

        let linePrice = 0;
        let lineSen = 0;
        let lineHlawh = 0;

        if (chIdx === 0) {
          // First row carries the base package (BST + Local)
          const baseLcoHlawh = Number(((pricing.bstLcoShare || 0) + (pricing.localLcoShare || 0)).toFixed(2));
          const baseLcoSen = Number(((pricing.bstMsoCut || 0) + (pricing.localMsoCut || 0)).toFixed(2));
          const basePkgPrice = Number((bstPrice + (isLocalActive ? localAddonPrice : 0)).toFixed(2));
          
          linePrice = Number((basePkgPrice + chRate).toFixed(2));
          lineHlawh = Number((baseLcoHlawh + chLcoHlawh).toFixed(2));
          lineSen = Number((baseLcoSen + chLcoSen).toFixed(2));
        } else {
          // Subsequent rows are just the a-la-carte channel rates
          linePrice = Number(chRate.toFixed(2));
          lineHlawh = chLcoHlawh;
          lineSen = chLcoSen;
        }

        dataRows.push({
          '#': rowNumber++,
          'Name': c.name,
          'SubscriberCode': c.subscriberCode,
          'STBNo': c.stbNo,
          'Package / Addon': packageAddonDisplay,
          'Channel thlan': channelName,
          'Standard Rate': Number((linePrice * periodRatio).toFixed(2)),
          'LCO Hlawh (Standard)': Number((lineHlawh * periodRatio).toFixed(2)),
          'LCO Sen (Cut)': Number((lineSen * periodRatio).toFixed(2)),
          'Bill Collected': chIdx === 0 ? billCollected : 0, // Only first row shows total collection for summary
          'Actual Profit (Net)': chIdx === 0 ? actualNetProfit : 0,
          'FranchiseeName': c.franchiseeName || '',
        });
      });
    }
  }

  // Calculate grand totals based on standard monthly amounts
  const baseStandardPrice = customers.reduce((sum, c) => sum + c.channelPrice, 0);
  const baseStandardHlawh = customers.reduce((sum, c) => sum + c.lcoHlawh, 0);
  const baseStandardSen = customers.reduce((sum, c) => sum + c.lcoSen, 0);
  const baseActualCollection = customers.reduce(
    (sum, c) => sum + (c.customBillAmount !== undefined && c.customBillAmount > 0 ? c.customBillAmount : c.channelPrice),
    0
  );

  const totalStandardPrice = Number((baseStandardPrice * periodRatio).toFixed(2));
  const totalStandardHlawh = Number((baseStandardHlawh * periodRatio).toFixed(2));
  const totalStandardSen = Number((baseStandardSen * periodRatio).toFixed(2));
  const defaultActualCollection = Number((baseActualCollection * periodRatio).toFixed(2));
  const totalActualCollection = customTotalDeposit !== null && customTotalDeposit !== undefined
    ? customTotalDeposit
    : defaultActualCollection;
  const totalActualNetProfit = Number((totalActualCollection - totalStandardSen).toFixed(2));

  // Append empty row then Grand Total row
  dataRows.push({
    '#': '',
    'Name': '',
    'SubscriberCode': '',
    'STBNo': '',
    'Package / Addon': '',
    'Channel thlan': `GRAND TOTAL (${periodLabel})`,
    'Standard Rate': totalStandardPrice,
    'LCO Hlawh (Standard)': totalStandardHlawh,
    'LCO Sen (Cut)': totalStandardSen,
    'Bill Collected': totalActualCollection,
    'Actual Profit (Net)': totalActualNetProfit,
    'FranchiseeName': '',
  });

  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // #
    { wch: 28 }, // Name
    { wch: 18 }, // SubscriberCode
    { wch: 20 }, // STBNo
    { wch: 18 }, // Package / Addon
    { wch: 35 }, // Channel thlan
    { wch: 16 }, // Standard Rate
    { wch: 18 }, // LCO Hlawh
    { wch: 16 }, // LCO Sen
    { wch: 16 }, // Bill Collected
    { wch: 18 }, // Actual Profit
    { wch: 18 }, // FranchiseeName
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'LCO_Share_Summary');

  const safeFileName = fileName.endsWith('.xls') || fileName.endsWith('.xlsx') ? fileName : `${fileName}.xls`;
  const isXlsx = safeFileName.endsWith('.xlsx');
  return await saveWorkbookWithFolderPicker(workbook, safeFileName, isXlsx, options);
}

export interface SaveFileResult {
  success: boolean;
  method: 'picker' | 'download' | 'cancelled';
  fileName: string;
  error?: string;
  isIframe?: boolean;
}

/**
 * Save an Excel workbook by prompting user to select destination folder
 * via window.showSaveFilePicker() (File System Access API).
 * If showSaveFilePicker is not supported or restricted (e.g. inside an iframe),
 * it seamlessly falls back to standard browser download.
 */
export async function saveWorkbookWithFolderPicker(
  workbook: XLSX.WorkBook,
  suggestedFileName: string,
  isXlsx: boolean = false,
  options?: {
    forceDirectDownload?: boolean;
  }
): Promise<SaveFileResult> {
  const safeFileName =
    suggestedFileName.endsWith('.xls') || suggestedFileName.endsWith('.xlsx')
      ? suggestedFileName
      : `${suggestedFileName}.${isXlsx ? 'xlsx' : 'xls'}`;

  // Direct download if requested
  if (options?.forceDirectDownload) {
    downloadViaBlob(workbook, safeFileName, isXlsx);
    return { success: true, method: 'download', fileName: safeFileName };
  }

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Modern File System Access API: window.showSaveFilePicker
  // Opens native OS Save As dialog to choose folder!
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const mimeType = isXlsx
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.ms-excel';
      const ext = isXlsx ? '.xlsx' : '.xls';

      const fileHandle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<{
          name: string;
          createWritable: () => Promise<{
            write: (data: unknown) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }).showSaveFilePicker({
        suggestedName: safeFileName,
        types: [
          {
            description: isXlsx
              ? 'Excel Workbook (*.xlsx)'
              : 'Excel 97-2003 Workbook (*.xls)',
            accept: {
              [mimeType]: [ext],
            },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      const wbout = XLSX.write(workbook, {
        bookType: isXlsx ? 'xlsx' : 'biff8',
        type: 'array',
      });
      await writable.write(new Uint8Array(wbout));
      await writable.close();

      return {
        success: true,
        method: 'picker',
        fileName: fileHandle.name || safeFileName,
      };
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'AbortError') {
        // User clicked "Cancel" in the native folder / save dialog
        return {
          success: false,
          method: 'cancelled',
          fileName: safeFileName,
        };
      }
      // If blocked in iframe or unsupported, fallback to standard download
      console.warn('showSaveFilePicker not permitted or failed, falling back to download:', err);
    }
  }

  // Fallback to standard browser download
  downloadViaBlob(workbook, safeFileName, isXlsx);
  return {
    success: true,
    method: 'download',
    fileName: safeFileName,
    isIframe,
  };
}

function downloadViaBlob(
  workbook: XLSX.WorkBook,
  fileName: string,
  isXlsx: boolean
): void {
  const wbout = XLSX.write(workbook, {
    bookType: isXlsx ? 'xlsx' : 'biff8',
    type: 'array',
  });
  const mimeType = isXlsx
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/vnd.ms-excel';
  const blob = new Blob([wbout], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export interface BulkRenewExportOptions {
  basePackageName?: string;
  typeHeader?: 'Type (Package/Channel)' | 'Type(Package/Channel)' | string;
  packageChannelNameHeader?: 'PackageChannelName' | 'Name (Package/Channel)' | string;
  subscriptionTypeHeader?: 'SubscriptionType(Day/Month/Year)' | 'SubscriptionType(Day/Month)' | 'SubscriptionType(Days/Month)' | string;
  ncfHeader?: 'NetworkCapacityFees' | 'NetworkCapacityFee' | string;
  sheetName?: string;
  localPackageName?: string;
  hdPackageName?: string;
  includeLpsHd?: 'none' | 'with-locals' | 'hd-only' | 'all';
  includeBillCollected?: boolean;
  subscriptionSettings?: SubscriptionDateSettings;
}

export async function exportBulkPackageRenewExcel(
  customers: CustomerSummary[],
  fileName: string = 'BulkPackageRenew_PACK-1(BST).xls',
  options?: BulkRenewExportOptions & {
    forceDirectDownload?: boolean;
  }
): Promise<SaveFileResult> {
  // Exact format matching LPS Cable Bulk Renew template:
  // 1. Name
  // 2. SubscriberCode
  // 3. STBNo
  // 4. VCNo
  // 5. Type (Package/Channel) or Type(Package/Channel)
  // 6. PackageChannelName or Name (Package/Channel): e.g. PACK-1 (BST)
  // 7. SubscriptionType(Day/Month/Year)
  // 8. SubscriptionValue
  // 9. NetworkCapacityFees (or NetworkCapacityFee)
  // 10. PackageDiscount
  // 11. ServiceType
  // 12. FranchiseeName
  // (Optional 13. Bill Collected)
  const basePkgName = options?.basePackageName || 'PACK-1 (BST)';
  const typeCol = options?.typeHeader || 'Type (Package/Channel)';
  const pkgChannelCol = options?.packageChannelNameHeader || 'PackageChannelName';
  const subTypeCol = options?.subscriptionTypeHeader || 'SubscriptionType(Day/Month/Year)';
  const ncfCol = options?.ncfHeader || 'NetworkCapacityFees';
  const sheetName = options?.sheetName || 'Sheet1';
  const localPkgName = options?.localPackageName || 'LPS LOCALS';
  const hdPkgName = options?.hdPackageName || 'LPS HD';
  const includeLpsHd = options?.includeLpsHd || 'none';
  const includeBillCollected = !!options?.includeBillCollected;
  const rawRows: Record<string, unknown>[] = [];

  for (const c of customers) {
    const isLocalActive = c.hasLocalAddon !== false;
    const subType = options?.subscriptionSettings?.subscriptionType || c.subscriptionPeriod || 'Month';
    
    // Ensure subVal is a valid number, defaulting to 1 if missing or 0
    let subVal: number = 1;
    if (options?.subscriptionSettings?.subscriptionValue !== undefined) {
      subVal = Number(options.subscriptionSettings.subscriptionValue);
    } else if (c.subscriptionCount !== undefined) {
      subVal = Number(c.subscriptionCount);
    }
    if (isNaN(subVal) || subVal <= 0) subVal = 1;

    let periodRatio = 1;
    if (options?.subscriptionSettings) {
      if (options.subscriptionSettings.subscriptionType === 'Day') {
        periodRatio = Math.max(1, Number(options.subscriptionSettings.subscriptionValue) || 1) / 30;
      } else {
        periodRatio = Math.max(1, Number(options.subscriptionSettings.subscriptionValue) || 1);
      }
    }

    const billCollectedVal = c.customBillAmount !== undefined && c.customBillAmount > 0
      ? Number((c.customBillAmount * periodRatio).toFixed(2))
      : '';

    // 1. Base Package row (Default 'PACK-1 (BST)')
    const bstRowObj: Record<string, unknown> = {
      'Name': c.name,
      'SubscriberCode': c.subscriberCode,
      'STBNo': c.stbNo,
      'VCNo': c.vcNo || '',
      [typeCol]: 'Package',
      [pkgChannelCol]: basePkgName,
      [subTypeCol]: subType,
      'SubscriptionValue': Number(subVal) || 1,
      [ncfCol]: c.networkCapacityFee ?? '0.00',
      'PackageDiscount': c.packageDiscount ?? '0.00',
      'ServiceType': c.serviceType || 'PayTV',
      'FranchiseeName': c.franchiseeName || '',
    };
    if (includeBillCollected) {
      bstRowObj['Bill Collected'] = billCollectedVal;
    }
    rawRows.push(bstRowObj);

    // 2. Local Package row (default 'LPS LOCALS')
    if (isLocalActive) {
      const localRowObj: Record<string, unknown> = {
        'Name': c.name,
        'SubscriberCode': c.subscriberCode,
        'STBNo': c.stbNo,
        'VCNo': c.vcNo || '',
        [typeCol]: 'Package',
        [pkgChannelCol]: localPkgName,
        [subTypeCol]: subType,
        'SubscriptionValue': Number(subVal) || 1,
        [ncfCol]: c.networkCapacityFee ?? '0.00',
        'PackageDiscount': c.packageDiscount ?? '0.00',
        'ServiceType': c.serviceType || 'PayTV',
        'FranchiseeName': c.franchiseeName || '',
      };
      if (includeBillCollected) {
        localRowObj['Bill Collected'] = '';
      }
      rawRows.push(localRowObj);
    }

    // 3. HD Package row (default 'LPS HD' - included alongside LPS LOCALS)
    const shouldIncludeHdRow =
      includeLpsHd === 'all' ||
      (includeLpsHd === 'with-locals' && isLocalActive) ||
      (includeLpsHd !== 'none' &&
        (c.hasLpsHd ||
          c.selectedChannels.some(
            (ch) => ch.toUpperCase().includes(' HD') || ch.toUpperCase().endsWith('-HD')
          )));

    if (shouldIncludeHdRow) {
      const hdRowObj: Record<string, unknown> = {
        'Name': c.name,
        'SubscriberCode': c.subscriberCode,
        'STBNo': c.stbNo,
        'VCNo': c.vcNo || '',
        [typeCol]: 'Package',
        [pkgChannelCol]: hdPkgName,
        [subTypeCol]: subType,
        'SubscriptionValue': Number(subVal) || 1,
        [ncfCol]: c.networkCapacityFee ?? '0.00',
        'PackageDiscount': c.packageDiscount ?? '0.00',
        'ServiceType': c.serviceType || 'PayTV',
        'FranchiseeName': c.franchiseeName || '',
      };
      if (includeBillCollected) {
        hdRowObj['Bill Collected'] = '';
      }
      rawRows.push(hdRowObj);
    }

    // 4. Each selected channel row (deduplicated so double channels never appear twice)
    const uniqueChannels: string[] = [];
    const seenNorm = new Set<string>();
    for (const ch of c.selectedChannels) {
      const norm = normalizeKey(ch);
      if (norm && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        uniqueChannels.push(ch);
      }
    }
    for (const channelName of uniqueChannels) {
      const chRowObj: Record<string, unknown> = {
        'Name': c.name,
        'SubscriberCode': c.subscriberCode,
        'STBNo': c.stbNo,
        'VCNo': c.vcNo || '',
        [typeCol]: 'Channel',
        [pkgChannelCol]: channelName,
        [subTypeCol]: subType,
        'SubscriptionValue': Number(subVal) || 1,
        [ncfCol]: c.networkCapacityFee ?? '0.00',
        'PackageDiscount': c.packageDiscount ?? '0.00',
        'ServiceType': c.serviceType || 'PayTV',
        'FranchiseeName': c.franchiseeName || '',
      };
      if (includeBillCollected) {
        chRowObj['Bill Collected'] = '';
      }
      rawRows.push(chRowObj);
    }
  }

  const headers = [
    'Name',
    'SubscriberCode',
    'STBNo',
    'VCNo',
    typeCol,
    pkgChannelCol,
    subTypeCol,
    'SubscriptionValue',
    ncfCol,
    'PackageDiscount',
    'ServiceType',
    'FranchiseeName'
  ];
  if (includeBillCollected) {
    headers.push('Bill Collected');
  }

  const worksheet = XLSX.utils.json_to_sheet(rawRows, { header: headers });

  const colWidths = [
    { wch: 28 }, // Name
    { wch: 18 }, // SubscriberCode
    { wch: 18 }, // STBNo
    { wch: 20 }, // VCNo
    { wch: 24 }, // Type (Package/Channel)
    { wch: 30 }, // PackageChannelName
    { wch: 28 }, // SubscriptionType(Day/Month)
    { wch: 18 }, // SubscriptionValue
    { wch: 20 }, // NetworkCapacityFees
    { wch: 18 }, // PackageDiscount
    { wch: 15 }, // ServiceType
    { wch: 20 }, // FranchiseeName
  ];
  if (includeBillCollected) {
    colWidths.push({ wch: 16 });
  }

  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // LPS Portal strictly expects .xls (BIFF8 / Excel 97-2003)
  const safeName = fileName.replace(/\.[^/.]+$/, '') + '.xls';
  return await saveWorkbookWithFolderPicker(workbook, safeName, false, options);
}

/**
 * Generate a pre-filled Excel template for Channel Rates so user can fill and upload
 */
export async function exportChannelRateTemplateExcel(
  channels: ChannelItem[],
  fileName: string = 'LPS_Channel_Rate_Template.xls',
  options?: {
    forceDirectDownload?: boolean;
  }
): Promise<SaveFileResult> {
  const rows = channels.map((ch) => {
    const lcoShare = Number((ch.price * 0.0847).toFixed(2));
    const msoCut = Number((ch.price - lcoShare).toFixed(2));
    return {
      'Channel Name': ch.name,
      'Price (with GST)': ch.price,
      'LCO Share (8.47%)': lcoShare,
      'MSO Cut (91.53%)': msoCut,
      'Category': ch.category,
      'HD/SD': ch.isHd ? 'HD' : 'SD',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 35 }, // Channel Name
    { wch: 20 }, // Price (with GST)
    { wch: 20 }, // LCO Share (8.47%)
    { wch: 20 }, // MSO Cut (91.53%)
    { wch: 20 }, // Category
    { wch: 10 }, // HD/SD
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ChannelRates');
  const safeFileName = fileName.endsWith('.xls') || fileName.endsWith('.xlsx') ? fileName : `${fileName}.xls`;
  const isXlsx = safeFileName.endsWith('.xlsx');
  return await saveWorkbookWithFolderPicker(workbook, safeFileName, isXlsx, options);
}

