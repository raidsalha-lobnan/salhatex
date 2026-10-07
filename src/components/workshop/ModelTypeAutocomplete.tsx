import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Layers, Sparkles, Check, X, History, ChevronDown } from 'lucide-react';

interface ModelTypeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface ModelTypeItem {
  name: string;
  count: number;
  source: 'database' | 'default';
  lastUsed?: string;
}

// دالة تسوية ومطابقة النصوص العربية لإلغاء الفروق بين الهمزات والتاء المربوطة
const normalizeArabic = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // حذف التشكيل والحركات
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\s\-_]+/g, ' ')
    .trim();
};

export const ModelTypeAutocomplete: React.FC<ModelTypeAutocompleteProps> = ({
  value,
  onChange,
  onSelectSuggestion,
  placeholder = 'اكتب نوع الموديل (مثلاً: ثوب، فستان...)...',
  className = '',
  disabled = false
}) => {
  const { printOrders, invoices } = useAccounting();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 1. استخراج وتجميع كافة أنواع الموديلات المسجلة سابقاً في قاعدة البيانات والأوامر
  const allModelTypes = useMemo<ModelTypeItem[]>(() => {
    const countsMap = new Map<string, { count: number; source: 'database' | 'default'; lastDate?: string }>();

    // الأنواع القياسية الشائعة كقاعدة أساسية
    const defaultModels = [
      'ثوب رجالي سعودي',
      'دشداشة كويتية',
      'دشداشة عمانية / إماراتية',
      'فستان سهرة',
      'فستان زفاف / خطوبة',
      'عباية خليجية',
      'جلابية / قفطان مغربي',
      'بدلة رسمية رجالية',
      'بليزر / جاكيت كاجوال',
      'قميص رجالي تفصيل',
      'بنطلون كلاسيك',
      'زي موحد / يونيفورم مهني',
      'مريول مدرسي',
      'تعديل وتقصير وتصليح ملابس',
      'تطريز وشك يدوي',
      'بشت / مشلح ملكي',
      'سديري رجالي فاخر',
      'ثوب أطفال'
    ];

    defaultModels.forEach(m => {
      countsMap.set(m.trim(), { count: 0, source: 'default' });
    });

    // ترجمة أنواع الخدمات المسجلة مسبقاً إذا وجدت
    const serviceTypeLabels: Record<string, string> = {
      mens_thobe: 'ثوب رجالي سعودي',
      womens_dress: 'فستان سهرة',
      abaya: 'عباية خليجية',
      formal_suit: 'بدلة رسمية',
      shirt_pants: 'قميص وبنطلون تفصيل',
      uniform: 'زي موحد',
      school_uniform: 'مريول مدرسي',
      alterations_repair: 'تعديل وتصليح ملابس',
      embroidery: 'تطريز وشك يدوي',
      custom_tailoring: 'تفصيل وموديل خاص'
    };

    // جلب الأنواع المسجلة فعلياً في أوامر التشغيل السابقة في قاعدة البيانات
    if (Array.isArray(printOrders)) {
      printOrders.forEach(order => {
        // نوع الموديل المسجل مباشرة
        if (order.garmentType && typeof order.garmentType === 'string') {
          const trimmed = order.garmentType.trim();
          if (trimmed.length > 0) {
            const existing = countsMap.get(trimmed);
            if (existing) {
              existing.count += 1;
              existing.source = 'database';
              existing.lastDate = order.createdAt;
            } else {
              countsMap.set(trimmed, { count: 1, source: 'database', lastDate: order.createdAt });
            }
          }
        } else if (order.serviceType && serviceTypeLabels[order.serviceType]) {
          const label = serviceTypeLabels[order.serviceType];
          const existing = countsMap.get(label);
          if (existing) {
            existing.count += 1;
            existing.source = 'database';
          }
        }
      });
    }

    // فحص بنود الفواتير المرتبطة بالتفصيل في قاعدة البيانات (إن وجدت)
    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
        if (Array.isArray(inv.items)) {
          inv.items.forEach(it => {
            if (it.description && typeof it.description === 'string') {
              const d = it.description.trim();
              if (d.startsWith('تفصيل') || d.startsWith('خياطة') || d.includes('ثوب') || d.includes('فستان') || d.includes('عباية')) {
                const cleanName = d.replace(/^(تفصيل|خياطة)\s+/, '').trim();
                if (cleanName.length >= 3 && cleanName.length <= 40) {
                  const existing = countsMap.get(cleanName);
                  if (existing) {
                    existing.count += 1;
                    existing.source = 'database';
                  } else {
                    countsMap.set(cleanName, { count: 1, source: 'database' });
                  }
                }
              }
            }
          });
        }
      });
    }

    // تحويل الـ Map إلى قائمة مرتبة
    const list: ModelTypeItem[] = [];
    countsMap.forEach((meta, name) => {
      list.push({
        name,
        count: meta.count,
        source: meta.source,
        lastUsed: meta.lastDate
      });
    });

    // ترتيب الموديلات: أولاً التي لها تكرار واستخدام أكبر في قاعدة البيانات، ثم الأبجدي
    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'ar');
    });

    return list;
  }, [printOrders, invoices]);

  // 2. تصفية الاقتراحات أثناء الكتابة بمطابقة ذكية
  const filteredSuggestions = useMemo<ModelTypeItem[]>(() => {
    const rawVal = value ? value.trim() : '';
    if (!rawVal) {
      // إظهار الموديلات الأكثر استخداماً أولاً (أول 12 عنصر)
      return allModelTypes.slice(0, 14);
    }

    const normQuery = normalizeArabic(rawVal);

    // تصفية المطابقات
    const matched = allModelTypes.filter(item => {
      const normName = normalizeArabic(item.name);
      return normName.includes(normQuery);
    });

    // ترتيب المطابقات: التطابق الذي يبدأ بنفس الكلمة أولاً، ثم الأكثر تكراراً
    matched.sort((a, b) => {
      const normA = normalizeArabic(a.name);
      const normB = normalizeArabic(b.name);
      const aStarts = normA.startsWith(normQuery);
      const bStarts = normB.startsWith(normQuery);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      if (b.count !== a.count) return b.count - a.count;
      return 0;
    });

    return matched.slice(0, 16);
  }, [value, allModelTypes]);

  // التحقق إن كان الإدخال الحالي موجوداً مسبقاً بنفس الاسم
  const isExactExisting = useMemo(() => {
    const norm = normalizeArabic(value || '');
    return allModelTypes.some(item => normalizeArabic(item.name) === norm);
  }, [value, allModelTypes]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // التمرير التلقائي للعنصر المظلل بالكيبورد
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const itemEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  // التعامل مع اختيار عنصر
  const handleSelect = (selectedName: string) => {
    onChange(selectedName);
    if (onSelectSuggestion) {
      onSelectSuggestion(selectedName);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // التحكم بالكيبورد (الأسهم للأعلى والأسفل، Enter، Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        handleSelect(filteredSuggestions[highlightedIndex].name);
      } else if (value.trim().length > 0) {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Tab' && highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
      handleSelect(filteredSuggestions[highlightedIndex].name);
    }
  };

  // إبراز النص المطابق أثناء البحث
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const normText = normalizeArabic(text);
    const normQ = normalizeArabic(query);
    const idx = normText.indexOf(normQ);

    if (idx === -1) return text;

    const start = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const end = text.slice(idx + query.length);

    return (
      <span>
        {start}
        <span className="bg-amber-200/80 text-amber-950 font-bold px-0.5 rounded">{match}</span>
        {end}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* حقل الإدخال الذكي */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 pl-8 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-2xs"
          autoComplete="off"
        />

        {/* أزرار التحكم السريعة داخل الحقل */}
        <div className="absolute left-1.5 flex items-center gap-1">
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(true);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              title="مسح"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsOpen(prev => !prev);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
              title="عرض الاقتراحات السابقة"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* قائمة الاقتراحات الاستدلالية المنسدلة (Autocomplete Popover) */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-100 min-w-[260px]">
          {/* ترويسة القائمة */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-[10px] font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <History className="w-3 h-3 text-indigo-600" />
              <span>أنواع الموديلات السابقة والمقترحة:</span>
            </span>
            <span className="text-slate-400 font-mono">
              {filteredSuggestions.length} اقتراح
            </span>
          </div>

          {/* قائمة العناصر */}
          <ul ref={listRef} className="overflow-y-auto divide-y divide-slate-100 py-1 text-xs">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item, idx) => {
                const isSelected = item.name === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={item.name}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(item.name)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isHighlighted
                        ? 'bg-indigo-50/80 text-indigo-950 font-bold'
                        : isSelected
                        ? 'bg-slate-50 text-indigo-900 font-semibold'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Layers className={`w-3.5 h-3.5 shrink-0 ${item.source === 'database' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {renderHighlightedText(item.name, value)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title={`مسجل في ${item.count} طلبيات سابقة`}>
                          <span>مسجل ({item.count})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          شائع
                        </span>
                      )}

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-3 text-center text-slate-400 text-xs">
                لا توجد اقتراحات مطابقة
              </li>
            )}
          </ul>

          {/* رسالة إرشادية عند كتابة نوع جديد تماماً */}
          {value.trim().length > 0 && !isExactExisting && (
            <div className="p-2 bg-indigo-50/70 border-t border-indigo-100 flex items-center justify-between text-[11px] text-indigo-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  اعتماد نوع جديد: <strong className="font-bold">"{value.trim()}"</strong>
                </span>
              </div>
              <span className="text-[10px] text-indigo-600/80 font-medium">
                (يُحفظ تلقائياً بالسجل)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
