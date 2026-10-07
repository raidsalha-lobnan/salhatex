import React, { useState } from 'react';
import { ColorSizeQuantityRow } from '../../types';
import { Plus, Trash2, Copy, Palette, Sparkles, Hash, AlertCircle, FileText, Check } from 'lucide-react';
import { posSound } from '../../utils/audio';

interface ColorSizeQuantityTableProps {
  rows: ColorSizeQuantityRow[];
  availableSizes?: string[];
  onChange: (rows: ColorSizeQuantityRow[], availableSizes: string[]) => void;
  readOnly?: boolean;
  className?: string;
  onTotalQuantityChange?: (total: number) => void;
}

export const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export const COMMON_COLORS = [
  { name: 'كحلي', hex: '#1e3a8a' },
  { name: 'أسود', hex: '#0f172a' },
  { name: 'أبيض', hex: '#f8fafc' },
  { name: 'رمادي', hex: '#64748b' },
  { name: 'بيج', hex: '#d4b996' },
  { name: 'زيتي', hex: '#3f6212' },
  { name: 'خمري', hex: '#881337' },
  { name: 'أزرق ملكي', hex: '#2563eb' },
  { name: 'بني', hex: '#78350f' },
  { name: 'سكري', hex: '#fef3c7' },
];

export const ColorSizeQuantityTable: React.FC<ColorSizeQuantityTableProps> = ({
  rows,
  availableSizes = DEFAULT_SIZES,
  onChange,
  readOnly = false,
  className = '',
  onTotalQuantityChange,
}) => {
  const [sizes, setSizes] = useState<string[]>(
    availableSizes && availableSizes.length > 0 ? availableSizes : DEFAULT_SIZES
  );
  const [newSizeName, setNewSizeName] = useState('');
  const [showAddSizeInput, setShowAddSizeInput] = useState(false);

  // Calculate totals
  const totalGrandQuantity = rows.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);

  const calculateRowTotal = (quantities: Record<string, number>): number => {
    return Object.values(quantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
  };

  const handleUpdateRow = (id: string, updates: Partial<ColorSizeQuantityRow>) => {
    const updatedRows = rows.map((r) => {
      if (r.id !== id) return r;
      const merged = { ...r, ...updates };
      if (updates.quantities) {
        merged.totalQuantity = calculateRowTotal(merged.quantities);
      }
      return merged;
    });

    const newGrandTotal = updatedRows.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    onChange(updatedRows, sizes);
    if (onTotalQuantityChange) {
      onTotalQuantityChange(newGrandTotal);
    }
  };

  const handleQuantityCellChange = (rowId: string, size: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    const newQuantities = { ...row.quantities, [size]: num };
    handleUpdateRow(rowId, { quantities: newQuantities });
  };

  const handleAddRow = (colorName = '', colorHex?: string) => {
    const newId = `csq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const initialQuantities: Record<string, number> = {};
    sizes.forEach((s) => {
      initialQuantities[s] = 0;
    });

    const newRow: ColorSizeQuantityRow = {
      id: newId,
      color: colorName || 'لون جديد',
      colorHex: colorHex || (COMMON_COLORS.find((c) => c.name === colorName)?.hex),
      quantities: initialQuantities,
      totalQuantity: 0,
      notes: '',
    };

    const updated = [...rows, newRow];
    onChange(updated, sizes);
    posSound.playBeep();
  };

  const handleDuplicateRow = (row: ColorSizeQuantityRow) => {
    const newId = `csq-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const duplicated: ColorSizeQuantityRow = {
      ...row,
      id: newId,
      color: `${row.color} (نسخة)`,
      quantities: { ...row.quantities },
      totalQuantity: row.totalQuantity,
      notes: row.notes ? `${row.notes}` : '',
    };
    const updated = [...rows, duplicated];
    const newGrandTotal = updated.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    onChange(updated, sizes);
    if (onTotalQuantityChange) {
      onTotalQuantityChange(newGrandTotal);
    }
    posSound.playBeep();
  };

  const handleRemoveRow = (id: string) => {
    const updated = rows.filter((r) => r.id !== id);
    const newGrandTotal = updated.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    onChange(updated, sizes);
    if (onTotalQuantityChange) {
      onTotalQuantityChange(newGrandTotal);
    }
    posSound.playBeep();
  };

  const handleAddCustomSize = () => {
    const trimmed = newSizeName.trim().toUpperCase();
    if (!trimmed) return;
    if (sizes.includes(trimmed)) {
      setNewSizeName('');
      setShowAddSizeInput(false);
      return;
    }

    const updatedSizes = [...sizes, trimmed];
    setSizes(updatedSizes);

    // Initialize the new size in all existing rows
    const updatedRows = rows.map((r) => ({
      ...r,
      quantities: {
        ...r.quantities,
        [trimmed]: r.quantities[trimmed] || 0,
      },
    }));

    onChange(updatedRows, updatedSizes);
    setNewSizeName('');
    setShowAddSizeInput(false);
    posSound.playBeep();
  };

  const handleRemoveSizeColumn = (sizeToRemove: string) => {
    if (sizes.length <= 1) return;
    const updatedSizes = sizes.filter((s) => s !== sizeToRemove);
    setSizes(updatedSizes);

    const updatedRows = rows.map((r) => {
      const newQuantities = { ...r.quantities };
      delete newQuantities[sizeToRemove];
      return {
        ...r,
        quantities: newQuantities,
        totalQuantity: calculateRowTotal(newQuantities),
      };
    });

    const newGrandTotal = updatedRows.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    onChange(updatedRows, updatedSizes);
    if (onTotalQuantityChange) {
      onTotalQuantityChange(newGrandTotal);
    }
    posSound.playBeep();
  };

  // Calculate column totals
  const columnTotals: Record<string, number> = {};
  sizes.forEach((s) => {
    columnTotals[s] = rows.reduce((sum, r) => sum + (r.quantities[s] || 0), 0);
  });

  return (
    <div className={`border border-purple-200 bg-white rounded-xl shadow-xs overflow-hidden ${className}`}>
      {/* Table Section Header */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 p-3.5 border-b border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                جدول القياسات والكميات والألوان
              </h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
                {rows.length} ألوان
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                الإجمالي: {totalGrandQuantity} قطعة
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              توزيع كميات المقاسات المختلفة لكل لون مع إجمالي كل تشغيلة والملاحظات
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {showAddSizeInput ? (
              <div className="flex items-center gap-1 bg-white border border-purple-300 rounded-lg p-1">
                <input
                  type="text"
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  placeholder="المقاس (4XL / 40)"
                  className="w-24 px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSize()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomSize}
                  className="px-2 py-0.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                >
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSizeInput(false)}
                  className="px-1.5 py-0.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddSizeInput(true)}
                className="px-2.5 py-1 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ عمود مقاس</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAddRow()}
              className="flex items-center gap-1 px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة لون جديد</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Color Presets Bar */}
      {!readOnly && (
        <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-200 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>إضافة لون سريع:</span>
          </span>
          {COMMON_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleAddRow(c.name, c.hex)}
              className="px-2 py-0.5 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200 hover:border-purple-300 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 shadow-2xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0 inline-block"
                style={{ backgroundColor: c.hex }}
              />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Table Container */}
      {rows.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50/40">
          <Palette className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-700 mb-1">
            لم يتم تسجيل ألوان ومقاسات في جدول القياسات والكميات والألوان حتى الآن
          </p>
          <p className="text-[11px] text-slate-400 mb-3">
            أضف الألوان المطلوبة (كحلي، أبيض، أسود...) وسجل كميات كل مقاس لتوزيع التشغيل وحساب الإجمالي بدقة
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleAddRow('كحلي', '#1e3a8a')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة أول لون ومقاساته</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-2.5 w-8 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[150px]">اللون / القماش</th>
                {sizes.map((s) => (
                  <th key={s} className="py-2.5 px-2 text-center min-w-[65px]">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-mono text-purple-900 font-bold">{s}</span>
                      {!readOnly && sizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSizeColumn(s)}
                          title={`حذف عمود مقاس ${s}`}
                          className="text-slate-300 hover:text-rose-500 text-[10px] leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center min-w-[90px] bg-purple-50/60 text-purple-950 font-bold">
                  إجمالي اللون
                </th>
                <th className="py-2.5 px-3 min-w-[200px]">ملاحظة بالأخير</th>
                {!readOnly && <th className="py-2.5 px-2 w-20 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* # */}
                  <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>

                  {/* Color Name */}
                  <td className="py-2 px-3">
                    {readOnly ? (
                      <div className="flex items-center gap-2">
                        {row.colorHex && (
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300 shrink-0 inline-block"
                            style={{ backgroundColor: row.colorHex }}
                          />
                        )}
                        <span className="font-bold text-slate-800">{row.color || '-'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={row.colorHex || '#1e3a8a'}
                          onChange={(e) => handleUpdateRow(row.id, { colorHex: e.target.value })}
                          className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0 bg-transparent shrink-0"
                          title="اختر درجة اللون"
                        />
                        <input
                          type="text"
                          value={row.color}
                          onChange={(e) => handleUpdateRow(row.id, { color: e.target.value })}
                          placeholder="اسم اللون (كحلي، أسود...)"
                          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-md px-2 py-1 text-xs font-bold text-slate-900 transition-colors"
                        />
                      </div>
                    )}
                  </td>

                  {/* Size Quantities */}
                  {sizes.map((s) => {
                    const qVal = row.quantities[s] ?? 0;
                    return (
                      <td key={s} className="py-2 px-1.5 text-center">
                        {readOnly ? (
                          <span
                            className={`font-mono text-xs ${
                              qVal > 0 ? 'font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded' : 'text-slate-300'
                            }`}
                          >
                            {qVal > 0 ? qVal : '-'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={qVal === 0 ? '' : qVal}
                            onChange={(e) => handleQuantityCellChange(row.id, s, e.target.value)}
                            placeholder="0"
                            className={`w-14 text-center border rounded-md py-1 text-xs font-mono transition-all ${
                              qVal > 0
                                ? 'bg-purple-50/70 border-purple-400 font-bold text-purple-950 focus:bg-white'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 focus:bg-white focus:text-slate-900 focus:border-purple-500'
                            }`}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Row Total Quantity */}
                  <td className="py-2 px-3 text-center bg-purple-50/40">
                    <span className="font-mono font-bold text-xs text-purple-900 px-2.5 py-0.5 rounded-md bg-purple-100/70">
                      {row.totalQuantity || 0}
                    </span>
                  </td>

                  {/* Notes at the end (ملاحظة بالأخر) */}
                  <td className="py-2 px-3">
                    {readOnly ? (
                      <span className="text-slate-600 text-[11px]">{row.notes || '-'}</span>
                    ) : (
                      <input
                        type="text"
                        value={row.notes || ''}
                        onChange={(e) => handleUpdateRow(row.id, { notes: e.target.value })}
                        placeholder="ملاحظات تفصيل وقص هذا اللون..."
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-md px-2 py-1 text-[11px] text-slate-800 transition-colors"
                      />
                    )}
                  </td>

                  {/* Actions */}
                  {!readOnly && (
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(row)}
                          title="تكرار اللون والمقاسات"
                          className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          title="حذف اللون"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>

            {/* Table Summary Footer */}
            <tfoot className="bg-slate-100/95 font-bold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-right">
                  <span className="text-xs font-bold text-slate-800">
                    مجموع كميات المقاسات:
                  </span>
                </td>
                {sizes.map((s) => (
                  <td key={s} className="py-2.5 px-1.5 text-center">
                    <span className="font-mono text-xs text-purple-950 font-bold">
                      {columnTotals[s] || 0}
                    </span>
                  </td>
                ))}
                <td className="py-2.5 px-3 text-center bg-purple-100 text-purple-950">
                  <span className="font-mono font-black text-sm">
                    {totalGrandQuantity} قطعة
                  </span>
                </td>
                <td colSpan={readOnly ? 1 : 2} className="py-2.5 px-3 text-left text-[11px] text-slate-500">
                  <span>الإجمالي الكلي لأمر التشغيل</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
