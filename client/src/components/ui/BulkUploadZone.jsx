import React, { useState, useRef } from "react";
import { Upload, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export const BulkUploadZone = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    const validExts = ['json', 'csv', 'txt', 'pdf', 'docx'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!validExts.includes(ext)) {
      return toast.error("Invalid file format. Please use JSON, CSV, TXT, PDF, or DOCX.");
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiClient.post("/api/uploads/parse", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        toast.success(`Extracted ${res.data.questions.length} questions!`);
        onUploadSuccess(res.data.questions);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to parse file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div 
        className={`w-full p-6 border-2 border-dashed sketchy-shape text-center transition-colors cursor-pointer ${isDragging ? 'border-[#FF99CC] bg-[#FF99CC]/10' : 'border-[#87CEFA] hover:bg-white/5'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleChange}
          accept=".json,.csv,.txt,.pdf,.docx" 
        />
        <Upload className="mx-auto mb-2 text-[#87CEFA]" size={32} />
        <h3 className="font-['IndieSellout'] text-xl tracking-widest text-white mb-1">
          {isUploading ? "EXTRACTING..." : "UPLOAD DOCUMENT"}
        </h3>
        <p className="text-sm font-cabana text-white/60">
          Drag & Drop or Click (JSON, CSV, TXT, PDF, DOCX)
        </p>
      </div>

      <div className="flex gap-2 justify-between flex-wrap text-xs text-[#87CEFA] font-cabana tracking-widest">
         <span className="flex items-center gap-1"><FileText size={14}/> Templates:</span>
         <a href="/samples/sample-questions.csv" download className="hover:text-white transition-colors flex items-center gap-1"><Download size={12}/> CSV</a>
         <a href="/samples/sample-questions.json" download className="hover:text-white transition-colors flex items-center gap-1"><Download size={12}/> JSON</a>
         <a href="/samples/sample-questions.txt" download className="hover:text-white transition-colors flex items-center gap-1"><Download size={12}/> TXT</a>
      </div>
    </div>
  );
};
