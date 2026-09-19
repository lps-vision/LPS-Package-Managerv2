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
  PRESET_300_CHANNELS,
  PRESET_350_CHANNELS,
  PRESET_50_CHANNELS,
  PRESET_60_CHANNELS,
  PRESET_100_CHANNELS,
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

export function isLpsSilverPlan(name: string): boolean {
  const upper = (name || '').toUpperCase().trim().replace(/\s+/g, ' ');
  if (!upper) return false;
  if (
    upper === 'LPS SILVER' ||
    upper === 'SILVER PACK' ||
    upper === 'LPS-SILVER' ||
    upper === 'LPS_SILVER' ||
    upper === 'LPS SILVER SD' ||
    upper === 'LPS SILVER (SD)' ||
    upper === 'SILVER SD' ||
    upper === 'SILVER' ||
    upper === '300 SD' ||
    upper === '300 SD PLAN' ||
    upper === '300 SD PACK' ||
    upper.includes('LPS SILVER') ||
    upper.includes('SILVER SD') ||
    upper.includes('300 SD') ||
    upper.includes('SD 300') ||
    upper.includes('BST + LOCAL SD 300') ||
    upper.includes('BST+LOCAL SD 300') ||
    upper.includes('LOCAL SD 300') ||
    upper.includes('LOCAL 300') ||
    upper.includes('PLAN 300') ||
    upper.includes('BILL 300') ||
    upper.includes('300 MAN')
  ) {
    return true;
  }
  return false;
}

export function isLpsGoldPlan(name: string): boolean {
  const upper = (name || '').toUpperCase().trim().replace(/\s+/g, ' ');
  if (!upper) return false;
  // Guard against Star Gold, Zee Cinema Gold, Goldmines, etc.
  if (upper.includes('STAR GOLD') || upper.includes('ZEE') || upper.includes('GOLDMINE')) {
    return false;
  }
  if (
    upper === 'LPS GOLD' ||
    upper === 'GOLD PACK' ||
    upper === 'LPS-GOLD' ||
    upper === 'LPS_GOLD' ||
    upper === 'LPS GOLD HD' ||
    upper === 'LPS GOLD (HD)' ||
    upper === 'GOLD HD' ||
    upper === 'GOLD' ||
    upper === '350 HD' ||
    upper === '350 HD PLAN' ||
    upper === '350 HD PACK' ||
    upper.includes('LPS GOLD') ||
    upper.includes('GOLD HD') ||
    upper.includes('350 HD') ||
    upper.includes('HD 350') ||
    upper.includes('BST + LOCAL SD 350') ||
    upper.includes('BST+LOCAL SD 350') ||
    upper.includes('LOCAL SD 350') ||
    upper.includes('LOCAL 350') ||
    upper.includes('PLAN 350') ||
    upper.includes('BILL 350') ||
    upper.includes('350 MAN')
  ) {
    return true;
  }
  return false;
}

export function isSdAddon50(name: string): boolean {
  const upper = (name || '').toUpperCase().trim().replace(/\s+/g, ' ');
  if (!upper) return false;
  const key = normalizeKey(name);
  if (upper.includes('SPORT') || upper.includes('HD') || key.includes('sport') || key.includes('hd')) {
    return false;
  }
  if (
    upper === 'SD ADD ON' ||
    upper === 'SD ADDON' ||
    upper === 'SD-ADDON' ||
    upper === 'SD ADD-ON' ||
    upper === 'ADD ON SD' ||
    upper === 'ADDON SD' ||
    upper === 'SD ADD ON 50' ||
    upper === 'SD ADDON 50' ||
    upper === '50 SD ADD ON' ||
    upper === '50 SD ADDON' ||
    upper === '50 ADD ON' ||
    upper === '50 ADDON' ||
    upper === '₹ 50 ADDON' ||
    upper === 'RS 50 ADDON' ||
    key === 'sdaddon' ||
    key === 'sdaddons' ||
    key === 'addonsd' ||
    key === 'sdaddon50' ||
    key === '50sdaddon' ||
    key === '50addon' ||
    key === 'addon50' ||
    key.includes('sdaddon') ||
    (key.includes('addon') && key.includes('50'))
  ) {
    return true;
  }
  return false;
}

export function isSportsAddon60(name: string): boolean {
  const upper = (name || '').toUpperCase().trim().replace(/\s+/g, ' ');
  if (!upper) return false;
  const key = normalizeKey(name);
  if (upper.includes('HD') || key.includes('hd')) {
    return false;
  }
  if (
    upper === 'ADD ON SPORTS' ||
    upper === 'ADDON SPORTS' ||
    upper === 'ADD-ON SPORTS' ||
    upper === 'SPORTS ADD ON' ||
    upper === 'SPORTS ADDON' ||
    upper === 'SPORTS ADD-ON' ||
    upper === 'SPORTS SD ADD ON' ||
    upper === 'SPORTS SD ADDON' ||
    upper === 'ADD ON SPORTS SD' ||
    upper === 'ADDON SPORTS SD' ||
    upper === 'ADD ON SPORTS 60' ||
    upper === 'ADDON SPORTS 60' ||
    upper === '60 SPORTS' ||
    upper === '60 SPORTS SD' ||
    upper === 'SPORTS 60' ||
    upper === '₹ 60 SPORTS SD' ||
    upper === '₹ 60 SPORTS' ||
    upper === 'RS 60 SPORTS SD' ||
    key === 'addonsports' ||
    key === 'sportsaddon' ||
    key === 'addonsport' ||
    key === 'sportaddon' ||
    key === 'sportsdaddon' ||
    key === 'sdsportsaddon' ||
    key === 'sportsaddon60' ||
    key === '60sportsaddon' ||
    key === '60sports' ||
    key === 'sports60' ||
    key === '60addon' ||
    key === 'addon60' ||
    (key.includes('sport') && key.includes('addon')) ||
    (key.includes('sport') && key.includes('60'))
  ) {
    return true;
  }
  return false;
}

export function isHdAddon100(name: string): boolean {
  const upper = (name || '').toUpperCase().trim().replace(/\s+/g, ' ');
  if (!upper) return false;
  const key = normalizeKey(name);
  if (
    upper === 'HD ADD ON' ||
    upper === 'HD ADDON' ||
    upper === 'HD-ADDON' ||
    upper === 'HD ADD-ON' ||
    upper === 'ADD ON HD' ||
    upper === 'ADDON HD' ||
    upper === 'SPORTS HD ADD ON' ||
    upper === 'SPORTS HD ADDON' ||
    upper === 'ADD ON SPORTS HD' ||
    upper === 'ADDON SPORTS HD' ||
    upper === 'HD SPORTS ADD ON' ||
    upper === 'HD SPORTS ADDON' ||
    upper === 'HD ADD ON 100' ||
    upper === 'HD ADDON 100' ||
    upper === '100 HD' ||
    upper === 'HD 100' ||
    upper === '100 SPORTS HD' ||
    upper === '₹ 100 SPORTS HD' ||
    upper === '₹ 100 HD' ||
    upper === 'RS 100 SPORTS HD' ||
    key === 'hdaddon' ||
    key === 'hdaddons' ||
    key === 'addonhd' ||
    key === 'sportshdaddon' ||
    key === 'hdsportsaddon' ||
    key === 'addonsportshd' ||
    key === 'addonhdsports' ||
    key === 'hdaddon100' ||
    key === '100hdaddon' ||
    key === '100sportshd' ||
    key === '100hd' ||
    key === 'hd100' ||
    key === '100addon' ||
    key === 'addon100' ||
    (key.includes('hd') && key.includes('addon')) ||
    (key.includes('hd') && key.includes('100'))
  ) {
    return true;
  }
  return false;
}

export function isLpsPackageName(name: string): boolean {
  const upper = (name || '').toUpperCase().trim().replace(/\s+/g, ' ');
  if (!upper) return false;

  if (
    upper === 'PACK-1 (BST)' ||
    upper === 'PACK 1 (BST)' ||
    upper === 'PACK-1(BST)' ||
    upper === 'PACK-1' ||
    upper === 'PACK 1' ||
    upper === 'PACK1' ||
    upper === 'PACK-1 (BST) CHAUH' ||
    upper === 'PACK-1 (BST) ONLY' ||
    upper === 'PACK-1 (BST) + LOCAL' ||
    upper === 'PACK-1 (BST)+LOCAL' ||
    upper === 'PACK-1 (BST) + LOCALS' ||
    upper === 'PACK-1 (BST)+LOCALS' ||
    upper === 'PACK 1 (BST) + LOCAL' ||
    upper === 'BST' ||
    upper === 'BST CHAUH' ||
    upper === 'BST ONLY' ||
    upper === 'BST + LOCAL' ||
    upper === 'BST+LOCAL' ||
    upper === 'BST + LOCALS' ||
    upper === 'BST+LOCALS' ||
    upper === 'BST + LOCAL SD' ||
    upper === 'LPS LOCALS' ||
    upper === 'LPS LOCAL' ||
    upper === 'LOCAL' ||
    upper === 'LOCALS' ||
    upper === 'LOCAL 1-12' ||
    upper === 'LOCALS 1-12' ||
    upper === 'LPS HD' ||
    upper === 'LPS-HD' ||
    upper === 'GRAND TOTAL' ||
    upper === 'TOTAL' ||
    isLpsSilverPlan(upper) ||
    isLpsGoldPlan(upper) ||
    isSdAddon50(upper) ||
    isSportsAddon60(upper) ||
    isHdAddon100(upper)
  ) {
    return true;
  }
  return false;
}

export function sanitizePackageName(name: string): string {
  const upper = (name || '').toUpperCase().trim();
  if (
    upper.includes('SILVER') ||
    upper.includes('GOLD') ||
    upper.includes('ADD ON') ||
    upper.includes('ADDON') ||
    upper === 'BST+LOCAL CHAUH' ||
    upper === 'BST + LOCAL' ||
    upper === 'PACK-1 (BST)+LOCAL' ||
    upper === 'PACK-1 (BST) + LOCAL'
  ) {
    return 'PACK-1 (BST)';
  }
  return name.trim() || 'PACK-1 (BST)';
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
    customBillAmount?: number;
    detectedPlan?: 'silver_300' | 'gold_350';
    hasSdAddon50?: boolean;
    hasSportsAddon60?: boolean;
    hasHdAddon100?: boolean;
  }>();

  const priceMap = getChannelPriceMap(customChannels);
  const allChannelsList = customChannels || DEFAULT_CHANNELS;

  // Helper to find canonical channel name
  const findCanonicalChannelName = (input: string): string => {
    const clean = input.trim();
    if (!clean) return '';
    const cleanLower = clean.toLowerCase();

    // 1. Direct case-insensitive match
    const exact = allChannelsList.find(
      (c) => c.name.toLowerCase() === cleanLower
    );
    if (exact) return exact.name;

    // 2. Normalized key match (ignoring whitespace, hyphens, punctuation)
    const normInput = normalizeKey(clean);
    const matchedNorm = allChannelsList.find((c) => normalizeKey(c.name) === normInput);
    if (matchedNorm) return matchedNorm.name;

    // 3. Substring match helper
    const searchMatch = allChannelsList.find((c) => {
      const cNorm = normalizeKey(c.name);
      return (normInput.length >= 4 && cNorm.includes(normInput)) || (cNorm.length >= 4 && normInput.includes(cNorm));
    });
    if (searchMatch) return searchMatch.name;

    // 4. Return trimmed clean input directly so unknown/new channels are never dropped
    return clean;
  };

  // Helper to add channel uniquely without duplication
  const addChannelDeduplicated = (existing: { channels: string[] }, candidate: string) => {
    const clean = candidate.trim();
    if (!clean) return;
    const canonical = findCanonicalChannelName(clean);
    if (!canonical) return;
    const norm = normalizeKey(canonical);
    if (!norm) return;
    if (!existing.channels.some((c) => normalizeKey(c) === norm)) {
      existing.channels.push(canonical);
    }
  };

  for (const row of rawRows) {
    const rawName = (row.name || '').trim();
    const rawSubCode = (row.subscriberCode || '').trim();
    const rawStb = (row.stbNo || '').trim();
    const rawPkgName = (row.packageChannelName || '').trim();
    const upperRaw = rawPkgName.toUpperCase().replace(/\s+/g, ' ').trim();
    const upperName = rawName.toUpperCase();

    // Skip summary / grand total rows or completely empty subscriber rows
    if (
      upperRaw === 'GRAND TOTAL' ||
      upperRaw === 'TOTAL' ||
      upperName === 'GRAND TOTAL' ||
      upperName === 'TOTAL' ||
      (!rawName && !rawSubCode && !rawStb)
    ) {
      continue;
    }

    const subCode = (rawSubCode || rawStb || rawName).trim();
    if (!subCode) continue;

    let existing = customerMap.get(subCode);
    if (!existing) {
      existing = {
        name: rawName,
        subscriberCode: rawSubCode || subCode,
        stbNo: rawStb,
        vcNo: (row.vcNo || '').trim(),
        franchiseeName: (row.franchiseeName || '').trim(),
        basePackage: 'PACK-1 (BST)',
        hasLocalAddon: true, // Default to true (Local 1-12)
        hasLpsHd: false,
        channels: [],
        subscriptionPeriod: row.subscriptionPeriod || 'Month',
        subscriptionCount: row.subscriptionCount || 1,
        networkCapacityFee: row.networkCapacityFee || '0.00',
        packageDiscount: row.packageDiscount || '0.00',
        serviceType: row.serviceType || 'PayTV',
        customBillAmount: row.customBillAmount,
      };
      customerMap.set(subCode, existing);
    }

    // Keep metadata updated if present on subsequent lines
    if (rawName && !existing.name) existing.name = rawName;
    if (rawStb && !existing.stbNo) existing.stbNo = rawStb;
    if (row.vcNo && !existing.vcNo) existing.vcNo = row.vcNo.trim();
    if (row.franchiseeName && !existing.franchiseeName) {
      existing.franchiseeName = row.franchiseeName.trim();
    }

    // Preserve custom bill amount if present
    if (row.customBillAmount !== undefined && row.customBillAmount > 0) {
      existing.customBillAmount = row.customBillAmount;
    }

    // Token processor for plans, add-ons, packages, and deduplicated channels
    const processToken = (token: string) => {
      const cleanToken = token.trim();
      if (!cleanToken) return;
      const upperToken = cleanToken.toUpperCase().replace(/\s+/g, ' ').trim();

      if (upperToken === 'GRAND TOTAL' || upperToken === 'TOTAL') return;

      // 1. LPS SILVER: PACK-1 (BST) + Local sd 300 man
      if (isLpsSilverPlan(upperToken)) {
        existing!.basePackage = 'PACK-1 (BST)';
        existing!.hasLocalAddon = true;
        existing!.detectedPlan = 'silver_300';
        for (const ch of PRESET_300_CHANNELS) {
          addChannelDeduplicated(existing!, ch);
        }
        return;
      }

      // 2. LPS GOLD: PACK-1 (BST) + Local sd 350 man
      if (isLpsGoldPlan(upperToken)) {
        existing!.basePackage = 'PACK-1 (BST)';
        existing!.hasLocalAddon = true;
        existing!.hasLpsHd = true;
        existing!.detectedPlan = 'gold_350';
        for (const ch of PRESET_350_CHANNELS) {
          addChannelDeduplicated(existing!, ch);
        }
        return;
      }

      // 3. SD ADD ON: 50 man
      if (isSdAddon50(upperToken)) {
        existing!.hasSdAddon50 = true;
        for (const ch of PRESET_50_CHANNELS) {
          addChannelDeduplicated(existing!, ch);
        }
        return;
      }

      // 4. ADD ON SPORTS: 60 man
      if (isSportsAddon60(upperToken)) {
        existing!.hasSportsAddon60 = true;
        for (const ch of PRESET_60_CHANNELS) {
          addChannelDeduplicated(existing!, ch);
        }
        return;
      }

      // 5. HD ADD ON: 100 man
      if (isHdAddon100(upperToken)) {
        existing!.hasHdAddon100 = true;
        existing!.hasLpsHd = true;
        for (const ch of PRESET_100_CHANNELS) {
          addChannelDeduplicated(existing!, ch);
        }
        return;
      }

      // 6. Base / Local package variations
      if (
        upperToken === 'PACK-1 (BST) + LOCAL' ||
        upperToken === 'PACK-1 (BST)+LOCAL' ||
        upperToken === 'PACK-1 (BST) + LOCALS' ||
        upperToken === 'PACK-1 (BST)+LOCALS' ||
        upperToken === 'PACK 1 (BST) + LOCAL' ||
        upperToken === 'BST + LOCAL' ||
        upperToken === 'BST+LOCAL' ||
        upperToken === 'BST + LOCALS' ||
        upperToken === 'BST+LOCALS' ||
        upperToken === 'BST + LOCAL SD'
      ) {
        existing!.basePackage = 'PACK-1 (BST)';
        existing!.hasLocalAddon = true;
        return;
      }

      if (
        upperToken === 'PACK-1 (BST)' ||
        upperToken === 'PACK 1 (BST)' ||
        upperToken === 'PACK-1(BST)' ||
        upperToken === 'PACK-1' ||
        upperToken === 'PACK 1' ||
        upperToken === 'PACK1' ||
        upperToken === 'PACK-1 (BST) CHAUH' ||
        upperToken === 'PACK-1 (BST) ONLY' ||
        upperToken === 'BST' ||
        upperToken === 'BST CHAUH' ||
        upperToken === 'BST ONLY'
      ) {
        existing!.basePackage = 'PACK-1 (BST)';
        if (upperToken.includes('CHAUH') || upperToken.includes('ONLY')) {
          existing!.hasLocalAddon = false;
        }
        return;
      }

      if (
        upperToken === 'LPS LOCALS' ||
        upperToken === 'LPS LOCAL' ||
        upperToken === 'LOCAL' ||
        upperToken === 'LOCALS' ||
        upperToken === 'LOCAL 1-12' ||
        upperToken === 'LOCALS 1-12'
      ) {
        existing!.hasLocalAddon = true;
        return;
      }

      if (upperToken === 'LPS HD' || upperToken === 'LPS-HD' || (upperToken === 'HD' && row.type === 'Package')) {
        existing!.hasLpsHd = true;
        return;
      }

      // 7. Individual Ala-carte Channels! Deduplicated automatically
      addChannelDeduplicated(existing!, cleanToken);
    };

    // Check packageAddonInfo (from "Package / Addon" column)
    if (row.packageAddonInfo) {
      const addonTokens = row.packageAddonInfo.includes('•')
        ? row.packageAddonInfo.split('•')
        : row.packageAddonInfo.includes(',')
        ? row.packageAddonInfo.split(',')
        : [row.packageAddonInfo];

      for (const token of addonTokens) {
        processToken(token);
      }
    }

    // Check packageChannelName (from "PackageChannelName" or "Channel thlan" column)
    if (rawPkgName) {
      const pkgTokens = rawPkgName.includes('•')
        ? rawPkgName.split('•')
        : rawPkgName.includes(',')
        ? rawPkgName.split(',')
        : [rawPkgName];

      for (const token of pkgTokens) {
        processToken(token);
      }
    }
  }

  const customers: CustomerSummary[] = [];

  for (const [code, item] of customerMap.entries()) {
    // 1. Calculate converted bill based on user requirements:
    // - LPS SILVER: BST + Local sd 300 man
    // - LPS GOLD: BST + Local sd 350 man
    // - SD ADD ON: 50 man
    // - ADD ON SPORTS: 60 man
    // - HD ADD ON: 100 man
    let convertedBill: number | undefined = undefined;

    if (item.detectedPlan === 'silver_300') {
      let b = 300;
      if (item.hasSdAddon50) b += 50;
      if (item.hasSportsAddon60) b += 60;
      if (item.hasHdAddon100) b += 100;
      convertedBill = b;
    } else if (item.detectedPlan === 'gold_350') {
      let b = 350;
      if (item.hasSdAddon50) b += 50;
      if (item.hasSportsAddon60) b += 60;
      if (item.hasHdAddon100) b += 100;
      convertedBill = b;
    } else if (item.hasSdAddon50 || item.hasSportsAddon60 || item.hasHdAddon100) {
      let b = item.hasLocalAddon ? (bstPrice + localAddonPrice) : bstPrice;
      if (item.hasSdAddon50) b += 50;
      if (item.hasSportsAddon60) b += 60;
      if (item.hasHdAddon100) b += 100;
      convertedBill = b;
    }

    if (convertedBill !== undefined) {
      if (item.customBillAmount === undefined || item.customBillAmount <= 0 || convertedBill >= item.customBillAmount) {
        item.customBillAmount = convertedBill;
      }
    }

    // 2. Strict channel deduplication: Double a awm chuan pakhat chauh zel lang se
    const uniqueChannels: string[] = [];
    const seenNorm = new Set<string>();
    for (const ch of item.channels) {
      const norm = normalizeKey(ch);
      if (norm && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        uniqueChannels.push(ch);
      }
    }
    item.channels = uniqueChannels;

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

    const hasCustomBill = item.customBillAmount !== undefined && item.customBillAmount > 0;
    const effectiveLcoHlawh = hasCustomBill
      ? Number((item.customBillAmount! - pricing.lcoSen).toFixed(2))
      : pricing.lcoHlawh;

    customers.push({
      id: code,
      name: item.name,
      subscriberCode: item.subscriberCode,
      stbNo: item.stbNo,
      vcNo: item.vcNo,
      franchiseeName: item.franchiseeName,
      basePackage: 'PACK-1 (BST)',
      hasLocalAddon: item.hasLocalAddon,
      hasLpsHd: isLpsHd,
      selectedChannels: item.channels,
      channelPrice: pricing.price,
      lcoHlawh: effectiveLcoHlawh,
      lcoSen: pricing.lcoSen,
      subscriptionPeriod: item.subscriptionPeriod,
      subscriptionCount: item.subscriptionCount,
      networkCapacityFee: item.networkCapacityFee,
      packageDiscount: item.packageDiscount,
      serviceType: item.serviceType,
      customBillAmount: item.customBillAmount,
      isModified: hasCustomBill || item.channels.length > 0 || !item.hasLocalAddon,
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

  const parsedRows: (SubscriberRawRow | null)[] = rawJson.map((row) => {
    let name = '';
    let subscriberCode = '';
    let stbNo = '';
    let vcNo = '';
    let type = '';
    let packageChannelName = '';
    let packageAddonInfo = '';
    let subscriptionPeriod = 'Month';
    let subscriptionCount: string | number = 1;
    let networkCapacityFee = '0.00';
    let packageDiscount = '0.00';
    let serviceType = 'PayTV';
    let franchiseeName = '';
    let customBillAmount: number | undefined = undefined;

    for (const [key, val] of Object.entries(row)) {
      const norm = normalizeKey(key);
      const strVal = String(val ?? '').trim();

      if (norm === 'name' || norm === 'subscribername' || norm === 'customername' || norm === 'hming' || norm === 'subname' || norm.includes('subscribername')) {
        name = strVal;
      } else if (norm === 'subscribercode' || norm === 'subcode' || norm === 'customercode' || norm === 'code' || norm === 'subid' || norm === 'subscriberid') {
        subscriberCode = strVal;
      } else if (norm === 'stbno' || norm === 'stb' || norm === 'stbnumber' || norm === 'settopbox' || norm === 'boxno') {
        stbNo = strVal;
      } else if (norm === 'vcno' || norm === 'vc' || norm === 'smartcard' || norm === 'cardno' || norm === 'smartcardno') {
        vcNo = strVal;
      } else if (norm === 'type' || norm === 'typepackagechannel' || norm === 'packagetype' || norm === 'itemtype' || norm.includes('typepackagechannel')) {
        type = strVal;
      } else if (norm === 'packageaddon' || norm === 'packageoraddon' || norm === 'addon' || norm === 'basepackage' || norm === 'packageinfo') {
        packageAddonInfo = strVal;
      } else if (
        norm === 'channelthlan' ||
        norm === 'channelthlanna' ||
        norm === 'channelthlang' ||
        norm.includes('channelthlan') ||
        norm === 'packagechannelname' ||
        norm === 'channelname' ||
        norm === 'packagename' ||
        norm === 'channel' ||
        norm === 'channels' ||
        norm === 'channellist' ||
        norm === 'selectedchannels' ||
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
      } else if (
        norm === 'billcollected' ||
        norm === 'actualcollected' ||
        norm === 'custombill' ||
        norm === 'custombillamount' ||
        norm === 'collected' ||
        norm === 'collectedamount' ||
        norm === 'khawnzat' ||
        norm === 'khawnzatamount' ||
        norm === 'bill' ||
        norm === 'billamount' ||
        norm === 'totalbill' ||
        norm.includes('billcollected') ||
        norm.includes('custombill')
      ) {
        const p = parseFloat(strVal.replace(/[^0-9.]/g, ''));
        if (!isNaN(p) && p > 0) {
          customBillAmount = p;
        }
      }
    }

    // Fallback: if packageChannelName is empty but packageAddonInfo exists, use packageAddonInfo
    if (!packageChannelName && packageAddonInfo) {
      packageChannelName = packageAddonInfo;
    }

    const cleanPkgName = packageChannelName.trim() || 'PACK-1 (BST)';
    const upperCleanPkg = cleanPkgName.toUpperCase();
    const upperName = name.toUpperCase().trim();

    // Skip summary, empty, or Grand Total rows
    if (
      upperCleanPkg === 'GRAND TOTAL' ||
      upperCleanPkg === 'TOTAL' ||
      upperName === 'GRAND TOTAL' ||
      upperName === 'TOTAL' ||
      (!name && !subscriberCode && !stbNo)
    ) {
      return null;
    }

    const isPkg = isLpsPackageName(cleanPkgName);
    const resolvedType = type
      ? (type.toLowerCase().includes('package') ? 'Package' : 'Channel')
      : (isPkg ? 'Package' : 'Channel');

    return {
      name,
      subscriberCode,
      stbNo,
      vcNo,
      type: resolvedType,
      packageChannelName: cleanPkgName,
      packageAddonInfo: packageAddonInfo || undefined,
      subscriptionPeriod,
      subscriptionCount,
      networkCapacityFee,
      packageDiscount,
      serviceType,
      franchiseeName,
      customBillAmount,
    };
  });

  const rawRows = parsedRows.filter((r): r is SubscriberRawRow => r !== null);
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

