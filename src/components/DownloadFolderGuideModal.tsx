import React, { useState } from 'react';
import {
  FolderDown,
  Settings,
  CheckCircle2,
  HelpCircle,
  X,
  Monitor,
  FolderCheck,
  Info,
  ChevronRight,
} from 'lucide-react';

interface DownloadFolderGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadFolderGuideModal: React.FC<DownloadFolderGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeBrowserTab, setActiveBrowserTab] = useState<'chrome' | 'edge' | 'firefox'>('chrome');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        id="download-folder-guide-modal"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#212529] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Download Folder Thlanna (Save As) Guide
              </h2>
              <p className="text-xs text-amber-300 font-medium">
                Engvangin nge computer thenkhat-ah Folder thlanna a awm mai loh?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
          {/* Explanation Callout */}
          <div className="bg-amber-50 border border-amber-300/90 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-950">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <div className="font-bold text-amber-900 text-sm">
                I computer-ah a awm a, computer dangah a awm loh chhan:
              </div>
              <p className="text-amber-900 leading-relaxed font-medium">
                <strong>Google Chrome</strong> leh <strong>Microsoft Edge</strong> desktop version thar chauhvin website chhung atanga direct-a Windows / Mac Folder thlanna (File System Access API) hi an support a. Computer dangah <em>Firefox, Safari, emaw browser hlui</em> an hman chuan, browser-in a phal loh avangin an computer-a <strong>Downloads</strong> folder-ah a in-save tlang nghal mai thin a ni.
              </p>
              <p className="text-amber-900 leading-relaxed font-medium">
                Mahse, <strong>computer engpawh</strong> ah Minute 1 pawh tling lovah an browser-ah <strong>"Ask where to save each file"</strong> tih hi an ON chuan, file download rual apiangin khawi folder-ah nge dah tur (Desktop, D Drive, LPS folder, etc.) tih a zawt ziah tawh dawn a ni!
              </p>
            </div>
          </div>

          {/* Browser Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Khawi browser nge an hman thlang rawh:
            </label>
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveBrowserTab('chrome')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeBrowserTab === 'chrome'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Google Chrome</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium">
                  Tlanglawn ber
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBrowserTab('edge')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeBrowserTab === 'edge'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Microsoft Edge</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBrowserTab('firefox')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeBrowserTab === 'firefox'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Mozilla Firefox</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          {activeBrowserTab === 'chrome' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Monitor className="w-4 h-4 text-blue-600" />
                <span>Google Chrome-a Folder thlanna (Save As) ON dan:</span>
              </div>

              <ol className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="leading-relaxed">
                    Google Chrome chung dinglam kil-a <strong>chhunhan thum (⋮)</strong> kha click la, <strong>Settings</strong> ah lut rawh.
                    <div className="text-slate-500 text-xs mt-0.5">
                      (A rang zawngin: Chrome address bar-ah <code className="bg-slate-200 px-1.5 py-0.5 rounded text-blue-700 font-mono">chrome://settings/downloads</code> chhu la Enter hmet rawh).
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="leading-relaxed">
                    Dinglam menu-ah <strong>Downloads</strong> tih kha thlang rawh.
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="leading-relaxed">
                    <strong className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      "Ask where to save each file before downloading"
                    </strong>{' '}
                    tih switch kha <strong>ON</strong> (hring) rawh.
                  </div>
                </li>
              </ol>

              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>A zo der e!</strong> Tun atang chuan Excel i export rual apiangin khawi folder-ah nge i dah duh tih Windows / Mac popup a rawn inhawng ziah tawh ang.
                </span>
              </div>
            </div>
          )}

          {activeBrowserTab === 'edge' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Monitor className="w-4 h-4 text-blue-600" />
                <span>Microsoft Edge-a Folder thlanna (Save As) ON dan:</span>
              </div>

              <ol className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="leading-relaxed">
                    Edge chung dinglama <strong>chhunhan thum (...)</strong> click la, <strong>Settings</strong> ah lut rawh.
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="leading-relaxed">
                    Dinglam menu-ah <strong>Downloads</strong> tih thlang rawh.
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="leading-relaxed">
                    <strong className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      "Ask me what to do with each download"
                    </strong>{' '}
                    tih switch kha <strong>ON</strong> rawh.
                  </div>
                </li>
              </ol>

              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>A fel e!</strong> Download apiangin 'Save As' thlan theihna a rawn lang ziah tawh ang.
                </span>
              </div>
            </div>
          )}

          {activeBrowserTab === 'firefox' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Monitor className="w-4 h-4 text-blue-600" />
                <span>Mozilla Firefox-a Folder thlanna ON dan:</span>
              </div>

              <ol className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="leading-relaxed">
                    Firefox chung dinglama <strong>menu (≡)</strong> click la, <strong>Settings</strong> ah lut rawh.
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="leading-relaxed">
                    <strong>General</strong> tab-ah khan hnuai lamah scroll la, <strong>Files and Applications &gt; Downloads</strong> section-ah lut rawh.
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="leading-relaxed">
                    <strong className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      "Always ask you where to save files"
                    </strong>{' '}
                    tih radio option kha tick rawh.
                  </div>
                </li>
              </ol>

              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>A zo e!</strong> Firefox-ah pawh khawi folder-ah nge save tur tih popup a lang ziah tawh ang.
                </span>
              </div>
            </div>
          )}

          {/* Quick Note about Downloads Folder */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-slate-800">
              Folder thlanna lo lang kher lo mahse:
            </span>
            <span>
              I computer File Explorer-a <strong>Downloads</strong> folder-ah Excel file chu a in-save fel thlap thin tho a ni.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            Ka Hrethiam E (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
