import React from 'react';
import { X, FileImage, Tag } from 'lucide-react';

const DEFAULT_LABELS = ['FRONT LABEL', 'BACK LABEL', 'MRP PANEL', 'DATE PANEL'];

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ImagePreview = ({ files, file, onRemove, onUpdateCategory }) => {
  // Normalize to an array of items
  const items = files || (file ? [file] : []);

  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Attached Product Evidence ({items.length} of 4)
        </h3>
        <span className="text-[11px] text-slate-500">
          Click tag to reassign label angle
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, index) => {
          const category = item.category || DEFAULT_LABELS[index] || `EVIDENCE #${index + 1}`;
          return (
            <div 
              key={item.id || item.name || index}
              className="relative bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col group"
            >
              {/* Category Header Badge */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs">
                <span className="font-bold text-[10px] tracking-wider text-[#0f2942] uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-500" />
                  {category}
                </span>

                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-slate-400 hover:text-red-700 p-0.5 rounded transition-colors"
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Image Preview Container */}
              <div className="h-44 bg-slate-50 flex items-center justify-center p-2 relative overflow-hidden">
                <img 
                  src={item.previewUrl} 
                  alt={item.name || `Product evidence ${index + 1}`}
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>

              {/* File Info */}
              <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatSize(item.size)}
                  </p>
                </div>
              </div>

              {/* Quick Category Selector if supported */}
              {onUpdateCategory && (
                <div className="px-2 pb-2 pt-0">
                  <select
                    value={item.category || DEFAULT_LABELS[index]}
                    onChange={(e) => onUpdateCategory(index, e.target.value)}
                    className="w-full text-[11px] py-0.5 px-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    {DEFAULT_LABELS.map((lbl) => (
                      <option key={lbl} value={lbl}>{lbl}</option>
                    ))}
                    <option value="OTHER PANEL">OTHER PANEL</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImagePreview;
