import * as XLSX from 'xlsx';
import { CustomerSummary, ChannelItem, SubscriptionDateSettings } from '../types';
import { getChannelPriceMap, calculateCustomerPricing } from './excelParser';
import {
  BST_PRICE,
  LOCAL_PRICE,
  ALACARTE_LCO_COMMISSION_PERCENT,
} from '../data/defaultChannels';

export function exportSummaryExcel(
  customers: CustomerSummary[],
  fileName: string = 'Final_Export_LCO_Share.xlsx',
  customChannels?: ChannelItem[],
  bstPrice: number = BST_PRICE,
  localAddonPrice: number = LOCAL_PRICE,
  subscriptionSettings?: SubscriptionDateSettings
): void {
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

    if (c.selectedChannels.length === 0) {
      const channelDisplay = isLocalActive ? `BST + Local (${periodLabel})` : `BST (${periodLabel})`;
      const packageAddonDisplay = isLocalActive ? 'BST + Local' : 'BST chauh';

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
      const packageAddonDisplay = isLocalActive ? 'BST + Local' : 'BST chauh';
      
      c.selectedChannels.forEach((channelName, chIdx) => {
        const cleanName = channelName.toLowerCase().trim();
        const rawChRate = priceMap.get(cleanName) || 0;
        const chRate = Number((rawChRate * periodRatio).toFixed(2));

        // Base components share for this specific line
        const chLcoHlawh = Number(((chRate * ALACARTE_LCO_COMMISSION_PERCENT) / 100).toFixed(2));
        const chLcoSen = Number((chRate - chLcoHlawh).toFixed(2));

        let linePrice = 0;
        let lineSen = 0;
        let lineHlawh = 0;

        if (chIdx === 0) {
          // First row carries the base package (BST + Local)
          const baseLcoHlawh = Number((((pricing.bstLcoShare || 0) + (pricing.localLcoShare || 0)) * periodRatio).toFixed(2));
          const baseLcoSen = Number((((pricing.bstMsoCut || 0) + (pricing.localMsoCut || 0)) * periodRatio).toFixed(2));
          const basePkgPrice = Number(((bstPrice + (isLocalActive ? localAddonPrice : 0)) * periodRatio).toFixed(2));
          
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
          'Channel thlan': periodRatio !== 1 ? `${channelName} (${periodLabel})` : channelName,
          'Standard Rate': linePrice,
          'LCO Hlawh (Standard)': lineHlawh,
          'LCO Sen (Cut)': lineSen,
          'Bill Collected': chIdx === 0 ? billCollected : 0, // Only first row shows total collection for summary
          'Actual Profit (Net)': chIdx === 0 ? actualNetProfit : 0,
          'FranchiseeName': c.franchiseeName || '',
        });
      });
    }
  }

  // Calculate grand totals based on periodRatio
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
  const totalActualCollection = Number((baseActualCollection * periodRatio).toFixed(2));
  const totalActualNetProfit = Number((totalActualCollection - totalStandardSen).toFixed(2));

  // Append empty row then Grand Total row
  dataRows.push({
    '#': '',
    'Name': '',
    'SubscriberCode': '',
    'STBNo': '',
    'Package / Addon': '',
    'Channel thlan': periodRatio !== 1 ? `GRAND TOTAL (${periodLabel})` : 'GRAND TOTAL',
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

  XLSX.writeFile(workbook, fileName);
}

export interface BulkRenewExportOptions {
  subscriptionTypeHeader?: 'SubscriptionType(Day/Month/Year)' | 'SubscriptionType(Day/Month)' | 'SubscriptionType(Days/Month)' | string;
  sheetName?: string;
  localPackageName?: string;
  hdPackageName?: string;
  includeLpsHd?: 'none' | 'with-locals' | 'hd-only' | 'all';
  includeBillCollected?: boolean;
  subscriptionSettings?: SubscriptionDateSettings;
}

export function exportBulkPackageRenewExcel(
  customers: CustomerSummary[],
  fileName: string = 'BulkPackageRenew_BST.xlsx',
  options?: BulkRenewExportOptions
): void {
  // Exact format matching LPS Cable Bulk Renew template:
  // 1. Name
  // 2. SubscriberCode
  // 3. STBNo
  // 4. VCNo
  // 5. Type (Package/Channel)
  // 6. PackageChannelName
  // 7. SubscriptionType(Day/Month/Year)
  // 8. SubscriptionValue
  // 9. NetworkCapacityFee
  // 10. PackageDiscount
  // 11. ServiceType
  // 12. FranchiseeName
  // (Optional 13. Bill Collected)
  const subTypeCol = options?.subscriptionTypeHeader || 'SubscriptionType(Day/Month/Year)';
  const sheetName = options?.sheetName || 'BulkPackageRenew';
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

    const billCollectedVal = c.customBillAmount !== undefined && c.customBillAmount > 0 ? c.customBillAmount : '';

    // 1. Base Package row (Always 'BST')
    const bstRowObj: Record<string, unknown> = {
      'Name': c.name,
      'SubscriberCode': c.subscriberCode,
      'STBNo': c.stbNo,
      'VCNo': c.vcNo || '',
      'Type (Package/Channel)': 'Package',
      'PackageChannelName': 'BST',
      [subTypeCol]: subType,
      'SubscriptionValue': String(subVal),
      'NetworkCapacityFee': c.networkCapacityFee ?? '0.00',
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
        'Type (Package/Channel)': 'Package',
        'PackageChannelName': localPkgName,
        [subTypeCol]: subType,
        'SubscriptionValue': String(subVal),
        'NetworkCapacityFee': c.networkCapacityFee ?? '0.00',
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
        'Type (Package/Channel)': 'Package',
        'PackageChannelName': hdPkgName,
        [subTypeCol]: subType,
        'SubscriptionValue': String(subVal),
        'NetworkCapacityFee': c.networkCapacityFee ?? '0.00',
        'PackageDiscount': c.packageDiscount ?? '0.00',
        'ServiceType': c.serviceType || 'PayTV',
        'FranchiseeName': c.franchiseeName || '',
      };
      if (includeBillCollected) {
        hdRowObj['Bill Collected'] = '';
      }
      rawRows.push(hdRowObj);
    }

    // 4. Each selected channel row
    for (const channelName of c.selectedChannels) {
      const chRowObj: Record<string, unknown> = {
        'Name': c.name,
        'SubscriberCode': c.subscriberCode,
        'STBNo': c.stbNo,
        'VCNo': c.vcNo || '',
        'Type (Package/Channel)': 'Channel',
        'PackageChannelName': channelName,
        [subTypeCol]: subType,
        'SubscriptionValue': String(subVal),
        'NetworkCapacityFee': c.networkCapacityFee ?? '0.00',
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
    'Type (Package/Channel)',
    'PackageChannelName',
    subTypeCol,
    'SubscriptionValue',
    'NetworkCapacityFee',
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
    { wch: 20 }, // NetworkCapacityFee
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

  XLSX.writeFile(workbook, fileName);
}

/**
 * Generate a pre-filled Excel template for Channel Rates so user can fill and upload
 */
export function exportChannelRateTemplateExcel(
  channels: ChannelItem[],
  fileName: string = 'LPS_Channel_Rate_Template.xlsx'
): void {
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
  XLSX.writeFile(workbook, fileName);
}

