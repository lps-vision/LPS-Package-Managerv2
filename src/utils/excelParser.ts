import * as XLSX from 'xlsx';
import { CustomerSummary, SubscriberRawRow, ChannelItem } from '../types';
import {
  DEFAULT_BASE_PRICE,
  DEFAULT_CHANNELS,
  DEFAULT_LCO_COMMISSION_PERCENT,
  BST_PRICE,
  BST_LCO_SHARE,
  BST_MSO_CUT,
  LOCAL_PRICE,
  LOCAL_LCO_SHARE,
  LOCAL_MSO_CUT,
  ALACARTE_LCO_COMMISSION_PERCENT,
  ALACARTE_MSO_PERCENT,
  SD_ADDON_PRESET,
  HD_ADDON_PRESET,
  SPORTS_ADDON_PRESET,
  SILVER_PRESET,
  GOLD_PRESET,
} from '../data/defaultChannels';

export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getChannelPriceMap(customChannels?: ChannelItem[]): Map<string, number> {
  const map = new Map<string, number>();
  const list = customChannels || DEFAULT_CHANNELS;

  for (const ch of list) {
    const rawLower = ch.name.toLowerCase().trim();
    const normKey = normalizeKey(ch.name);
    map.set(rawLower, ch.price);
    map.set(normKey, ch.price);
  }

  // Add smart aliases for common variants in LPS subscriber raw dumps
  for (const ch of list) {
    const lower = ch.name.toLowerCase().trim();
    const p = ch.price;

    // Sony Sports Ten variations (e.g. "sony sports ten 1" -> "sony ten 1", "sony ten1", "ten 1")
    if (lower.includes('sony sports ten')) {
      const shortTen = lower.replace('sony sports ten', 'sony ten');
      map.set(shortTen, p);
      map.set(normalizeKey(shortTen), p);
      const noSpaceTen = shortTen.replace(/ten\s*(\d+)/g, 'ten$1');
      map.set(noSpaceTen, p);
      map.set(normalizeKey(noSpaceTen), p);
      const onlyTen = lower.replace('sony sports ten', 'ten');
      map.set(onlyTen, p);
      map.set(normalizeKey(onlyTen), p);
      // Extra catch for 1/4, 2/4 style if they are meant to be Ten 1, Ten 2
      if (lower.includes('ten 1')) map.set('1/4', p);
      if (lower.includes('ten 2')) map.set('2/4', p);
      if (lower.includes('ten 3')) map.set('3/4', p);
      if (lower.includes('ten 5')) map.set('4/4', p);
    }

    // Star Sports HD dash variations: "star sports hd-1" <-> "star sports 1 hd"
    if (lower.startsWith('star sports hd-')) {
      const num = lower.replace('star sports hd-', '').trim();
      map.set(`star sports ${num} hd`, p);
      map.set(`star sports hd ${num}`, p);
      map.set(normalizeKey(`star sports ${num} hd`), p);
    }

    // SS Select variations
    if (lower.startsWith('ss select hd-') || lower.startsWith('ss select hd ')) {
      const num = lower.replace(/ss select hd[- ]/g, '').trim();
      map.set(`star sports select ${num} hd`, p);
      map.set(`star sports select hd ${num}`, p);
      map.set(`star sports select hd-${num}`, p);
      map.set(`ss select ${num} hd`, p);
      map.set(`ss select hd ${num}`, p);
      map.set(`ss select hd-${num}`, p);
      map.set(normalizeKey(`star sports select ${num} hd`), p);
      map.set(normalizeKey(`ss select ${num} hd`), p);
    }

    if (lower.startsWith('star sports select ')) {
      const num = lower.replace('star sports select ', '').trim();
      map.set(`ss select ${num}`, p);
      map.set(`ss select-${num}`, p);
      map.set(normalizeKey(`ss select ${num}`), p);
    }

    // Discovery variations
    if (lower === 'discovery') {
      map.set('discovery channel', p);
      map.set(normalizeKey('discovery channel'), p);
    }

    // National Geographic
    if (lower === 'ngc') {
      map.set('national geographic', p);
      map.set('national geographic channel', p);
      map.set('nat geo', p);
      map.set(normalizeKey('national geographic'), p);
    }
    if (lower === 'ngc hd') {
      map.set('national geographic hd', p);
      map.set('nat geo hd', p);
      map.set(normalizeKey('national geographic hd'), p);
    }

    // Nat Geo Wild
    if (lower === 'ng wild') {
      map.set('nat geo wild', p);
      map.set('national geographic wild', p);
    }
    if (lower === 'ng wild hd') {
      map.set('nat geo wild hd', p);
      map.set('national geographic wild hd', p);
    }

    // Sony SET
    if (lower === 'set') {
      map.set('sony entertainment television', p);
      map.set('sony tv', p);
    }
    if (lower === 'set max') {
      map.set('sony max', p);
    }
    if (lower === 'set pix') {
      map.set('sony pix', p);
    }
  }

  return map;
}

/**
 * Official LPS Bill Calculation:
 * 1. BST Rs 154/- ah: 
 *    - LCO Share: Rs 78.60 = 51.04%
 *    - MSO Cut: Rs 75.40 = 48.96%
 * 2. LOCAL Rs 71/- ah: 
 *    - LCO Share: Rs 36.20 = 50.99% ~ 51% 
 *    - MSO Cut: Rs 34.80 = 49.01%
 * 3. Ala-Car-te Channel khat zelah:
 *    - LCO Share: 8.47%
 *    - Broadcaster/ MSO: 91.53%
 */
export function calculateCustomerPricing(
  channels: string[],
  hasLocalAddon: boolean = true,
  bstPrice: number = BST_PRICE,
  localAddonPrice: number = LOCAL_PRICE,
  alacarteCommissionPercent: number = ALACARTE_LCO_COMMISSION_PERCENT,
  channelPriceMap?: Map<string, number>
): {
  price: number;
  lcoHlawh: number;
  lcoSen: number;
  alacarteTotal: number;
  bstPrice: number;
  localPrice: number;
  bstLcoShare: number;
  bstMsoCut: number;
  localLcoShare: number;
  localMsoCut: number;
  alacarteLcoShare: number;
  alacarteMsoCut: number;
} {
  const priceMap = channelPriceMap || getChannelPriceMap();
  
  let alacarteTotal = 0;
  for (const ch of channels) {
    const cleanName = ch.toLowerCase().trim();
    const normKey = normalizeKey(ch);
    if (priceMap.has(cleanName)) {
      alacarteTotal += priceMap.get(cleanName)!;
    } else if (priceMap.has(normKey)) {
      alacarteTotal += priceMap.get(normKey)!;
    }
  }

  // 1. BST split (LCO Share Rs 78.60, MSO Cut Rs 75.40)
  // Exact values from user: 78.6 / 154 = 51.03896%
  const bstLcoShare = bstPrice === BST_PRICE ? BST_LCO_SHARE : Number(((bstPrice * 51.03896) / 100).toFixed(2));
  const bstMsoCut = Number((bstPrice - bstLcoShare).toFixed(2));

  // 2. LOCAL split (LCO Share Rs 36.20, MSO Cut Rs 34.80)
  // Exact values from user: 36.2 / 71 = 50.9859%
  const effectiveLocalPrice = hasLocalAddon ? localAddonPrice : 0;
  const localLcoShare = hasLocalAddon
    ? (localAddonPrice === LOCAL_PRICE ? LOCAL_LCO_SHARE : Number(((localAddonPrice * 50.9859) / 100).toFixed(2)))
    : 0;
  const localMsoCut = Number((effectiveLocalPrice - localLcoShare).toFixed(2));

  // 3. Ala-carte split (8.47% LCO Share, 91.53% Broadcaster/MSO Cut)
  const alacarteLcoShare = Number(((alacarteTotal * alacarteCommissionPercent) / 100).toFixed(2));
  const alacarteMsoCut = Number((alacarteTotal - alacarteLcoShare).toFixed(2));

  // Total Customer Bill = BST + Local (if active) + Ala-carte channels
  const totalPrice = Number((bstPrice + effectiveLocalPrice + alacarteTotal).toFixed(2));
  
  // Total LCO Sen is what we pay MSO (the 'Cut')
  const lcoSen = Number((bstMsoCut + localMsoCut + alacarteMsoCut).toFixed(2));
  
  // Total LCO Hlawh is the remainder (Total - Cut)
  const lcoHlawh = Number((totalPrice - lcoSen).toFixed(2));

  return {
    price: totalPrice,
    lcoHlawh,
    lcoSen,
    alacarteTotal: Number(alacarteTotal.toFixed(2)),
    bstPrice,
    localPrice: effectiveLocalPrice,
    bstLcoShare,
    bstMsoCut,
    localLcoShare,
    localMsoCut,
    alacarteLcoShare,
    alacarteMsoCut,
  };
}

export function sanitizePackageName(name: string): string {
  const upper = (name || '').toUpperCase().trim();
  // Gold Silver leh Add On vel hi a awm tawh dawn lo a.
  // Chu vangin column F a PackageChannelName ah LPS SILVER leh LPS GOLD tih a awm chuan
  // Automatic in BST tia thlak tur.
  if (
    upper.includes('SILVER') ||
    upper.includes('GOLD') ||
    upper.includes('ADD ON') ||
    upper.includes('ADDON') ||
    upper === 'BST+LOCAL CHAUH' ||
    upper === 'BST + LOCAL'
  ) {
    return 'BST';
  }
  return name.trim() || 'BST';
}

export function processRawRowsToCustomers(
  rawRows: SubscriberRawRow[],
  customChannels?: ChannelItem[],
  bstPrice: number = BST_PRICE,
  localAddonPrice: number = LOCAL_PRICE
): CustomerSummary[] {
  const customerMap = new Map<string, {
    name: string;
    subscriberCode: string;
    stbNo: string;
    vcNo: string;
    franchiseeName: string;
    basePackage: string;
    hasLocalAddon: boolean;
    hasLpsHd: boolean;
    channels: string[];
    subscriptionPeriod: string;
    subscriptionCount: string | number;
    networkCapacityFee: string | number;
    packageDiscount: string | number;
    serviceType: string;
  }>();

  const priceMap = getChannelPriceMap(customChannels);
  const allChannelsList = customChannels || DEFAULT_CHANNELS;

  // Helper to find canonical channel name
  const findCanonicalChannelName = (input: string): string => {
    const clean = input.trim();
    const cleanLower = clean.toLowerCase();
    const matched = allChannelsList.find(
      (c) => c.name.toLowerCase() === cleanLower
    );
    return matched ? matched.name : clean;
  };

  for (const row of rawRows) {
    const subCode = (row.subscriberCode || row.stbNo || row.name || 'UNKNOWN').trim();
    if (!subCode) continue;

    let existing = customerMap.get(subCode);
    if (!existing) {
      // Tuna convert dan thar ah hian auto-presets hlui cancel a ni a.
      // Raw file a row awm ang zelin convert a ni ang.
      // Default in BST + Local 1-12 a ni a, channels chu empty list atangin a intan ang.
      existing = {
        name: (row.name || '').trim(),
        subscriberCode: subCode,
        stbNo: (row.stbNo || '').trim(),
        vcNo: (row.vcNo || '').trim(),
        franchiseeName: (row.franchiseeName || '').trim(),
        basePackage: 'BST',
        hasLocalAddon: true, // Local 1-12 intick sa in
        hasLpsHd: false,
        channels: [],
        subscriptionPeriod: row.subscriptionPeriod || 'Month',
        subscriptionCount: row.subscriptionCount || 1,
        networkCapacityFee: row.networkCapacityFee || '0.00',
        packageDiscount: row.packageDiscount || '0.00',
        serviceType: row.serviceType || 'PayTV',
      };
      customerMap.set(subCode, existing);
    }

    if (row.name && !existing.name) existing.name = row.name.trim();
    if (row.stbNo && !existing.stbNo) existing.stbNo = row.stbNo.trim();
    if (row.vcNo && !existing.vcNo) existing.vcNo = row.vcNo.trim();
    if (row.franchiseeName && !existing.franchiseeName) {
      existing.franchiseeName = row.franchiseeName.trim();
    }

    const rawPkgName = (row.packageChannelName || '').trim();
    const upperRaw = rawPkgName.toUpperCase().replace(/\s+/g, ' ').trim();

    // 1. LPS GOLD: BST line hranin leh LPS LOCALS line hranin chauhva in-convert tur (a bak zawng chu remove rih)
    if (
      upperRaw === 'LPS GOLD' ||
      upperRaw === 'GOLD' ||
      upperRaw.includes('LPS GOLD') ||
      upperRaw.includes('GOLD PACK') ||
      upperRaw === 'LPS-GOLD' ||
      upperRaw === 'LPS_GOLD' ||
      upperRaw.includes('LPS GOLD HD') ||
      upperRaw.includes('LPS GOLD (HD)') ||
      (upperRaw.includes('GOLD') && !upperRaw.includes('STAR GOLD') && !upperRaw.includes('ZEE') && !upperRaw.includes('CINEMA') && !upperRaw.includes('MOVIES'))
    ) {
      existing.basePackage = 'BST';
      existing.hasLocalAddon = true;
      // a bak zawng chu remove rih (no extra channels)
    }
    // 2. LPS SILVER: BST line hranin leh LPS LOCALS line hranin chauhva in-convert tur (a bak zawng chu remove rih)
    else if (
      upperRaw === 'LPS SILVER' ||
      upperRaw === 'SILVER' ||
      upperRaw.includes('LPS SILVER') ||
      upperRaw.includes('SILVER PACK') ||
      upperRaw === 'LPS-SILVER' ||
      upperRaw === 'LPS_SILVER' ||
      upperRaw.includes('LPS SILVER SD') ||
      upperRaw.includes('LPS SILVER (SD)') ||
      (upperRaw.includes('SILVER') && !upperRaw.includes('CINEMA') && !upperRaw.includes('MOVIES'))
    ) {
      existing.basePackage = 'BST';
      existing.hasLocalAddon = true;
      // a bak zawng chu remove rih (no extra channels)
    }
    // 3. BST package
    else if (upperRaw === 'BST') {
      existing.basePackage = 'BST';
    }
    // 4. Local package
    else if (
      upperRaw.includes('LOCAL') ||
      upperRaw.includes('1-12') ||
      upperRaw.includes('LPS LOCALS')
    ) {
      existing.hasLocalAddon = true;
    }
    // A bak zawng (Add-on packs, individual channel lines etc.) chu user duh danin remove rih a ni.
  }

  const customers: CustomerSummary[] = [];

  for (const [code, item] of customerMap.entries()) {
    // Check if any selected channel is HD
    const hasAnyHd = item.channels.some((chName) => {
      const cleanLower = chName.toLowerCase().trim();
      const chItem = allChannelsList.find((c) => c.name.toLowerCase() === cleanLower);
      return (
        (chItem && chItem.isHd) ||
        chName.toUpperCase().includes(' HD') ||
        chName.toUpperCase().endsWith('-HD')
      );
    });

    const isLpsHd = item.hasLpsHd || hasAnyHd;

    const pricing = calculateCustomerPricing(
      item.channels,
      item.hasLocalAddon,
      bstPrice,
      localAddonPrice,
      ALACARTE_LCO_COMMISSION_PERCENT,
      priceMap
    );

    customers.push({
      id: code,
      name: item.name,
      subscriberCode: item.subscriberCode,
      stbNo: item.stbNo,
      vcNo: item.vcNo,
      franchiseeName: item.franchiseeName,
      basePackage: 'BST',
      hasLocalAddon: item.hasLocalAddon,
      hasLpsHd: isLpsHd,
      selectedChannels: item.channels,
      channelPrice: pricing.price,
      lcoHlawh: pricing.lcoHlawh,
      lcoSen: pricing.lcoSen,
      subscriptionPeriod: item.subscriptionPeriod,
      subscriptionCount: item.subscriptionCount,
      networkCapacityFee: item.networkCapacityFee,
      packageDiscount: item.packageDiscount,
      serviceType: item.serviceType,
      isModified: false,
    });
  }

  return customers;
}

export async function parseSubscriberExcel(
  file: File | ArrayBuffer,
  customChannels?: ChannelItem[],
  bstPrice: number = BST_PRICE,
  localAddonPrice: number = LOCAL_PRICE
): Promise<{ rawRows: SubscriberRawRow[]; customers: CustomerSummary[]; sheetNames: string[] }> {
  let arrayBuffer: ArrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('Excel file ah hian sheet pakhatmah a awm lo.');
  }

  const firstSheet = workbook.Sheets[sheetNames[0]];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

  if (!rawJson || rawJson.length === 0) {
    throw new Error('Excel file-ah data a awm lo a ni.');
  }

  const rawRows: SubscriberRawRow[] = rawJson.map((row) => {
    let name = '';
    let subscriberCode = '';
    let stbNo = '';
    let vcNo = '';
    let type = '';
    let packageChannelName = '';
    let subscriptionPeriod = 'Month';
    let subscriptionCount: string | number = 1;
    let networkCapacityFee = '0.00';
    let packageDiscount = '0.00';
    let serviceType = 'PayTV';
    let franchiseeName = '';

    for (const [key, val] of Object.entries(row)) {
      const norm = normalizeKey(key);
      const strVal = String(val ?? '').trim();

      if (norm === 'name' || norm === 'subscribername' || norm === 'customername' || norm === 'hming') {
        name = strVal;
      } else if (norm === 'subscribercode' || norm === 'subcode' || norm === 'customercode' || norm === 'code') {
        subscriberCode = strVal;
      } else if (norm === 'stbno' || norm === 'stb' || norm === 'stbnumber') {
        stbNo = strVal;
      } else if (norm === 'vcno' || norm === 'vc' || norm === 'smartcard') {
        vcNo = strVal;
      } else if (norm === 'type' || norm === 'typepackagechannel' || norm === 'packagetype') {
        type = strVal;
      } else if (
        norm === 'packagechannelname' ||
        norm === 'channelname' ||
        norm === 'packagename' ||
        norm === 'channel' ||
        norm === 'package' ||
        norm === 'pack' ||
        norm === 'plan' ||
        norm === 'packagechannel' ||
        norm === 'subscribedpackage' ||
        norm.includes('packagechannel') ||
        norm === 'empty5' // Column F in raw Excel sheets
      ) {
        packageChannelName = strVal;
      } else if (
        norm === 'subscriptionperiod' ||
        norm === 'period' ||
        norm.includes('subscriptiontype') ||
        norm.includes('daymonth') ||
        norm.includes('daysmonth')
      ) {
        subscriptionPeriod = strVal || 'Month';
      } else if (
        norm === 'subscriptioncount' ||
        norm === 'count' ||
        norm.includes('subscriptionval') ||
        norm.includes('subval')
      ) {
        subscriptionCount = strVal || 1;
      } else if (
        norm === 'networkcapacityfee' ||
        norm === 'ncf' ||
        norm.includes('networkcapacity')
      ) {
        networkCapacityFee = strVal || '0.00';
      } else if (norm === 'packagediscount' || norm === 'discount') {
        packageDiscount = strVal || '0.00';
      } else if (norm === 'servicetype') {
        serviceType = strVal || 'PayTV';
      } else if (
        norm === 'franchiseename' ||
        norm === 'franchisee' ||
        norm === 'lco' ||
        norm.includes('franchisee') ||
        norm.includes('franchise') ||
        norm.includes('lconame')
      ) {
        franchiseeName = strVal;
      }
    }

    const cleanPkgName = packageChannelName.trim() || 'BST';
    const upperCleanPkg = cleanPkgName.toUpperCase();
    const isKnownPackage =
      upperCleanPkg === 'BST' ||
      upperCleanPkg.includes('LOCAL') ||
      upperCleanPkg.includes('GOLD') ||
      upperCleanPkg.includes('SILVER') ||
      upperCleanPkg.includes('ADD ON') ||
      upperCleanPkg.includes('ADDON') ||
      upperCleanPkg.includes('SPORTS PACK');

    return {
      name,
      subscriberCode,
      stbNo,
      vcNo,
      type: type || (isKnownPackage ? 'Package' : 'Channel'),
      packageChannelName: cleanPkgName,
      subscriptionPeriod,
      subscriptionCount,
      networkCapacityFee,
      packageDiscount,
      serviceType,
      franchiseeName,
    };
  });

  const customers = processRawRowsToCustomers(rawRows, customChannels, bstPrice, localAddonPrice);

  return { rawRows, customers, sheetNames };
}

/**
 * Helper to calculate A-la-carte Channel Rate, LCO Share (8.47%), and MSO Cut (91.53%)
 */
export function getAlacarteChannelBreakdown(
  price: number,
  lcoCommissionPercent: number = ALACARTE_LCO_COMMISSION_PERCENT
): {
  price: number;
  lcoShare: number;
  msoCut: number;
  lcoPercent: number;
  msoPercent: number;
} {
  const lcoShare = Number(((price * lcoCommissionPercent) / 100).toFixed(2));
  const msoCut = Number((price - lcoShare).toFixed(2));
  return {
    price,
    lcoShare,
    msoCut,
    lcoPercent: lcoCommissionPercent,
    msoPercent: Number((100 - lcoCommissionPercent).toFixed(2)),
  };
}

/**
 * Smartly infer category if column is unlabelled or has generic "A-la Carte"
 */
export function inferCategoryFromName(name: string, fallback: string = 'General'): string {
  const upper = name.toUpperCase();
  if (
    upper.includes('SPORTS') ||
    upper.includes('SS SELECT') ||
    upper.includes('EUROSPORTS') ||
    upper.includes('UNITE8 SPORTS') ||
    upper.includes('KHEL') ||
    upper.includes('CRICKET') ||
    upper.includes('TEN 1') ||
    upper.includes('TEN 2') ||
    upper.includes('TEN 3') ||
    upper.includes('TEN 5')
  ) {
    return 'Sports';
  }
  if (
    upper.includes('NEWS') ||
    upper.includes('AAJ TAK') ||
    upper.includes('ABP') ||
    upper.includes('NDTV') ||
    upper.includes('CNBC') ||
    upper.includes('ZEE NEWS') ||
    upper.includes('INDIA TODAY') ||
    upper.includes('TIMES NOW') ||
    upper.includes('REPUBLIC') ||
    upper.includes('NEWS18') ||
    upper.includes('BBC') ||
    upper.includes('CNN')
  ) {
    return 'News';
  }
  if (
    upper.includes('MOVIES') ||
    upper.includes('CINEMA') ||
    upper.includes('PICTURES') ||
    upper.includes('MAX') ||
    upper.includes('GOLD') ||
    upper.includes('FLIX')
  ) {
    return 'Movies';
  }
  if (
    upper.includes('KIDS') ||
    upper.includes('CARTOON') ||
    upper.includes('NICK') ||
    upper.includes('DISNEY') ||
    upper.includes('POGO') ||
    upper.includes('SONIC') ||
    upper.includes('HUNGAMA') ||
    upper.includes('JUNIOR')
  ) {
    return 'Kids';
  }
  if (
    upper.includes('MUSIC') ||
    upper.includes('MTV') ||
    upper.includes('ZOOM') ||
    upper.includes('9XM') ||
    upper.includes('VH1') ||
    upper.includes('MASTIII') ||
    upper.includes('BINDASS')
  ) {
    return 'Music';
  }
  if (
    upper.includes('DISCOVERY') ||
    upper.includes('NAT GEO') ||
    upper.includes('NATIONAL GEOGRAPHIC') ||
    upper.includes('ANIMAL PLANET') ||
    upper.includes('HISTORY') ||
    upper.includes('TLC')
  ) {
    return 'Infotainment';
  }
  if (upper.includes('LPS') || upper.includes('ZONET') || upper.includes('DDK') || upper.includes('LOCAL')) {
    return 'Local';
  }

  // If fallback is 'A-la Carte' or 'General', categorize as Entertainment
  if (fallback.toLowerCase().includes('carte') || fallback.toLowerCase() === 'general' || !fallback) {
    return 'Entertainment';
  }
  return fallback;
}

/**
 * Smart matching for channel search queries:
 * - Direct substring matching
 * - Punctuation-insensitive matching (e.g. "hd-1" vs "hd 1" or "1")
 * - Alias matching: "ss" <-> "star sports" (e.g. "ss select" matches "Star Sports Select 1" & "SS Select HD-1")
 * - Token-based matching: e.g. "ss select 1", "ss 1", "ten 1", "select hd"
 */
export function matchChannelSearch(
  channelName: string,
  query: string,
  channelCategory?: string
): boolean {
  if (!query || !query.trim()) return true;
  const rawQuery = query.toLowerCase().trim();
  const rawName = channelName.toLowerCase().trim();

  // 1. Direct contains check
  if (rawName.includes(rawQuery)) return true;

  // 2. Normalized alphanumeric + spaces
  const normQuery = rawQuery.replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim();
  const normName = rawName.replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (normName.includes(normQuery)) return true;

  // 3. Check expanded names with aliases ("ss" <-> "star sports")
  const expandedQuery = normQuery.replace(/\bss\b/g, 'star sports');
  const expandedName = normName.replace(/\bss\b/g, 'star sports');
  if (expandedName.includes(expandedQuery) || expandedName.includes(normQuery)) return true;

  const ssQuery = normQuery.replace(/\bstar sports\b/g, 'ss');
  const ssName = normName.replace(/\bstar sports\b/g, 'ss');
  if (ssName.includes(ssQuery)) return true;

  // 4. Token-by-token matching (handles "ss select 1" matching "SS Select HD-1")
  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length > 0) {
    const allTokensMatch = tokens.every((token) => {
      if (token === 'ss') {
        return normName.includes('ss') || normName.includes('star sports');
      }
      if (token === 'star' || token === 'sports') {
        return normName.includes(token) || normName.includes('ss');
      }
      return (
        normName.includes(token) ||
        expandedName.includes(token) ||
        ssName.includes(token)
      );
    });
    if (allTokensMatch) return true;
  }

  return false;
}

/**
 * Parse uploaded Channel Price List (Excel or CSV)
 * Supported columns: Channel Name / Channel / Name, Price / Rate / MRP, Category
 */
export async function parseChannelPriceExcel(
  file: File | ArrayBuffer
): Promise<ChannelItem[]> {
  let arrayBuffer: ArrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  if (workbook.SheetNames.length === 0) {
    throw new Error('Excel sheet pakhatmah a awm lo.');
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

  const channels: ChannelItem[] = [];
  let idx = 1;

  for (const row of rawJson) {
    let name = '';
    let price = 0;
    let category = 'General';

    for (const [k, v] of Object.entries(row)) {
      const norm = normalizeKey(k);
      const strVal = String(v ?? '').trim();

      if (
        norm.includes('name') ||
        norm.includes('channel') ||
        norm.includes('hming') ||
        norm === 'item' ||
        norm === 'particular'
      ) {
        name = strVal;
      } else if (
        norm.includes('price') ||
        norm.includes('rate') ||
        norm.includes('mrp') ||
        norm.includes('amount') ||
        norm.includes('cost')
      ) {
        // Strip out currency symbols like Rs, ₹, commas
        const cleanPriceStr = strVal.replace(/[^0-9.]/g, '');
        const p = parseFloat(cleanPriceStr);
        if (!isNaN(p)) {
          price = p;
        }
      } else if (norm.includes('cat') || norm.includes('genre') || norm.includes('type')) {
        category = strVal || 'General';
      }
    }

    // Fallback if price is in an unlabelled column or shifted column (e.g. __EMPTY)
    if (price === 0) {
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'number' && v > 0) {
          price = v;
          break;
        } else if (typeof v === 'string') {
          const clean = v.replace(/[^0-9.]/g, '').trim();
          const p = parseFloat(clean);
          if (!isNaN(p) && p > 0 && v !== name && !k.toLowerCase().includes('name')) {
            price = p;
            break;
          }
        }
      }
    }

    if (name) {
      // Clean name
      const cleanName = name.replace(/\s+/g, ' ').trim();
      const resolvedCategory = inferCategoryFromName(cleanName, category);
      channels.push({
        id: `uploaded-${idx++}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: cleanName,
        price: Number(price.toFixed(2)),
        category: resolvedCategory,
        isHd: cleanName.toUpperCase().includes('HD'),
      });
    }
  }

  if (channels.length === 0) {
    throw new Error('Channel name emaw price row hmuh a ni lo. Excel format enfiah rawh.');
  }

  return channels;
}

