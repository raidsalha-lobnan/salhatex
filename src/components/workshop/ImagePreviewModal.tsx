import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { posSound } from '../../utils/audio';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'معاينة صورة الموديل',
  subtitle
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    posSound.playBeep();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `model-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white max-w-5xl w-full mx-auto pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            {subtitle && <p className="text-xs text-indigo-300 font-mono">{subtitle}</p>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="تدوير"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="تحميل الصورة"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition-colors mr-2"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Image Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="transition-transform duration-200 max-h-[80vh] max-w-[85vw] flex items-center justify-center"
          style={{
            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-[80vw] object-contain rounded-xl shadow-2xl border border-white/10 bg-slate-900"
          />
        </div>
      </div>

      {/* Footer Bar */}
      <div className="max-w-5xl w-full mx-auto pt-2 border-t border-white/10 text-center text-xs text-slate-400 flex items-center justify-between">
        <span>نسبة التكبير: {Math.round(zoomLevel * 100)}%</span>
        <span>معاينة واضحة وعالية الدقة للموديل والتفصيل</span>
        <button
          type="button"
          onClick={onClose}
          className="text-white hover:text-indigo-300 font-bold"
        >
          إغلاق المعاينة
        </button>
      </div>
    </div>
  );
};
