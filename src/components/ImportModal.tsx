import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Upload,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  FolderArchive,
  Layers,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  processUploadedFile,
  ParsedImportResult,
  getSampleJobsCSV,
  getSamplePersonnelCSV,
} from '../utils/fileImporter';
import JSZip from 'jszip';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const {
    jobs,
    workers,
    selectedDate,
    importData,
    exportZipArchive,
    exportScheduleCSV,
  } = useApp();

  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedImportResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [applySelectedDate, setApplySelectedDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await processUploadedFile(file, selectedDate, workers);
      setParseResult(result);
    } catch (err: any) {
      setErrorMessage(`Failed to process ${file.name}: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setParseResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!parseResult) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalJobs = parseResult.jobs;
      if (applySelectedDate && finalJobs.length > 0) {
        finalJobs = finalJobs.map((j) => ({ ...j, scheduledDate: selectedDate }));
      }

      const success = await importData({
        jobs: finalJobs.length > 0 ? finalJobs : undefined,
        workers: parseResult.workers.length > 0 ? parseResult.workers : undefined,
        settings: parseResult.settings,
        mode: importMode,
        fileName: parseResult.fileName,
      });

      if (success) {
        setSuccessMessage(
          `Successfully imported ${finalJobs.length} job(s) and ${parseResult.workers.length} personnel record(s) from "${parseResult.fileName}"!`
        );
        setTimeout(() => {
          handleReset();
          onClose();
        }, 1800);
      } else {
        setErrorMessage('Import failed. Please check server connection.');
      }
    } catch (err: any) {
      setErrorMessage(`Import error: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleDownloadSampleJobs = () => {
    const csv = getSampleJobsCSV(selectedDate);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sample_Jobs_Schedule_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSamplePersonnel = () => {
    const csv = getSamplePersonnelCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Sample_Field_Personnel_Roster.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleZip = async () => {
    const zip = new JSZip();
    zip.file(`daily_schedule_${selectedDate}.csv`, getSampleJobsCSV(selectedDate));
    zip.file('field_personnel_roster.csv', getSamplePersonnelCSV());
    zip.file(
      'README_SAMPLE.txt',
      `worksynch Sample ZIP Archive\nContains sample schedule and personnel CSV files ready for import.`
    );
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sample_Dispatch_Package_${selectedDate}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      id="import-file-zip-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#107c41] flex items-center justify-center text-white shadow-xs">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                Import File & ZIP Archive
              </h3>
              <p className="text-[11px] text-slate-300">
                Upload route schedules, personnel rosters, state backups, or .zip packages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error Processing File</p>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Import Completed</p>
                <p className="text-[11px] mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {!parseResult ? (
            
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-[#107c41] bg-emerald-50/70 scale-[0.99]'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.csv,.json,.tsv,.txt,application/zip,application/x-zip-compressed,text/csv,application/json"
                  onChange={handleFileInput}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#107c41] flex items-center justify-center shadow-xs">
                  {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-[#107c41] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-800">
                    {isProcessing ? 'Unpacking & analyzing file...' : 'Drop your File or ZIP Archive here'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Supports <span className="font-semibold text-slate-700">.ZIP</span> (archives with multiple CSV/JSON datasets),{' '}
                    <span className="font-semibold text-slate-700">.CSV</span> (route schedules & personnel rosters), and{' '}
                    <span className="font-semibold text-slate-700">.JSON</span> (system backups).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-lg bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Browse Files or ZIP
                </button>
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <FileArchive className="w-4 h-4 text-emerald-700" />
                    <span>ZIP Archives (.zip)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Unpacks all enclosed CSV/JSON files automatically, reconciling schedules and personnel.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                    <span>Spreadsheets (.csv)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Standard route job sheets (Stops, Codes, Clients, Specialists) or roster personnel lists.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <FileCode className="w-4 h-4 text-purple-700" />
                    <span>System Backup (.json)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Complete state snapshots containing jobs, personnel, coordinates, and system settings.
                  </p>
                </div>
              </div>

              
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-[#107c41]" />
                    <span>Sample Templates & Full ZIP Backups</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">1-click test files</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={handleDownloadSampleZip}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold shadow-2xs transition-colors text-[11px]"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-[#107c41]" />
                    <span>Download Sample ZIP Package</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleJobs}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold shadow-2xs transition-colors text-[11px]"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sample Jobs CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSamplePersonnel}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold shadow-2xs transition-colors text-[11px]"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sample Personnel CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportZipArchive}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-900 text-white font-semibold shadow-2xs transition-colors text-[11px] ml-auto"
                    title="Export all current application data as a complete ZIP archive"
                  >
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>Export Current System as ZIP</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            
            <div className="space-y-4">
              
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700">
                    {parseResult.fileType === 'zip' ? (
                      <FolderArchive className="w-4 h-4 text-emerald-700" />
                    ) : parseResult.fileType === 'csv' ? (
                      <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                    ) : (
                      <FileCode className="w-4 h-4 text-purple-700" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{parseResult.fileName}</span>
                    <span className="text-[11px] text-slate-500">
                      Type: <span className="uppercase font-semibold">{parseResult.fileType}</span> • Size:{' '}
                      {formatFileSize(parseResult.fileSize)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-200 text-slate-700 font-medium border border-slate-300 transition-colors text-[11px]"
                >
                  Choose Different File
                </button>
              </div>

              
              {parseResult.filesInsideZip && parseResult.filesInsideZip.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FolderArchive className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Archive Contents ({parseResult.filesInsideZip.length} files scanned)</span>
                    </span>
                    {parseResult.stats && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {parseResult.stats.validDataFiles} data file{parseResult.stats.validDataFiles !== 1 ? 's' : ''} parsed
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto text-xs">
                    {parseResult.filesInsideZip.map((entry, idx) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${entry.recordCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <div className="truncate">
                            <span className="font-mono text-slate-800 text-[11px] font-semibold truncate block">
                              {entry.name}
                            </span>
                            {entry.size > 0 && (
                              <span className="text-[10px] text-slate-400">
                                {formatFileSize(entry.size)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              entry.detectedType.includes('jobs')
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.detectedType.includes('workers')
                                ? 'bg-indigo-100 text-indigo-800'
                                : entry.detectedType.includes('state')
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {entry.detectedType.replace('_', ' ').toUpperCase()}
                          </span>
                          {entry.recordCount > 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                              {entry.recordCount} item{entry.recordCount > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                              skipped / non-tabular
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {parseResult.stats?.uniqueDatesFound && parseResult.stats.uniqueDatesFound.length > 0 && (
                    <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-700">Dates detected in archive:</span>
                      {parseResult.stats.uniqueDatesFound.map((d) => (
                        <span key={d} className="px-1.5 py-0.2 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-800">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-lg">
                  <span className="text-[11px] font-semibold text-emerald-900 block">Jobs to Import</span>
                  <span className="text-xl font-bold text-emerald-900">{parseResult.jobs.length}</span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">Route appointments</span>
                </div>

                <div className="p-3 bg-indigo-50/80 border border-indigo-300 rounded-lg">
                  <span className="text-[11px] font-semibold text-indigo-900 block">Personnel to Import</span>
                  <span className="text-xl font-bold text-indigo-900">{parseResult.workers.length}</span>
                  <span className="text-[10px] text-indigo-700 block mt-0.5">Specialists & drivers</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-semibold text-slate-800 block">System Settings</span>
                  <span className="text-sm font-bold text-slate-900">
                    {parseResult.settings ? 'Detected' : 'Default'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {parseResult.settings ? 'Configurations included' : 'Keeps active settings'}
                  </span>
                </div>
              </div>

              
              <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg space-y-3 text-xs">
                <span className="font-bold text-slate-900 block">Import Mode & Options</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      importMode === 'merge'
                        ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-[#107c41] focus:ring-[#107c41]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Merge & Update (Recommended)</span>
                      <span className="text-[11px] text-slate-600 block mt-0.5 leading-snug">
                        Appends new jobs and personnel. Updates any records with matching IDs/codes while keeping existing data intact.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      importMode === 'replace'
                        ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-400'
                        : 'bg-white border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Replace All Current Records</span>
                      <span className="text-[11px] text-slate-600 block mt-0.5 leading-snug">
                        Wipes current dataset and replaces it with the contents of this import file or ZIP snapshot.
                      </span>
                    </div>
                  </label>
                </div>

                {parseResult.jobs.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block text-[11px]">
                        Target Schedule Date for Imported Jobs
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {applySelectedDate
                          ? `Assign all jobs to current view date (${selectedDate})`
                          : 'Preserve dates defined in file rows'}
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applySelectedDate}
                        onChange={(e) => setApplySelectedDate(e.target.checked)}
                        className="rounded text-[#107c41] focus:ring-[#107c41]"
                      />
                      <span className="text-[11px]">Assign all to {selectedDate}</span>
                    </label>
                  </div>
                )}
              </div>

              
              {parseResult.jobs.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>Jobs Preview ({parseResult.jobs.length} total)</span>
                    <span className="text-[10px] text-slate-500 font-normal">First 5 records shown</span>
                  </h5>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-1.5 px-2">Code</th>
                          <th className="py-1.5 px-2">Title</th>
                          <th className="py-1.5 px-2">Client</th>
                          <th className="py-1.5 px-2">Date</th>
                          <th className="py-1.5 px-2">Priority</th>
                          <th className="py-1.5 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-normal text-[11px]">
                        {parseResult.jobs.slice(0, 5).map((j, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-mono font-bold text-emerald-900">{j.code}</td>
                            <td className="py-1.5 px-2 truncate max-w-[160px]">{j.title}</td>
                            <td className="py-1.5 px-2 truncate max-w-[120px]">{j.clientName}</td>
                            <td className="py-1.5 px-2 font-mono">{j.scheduledDate}</td>
                            <td className="py-1.5 px-2 capitalize">{j.priority}</td>
                            <td className="py-1.5 px-2 capitalize">{j.status === 'en_route' ? 'In transit' : j.status.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {parseResult.workers.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>Personnel Preview ({parseResult.workers.length} total)</span>
                    <span className="text-[10px] text-slate-500 font-normal">First 5 records shown</span>
                  </h5>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-1.5 px-2">Name</th>
                          <th className="py-1.5 px-2">Role</th>
                          <th className="py-1.5 px-2">Designation / Title</th>
                          <th className="py-1.5 px-2">Phone</th>
                          <th className="py-1.5 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-normal text-[11px]">
                        {parseResult.workers.slice(0, 5).map((w, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-bold text-slate-900">{w.name}</td>
                            <td className="py-1.5 px-2 capitalize font-semibold text-slate-700">{w.role}</td>
                            <td className="py-1.5 px-2 truncate max-w-[180px]">{w.roleTitle || 'Field Specialist'}</td>
                            <td className="py-1.5 px-2 font-mono">{w.phone}</td>
                            <td className="py-1.5 px-2 capitalize">{w.status === 'en_route' ? 'In transit' : w.status.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 transition-colors"
          >
            Cancel
          </button>

          {parseResult && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
              >
                Clear
              </button>
              <button
                id="btn-confirm-import-data"
                type="button"
                onClick={handleExecuteImport}
                disabled={isSubmitting || (parseResult.jobs.length === 0 && parseResult.workers.length === 0)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#107c41] hover:bg-[#0b5c30] text-white font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Importing & Syncing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      Confirm & Import ({parseResult.jobs.length + parseResult.workers.length} items)
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
