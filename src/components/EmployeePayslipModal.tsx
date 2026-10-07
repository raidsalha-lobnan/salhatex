import React from 'react';
import { PayrollSheetItem, Employee } from '../types';
import { useAccounting } from '../context/AccountingContext';
import { formatDecimalHours } from '../utils/dateUtils';
import { tafqeet } from '../utils/tafqeet';
import {
  X,
  Printer,
  Calendar,
  Clock,
  User,
  Briefcase,
  Building,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Wallet,
  FileText,
  BadgePercent
} from 'lucide-react';

interface EmployeePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollSheetItem | null;
  period?: string;
  sheetTitle?: string;
  startDate?: string;
  endDate?: string;
}

export const EmployeePayslipModal: React.FC<EmployeePayslipModalProps> = ({
  isOpen,
  onClose,
  item,
  period,
  sheetTitle,
  startDate,
  endDate
}) => {
  const { employees, settings } = useAccounting();

  if (!isOpen || !item) return null;

  const emp = employees.find(e => e.id === item.employeeId);
  const currencySymbol = settings.currency || '₪';
  const currencyName = settings.currency === 'SAR' ? 'ريال سعودي' : settings.currency === 'USD' ? 'دولار أمريكي' : 'شيكل';

  // Compute breakdown components
  const basicSalary = item.basicSalary || 0;
  const allowances = item.allowances || 0;
  const incentives = item.incentives || 0;
  const overtimePay = item.overtimePay || 0;
  const overtimeHours = item.overtimeHours || 0;
  
  // Total Gross Earnings (إجمالي الاستحقاقات)
  const totalEarnings = basicSalary + allowances + incentives + overtimePay;

  // Deductions
  const generalDeductions = item.deductions || 0;
  const lateDeductions = item.lateDeductions || 0;
  const advancesDeducted = item.advancesDeducted || 0;

  // Total Deductions (إجمالي الاستقطاعات)
  const totalDeductions = generalDeductions + lateDeductions + advancesDeducted;

  // Net salary
  const netSalary = item.netSalary;
  const netInWords = tafqeet(netSalary, currencyName);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header (Screen view) */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">قسيمة راتب العامل وتفاصيل الحسبة التفصيلية</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {sheetTitle || 'مسير الرواتب والأجور'} {period ? `— ${period}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              title="طباعة قسيمة الراتب"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة القسيمة</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Viewable Payslip Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs print:p-0 print:m-0" id="printable-payslip">
          
          {/* Company & Payslip Heading */}
          <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
            <div>
              <h1 className="text-base font-black text-slate-900">{settings.companyName || 'منشأة الخياطة والإنتاج'}</h1>
              <p className="text-[11px] text-slate-500">إدارة الموارد البشرية والرواتب والأجور</p>
            </div>
            <div className="text-left">
              <span className="inline-block bg-slate-900 text-white font-mono font-bold px-2.5 py-0.5 rounded text-[11px]">
                قسيمة راتب عامل (PAYSLIP)
              </span>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                تاريخ الإصدار: {new Date().toISOString().split('T')[0]}
              </p>
            </div>
          </div>

          {/* Employee Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block font-medium">اسم العامل:</span>
              <span className="font-bold text-slate-900 block text-xs mt-0.5">{item.employeeName}</span>
              <span className="text-[10px] text-blue-700 font-mono font-semibold">{item.employeeCode}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block font-medium">المسمى الوظيفي:</span>
              <span className="font-semibold text-slate-800 block text-xs mt-0.5">{item.jobTitle || 'عامل إنتاج'}</span>
              <span className="text-[10px] text-slate-500">{emp?.department || item.department}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block font-medium">نظام احتساب الراتب:</span>
              <span className="font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5 border border-indigo-200">
                {item.salaryType === 'monthly' ? 'راتب شهري مقطوع' : item.salaryType === 'weekly' ? 'راتب أسبوعي' : 'أجر يومي (يومية)'}
              </span>
              {emp?.salaryAmount && (
                <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                  المعتمد: {emp.salaryAmount} {currencySymbol}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block font-medium">فترة الراتب المحتسبة:</span>
              <span className="font-bold text-slate-900 block text-xs mt-0.5">{period || 'الشهر الحالي'}</span>
              {(startDate || endDate) && (
                <span className="text-[10px] text-slate-500 font-mono block">
                  {startDate} ➔ {endDate}
                </span>
              )}
            </div>
          </div>

          {/* Attendance & Hours Summary Strip (أيام الحضور والغياب وساعات الدوام) */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                <span>سجل الحضور والغياب وساعات العمل للفترة:</span>
              </span>
              <span className="text-[10px] text-blue-700 font-semibold bg-white px-2 py-0.5 rounded border border-blue-200">
                مستخرج آلياً من كشف الحضور
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[10px] block">أيام الحضور الفعلي</span>
                <span className="font-bold text-emerald-700 text-sm font-mono mt-0.5 block">
                  {item.presentDays ?? item.workDays ?? item.daysWorked ?? 0} يوم
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[10px] block">أيام الغياب</span>
                <span className={`font-bold text-sm font-mono mt-0.5 block ${item.absentDays ? 'text-rose-600' : 'text-slate-400'}`}>
                  {item.absentDays ?? 0} يوم
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[10px] block">ساعات العمل الفعلية</span>
                <span className="font-bold text-blue-900 text-sm font-mono mt-0.5 block">
                  {formatDecimalHours(item.totalWorkedHours ?? 0)}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[10px] block">ساعات الأوفرتايم (الإضافي)</span>
                <span className="font-bold text-amber-700 text-sm font-mono mt-0.5 block">
                  {overtimeHours > 0 ? `+${formatDecimalHours(overtimeHours)}` : '0 س'}
                </span>
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Grid (الاستحقاقات مقابل الاستقطاعات) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Green Column: Earnings (الاستحقاقات والإضافات) */}
            <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-emerald-100/80 px-3.5 py-2 border-b border-emerald-200 flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span>1. الاستحقاقات والإضافات (+)</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded">
                  تضاف للراتب
                </span>
              </div>

              <div className="p-3 space-y-2 flex-1">
                {/* Basic Salary */}
                <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                  <div>
                    <span className="font-semibold text-slate-800 block">الراتب الأساسي المستحق:</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.salaryType === 'daily'
                        ? `(عن ${item.presentDays ?? item.workDays ?? 0} يوم عمل)`
                        : item.absentDays && item.absentDays > 0
                        ? `(بعد خصم أجر ${item.absentDays} يوم غياب)`
                        : 'عن كامل أيام الدوام'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {basicSalary.toLocaleString()} {currencySymbol}
                  </span>
                </div>

                {/* Overtime Pay */}
                <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                  <div>
                    <span className="font-semibold text-slate-800 block">أجر الساعات الإضافية (الأوفرتايم):</span>
                    <span className="text-[10px] text-amber-700 font-mono">
                      {overtimeHours > 0 ? `${formatDecimalHours(overtimeHours, 'long')} عمل إضافي` : 'لا يوجد إضافي مسجل'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-800 text-xs">
                    {overtimePay > 0 ? `+${overtimePay.toLocaleString()} ${currencySymbol}` : `0 ${currencySymbol}`}
                  </span>
                </div>

                {/* Allowances */}
                <div className="flex items-center justify-between py-1 border-b border-emerald-100">
                  <div>
                    <span className="font-semibold text-slate-800 block">العلاوات والبدلات الثابتة:</span>
                    <span className="text-[10px] text-slate-500">بدل سكن / مواصلات / مظهر</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {allowances > 0 ? `+${allowances.toLocaleString()} ${currencySymbol}` : `0 ${currencySymbol}`}
                  </span>
                </div>

                {/* Incentives */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="font-semibold text-slate-800 block">المكافآت والحوافز التقديرية:</span>
                    <span className="text-[10px] text-emerald-700">حافز إنتاج وتميز</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-800 text-xs">
                    {incentives > 0 ? `+${incentives.toLocaleString()} ${currencySymbol}` : `0 ${currencySymbol}`}
                  </span>
                </div>
              </div>

              {/* Total Earnings Footer */}
              <div className="bg-emerald-100/90 px-3.5 py-2 border-t border-emerald-200 flex items-center justify-between font-bold text-xs text-emerald-950">
                <span>إجمالي الاستحقاقات:</span>
                <span className="font-mono font-black text-sm text-emerald-900">
                  {totalEarnings.toLocaleString()} {currencySymbol}
                </span>
              </div>
            </div>

            {/* 2. Red Column: Deductions (الاستقطاعات والخصومات) */}
            <div className="bg-rose-50/40 border border-rose-200 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-rose-100/80 px-3.5 py-2 border-b border-rose-200 flex items-center justify-between">
                <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-700" />
                  <span>2. الاستقطاعات والخصومات (-)</span>
                </span>
                <span className="text-[10px] font-bold text-rose-800 bg-white px-2 py-0.5 rounded">
                  تُخصم من الراتب
                </span>
              </div>

              <div className="p-3 space-y-2 flex-1">
                {/* Advances Deducted */}
                <div className="flex items-center justify-between py-1 border-b border-rose-100">
                  <div>
                    <span className="font-semibold text-slate-800 block">السلف المالية المقتطعة:</span>
                    <span className="text-[10px] text-slate-500">سلف نقدية مسحوبة مسبقاً</span>
                  </div>
                  <span className="font-mono font-bold text-amber-900 text-xs">
                    {advancesDeducted > 0 ? `-${advancesDeducted.toLocaleString()} ${currencySymbol}` : `0 ${currencySymbol}`}
                  </span>
                </div>

                {/* Administrative / Disciplinary Deductions */}
                <div className="flex items-center justify-between py-1 border-b border-rose-100">
                  <div>
                    <span className="font-semibold text-slate-800 block">الخصومات والجزاءات:</span>
                    <span className="text-[10px] text-slate-500">غرامات تلفيات أو مخالفات</span>
                  </div>
                  <span className="font-mono font-bold text-rose-800 text-xs">
                    {generalDeductions > 0 ? `-${generalDeductions.toLocaleString()} ${currencySymbol}` : `0 ${currencySymbol}`}
                  </span>
                </div>

                {/* Late & Attendance Penalties */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="font-semibold text-slate-800 block">خصومات التأخير الصباحي:</span>
                    <span className="text-[10px] text-slate-500">تأخير الحضور عن الموعد الرسمي</span>
                  </div>
                  <span className="font-mono font-bold text-rose-800 text-xs">
                    {lateDeductions > 0 ? `-${lateDeductions.toLocaleString()} ${currencySymbol}` : `0 ${currencySymbol}`}
                  </span>
                </div>
              </div>

              {/* Total Deductions Footer */}
              <div className="bg-rose-100/90 px-3.5 py-2 border-t border-rose-200 flex items-center justify-between font-bold text-xs text-rose-950">
                <span>إجمالي الاستقطاعات:</span>
                <span className="font-mono font-black text-sm text-rose-900">
                  -{totalDeductions.toLocaleString()} {currencySymbol}
                </span>
              </div>
            </div>

          </div>

          {/* Net Salary Highlight Box (صافي الراتب المستحق للصرف) */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-400 text-xs font-semibold block">صافي الراتب المستحق للصرف للعامل (Net Pay):</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  (إجمالي الاستحقاقات {totalEarnings.toLocaleString()} - إجمالي الاستقطاعات {totalDeductions.toLocaleString()})
                </span>
              </div>
              <div className="text-left">
                <span className="font-mono font-black text-2xl text-emerald-400">
                  {netSalary.toLocaleString()} {currencySymbol}
                </span>
              </div>
            </div>

            {/* Tafqeet in Arabic */}
            <div className="pt-2 border-t border-slate-800 text-xs font-medium text-slate-300">
              <span className="text-slate-400">المبلغ كتابة وتفقيطاً: </span>
              <strong className="text-white font-bold">{netInWords} لا غير</strong>
            </div>
          </div>

          {/* Signatures & Approvals (for official printing) */}
          <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700">
            <div className="text-center space-y-8">
              <div>
                <p className="font-bold">إعداد وتدقيق المحاسب / الإدارة:</p>
                <p className="text-[11px] text-slate-400">المسؤول المالي</p>
              </div>
              <div className="border-b border-dashed border-slate-400 w-36 mx-auto pt-4"></div>
              <p className="text-[10px] text-slate-400">التوقيع والختم</p>
            </div>

            <div className="text-center space-y-8">
              <div>
                <p className="font-bold">توقيع وإقرار العامل بالاستلام:</p>
                <p className="text-[11px] text-slate-400">{item.employeeName}</p>
              </div>
              <div className="border-b border-dashed border-slate-400 w-36 mx-auto pt-4"></div>
              <p className="text-[10px] text-slate-400">أقر باستلام كامل مستحقاتي الموضحة أعلاه</p>
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer (Screen view only) */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 no-print">
          <div className="text-slate-500 font-mono text-[11px]">
            معادلة الصافي: (الأساسي + الإضافي + البدلات + الحوافز) - (الخصومات + السلف)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة القسيمة</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
