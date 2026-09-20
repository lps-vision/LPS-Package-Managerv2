import { ChannelItem } from '../types';

// 1. BST Rs 154/- ah:
// LCO Share Rs 78.6 = 51.04%
// MSO Cut Rs 75.4 = 48.96%
export const BST_PRICE = 154.0;
export const BST_LCO_SHARE = 78.6;
export const BST_MSO_CUT = 75.4;

// 2. LOCAL Rs 71/- ah:
// LCO Share Rs 36.2 = 50.99% ~ 51%
// MSO Cut Rs 34.8 = 49.01%
export const LOCAL_PRICE = 71.0;
export const LOCAL_ADDON_PRICE = 71.0;
export const LOCAL_LCO_SHARE = 36.2;
export const LOCAL_MSO_CUT = 34.8;

// Local pack channels (LPS 1 through LPS 12, and LPS HD) included in Local Add-on (Rs. 71)
export const DEFAULT_LOCAL_CHANNELS: string[] = [
  'LPS 1',
  'LPS 2',
  'LPS 3',
  'LPS 4',
  'LPS 5',
  'LPS 6',
  'LPS 7',
  'LPS 8',
  'LPS 9',
  'LPS 10',
  'LPS 11',
  'LPS 12',
  'LPS HD',
];

// Standard combined Base Pack (BST 154 + Local 71 = Rs. 225.00)
export const DEFAULT_BASE_PRICE = 225.0;

// 3. Ala-Car-te Channel khat zelah:
// LCO: 8.47%
// Broadcaster/ MSO: 91.53%
export const DEFAULT_LCO_COMMISSION_PERCENT = 8.47;
export const ALACARTE_LCO_COMMISSION_PERCENT = 8.47;
export const ALACARTE_MSO_PERCENT = 91.53;

export interface AddonPresetChannel {
  name: string;
  price: number;
  quality: 'SD' | 'HD';
  category: string;
}

// Preset: ADD ON SPORTS (Tensport SD bik SONY SPORTS TEN 1/2/3/5)
export const SPORTS_ADDON_PRESET: AddonPresetChannel[] = [
  { name: 'SONY SPORTS TEN 1', price: 22.42, quality: 'SD', category: 'Sports' },
  { name: 'SONY SPORTS TEN 2', price: 22.42, quality: 'SD', category: 'Sports' },
  { name: 'SONY SPORTS TEN 3', price: 22.42, quality: 'SD', category: 'Sports' },
  { name: 'SONY SPORTS TEN 5', price: 22.42, quality: 'SD', category: 'Sports' },
];

// Preset: SD ADD ON (ZEE ZEST / Movies Now / MNX / NG Wild / SM SELECT / Nick Junior / VH1 / Colors Infinity)
export const SD_ADDON_PRESET: AddonPresetChannel[] = [
  { name: 'ZEE ZEST', price: 1.18, quality: 'SD', category: 'Infotainment' },
  { name: 'Movies Now', price: 11.80, quality: 'SD', category: 'Movies' },
  { name: 'MNX', price: 5.90, quality: 'SD', category: 'Movies' },
  { name: 'NG Wild', price: 2.36, quality: 'SD', category: 'Infotainment' },
  { name: 'SM SELECT', price: 11.18, quality: 'SD', category: 'Entertainment' },
  { name: 'Nick Junior', price: 1.18, quality: 'SD', category: 'Kids' },
  { name: 'VH1', price: 1.18, quality: 'SD', category: 'Music' },
  { name: 'Colors Infinity', price: 11.18, quality: 'SD', category: 'Entertainment' },
];

// Preset: HD ADD ON (Tensport HD & NG WILD HD: NG WILD HD / SONY SPORTS TEN 1 HD / 2 HD / 5 HD)
export const HD_ADDON_PRESET: AddonPresetChannel[] = [
  { name: 'NG WILD HD', price: 9.44, quality: 'HD', category: 'Infotainment' },
  { name: 'SONY SPORTS TEN 1 HD', price: 35.40, quality: 'HD', category: 'Sports' },
  { name: 'SONY SPORTS TEN 2 HD', price: 35.40, quality: 'HD', category: 'Sports' },
  { name: 'SONY SPORTS TEN 5 HD', price: 35.40, quality: 'HD', category: 'Sports' },
];

// Preset: Silver a awm te (13 Channels in LPS SILVER)
export const SILVER_PRESET: AddonPresetChannel[] = [
  { name: 'Star Sports 1', price: 22.42, quality: 'SD', category: 'Sports' },
  { name: 'Cartoon Network', price: 5.07, quality: 'SD', category: 'Kids' },
  { name: 'Pogo', price: 5.07, quality: 'SD', category: 'Kids' },
  { name: 'Star Sports Select 1', price: 22.42, quality: 'SD', category: 'Sports' },
  { name: 'Star Sports Select 2', price: 17.70, quality: 'SD', category: 'Sports' },
  { name: 'Discovery Kids', price: 4.13, quality: 'SD', category: 'Kids' },
  { name: 'Discovery', price: 4.72, quality: 'SD', category: 'Infotainment' },
  { name: 'Discovery Turbo', price: 1.18, quality: 'SD', category: 'Infotainment' },
  { name: 'Discovery Science', price: 1.18, quality: 'SD', category: 'Infotainment' },
  { name: 'Animal Planet', price: 2.36, quality: 'SD', category: 'Infotainment' },
  { name: 'TLC', price: 2.36, quality: 'SD', category: 'Infotainment' },
  { name: 'Discovery ID', price: 1.18, quality: 'SD', category: 'Infotainment' },
  { name: 'Eurosport', price: 4.13, quality: 'SD', category: 'Sports' },
];

// Quick Preset Plan Channels (Rs. 300, Rs. 350, Rs. 50, Rs. 60, Rs. 100)
// Rs. 300 SD: BST + LPS LOCALS + Star Sports 1 / Star Sports Select 1 / Star Sports Select 2 / Cartoon Network
export const PRESET_300_CHANNELS: string[] = [
  'Star Sports 1',
  'Star Sports Select 1',
  'Star Sports Select 2',
  'Cartoon Network',
];

// Rs. 350 HD: BST + LPS LOCALS + SS Select HD-1 / SS Select HD-2 / Star Sports HD-1 / Cartoon Network
export const PRESET_350_CHANNELS: string[] = [
  'SS Select HD-1',
  'SS Select HD-2',
  'Star Sports HD-1',
  'Cartoon Network',
];

// Rs. 50: Nick Junior / Movies Now / MNX / NG Wild / SM SELECT / VH1
export const PRESET_50_CHANNELS: string[] = [
  'Nick Junior',
  'Movies Now',
  'MNX',
  'NG Wild',
  'SM SELECT',
  'VH1',
];

// Rs. 60: SONY SPORTS TEN 1 / SONY SPORTS TEN 2
export const PRESET_60_CHANNELS: string[] = [
  'SONY SPORTS TEN 1',
  'SONY SPORTS TEN 2',
];

// Rs. 100: SONY SPORTS TEN 1 HD / SONY SPORTS TEN 2 HD
export const PRESET_100_CHANNELS: string[] = [
  'SONY SPORTS TEN 1 HD',
  'SONY SPORTS TEN 2 HD',
];

// Preset: LPS GOLD (19 Channels in LPS GOLD)
export const GOLD_PRESET: AddonPresetChannel[] = [
  { name: 'Cartoon Network', price: 5.07, quality: 'SD', category: 'Kids' },
  { name: 'Pogo', price: 5.07, quality: 'SD', category: 'Kids' },
  { name: 'Movies Now HD', price: 14.16, quality: 'HD', category: 'Movies' },
  { name: 'MNX HD', price: 10.62, quality: 'HD', category: 'Movies' },
  { name: 'EUROSPORTS HD', price: 6.49, quality: 'HD', category: 'Sports' },
  { name: 'ET Now', price: 2.36, quality: 'SD', category: 'News' },
  { name: 'Romedy Now', price: 5.90, quality: 'SD', category: 'Movies' },
  { name: 'Zoom', price: 0.59, quality: 'SD', category: 'Music' },
  { name: 'MN+ HD', price: 9.44, quality: 'HD', category: 'Movies' },
  { name: 'Star Sports HD-1', price: 22.42, quality: 'HD', category: 'Sports' },
  { name: 'Star Sports HD-2', price: 22.42, quality: 'HD', category: 'Sports' },
  { name: 'SS Select HD-1', price: 22.42, quality: 'HD', category: 'Sports' },
  { name: 'SS Select HD-2', price: 17.70, quality: 'HD', category: 'Sports' },
  { name: 'Discovery Kids', price: 4.13, quality: 'SD', category: 'Kids' },
  { name: 'Discovery Turbo', price: 1.18, quality: 'SD', category: 'Infotainment' },
  { name: 'Discovery Science', price: 1.18, quality: 'SD', category: 'Infotainment' },
  { name: 'Discovery ID', price: 1.18, quality: 'SD', category: 'Infotainment' },
  { name: 'Discovery HD', price: 9.44, quality: 'HD', category: 'Infotainment' },
  { name: 'Animal Planet HD', price: 5.90, quality: 'HD', category: 'Infotainment' },
];

/**
 * LPS Official A-la-carte Channel Rate List (from channel_list.xlsx)
 * Total: 110 channels
 */
export const DEFAULT_CHANNELS: ChannelItem[] = [
  {
    "id": "ch-aaj-tak",
    "name": "Aaj Tak",
    "price": 0.8,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-animal-planet",
    "name": "Animal Planet",
    "price": 2.36,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-animal-planet-hd",
    "name": "Animal Planet HD",
    "price": 5.9,
    "category": "Infotainment",
    "isHd": true
  },
  {
    "id": "ch-bbc",
    "name": "BBC",
    "price": 1.77,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-bbc-earth",
    "name": "BBC EARTH",
    "price": 3.54,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-cartoon-network",
    "name": "Cartoon Network",
    "price": 5.07,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-cnbc-tv18",
    "name": "CNBC TV18",
    "price": 4.72,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-cnn",
    "name": "CNN",
    "price": 2.36,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-cnn-news-18",
    "name": "CNN News 18",
    "price": 0.59,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-colors",
    "name": "Colors",
    "price": 22.42,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-colors-cineplex-superhit",
    "name": "Colors Cineplex Superhit",
    "price": 0.1,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-colors-hd",
    "name": "Colors HD",
    "price": 22.42,
    "category": "Entertainment",
    "isHd": true
  },
  {
    "id": "ch-colors-infinity",
    "name": "Colors Infinity",
    "price": 11.18,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-colors-infinity-hd",
    "name": "Colors Infinity HD",
    "price": 17.7,
    "category": "Entertainment",
    "isHd": true
  },
  {
    "id": "ch-discovery",
    "name": "Discovery",
    "price": 4.72,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-discovery-hd",
    "name": "Discovery HD",
    "price": 9.44,
    "category": "Infotainment",
    "isHd": true
  },
  {
    "id": "ch-discovery-id",
    "name": "Discovery ID",
    "price": 1.18,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-discovery-kids",
    "name": "Discovery Kids",
    "price": 4.13,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-discovery-science",
    "name": "Discovery Science",
    "price": 1.18,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-discovery-turbo",
    "name": "Discovery Turbo",
    "price": 1.18,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-disney",
    "name": "Disney",
    "price": 14.16,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-disney-bindas",
    "name": "Disney Bindas",
    "price": 0.1,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-disney-international-hd",
    "name": "Disney International HD",
    "price": 22.42,
    "category": "Kids",
    "isHd": true
  },
  {
    "id": "ch-disney-junior",
    "name": "Disney Junior",
    "price": 4.72,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-et-now",
    "name": "ET Now",
    "price": 2.36,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-eurosport",
    "name": "Eurosport",
    "price": 4.13,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-eurosports-hd",
    "name": "EUROSPORTS HD",
    "price": 6.49,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-fox-life",
    "name": "Fox Life",
    "price": 1.18,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-history",
    "name": "History",
    "price": 3.54,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-hungama",
    "name": "Hungama",
    "price": 2.36,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-india-today",
    "name": "India Today",
    "price": 1.77,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-living-foodz",
    "name": "Living Foodz",
    "price": 1,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-lps-5",
    "name": "LPS-5",
    "price": 0,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-lps-ppv",
    "name": "LPS-PPV",
    "price": 50,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-lps-ppv-sd",
    "name": "LPS-PPV SD",
    "price": 0,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-mirror-now",
    "name": "Mirror Now",
    "price": 0.59,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-mix",
    "name": "MIX",
    "price": 1,
    "category": "Music",
    "isHd": false
  },
  {
    "id": "ch-mn-hd",
    "name": "MN+ HD",
    "price": 9.44,
    "category": "Movies",
    "isHd": true
  },
  {
    "id": "ch-mnx",
    "name": "MNX",
    "price": 5.9,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-mnx-hd",
    "name": "MNX HD",
    "price": 10.62,
    "category": "Movies",
    "isHd": true
  },
  {
    "id": "ch-movies-now",
    "name": "Movies Now",
    "price": 11.8,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-movies-now-hd",
    "name": "Movies Now HD",
    "price": 14.16,
    "category": "Movies",
    "isHd": true
  },
  {
    "id": "ch-mtv-india",
    "name": "MTV India",
    "price": 5.9,
    "category": "Music",
    "isHd": false
  },
  {
    "id": "ch-news-18",
    "name": "News 18",
    "price": 0.1,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-news-18-assam",
    "name": "News 18 Assam",
    "price": 0.1,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-ng-wild",
    "name": "NG Wild",
    "price": 2.36,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-ng-wild-hd",
    "name": "NG WILD HD",
    "price": 9.44,
    "category": "Entertainment",
    "isHd": true
  },
  {
    "id": "ch-ngc",
    "name": "NGC",
    "price": 3.54,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-ngc-hd",
    "name": "NGC HD",
    "price": 16.52,
    "category": "Infotainment",
    "isHd": true
  },
  {
    "id": "ch-nick",
    "name": "Nick",
    "price": 8.26,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-nick-junior",
    "name": "Nick Junior",
    "price": 1.18,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-pal",
    "name": "PAL",
    "price": 0.59,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-pogo",
    "name": "Pogo",
    "price": 5.07,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-romedy-now",
    "name": "Romedy Now",
    "price": 5.9,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-set",
    "name": "SET",
    "price": 22.42,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-set-max",
    "name": "SET MAX",
    "price": 22.42,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-set-pix",
    "name": "SET PIX",
    "price": 11.8,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-sg-romance",
    "name": "SG ROMANCE",
    "price": 3.54,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-sg-thrills",
    "name": "SG THRILLS",
    "price": 2.36,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-sm-select",
    "name": "SM SELECT",
    "price": 11.18,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-sonic",
    "name": "Sonic",
    "price": 2.36,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-sony-sports-ten-1",
    "name": "SONY SPORTS TEN 1",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-sony-sports-ten-1-hd",
    "name": "SONY SPORTS TEN 1 HD",
    "price": 35.4,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-sony-sports-ten-2",
    "name": "SONY SPORTS TEN 2",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-sony-sports-ten-2-hd",
    "name": "SONY SPORTS TEN 2 HD",
    "price": 35.4,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-sony-sports-ten-3",
    "name": "SONY SPORTS TEN 3",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-sony-sports-ten-3-hd",
    "name": "SONY SPORTS TEN 3 HD",
    "price": 35.4,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-sony-sports-ten-5",
    "name": "SONY SPORTS TEN 5",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-sony-sports-ten-5-hd",
    "name": "SONY SPORTS TEN 5 HD",
    "price": 35.4,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-sports-18-hd",
    "name": "SPORTS 18 HD",
    "price": 22.42,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-sports-18-3",
    "name": "SPORTS 18-3",
    "price": 9.44,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-ss-select-hd-1",
    "name": "SS Select HD-1",
    "price": 22.42,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-ss-select-hd-2",
    "name": "SS Select HD-2",
    "price": 17.7,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-star-bharat",
    "name": "Star Bharat",
    "price": 17.7,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-star-gold",
    "name": "Star Gold",
    "price": 22.42,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-star-gold-2",
    "name": "Star Gold 2",
    "price": 5.9,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-star-gold-2-hd",
    "name": "Star Gold 2 HD",
    "price": 9.44,
    "category": "Movies",
    "isHd": true
  },
  {
    "id": "ch-star-gold-hd",
    "name": "Star Gold HD",
    "price": 22.42,
    "category": "Movies",
    "isHd": true
  },
  {
    "id": "ch-star-gold-select",
    "name": "Star Gold Select",
    "price": 8.26,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-star-movies",
    "name": "Star Movies",
    "price": 22.42,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-star-movies-hd",
    "name": "Star Movies HD",
    "price": 22.42,
    "category": "Movies",
    "isHd": true
  },
  {
    "id": "ch-star-movies-select-hd",
    "name": "Star Movies Select HD",
    "price": 22.42,
    "category": "Movies",
    "isHd": true
  },
  {
    "id": "ch-star-plus",
    "name": "Star Plus",
    "price": 22.42,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-star-sports-1",
    "name": "Star Sports 1",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-star-sports-1-hindi",
    "name": "Star Sports 1 Hindi",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-star-sports-2",
    "name": "Star Sports 2",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-star-sports-3",
    "name": "Star Sports 3",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-star-sports-hd-1",
    "name": "Star Sports HD-1",
    "price": 22.42,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-star-sports-hd-2",
    "name": "Star Sports HD-2",
    "price": 22.42,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-star-sports-khel",
    "name": "Star Sports Khel",
    "price": 5.9,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-star-sports-select-1",
    "name": "Star Sports Select 1",
    "price": 22.42,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-star-sports-select-2",
    "name": "Star Sports Select 2",
    "price": 17.7,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-star-utsav",
    "name": "Star Utsav",
    "price": 0.59,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-star-utsav-movies",
    "name": "Star Utsav Movies",
    "price": 0.59,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-super-hungama",
    "name": "Super Hungama",
    "price": 4.72,
    "category": "Kids",
    "isHd": false
  },
  {
    "id": "ch-times-now",
    "name": "Times Now",
    "price": 2.95,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-tlc",
    "name": "TLC",
    "price": 2.36,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-tlc-hd",
    "name": "TLC HD",
    "price": 3.54,
    "category": "Infotainment",
    "isHd": true
  },
  {
    "id": "ch-tn-navbharat",
    "name": "TN Navbharat",
    "price": 1.77,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-unite8-sports-1",
    "name": "Unite8 Sports 1",
    "price": 11.8,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-unite8-sports-1-hd",
    "name": "Unite8 Sports 1 HD",
    "price": 22.42,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-unite8-sports-2",
    "name": "Unite8 Sports 2",
    "price": 17.7,
    "category": "Sports",
    "isHd": false
  },
  {
    "id": "ch-unite8-sports-2-hd",
    "name": "Unite8 Sports 2 HD",
    "price": 22.42,
    "category": "Sports",
    "isHd": true
  },
  {
    "id": "ch-vh1",
    "name": "VH1",
    "price": 1.18,
    "category": "Music",
    "isHd": false
  },
  {
    "id": "ch-wion",
    "name": "WION",
    "price": 1.18,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-zee-bangla",
    "name": "ZEE Bangla",
    "price": 22.42,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-zee-cinema",
    "name": "ZEE Cinema",
    "price": 22.42,
    "category": "Movies",
    "isHd": false
  },
  {
    "id": "ch-zee-tv",
    "name": "ZEE Tv",
    "price": 22.42,
    "category": "Entertainment",
    "isHd": false
  },
  {
    "id": "ch-zee-zest",
    "name": "ZEE ZEST",
    "price": 1.18,
    "category": "Infotainment",
    "isHd": false
  },
  {
    "id": "ch-zoom",
    "name": "Zoom",
    "price": 0.59,
    "category": "Music",
    "isHd": false
  },
  {
    "id": "ch-times-now-world-hd",
    "name": "Times Now World-HD",
    "price": 3.54,
    "category": "News",
    "isHd": true
  },
  {
    "id": "ch-et-now-swadesh",
    "name": "ET Now Swadesh",
    "price": 0.00,
    "category": "News",
    "isHd": false
  },
  {
    "id": "ch-times-now-navbharat-hd",
    "name": "Times Now Navbharat HD",
    "price": 2.00,
    "category": "News",
    "isHd": true
  }
];
