import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  ChevronDown,
  Check,
  X,
  Plus,
  Sparkles,
  Tv2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Filter,
  Layers,
  Zap,
  Save,
  RotateCcw,
} from 'lucide-react';
import { CustomerSummary, ChannelItem } from '../types';
import {
  BST_PRICE,
  LOCAL_PRICE,
  LOCAL_LCO_SHARE,
  DEFAULT_LOCAL_CHANNELS,
  ALACARTE_LCO_COMMISSION_PERCENT,
  SPORTS_ADDON_PRESET,
  SD_ADDON_PRESET,
  HD_ADDON_PRESET,
  PRESET_300_CHANNELS,
  PRESET_350_CHANNELS,
  PRESET_50_CHANNELS,
  PRESET_60_CHANNELS,
  PRESET_100_CHANNELS,
} from '../data/defaultChannels';
import {
  getChannelPriceMap,
  normalizeKey,
  calculateCustomerPricing,
  matchChannelSearch,
} from '../utils/excelParser';

// Helper to identify Sony sports channels
const isSonySports = (name: string): boolean => {
  const l = name.toLowerCase();
  return (
    l.includes('sony') ||
    l.includes('ten 1') ||
    l.includes('ten 2') ||
    l.includes('ten 3') ||
    l.includes('ten 5')
  );
};

// Helper to identify Star Sports & SS Select channels
const isStarSports = (name: string): boolean => {
  const l = name.toLowerCase();
  return (
    l.includes('star sports') ||
    l.includes('ss select') ||
    l.includes('star sport')
  );
};

// Helper to identify HD channels
const isChannelHd = (ch: { isHd?: boolean; name: string }): boolean => {
  return (
    ch.isHd === true ||
    ch.name.toUpperCase().includes(' HD') ||
    ch.name.toUpperCase().endsWith(' HD') ||
    ch.name.toUpperCase().endsWith('-HD') ||
    ch.name.toUpperCase().includes('HD-')
  );
};

interface CustomerChannelSelectorProps {
  customers: CustomerSummary[];
  availableChannels: ChannelItem[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string) => void;
  onSaveCustomerChannels: (
    customerId: string,
    channels: string[],
    hasLocalAddon: boolean,
    customBillAmount?: number
  ) => void;
  onApplyChannelsToAll?: (
    channels: string[],
    hasLocalAddon: boolean,
    packName: string,
    customBillAmount?: number
  ) => void;
  bstPrice?: number;
  localAddonPrice?: number;
}

export const CustomerChannelSelector: React.FC<CustomerChannelSelectorProps> = ({
  customers,
  availableChannels,
  selectedCustomerId,
  onSelectCustomer,
  onSaveCustomerChannels,
  onApplyChannelsToAll,
  bstPrice = BST_PRICE,
  localAddonPrice = LOCAL_PRICE,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelSearchTerm, setChannelSearchTerm] = useState('');
  const [selectedChannelTags, setSelectedChannelTags] = useState<string[]>([]);
  const [hasLocalAddon, setHasLocalAddon] = useState<boolean>(true);
  const [customBillInput, setCustomBillInput] = useState<string>('');
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sports and Quality Filters
  const [sportsSubFilter, setSportsSubFilter] = useState<'all' | 'addon_sports' | 'sony' | 'starsports' | 'others'>('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'hd' | 'sd'>('all');

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) {
      return customers;
    }
    const q = searchTerm.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subscriberCode.toLowerCase().includes(q) ||
        c.stbNo.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  // Currently active customer
  const currentCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Track active customer ID so draft isn't overwritten on unrelated parent state re-renders
  const lastCustomerIdRef = useRef<string | null>(null);

  // When customer selection changes, populate channel tags, local addon status, and custom bill
  useEffect(() => {
    if (selectedCustomerId !== lastCustomerIdRef.current) {
      lastCustomerIdRef.current = selectedCustomerId;
      if (currentCustomer) {
        setSelectedChannelTags([...currentCustomer.selectedChannels]);
        setHasLocalAddon(currentCustomer.hasLocalAddon !== false);
        setCustomBillInput(
          currentCustomer.customBillAmount !== undefined && currentCustomer.customBillAmount > 0
            ? currentCustomer.customBillAmount.toString()
            : ''
        );
        setSaveSuccessMessage(null);
      } else {
        setSelectedChannelTags([]);
        setHasLocalAddon(true);
        setCustomBillInput('');
      }
    }
  }, [selectedCustomerId, currentCustomer]);

  // Price map for quick lookup
  const channelPriceMap = useMemo(() => getChannelPriceMap(availableChannels), [availableChannels]);

  // Categories list: 'Local' placed immediately next to 'All', followed by 'SD ADD ON', 'HD ADD ON', 'LPS SILVER', 'LPS GOLD'
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableChannels.forEach((ch) => {
      if (
        ch.category &&
        ch.category.trim() &&
        ch.category.toLowerCase() !== 'local' &&
        ch.category.toUpperCase() !== 'SD ADD ON' &&
        ch.category.toUpperCase() !== 'HD ADD ON'
      ) {
        set.add(ch.category);
      }
    });
    return [
      'All',
      'Local',
      'SD ADD ON',
      'HD ADD ON',
      ...Array.from(set),
    ];
  }, [availableChannels]);

  // Sports channel groups
  const allSportsChannels = useMemo(() => {
    return availableChannels.filter((ch) => ch.category === 'Sports');
  }, [availableChannels]);

  const sonySportsChannels = useMemo(() => {
    return allSportsChannels.filter((ch) => isSonySports(ch.name));
  }, [allSportsChannels]);

  const starSportsChannels = useMemo(() => {
    return allSportsChannels.filter((ch) => isStarSports(ch.name));
  }, [allSportsChannels]);

  const otherSportsChannels = useMemo(() => {
    return allSportsChannels.filter((ch) => !isSonySports(ch.name) && !isStarSports(ch.name));
  }, [allSportsChannels]);

  const hdSportsChannels = useMemo(() => {
    return allSportsChannels.filter((ch) => isChannelHd(ch));
  }, [allSportsChannels]);

  const sdSportsChannels = useMemo(() => {
    return allSportsChannels.filter((ch) => !isChannelHd(ch));
  }, [allSportsChannels]);

  // Overall HD and SD counts
  const totalHdCount = useMemo(() => {
    return availableChannels.filter((ch) => isChannelHd(ch)).length;
  }, [availableChannels]);

  const totalSdCount = useMemo(() => {
    return availableChannels.filter((ch) => !isChannelHd(ch)).length;
  }, [availableChannels]);

  // Selected counts
  const selectedSonyCount = useMemo(() => {
    return sonySportsChannels.filter((ch) => selectedChannelTags.includes(ch.name)).length;
  }, [sonySportsChannels, selectedChannelTags]);

  const selectedStarCount = useMemo(() => {
    return starSportsChannels.filter((ch) => selectedChannelTags.includes(ch.name)).length;
  }, [starSportsChannels, selectedChannelTags]);

  const selectedSportsHdCount = useMemo(() => {
    return hdSportsChannels.filter((ch) => selectedChannelTags.includes(ch.name)).length;
  }, [hdSportsChannels, selectedChannelTags]);

  const selectedSportsSdCount = useMemo(() => {
    return sdSportsChannels.filter((ch) => selectedChannelTags.includes(ch.name)).length;
  }, [sdSportsChannels, selectedChannelTags]);

  const selectedOtherCount = useMemo(() => {
    return otherSportsChannels.filter((ch) => selectedChannelTags.includes(ch.name)).length;
  }, [otherSportsChannels, selectedChannelTags]);

  // ADD ON SPORTS Preset counts and helpers
  const sportsAddonNames = useMemo(() => SPORTS_ADDON_PRESET.map((c) => c.name), []);
  const selectedSportsAddonCount = useMemo(() => {
    return SPORTS_ADDON_PRESET.filter((c) => selectedChannelTags.includes(c.name)).length;
  }, [selectedChannelTags]);
  const isAllSportsAddonSelected = selectedSportsAddonCount === SPORTS_ADDON_PRESET.length;

  // SD ADD ON Preset counts and helpers
  const sdAddonNames = useMemo(() => SD_ADDON_PRESET.map((c) => c.name), []);
  const selectedSdAddonCount = useMemo(() => {
    return SD_ADDON_PRESET.filter((c) => selectedChannelTags.includes(c.name)).length;
  }, [selectedChannelTags]);
  const isAllSdAddonSelected = selectedSdAddonCount === SD_ADDON_PRESET.length;

  // HD ADD ON Preset counts and helpers
  const hdAddonNames = useMemo(() => HD_ADDON_PRESET.map((c) => c.name), []);
  const selectedHdAddonCount = useMemo(() => {
    return HD_ADDON_PRESET.filter((c) => selectedChannelTags.includes(c.name)).length;
  }, [selectedChannelTags]);
  const isAllHdAddonSelected = selectedHdAddonCount === HD_ADDON_PRESET.length;

  // Total rates for display
  const sportsAddonTotalPrice = useMemo(
    () => SPORTS_ADDON_PRESET.reduce((acc, curr) => acc + curr.price, 0),
    []
  );
  const sdAddonTotalPrice = useMemo(
    () => SD_ADDON_PRESET.reduce((acc, curr) => acc + curr.price, 0),
    []
  );
  const hdAddonTotalPrice = useMemo(
    () => HD_ADDON_PRESET.reduce((acc, curr) => acc + curr.price, 0),
    []
  );

  // Filter channels for selection
  const filteredChannels = useMemo(() => {
    let list = availableChannels;

    // 1. Category filter
    if (
      selectedCategory !== 'All' &&
      selectedCategory !== 'SD ADD ON' &&
      selectedCategory !== 'HD ADD ON'
    ) {
      list = list.filter((ch) => ch.category === selectedCategory);
    }

    // 2. Sports sub-filter and quality filter (applied when category is Sports)
    if (selectedCategory === 'Sports') {
      if (sportsSubFilter === 'addon_sports') {
        const addonNamesLower = sportsAddonNames.map((n) => n.toLowerCase());
        list = list.filter((ch) => addonNamesLower.includes(ch.name.toLowerCase()));
      } else if (sportsSubFilter === 'sony') {
        list = list.filter((ch) => isSonySports(ch.name));
      } else if (sportsSubFilter === 'starsports') {
        list = list.filter((ch) => isStarSports(ch.name));
      } else if (sportsSubFilter === 'others') {
        list = list.filter((ch) => !isSonySports(ch.name) && !isStarSports(ch.name));
      }

      if (qualityFilter === 'hd') {
        list = list.filter((ch) => isChannelHd(ch));
      } else if (qualityFilter === 'sd') {
        list = list.filter((ch) => !isChannelHd(ch));
      }
    }

    // 4. Search query
    const q = channelSearchTerm.trim();
    if (q) {
      list = list.filter((ch) => matchChannelSearch(ch.name, q, ch.category));
    }

    return list;
  }, [availableChannels, selectedCategory, sportsSubFilter, qualityFilter, channelSearchTerm, sportsAddonNames]);

  // Toggle all ADD ON SPORTS channels (4 SD)
  const handleToggleAllSportsAddon = () => {
    if (isAllSportsAddonSelected) {
      const newTags = selectedChannelTags.filter((t) => !sportsAddonNames.includes(t));
      updateDraft(newTags, hasLocalAddon);
    } else {
      const toAdd = sportsAddonNames.filter((name) => !selectedChannelTags.includes(name));
      updateDraft([...selectedChannelTags, ...toAdd], hasLocalAddon);
    }
  };

  // Helper to update draft working state ONLY (Does NOT save to customer until clicking SAVE button)
  const updateDraft = (
    newTags: string[],
    newLocalAddon: boolean,
    newBillVal?: number | string
  ) => {
    setSelectedChannelTags(newTags);
    setHasLocalAddon(newLocalAddon);

    if (newBillVal !== undefined) {
      if (typeof newBillVal === 'number') {
        const parsed = newBillVal > 0 ? Number(newBillVal.toFixed(2)) : undefined;
        setCustomBillInput(parsed ? parsed.toString() : '');
      } else if (typeof newBillVal === 'string') {
        setCustomBillInput(newBillVal);
      }
    }
  };

  // Toggle all SD ADD ON channels (11 SD)
  const handleToggleAllSdAddon = () => {
    if (isAllSdAddonSelected) {
      const newTags = selectedChannelTags.filter((t) => !sdAddonNames.includes(t));
      updateDraft(newTags, hasLocalAddon);
    } else {
      const toAdd = sdAddonNames.filter((name) => !selectedChannelTags.includes(name));
      updateDraft([...selectedChannelTags, ...toAdd], hasLocalAddon);
    }
  };

  const handleToggleAllHdAddon = () => {
    if (isAllHdAddonSelected) {
      const newTags = selectedChannelTags.filter((t) => !hdAddonNames.includes(t));
      updateDraft(newTags, hasLocalAddon);
    } else {
      const toAdd = hdAddonNames.filter((name) => !selectedChannelTags.includes(name));
      updateDraft([...selectedChannelTags, ...toAdd], hasLocalAddon);
    }
  };

  // Toggle single channel
  const handleToggleSingleChannel = (channelName: string) => {
    const newTags = selectedChannelTags.includes(channelName)
      ? selectedChannelTags.filter((t) => t !== channelName)
      : [...selectedChannelTags, channelName];
    updateDraft(newTags, hasLocalAddon);
  };

  // Add channel tag
  const handleAddChannel = (channelName: string) => {
    if (!selectedChannelTags.includes(channelName)) {
      updateDraft([...selectedChannelTags, channelName], hasLocalAddon);
    }
  };

  // Remove channel tag
  const handleRemoveChannel = (channelName: string) => {
    const newTags = selectedChannelTags.filter((name) => name !== channelName);
    updateDraft(newTags, hasLocalAddon);
  };

  // Clear all channels
  const handleClearAllChannels = () => {
    updateDraft([], hasLocalAddon, '');
  };

  // --- QUICK PRESETS (Rs. 300, Rs. 350, Rs. 50, Rs. 60, Rs. 100) ---
  // Rs. 300 SD: BST + LPS LOCALS + Star Sports Select 1 / Star Sports Select 2 / Cartoon Network
  const is300Active = useMemo(() => {
    return (
      hasLocalAddon &&
      selectedChannelTags.includes('Star Sports Select 1') &&
      selectedChannelTags.includes('Star Sports Select 2') &&
      !selectedChannelTags.includes('Star Sports HD-1')
    );
  }, [selectedChannelTags, hasLocalAddon]);

  // Rs. 350 HD: BST + LPS LOCALS + SS Select HD-1 / SS Select HD-2 / Star Sports HD-1 / Cartoon Network
  const is350Active = useMemo(() => {
    return (
      hasLocalAddon &&
      selectedChannelTags.includes('Star Sports HD-1') &&
      selectedChannelTags.includes('SS Select HD-1') &&
      selectedChannelTags.includes('SS Select HD-2')
    );
  }, [selectedChannelTags, hasLocalAddon]);

  // Rs. 50: Nick Junior / Movies Now / MNX / NG Wild / SM SELECT / VH1
  const is50Active = useMemo(() => {
    return PRESET_50_CHANNELS.every((ch) => selectedChannelTags.includes(ch));
  }, [selectedChannelTags]);

  // Rs. 60: SONY SPORTS TEN 1 / SONY SPORTS TEN 2 (and not HD)
  const is60Active = useMemo(() => {
    return (
      selectedChannelTags.includes('SONY SPORTS TEN 1') &&
      selectedChannelTags.includes('SONY SPORTS TEN 2') &&
      !selectedChannelTags.includes('SONY SPORTS TEN 1 HD')
    );
  }, [selectedChannelTags]);

  // Rs. 100: SONY SPORTS TEN 1 HD / SONY SPORTS TEN 2 HD
  const is100Active = useMemo(() => {
    return (
      selectedChannelTags.includes('SONY SPORTS TEN 1 HD') &&
      selectedChannelTags.includes('SONY SPORTS TEN 2 HD')
    );
  }, [selectedChannelTags]);

  // Combo Active States
  const isCombo450Active = is350Active && is100Active;
  const isCombo360Active = is300Active && is60Active;

  // Combined preset bill calculation (e.g. Rs. 350 + Rs. 100 = Rs. 450)
  const currentPresetBill = useMemo(() => {
    const base = is300Active ? 300 : is350Active ? 350 : 0;
    const addon = (is50Active ? 50 : 0) + (is60Active ? 60 : 0) + (is100Active ? 100 : 0);
    return base > 0 ? base + addon : addon > 0 ? (hasLocalAddon ? 225 : 154) + addon : 0;
  }, [is300Active, is350Active, is50Active, is60Active, is100Active, hasLocalAddon]);

  // 1. Rs. 300 SD Pack
  // When clicked: Replaces 350 HD channels completely!
  const handleTogglePreset300 = () => {
    if (is300Active) {
      const newTags = selectedChannelTags.filter(
        (ch) => ch !== 'Star Sports Select 1' && ch !== 'Star Sports Select 2' && ch !== 'Cartoon Network'
      );
      const sportsAddon = is100Active ? 100 : is60Active ? 60 : 0;
      const newBill = (hasLocalAddon ? 225 : 154) + (is50Active ? 50 : 0) + sportsAddon;
      updateDraft(newTags, hasLocalAddon, newBill);
    } else {
      // Remove all 350 HD channels (SS Select HD-1, SS Select HD-2, Star Sports HD-1)
      let newTags = selectedChannelTags.filter(
        (ch) => ch !== 'SS Select HD-1' && ch !== 'SS Select HD-2' && ch !== 'Star Sports HD-1'
      );
      for (const ch of PRESET_300_CHANNELS) {
        if (!newTags.includes(ch)) newTags.push(ch);
      }
      const sportsAddon = is100Active ? 100 : is60Active ? 60 : 0;
      const newBill = 300 + (is50Active ? 50 : 0) + sportsAddon;
      updateDraft(newTags, true, newBill);
      setSaveSuccessMessage('Rs. 300 SD Pack thlan a ni e. SAVE (BST + Local & Channels) button hmet la a in-save ang.');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    }
  };

  // 2. Rs. 350 HD Pack
  // When clicked: Replaces 300 SD channels completely!
  const handleTogglePreset350 = () => {
    if (is350Active) {
      const newTags = selectedChannelTags.filter(
        (ch) => ch !== 'SS Select HD-1' && ch !== 'SS Select HD-2' && ch !== 'Star Sports HD-1' && ch !== 'Cartoon Network'
      );
      const sportsAddon = is100Active ? 100 : is60Active ? 60 : 0;
      const newBill = (hasLocalAddon ? 225 : 154) + (is50Active ? 50 : 0) + sportsAddon;
      updateDraft(newTags, hasLocalAddon, newBill);
    } else {
      // Remove all 300 SD channels (Star Sports Select 1, Star Sports Select 2)
      let newTags = selectedChannelTags.filter(
        (ch) => ch !== 'Star Sports Select 1' && ch !== 'Star Sports Select 2'
      );
      for (const ch of PRESET_350_CHANNELS) {
        if (!newTags.includes(ch)) newTags.push(ch);
      }
      const sportsAddon = is100Active ? 100 : is60Active ? 60 : 0;
      const newBill = 350 + (is50Active ? 50 : 0) + sportsAddon;
      updateDraft(newTags, true, newBill);
      setSaveSuccessMessage('Rs. 350 HD Pack thlan a ni e. SAVE (BST + Local & Channels) button hmet la a in-save ang.');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    }
  };

  // 3. Rs. 50 Addon
  const handleTogglePreset50 = () => {
    let newTags: string[];
    const base = is350Active ? 350 : is300Active ? 300 : (hasLocalAddon ? 225 : 154);
    const sportsAddon = is100Active ? 100 : is60Active ? 60 : 0;
    if (is50Active) {
      newTags = selectedChannelTags.filter((ch) => !PRESET_50_CHANNELS.includes(ch));
      const newBill = base + sportsAddon;
      updateDraft(newTags, hasLocalAddon, newBill);
    } else {
      newTags = [...selectedChannelTags];
      for (const ch of PRESET_50_CHANNELS) {
        if (!newTags.includes(ch)) newTags.push(ch);
      }
      const newBill = base + 50 + sportsAddon;
      updateDraft(newTags, hasLocalAddon, newBill);
    }
  };

  // 4. Rs. 60 Sports SD Addon
  // If 100 is active, clicking 60 REPLACES 100 completely!
  const handleTogglePreset60 = () => {
    const base = is350Active ? 350 : is300Active ? 300 : (hasLocalAddon ? 225 : 154);
    const addon50 = is50Active ? 50 : 0;
    if (is60Active) {
      const newTags = selectedChannelTags.filter((ch) => !PRESET_60_CHANNELS.includes(ch));
      const newBill = base + addon50;
      updateDraft(newTags, hasLocalAddon, newBill);
    } else {
      // Remove all 100 HD channels (SONY SPORTS TEN 1 HD, SONY SPORTS TEN 2 HD)
      let newTags = selectedChannelTags.filter((ch) => !PRESET_100_CHANNELS.includes(ch));
      for (const ch of PRESET_60_CHANNELS) {
        if (!newTags.includes(ch)) newTags.push(ch);
      }
      const newBill = base + addon50 + 60;
      updateDraft(newTags, hasLocalAddon, newBill);
      setSaveSuccessMessage('Rs. 60 Sports SD Addon thlan a ni e. SAVE button hmet la a in-save ang.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  // 5. Rs. 100 Sports HD Addon
  // If 60 is active, clicking 100 REPLACES 60 completely!
  const handleTogglePreset100 = () => {
    const base = is350Active ? 350 : is300Active ? 300 : (hasLocalAddon ? 225 : 154);
    const addon50 = is50Active ? 50 : 0;
    if (is100Active) {
      const newTags = selectedChannelTags.filter((ch) => !PRESET_100_CHANNELS.includes(ch));
      const newBill = base + addon50;
      updateDraft(newTags, hasLocalAddon, newBill);
    } else {
      // Remove all 60 SD channels (SONY SPORTS TEN 1, SONY SPORTS TEN 2)
      let newTags = selectedChannelTags.filter((ch) => !PRESET_60_CHANNELS.includes(ch));
      for (const ch of PRESET_100_CHANNELS) {
        if (!newTags.includes(ch)) newTags.push(ch);
      }
      const newBill = base + addon50 + 100;
      updateDraft(newTags, hasLocalAddon, newBill);
      setSaveSuccessMessage('Rs. 100 Sports HD Addon thlan a ni e. SAVE button hmet la a in-save ang.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  // 6. Direct Combo: Rs. 450 Plan (350 HD + 100 Sports HD)
  // Replaces 300 SD and 60 SD completely!
  const handleSetPlan450 = () => {
    let newTags = selectedChannelTags.filter(
      (ch) =>
        ch !== 'Star Sports Select 1' &&
        ch !== 'Star Sports Select 2' &&
        !PRESET_60_CHANNELS.includes(ch)
    );
    for (const ch of PRESET_350_CHANNELS) {
      if (!newTags.includes(ch)) newTags.push(ch);
    }
    for (const ch of PRESET_100_CHANNELS) {
      if (!newTags.includes(ch)) newTags.push(ch);
    }
    const newBill = 450 + (is50Active ? 50 : 0);
    updateDraft(newTags, true, newBill);
    setSaveSuccessMessage('Rs. 450 Plan (350 HD + 100 Sports HD) thlan fel a ni e! SAVE (BST + Local & Channels) button hmet la a in-save ang.');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // 7. Direct Combo: Rs. 360 Plan (300 SD + 60 Sports SD)
  // Replaces 350 HD and 100 HD completely!
  const handleSetPlan360 = () => {
    let newTags = selectedChannelTags.filter(
      (ch) =>
        ch !== 'SS Select HD-1' &&
        ch !== 'SS Select HD-2' &&
        ch !== 'Star Sports HD-1' &&
        !PRESET_100_CHANNELS.includes(ch)
    );
    for (const ch of PRESET_300_CHANNELS) {
      if (!newTags.includes(ch)) newTags.push(ch);
    }
    for (const ch of PRESET_60_CHANNELS) {
      if (!newTags.includes(ch)) newTags.push(ch);
    }
    const newBill = 360 + (is50Active ? 50 : 0);
    updateDraft(newTags, true, newBill);
    setSaveSuccessMessage('Rs. 360 Plan (300 SD + 60 Sports SD) thlan fel a ni e! SAVE (BST + Local & Channels) button hmet la a in-save ang.');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Apply current plan & channel selection to ALL customers (Excel-ah a rualin lut vek tur)
  const handleApplyCurrentPlanToAll = () => {
    if (!onApplyChannelsToAll) return;
    const parsedCustom = parseFloat(customBillInput);
    const billToApply =
      currentPresetBill > 0
        ? currentPresetBill
        : !isNaN(parsedCustom) && parsedCustom > 0
        ? Number(parsedCustom.toFixed(2))
        : undefined;
    onApplyChannelsToAll(selectedChannelTags, hasLocalAddon, 'Preset Pack', billToApply);
    setSaveSuccessMessage(`Subscribers zawng zawng (${customers.length})-ah he plan hi a rualin dah fel a ni e! Excel download tan save thar vek a inpeih.`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Check if draft selections or custom bill have unsaved changes compared to customer's saved state
  const hasUnsavedChanges = useMemo(() => {
    if (!currentCustomer) return false;
    const savedLocal = currentCustomer.hasLocalAddon !== false;
    if (savedLocal !== hasLocalAddon) return true;

    const savedChannels = [...currentCustomer.selectedChannels].sort();
    const currentChannels = [...selectedChannelTags].sort();
    if (savedChannels.length !== currentChannels.length) return true;
    for (let i = 0; i < savedChannels.length; i++) {
      if (savedChannels[i] !== currentChannels[i]) return true;
    }

    const savedBill =
      currentCustomer.customBillAmount !== undefined && currentCustomer.customBillAmount > 0
        ? currentCustomer.customBillAmount
        : undefined;
    const pInput = parseFloat(customBillInput);
    const draftBill = !isNaN(pInput) && pInput > 0 ? Number(pInput.toFixed(2)) : undefined;
    if (savedBill !== draftBill) return true;

    return false;
  }, [currentCustomer, hasLocalAddon, selectedChannelTags, customBillInput]);

  // Revert draft changes back to the customer's active saved state
  const handleRevert = () => {
    if (!currentCustomer) return;
    setSelectedChannelTags([...currentCustomer.selectedChannels]);
    setHasLocalAddon(currentCustomer.hasLocalAddon !== false);
    setCustomBillInput(
      currentCustomer.customBillAmount !== undefined && currentCustomer.customBillAmount > 0
        ? currentCustomer.customBillAmount.toString()
        : ''
    );
    setSaveSuccessMessage('Channel leh bill thlan chu saved state-ah dah let leh a ni e.');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Save changes explicitly ONLY when clicking the SAVE button
  const handleSave = () => {
    if (!currentCustomer) return;
    const parsedBill = parseFloat(customBillInput);
    const billToSave = !isNaN(parsedBill) && parsedBill > 0 ? Number(parsedBill.toFixed(2)) : undefined;
    onSaveCustomerChannels(currentCustomer.id, selectedChannelTags, hasLocalAddon, billToSave);
    const addonText = hasLocalAddon ? 'BST + Local Add-on' : 'BST chauh';
    const billText = billToSave ? ` • Bill: Rs. ${billToSave.toFixed(2)}` : '';
    setSaveSuccessMessage(`"${currentCustomer.name}" tan ${addonText} & channels (${selectedChannelTags.length})${billText} hlawhtling takin save a ni e!`);
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4500);
  };

  // Price estimate for current selection using official LPS split formula:
  // - BST mandatory: Rs. 154 (LCO Rs. 78.60 / MSO Rs. 75.40)
  // - Local: Rs. 71 (LCO Rs. 36.20 / MSO Rs. 34.80)
  // - A-la-carte channels: 8.47% LCO share / 91.53% MSO
  const priceEstimate = useMemo(() => {
    const channelMap = getChannelPriceMap(availableChannels);
    const pricing = calculateCustomerPricing(
      selectedChannelTags,
      hasLocalAddon,
      bstPrice,
      localAddonPrice,
      ALACARTE_LCO_COMMISSION_PERCENT,
      channelMap
    );

    return {
      total: pricing.price,
      lcoHlawh: pricing.lcoHlawh,
      lcoSen: pricing.lcoSen,
      alacarteTotal: pricing.alacarteTotal,
      alacarteShare: pricing.alacarteLcoShare,
      bstPrice: pricing.bstPrice,
      localPrice: pricing.localPrice,
      hasLocalAddon,
      bstLcoShare: pricing.bstLcoShare,
      bstMsoCut: pricing.bstMsoCut,
      localLcoShare: pricing.localLcoShare,
      localMsoCut: pricing.localMsoCut,
      alacarteLcoShare: pricing.alacarteLcoShare,
      alacarteMsoCut: pricing.alacarteMsoCut,
    };
  }, [selectedChannelTags, availableChannels, bstPrice, localAddonPrice, hasLocalAddon]);

  // Margin computation based on Customer Bill (Edittext):
  // User specification:
  // "MSO ah kan chhun luh tur hi 80% a nia, LCO in 20 % kan chang zawng ang. mahse hei hi khi mi box atan chauh tur. Apps pumpui atang a nilo."
  // When a Customer Bill is specified in this box:
  // - MSO In Cut = 80% of Customer Bill
  // - LCO Hlawh (LCO Chan) = 20% of Customer Bill
  // When custom bill is empty (auto): standard BST + Ala-carte formula is used.
  const marginAnalysis = useMemo(() => {
    const parsedBill = parseFloat(customBillInput);
    const hasCustom = !isNaN(parsedBill) && parsedBill > 0;
    const effectiveBill = hasCustom ? parsedBill : priceEstimate.total;

    // Base package channels MSO cost from actual ala-carte & packages selected
    const channelBaseMsoCost = priceEstimate.lcoSen;

    // Overall total LCO Sen (the amount paid to MSO) is fixed by the selected components
    const msoCut = priceEstimate.lcoSen;

    // LCO Hlawh is the remainder (Bill - MSO Cut)
    const actualLcoProfit = Number((effectiveBill - msoCut).toFixed(2));

    const lcoMarginPercent = effectiveBill > 0 ? (actualLcoProfit / effectiveBill) * 100 : 0;
    const msoCutPercent = effectiveBill > 0 ? (msoCut / effectiveBill) * 100 : 0;

    // 1. Loss: Customer Bill < Channel package MSO cost
    const isLoss = effectiveBill < channelBaseMsoCost;
    const lossAmount = isLoss ? channelBaseMsoCost - effectiveBill : 0;

    // 2. Channel MSO cost exceeds 80% MSO cut
    const isChannelCostExceedsCut = hasCustom && channelBaseMsoCost > msoCut;
    const channelDeficit = hasCustom ? channelBaseMsoCost - msoCut : 0;

    // 3. LCO share drops below 20%
    const isBelow20 = !isLoss && lcoMarginPercent < 20;

    // Difference from standard rate
    const diffFromRate = effectiveBill - priceEstimate.total;
    const diffPercent = priceEstimate.total > 0 ? (Math.abs(diffFromRate) / priceEstimate.total) * 100 : 0;

    return {
      hasCustom,
      effectiveBill,
      msoCut,
      actualLcoProfit,
      lcoMarginPercent,
      msoCutPercent,
      channelBaseMsoCost,
      isLoss,
      lossAmount,
      isChannelCostExceedsCut,
      channelDeficit,
      isBelow20,
      diffFromRate,
      diffPercent,
    };
  }, [customBillInput, priceEstimate.total, priceEstimate.lcoHlawh, priceEstimate.lcoSen]);

  return (
    <div className="space-y-4">
      {/* 1. Hming emaw Code zawng rawh */}
      <div>
        <label
          htmlFor="customer-search-input"
          className="block text-sm font-semibold text-gray-800 mb-1.5"
        >
          Hming emaw Code zawng rawh
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="customer-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="customer name, 068AZ0292, 210154..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Customer thlang rawh */}
      <div>
        <label
          htmlFor="customer-select"
          className="block text-sm font-semibold text-gray-800 mb-1.5"
        >
          Customer thlang rawh ({filteredCustomers.length} : Total Customers)
        </label>
        <div className="relative">
          <select
            id="customer-select"
            value={selectedCustomerId || ''}
            onChange={(e) => onSelectCustomer(e.target.value)}
            className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs cursor-pointer"
          >
            <option value="" disabled>
              -- Customer thlang rawh --
            </option>
            {filteredCustomers.map((c) => {
              const channelCountText = c.selectedChannels.length > 0
                ? ` (${c.selectedChannels.length} channels)`
                : '';
              return (
                <option key={c.id} value={c.id}>
                  {c.name} | {c.subscriberCode} | STB:{c.stbNo.slice(-6) || c.stbNo}{channelCountText}
                </option>
              );
            })}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {currentCustomer && (
        <>
          {/* 3. A hmaa save tawh */}
          <div className="bg-blue-50/90 border border-blue-200/90 rounded-xl p-3.5 text-sm text-blue-950 flex flex-col gap-2.5 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="text-blue-600 mt-0.5 shrink-0">
                <Tv2 className="w-5 h-5" />
              </div>
              <div className="leading-relaxed flex-1">
                <span className="font-bold text-blue-900">Actived channel: </span>
                <span className="font-extrabold text-blue-950">
                  {currentCustomer.hasLocalAddon ? 'BST + Local Add-on' : 'BST chauh (Local tello)'}
                </span>
                {currentCustomer.selectedChannels.length > 0 ? (
                  <span className="text-blue-950">
                    {' '}+ A-la-carte ({currentCustomer.selectedChannels.length}):{' '}
                    <strong className="text-blue-950 font-extrabold">{currentCustomer.selectedChannels.join(', ')}</strong>
                  </span>
                ) : (
                  <span className="italic text-blue-700 font-medium"> (a-la-carte channel thlan ala awm lo)</span>
                )}
                {currentCustomer.customBillAmount !== undefined && currentCustomer.customBillAmount > 0 && (
                  <span className="ml-2 font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded text-xs">
                    Saved Bill: Rs. {currentCustomer.customBillAmount.toFixed(0)}
                  </span>
                )}
              </div>
            </div>

            {/* Unsaved Draft Status & Warning Bar */}
            {hasUnsavedChanges && (
              <div className="pt-2 border-t border-blue-200/70 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 font-extrabold rounded-lg flex items-center gap-1.5 shadow-2xs animate-pulse">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Thlan thar mek (A la in-save lo): <strong>{selectedChannelTags.length} channels</strong>
                    {marginAnalysis.hasCustom ? ` • Bill: Rs. ${marginAnalysis.effectiveBill.toFixed(0)}` : ''}
                    {' '}— SAVE button hmet la a in-save ang.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleRevert}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                  title="Thlan thar zawng zawng paih a, customer active state-ah let leh rawh"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Dah let leh rawh (Revert)</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Price Preview & Customer Bill for this Customer */}
          <div>
            <div className="text-xs sm:text-[13px] text-slate-800 flex flex-wrap items-center gap-x-5 gap-y-3 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
              <span title="BST Rs. 154 (LCO Share: Rs 78.60 / 51.04%)" className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">BST (Mandatory):</span>
                <strong className="text-slate-950 font-bold font-mono text-sm">Rs {bstPrice.toFixed(2)}</strong>
              </span>

              <span title="Local addon: Rs. 71 (LCO Share: Rs 36.20 / 50.99%)" className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Local:</span>
                <strong className={`font-mono text-sm ${hasLocalAddon ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-medium'}`}>
                  {hasLocalAddon ? `+Rs ${localAddonPrice.toFixed(2)}` : 'Rs 0.00 (Off)'}
                </strong>
              </span>

              <span title={`Alakarte Rate Pangngai: Rs ${priceEstimate.alacarteTotal.toFixed(2)} | LCO Chan (8.47%): Rs ${priceEstimate.alacarteLcoShare.toFixed(2)} | In Cut (91.53%): Rs ${priceEstimate.alacarteMsoCut.toFixed(2)}`} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-600 font-semibold">AlaCarte ({selectedChannelTags.length}):</span>
                <strong className="text-slate-950 font-bold font-mono text-sm">+Rs {priceEstimate.alacarteTotal.toFixed(2)}</strong>
                {selectedChannelTags.length > 0 && (
                  <span className="text-xs text-emerald-800 font-bold bg-emerald-100/70 border border-emerald-300/80 px-2 py-0.5 rounded-md">
                    LCO 8.47%: Rs {priceEstimate.alacarteLcoShare.toFixed(2)} &bull; Cut 91.53%: Rs {priceEstimate.alacarteMsoCut.toFixed(2)}
                  </span>
                )}
              </span>

              <span className="text-slate-900 font-semibold border-l pl-3 border-slate-300 flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Total Price:</span>
                <strong className="text-blue-700 font-black text-sm sm:text-base font-mono">Rs {priceEstimate.total.toFixed(2)}</strong>
              </span>

              <span title="LCO Share: BST Rs 78.60 + Local Rs 36.20 + 8.47% Ala-carte" className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">LCO Hlawh:</span>
                <strong className="text-emerald-700 font-black text-sm sm:text-base font-mono">Rs {priceEstimate.lcoHlawh.toFixed(2)}</strong>
                <span className="text-xs text-slate-500 font-medium">
                  ({((priceEstimate.lcoHlawh / priceEstimate.total) * 100).toFixed(1)}%)
                </span>
              </span>

              {marginAnalysis.hasCustom && (
                <span title="Customer Bill atanga i hlawh tak tak tur (Bill - MSO Cut)" className="flex items-center gap-1.5 border-l pl-3 border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-lg border">
                  <span className="text-emerald-800 font-bold">Net Profit:</span>
                  <strong className={`font-black text-sm sm:text-base font-mono ${marginAnalysis.isLoss ? 'text-red-600' : 'text-emerald-700'}`}>
                    Rs {marginAnalysis.actualLcoProfit.toFixed(2)}
                  </strong>
                </span>
              )}

              <span title={marginAnalysis.hasCustom ? 'MSO 80% In Cut (Customer Bill atangin)' : 'MSO Cut: BST Rs 75.40 + Local Rs 34.80 + 91.53% Ala-carte'} className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">LCO Sen (In Cut):</span>
                <strong className="text-slate-900 font-black text-sm sm:text-base font-mono">Rs {marginAnalysis.msoCut.toFixed(2)}</strong>
                <span className="text-xs text-slate-500 font-medium">
                  ({marginAnalysis.msoCutPercent.toFixed(1)}%)
                </span>
              </span>

              {/* Customer Bill Box (Green by default, Red on warning/alert) */}
              <div className="flex flex-col items-start sm:items-center ml-auto">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 shadow-sm transition-all ${
                    marginAnalysis.isLoss || marginAnalysis.isBelow20 || marginAnalysis.isChannelCostExceedsCut
                      ? 'bg-red-600 border-red-700 ring-2 ring-red-300 text-white animate-pulse'
                      : 'bg-[#28a745] border-emerald-700 text-white'
                  }`}
                >
                  <label
                    htmlFor="customer-bill-edittext"
                    className="text-xs sm:text-[13px] font-extrabold whitespace-nowrap flex items-center gap-1 text-white"
                  >
                    <span>Customer Bill:</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="text-xs sm:text-sm font-black mr-1 text-white/90">Rs.</span>
                    <input
                      id="customer-bill-edittext"
                      type="number"
                      step="1"
                      min="0"
                      value={customBillInput}
                      onChange={(e) => {
                        setCustomBillInput(e.target.value);
                      }}
                      placeholder={priceEstimate.total.toFixed(0)}
                      className={`w-24 px-2 py-1 text-sm font-black bg-white rounded-md focus:outline-none focus:ring-2 font-mono text-center shadow-inner ${
                        marginAnalysis.isLoss || marginAnalysis.isBelow20 || marginAnalysis.isChannelCostExceedsCut
                          ? 'text-red-950 border-2 border-red-300 focus:ring-red-400'
                          : 'text-emerald-950 border-2 border-emerald-300 focus:ring-emerald-400'
                      }`}
                      title="Customer hnen atanga bill khawn zat tur (e.g. 350, 400). A hnuai lama SAVE button hmeh hunah chauh a in-save ang."
                    />
                  </div>
                  {customBillInput ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomBillInput('');
                      }}
                      title="Clear (Hmang rawh calculated total)"
                      className="text-xs font-black px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/30 text-white cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  ) : (
                    <span className="text-[11px] text-white/80 font-semibold italic">auto</span>
                  )}
                </div>
                <span
                  className={`text-xs font-extrabold mt-1 px-1 tracking-tight flex items-center gap-1 ${
                    marginAnalysis.isLoss || marginAnalysis.isBelow20 || marginAnalysis.isChannelCostExceedsCut
                      ? 'text-red-700'
                      : 'text-emerald-800'
                  }`}
                >
                  {marginAnalysis.isLoss || marginAnalysis.isBelow20 || marginAnalysis.isChannelCostExceedsCut
                    ? '⚠️ Fimkhur: MSO in cut a sang lutuk!'
                    : 'I bill khawn zat dik tak dah rawh'}
                </span>
              </div>
            </div>

            {/* 1. HLOH TUR ALERT SEN (Full Red Pulse Banner) */}
            {marginAnalysis.isLoss && (
              <div className="mt-2.5 p-3 rounded-lg bg-red-600 text-white border-2 border-red-700 shadow-md flex items-start gap-3 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-300" />
                <div className="flex-1 text-xs">
                  <div className="font-extrabold text-sm flex items-center justify-between gap-2 flex-wrap">
                    <span>HLOH TUR ALERT: MSO IN CUT A SANG LUTUK!</span>
                    <span className="bg-white text-red-700 px-2.5 py-0.5 rounded text-xs font-black">
                      LCO Hloh (Loss): -Rs. {marginAnalysis.lossAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-red-100 mt-1 leading-relaxed">
                    Customer hnen atanga bill khawn zat <strong>Rs. {marginAnalysis.effectiveBill.toFixed(2)}</strong> hi Channel thlan zawng zawng MSO chhun luh ngai zat (In Cut) <strong>Rs. {marginAnalysis.channelBaseMsoCost.toFixed(2)}</strong> aiin a tlem zawk! Channel thlan teuh a nih avangin LCO tan hloh (Loss) a thlen dawn e. Channel thlan ti tlem rawh emaw Customer Bill khawn zat hi tisang rawh.
                  </p>
                </div>
              </div>
            )}

            {/* 2. ALERT SEN: MSO IN CUT A SANG / FIMKHUR RAWH */}
            {!marginAnalysis.isLoss && (marginAnalysis.isBelow20) && (
              <div className="mt-2.5 p-3 rounded-lg bg-red-50 border-2 border-red-500 text-red-950 shadow-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-sm text-red-900 flex items-center justify-between gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span>ALERT: LCO HLAWH A TLEM / FIMKHUR RAWH!</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white px-2.5 py-0.5 rounded font-black text-xs">
                        LCO Chan: {marginAnalysis.lcoMarginPercent.toFixed(1)}% (Rs. {marginAnalysis.actualLcoProfit.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <p className="text-red-950 mt-1 leading-relaxed">
                    <strong>Fimkhur a ngai:</strong> Channel thlan teuh teuh a nih avangin Package MSO Cost pangngai (<strong>Rs. {marginAnalysis.channelBaseMsoCost.toFixed(2)}</strong>) hi Customer Bill (<strong>Rs. {marginAnalysis.effectiveBill.toFixed(2)}</strong>) nen a inhnaih tawh hle a, i hlawh a tlem tawh a ni.
                  </p>
                </div>
              </div>
            )}

            {/* 3. LCO & MSO Status Banner when Safe */}
            {marginAnalysis.hasCustom && !marginAnalysis.isLoss && !marginAnalysis.isBelow20 && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-[13px] shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Bill Chhut Dan (Component Based):
                  </span>
                  <span>
                    Bill Khawn: <strong className="text-slate-950 font-mono font-bold">Rs. {marginAnalysis.effectiveBill.toFixed(2)}</strong>
                  </span>
                  <span className="text-emerald-400">&bull;</span>
                  <span>
                    MSO Cut (Sen): <strong className="text-blue-950 font-mono font-black">Rs. {marginAnalysis.msoCut.toFixed(2)}</strong>
                  </span>
                  <span className="text-emerald-400">&bull;</span>
                  <span>
                    Net Profit: <strong className="text-emerald-800 font-mono font-black">Rs. {marginAnalysis.actualLcoProfit.toFixed(2)}</strong>
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-[11px] font-bold text-emerald-900">
                   <span>Standard Hlawh: Rs. {priceEstimate.lcoHlawh.toFixed(2)}</span>
                   <span className="bg-emerald-200/90 text-emerald-950 px-3 py-1 rounded-full border border-emerald-300/80">
                      ✓ Component Share hmanga chhut
                   </span>
                </div>
              </div>
            )}

            {/* Standard Package Info when no custom bill */}
            {!marginAnalysis.hasCustom && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-between gap-2 text-xs sm:text-[13px]">
                <div className="flex items-center gap-2 flex-wrap font-medium">
                  <span className="font-bold text-slate-900">Standard Package Rate:</span>
                  <span>BST Rs 154 (LCO: Rs 78.60 / MSO: Rs 75.40)</span>
                  {hasLocalAddon && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span>Local Rs 71 (LCO: Rs 36.20 / MSO: Rs 34.80)</span>
                    </>
                  )}
                  {priceEstimate.alacartePrice > 0 && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span>A-la carte (LCO: 8.47% / MSO: 91.53%)</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-slate-500 italic">Bill zat thlak duh chuan Customer Bill box-ah chhu rawh</span>
              </div>
            )}
          </div>

          {/* 5. A-la-carte Channel thlan tawh te: (Tags Box) - Directly above channel list picker */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-900">
                A-la-carte Channel thlan tawh te:
              </label>
              <span className="text-xs text-slate-600 font-semibold">
                Rate Pangngai &bull; LCO Share (8.47%) &bull; In Cut Zat (91.53%)
              </span>
            </div>

            {/* Tags Box */}
            <div className="min-h-[52px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl flex flex-wrap items-center gap-2 relative">
              {selectedChannelTags.length === 0 ? (
                <span className="text-sm text-slate-400 italic px-1 font-medium">
                  A-la-carte channel thlan a awm lo. A hnuai atang hian channel i dah belh thei...
                </span>
              ) : (
                selectedChannelTags.map((name) => {
                  const chKey = name.toLowerCase().trim();
                  const chPrice = channelPriceMap.get(chKey) ?? channelPriceMap.get(normalizeKey(name)) ?? 0;
                  const chLco = Number((chPrice * 0.0847).toFixed(2));
                  const chMso = Number((chPrice - chLco).toFixed(2));

                  return (
                    <span
                      key={name}
                      title={`Rate Pangngai: Rs ${chPrice.toFixed(2)} | LCO (8.47%): Rs ${chLco.toFixed(2)} | In Cut (91.53%): Rs ${chMso.toFixed(2)}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold bg-[#6f42c1] hover:bg-[#5a32a3] text-white shadow-2xs transition-all"
                    >
                      <span className="font-bold">{name}</span>
                      <span className="text-xs font-mono bg-purple-950/70 px-1.5 py-0.5 rounded text-purple-100 font-bold">
                        Rs {chPrice.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-emerald-200 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded hidden sm:inline" title={`8.47% LCO Chan: Rs ${chLco.toFixed(2)} | 91.53% In Cut: Rs ${chMso.toFixed(2)}`}>
                        (LCO: Rs {chLco.toFixed(2)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(name)}
                        className="hover:text-purple-200 hover:bg-white/20 p-0.5 rounded transition-colors cursor-pointer ml-0.5"
                        title={`Remove ${name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })
              )}

              {selectedChannelTags.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllChannels}
                  title="Clear all selected channels"
                  className="ml-auto text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

            {/* Channel Selection Accordion / Picker */}
            <div className="mt-3 border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200/80 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  Channel list atanga thlan belhna: ({availableChannels.length} hi A-la-carte channels awm zat a ni.)
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    isChannelDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isChannelDropdownOpen && (
                <div className="p-3 border-t border-gray-200 space-y-3">
                  {/* Quick Preset Buttons (Rs. 300, Rs. 350, +, Rs. 50, Rs. 60, Rs. 100, Rs. 360, Rs. 450) */}
                  <div className="pb-3 border-b border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wide">
                          Quick Plan Presets:
                        </span>
                        {currentPresetBill > 0 && (
                          <span className="text-xs sm:text-[13px] font-black text-emerald-900 bg-emerald-100/90 border border-emerald-400 px-2.5 py-0.5 rounded-lg shadow-2xs font-mono">
                            Plan Bill: Rs. {currentPresetBill}
                          </span>
                        )}
                      </div>

                      {/* Apply to All Customers button */}
                      {onApplyChannelsToAll && customers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleApplyCurrentPlanToAll}
                          title="Subscribers zawng zawngah he plan hi a rualin dah nghal rawh"
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <span>✓</span>
                          <span>Apply to All Customers ({customers.length})</span>
                        </button>
                      )}
                    </div>

                    {/* Direct channel price buttons */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {/* Rs. 300 SD Pack */}
                      <button
                        type="button"
                        onClick={handleTogglePreset300}
                        title="Rs. 300 SD Pack: BST + Local + Star Sports Select 1 & 2 + Cartoon Network"
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                          is300Active
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-300 text-amber-900 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                            is300Active
                              ? 'bg-white border-emerald-500 text-red-600'
                              : 'bg-white border-slate-400 text-transparent'
                          }`}
                        >
                          {is300Active && <span className="text-red-600 font-black text-xs leading-none">✓</span>}
                        </span>
                        <span className={is300Active ? 'text-emerald-800 font-black font-mono' : 'text-amber-900 font-bold font-mono'}>
                          Rs. 300
                        </span>
                      </button>

                      {/* Rs. 350 HD Pack */}
                      <button
                        type="button"
                        onClick={handleTogglePreset350}
                        title="Rs. 350 HD Pack: BST + Local + SS Select HD 1 & 2 + Star Sports HD-1 + Cartoon Network"
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                          is350Active
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-300 text-amber-900 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                            is350Active
                              ? 'bg-white border-emerald-500 text-red-600'
                              : 'bg-white border-slate-400 text-transparent'
                          }`}
                        >
                          {is350Active && <span className="text-red-600 font-black text-xs leading-none">✓</span>}
                        </span>
                        <span className={is350Active ? 'text-emerald-800 font-black font-mono' : 'text-amber-900 font-bold font-mono'}>
                          Rs. 350
                        </span>
                      </button>

                      {/* Plus sign separator */}
                      <span className="text-base font-black text-slate-900 px-1 select-none shrink-0">+</span>

                      {/* Rs. 50 Addon */}
                      <button
                        type="button"
                        onClick={handleTogglePreset50}
                        title="Rs. 50 Addon: Nick Jr, Movies Now, MNX, NG Wild, SM SELECT, VH1"
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                          is50Active
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-300 text-amber-900 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                            is50Active
                              ? 'bg-white border-emerald-500 text-red-600'
                              : 'bg-white border-slate-400 text-transparent'
                          }`}
                        >
                          {is50Active && <span className="text-red-600 font-black text-xs leading-none">✓</span>}
                        </span>
                        <span className={is50Active ? 'text-emerald-800 font-black font-mono' : 'text-amber-900 font-bold font-mono'}>
                          Rs. 50
                        </span>
                      </button>

                      {/* Rs. 60 Sports SD Addon */}
                      <button
                        type="button"
                        onClick={handleTogglePreset60}
                        title="Rs. 60 Sports SD: Sony Sports Ten 1 & 2 SD"
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                          is60Active
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-300 text-amber-900 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                            is60Active
                              ? 'bg-white border-emerald-500 text-red-600'
                              : 'bg-white border-slate-400 text-transparent'
                          }`}
                        >
                          {is60Active && <span className="text-red-600 font-black text-xs leading-none">✓</span>}
                        </span>
                        <span className={is60Active ? 'text-emerald-800 font-black font-mono' : 'text-amber-900 font-bold font-mono'}>
                          Rs. 60
                        </span>
                      </button>

                      {/* Rs. 100 Sports HD Addon */}
                      <button
                        type="button"
                        onClick={handleTogglePreset100}
                        title="Rs. 100 Sports HD: Sony Sports Ten 1 & 2 HD"
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                          is100Active
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-300 text-amber-900 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                            is100Active
                              ? 'bg-white border-emerald-500 text-red-600'
                              : 'bg-white border-slate-400 text-transparent'
                          }`}
                        >
                          {is100Active && <span className="text-red-600 font-black text-xs leading-none">✓</span>}
                        </span>
                        <span className={is100Active ? 'text-emerald-800 font-black font-mono' : 'text-amber-900 font-bold font-mono'}>
                          Rs. 100
                        </span>
                      </button>

                      {/* Divider */}
                      <span className="text-slate-300 mx-1 hidden sm:inline">|</span>

                      {/* Rs. 360 Plan */}
                      <button
                        type="button"
                        onClick={handleSetPlan360}
                        title="Rs. 360 Plan: 300 SD Pack + 60 Sports SD"
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                          isCombo360Active
                            ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 font-black'
                            : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                        }`}
                      >
                        <span>{isCombo360Active ? '✓' : '⚡'}</span>
                        <span className="font-mono">Rs. 360</span>
                      </button>

                      {/* Rs. 450 Plan */}
                      <button
                        type="button"
                        onClick={handleSetPlan450}
                        title="Rs. 450 Plan: 350 HD Pack + 100 Sports HD"
                        className={`px-3 py-1.5 rounded-lg border text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-2xs ${
                          isCombo450Active
                            ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 font-black'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                        }`}
                      >
                        <span>{isCombo450Active ? '✓' : '🌟'}</span>
                        <span className="font-mono">Rs. 450</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Pills & Channel Search */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={channelSearchTerm}
                        onChange={(e) => setChannelSearchTerm(e.target.value)}
                        placeholder="Channel search (e.g. SS Select, Star Sports, Ten 1)..."
                        className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs">
                      {categories.map((cat) => {
                        const isSelected = selectedCategory === cat;

                        if (cat === 'Local') {
                          // Local category tab:
                          // "tick chuan Local tab a hring ang"
                          const isLocalActive = hasLocalAddon;
                          const isSelected = selectedCategory === 'Local';

                          return (
                            <button
                              key="Local"
                              type="button"
                              onClick={() => setSelectedCategory('Local')}
                              title="Local Channels (LPS 1 - LPS 12)"
                              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                                isLocalActive
                                  ? isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 ring-offset-1'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-sm flex items-center justify-center text-xs font-black border transition-colors ${
                                  isLocalActive
                                    ? 'bg-white text-emerald-700 border-white'
                                    : 'bg-white text-transparent border-slate-400'
                                }`}
                              >
                                {isLocalActive ? '✓' : ''}
                              </span>
                              <span>Local</span>
                              {isLocalActive && (
                                <span className="text-xs opacity-90 font-medium font-mono">(Rs 71)</span>
                              )}
                            </button>
                          );
                        }

                        if (cat === 'SD ADD ON') {
                          const isSelected = selectedCategory === 'SD ADD ON';
                          return (
                            <button
                              key="SD ADD ON"
                              type="button"
                              onClick={() => setSelectedCategory('SD ADD ON')}
                              title={`SD ADD ON (${SD_ADDON_PRESET.length} Channels • Untick theih vek in)`}
                              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                                isAllSdAddonSelected
                                  ? isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 ring-offset-1'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : selectedSdAddonCount > 0
                                  ? isSelected
                                    ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-400 ring-offset-1'
                                    : 'bg-blue-100 text-blue-950 border border-blue-300 hover:bg-blue-200'
                                  : isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-sm flex items-center justify-center text-xs font-black border transition-colors ${
                                  isAllSdAddonSelected
                                    ? 'bg-white text-emerald-700 border-white'
                                    : selectedSdAddonCount > 0
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-transparent border-slate-400'
                                }`}
                              >
                                {isAllSdAddonSelected ? '✓' : selectedSdAddonCount > 0 ? selectedSdAddonCount : ''}
                              </span>
                              <span>SD ADD ON</span>
                              {selectedSdAddonCount > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                    isAllSdAddonSelected
                                      ? isSelected
                                        ? 'bg-white text-emerald-800'
                                        : 'bg-emerald-100 text-emerald-900'
                                      : isSelected
                                      ? 'bg-white text-blue-800'
                                      : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  {selectedSdAddonCount}/{SD_ADDON_PRESET.length}
                                </span>
                              )}
                            </button>
                          );
                        }

                        if (cat === 'HD ADD ON') {
                          const isSelected = selectedCategory === 'HD ADD ON';
                          return (
                            <button
                              key="HD ADD ON"
                              type="button"
                              onClick={() => setSelectedCategory('HD ADD ON')}
                              title={`HD ADD ON (${HD_ADDON_PRESET.length} Channels • Untick theih vek in)`}
                              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                                isAllHdAddonSelected
                                  ? isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 ring-offset-1'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : selectedHdAddonCount > 0
                                  ? isSelected
                                    ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-400 ring-offset-1'
                                    : 'bg-blue-100 text-blue-950 border border-blue-300 hover:bg-blue-200'
                                  : isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-sm flex items-center justify-center text-xs font-black border transition-colors ${
                                  isAllHdAddonSelected
                                    ? 'bg-white text-emerald-700 border-white'
                                    : selectedHdAddonCount > 0
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-transparent border-slate-400'
                                }`}
                              >
                                {isAllHdAddonSelected ? '✓' : selectedHdAddonCount > 0 ? selectedHdAddonCount : ''}
                              </span>
                              <span>HD ADD ON</span>
                              {selectedHdAddonCount > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                    isAllHdAddonSelected
                                      ? isSelected
                                        ? 'bg-white text-emerald-800'
                                        : 'bg-emerald-100 text-emerald-900'
                                      : isSelected
                                      ? 'bg-white text-blue-800'
                                      : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  {selectedHdAddonCount}/{HD_ADDON_PRESET.length}
                                </span>
                              )}
                            </button>
                          );
                        }

                        if (cat === 'Sports') {
                          const sportsSelectedCount = allSportsChannels.filter((c) =>
                            selectedChannelTags.includes(c.name)
                          ).length;
                          return (
                            <button
                              key="Sports"
                              type="button"
                              onClick={() => setSelectedCategory('Sports')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                                isSelected
                                  ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-400 ring-offset-1'
                                  : sportsSelectedCount > 0
                                  ? 'bg-blue-100 text-blue-950 border border-blue-300 hover:bg-blue-200'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              <span>⚽ Sports</span>
                              {sportsSelectedCount > 0 && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                    isSelected ? 'bg-white text-blue-800' : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  {sportsSelectedCount}
                                </span>
                              )}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dedicated Quick Filter Bar with Filter Icon - ONLY inside Sports */}
                  {selectedCategory === 'Sports' && (
                    <div className="space-y-2.5">
                      {/* ADD ON SPORTS Card right inside Sports by the filter bar */}
                      <div className="p-3.5 rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 shadow-2xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="sports-addon-master-toggle"
                              checked={isAllSportsAddonSelected}
                              onChange={handleToggleAllSportsAddon}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="sports-addon-master-toggle" className="cursor-pointer">
                              <span className="font-black text-xs sm:text-sm text-blue-950 flex items-center gap-2 flex-wrap">
                                <span>⚡ ADD ON SPORTS</span>
                                <span className="text-xs font-bold bg-blue-200 text-blue-950 px-2 py-0.5 rounded-full border border-blue-300">
                                  4 SD Channels
                                </span>
                                {selectedSportsAddonCount > 0 && (
                                  <span className="text-xs font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                    {selectedSportsAddonCount}/4 thlan a ni
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-blue-800 font-medium block mt-0.5">
                                Untick theih vek in &bull; Rate: <strong className="font-mono font-black">Rs {sportsAddonTotalPrice.toFixed(2)}</strong> (LCO: Rs {(sportsAddonTotalPrice * 0.0847).toFixed(2)} &bull; Cut: Rs {(sportsAddonTotalPrice * 0.9153).toFixed(2)})
                              </span>
                            </label>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleToggleAllSportsAddon}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shadow-2xs ${
                                isAllSportsAddonSelected
                                  ? 'bg-blue-100 text-blue-900 hover:bg-blue-200 border border-blue-300'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isAllSportsAddonSelected ? 'Untick All (4)' : 'Select All (4)'}
                            </button>
                            <span className="text-xs text-slate-500 italic hidden md:inline font-medium">
                              (Export hunah channel pakhat tete in line khat ah a awm ang)
                            </span>
                          </div>
                        </div>

                        {/* The 4 channels in ADD ON SPORTS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                          {SPORTS_ADDON_PRESET.map((ch) => {
                            const isSelected = selectedChannelTags.includes(ch.name);
                            const lcoShare = Number((ch.price * 0.0847).toFixed(2));

                            return (
                              <div
                                key={ch.name}
                                onClick={() => handleToggleSingleChannel(ch.name)}
                                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-blue-100/90 border-blue-400 text-blue-950 font-medium shadow-2xs ring-1 ring-blue-300'
                                    : 'bg-white border-blue-200/80 hover:bg-blue-50/60 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // handled by parent onClick
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 pointer-events-none"
                                  />
                                  <div className="truncate">
                                    <div className="font-bold truncate text-xs sm:text-[13px] text-slate-900">{ch.name}</div>
                                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                                      <span className="font-bold text-slate-700">SD</span> &bull; LCO: Rs {lcoShare.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs sm:text-sm font-mono font-black text-blue-950 block">
                                    Rs {ch.price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="flex items-center gap-2.5 flex-wrap py-2.5 px-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-xl text-xs shadow-2xs">
                        <div className="flex items-center gap-2 text-blue-950 font-black shrink-0 mr-1">
                          <Filter className="w-4 h-4 text-blue-700" />
                          <span className="uppercase tracking-wider text-xs font-black">Filter:</span>
                        </div>

                        {/* ADD ON SPORTS Quick Filter Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSportsSubFilter(sportsSubFilter === 'addon_sports' ? 'all' : 'addon_sports');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                            sportsSubFilter === 'addon_sports'
                              ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300 ring-offset-1'
                              : 'bg-white text-blue-950 border-blue-300 hover:bg-blue-50'
                          }`}
                          title="ADD ON SPORTS (4 SD Channels) chauh thliar rawh"
                        >
                          <Filter className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>ADD ON SPORTS (4)</span>
                          {selectedSportsAddonCount > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                sportsSubFilter === 'addon_sports'
                                  ? 'bg-blue-200 text-blue-950'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {selectedSportsAddonCount}/4
                            </span>
                          )}
                        </button>

                        {/* Star Sports / Starsport Quick Filter Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSportsSubFilter(sportsSubFilter === 'starsports' ? 'all' : 'starsports');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                            sportsSubFilter === 'starsports'
                              ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300 ring-offset-1'
                              : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-50'
                          }`}
                          title="Star Sports / Starsport channel zawng thliar rawh"
                        >
                          <Filter className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Starsport ({starSportsChannels.length})</span>
                          {selectedStarCount > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                sportsSubFilter === 'starsports'
                                  ? 'bg-amber-200 text-amber-950'
                                  : 'bg-amber-600 text-white'
                              }`}
                            >
                              {selectedStarCount}
                            </span>
                          )}
                        </button>

                        {/* Sony Ten Quick Filter Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSportsSubFilter(sportsSubFilter === 'sony' ? 'all' : 'sony');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                            sportsSubFilter === 'sony'
                              ? 'bg-purple-700 text-white border-purple-800 ring-2 ring-purple-300 ring-offset-1'
                              : 'bg-white text-purple-950 border-purple-300 hover:bg-purple-50'
                          }`}
                          title="Sony Ten channel zawng thliar rawh"
                        >
                          <Filter className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>Sony Ten ({sonySportsChannels.length})</span>
                          {selectedSonyCount > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                sportsSubFilter === 'sony'
                                  ? 'bg-purple-200 text-purple-950'
                                  : 'bg-purple-700 text-white'
                              }`}
                            >
                              {selectedSonyCount}
                            </span>
                          )}
                        </button>

                        {/* HD Quality Filter Button for Sports */}
                        <button
                          type="button"
                          onClick={() => setQualityFilter(qualityFilter === 'hd' ? 'all' : 'hd')}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                            qualityFilter === 'hd'
                              ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300 ring-offset-1'
                              : 'bg-white text-indigo-950 border-indigo-300 hover:bg-indigo-50'
                          }`}
                          title="HD channel zawng chauh thliar rawh"
                        >
                          <span>💎 HD ({hdSportsChannels.length})</span>
                          {selectedSportsHdCount > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                qualityFilter === 'hd'
                                  ? 'bg-indigo-200 text-indigo-950'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              {selectedSportsHdCount}
                            </span>
                          )}
                        </button>

                        {/* SD Quality Filter Button for Sports */}
                        <button
                          type="button"
                          onClick={() => setQualityFilter(qualityFilter === 'sd' ? 'all' : 'sd')}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                            qualityFilter === 'sd'
                              ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-300 ring-offset-1'
                              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                          }`}
                          title="SD channel zawng chauh thliar rawh"
                        >
                          <span>📺 SD ({sdSportsChannels.length})</span>
                          {selectedSportsSdCount > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                qualityFilter === 'sd'
                                  ? 'bg-slate-200 text-slate-900'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {selectedSportsSdCount}
                            </span>
                          )}
                        </button>

                        {/* Others Sports Filter Button (Eurosport, Sports 18, etc.) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSportsSubFilter(sportsSubFilter === 'others' ? 'all' : 'others');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                            sportsSubFilter === 'others'
                              ? 'bg-slate-800 text-white border-slate-900 ring-2 ring-slate-400 ring-offset-1'
                              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                          }`}
                          title="Sports dang (Others) channel zawng thliar rawh"
                        >
                          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Others ({otherSportsChannels.length})</span>
                          {selectedOtherCount > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                                sportsSubFilter === 'others'
                                  ? 'bg-slate-200 text-slate-900'
                                  : 'bg-slate-800 text-white'
                              }`}
                            >
                              {selectedOtherCount}
                            </span>
                          )}
                        </button>

                        {/* Clear Filter button if any filter is active */}
                        {(sportsSubFilter !== 'all' || qualityFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSportsSubFilter('all');
                              setQualityFilter('all');
                            }}
                            className="ml-auto px-2.5 py-1 text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-extrabold underline cursor-pointer"
                          >
                            Filter clear rawh
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Channel Grid or Local Tab View */}
                  {selectedCategory === 'Local' ? (
                    <div className="space-y-3 pt-1">
                      {/* Tick tur Pakhat (Single master checkbox for Local Pack) */}
                      <div
                        onClick={() => setHasLocalAddon(!hasLocalAddon)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                          hasLocalAddon
                            ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs'
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="local-addon-master-tick"
                              checked={hasLocalAddon}
                              onChange={(e) => setHasLocalAddon(e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <label
                                htmlFor="local-addon-master-tick"
                                className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2 flex-wrap"
                              >
                                <span>Local Channels Add-on Pack</span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    hasLocalAddon
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {hasLocalAddon ? 'Add-on Ticked (Hring / Active)' : 'Unticked (Off)'}
                                </span>
                              </label>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Tick chuan Local tab a hring ang a, LPS 1 atanga LPS 12 leh LPS HD channel list thlan sa in a tel nghal ang. <strong className="text-emerald-800">LCO Share: Rs. 36.20 (50.99%) &bull; MSO Cut: Rs. 34.80 (49.01%)</strong> a ni.
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-base font-mono font-bold ${hasLocalAddon ? 'text-emerald-700' : 'text-gray-400'}`}>
                              {hasLocalAddon ? `+Rs. ${localAddonPrice.toFixed(2)}` : 'Rs. 0.00'}
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium">LCO Rs 36.20 &bull; MSO Rs 34.80</div>
                          </div>
                        </div>
                      </div>

                      {/* LPS 1 atang a LPS 12 leh LPS HD thleng channel list */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs px-0.5">
                          <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                            <Tv2 className="w-4 h-4 text-emerald-700" />
                            <span>LPS 1 atanga LPS 12 leh LPS HD channel list ({DEFAULT_LOCAL_CHANNELS.length} channels):</span>
                          </span>
                          <span className={`font-semibold ${hasLocalAddon ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {hasLocalAddon ? '✓ Telh a ni (Thlan a ni)' : 'Thlan loh (Off)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {DEFAULT_LOCAL_CHANNELS.map((chName, idx) => (
                            <div
                              key={chName}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                                hasLocalAddon
                                  ? chName === 'LPS HD'
                                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-medium shadow-2xs'
                                    : 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium shadow-2xs'
                                  : 'bg-gray-50 border-gray-200 text-gray-400'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    hasLocalAddon
                                      ? chName === 'LPS HD'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-emerald-600 text-white'
                                      : 'border border-gray-300 bg-white text-gray-400'
                                  }`}
                                >
                                  {hasLocalAddon ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                                </div>
                                <span className="font-semibold">{chName}</span>
                                {chName === 'LPS HD' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                                    HD
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-medium ${hasLocalAddon ? chName === 'LPS HD' ? 'text-amber-700 font-bold' : 'text-emerald-700' : 'text-gray-400'}`}>
                                {hasLocalAddon ? 'Telh a ni' : 'Thlan loh'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedCategory === 'HD ADD ON' ? (
                    <div className="space-y-3 pt-1">
                      {/* Master Pack Card */}
                      <div
                        onClick={handleToggleAllHdAddon}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                          isAllHdAddonSelected
                            ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs'
                            : selectedHdAddonCount > 0
                            ? 'bg-blue-50/90 border-blue-400 shadow-2xs'
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="hd-addon-master-tick"
                              checked={isAllHdAddonSelected}
                              onChange={handleToggleAllHdAddon}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <label
                                htmlFor="hd-addon-master-tick"
                                className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2 flex-wrap"
                              >
                                <span>HD ADD ON Pack</span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isAllHdAddonSelected
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : selectedHdAddonCount > 0
                                      ? 'bg-blue-200 text-blue-900'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {isAllHdAddonSelected
                                    ? `All ${HD_ADDON_PRESET.length} Ticked (Hring / Active)`
                                    : selectedHdAddonCount > 0
                                    ? `${selectedHdAddonCount}/${HD_ADDON_PRESET.length} Channels Ticked`
                                    : 'Unticked (Off)'}
                                </span>
                              </label>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Untick theih vek in &bull; Channel {HD_ADDON_PRESET.length} awm &bull; Total Rate: <strong>Rs {hdAddonTotalPrice.toFixed(2)}</strong> &bull; LCO Share (8.47%): <strong>Rs {(hdAddonTotalPrice * 0.0847).toFixed(2)}</strong> &bull; MSO Cut (91.53%): <strong>Rs {(hdAddonTotalPrice * 0.9153).toFixed(2)}</strong>.
                                <span className="text-emerald-800 font-semibold block sm:inline sm:ml-1">
                                  (Export hunah channel pakhat tete in line khat ah a awm ang)
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAllHdAddon();
                              }}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                                isAllHdAddonSelected
                                  ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isAllHdAddonSelected ? `Untick All (${HD_ADDON_PRESET.length})` : `Select All (${HD_ADDON_PRESET.length})`}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 14 Channels Grid */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs px-0.5">
                          <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                            <Tv2 className="w-4 h-4 text-emerald-700" />
                            <span>HD ADD ON Channel List ({HD_ADDON_PRESET.length} channels - Untick theih vek in):</span>
                          </span>
                          <span className="font-semibold text-gray-600">
                            {selectedHdAddonCount}/{HD_ADDON_PRESET.length} thlan a ni
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {HD_ADDON_PRESET.map((item) => {
                            const isSelected = selectedChannelTags.includes(item.name);
                            const lcoShare = Number((item.price * 0.0847).toFixed(2));
                            const msoCut = Number((item.price - lcoShare).toFixed(2));

                            return (
                              <div
                                key={item.name}
                                onClick={() => handleToggleSingleChannel(item.name)}
                                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-medium shadow-2xs'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // handled by parent onClick
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 pointer-events-none"
                                  />
                                  <div className="truncate">
                                    <div className="font-bold text-xs truncate flex items-center gap-1.5">
                                      <span>{item.name}</span>
                                      <span className="px-1 py-0.2 text-[9px] bg-blue-100 text-blue-700 rounded font-semibold shrink-0">
                                        ✨ HD
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                      <span className="text-emerald-700 font-medium">LCO: Rs {lcoShare.toFixed(2)}</span>
                                      <span>&bull;</span>
                                      <span className="text-gray-500">Cut: Rs {msoCut.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`text-xs font-mono font-bold block ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>
                                    Rs {item.price.toFixed(2)}
                                  </span>
                                  <span className="text-[9px] text-gray-400">{item.category}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : selectedCategory === 'SD ADD ON' ? (
                    <div className="space-y-3 pt-1">
                      {/* Master Pack Card */}
                      <div
                        onClick={handleToggleAllSdAddon}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                          isAllSdAddonSelected
                            ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs'
                            : selectedSdAddonCount > 0
                            ? 'bg-blue-50/90 border-blue-400 shadow-2xs'
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="sd-addon-master-tick"
                              checked={isAllSdAddonSelected}
                              onChange={handleToggleAllSdAddon}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <label
                                htmlFor="sd-addon-master-tick"
                                className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2 flex-wrap"
                              >
                                <span>SD ADD ON Pack</span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isAllSdAddonSelected
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : selectedSdAddonCount > 0
                                      ? 'bg-blue-200 text-blue-900'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {isAllSdAddonSelected
                                    ? `All ${SD_ADDON_PRESET.length} Ticked (Hring / Active)`
                                    : selectedSdAddonCount > 0
                                    ? `${selectedSdAddonCount}/${SD_ADDON_PRESET.length} Channels Ticked`
                                    : 'Unticked (Off)'}
                                </span>
                              </label>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Untick theih vek in &bull; Channel {SD_ADDON_PRESET.length} awm &bull; Total Rate: <strong>Rs {sdAddonTotalPrice.toFixed(2)}</strong> &bull; LCO Share (8.47%): <strong>Rs {(sdAddonTotalPrice * 0.0847).toFixed(2)}</strong> &bull; MSO Cut (91.53%): <strong>Rs {(sdAddonTotalPrice * 0.9153).toFixed(2)}</strong>.
                                <span className="text-emerald-800 font-semibold block sm:inline sm:ml-1">
                                   (Export hunah channel pakhat tete in line khat ah a awm ang)
                                 </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAllSdAddon();
                              }}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                                isAllSdAddonSelected
                                  ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isAllSdAddonSelected ? `Untick All (${SD_ADDON_PRESET.length})` : `Select All (${SD_ADDON_PRESET.length})`}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 11 Channels Grid */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs px-0.5">
                          <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                            <Tv2 className="w-4 h-4 text-emerald-700" />
                            <span>SD ADD ON Channel List ({SD_ADDON_PRESET.length} channels - Untick theih vek in):</span>
                          </span>
                          <span className="font-semibold text-gray-600">
                            {selectedSdAddonCount}/{SD_ADDON_PRESET.length} thlan a ni
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {SD_ADDON_PRESET.map((item) => {
                            const isSelected = selectedChannelTags.includes(item.name);
                            const lcoShare = Number((item.price * 0.0847).toFixed(2));
                            const msoCut = Number((item.price - lcoShare).toFixed(2));

                            return (
                              <div
                                key={item.name}
                                onClick={() => handleToggleSingleChannel(item.name)}
                                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-medium shadow-2xs'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // handled by parent onClick
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 pointer-events-none"
                                  />
                                  <div className="truncate">
                                    <div className="font-bold text-xs truncate flex items-center gap-1.5">
                                      <span>{item.name}</span>
                                      <span className="px-1 py-0.2 text-[9px] bg-gray-200 text-gray-700 rounded font-semibold shrink-0">
                                        📺 SD
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                      <span className="text-emerald-700 font-medium">LCO: Rs {lcoShare.toFixed(2)}</span>
                                      <span>&bull;</span>
                                      <span className="text-gray-500">Cut: Rs {msoCut.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`text-xs font-mono font-bold block ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>
                                    Rs {item.price.toFixed(2)}
                                  </span>
                                  <span className="text-[9px] text-gray-400">{item.category}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Channel Grid */}
                      {filteredChannels.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                          <p className="text-xs text-gray-500 mb-2">He filter hnuaiah hian channel a awm lo.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSportsSubFilter('all');
                              setQualityFilter('all');
                              setChannelSearchTerm('');
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                          >
                            Filter zawng zawng clear rawh
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2 pr-1">
                          {filteredChannels.map((ch) => {
                            const isSelected = selectedChannelTags.includes(ch.name);
                            const lcoShare = Number((ch.price * 0.0847).toFixed(2));
                            const msoCut = Number((ch.price - lcoShare).toFixed(2));
                            const isHd = isChannelHd(ch);

                            return (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    handleRemoveChannel(ch.name);
                                  } else {
                                    handleAddChannel(ch.name);
                                  }
                                }}
                                className={`flex items-center justify-between p-2 rounded-md text-left text-xs transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-300 text-blue-950 font-medium'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="truncate font-semibold flex items-center gap-1.5">
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[3]" />}
                                    <span className="truncate">{ch.name}</span>
                                    {isHd ? (
                                      <span className="px-1.5 py-0.2 text-[9px] bg-indigo-600 text-white rounded font-black tracking-wider shadow-2xs shrink-0">
                                        💎 HD
                                      </span>
                                    ) : (
                                      <span className="px-1 py-0.2 text-[9px] bg-gray-200 text-gray-700 rounded font-semibold shrink-0">
                                        📺 SD
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                    <span>{ch.category}</span>
                                    <span>&bull;</span>
                                    <span className="text-emerald-700 font-medium" title="8.47% LCO Chan">
                                      LCO: Rs {lcoShare.toFixed(2)}
                                    </span>
                                    <span>&bull;</span>
                                    <span className="text-gray-500" title="91.53% In Cut">
                                      Cut: Rs {msoCut.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`text-[11px] font-bold block ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                    Rs {ch.price.toFixed(2)}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-normal">Rate</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* Save Success Message */}
          {saveSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* 6. Save he customer tan */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="save-customer-channels-btn"
              onClick={handleSave}
              className={`w-full sm:w-auto px-7 py-3 font-extrabold text-sm rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2 text-white ${
                marginAnalysis.isLoss
                  ? 'bg-red-600 hover:bg-red-700'
                  : marginAnalysis.isBelow20
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : hasUnsavedChanges
                  ? 'bg-[#007bff] hover:bg-[#0069d9] ring-2 ring-blue-300 shadow-md animate-pulse'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <Save className="w-5 h-5" />
              <span>
                SAVE (BST {hasLocalAddon ? '+ Local' : 'chauh'} & Channels
                {marginAnalysis.hasCustom ? ` • Bill: Rs ${marginAnalysis.effectiveBill.toFixed(0)}` : ''})
              </span>
              {hasUnsavedChanges && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping" />
              )}
            </button>

            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleRevert}
                className="w-full sm:w-auto px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-xl text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Thlan thar zawng zawng paih a, customer active state-ah let leh rawh"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Dah let leh rawh (Revert)</span>
              </button>
            )}
          </div>
        </>
      )}

      {!currentCustomer && (
        <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500">
          A chunga dropdown atang khian customer thlang rawh. Chuan an BST, Local Add-on leh channel duh belh thlanna a lo lang ang.
        </div>
      )}
    </div>
  );
};
