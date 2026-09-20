import React, { useState } from 'react';
import { X, Plus, Search, Trash2, RotateCcw, Upload, Download, CheckCircle, Info } from 'lucide-react';
import { ChannelItem } from '../types';
import { BST_PRICE, LOCAL_LCO_SHARE, ALACARTE_LCO_COMMISSION_PERCENT } from '../data/defaultChannels';
import { parseChannelPriceExcel, matchChannelSearch } from '../utils/excelParser';
import { exportChannelRateTemplateExcel } from '../utils/excelExporter';

interface ChannelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChannelItem[];
  onUpdateChannels: (channels: ChannelItem[]) => void;
  onResetChannels: () => void;
  basePrice: number;
  onUpdateBasePrice: (price: number) => void;
}

export const ChannelManagerModal: React.FC<ChannelManagerModalProps> = ({
  isOpen,
  onClose,
  channels,
  onUpdateChannels,
  onResetChannels,
  basePrice,
  onUpdateBasePrice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPrice, setNewChannelPrice] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('Sports');
  const [newIsHd, setNewIsHd] = useState(false);
  const [basePriceInput, setBasePriceInput] = useState(basePrice.toString());
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const filteredChannels = channels.filter(
    (ch) =>
      matchChannelSearch(ch.name, searchTerm, ch.category) ||
      ch.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const price = parseFloat(newChannelPrice) || 0;
    const newCh: ChannelItem = {
      id: `custom-${Date.now()}`,
      name: newChannelName.trim(),
      price: Number(price.toFixed(2)),
      category: newChannelCategory,
      isHd: newIsHd,
    };

    onUpdateChannels([newCh, ...channels]);
    setNewChannelName('');
    setNewChannelPrice('');
    setNewIsHd(false);
  };

  const handleDeleteChannel = (id: string) => {
    onUpdateChannels(channels.filter((ch) => ch.id !== id));
  };

  const handlePriceChange = (id: string, priceStr: string) => {
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price >= 0) {
      onUpdateChannels(
        channels.map((ch) => (ch.id === id ? { ...ch, price: Number(price.toFixed(2)) } : ch))
      );
    }
  };

  const handleBasePriceSave = () => {
    const p = parseFloat(basePriceInput);
    if (!isNaN(p) && p >= 0) {
      onUpdateBasePrice(Number(p.toFixed(2)));
    }
  };

  // Upload custom channel list from Excel (.xlsx/.xls/.csv)
  const handleUploadChannelList = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const parsedChannels = await parseChannelPriceExcel(file);
      
      // Merge: Update price for matching channels, append new channels
      const channelMap = new Map<string, ChannelItem>();
      for (const ch of channels) {
        channelMap.set(ch.name.toLowerCase().trim(), { ...ch });
      }
      for (const ch of parsedChannels) {
        channelMap.set(ch.name.toLowerCase().trim(), ch);
      }

      const merged = Array.from(channelMap.values());
      onUpdateChannels(merged);
      setUploadMessage(`${parsedChannels.length} channels rate upload hlawhtling a ni e! Total: ${merged.length} channels.`);
    } catch (err) {
      setUploadMessage('Channel list upload error: ' + (err as Error).message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    await exportChannelRateTemplateExcel(channels, 'LPS_Channel_Rate_Template.xls');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#212529] text-white border-b border-[#343a40] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              LPS Channel Rate & Package Settings
            </h3>
            <p className="text-xs text-gray-400">
              PACK-1 (BST), Local LCO share, leh A-la-carte channel rate enfiahna & upload-na
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Rate Policy Info Card */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <Info className="w-4 h-4 text-amber-600" />
              <span>LPS Channel & Share Policy:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-700">
              <div className="bg-white p-2.5 rounded border border-amber-100">
                <div className="font-semibold text-gray-900">1. PACK-1 (BST) (Mandatory)</div>
                <div className="text-gray-900 font-medium">₹ {BST_PRICE.toFixed(2)}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">LCO: ₹ 78.60 (51.04%) &bull; MSO: ₹ 75.40</div>
              </div>
              <div className="bg-white p-2.5 rounded border border-amber-100">
                <div className="font-semibold text-gray-900">2. Local Pack</div>
                <div className="text-gray-900 font-medium">₹ 71.00</div>
                <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">LCO: ₹ 36.20 (50.99%) &bull; MSO: ₹ 34.80</div>
              </div>
              <div className="bg-white p-2.5 rounded border border-amber-100">
                <div className="font-semibold text-gray-900">3. A-la-carte Channels</div>
                <div className="text-emerald-700 font-medium">{ALACARTE_LCO_COMMISSION_PERCENT}% LCO Share</div>
                <div className="text-[10px] text-gray-600 mt-0.5">MSO Cut: 91.53%</div>
              </div>
            </div>
            <div className="text-[11px] text-amber-800 pt-1">
              * Note: Column F-ah automatic-in <strong>PACK-1 (BST)</strong>-ah a inthlak vek a ni. Base pack pumpui = <strong>₹ {basePrice.toFixed(2)}</strong> (PACK-1 (BST) 154 + Local 71).
            </div>
          </div>

          {/* Base Pack Price Adjustment */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-gray-900 block">
                Base Package Rate (PACK-1 (BST) + Local)
              </span>
              <span className="text-xs text-gray-500">
                LPS standard base monthly rate: ₹ 154 (PACK-1 (BST)) + ₹ 71 (Local) = ₹ 225.00
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={basePriceInput}
                onChange={(e) => setBasePriceInput(e.target.value)}
                className="w-24 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md font-mono"
              />
              <button
                type="button"
                onClick={handleBasePriceSave}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                Save Base
              </button>
            </div>
          </div>

          {/* Upload Channel Rate File (.xlsx/.csv) Section */}
          <div className="bg-red-50/50 border border-red-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                  Channel Rate Excel / CSV Upload-na
                </span>
                <span className="text-xs text-gray-600">
                  Channel a-la-carte price list (.xlsx, .xls, .csv) upload rawh
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                  <span>Download Template (.xls)</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md cursor-pointer shadow-xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload Channel Price File (.xls / .xlsx)'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadChannelList}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {uploadMessage && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{uploadMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Add New Channel Manually */}
          <form onSubmit={handleAddChannel} className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-3">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Channel Thar Dah Belhna (Manual)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Channel Name (e.g. Star Sports 3)"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Rate Pangngai (₹) (e.g. 35.40)"
                value={newChannelPrice}
                onChange={(e) => setNewChannelPrice(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md font-mono"
                required
              />
              <select
                value={newChannelCategory}
                onChange={(e) => setNewChannelCategory(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-md text-gray-700"
              >
                <option value="Sports">Sports</option>
                <option value="Infotainment">Infotainment</option>
                <option value="News">News</option>
                <option value="Movies">Movies</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Kids">Kids</option>
                <option value="Music">Music</option>
                <option value="Local/Mizo">Local/Mizo</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Live Commission Split Preview for entered price */}
            {parseFloat(newChannelPrice) > 0 && (
              <div className="text-[11px] bg-emerald-50 border border-emerald-200 rounded p-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-950 font-medium">
                <span>Rate Pangngai: <strong>₹ {parseFloat(newChannelPrice).toFixed(2)}</strong></span>
                <span className="text-emerald-700">LCO Chan (8.47%): <strong>₹ {(parseFloat(newChannelPrice) * 0.0847).toFixed(2)}</strong></span>
                <span className="text-gray-700">In Cut Zat (91.53%): <strong>₹ {(parseFloat(newChannelPrice) - parseFloat(newChannelPrice) * 0.0847).toFixed(2)}</strong></span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsHd}
                  onChange={(e) => setNewIsHd(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>HD Channel a ni</span>
              </label>

              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Dah belh rawh
              </button>
            </div>
          </form>

          {/* Channel List Table Header & Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Channel zawnna (e.g. Ten 1, Star Sports, Discovery)..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-md focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={onResetChannels}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700 sticky top-0 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-3">Channel Name ({filteredChannels.length})</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right" title="Broadcaster Rate Pangngai (with GST)">Rate Pangngai</th>
                    <th className="py-2 px-3 text-right text-emerald-800" title="8.47% LCO Chan / Hlawh">LCO Chan (8.47%)</th>
                    <th className="py-2 px-3 text-right text-gray-700" title="91.53% MSO-a in cut zat tur">In Cut Zat (91.53%)</th>
                    <th className="py-2 px-2 text-center w-10">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredChannels.map((ch) => {
                    const lcoShare = Number((ch.price * 0.0847).toFixed(2));
                    const msoCut = Number((ch.price - lcoShare).toFixed(2));
                    return (
                      <tr key={ch.id} className="hover:bg-gray-50/80">
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {ch.name}
                          {ch.isHd && (
                            <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-blue-100 text-blue-800 rounded font-bold">
                              HD
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-500">{ch.category}</td>
                        <td className="py-1 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={ch.price}
                            onChange={(e) => handlePriceChange(ch.id, e.target.value)}
                            title="Rate pangngai thlak rawh"
                            className="w-20 px-1.5 py-0.5 text-xs text-right border border-gray-300 rounded font-mono font-semibold text-gray-900 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700 bg-emerald-50/40">
                          ₹ {lcoShare.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-gray-700">
                          ₹ {msoCut.toFixed(2)}
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteChannel(ch.id)}
                            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#007bff] hover:bg-[#0069d9] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

