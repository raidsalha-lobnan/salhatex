import React, { useState, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Employee, TailorPieceworkLog, PaymentMethod } from '../../types';
import {
  Scissors,
  DollarSign,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Award,
  TrendingUp,
  Layers,
  Filter,
  Search,
  Printer,
  Check,
  CreditCard
} from 'lucide-react';
import { posSound } from '../../utils/audio';

interface TailorPieceworkTrackerProps {
  onClose?: () => void;
}

export const TailorPieceworkTracker: React.FC<TailorPieceworkTrackerProps> = ({ onClose }) => {
  const {
    employees,
    settings,
    printOrders,
    payEmployeeSalary,
    treasuries
  } = useAccounting();

  const tailors = useMemo(() => {
    return employees.filter(
      e =>
        e.department === 'tailoring_sewing' ||
        e.department === 'cutting' ||
        e.department === 'ironing_finishing' ||
        e.salaryType === 'piece_rate' ||
        e.jobTitle?.includes('خياط') ||
        e.jobTitle?.includes('قص') ||
        e.jobTitle?.includes('كي')
    );
  }, [employees]);

  // Local piecework state persisted in memory / LocalStorage
  const [logs, setLogs] = useState<TailorPieceworkLog[]>(() => {
    try {
      const saved = localStorage.getItem('salhatex_tailor_piecework_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('salhatex_tailor_piecework_logs', JSON.stringify(logs));
    } catch {}
  }, [logs]);

  const [selectedTailorFilter, setSelectedTailorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddLogModal, setShowAddLogModal] = useState(false);

  // New Log Form State
  const [formEmployeeId, setFormEmployeeId] = useState<string>(tailors[0]?.id || '');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formWorkOrderNumber, setFormWorkOrderNumber] = useState<string>('');
  const [formModelName, setFormModelName] = useState<string>('ثوب سعودي تفصيل');
  const [formOperationType, setFormOperationType] = useState<TailorPieceworkLog['operationType']>('sewing');
  const [formOperationName, setFormOperationName] = useState<string>('خياطة وتجميع ثوب كامل');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formRatePerPiece, setFormRatePerPiece] = useState<number>(25);
  const [formNotes, setFormNotes] = useState<string>('');

  // Handle operation change
  const handleOperationChange = (op: TailorPieceworkLog['operationType']) => {
    setFormOperationType(op);
    if (op === 'cutting') {
      setFormOperationName('قص وفصال باترون');
      setFormRatePerPiece(15);
    } else if (op === 'sewing') {
      setFormOperationName('خياطة وتجميع القطعة');
      setFormRatePerPiece(25);
    } else if (op === 'finishing') {
      setFormOperationName('كي وتشطيب وأزرار');
      setFormRatePerPiece(10);
    } else if (op === 'embroidery') {
      setFormOperationName('تطريز وشك كمبيوتر');
      setFormRatePerPiece(20);
    } else if (op === 'alteration') {
      setFormOperationName('تعديل وتقصير وتضييق');
      setFormRatePerPiece(12);
    } else {
      setFormOperationName('تفصيل وخياطة كاملة');
      setFormRatePerPiece(40);
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const tailor = tailors.find(t => t.id === formEmployeeId);
    if (!tailor) return;

    const newLog: TailorPieceworkLog = {
      id: `log-${Date.now()}`,
      employeeId: formEmployeeId,
      employeeName: tailor.name,
      date: formDate,
      workOrderNumber: formWorkOrderNumber.trim() || undefined,
      modelName: formModelName.trim(),
      operationType: formOperationType,
      operationName: formOperationName.trim(),
      quantity: formQuantity,
      ratePerPiece: formRatePerPiece,
      totalEarned: formQuantity * formRatePerPiece,
      notes: formNotes.trim(),
      isPaid: false,
      createdAt: new Date().toISOString()
    };

    setLogs(prev => [newLog, ...prev]);
    setShowAddLogModal(false);
    posSound.playSuccess();
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      setLogs(prev => prev.filter(l => l.id !== id));
      posSound.playBeep();
    }
  };

  const handleTogglePaid = (id: string) => {
    setLogs(prev =>
      prev.map(l => (l.id === id ? { ...l, isPaid: !l.isPaid } : l))
    );
    posSound.playBeep();
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchTailor = selectedTailorFilter === 'all' || l.employeeId === selectedTailorFilter;
      const matchSearch =
        !searchQuery ||
        l.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.operationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.workOrderNumber && l.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchTailor && matchSearch;
    });
  }, [logs, selectedTailorFilter, searchQuery]);

  // Aggregated Stats
  const stats = useMemo(() => {
    const totalPieces = filteredLogs.reduce((sum, l) => sum + l.quantity, 0);
    const totalEarned = filteredLogs.reduce((sum, l) => sum + l.totalEarned, 0);
    const unpaidEarned = filteredLogs.filter(l => !l.isPaid).reduce((sum, l) => sum + l.totalEarned, 0);
    const paidEarned = filteredLogs.filter(l => l.isPaid).reduce((sum, l) => sum + l.totalEarned, 0);
    return { totalPieces, totalEarned, unpaidEarned, paidEarned };
  }, [filteredLogs]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>نظام تتبع إنتاجية وأجور الخياطين بالقطعة</span>
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-normal">
                Piece-Rate Wages
              </span>
            </h2>
            <p className="text-xs text-indigo-100 mt-0.5">
              حساب مستحقات الخياطين والقصاصين طبقاً لعدد القطع المنجزة والعمليات المنفذة
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddLogModal(true)}
          className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل إنتاجية خياط جديدة</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>إجمالي القطع المنجزة</span>
            <Scissors className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {stats.totalPieces} <span className="text-xs text-slate-500 font-normal">قطعة</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>إجمالي الأجور المستحقة</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 font-mono">
            {stats.totalEarned.toLocaleString('ar-SA')} <span className="text-xs text-slate-500 font-normal">{settings.currency}</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/40 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
            <span>أجور غير مدفوعة (مستحقة)</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 font-mono">
            {stats.unpaidEarned.toLocaleString('ar-SA')} <span className="text-xs text-slate-500 font-normal">{settings.currency}</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs mb-1">
            <span>أجور تم تسويتها وصرفها</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono">
            {stats.paidEarned.toLocaleString('ar-SA')} <span className="text-xs text-slate-500 font-normal">{settings.currency}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الخياط، الموديل، أمر الشغل..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTailorFilter}
              onChange={(e) => setSelectedTailorFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">كافة الخياطين والعمال</option>
              {tailors.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.jobTitle})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Piecework Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-900">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">الخياط / العامل</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">أمر التشغيل</th>
                <th className="p-3.5">الموديل والقطعة</th>
                <th className="p-3.5">العملية المنفذة</th>
                <th className="p-3.5 text-center">الكمية</th>
                <th className="p-3.5 text-center">سعر القطعة</th>
                <th className="p-3.5 text-center">الإجمالي المستحق</th>
                <th className="p-3.5 text-center">حالة الصرف</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    لا توجد سجلات إنتاجية مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {log.employeeName.charAt(0)}
                      </div>
                      <span>{log.employeeName}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{log.date}</td>
                    <td className="p-3.5 font-mono font-semibold text-indigo-700">
                      {log.workOrderNumber || '-'}
                    </td>
                    <td className="p-3.5 font-medium">{log.modelName}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                        {log.operationName}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono text-sm">{log.quantity}</td>
                    <td className="p-3.5 text-center font-mono">{log.ratePerPiece} {settings.currency}</td>
                    <td className="p-3.5 text-center font-bold font-mono text-indigo-700 text-sm">
                      {log.totalEarned.toLocaleString('ar-SA')} {settings.currency}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleTogglePaid(log.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                          log.isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {log.isPaid ? '✓ تم الصرف' : '⏳ مستحق للصرف'}
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="حذف السجل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Piecework Log Modal */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Scissors className="w-4 h-4" />
                <span>تسجيل إنتاجية جديدة للخياط</span>
              </h3>
              <button
                onClick={() => setShowAddLogModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLog} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الخياط / الفني *</label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                >
                  {tailors.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.jobTitle})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الإنجاز</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم أمر الشغل (اختياري)</label>
                  <input
                    type="text"
                    value={formWorkOrderNumber}
                    onChange={(e) => setFormWorkOrderNumber(e.target.value)}
                    placeholder="مثال: JOB-2026-0084"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الموديل / القطعة *</label>
                <input
                  type="text"
                  required
                  value={formModelName}
                  onChange={(e) => setFormModelName(e.target.value)}
                  placeholder="مثال: ثوب سعودي مطرز كبك"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع العملية</label>
                  <select
                    value={formOperationType}
                    onChange={(e) => handleOperationChange(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="sewing">خياطة وتجميع القطعة</option>
                    <option value="cutting">فصال وقص باترون</option>
                    <option value="finishing">كي وتشطيب وأزرار</option>
                    <option value="embroidery">تطريز وشك</option>
                    <option value="alteration">تعديل وتقصير</option>
                    <option value="full_garment">تفصيل وخياطة كاملة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">وصف العملية</label>
                  <input
                    type="text"
                    value={formOperationName}
                    onChange={(e) => setFormOperationName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الكمية المنجزة (قطع) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">أجر القطعة ({settings.currency}) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formRatePerPiece}
                    onChange={(e) => setFormRatePerPiece(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                <span className="text-xs text-indigo-700 font-semibold block">إجمالي المستحق للخياط عن هذا السجل:</span>
                <span className="text-xl font-bold font-mono text-indigo-900">
                  {(formQuantity * formRatePerPiece).toLocaleString('ar-SA')} {settings.currency}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  حفظ السجل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
