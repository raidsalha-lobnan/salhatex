import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { CurrencyInfo } from '../../types';
import {
  Coins,
  RefreshCw,
  Plus,
  Edit2,
  Check,
  X,
  TrendingUp,
  AlertCircle,
  Info,
  Globe,
  Star,
  CheckCircle2
} from 'lucide-react';

export const CurrencySettings: React.FC = () => {
  const {
    currencies,
    updateCurrencies,
    updateCurrencyRate,
    setBaseCurrency,
    fetchLiveRates,
    settings
  } = useAccounting();

  const [isLoadingLiveRates, setIsLoadingLiveRates] = useState(false);
  const [liveRateStatus, setLiveRateStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Edit rate inline state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<number>(1);

  // Add new currency modal state
  const [isAddingCurrency, setIsAddingCurrency] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRate, setNewRate] = useState<number>(1.0);

  // Quick switch base currency feedback message
  const [baseChangeMessage, setBaseChangeMessage] = useState<string | null>(null);

  const activeBaseCurrency = currencies.find(c => c.isBase) ||
    currencies.find(c => c.code.toUpperCase() === (settings.baseCurrencyCode || '').toUpperCase()) ||
    currencies[0] || {
      code: settings.baseCurrencyCode || 'ILS',
      name: 'العملة الأساسية',
      symbol: settings.currency || '₪',
      rateAgainstBase: 1.0,
      isBase: true
    };

  const handleStartEdit = (currency: CurrencyInfo) => {
    setEditingCode(currency.code);
    setEditRateValue(currency.rateAgainstBase || 1.0);
  };

  const handleSaveEdit = (code: string) => {
    if (editRateValue <= 0) {
      alert('يجب أن يكون سعر الصرف أكبر من الصفر');
      return;
    }
    updateCurrencyRate(code, editRateValue);
    setEditingCode(null);
  };

  const handleSelectBaseCurrency = (code: string) => {
    const res = setBaseCurrency(code);
    if (res.success) {
      setBaseChangeMessage(res.message);
      setTimeout(() => setBaseChangeMessage(null), 4000);
    }
  };

  const handleFetchLive = async () => {
    setIsLoadingLiveRates(true);
    setLiveRateStatus(null);
    try {
      const res = await fetchLiveRates();
      setLiveRateStatus(res);
      setTimeout(() => setLiveRateStatus(null), 5000);
    } catch (err: any) {
      setLiveRateStatus({ success: false, message: 'حدث خطأ أثناء جلب أسعار الصرف' });
    } finally {
      setIsLoadingLiveRates(false);
    }
  };

  const handleToggleActive = (code: string) => {
    const updated = currencies.map(c => {
      if (c.code === code) {
        if (c.isBase) return c; // Cannot deactivate base currency
        return { ...c, isActive: !c.isActive };
      }
      return c;
    });
    updateCurrencies(updated);
  };

  const handleAddCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    if (!code || !newName.trim()) {
      alert('الرجاء إدخال كود واسم العملة');
      return;
    }

    if (currencies.some(c => c.code.toUpperCase() === code)) {
      alert('هذه العملة مضافة بالفعل في النظام');
      return;
    }

    const newCurr: CurrencyInfo = {
      code,
      name: newName.trim(),
      symbol: newSymbol.trim() || code,
      rateAgainstBase: Number(newRate) > 0 ? Number(newRate) : 1.0,
      isBase: false,
      isActive: true,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    updateCurrencies([...currencies, newCurr]);
    setIsAddingCurrency(false);
    setNewCode('');
    setNewName('');
    setNewSymbol('');
    setNewRate(1.0);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">إدارة العملات وأسعار الصرف</h3>
              <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>العملة الأساسية الحالية: {activeBaseCurrency.name} ({activeBaseCurrency.symbol})</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-light mt-0.5">
              يمكنك تحديد العملة الرئيسية للمنشأة مباشرة من جدول العملات أدناه بالضغط على زر <strong>(اختيار كرئيسية)</strong> بجانب أي عملة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFetchLive}
            disabled={isLoadingLiveRates}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
            title={`جلب أحدث أسعار الصرف الحية بالنسبة للعملة الأساسية (${activeBaseCurrency.symbol})`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLiveRates ? 'animate-spin' : ''}`} />
            <span>{isLoadingLiveRates ? 'جارِ التحديث...' : 'تحديث أسعار الصرف الحية'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingCurrency(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة عملة جديدة</span>
          </button>
        </div>
      </div>

      {/* Base Currency Change Feedback */}
      {baseChangeMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{baseChangeMessage}</span>
        </div>
      )}

      {/* Live Rate Notification Feedback */}
      {liveRateStatus && (
        <div
          className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${
            liveRateStatus.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {liveRateStatus.success ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{liveRateStatus.message}</span>
        </div>
      )}

      {/* Accounting Explanation Note */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">ملاحظة محاسبية:</span> العملة الأساسية للمنشأة هي <strong>{activeBaseCurrency.name} ({activeBaseCurrency.symbol} / {activeBaseCurrency.code})</strong>. تُسجل كافة القيود اليومية وكشوفات الحسابات والقوائم المالية بها. يمكنك تغييرها في أي وقت باختيار أي عملة أخرى من الجدول أدناه كعملة رئيسية.
        </div>
      </div>

      {/* Currencies Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800">جدول العملات وأسعار الصرف واختيار العملة الأساسية:</h4>
          <span className="text-[10px] text-slate-400 font-light">عدد العملات: {currencies.length}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center">العملة الرئيسية</th>
                <th className="py-2.5 px-3">اسم العملة</th>
                <th className="py-2.5 px-3">الرمز</th>
                <th className="py-2.5 px-3">الكود (ISO)</th>
                <th className="py-2.5 px-3 text-center">
                  سعر الصرف مقابل الأساس ({activeBaseCurrency.symbol})
                </th>
                <th className="py-2.5 px-3 text-center">المعادل المحاسبي</th>
                <th className="py-2.5 px-3 text-center">آخر تحديث</th>
                <th className="py-2.5 px-3 text-center">الحالة في الكاشير</th>
                <th className="py-2.5 px-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currencies.map(curr => {
                const isBase = curr.isBase || curr.code.toUpperCase() === activeBaseCurrency.code.toUpperCase();
                const isEditing = editingCode === curr.code;

                return (
                  <tr
                    key={curr.code}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isBase ? 'bg-blue-50/40 font-semibold' : ''
                    }`}
                  >
                    {/* Select Base Radio / Status */}
                    <td className="py-2.5 px-3 text-center">
                      {isBase ? (
                        <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>الرئيسية ✓</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectBaseCurrency(curr.code)}
                          className="inline-flex items-center gap-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full transition cursor-pointer"
                          title="تعيين هذه العملة كعملة أساسية للنظام"
                        >
                          <Star className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                          <span>اختيار كرئيسية</span>
                        </button>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {curr.name}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-sm">
                      {curr.symbol}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {curr.code}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {isBase ? (
                        <span className="font-mono text-slate-500 font-bold">1.00 (الأساس)</span>
                      ) : isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            value={editRateValue}
                            onChange={e => setEditRateValue(parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-0.5 border border-blue-400 rounded text-center font-mono font-bold bg-white text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(curr.code)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                            title="حفظ السعر"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCode(null)}
                            className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                          <span>{curr.rateAgainstBase ? curr.rateAgainstBase.toFixed(4) : '1.0000'}</span>
                          <span className="text-[10px] text-blue-600 font-sans">{activeBaseCurrency.symbol}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                      {isBase ? (
                        <span>1 {curr.symbol} = 1.00 {activeBaseCurrency.symbol}</span>
                      ) : (
                        <span>1 {curr.symbol} = {curr.rateAgainstBase} {activeBaseCurrency.symbol}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {curr.updatedAt || 'اليوم'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {isBase ? (
                        <span className="text-blue-700 text-[11px] font-bold">نشطة دائماً</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(curr.code)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                            curr.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {curr.isActive !== false ? 'مفعلة' : 'معطلة'}
                        </button>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {!isBase && !isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(curr)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>تعديل السعر</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to add custom currency */}
      {isAddingCurrency && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-md w-full text-slate-800 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>إضافة عملة جديدة للنظام</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingCurrency(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCurrency} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                  كود العملة الدولي (3-5 أحرف):
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="مثال: GBP أو TRY أو KWD"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs uppercase focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                  اسم العملة باللغة العربية:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="مثال: جنيه إسترليني أو ليرة تركية"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                    رمز العملة:
                  </label>
                  <input
                    type="text"
                    required
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value)}
                    placeholder="مثال: £ أو ₺ أو د.ك"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                    سعر الصرف (كم {activeBaseCurrency.symbol} = 1 وحدة):
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={newRate}
                    onChange={e => setNewRate(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingCurrency(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer text-xs flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ العملة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
