import { useState } from 'react';
import { UploadCloud, AlertCircle, Image as ImageIcon } from 'lucide-react';

const UploadBox = ({ onFilesSelect, error, maxFiles = 4, currentCount = 0 }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelect(filesArray);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelect(filesArray);
      e.target.value = ''; // reset so same files can be re-selected if removed
    }
  };

  const slotsRemaining = Math.max(0, maxFiles - currentCount);

  return (
    <div className="w-full">
      <div 
        className={`flex justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors cursor-pointer text-center
          ${isDragging 
            ? 'border-[#0f2942] bg-blue-50/60' 
            : error 
              ? 'border-red-300 bg-red-50/50 hover:bg-red-50' 
              : 'border-slate-300 bg-white hover:bg-slate-50'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="max-w-md mx-auto">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <UploadCloud className={`h-6 w-6 ${error ? 'text-red-500' : isDragging ? 'text-[#0f2942]' : 'text-slate-600'}`} aria-hidden="true" />
          </div>

          <div className="text-sm text-slate-700">
            <label
              htmlFor="product-file-upload"
              className={`font-semibold cursor-pointer underline underline-offset-2 focus-within:outline-none
                ${error ? 'text-red-700 hover:text-red-800' : 'text-[#0f2942] hover:text-[#19466f]'}`}
            >
              <span>Click to browse images</span>
              <input 
                id="product-file-upload" 
                name="product-file-upload" 
                type="file" 
                multiple
                className="sr-only" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleChange}
                disabled={slotsRemaining <= 0}
              />
            </label>
            <span className="text-slate-500"> or drag and drop files here</span>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Upload <strong>1 to {maxFiles} images</strong> (JPG, PNG, WEBP up to 10 MB each)
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 font-medium">
            <span className="bg-slate-50 py-1 px-2 rounded border border-slate-200">1. Front Label</span>
            <span className="bg-slate-50 py-1 px-2 rounded border border-slate-200">2. Back Panel</span>
            <span className="bg-slate-50 py-1 px-2 rounded border border-slate-200">3. MRP Panel</span>
            <span className="bg-slate-50 py-1 px-2 rounded border border-slate-200">4. Date / Mfg Info</span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 flex items-start text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
