import React, { useState, useEffect, useMemo } from 'react';
import { DateInput } from '../components/common/DateInput';
import { useAccounting } from '../context/AccountingContext';
import {
  Employee,
  PayrollSheet,
  PayrollSheetItem,
  SalaryType
} from '../types';
import { posSound } from '../utils/audio';
import { EmployeePayslipModal } from './EmployeePayslipModal';
import { formatDecimalHours } from '../utils/dateUtils';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Wallet,
  Users,
  DollarSign,
  AlertTriangle,
  Layers,
  Save,
  Send,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  RefreshCw,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react';

interface PayrollSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSheet?: PayrollSheet | null;
}

export const PayrollSheetModal: React.FC<PayrollSheetModalProps> = ({
  isOpen,
  onClose,
  editingSheet
}) => {
  const {
    employees,
    accounts,
    attendanceRecords,
    employeeAdvances,
    employeeDeductions,
    employeeIncentives,
    calculateEmployeeSalaryBreakdown,
    createDraftPayrollSheet,
    updateDraftPayrollSheet,
    approveAndDisbursePayrollSheet,
    settings
  } = useAccounting();

  // Wizard Configuration State
  const [title, setTitle] = useState('');
  const [calculationSystem, setCalculationSystem] = useState<'all' | SalaryType>('all');
  const [period, setPeriod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [treasuryAccountCode, setTreasuryAccountCode] = useState('1101');
  const [notes, setNotes] = useState('');

  // Default parameters for calculations
  const [defaultWorkDaysDaily, setDefaultWorkDaysDaily] = useState<number>(26);
  const [defaultWeeksCount, setDefaultWeeksCount] = useState<number>(4);

  // Line items state
  const [items, setItems] = useState<PayrollSheetItem[]>([]);

  // Selected item to view detailed payslip breakdown modal
  const [selectedItemForPayslip, setSelectedItemForPayslip] = useState<PayrollSheetItem | null>(null);

  // Selected treasury details
  const selectedTreasury = accounts.find(a => a.code === treasuryAccountCode);

  // Initialize or re-populate when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date();
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const currentMonthName = monthNames[today.getMonth()];
    const currentYear = today.getFullYear();

    if (editingSheet) {
      setTitle(editingSheet.title);
      setCalculationSystem(editingSheet.calculationSystem);
      setPeriod(editingSheet.period);
      setStartDate(editingSheet.startDate || '');
      setEndDate(editingSheet.endDate || '');
      setTreasuryAccountCode(editingSheet.treasuryAccountCode || '1101');
      setNotes(editingSheet.notes || '');
      setItems(editingSheet.items);
    } else {
      // New Draft default values
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      setTitle(`كشف رواتب شهر ${currentMonthName} ${currentYear}`);
      setCalculationSystem('all');
      setPeriod(`شهر ${currentMonthName} ${currentYear}`);
      setStartDate(firstDay);
      setEndDate(lastDay);
      setTreasuryAccountCode('1101');
      setNotes(`مسودة كشف رواتب العاملين والموظفين لشهر ${currentMonthName}`);

      generateInitialItems('all', 26, 4, firstDay, lastDay);
    }
  }, [isOpen, editingSheet, employees]);

  // Function to build line items from current active employees, attendance records, and pending advances/deductions/incentives
  const generateInitialItems = (
    systemFilter: 'all' | SalaryType,
    workDaysDaily: number,
    weeksCount: number,
    filterStart?: string,
    filterEnd?: string
  ) => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const filteredEmployees = systemFilter === 'all'
      ? activeEmployees
      : activeEmployees.filter(e => e.salaryType === systemFilter);

    const sDate = filterStart !== undefined ? filterStart : startDate;
    const eDate = filterEnd !== undefined ? filterEnd : endDate;

    const generatedItems: PayrollSheetItem[] = filteredEmployees.map(emp => {
      const calc = calculateEmployeeSalaryBreakdown(emp, sDate, eDate, {
        workDaysDaily,
        weeksCount
      });

      return {
        id: 'psi-' + emp.id,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.code,
        jobTitle: emp.jobTitle,
        department: emp.department,
        salaryType: emp.salaryType,
        workDays: calc.presentDays || (emp.salaryType === 'daily' ? workDaysDaily : undefined),
        presentDays: calc.presentDays,
        absentDays: calc.absentDays,
        totalWorkedHours: calc.totalWorkedHours,
        overtimeHours: calc.overtimeHours,
        overtimePay: calc.overtimePay,
        basicSalary: calc.basicSalary,
        allowances: calc.allowances,
        incentives: calc.incentives,
        deductions: calc.deductions,
        lateDeductions: calc.lateDeductions,
        advancesDeducted: calc.advancesDeducted,
        grossEarnings: calc.grossEarnings,
        totalDeductionsCombined: calc.totalDeductionsCombined,
        netSalary: calc.netSalary,
        isIncluded: true
      };
    });

    setItems(generatedItems);
  };

  // When calculation system or default days change in new draft mode
  const handleSystemFilterChange = (newSystem: 'all' | SalaryType) => {
    setCalculationSystem(newSystem);
    if (!editingSheet) {
      generateInitialItems(newSystem, defaultWorkDaysDaily, defaultWeeksCount, startDate, endDate);
      
      const today = new Date();
      if (newSystem === 'weekly') {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        const startStr = start.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];
        setStartDate(startStr);
        setEndDate(endStr);
        setPeriod(`أسبوعي`);
        setTitle(`كشف رواتب أسبوعي: ${startStr} إلى ${endStr}`);
      } else if (newSystem === 'daily') {
        const str = today.toISOString().split('T')[0];
        setStartDate(str);
        setEndDate(str);
        setPeriod(`يومي`);
        setTitle(`كشف رواتب يومي: ${str}`);
      } else {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        const currentMonthName = today.toLocaleDateString('ar-EG', { month: 'long' });
        setStartDate(firstDay);
        setEndDate(lastDay);
        setPeriod(`شهر ${currentMonthName} ${today.getFullYear()}`);
        setTitle(`كشف رواتب شهر ${currentMonthName} ${today.getFullYear()}`);
      }
    }
  };

  const handleDefaultDaysChange = (newDays: number) => {
    setDefaultWorkDaysDaily(newDays);
    setItems(prev =>
      prev.map(item => {
        if (item.salaryType === 'daily') {
          const emp = employees.find(e => e.id === item.employeeId);
          const dailyRate = emp ? emp.salaryAmount : 0;
          const newBasic = Number((dailyRate * newDays).toFixed(2));
          const gross = Number((newBasic + item.allowances + item.incentives + (item.overtimePay || 0)).toFixed(2));
          const totalDed = Number((item.deductions + item.advancesDeducted + (item.lateDeductions || 0)).toFixed(2));
          return {
            ...item,
            workDays: newDays,
            presentDays: newDays,
            basicSalary: newBasic,
            grossEarnings: gross,
            totalDeductionsCombined: totalDed,
            netSalary: Math.max(0, Number((gross - totalDed).toFixed(2)))
          };
        }
        return item;
      })
    );
  };

  // Toggle employee inclusion
  const handleToggleInclude = (itemId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isIncluded: !item.isIncluded } : item
      )
    );
  };

  // Update item numerical field
  const handleUpdateItemField = (
    itemId: string,
    field: 'basicSalary' | 'allowances' | 'incentives' | 'deductions' | 'advancesDeducted' | 'workDays' | 'overtimePay' | 'lateDeductions',
    val: number
  ) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: Math.max(0, val) };

          // If daily workDays changed, recalculate basic
          if (field === 'workDays' && item.salaryType === 'daily') {
            const emp = employees.find(e => e.id === item.employeeId);
            const dailyRate = emp ? emp.salaryAmount : 0;
            updated.basicSalary = Number((dailyRate * Math.max(0, val)).toFixed(2));
            updated.presentDays = Math.max(0, val);
          }

          const gross = Number((updated.basicSalary + updated.allowances + updated.incentives + (updated.overtimePay || 0)).toFixed(2));
          const totalDed = Number((updated.deductions + updated.advancesDeducted + (updated.lateDeductions || 0)).toFixed(2));
          updated.grossEarnings = gross;
          updated.totalDeductionsCombined = totalDed;
          updated.netSalary = Math.max(0, Number((gross - totalDed).toFixed(2)));
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate live summary totals for included items
  const summary = useMemo(() => {
    const included = items.filter(i => i.isIncluded);
    const totalBasic = included.reduce((s, i) => s + i.basicSalary, 0);
    const totalAllowances = included.reduce((s, i) => s + i.allowances, 0);
    const totalIncentives = included.reduce((s, i) => s + i.incentives, 0);
    const totalOvertime = included.reduce((s, i) => s + (i.overtimePay || 0), 0);
    const totalDeductions = included.reduce((s, i) => s + i.deductions, 0);
    const totalLateDeductions = included.reduce((s, i) => s + (i.lateDeductions || 0), 0);
    const totalAdvances = included.reduce((s, i) => s + i.advancesDeducted, 0);
    const totalNet = included.reduce((s, i) => s + i.netSalary, 0);

    return {
      employeesCount: included.length,
      totalBasic,
      totalAllowances,
      totalIncentives,
      totalOvertime,
      totalDeductions,
      totalLateDeductions,
      totalAdvances,
      totalNet
    };
  }, [items]);

  if (!isOpen) return null;

  // Save as draft
  const handleSaveDraft = () => {
    if (!title.trim()) {
      alert('يرجى كتابة عنوان الكشف');
      return;
    }

    if (summary.employeesCount === 0) {
      alert('يرجى تضمين موظف واحد على الأقل في الكشف');
      return;
    }

    const treasuryName = selectedTreasury ? selectedTreasury.name : 'الصندوق النقدي (الكاشير)';

    const sheetPayload = {
      title: title.trim(),
      period: period.trim() || 'فترة حالية',
      startDate,
      endDate,
      salaryType: calculationSystem === 'all' ? 'monthly' : calculationSystem,
      treasuryAccountCode,
      treasuryName,
      items,
      totalBasic: summary.totalBasic,
      totalAllowances: summary.totalAllowances,
      totalIncentives: summary.totalIncentives,
      totalOvertime: summary.totalOvertime,
      totalDeductions: summary.totalDeductions,
      totalLateDeductions: summary.totalLateDeductions,
      totalAdvances: summary.totalAdvances,
      totalNet: summary.totalNet,
      employeesCount: summary.employeesCount,
      notes: notes.trim() || undefined
    };

    if (editingSheet) {
      updateDraftPayrollSheet(editingSheet.id, sheetPayload);
    } else {
      createDraftPayrollSheet(sheetPayload);
    }

    posSound.playSuccessBeep();
    onClose();
  };

  // Approve & Disburse immediately
  const handleApproveAndDisburse = () => {
    if (!title.trim()) {
      alert('يرجى كتابة عنوان الكشف');
      return;
    }

    if (summary.employeesCount === 0) {
      alert('يرجى تضمين موظف واحد على الأقل في الكشف');
      return;
    }

    if (selectedTreasury && selectedTreasury.balance < summary.totalNet) {
      alert(
        `تنبيه مالي: رصيد ${selectedTreasury.name} الحالي (${selectedTreasury.balance.toLocaleString()} ر.س) غير كافٍ لصرف إجمالي الرواتب (${summary.totalNet.toLocaleString()} ر.س). يرجى تغذية الخزينة أو اختيار الخزينة الأخرى.`
      );
      return;
    }

    if (
      !window.confirm(
        `هل أنت متأكد من اعتماد وصرف كشف الرواتب "${title}"؟\n\nسيتم خصم إجمالي الصافي (${summary.totalNet.toLocaleString()} ر.س) فوراً من ${selectedTreasury?.name}، وتسجيل سند صرف وقيد محاسبي، وتحديث سجلات الموظفين وسداد السلف.`
      )
    ) {
      return;
    }

    const treasuryName = selectedTreasury ? selectedTreasury.name : 'الصندوق النقدي (الكاشير)';

    const sheetPayload = {
      title: title.trim(),
      period: period.trim() || 'فترة حالية',
      startDate,
      endDate,
      salaryType: calculationSystem === 'all' ? 'monthly' : calculationSystem,
      treasuryAccountCode,
      treasuryName,
      items,
      totalBasic: summary.totalBasic,
      totalAllowances: summary.totalAllowances,
      totalIncentives: summary.totalIncentives,
      totalOvertime: summary.totalOvertime,
      totalDeductions: summary.totalDeductions,
      totalLateDeductions: summary.totalLateDeductions,
      totalAdvances: summary.totalAdvances,
      totalNet: summary.totalNet,
      employeesCount: summary.employeesCount,
      notes: notes.trim() || undefined
    };

    let targetSheetId = editingSheet ? editingSheet.id : '';
    if (editingSheet) {
      updateDraftPayrollSheet(editingSheet.id, sheetPayload);
    } else {
      const created = createDraftPayrollSheet(sheetPayload);
      targetSheetId = created.id;
    }

    const result = approveAndDisbursePayrollSheet(targetSheetId, treasuryAccountCode);
    if (result.success) {
      posSound.playCashBeep();
      onClose();
    } else {
      alert(result.message || 'حدث خطأ أثناء الصرف');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]" dir="rtl">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">
                {editingSheet ? `تعديل مسودة كشف الرواتب (${editingSheet.sheetNumber})` : 'إنشاء مسودة كشف رواتب ومسير أجور'}
              </h2>
              <p className="text-xs text-slate-300">
                تحديد نظام الاحتساب، تسوية السلف والخصومات والحوافز، واختيار خزينة الصرف
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Top Controls Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                عنوان الكشف / المسمى <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: كشف رواتب شهر مارس 2026"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Calculation System */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                نظام الاحتساب <span className="text-rose-500">*</span>
              </label>
              <select
                value={calculationSystem}
                onChange={e => handleSystemFilterChange(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كافة الأنظمة (شهري، أسبوعي، يومي)</option>
                <option value="monthly">الرواتب الشهرية فقط</option>
                <option value="weekly">الرواتب الأسبوعية فقط</option>
                <option value="daily">أجور اليومية فقط</option>
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                وصف الفترة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="مثال: مارس 2026 أو الأسبوع 10"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Dates */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">من تاريخ</label>
              <DateInput value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">إلى تاريخ</label>
              <DateInput value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800"
              />
            </div>

            {/* Treasury Selection (Critical user requirement) */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-900">
                  <Wallet className="w-3.5 h-3.5 text-blue-600" />
                  خزينة الصرف المحددة (يُخصم منها المبلغ عند الاعتماد) <span className="text-rose-500">*</span>
                </span>
                {selectedTreasury && (
                  <span className="text-[11px] font-mono">
                    الرصيد المتاح: <strong className={selectedTreasury.balance >= summary.totalNet ? 'text-emerald-700' : 'text-rose-600'}>
                      {selectedTreasury.balance.toLocaleString()} ر.س
                    </strong>
                  </span>
                )}
              </label>
              <select
                value={treasuryAccountCode}
                onChange={e => setTreasuryAccountCode(e.target.value)}
                className="w-full bg-white border-2 border-blue-400 rounded-lg px-3 py-2 text-xs font-bold text-blue-950 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="1101">الصندوق النقدي (الكاشير الرئيسي) - كود 1101</option>
                <option value="1102">الحساب البنكي (مصرف الراجحي) - كود 1102</option>
              </select>
            </div>

          </div>

          {/* Daily / Weekly Helper Options (Only shown if relevant) */}
          {(calculationSystem === 'all' || calculationSystem === 'daily') && (
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-amber-900">أيام العمل الافتراضية لأصحاب اليومية في هذا الكشف:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={defaultWorkDaysDaily}
                  onChange={e => handleDefaultDaysChange(parseInt(e.target.value) || 0)}
                  className="w-20 bg-white border border-amber-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-slate-900"
                />
                <span className="text-slate-600">يوم عمل (تُحسب تلقائياً: اليومية × الأيام)</span>
              </div>
            </div>
          )}

          {/* Salary Calculation Policy & Formula Banner (آلية احتساب الراتب الصحيحة) */}
          <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3.5 rounded-xl border border-indigo-700 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-blue-200">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>آلية وقواعد احتساب راتب العامل المعتمدة في النظام:</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                محاسبة دقيقة للدوام وساعات العمل
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] text-slate-200 pt-1">
              <div className="bg-white/10 p-2 rounded-lg border border-white/10">
                <span className="text-amber-300 font-bold block mb-0.5">1. أساس الدوام والساعات:</span>
                <span className="text-[10px] text-slate-300 leading-relaxed block">
                  يُحسب من أيام الحضور الفعلي وساعات العمل الصافية (بعد خصم دقائق الاستراحة) وخصم أيام الغياب.
                </span>
              </div>

              <div className="bg-white/10 p-2 rounded-lg border border-white/10">
                <span className="text-emerald-300 font-bold block mb-0.5">2. الإضافات والمستحقات (+):</span>
                <span className="text-[10px] text-slate-300 leading-relaxed block">
                  الأساسي المستحق + أجر ساعات الأوفرتايم + العلاوات والبدلات الثابتة + المكافآت والحوافز.
                </span>
              </div>

              <div className="bg-white/10 p-2 rounded-lg border border-white/10">
                <span className="text-rose-300 font-bold block mb-0.5">3. الاستقطاعات والخصومات (-):</span>
                <span className="text-[10px] text-slate-300 leading-relaxed block">
                  السلف المالية المستقطعة + الجزاءات والخصومات الإدارية + خصومات التأخير الصباحي.
                </span>
              </div>

              <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-400/30">
                <span className="text-cyan-300 font-bold block mb-0.5">4. صافي الراتب المستحق:</span>
                <span className="text-[10px] font-mono text-white block mt-0.5 font-bold">
                  الصافي = إجمالي الاستحقاقات - إجمالي الاستقطاعات
                </span>
              </div>
            </div>
          </div>

          {/* Employees Calculation Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <span>جدول احتساب رواتب الموظفين ({items.filter(i => i.isIncluded).length} من {items.length} موظف مشمول)</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                يمكنك الضغط على أيقونة 👁️ أمام أي عامل لمعاينة قسيمة الحسبة التفصيلية وطباعتها
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                      <th className="p-2 text-center w-8">تضمين</th>
                      <th className="p-2">الموظف والوظيفة</th>
                      <th className="p-2 text-center">النظام</th>
                      <th className="p-2 text-center bg-blue-50/60 min-w-[130px]">الحضور والغياب والساعات</th>
                      <th className="p-2 text-center min-w-[85px]">الأساسي المستحق</th>
                      <th className="p-2 text-center min-w-[85px] text-amber-800">+ الإضافي (أوفرتايم)</th>
                      <th className="p-2 text-center min-w-[70px]">البدلات</th>
                      <th className="p-2 text-center min-w-[75px] text-emerald-800">+ الحوافز</th>
                      <th className="p-2 text-center min-w-[85px] text-rose-800">- الخصومات والتأخير</th>
                      <th className="p-2 text-center min-w-[85px] text-amber-900">- السلف المستقطعة</th>
                      <th className="p-2 text-center min-w-[100px] font-black bg-blue-50 text-blue-900">صافي المستحق</th>
                      <th className="p-2 text-center w-12">قسيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const salaryLabel = item.salaryType === 'monthly' ? 'شهري' : item.salaryType === 'weekly' ? 'أسبوعي' : 'يومي';
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            !item.isIncluded
                              ? 'bg-slate-50/50 opacity-40'
                              : 'hover:bg-blue-50/20 bg-white'
                          }`}
                        >
                          {/* Include checkbox */}
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.isIncluded}
                              onChange={() => handleToggleInclude(item.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            />
                          </td>

                          {/* Name & Job */}
                          <td className="p-2">
                            <div className="font-bold text-slate-900 text-xs">{item.employeeName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.employeeCode} | {item.jobTitle}</div>
                          </td>

                          {/* Salary Type & workdays */}
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {salaryLabel}
                            </span>
                            {item.salaryType === 'daily' && (
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.workDays || defaultWorkDaysDaily}
                                  onChange={e => handleUpdateItemField(item.id, 'workDays', parseInt(e.target.value) || 0)}
                                  className="w-11 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-mono text-[10px]"
                                  title="أيام العمل المحتسبة"
                                />
                                <span className="text-[9px] text-slate-400">يوم</span>
                              </div>
                            )}
                          </td>

                          {/* Attendance Days & Worked Hours */}
                          <td className="p-2 text-center bg-blue-50/30">
                            <div className="flex items-center justify-center gap-1 text-[10px] font-mono">
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200" title="أيام الحضور الفعلي">
                                {item.presentDays ?? item.workDays ?? 0} حضور
                              </span>
                              <span className={`px-1 py-0.5 rounded border font-bold ${item.absentDays ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-400 border-slate-100'}`} title="أيام الغياب">
                                {item.absentDays ?? 0} غياب
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                              {formatDecimalHours(item.totalWorkedHours ?? 0)} صافي العمل
                            </div>
                          </td>

                          {/* Basic Salary */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.basicSalary}
                              onChange={e => handleUpdateItemField(item.id, 'basicSalary', parseFloat(e.target.value) || 0)}
                              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-slate-800 focus:bg-white text-xs"
                            />
                          </td>

                          {/* Overtime Pay */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.overtimePay || 0}
                              onChange={e => handleUpdateItemField(item.id, 'overtimePay', parseFloat(e.target.value) || 0)}
                              className="w-18 bg-amber-50/60 border border-amber-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-900 focus:bg-white text-xs"
                            />
                            {item.overtimeHours && item.overtimeHours > 0 ? (
                              <div className="text-[9px] text-amber-700 font-mono mt-0.5">
                                +{formatDecimalHours(item.overtimeHours)}
                              </div>
                            ) : null}
                          </td>

                          {/* Allowances */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.allowances}
                              onChange={e => handleUpdateItemField(item.id, 'allowances', parseFloat(e.target.value) || 0)}
                              className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-mono text-slate-800 focus:bg-white text-xs"
                            />
                          </td>

                          {/* Incentives */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.incentives}
                              onChange={e => handleUpdateItemField(item.id, 'incentives', parseFloat(e.target.value) || 0)}
                              className="w-18 bg-emerald-50/60 border border-emerald-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-800 focus:bg-white text-xs"
                            />
                          </td>

                          {/* Deductions & Late */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.deductions}
                              onChange={e => handleUpdateItemField(item.id, 'deductions', parseFloat(e.target.value) || 0)}
                              className="w-18 bg-rose-50/60 border border-rose-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-rose-800 focus:bg-white text-xs"
                            />
                            {item.lateDeductions && item.lateDeductions > 0 ? (
                              <div className="text-[9px] text-rose-600 font-mono mt-0.5" title="يشمل خصم تأخير">
                                تأخير: {item.lateDeductions} ₪
                              </div>
                            ) : null}
                          </td>

                          {/* Advances Deducted */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.advancesDeducted}
                              onChange={e => handleUpdateItemField(item.id, 'advancesDeducted', parseFloat(e.target.value) || 0)}
                              className="w-18 bg-amber-50/60 border border-amber-200 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-900 focus:bg-white text-xs"
                            />
                          </td>

                          {/* Net Salary */}
                          <td className="p-2 text-center bg-blue-50/40">
                            <span className="font-mono font-black text-slate-900 text-xs">
                              {item.netSalary.toLocaleString()} {settings.currency || '₪'}
                            </span>
                          </td>

                          {/* Payslip Action Button */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedItemForPayslip(item)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100/60 rounded-lg transition-colors cursor-pointer"
                              title="عرض قسيمة الراتب التفصيلية للموظف"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals Summary Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 block">إجمالي الأساسي</span>
              <span className="text-xs font-bold font-mono text-white mt-1 block">
                {summary.totalBasic.toLocaleString()} {settings.currency || '₪'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-[10px] text-amber-400 block">+ إجمالي الأوفرتايم</span>
              <span className="text-xs font-bold font-mono text-amber-300 mt-1 block">
                +{summary.totalOvertime.toLocaleString()} {settings.currency || '₪'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-[10px] text-emerald-400 block">+ البدلات والحوافز</span>
              <span className="text-xs font-bold font-mono text-emerald-300 mt-1 block">
                +{(summary.totalAllowances + summary.totalIncentives).toLocaleString()} {settings.currency || '₪'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-[10px] text-rose-400 block">- الخصومات والتأخير</span>
              <span className="text-xs font-bold font-mono text-rose-300 mt-1 block">
                -{(summary.totalDeductions + (summary.totalLateDeductions || 0)).toLocaleString()} {settings.currency || '₪'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-[10px] text-amber-400 block">- السلف المستقطعة</span>
              <span className="text-xs font-bold font-mono text-amber-300 mt-1 block">
                -{summary.totalAdvances.toLocaleString()} {settings.currency || '₪'}
              </span>
            </div>

            <div className="bg-blue-600 p-2 rounded-lg border border-blue-500">
              <span className="text-[10px] text-blue-100 block font-bold">صافي الكشف للصرف</span>
              <span className="text-sm font-black font-mono text-white mt-0.5 block">
                {summary.totalNet.toLocaleString()} {settings.currency || '₪'}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              الخزينة المحددة: <strong>{selectedTreasury?.name}</strong> (الرصيد: {selectedTreasury?.balance.toLocaleString()} ر.س)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>حفظ كمسودة</span>
            </button>

            <button
              type="button"
              onClick={handleApproveAndDisburse}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد وصرف الكشف من الخزينة</span>
            </button>
          </div>
        </div>

        {/* Detailed Employee Payslip Modal */}
        {selectedItemForPayslip && (
          <EmployeePayslipModal
            isOpen={Boolean(selectedItemForPayslip)}
            onClose={() => setSelectedItemForPayslip(null)}
            item={selectedItemForPayslip}
            period={period}
            sheetTitle={title}
            startDate={startDate}
            endDate={endDate}
          />
        )}

      </div>
    </div>
  );
};
