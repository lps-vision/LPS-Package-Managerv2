import React, { useState } from 'react';
import { X, BookOpen, Download, Copy, Check, FileText } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_CONTENT = `LPS SUBSCRIBER DATA CONVERTER - TUTORIAL

He application hi LPS Subscriber raw data Excel file atanga Bulk Renew Excel file siam chhuah nana hman a ni.

1. EXCEL FILE UPLOAD DAN:
   - Dashboard-ah "Upload Subscriber Excel" box-ah khian i LPS Subscriber Raw Data (Excel file .xls / .xlsx / .csv) kha thlang la emaw drag and drop rawh.
   - File i upload hnuah customer hming list fel fai takin a lo lang nghal ang.
   - I upload fel tawh chuan browser i khar (close) hnu pawhin "Remove files" button i hmeh loh chuan data a bo lo ang.

2. CUSTOMER TINTE CHANNEL LEH PLAN PRESET THLAN DAN:
   - Customer hming i click khan a chung / sidebar-ah an details a lo lang ang.
   - Quick Plan Presets (₹ 300, ₹ 350, ₹ 50, ₹ 60, ₹ 100, ₹ 450, ₹ 360):
     * "₹ 450 Plan (350 HD + 100 Sports HD)": Hemi button i hmeh hian 300 SD leh 60 SD hlui zawng zawng a paih fai vek ang a, 350 HD leh 100 Sports HD chauh a lut nghal ang.
     * "₹ 360 Plan (300 SD + 60 Sports SD)": 350 HD leh 100 HD hlui a paih fai vek ang a, 300 leh 60 chauh a lut ang.
     * 300 leh 350 hi an in-replace tawn: 350 i hmeh chuan 300 a bo nghal.
     * 60 leh 100 hi an in-replace tawn: 100 i hmeh chuan 60 a bo nghal.
     * Plan thar i thlan apiang hian auto-save a ni a, Excel download i tih hunah channel hlui (300 leh 60) kha bo vekin, save thar (350 leh 100) chauh Excel-ah a lut ang.
   - Channel lak belh duh dang a awm chuan Search bar hmangin channel duh te i zawng belh thei a, "X" hmetin i paih leh thei.
   - A-la-carte channel rate-ah hian LCO share chu 8.47% a ni a, MSO/Broadcaster cut chu 91.53% a ni.

3. SUBSCRIPTION DATE & VALUE (CALENDAR) HMAN DAN:
   - Dashboard-ah "Calendar" button (Start Date leh End Date in-ziakna) kha hmet la.
   - Start Date (Renew tan ni tur) leh End Date (Renew tawp ni tur) kha thlang rawh (DD/MM/YYYY format-in a lang ang).
   - Subscription Type (Month/Day) leh Value kha a auto-detect nghal ang:
     * Thlakhat a tlin chuan: SubscriptionType = "Month", Value = 1
     * Thlakhat a tling lo a nih chuan: SubscriptionType = "Day", Value = [Ni zat]
   - "Apply" hmet la, tichuan Bulk Renew Excel i download hunah LPS Portal-in a phut ang thlapin column zawng zawng a in-fill nghal vek ang.

4. EXCEL EXPORT (LPS PORTAL-A HMAN TUR):
   - I duhtawka channel i thlan fel hnuah a hnuai bera button sen "LPS Bulk Renew Format Export (12-Columns)" kha hmet la.
   - Bulk Renew preview modal a lo lang ang a, "Download 12-Column Bulk Renew Excel (.xls)" tih i hmeh khan file chu .xls format (LPS Portal-in a pawm theih ngei tur)-in i khawl-ah a lo download ang.
   - He file download (.xls) hi LPS Operator Portal-ah "Bulk Package Renew" tih-ah upload/import nghal tawp tur a ni e.

PRICING & SHARE LEH HLAWH CHHUT DAN:
- BST Pack (₹ 154): LCO Share hi ₹ 78.60 a ni a, MSO Cut hi ₹ 75.40 a ni.
- LOCAL Pack (₹ 71): LCO Share hi ₹ 36.20 a ni a, MSO Cut hi ₹ 34.80 a ni.
- A-la-carte: Channel rate atangin 8.47% chu LCO hlawh a ni a, a bak 91.53% chu MSO/Broadcaster chan a ni.
`;

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TUTORIAL_CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([TUTORIAL_CONTENT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Tutorial.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                LPS Package Manager - Tutorial & Hrilhfiahna
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Hman dan leh zawn dan kaihhruaina (Tutorial.txt)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm leading-relaxed">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[480px] overflow-y-auto">
            {TUTORIAL_CONTENT}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            Tutorial.txt file-in download emaw copy theih a ni e.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Tutorial.txt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
