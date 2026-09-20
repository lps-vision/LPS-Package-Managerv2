import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Trash2,
  Database,
  Plus,
  X,
} from 'lucide-react';
import { DocumentTab } from '../types';

interface ExcelUploadProps {
  currentFileName: string | null;
  fileSizeText?: string;
  onFileUpload: (file: File) => void;
  onUploadNewTab?: (file: File) => void;
  onClearFile: () => void;
  isLoading?: boolean;
  tabs?: DocumentTab[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({
  currentFileName,
  fileSizeText,
  onFileUpload,
  onUploadNewTab,
  onClearFile,
  isLoading = false,
  tabs = [],
  activeTabId,
  onSelectTab,
  onCloseTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newTabFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file, false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndUpload(file, false);
      e.target.value = '';
    }
  };

  const handleNewTabFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndUpload(file, true);
      e.target.value = '';
    }
  };

  const validateAndUpload = (file: File, isNewTab: boolean = false) => {
    const validExtensions = ['.xls', '.xlsx', '.csv'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isValid) {
      setUploadError('Khawngaihin Excel file (.xls emaw .xlsx emaw .csv) chauh upload rawh.');
      return;
    }

    if (isNewTab && onUploadNewTab) {
      onUploadNewTab(file);
    } else {
      onFileUpload(file);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
          Subscriber Excel Upload
        </label>
        <span className="text-xs text-slate-600 font-bold font-mono">
          Format: .xls, .xlsx, .csv
        </span>
      </div>

      {/* Main input (replaces current tab) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        id="excel-file-input"
      />

      {/* New Tab input (opens new Excel in a new tab) */}
      <input
        type="file"
        ref={newTabFileInputRef}
        onChange={handleNewTabFileChange}
        accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        id="excel-new-tab-input"
      />

      {currentFileName ? (
        /* Display uploaded file chip with tabs and persistence indicator */
        <div className="w-full bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-xl p-3.5 sm:p-4 transition-all flex flex-col gap-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#212529] text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-slate-950 truncate max-w-[240px] sm:max-w-md font-mono">
                    {currentFileName}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    Auto-saved
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-600 mt-1 font-medium leading-relaxed">
                  {fileSizeText || 'File loaded'}
                </p>
              </div>
            </div>

            {/* Buttons: Upload New Document & Remove Files */}
            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload another file to replace current tab"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-[13px] font-bold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs flex-1 sm:flex-none"
              >
                <FilePlus className="w-4 h-4 text-slate-600" />
                <span>Upload New Document</span>
              </button>
              <button
                type="button"
                id="remove-uploaded-file-btn"
                onClick={onClearFile}
                title="Remove files & reset data"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-[13px] font-black text-white bg-[#dc3545] hover:bg-[#c82333] rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove files</span>
              </button>
            </div>
          </div>

          {/* Document Tabs Bar */}
          {tabs.length > 0 && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-600 mr-1 shrink-0">Excel Tabs:</span>
                {tabs.map((tab, index) => {
                  const isActive = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => onSelectTab && onSelectTab(tab.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                      title={tab.fileName}
                    >
                      <FileSpreadsheet
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {tab.fileName || `Tab ${index + 1}`}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isActive
                            ? 'bg-emerald-900 text-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tab.customers.length}
                      </span>
                      {tabs.length > 1 && onCloseTab && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseTab(tab.id);
                          }}
                          className={`p-0.5 rounded hover:bg-red-600 hover:text-white transition-colors ml-0.5 cursor-pointer ${
                            isActive ? 'text-slate-400' : 'text-slate-400'
                          }`}
                          title="Close Tab"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fixed in the right corner, so it never shifts when tabs change */}
              <button
                type="button"
                id="tab-bar-new-tab-btn"
                onClick={() => newTabFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-dashed border-emerald-400 hover:border-emerald-600 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Excel thar hawn belhna (New Tab)"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>New Tab</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Drag-and-drop dropzone when empty */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/60'
              : 'border-slate-300 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-100/70 flex items-center justify-center text-emerald-800 mb-3 shadow-xs">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-950 mb-1">
            LPS Subscriber Excel (.xls / .xlsx) upload rawh
          </p>
          <p className="text-xs sm:text-[13px] text-slate-600 max-w-sm font-medium leading-relaxed">
            Drag and drop your file here, or click to browse. Supported columns: Name, SubscriberCode, STBNo, VCNo, Type, PackageChannelName.
          </p>
        </div>
      )}

      {uploadError && (
        <div className="mt-2 text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
};

