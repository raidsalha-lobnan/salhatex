import React from 'react';
import {
  Save,
  Plus,
  Edit,
  Trash2,
  Printer,
  Search,
  RefreshCw,
  X,
  FileCheck,
  Layers,
  HelpCircle
} from 'lucide-react';
import { posSound } from '../../utils/audio';

interface ErpDesktopToolbarProps {
  onSave?: () => void;
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onClose?: () => void;
  saveDisabled?: boolean;
  newDisabled?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  printDisabled?: boolean;
  activeFormName?: string;
  formCode?: string;
  statusText?: string;
}

export const ErpDesktopToolbar: React.FC<ErpDesktopToolbarProps> = ({
  onSave,
  onNew,
  onEdit,
  onDelete,
  onPrint,
  onSearch,
  onRefresh,
  onClose,
  saveDisabled = false,
  newDisabled = false,
  editDisabled = false,
  deleteDisabled = false,
  printDisabled = false,
  activeFormName = 'شاشة العمليات المحاسبية',
  formCode = 'ERP-FORM-01',
  statusText = 'جاهز للتشغيل'
}) => {
  return (
    <div className="bg-gradient-to-b from-slate-100 to-slate-200 border-y border-slate-300 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs select-none">
      {/* Action Command Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {onSave && (
          <button
            type="button"
            onClick={() => {
              posSound.playBeep();
              onSave();
            }}
            disabled={saveDisabled}
            className={`btn-erp-success px-3 py-1.5 text-xs font-bold text-white rounded flex items-center gap-1.5 ${
              saveDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="حفظ البيانات المسجلة (F2)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ</span>
            <span className="text-[10px] font-mono bg-black/20 px-1 rounded">F2</span>
          </button>
        )}

        {onNew && (
          <button
            type="button"
            onClick={() => {
              posSound.playBeep();
              onNew();
            }}
            disabled={newDisabled}
            className={`btn-erp-primary px-3 py-1.5 text-xs font-bold text-white rounded flex items-center gap-1.5 ${
              newDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="سجل / أمر جديد (F3)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>جديد</span>
            <span className="text-[10px] font-mono bg-black/20 px-1 rounded">F3</span>
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={() => {
              posSound.playBeep();
              onEdit();
            }}
            disabled={editDisabled}
            className={`btn-erp-neutral px-3 py-1.5 text-xs font-bold text-slate-800 rounded flex items-center gap-1.5 ${
              editDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="تعديل السجل الحالي (F4)"
          >
            <Edit className="w-3.5 h-3.5 text-amber-700" />
            <span>تعديل</span>
            <span className="text-[10px] font-mono bg-slate-300 px-1 rounded">F4</span>
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => {
              posSound.playBeep();
              onDelete();
            }}
            disabled={deleteDisabled}
            className={`btn-erp-danger px-3 py-1.5 text-xs font-bold text-white rounded flex items-center gap-1.5 ${
              deleteDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="حذف السجل (F5)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف</span>
            <span className="text-[10px] font-mono bg-black/20 px-1 rounded">F5</span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-400 mx-1"></div>

        {onPrint && (
          <button
            type="button"
            onClick={() => {
              posSound.playBeep();
              onPrint();
            }}
            disabled={printDisabled}
            className={`btn-erp-neutral px-3 py-1.5 text-xs font-bold text-slate-800 rounded flex items-center gap-1.5 ${
              printDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="طباعة التقرير / السند (F7)"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>طباعة</span>
            <span className="text-[10px] font-mono bg-slate-300 px-1 rounded">F7</span>
          </button>
        )}

        {onSearch && (
          <button
            type="button"
            onClick={() => {
              posSound.playBeep();
              onSearch();
            }}
            className="btn-erp-neutral px-3 py-1.5 text-xs font-bold text-slate-800 rounded flex items-center gap-1.5 cursor-pointer"
            title="بحث في السجلات (F8)"
          >
            <Search className="w-3.5 h-3.5 text-indigo-700" />
            <span>بحث</span>
            <span className="text-[10px] font-mono bg-slate-300 px-1 rounded">F8</span>
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={() => {
              posSound.playBeep();
              onRefresh();
            }}
            className="btn-erp-neutral px-2.5 py-1.5 text-xs font-bold text-slate-700 rounded flex items-center gap-1 cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>تحديث</span>
          </button>
        )}
      </div>

      {/* Form Info & Status Bar */}
      <div className="flex items-center gap-3 text-xs text-slate-700 font-semibold">
        <div className="hidden sm:flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-0.5 rounded shadow-2xs">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>{activeFormName}</span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">[{formCode}]</span>
        </div>

        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>{statusText}</span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 hover:border-rose-400 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="إغلاق الشاشة (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>خروج</span>
            <span className="text-[10px] font-mono bg-rose-200 px-1 rounded">Esc</span>
          </button>
        )}
      </div>
    </div>
  );
};
