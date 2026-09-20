import React, { useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { CustomerSummary, SubscriberRawRow, ChannelItem, GrandTotals, SubscriptionDateSettings } from './types';
import {
  DEFAULT_BASE_PRICE,
  DEFAULT_CHANNELS,
  BST_PRICE,
  LOCAL_PRICE,
  ALACARTE_LCO_COMMISSION_PERCENT,
} from './data/defaultChannels';
import {
  parseSubscriberExcel,
  processRawRowsToCustomers,
  calculateCustomerPricing,
  getChannelPriceMap,
  normalizeKey,
} from './utils/excelParser';
import { exportSummaryExcel } from './utils/excelExporter';
import { savePersistedData, loadPersistedData, clearPersistedData } from './utils/storage';
import { Header } from './components/Header';
import { ExcelUpload } from './components/ExcelUpload';
import { CustomerChannelSelector } from './components/CustomerChannelSelector';
import { CustomerTable } from './components/CustomerTable';
import { GrandTotalsBar } from './components/GrandTotalsBar';
import { ChannelManagerModal } from './components/ChannelManagerModal';
import { BulkRenewModal } from './components/BulkRenewModal';
import { BillCalculatorModal } from './components/BillCalculatorModal';
import { TutorialModal } from './components/TutorialModal';

export default function App() {
  const [basePrice, setBasePrice] = useState<number>(DEFAULT_BASE_PRICE);
  const [availableChannels, setAvailableChannels] = useState<ChannelItem[]>(() => {
    const version = localStorage.getItem('lps_channels_version');
    if (version !== 'v6_force_recalc_v1') {
      localStorage.setItem('lps_channels_version', 'v6_force_recalc_v1');
      localStorage.setItem('lps_channels', JSON.stringify(DEFAULT_CHANNELS));
      return DEFAULT_CHANNELS;
    }
    const saved = localStorage.getItem('lps_channels');
    if (saved) {
      try {
        const parsed: ChannelItem[] = JSON.parse(saved);
        const updated = parsed.map((ch) => {
          let cat = ch.category;
          const upperName = ch.name.toUpperCase();
          if (
            upperName.includes('SS SELECT') ||
            upperName.includes('STAR SPORTS') ||
            upperName.includes('SPORTS') ||
            upperName.includes('EUROSPORTS') ||
            upperName.includes('UNITE8 SPORTS')
          ) {
            cat = 'Sports';
          }
          let price = ch.price;
          if (upperName.includes('SONY SPORTS TEN') && !upperName.includes('HD') && price !== 22.42) {
            price = 22.42;
          }
          if (upperName.includes('SONY SPORTS TEN') && upperName.includes('HD') && price !== 35.4) {
            price = 35.4;
          }
          return { ...ch, category: cat, price };
        });
        localStorage.setItem('lps_channels', JSON.stringify(updated));
        return updated;
      } catch {
        return DEFAULT_CHANNELS;
      }
    }
    return DEFAULT_CHANNELS;
  });

  const [rawRows, setRawRows] = useState<SubscriberRawRow[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);

  // Initialize customers - empty initially, or restored from persistent storage
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);

  // Selected customer for editing
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isChannelManagerOpen, setIsChannelManagerOpen] = useState<boolean>(false);
  const [isBulkRenewModalOpen, setIsBulkRenewModalOpen] = useState<boolean>(false);
  const [isBillCalculatorOpen, setIsBillCalculatorOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [customTotalDeposit, setCustomTotalDeposit] = useState<number | null>(null);

  // Subscription Date Settings for Excel Export
  const [subscriptionSettings, setSubscriptionSettings] = useState<SubscriptionDateSettings>(() => {
    const saved = localStorage.getItem('lps_subscription_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // default
      }
    }
    return {
      startDate: '2026-09-19',
      endDate: '2026-10-19',
      subscriptionType: 'Month',
      subscriptionValue: 1,
      totalDays: 31,
    };
  });

  // Save subscription settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem('lps_subscription_settings', JSON.stringify(subscriptionSettings));
  }, [subscriptionSettings]);

  // Restore uploaded data & saved modifications on app load
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const saved = await loadPersistedData();
        if (isMounted && saved) {
          const priceMap = getChannelPriceMap(availableChannels);

          let customersToUse: CustomerSummary[] = [];

          if (saved.customers && saved.customers.length > 0) {
            // Always respect the saved customer state directly - do NOT wipe with raw rows
            customersToUse = saved.customers.map((c) => {
              const hasLocal = c.hasLocalAddon !== false;
              const channels = c.selectedChannels || [];
              const pricing = calculateCustomerPricing(
                channels,
                hasLocal,
                BST_PRICE,
                LOCAL_PRICE,
                ALACARTE_LCO_COMMISSION_PERCENT,
                priceMap
              );
              const customBill = c.customBillAmount;
              const hasCustomBill = customBill !== undefined && customBill > 0;
              return {
                ...c,
                selectedChannels: channels,
                hasLocalAddon: hasLocal,
                channelPrice: pricing.price,
                customBillAmount: hasCustomBill ? customBill : undefined,
                lcoHlawh: pricing.lcoHlawh,
                lcoSen: pricing.lcoSen,
                isModified: c.isModified ?? false,
              };
            });
          } else if (saved.rawRows && saved.rawRows.length > 0) {
            // Fallback: only if saved.customers was empty, process from rawRows
            customersToUse = processRawRowsToCustomers(
              saved.rawRows,
              availableChannels,
              BST_PRICE,
              LOCAL_PRICE
            );
          }

          if (customersToUse.length > 0) {
            // Force re-calculate pricing based on current availableChannels to ensure consistency
            const priceMap = getChannelPriceMap(availableChannels);
            const recalculated = customersToUse.map((c) => {
              const pricing = calculateCustomerPricing(
                c.selectedChannels,
                c.hasLocalAddon !== false,
                BST_PRICE,
                LOCAL_PRICE,
                ALACARTE_LCO_COMMISSION_PERCENT,
                priceMap
              );
              return {
                ...c,
                channelPrice: pricing.price,
                lcoHlawh: pricing.lcoHlawh,
                lcoSen: pricing.lcoSen,
              };
            });
            setCustomers(recalculated);
            setRawRows(saved.rawRows || []);
            setCurrentFileName(saved.currentFileName || 'Saved_LPS_Subscribers.xlsx');
            setFileSizeText(saved.fileSizeText || 'Saved Session');
            if (saved.selectedCustomerId) {
              setSelectedCustomerId(saved.selectedCustomerId);
            } else {
              setSelectedCustomerId(customersToUse[0]?.id || null);
            }
          }
        }
      } catch (err) {
        console.warn('Could not restore saved LPS data:', err);
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Automatically persist uploaded data & saved channels whenever changes happen
  useEffect(() => {
    if (isRestoring) return;

    if (customers.length > 0) {
      savePersistedData({
        customers,
        rawRows,
        currentFileName,
        fileSizeText,
        selectedCustomerId,
        savedAt: new Date().toISOString(),
      });
    } else {
      clearPersistedData();
    }
  }, [customers, rawRows, currentFileName, fileSizeText, selectedCustomerId, isRestoring]);

  // Save custom channels to local storage when changed
  useEffect(() => {
    localStorage.setItem('lps_channels', JSON.stringify(availableChannels));
  }, [availableChannels]);

  // When channels or base price change, re-calculate customers pricing
  const handleUpdateBasePrice = (newBasePrice: number) => {
    setBasePrice(newBasePrice);
    const priceMap = getChannelPriceMap(availableChannels);
    setCustomers((prev) =>
      prev.map((c) => {
        const pricing = calculateCustomerPricing(
          c.selectedChannels,
          c.hasLocalAddon !== false,
          BST_PRICE,
          LOCAL_PRICE,
          ALACARTE_LCO_COMMISSION_PERCENT,
          priceMap
        );
        return {
          ...c,
          channelPrice: pricing.price,
          lcoHlawh: pricing.lcoHlawh,
          lcoSen: pricing.lcoSen,
        };
      })
    );
  };

  const handleUpdateChannels = (updatedChannels: ChannelItem[]) => {
    setAvailableChannels(updatedChannels);
    const priceMap = getChannelPriceMap(updatedChannels);
    setCustomers((prev) =>
      prev.map((c) => {
        const pricing = calculateCustomerPricing(
          c.selectedChannels,
          c.hasLocalAddon !== false,
          BST_PRICE,
          LOCAL_PRICE,
          ALACARTE_LCO_COMMISSION_PERCENT,
          priceMap
        );
        return {
          ...c,
          channelPrice: pricing.price,
          lcoHlawh: pricing.lcoHlawh,
          lcoSen: pricing.lcoSen,
        };
      })
    );
  };

  const handleResetChannels = () => {
    setAvailableChannels(DEFAULT_CHANNELS);
    localStorage.setItem('lps_channels_version', 'v2_official_110');
    localStorage.setItem('lps_channels', JSON.stringify(DEFAULT_CHANNELS));
    const priceMap = getChannelPriceMap(DEFAULT_CHANNELS);
    setCustomers((prev) =>
      prev.map((c) => {
        const pricing = calculateCustomerPricing(
          c.selectedChannels,
          c.hasLocalAddon !== false,
          BST_PRICE,
          LOCAL_PRICE,
          ALACARTE_LCO_COMMISSION_PERCENT,
          priceMap
        );
        return {
          ...c,
          channelPrice: pricing.price,
          lcoHlawh: pricing.lcoHlawh,
          lcoSen: pricing.lcoSen,
        };
      })
    );
  };

  // Delete a single line (specific channel row or entire subscriber row if base package)
  const handleDeleteLine = (
    customerId: string,
    channelIndex?: number,
    channelName?: string
  ) => {
    const target = customers.find((c) => c.id === customerId);
    if (!target) return;

    // 0. Handle BST or Local Addon deletion from the multi-line view
    if (channelIndex === -2) {
      // Deleting BST row = Deleting the whole customer
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      setRawRows((prev) => prev.filter((r) => !(r.subscriberCode === target.subscriberCode && r.stbNo === target.stbNo)));
      return;
    }

    if (channelIndex === -1) {
      // Deleting Local Addon row = Disabling Local Addon
      const updatedChannels = [...target.selectedChannels];
      const priceMap = getChannelPriceMap(availableChannels);
      const pricing = calculateCustomerPricing(
        updatedChannels,
        false, // Force local addon false
        BST_PRICE,
        LOCAL_PRICE,
        ALACARTE_LCO_COMMISSION_PERCENT,
        priceMap
      );

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                hasLocalAddon: false,
                channelPrice: pricing.price,
                lcoHlawh: pricing.lcoHlawh,
                lcoSen: pricing.lcoSen,
                isModified: true,
              }
            : c
        )
      );

      setRawRows((prev) =>
        prev.filter(
          (r) =>
            !(
              r.subscriberCode === target.subscriberCode &&
              r.stbNo === target.stbNo &&
              r.packageChannelName === 'LPS LOCALS'
            )
        )
      );
      return;
    }

    // 1. If deleting a specific channel line of a customer
    if (typeof channelIndex === 'number' && channelIndex >= 0 && target.selectedChannels.length > channelIndex) {
      const removedChannel = target.selectedChannels[channelIndex];
      const updatedChannels = target.selectedChannels.filter((_, idx) => idx !== channelIndex);
      const priceMap = getChannelPriceMap(availableChannels);
      const pricing = calculateCustomerPricing(
        updatedChannels,
        target.hasLocalAddon !== false,
        BST_PRICE,
        LOCAL_PRICE,
        ALACARTE_LCO_COMMISSION_PERCENT,
        priceMap
      );

      const hasCustomBill = target.customBillAmount !== undefined && target.customBillAmount > 0;
      const effectiveLcoSen = pricing.lcoSen;
      const effectiveLcoHlawh = hasCustomBill
        ? Number((target.customBillAmount! - pricing.lcoSen).toFixed(2))
        : pricing.lcoHlawh;

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                selectedChannels: updatedChannels,
                channelPrice: pricing.price,
                lcoHlawh: effectiveLcoHlawh,
                lcoSen: effectiveLcoSen,
                isModified: true,
              }
            : c
        )
      );

      if (removedChannel) {
        setRawRows((prev) =>
          prev.filter(
            (r) =>
              !(
                r.subscriberCode === target.subscriberCode &&
                r.stbNo === target.stbNo &&
                r.packageChannelName?.toLowerCase().trim() === removedChannel.toLowerCase().trim()
              )
          )
        );
      }
      return;
    }

    // 2. Fallback if channelName was provided
    if (channelName && target.selectedChannels.includes(channelName)) {
      const updatedChannels = target.selectedChannels.filter((ch) => ch !== channelName);
      const priceMap = getChannelPriceMap(availableChannels);
      const pricing = calculateCustomerPricing(
        updatedChannels,
        target.hasLocalAddon !== false,
        BST_PRICE,
        LOCAL_PRICE,
        ALACARTE_LCO_COMMISSION_PERCENT,
        priceMap
      );

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                selectedChannels: updatedChannels,
                channelPrice: pricing.price,
                lcoHlawh: pricing.lcoHlawh,
                lcoSen: pricing.lcoSen,
                isModified: true,
              }
            : c
        )
      );

      setRawRows((prev) =>
        prev.filter(
          (r) =>
            !(
              r.subscriberCode === target.subscriberCode &&
              r.stbNo === target.stbNo &&
              r.packageChannelName?.toLowerCase().trim() === channelName.toLowerCase().trim()
            )
        )
      );
      return;
    }

    // 3. Otherwise, this line represents the entire subscriber record (e.g. subscriber with no channels)
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    setRawRows((prev) =>
      prev.filter(
        (r) =>
          r.subscriberCode !== target.subscriberCode &&
          r.stbNo !== target.stbNo
      )
    );
    if (selectedCustomerId === customerId) {
      const remaining = customers.filter((c) => c.id !== customerId);
      setSelectedCustomerId(remaining[0]?.id || null);
    }
  };

  // Delete customer entirely
  const handleDeleteCustomer = (customerId: string) => {
    const target = customers.find((c) => c.id === customerId);
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (target) {
      setRawRows((prev) =>
        prev.filter(
          (r) =>
            r.subscriberCode !== target.subscriberCode &&
            r.stbNo !== target.stbNo
        )
      );
    }
    if (selectedCustomerId === customerId) {
      const remaining = customers.filter((c) => c.id !== customerId);
      setSelectedCustomerId(remaining[0]?.id || null);
    }
  };

  // Batch delete customers (Essy Selection Package)
  const handleBatchDeleteCustomers = (customerIds: string[]) => {
    if (!customerIds || customerIds.length === 0) return;
    const targetSet = new Set(customerIds);
    const targets = customers.filter((c) => targetSet.has(c.id));
    const targetSubCodes = new Set(targets.map((t) => t.subscriberCode));
    const targetStbNos = new Set(targets.map((t) => t.stbNo));

    setCustomers((prev) => prev.filter((c) => !targetSet.has(c.id)));
    setRawRows((prev) =>
      prev.filter(
        (r) =>
          !targetSubCodes.has(r.subscriberCode) && !targetStbNos.has(r.stbNo)
      )
    );
    if (selectedCustomerId && targetSet.has(selectedCustomerId)) {
      const remaining = customers.filter((c) => !targetSet.has(c.id));
      setSelectedCustomerId(remaining[0]?.id || null);
    }
  };

  // Restore deleted customers
  const handleRestoreCustomers = (restoredCustomers: CustomerSummary[]) => {
    if (!restoredCustomers || restoredCustomers.length === 0) return;
    setCustomers((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const toAdd = restoredCustomers.filter((c) => !existingIds.has(c.id));
      return [...prev, ...toAdd];
    });

    // Also reconstruct raw rows for these customers so summary & renewals remain complete
    setRawRows((prev) => {
      const existingCodes = new Set(prev.map((r) => r.subscriberCode));
      const newRows: SubscriberRawRow[] = [];
      for (const c of restoredCustomers) {
        if (!existingCodes.has(c.subscriberCode)) {
          newRows.push({
            name: c.name,
            subscriberCode: c.subscriberCode,
            stbNo: c.stbNo,
            vcNo: c.vcNo || '',
            type: 'Package',
            packageChannelName: c.basePackage || 'PACK-1 (BST)',
            subscriptionPeriod: c.subscriptionPeriod || 'Month',
            subscriptionCount: c.subscriptionCount ?? 1,
            networkCapacityFee: c.networkCapacityFee ?? '0.00',
            packageDiscount: c.packageDiscount ?? '0.00',
            serviceType: c.serviceType || 'PayTV',
            franchiseeName: c.franchiseeName || '',
          });
          for (const ch of c.selectedChannels) {
            newRows.push({
              name: c.name,
              subscriberCode: c.subscriberCode,
              stbNo: c.stbNo,
              vcNo: c.vcNo || '',
              type: 'Channel',
              packageChannelName: ch,
              subscriptionPeriod: c.subscriptionPeriod || 'Month',
              subscriptionCount: c.subscriptionCount ?? 1,
              networkCapacityFee: c.networkCapacityFee ?? '0.00',
              packageDiscount: c.packageDiscount ?? '0.00',
              serviceType: c.serviceType || 'PayTV',
              franchiseeName: c.franchiseeName || '',
            });
          }
        }
      }
      return [...prev, ...newRows];
    });
  };

  // Upload new Excel file
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const sizeKb = (file.size / 1024).toFixed(1) + 'KB';
      const result = await parseSubscriberExcel(file, availableChannels);

      setRawRows(result.rawRows);
      setCustomers(result.customers);
      setCustomTotalDeposit(null);
      setCurrentFileName(file.name);
      setFileSizeText(sizeKb);

      if (result.customers.length > 0) {
        setSelectedCustomerId(result.customers[0].id);
      } else {
        setSelectedCustomerId(null);
      }
    } catch (err) {
      alert('File chhiar theih a ni lo: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFile = async () => {
    if (customers.length > 0) {
      const confirmClear = window.confirm(
        'Uploaded Excel data leh subscriber channel save sa zawng zawng hi paih (remove) i duh chiang chiah em?'
      );
      if (!confirmClear) return;
    }

    setRawRows([]);
    setCustomers([]);
    setCustomTotalDeposit(null);
    setCurrentFileName(null);
    setFileSizeText('');
    setSelectedCustomerId(null);
    await clearPersistedData();
  };

  // Save selected channels, local addon & custom bill for a customer
  const handleSaveCustomerChannels = (
    customerId: string,
    newChannels: string[],
    hasLocalAddon: boolean = true,
    customBillAmount?: number
  ) => {
    const priceMap = getChannelPriceMap(availableChannels);
    const pricing = calculateCustomerPricing(
      newChannels,
      hasLocalAddon,
      BST_PRICE,
      LOCAL_PRICE,
      ALACARTE_LCO_COMMISSION_PERCENT,
      priceMap
    );

    let updatedCustomer: CustomerSummary | undefined;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const hasCustomBill = customBillAmount !== undefined && customBillAmount > 0;

          const newCust = {
            ...c,
            selectedChannels: [...newChannels],
            hasLocalAddon,
            channelPrice: pricing.price,
            customBillAmount: hasCustomBill ? customBillAmount : undefined,
            lcoHlawh: pricing.lcoHlawh,
            lcoSen: pricing.lcoSen,
            isModified: true,
          };
          updatedCustomer = newCust;
          return newCust;
        }
        return c;
      })
    );

    // Keep rawRows in sync so any export or raw inspection has the updated channel list
    if (updatedCustomer) {
      const uc = updatedCustomer;
      setRawRows((prev) => {
        // 1. Remove ALL existing rows for this subscriber (both Package and Channel)
        // We will rebuild them to ensure consistency with hasLocalAddon
        const otherRows = prev.filter(
          (r) => !(r.subscriberCode === uc.subscriberCode && r.stbNo === uc.stbNo)
        );

        // 2. Re-add the Base Package (PACK-1 (BST))
        const bstRow: SubscriberRawRow = {
          name: uc.name,
          subscriberCode: uc.subscriberCode,
          stbNo: uc.stbNo,
          vcNo: uc.vcNo || '',
          type: 'Package',
          packageChannelName: uc.basePackage || 'PACK-1 (BST)',
          subscriptionPeriod: uc.subscriptionPeriod || 'Month',
          subscriptionCount: uc.subscriptionCount ?? 1,
          networkCapacityFee: uc.networkCapacityFee ?? '0.00',
          packageDiscount: uc.packageDiscount ?? '0.00',
          serviceType: uc.serviceType || 'PayTV',
          franchiseeName: uc.franchiseeName || '',
          customBillAmount: customBillAmount !== undefined && customBillAmount > 0 ? customBillAmount : uc.customBillAmount,
        };

        // 3. Add Local Addon row if active
        const localRow: SubscriberRawRow | null = uc.hasLocalAddon
          ? {
              name: uc.name,
              subscriberCode: uc.subscriberCode,
              stbNo: uc.stbNo,
              vcNo: uc.vcNo || '',
              type: 'Package',
              packageChannelName: 'LPS LOCALS',
              subscriptionPeriod: uc.subscriptionPeriod || 'Month',
              subscriptionCount: uc.subscriptionCount ?? 1,
              networkCapacityFee: uc.networkCapacityFee ?? '0.00',
              packageDiscount: uc.packageDiscount ?? '0.00',
              serviceType: uc.serviceType || 'PayTV',
              franchiseeName: uc.franchiseeName || '',
            }
          : null;

        // 4. Add Channel rows
        const channelRows: SubscriberRawRow[] = newChannels.map((ch) => ({
          name: uc.name,
          subscriberCode: uc.subscriberCode,
          stbNo: uc.stbNo,
          vcNo: uc.vcNo || '',
          type: 'Channel',
          packageChannelName: ch,
          subscriptionPeriod: uc.subscriptionPeriod || 'Month',
          subscriptionCount: uc.subscriptionCount ?? 1,
          networkCapacityFee: uc.networkCapacityFee ?? '0.00',
          packageDiscount: uc.packageDiscount ?? '0.00',
          serviceType: uc.serviceType || 'PayTV',
          franchiseeName: uc.franchiseeName || '',
        }));

        const newRowsForCustomer = [bstRow];
        if (localRow) newRowsForCustomer.push(localRow);
        
        return [...otherRows, ...newRowsForCustomer, ...channelRows];
      });
    }
  };

  // Bulk apply channels & settings to all customers
  const handleApplyChannelsToAll = (
    newChannels: string[],
    hasLocalAddon: boolean = true,
    packName: string = 'Custom Pack',
    customBillAmount?: number
  ) => {
    const priceMap = getChannelPriceMap(availableChannels);
    const pricing = calculateCustomerPricing(
      newChannels,
      hasLocalAddon,
      BST_PRICE,
      LOCAL_PRICE,
      ALACARTE_LCO_COMMISSION_PERCENT,
      priceMap
    );

    const hasExplicitBill = customBillAmount !== undefined && customBillAmount > 0;

    setCustomers((prev) =>
      prev.map((c) => {
        const targetBill = hasExplicitBill ? customBillAmount : c.customBillAmount;
        const hasCustomBill = targetBill !== undefined && targetBill > 0;
        const effectiveLcoSen = pricing.lcoSen;
        const effectiveLcoHlawh = hasCustomBill
          ? Number((targetBill! - pricing.lcoSen).toFixed(2))
          : pricing.lcoHlawh;

        return {
          ...c,
          selectedChannels: [...newChannels],
          hasLocalAddon,
          channelPrice: pricing.price,
          customBillAmount: hasCustomBill ? targetBill : undefined,
          lcoHlawh: effectiveLcoHlawh,
          lcoSen: effectiveLcoSen,
          isModified: true,
        };
      })
    );

    // Keep rawRows in sync for all customers as well
    setRawRows((prev) => {
      const newAllRows: SubscriberRawRow[] = [];
      
      for (const c of customers) {
        // 1. PACK-1 (BST) Row
        const targetBill = hasExplicitBill ? customBillAmount : c.customBillAmount;
        newAllRows.push({
          name: c.name,
          subscriberCode: c.subscriberCode,
          stbNo: c.stbNo,
          vcNo: c.vcNo || '',
          type: 'Package',
          packageChannelName: c.basePackage || 'PACK-1 (BST)',
          subscriptionPeriod: c.subscriptionPeriod || 'Month',
          subscriptionCount: c.subscriptionCount ?? 1,
          networkCapacityFee: c.networkCapacityFee ?? '0.00',
          packageDiscount: c.packageDiscount ?? '0.00',
          serviceType: c.serviceType || 'PayTV',
          franchiseeName: c.franchiseeName || '',
          customBillAmount: targetBill !== undefined && targetBill > 0 ? targetBill : undefined,
        });

        // 2. LOCAL Row
        if (hasLocalAddon) {
          newAllRows.push({
            name: c.name,
            subscriberCode: c.subscriberCode,
            stbNo: c.stbNo,
            vcNo: c.vcNo || '',
            type: 'Package',
            packageChannelName: 'LPS LOCALS',
            subscriptionPeriod: c.subscriptionPeriod || 'Month',
            subscriptionCount: c.subscriptionCount ?? 1,
            networkCapacityFee: c.networkCapacityFee ?? '0.00',
            packageDiscount: c.packageDiscount ?? '0.00',
            serviceType: c.serviceType || 'PayTV',
            franchiseeName: c.franchiseeName || '',
          });
        }

        // 3. Channel Rows
        for (const ch of newChannels) {
          newAllRows.push({
            name: c.name,
            subscriberCode: c.subscriberCode,
            stbNo: c.stbNo,
            vcNo: c.vcNo || '',
            type: 'Channel',
            packageChannelName: ch,
            subscriptionPeriod: c.subscriptionPeriod || 'Month',
            subscriptionCount: c.subscriptionCount ?? 1,
            networkCapacityFee: c.networkCapacityFee ?? '0.00',
            packageDiscount: c.packageDiscount ?? '0.00',
            serviceType: c.serviceType || 'PayTV',
            franchiseeName: c.franchiseeName || '',
          });
        }
      }

      return newAllRows;
    });
  };

  // Batch apply channels & custom bill amount to selected customer IDs (Essy Selection Package)
  const handleBatchApplyChannels = (
    customerIds: string[],
    newChannels: string[],
    hasLocalAddon: boolean = true,
    customBillAmount?: number,
    packName: string = 'Package'
  ) => {
    if (!customerIds || customerIds.length === 0) return;
    const targetSet = new Set(customerIds);
    const priceMap = getChannelPriceMap(availableChannels);
    const pricing = calculateCustomerPricing(
      newChannels,
      hasLocalAddon,
      BST_PRICE,
      LOCAL_PRICE,
      ALACARTE_LCO_COMMISSION_PERCENT,
      priceMap
    );

    const hasCustomBill = customBillAmount !== undefined && customBillAmount > 0;
    const effectiveLcoSen = pricing.lcoSen;
    const effectiveLcoHlawh = hasCustomBill
      ? Number((customBillAmount! - pricing.lcoSen).toFixed(2))
      : pricing.lcoHlawh;

    setCustomers((prev) =>
      prev.map((c) => {
        if (targetSet.has(c.id)) {
          return {
            ...c,
            selectedChannels: [...newChannels],
            hasLocalAddon,
            channelPrice: pricing.price,
            customBillAmount: hasCustomBill ? customBillAmount : undefined,
            lcoHlawh: effectiveLcoHlawh,
            lcoSen: effectiveLcoSen,
            isModified: true,
          };
        }
        return c;
      })
    );

    // Keep rawRows in sync for target customers so Excel export has the exact channels and prices
    setRawRows((prev) => {
      const targetCustomerList = customers.filter((c) => targetSet.has(c.id));
      const targetSubKeys = new Set(
        targetCustomerList.map((c) => `${c.subscriberCode}_${c.stbNo}`)
      );

      const untouchedRows = prev.filter(
        (r) => !targetSubKeys.has(`${r.subscriberCode}_${r.stbNo}`)
      );

      const newRows: SubscriberRawRow[] = [];
      for (const uc of targetCustomerList) {
        // 1. PACK-1 (BST) Row
        newRows.push({
          name: uc.name,
          subscriberCode: uc.subscriberCode,
          stbNo: uc.stbNo,
          vcNo: uc.vcNo || '',
          type: 'Package',
          packageChannelName: uc.basePackage || 'PACK-1 (BST)',
          subscriptionPeriod: uc.subscriptionPeriod || 'Month',
          subscriptionCount: uc.subscriptionCount ?? 1,
          networkCapacityFee: uc.networkCapacityFee ?? '0.00',
          packageDiscount: uc.packageDiscount ?? '0.00',
          serviceType: uc.serviceType || 'PayTV',
          franchiseeName: uc.franchiseeName || '',
          customBillAmount: hasCustomBill ? customBillAmount : uc.customBillAmount,
        });

        // 2. Local Addon Row
        if (hasLocalAddon) {
          newRows.push({
            name: uc.name,
            subscriberCode: uc.subscriberCode,
            stbNo: uc.stbNo,
            vcNo: uc.vcNo || '',
            type: 'Package',
            packageChannelName: 'LPS LOCALS',
            subscriptionPeriod: uc.subscriptionPeriod || 'Month',
            subscriptionCount: uc.subscriptionCount ?? 1,
            networkCapacityFee: uc.networkCapacityFee ?? '0.00',
            packageDiscount: uc.packageDiscount ?? '0.00',
            serviceType: uc.serviceType || 'PayTV',
            franchiseeName: uc.franchiseeName || '',
          });
        }

        // 3. Channel Rows
        for (const ch of newChannels) {
          newRows.push({
            name: uc.name,
            subscriberCode: uc.subscriberCode,
            stbNo: uc.stbNo,
            vcNo: uc.vcNo || '',
            type: 'Channel',
            packageChannelName: ch,
            subscriptionPeriod: uc.subscriptionPeriod || 'Month',
            subscriptionCount: uc.subscriptionCount ?? 1,
            networkCapacityFee: uc.networkCapacityFee ?? '0.00',
            packageDiscount: uc.packageDiscount ?? '0.00',
            serviceType: uc.serviceType || 'PayTV',
            franchiseeName: uc.franchiseeName || '',
          });
        }
      }

      return [...untouchedRows, ...newRows];
    });
  };

  // Grand totals computation based on active Subscription Settings (Month / Day)
  const grandTotals: GrandTotals = useMemo(() => {
    // 1. Base monthly standard amounts across all subscribers
    const monthlyStandardPrice = customers.reduce((sum, c) => sum + c.channelPrice, 0);
    const monthlyLcoHlawh = customers.reduce((sum, c) => sum + c.lcoHlawh, 0);
    const monthlyLcoSen = customers.reduce((sum, c) => sum + c.lcoSen, 0);
    const localAddonCount = customers.filter((c) => Boolean(c.hasLocalAddon)).length;
    const bstOnlyCount = customers.filter((c) => !c.hasLocalAddon).length;

    // Base monthly actual collection
    const monthlyActualCollection = customers.reduce(
      (sum, c) => sum + (c.customBillAmount !== undefined && c.customBillAmount > 0 ? c.customBillAmount : c.channelPrice),
      0
    );

    // 2. Period multiplier based on subscriptionSettings (e.g. 6 days = 6/30 = 0.20x)
    let periodRatio = 1;
    let periodLabel = '1 Month';
    if (subscriptionSettings) {
      if (subscriptionSettings.subscriptionType === 'Day') {
        const days = Math.max(1, Number(subscriptionSettings.subscriptionValue) || 1);
        periodRatio = days / 30;
        periodLabel = `Ni ${days} (Day: ${days})`;
      } else {
        const months = Math.max(1, Number(subscriptionSettings.subscriptionValue) || 1);
        periodRatio = months;
        periodLabel = months === 1 ? 'Thlakhat (1 Month)' : `Thla ${months} (${months} Months)`;
      }
    }

    const totalPrice = Number((monthlyStandardPrice * periodRatio).toFixed(2));
    const totalLcoHlawh = Number((monthlyLcoHlawh * periodRatio).toFixed(2));
    const totalLcoSen = Number((monthlyLcoSen * periodRatio).toFixed(2));
    const defaultActualCollection = Number((monthlyActualCollection * periodRatio).toFixed(2));
    const totalActualCollection = customTotalDeposit !== null ? customTotalDeposit : defaultActualCollection;
    const totalActualNetProfit = Number((totalActualCollection - totalLcoSen).toFixed(2));

    return {
      totalPrice,
      totalLcoHlawh,
      totalLcoSen,
      totalCustomers: customers.length,
      localAddonCount,
      bstOnlyCount,
      totalActualCollection,
      totalActualNetProfit,
      periodRatio,
      periodLabel,
      subscriptionType: subscriptionSettings?.subscriptionType || 'Month',
      subscriptionValue: subscriptionSettings?.subscriptionValue || 1,
      totalDays: subscriptionSettings?.totalDays || (subscriptionSettings?.subscriptionType === 'Day' ? subscriptionSettings.subscriptionValue : 30),
    };
  }, [customers, subscriptionSettings, customTotalDeposit]);

  // Total Ala-carte amount across all loaded customers for the calculator sync
  const currentAlacarteSum = useMemo(() => {
    const priceMap = getChannelPriceMap(availableChannels);
    return customers.reduce((sum, c) => {
      let subAlacarte = 0;
      for (const ch of c.selectedChannels) {
        const cleanName = ch.toLowerCase().trim();
        const normKey = normalizeKey(ch);
        if (priceMap.has(cleanName)) {
          subAlacarte += priceMap.get(cleanName)!;
        } else if (priceMap.has(normKey)) {
          subAlacarte += priceMap.get(normKey)!;
        }
      }
      return sum + subAlacarte;
    }, 0);
  }, [customers, availableChannels]);

  // Export handlers
  const handleExportSummary = async () => {
    const name = currentFileName
      ? `Final_Export_${currentFileName.replace(/\.[^/.]+$/, '')}.xls`
      : 'Final_Export_LCO_Share.xls';
    await exportSummaryExcel(
      customers,
      name,
      availableChannels,
      BST_PRICE,
      LOCAL_PRICE,
      subscriptionSettings,
      customTotalDeposit
    );
  };

  const handleExportBulkRenew = () => {
    setIsBulkRenewModalOpen(true);
  };

  const activeFranchiseeName = useMemo(() => {
    return customers.find((c) => Boolean(c.franchiseeName && c.franchiseeName.trim()))?.franchiseeName?.trim() || null;
  }, [customers]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const handleScrollToCustomerSelector = () => {
    const el = document.getElementById('customer-channel-selector-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-gray-900 flex flex-col font-sans antialiased">
      {/* App Header */}
      <Header
        onClearData={handleClearFile}
        onOpenChannelManager={() => setIsChannelManagerOpen(true)}
        onOpenBillCalculator={() => setIsBillCalculatorOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        basePrice={basePrice}
        customerCount={customers.length}
        channelCount={availableChannels.length}
        franchiseeName={activeFranchiseeName}
        selectedCustomer={selectedCustomer}
        onSelectCustomerClick={handleScrollToCustomerSelector}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[98%] 2xl:max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 py-5 space-y-5">
        {/* Upload & Channel Selection Card */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
          {/* Section 1: Excel Upload */}
          <ExcelUpload
            currentFileName={currentFileName}
            fileSizeText={fileSizeText}
            onFileUpload={handleFileUpload}
            onClearFile={handleClearFile}
            isLoading={isLoading}
          />

          <hr className="border-gray-200" />

          {/* Section 2: Customer Search & Channel Selector */}
          {customers.length > 0 ? (
            <div id="customer-channel-selector-section">
              <CustomerChannelSelector
                customers={customers}
                availableChannels={availableChannels}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={(id) => setSelectedCustomerId(id)}
                onSaveCustomerChannels={handleSaveCustomerChannels}
                onApplyChannelsToAll={handleApplyChannelsToAll}
                bstPrice={BST_PRICE}
                localAddonPrice={LOCAL_PRICE}
              />
            </div>
          ) : (
            <div className="py-10 px-4 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                LPS Subscriber Excel Upload Tur
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                A chunga upload box-ah khian i LPS subscriber Excel file (.xls emaw .xlsx) thlang la, customer list leh a-la-carte channel thlanna a rawn in-load nghal ang.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Hming List zawng zawng - Customer Table */}
        {customers.length > 0 && (
          <div className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 shadow-xs">
            <CustomerTable
              customers={customers}
              onSelectCustomer={(id) => {
                setSelectedCustomerId(id);
                // Smooth scroll to top of selector if far down
                window.scrollTo({ top: 160, behavior: 'smooth' });
              }}
              onDeleteLine={handleDeleteLine}
              onDeleteCustomer={handleDeleteCustomer}
              onBatchDeleteCustomers={handleBatchDeleteCustomers}
              onRestoreCustomers={handleRestoreCustomers}
              selectedCustomerId={selectedCustomerId}
              basePrice={basePrice}
              availableChannels={availableChannels}
              subscriptionSettings={subscriptionSettings}
              onChangeSubscriptionSettings={setSubscriptionSettings}
              onBatchApplyChannels={handleBatchApplyChannels}
            />

            {/* Section 4: Grand Totals & Export Buttons */}
            <GrandTotalsBar
              totals={grandTotals}
              onExportSummary={handleExportSummary}
              onExportBulkRenew={handleExportBulkRenew}
              customTotalDeposit={customTotalDeposit}
              onUpdateDeposit={setCustomTotalDeposit}
            />
          </div>
        )}
      </main>

      {/* Channel & Rate List Modal */}
      <ChannelManagerModal
        isOpen={isChannelManagerOpen}
        onClose={() => setIsChannelManagerOpen(false)}
        channels={availableChannels}
        onUpdateChannels={handleUpdateChannels}
        onResetChannels={handleResetChannels}
        basePrice={basePrice}
        onUpdateBasePrice={handleUpdateBasePrice}
      />

      {/* Official 12-Column LPS Bulk Renew Modal */}
      <BulkRenewModal
        isOpen={isBulkRenewModalOpen}
        onClose={() => setIsBulkRenewModalOpen(false)}
        customers={customers}
        fileName={currentFileName || 'BulkPackageRenew.xls'}
        subscriptionSettings={subscriptionSettings}
      />

      {/* LPS Bill Chhut Dan & Calculator Modal */}
      <BillCalculatorModal
        isOpen={isBillCalculatorOpen}
        onClose={() => setIsBillCalculatorOpen(false)}
        currentTotals={grandTotals}
        currentAlacarteSum={currentAlacarteSum}
        customers={customers}
      />

      {/* Tutorial & Guide Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-[#212529] border-t border-[#343a40] py-3.5 px-4 text-center text-xs text-gray-400 font-medium">
        LPS Cable TV Subscriber Channel Management {activeFranchiseeName ? <>&nbsp;&bull;&nbsp; {activeFranchiseeName} </> : null}&nbsp;&bull;&nbsp; power by MobiTech
      </footer>
    </div>
  );
}
