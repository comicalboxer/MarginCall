"use client";

import { useState } from "react";
import { CheckCircle, FileText, UploadCloud, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  apiBase: string;
  onScanUploaded: (enrichedRecords: any[]) => void;
};

export function ScannerUploadModal({ open, onClose, apiBase, onScanUploaded }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleProcessFile = async (file: File) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessCount(null);

    try {
      const text = await file.text();
      const resp = await fetch(`${apiBase}/api/v1/upload-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, file_text: text }),
      });

      if (!resp.ok) {
        throw new Error("Failed to process scan file.");
      }

      const data = await resp.json();
      const records = data.records || [];
      setSuccessCount(records.length);

      if (records.length > 0) {
        onScanUploaded(records);
      } else {
        setErrorMsg("No valid CVE findings detected in file.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error processing scan upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <UploadCloud className="h-5 w-5" />
            <h3 className="text-lg font-bold text-white">Vulnerability Scanner Upload</h3>
          </div>
          <button onClick={onClose} className="rounded hover:bg-slate-800 p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-slate-300">
          Upload exported CSV or JSON vulnerability reports from <b>Tenable Nessus</b>, <b>Qualys</b>, <b>Rapid7 Nexpose</b>, or <b>OpenVAS</b>.
          DefendFAIR will automatically enrich findings with live <b>FIRST EPSS</b> scores and <b>CISA KEV</b> threat intel.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-950/60"
          }`}
        >
          <FileText className="mb-3 h-10 w-10 text-cyan-400" />
          <p className="mb-1 text-sm font-medium text-white">
            Drag and drop your scan CSV or JSON file here
          </p>
          <p className="mb-4 text-xs text-slate-400">or select file from your computer</p>

          <label className="cursor-pointer rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400">
            Select File
            <input type="file" accept=".csv,.json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {loading && (
          <div className="mt-4 text-center text-xs text-cyan-300">
            Parsing findings & fetching live CISA/EPSS threat intelligence...
          </div>
        )}

        {successCount !== null && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4" />
            <span>Successfully imported and enriched <b>{successCount}</b> vulnerability asset finding(s).</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
