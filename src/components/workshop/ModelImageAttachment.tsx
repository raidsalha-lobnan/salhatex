import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Trash2,
  Maximize2,
  RotateCcw,
  Sparkles,
  ClipboardPaste,
  Check
} from 'lucide-react';
import { posSound } from '../../utils/audio';
import { ImagePreviewModal } from './ImagePreviewModal';

interface ModelImageAttachmentProps {
  primaryImage?: string;
  additionalImages?: string[];
  onChange: (primary: string | undefined, additional: string[]) => void;
  title?: string;
  modelCode?: string;
  garmentType?: string;
  readOnly?: boolean;
}

export const ModelImageAttachment: React.FC<ModelImageAttachmentProps> = ({
  primaryImage,
  additionalImages = [],
  onChange,
  title = '',
  modelCode = '',
  garmentType = '',
  readOnly = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect image aspect ratio when an image is loaded
  useEffect(() => {
    if (primaryImage) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > img.naturalHeight) {
          setOrientation('landscape');
        } else {
          setOrientation('portrait');
        }
      };
      img.src = primaryImage;
    }
  }, [primaryImage]);

  // Keyboard paste listener (Ctrl+V)
  useEffect(() => {
    if (readOnly) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                onChange(result, additionalImages);
                posSound.playSuccess();
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onChange, additionalImages, readOnly]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        onChange(base64, additionalImages);
        posSound.playSuccess();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (readOnly) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const toggleOrientation = () => {
    setOrientation(prev => (prev === 'portrait' ? 'landscape' : 'portrait'));
    posSound.playBeep();
  };

  const handleRemoveImage = () => {
    onChange(undefined, []);
    posSound.playBeep();
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Header info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">صورة الموديل (مستطيل 7سم × 10سم):</span>
          {primaryImage ? (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>مرفقة ({orientation === 'portrait' ? 'طولي 7×10 سم' : 'عرضي 10×7 سم'})</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal">
              (تعديل طولي أو عرضي تلقائياً)
            </span>
          )}
        </div>

        {/* Orientation Toggle / Actions */}
        <div className="flex items-center gap-1.5">
          {primaryImage && !readOnly && (
            <button
              type="button"
              onClick={toggleOrientation}
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
              title="تبديل الوضع بين طولي وعرضي"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>{orientation === 'portrait' ? 'تحويل لعرضي (10×7)' : 'تحويل لطولي (7×10)'}</span>
            </button>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{primaryImage ? 'تغيير الصورة' : 'إرفاق صورة'}</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="التقاط بالكاميرا"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                <span>كاميرا</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* The 7cm x 10cm Container Box */}
      <div className="flex items-center justify-center p-2 bg-white rounded-xl border border-slate-200">
        {primaryImage ? (
          <div
            className={`relative group border-2 border-indigo-400/60 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-md transition-all ${
              orientation === 'portrait'
                ? 'w-[140px] sm:w-[175px] h-[200px] sm:h-[250px]' /* 7cm x 10cm aspect */
                : 'w-[200px] sm:w-[250px] h-[140px] sm:h-[175px]' /* 10cm x 7cm aspect */
            }`}
          >
            <img
              src={primaryImage}
              alt={title || 'صورة الموديل'}
              className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105"
              onClick={() => setShowPreviewModal(true)}
            />

            {/* Overlay Dimension Badge */}
            <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
              {orientation === 'portrait' ? '7cm × 10cm' : '10cm × 7cm'}
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="p-1.5 bg-white text-slate-900 rounded-lg shadow hover:scale-110 transition-transform"
                title="تكبير الصورة"
              >
                <Maximize2 className="w-4 h-4 text-indigo-700" />
              </button>

              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 bg-white text-slate-900 rounded-lg shadow hover:scale-110 transition-transform"
                    title="استبدال الصورة"
                  >
                    <Upload className="w-4 h-4 text-indigo-700" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 bg-rose-600 text-white rounded-lg shadow hover:scale-110 transition-transform"
                    title="حذف الصورة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Empty 7cm x 10cm Rectangle Dropzone */
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !readOnly && fileInputRef.current?.click()}
            className={`cursor-pointer transition-all border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-3 gap-2 ${
              orientation === 'portrait'
                ? 'w-[140px] sm:w-[175px] h-[200px] sm:h-[250px]'
                : 'w-[200px] sm:w-[250px] h-[140px] sm:h-[175px]'
            } ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50 scale-102'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-800 block">
                إرفاق صورة الموديل
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">
                7 سم × 10 سم
              </span>
            </div>

            <div className="text-[9px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1 font-semibold">
              <ClipboardPaste className="w-3 h-3" />
              <span>أو لصق (Ctrl+V)</span>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {showPreviewModal && primaryImage && (
        <ImagePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          imageUrl={primaryImage}
          title={title || 'صورة الموديل والتصميم'}
          subtitle={modelCode ? `كود الموديل: #${modelCode}` : garmentType || undefined}
        />
      )}
    </div>
  );
};
