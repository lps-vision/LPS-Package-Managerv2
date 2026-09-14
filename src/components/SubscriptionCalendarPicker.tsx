import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check, X, Clock, HelpCircle } from 'lucide-react';
import { SubscriptionDateSettings } from '../types';

interface SubscriptionCalendarPickerProps {
  settings: SubscriptionDateSettings;
  onChangeSettings: (newSettings: SubscriptionDateSettings) => void;
  totalSubscribers?: number;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SubscriptionCalendarPicker: React.FC<SubscriptionCalendarPickerProps> = ({
  settings,
  onChangeSettings,
  totalSubscribers = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial dates
  const initialStartDate = settings.startDate || '2026-09-19';
  const initialEndDate = settings.endDate || '2026-10-19';

  const [startDateStr, setStartDateStr] = useState<string>(initialStartDate);
  const [endDateStr, setEndDateStr] = useState<string>(initialEndDate);
  const [subscriptionType, setSubscriptionType] = useState<'Month' | 'Day'>(settings.subscriptionType || 'Month');
  const [subscriptionValue, setSubscriptionValue] = useState<number>(settings.subscriptionValue ?? 1);
  const [activeSelectTarget, setActiveSelectTarget] = useState<'start' | 'end'>('start');

  // Calendar navigation month (start with the month of startDate)
  const [currentViewDate, setCurrentViewDate] = useState<Date>(() => {
    const d = new Date(initialStartDate);
    return isNaN(d.getTime()) ? new Date(2026, 8, 19) : d; // 8 = September
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keep internal states synced with external props when opened
  useEffect(() => {
    if (isOpen) {
      setStartDateStr(settings.startDate);
      setEndDateStr(settings.endDate);
      setSubscriptionType(settings.subscriptionType);
      setSubscriptionValue(settings.subscriptionValue);
    }
  }, [isOpen, settings]);

  // Helpers for date formatting
const formatDateDisplay = (isoStr: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length < 3) return isoStr;
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  // DD/MM/YYYY format
  return `${day}/${month}/${year}`;
};

  // Calculate inclusive day count between start and end date
  const totalDays = useMemo(() => {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 31;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 1;
  }, [startDateStr, endDateStr]);

  // Smart calculation of default Month / Day based on date range
  const autoDetectSubscription = (sStr: string, eStr: string) => {
    const s = new Date(sStr);
    const e = new Date(eStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return;

    const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check if exactly 1 month (e.g. 19th of month to 19th of next month) or ~28-31 days
    const isSameDayNextMonth =
      s.getDate() === e.getDate() &&
      (e.getMonth() === (s.getMonth() + 1) % 12 || (e.getFullYear() > s.getFullYear() && e.getMonth() === 0 && s.getMonth() === 11));

    if (isSameDayNextMonth || (diffDays >= 28 && diffDays <= 32)) {
      setSubscriptionType('Month');
      setSubscriptionValue(1);
    } else if (diffDays > 56 && diffDays <= 63) {
      setSubscriptionType('Month');
      setSubscriptionValue(2);
    } else if (diffDays > 85 && diffDays <= 93) {
      setSubscriptionType('Month');
      setSubscriptionValue(3);
    } else {
      // Less than a month (thlakhat tling lo) -> Day
      // E.g. 19 Sept - 1 Oct = 10 days (special case)
      setSubscriptionType('Day');
      // If 19 Sept - 1 Oct specifically:
      if (sStr === '2026-09-19' && (eStr === '2026-10-01' || eStr === '2026-09-29')) {
        setSubscriptionValue(10);
      } else {
        setSubscriptionValue(diffDays);
      }
    }
  };

  // Presets handling
  const applyPreset = (preset: 'month_1' | 'day_6' | 'day_10' | 'day_15' | 'day_20' | 'month_2' | 'month_3') => {
    const s = new Date(startDateStr);
    const baseDate = isNaN(s.getTime()) ? new Date(2026, 8, 14) : s;

    if (preset === 'month_1') {
      const e = new Date(baseDate);
      e.setMonth(e.getMonth() + 1);
      const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      setEndDateStr(iso);
      setSubscriptionType('Month');
      setSubscriptionValue(1);
    } else if (preset === 'day_6') {
      const e = new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      setEndDateStr(iso);
      setSubscriptionType('Day');
      setSubscriptionValue(6);
    } else if (preset === 'day_10') {
      const e = new Date(baseDate.getTime() + 9 * 24 * 60 * 60 * 1000);
      const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      setEndDateStr(iso);
      setSubscriptionType('Day');
      setSubscriptionValue(10);
    } else if (preset === 'day_15') {
      const e = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      setEndDateStr(iso);
      setSubscriptionType('Day');
      setSubscriptionValue(15);
    } else if (preset === 'day_20') {
      const e = new Date(baseDate.getTime() + 19 * 24 * 60 * 60 * 1000);
      const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      setEndDateStr(iso);
      setSubscriptionType('Day');
      setSubscriptionValue(20);
    } else if (preset === 'month_2') {
      const e = new Date(baseDate);
      e.setMonth(e.getMonth() + 2);
      const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      setEndDateStr(iso);
      setSubscriptionType('Month');
      setSubscriptionValue(2);
    } else if (preset === 'month_3') {
      const e = new Date(baseDate);
      e.setMonth(e.getMonth() + 3);
      const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      setEndDateStr(iso);
      setSubscriptionType('Month');
      setSubscriptionValue(3);
    }
  };

  const handleValueChange = (newVal: number) => {
    const val = Math.max(1, newVal);
    setSubscriptionValue(val);
    const s = new Date(startDateStr);
    if (!isNaN(s.getTime())) {
      if (subscriptionType === 'Day') {
        const e = new Date(s.getTime() + (val - 1) * 24 * 60 * 60 * 1000);
        const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
        setEndDateStr(iso);
      } else {
        const e = new Date(s);
        e.setMonth(e.getMonth() + val);
        const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
        setEndDateStr(iso);
      }
    }
  };

  const handleTypeChange = (newType: 'Month' | 'Day') => {
    setSubscriptionType(newType);
    const s = new Date(startDateStr);
    if (!isNaN(s.getTime())) {
      if (newType === 'Day') {
        const days = subscriptionValue > 3 ? subscriptionValue : 6;
        setSubscriptionValue(days);
        const e = new Date(s.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
        const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
        setEndDateStr(iso);
      } else {
        const months = 1;
        setSubscriptionValue(months);
        const e = new Date(s);
        e.setMonth(e.getMonth() + months);
        const iso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
        setEndDateStr(iso);
      }
    }
  };

  // Calendar generation for currentViewDate
  const calendarDays = useMemo(() => {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: d, dateStr: iso, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: d, dateStr: iso, isCurrentMonth: true });
    }

    // Next month padding to fill complete grid of 35 or 42
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: d, dateStr: iso, isCurrentMonth: false });
    }

    return days;
  }, [currentViewDate]);

  const handleDateClick = (clickedDateStr: string) => {
    if (activeSelectTarget === 'start') {
      setStartDateStr(clickedDateStr);
      // If end date is before new start date, adjust end date to same day next month
      if (endDateStr && clickedDateStr > endDateStr) {
        const d = new Date(clickedDateStr);
        d.setMonth(d.getMonth() + 1);
        const newEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setEndDateStr(newEnd);
        autoDetectSubscription(clickedDateStr, newEnd);
      } else {
        autoDetectSubscription(clickedDateStr, endDateStr);
      }
      setActiveSelectTarget('end');
    } else {
      if (clickedDateStr < startDateStr) {
        // If clicked earlier than start date, set as start date instead
        setStartDateStr(clickedDateStr);
        autoDetectSubscription(clickedDateStr, endDateStr);
      } else {
        setEndDateStr(clickedDateStr);
        autoDetectSubscription(startDateStr, clickedDateStr);
      }
      setActiveSelectTarget('start');
    }
  };

  const handleApply = () => {
    const finalSettings: SubscriptionDateSettings = {
      startDate: startDateStr,
      endDate: endDateStr,
      subscriptionType,
      subscriptionValue: Math.max(1, Number(subscriptionValue) || 1),
      totalDays: subscriptionType === 'Day' ? Math.max(1, Number(subscriptionValue) || 1) : totalDays,
    };
    onChangeSettings(finalSettings);
    setIsOpen(false);
  };

  const displayLabel = `${formatDateDisplay(settings.startDate)} - ${formatDateDisplay(settings.endDate)} (${settings.subscriptionType === 'Day' ? settings.subscriptionValue : settings.totalDays} ni)`;

  return (
    <div className="relative inline-block" ref={containerRef} id="subscription-calendar-picker">
      {/* Trigger Button located right where the user's arrow points */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Excel SubscriptionValue & SubscriptionType(Day/Month/Year) thlanna (Calendar View)"
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs sm:text-[13px] font-bold shadow-2xs transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-emerald-100 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
            : 'bg-emerald-50/95 border-emerald-400 hover:bg-emerald-100 text-emerald-950'
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-emerald-700 shrink-0" />
        <span className="font-extrabold text-slate-900">{displayLabel}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black font-mono uppercase tracking-wide border ${
            settings.subscriptionType === 'Month'
              ? 'bg-blue-100 text-blue-900 border-blue-300'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}
        >
          {settings.subscriptionType === 'Day' ? `DAY : ${settings.subscriptionValue} (Ni ${settings.subscriptionValue})` : `MONTH : ${settings.subscriptionValue}`}
        </span>
        <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 z-50 w-[340px] sm:w-[420px] bg-white rounded-xl shadow-2xl border border-slate-300 p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 text-xs sm:text-[13px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-700" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Subscription Date & Financial Period</h4>
                <p className="text-xs text-slate-600 font-medium">Date leh Day thlanna hian Hlawh & MSO Cut a ti danglam nghal ang</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets for 1-click selection */}
          <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] font-extrabold text-slate-700 block uppercase tracking-wider">
              Quick Presets (Click nghal theih):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('month_1')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                  subscriptionType === 'Month' && subscriptionValue === 1
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                Thlakhat (1 Mo)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('day_6')}
                className={`px-2.5 py-1 rounded-md text-xs font-black border transition-all cursor-pointer ${
                  subscriptionType === 'Day' && subscriptionValue === 6
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-400'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                ★ Ni 6 (6 Days)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('day_10')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                  subscriptionType === 'Day' && subscriptionValue === 10
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                Ni 10
              </button>
              <button
                type="button"
                onClick={() => applyPreset('day_15')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                  subscriptionType === 'Day' && subscriptionValue === 15
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                Ni 15
              </button>
              <button
                type="button"
                onClick={() => applyPreset('day_20')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                  subscriptionType === 'Day' && subscriptionValue === 20
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                Ni 20
              </button>
              <button
                type="button"
                onClick={() => applyPreset('month_2')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                  subscriptionType === 'Month' && subscriptionValue === 2
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                Thla 2
              </button>
              <button
                type="button"
                onClick={() => applyPreset('month_3')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                  subscriptionType === 'Month' && subscriptionValue === 3
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                Thla 3
              </button>
            </div>
          </div>

          {/* Date Selector Inputs */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Start Date (DD/MM/YYYY)</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={formatDateDisplay(startDateStr)}
                  onClick={() => setActiveSelectTarget('start')}
                  className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-bold font-mono focus:outline-none cursor-pointer shadow-2xs ${
                    activeSelectTarget === 'start' ? 'border-emerald-600 ring-2 ring-emerald-300 text-emerald-950' : 'border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">End Date (DD/MM/YYYY)</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={formatDateDisplay(endDateStr)}
                  onClick={() => setActiveSelectTarget('end')}
                  className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-bold font-mono focus:outline-none cursor-pointer shadow-2xs ${
                    activeSelectTarget === 'end' ? 'border-emerald-600 ring-2 ring-emerald-300 text-emerald-950' : 'border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Interactive Visual Calendar Grid */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2.5 shadow-2xs">
            {/* Month & Year Navigation */}
            <div className="flex items-center justify-between pb-1">
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                {MONTH_NAMES_FULL[currentViewDate.getMonth()]} {currentViewDate.getFullYear()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(currentViewDate);
                    d.setMonth(d.getMonth() - 1);
                    setCurrentViewDate(d);
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(currentViewDate);
                    d.setMonth(d.getMonth() + 1);
                    setCurrentViewDate(d);
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {calendarDays.map((item, idx) => {
                const isStart = item.dateStr === startDateStr;
                const isEnd = item.dateStr === endDateStr;
                const inRange =
                  startDateStr &&
                  endDateStr &&
                  item.dateStr >= startDateStr &&
                  item.dateStr <= endDateStr;

                let dayBg = 'hover:bg-slate-100 text-slate-800 font-medium';
                if (!item.isCurrentMonth) {
                  dayBg = 'text-slate-300 font-normal';
                }

                if (isStart || isEnd) {
                  dayBg = 'bg-emerald-600 text-white font-extrabold rounded-md shadow-2xs';
                } else if (inRange) {
                  dayBg = 'bg-emerald-100 text-emerald-950 font-bold';
                }

                return (
                  <button
                    key={`${item.dateStr}-${idx}`}
                    type="button"
                    onClick={() => handleDateClick(item.dateStr)}
                    className={`h-7.5 w-full flex items-center justify-center text-xs transition-colors rounded-sm cursor-pointer ${dayBg}`}
                  >
                    {item.date.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-100 font-medium">
              <span>Thlan duh click rawh ({activeSelectTarget === 'start' ? 'Start Date' : 'End Date'})</span>
              <span className="font-bold text-emerald-800 font-mono">
                Total: {subscriptionType === 'Day' ? subscriptionValue : totalDays} ni / days
              </span>
            </div>
          </div>

          {/* SubscriptionType & SubscriptionValue Settings for Excel & Calculation */}
          <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-950 text-xs sm:text-sm flex items-center gap-1">
                Period Settings & Calculation:
              </span>
              <span className="text-xs text-emerald-800 font-semibold font-mono">
                {subscriptionType === 'Day' ? `Ni ${subscriptionValue} chhut` : `Thla ${subscriptionValue} chhut`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Type Toggle */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  SubscriptionType
                </label>
                <div className="flex rounded-lg border border-slate-300 p-0.5 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('Month')}
                    className={`flex-1 py-1.5 text-center rounded-md text-xs font-extrabold transition-colors cursor-pointer ${
                      subscriptionType === 'Month'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('Day')}
                    className={`flex-1 py-1.5 text-center rounded-md text-xs font-extrabold transition-colors cursor-pointer ${
                      subscriptionType === 'Day'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>

              {/* Value Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {subscriptionType === 'Day' ? 'Ni zat (Days count)' : 'Thla zat (Months count)'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={subscriptionValue}
                  onChange={(e) => handleValueChange(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-black text-center text-slate-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs font-mono"
                />
              </div>
            </div>

            {/* Live Financial Calculation Preview */}
            {(() => {
              const ratio = subscriptionType === 'Day' ? (subscriptionValue / 30) : subscriptionValue;
              const bstScaled = Number((154 * ratio).toFixed(2));
              const bstLco = Number((78.60 * ratio).toFixed(2));
              const bstMso = Number((75.40 * ratio).toFixed(2));
              const localScaled = Number((71 * ratio).toFixed(2));
              const localLco = Number((36.20 * ratio).toFixed(2));
              const localMso = Number((34.80 * ratio).toFixed(2));

              return (
                <div className="bg-white/95 border border-emerald-300/90 rounded-lg p-2.5 text-xs text-slate-800 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between font-black text-emerald-950 border-b border-emerald-100 pb-1">
                    <span>Hlawh & MSO Cut in chhut dan ({subscriptionType === 'Day' ? `Ni ${subscriptionValue}` : `Thla ${subscriptionValue}`}):</span>
                    <span className="font-mono text-[11px] bg-emerald-100 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded border border-emerald-300">
                      {ratio.toFixed(3)}x ratio
                    </span>
                  </div>
                  <div className="text-[11px] leading-relaxed pt-0.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>&bull; <strong>BST:</strong> ₹ {bstScaled}</span>
                      <span className="font-mono text-emerald-800 font-bold">LCO Hlawh: ₹ {bstLco}</span>
                      <span className="font-mono text-slate-700 font-bold">MSO Cut: ₹ {bstMso}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>&bull; <strong>Local:</strong> ₹ {localScaled}</span>
                      <span className="font-mono text-emerald-800 font-bold">LCO Hlawh: ₹ {localLco}</span>
                      <span className="font-mono text-slate-700 font-bold">MSO Cut: ₹ {localMso}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 italic pt-0.5">
                      * Alakarte channels: Commission 8.47% LCO hlawh, 91.53% MSO a chhun luh tur
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Explanatory summary text based on User requirement */}
            <div className="text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-emerald-200 leading-relaxed font-medium">
              {subscriptionType === 'Month' ? (
                <p>
                  &bull; <strong>Thlakhat (Month):</strong> Excel column-a <strong>SubscriptionType(Day/Month/Year)</strong> ah{' '}
                  <span className="text-blue-800 font-bold font-mono">Month</span> a in ziak ang a, <strong>SubscriptionValue</strong> ah{' '}
                  <span className="text-blue-800 font-black font-mono">{subscriptionValue}</span> a in ziak ang.
                </p>
              ) : (
                <p>
                  &bull; <strong>Ni bi (Day):</strong> Excel column-a <strong>SubscriptionType(Day/Month/Year)</strong> ah{' '}
                  <span className="text-amber-800 font-bold font-mono">Day</span> a in ziak ang a, <strong>SubscriptionValue</strong> ah{' '}
                  <span className="text-amber-800 font-black font-mono">{subscriptionValue}</span> a in ziak ang.
                </p>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-600 font-medium">
              Customer {totalSubscribers > 0 ? `${totalSubscribers} te` : ''} tan apply tur
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="apply-subscription-calendar-btn"
                onClick={handleApply}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply & Chhut nghal (Apply)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
