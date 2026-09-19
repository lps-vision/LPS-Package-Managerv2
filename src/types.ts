export interface SubscriberRawRow {
  name: string;
  subscriberCode: string;
  stbNo: string;
  vcNo: string;
  type: string; // 'Package' | 'Channel'
  packageChannelName: string;
  packageAddonInfo?: string;
  subscriptionPeriod?: string;
  subscriptionCount?: string | number;
  networkCapacityFee?: string | number;
  packageDiscount?: string | number;
  serviceType?: string;
  franchiseeName?: string;
  customBillAmount?: number;
}

export interface CustomerSummary {
  id: string; // usually subscriberCode
  name: string;
  subscriberCode: string;
  stbNo: string;
  vcNo: string;
  franchiseeName: string;
  basePackage: string; // "PACK-1 (BST)" or "BST"
  hasLocalAddon: boolean; // true = Local Add-on (+₹ 71) thlang tel; false = BST chauh (+₹ 0)
  hasLpsHd?: boolean; // true = LPS HD pack/line thlang tel (HD customers / LPS GOLD)
  selectedChannels: string[]; // e.g. ["Animal Planet", "Animal Planet HD"]
  channelPrice: number; // Total price = BST (154) + (hasLocalAddon ? 71 : 0) + alacarte
  lcoHlawh: number; // (hasLocalAddon ? 71 : 0) + 10% alacarte
  lcoSen: number; // BST (154) + 90% alacarte
  customBillAmount?: number; // Customer hnen atanga bill khawn zat (e.g. ₹ 350, ₹ 400). If not set, defaults to channelPrice.
  isModified?: boolean;
  subscriptionPeriod?: string;
  subscriptionCount?: string | number;
  networkCapacityFee?: string | number;
  packageDiscount?: string | number;
  serviceType?: string;
}

export interface ChannelItem {
  id: string;
  name: string;
  price: number; // Price with GST
  category: string;
  isHd?: boolean;
}

export interface GrandTotals {
  totalPrice: number;
  totalLcoHlawh: number;
  totalLcoSen: number;
  totalCustomers: number;
  localAddonCount: number;
  bstOnlyCount: number;
  totalActualCollection: number;
  totalActualNetProfit: number;
  periodRatio?: number;
  periodLabel?: string;
  subscriptionType?: 'Month' | 'Day';
  subscriptionValue?: number;
  totalDays?: number;
}

export interface SubscriptionDateSettings {
  startDate: string; // 'YYYY-MM-DD' e.g. '2026-09-19'
  endDate: string;   // 'YYYY-MM-DD' e.g. '2026-10-19'
  subscriptionType: 'Month' | 'Day';
  subscriptionValue: number;
  totalDays: number;
}
