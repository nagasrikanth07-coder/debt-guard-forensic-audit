import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - using a more reliable CDN path for version 5.x
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFUploaderProps {
  onTextExtracted: (text: string) => void;
  isLoading: boolean;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ onTextExtracted, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    console.log("File selected:", file.name, file.type, file.size);
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      try {
        console.log("Loading PDF document...");
        const loadingTask = pdfjsLib.getDocument({
          data: typedArray,
          useWorkerFetch: true,
          isEvalSupported: false,
        });
        const pdf = await loadingTask.promise;
        console.log("PDF loaded, pages:", pdf.numPages);
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += `[PAGE ${i}]\n${pageText}\n\n`;
        }
        console.log("Text extraction complete");
        onTextExtracted(fullText);
      } catch (err: any) {
        console.error('Error reading PDF:', err);
        alert(`Failed to read PDF content: ${err.message || 'Unknown error'}`);
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      alert("Failed to read file");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative h-64 w-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all ${
        dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept=".pdf"
        onChange={handleChange}
        disabled={isLoading}
      />
      
      <div className="text-center p-6">
        <div className="mb-4 flex justify-center">
          <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-700">
          {isLoading ? 'Processing Document...' : 'Drop your Loan Statement PDF here'}
        </p>
        <p className="text-sm text-slate-500 mt-1">or click to browse files</p>
      </div>
    </div>
  );
};
