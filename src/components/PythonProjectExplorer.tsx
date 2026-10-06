import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Folder, 
  Layers, 
  ExternalLink,
  Cpu
} from 'lucide-react';
import { PYTHON_FILES } from '../pythonProjectData';

export const PythonProjectExplorer: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const activeFile = PYTHON_FILES[selectedFileIndex] || PYTHON_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('touchless-ppt-controller');

      if (rootFolder) {
        PYTHON_FILES.forEach((f) => {
          rootFolder.file(f.path, f.content);
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'touchless-ppt-controller.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Explorer Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Python 3.11 Source Code Hub
            </h3>
            <p className="text-xs text-slate-400">
              OpenCV + MediaPipe + PyAutoGUI standalone native implementation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy File'}</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating ZIP...' : 'Download Project (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: File Sidebar + Code Preview */}
      <div className="flex flex-col md:flex-row min-h-[460px]">
        {/* File Tree List */}
        <div className="w-full md:w-64 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800/80 p-3 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
            Project Files
          </div>
          {PYTHON_FILES.map((file, idx) => (
            <button
              key={file.path}
              onClick={() => setSelectedFileIndex(idx)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                idx === selectedFileIndex
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{file.path}</span>
            </button>
          ))}

          {/* Quick Terminal Guide */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 px-2">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">
              RUN LOCALLY:
            </span>
            <div className="p-2 rounded bg-black/60 border border-slate-800 text-[10px] font-mono text-emerald-400 select-all">
              pip install -r requirements.txt<br/>
              python main.py
            </div>
          </div>
        </div>

        {/* Code Content View */}
        <div className="flex-1 flex flex-col bg-slate-950/90 overflow-hidden">
          {/* File Header */}
          <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>{activeFile.path}</span>
            <span className="text-[11px] text-slate-500">{activeFile.content.split('\n').length} lines</span>
          </div>

          {/* Code Body */}
          <div className="flex-1 p-4 overflow-auto max-h-[440px] font-mono text-xs text-slate-300 leading-relaxed bg-black/40">
            <pre className="whitespace-pre">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
