import React, { useState, useMemo, useEffect } from 'react';
import { DateInput } from '../components/common/DateInput';
import { useAccounting } from '../context/AccountingContext';
import {
  generateAccountStatement,
  generateEmployeeStatement,
  exportStatementToCSV,
  exportEmployeeStatementToCSV,
  StatementRow,
  EmployeeStatementRow
} from '../utils/statementGenerator';
import { formatNumber } from '../utils/numberFormat';
import { formatDecimalHours } from '../utils/dateUtils';
import { tafqeet } from '../utils/tafqeet';
import {
  X,
  Printer,
  Download,
  Calendar,
  Filter,
  Users,
  Building,
  UserCheck,
  Phone,
  CreditCard,
  Receipt,
  FileText,
  BadgeDollarSign,
  Briefcase,
  ChevronDown,
  Info,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { OfficialStamp } from './common/OfficialStamp';
import { Party, Employee } from '../types';
import { PrintHeader } from './common/PrintHeader';

export const AccountStatementModal: React.FC = () => {
  const {
    selectedPartyForStatement,
    setSelectedPartyForStatement,
    selectedEmployeeForStatement,
    setSelectedEmployeeForStatement,
    parties,
    employees,
    invoices,
    purchases,
    purchaseReturns,
    vouchers,
    printOrders,
    journalEntries,
    employeeAdvances,
    employeeDeductions,
    employeeIncentives,
    debtClearings,
    attendanceRecords,
    settings
  } = useAccounting();

  // Mode: 'party' or 'employee'
  const [statementMode, setStatementMode] = useState<'party' | 'employee'>('party');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  // Synchronize initial selection when modal opens
  useEffect(() => {
    if (selectedEmployeeForStatement) {
      setStatementMode('employee');
      setSelectedEmpId(selectedEmployeeForStatement.id);
    } else if (selectedPartyForStatement) {
      setStatementMode('party');
      setSelectedPartyId(selectedPartyForStatement.id);
    }
  }, [selectedPartyForStatement, selectedEmployeeForStatement]);

  // Date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [showItemDetails, setShowItemDetails] = useState<boolean>(true);
  const [empViewMode, setEmpViewMode] = useState<'financial_ledger' | 'attendance_diary'>('attendance_diary');

  // Active party or employee
  const currentParty = useMemo(() => {
    if (selectedPartyId) {
      return parties.find(p => p.id === selectedPartyId) || null;
    }
    return selectedPartyForStatement;
  }, [selectedPartyId, selectedPartyForStatement, parties]);

  const parentParty = useMemo(() => {
    if (currentParty && currentParty.parentCustomerId) {
      return parties.find(p => p.id === currentParty.parentCustomerId) || null;
    }
    return null;
  }, [currentParty, parties]);

  const clientDisplayName = useMemo(() => {
    if (!currentParty) return '';
    if (currentParty.isSubCustomer && parentParty) {
      return `${parentParty.name} / ${currentParty.name}`;
    }
    if (currentParty.parentCustomerName) {
      return `${currentParty.parentCustomerName} / ${currentParty.name}`;
    }
    return currentParty.name;
  }, [currentParty, parentParty]);

  const currentEmployee = useMemo(() => {
    if (selectedEmpId) {
      return employees.find(e => e.id === selectedEmpId) || null;
    }
    return selectedEmployeeForStatement;
  }, [selectedEmpId, selectedEmployeeForStatement, employees]);

  // Generate Party Statement
  const partyStatement = useMemo(() => {
    if (statementMode !== 'party' || !currentParty) return null;
    return generateAccountStatement({
      party: currentParty,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      invoices,
      purchases,
      purchaseReturns,
      vouchers,
      printOrders,
      journalEntries,
      debtClearings
    });
  }, [statementMode, currentParty, fromDate, toDate, invoices, purchases, purchaseReturns, vouchers, printOrders, journalEntries, debtClearings]);

  // Generate Employee Statement
  const employeeStatement = useMemo(() => {
    if (statementMode !== 'employee' || !currentEmployee) return null;
    return generateEmployeeStatement({
      employee: currentEmployee,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      vouchers,
      advances: employeeAdvances,
      deductions: employeeDeductions,
      incentives: employeeIncentives,
      attendanceRecords,
      currencySymbol: settings.currency || '₪'
    });
  }, [statementMode, currentEmployee, fromDate, toDate, vouchers, employeeAdvances, employeeDeductions, employeeIncentives, attendanceRecords, settings.currency]);

  const isOpen = Boolean(selectedPartyForStatement || selectedEmployeeForStatement);

  const handleClose = () => {
    setSelectedPartyId('');
    setSelectedEmpId('');
    setSelectedPartyForStatement(null);
    setSelectedEmployeeForStatement(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-mode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-mode');
    }, 1000);
  };

  const handleExportCSV = () => {
    if (statementMode === 'party' && partyStatement) {
      exportStatementToCSV(partyStatement, settings.currency || '₪');
    } else if (statementMode === 'employee' && employeeStatement) {
      exportEmployeeStatementToCSV(employeeStatement, settings.currency || '₪');
    }
  };

  const setDatePreset = (preset: 'all' | 'today' | 'this_month' | 'last_month' | 'this_year') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'last_month') {
      const firstDay = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m, 0).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'this_year') {
      const firstDay = `${y}-01-01`;
      const lastDay = `${y}-12-31`;
      setFromDate(firstDay);
      setToDate(lastDay);
    }
  };

  // Filtered rows for party
  const displayedPartyRows = partyStatement ? partyStatement.rows.filter(r => {
    if (filterType === 'debit') return r.debit > 0;
    if (filterType === 'credit') return r.credit > 0;
    return true;
  }) : [];

  const isCustomer = currentParty ? (currentParty.type === 'customer' || currentParty.type === 'both') : false;
  const isSupplier = currentParty ? (currentParty.type === 'supplier' || currentParty.type === 'both') : false;

  const currentCurrencyNameOrCode = settings.baseCurrencyCode || settings.currency || 'ILS';
  const partyTafqeet = partyStatement ? tafqeet(partyStatement.closingBalance, currentCurrencyNameOrCode) : '';
  const empTafqeet = employeeStatement ? tafqeet(employeeStatement.closingBalance, currentCurrencyNameOrCode) : '';

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible print-area cursor-pointer"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-visible my-auto flex flex-col print:max-w-none print:border-none print:shadow-none print:w-full print:rounded-none cursor-default"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {statementMode === 'employee'
                    ? `كشف مالي تفصيلي للموظف: ${currentEmployee?.name || 'اختر موظف'}`
                    : `كشف حساب مالي تفصيلي: ${currentParty?.name || 'اختر حساب'}`}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  statementMode === 'employee' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  isCustomer ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {statementMode === 'employee' ? 'موظف' : isCustomer ? 'عميل' : 'مورد خامات'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                نظام الرصيد التراكمي المستمر (Continuous Running Balance) معتمد لترويسة المنشأة والطباعة A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="تصدير كشف الحساب إلى إكسل CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>تصدير CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="طباعة رسمية A4 مع ترويسة المنشأة"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة A4</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Entity Switcher & Date Filters (Hidden in Print) */}
        <div className="bg-slate-50 p-3 border-b border-slate-200 space-y-2.5 text-xs print:hidden">
          
          {/* Switcher Bar between Customer/Supplier and Employee */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">نوع الكشف:</span>
              <div className="flex rounded-lg bg-slate-200/80 p-0.5 border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setStatementMode('party');
                    if (!selectedPartyId && parties.length > 0) setSelectedPartyId(parties[0].id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    statementMode === 'party'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>عميل / مورد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatementMode('employee');
                    if (!selectedEmpId && employees.length > 0) setSelectedEmpId(employees[0].id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    statementMode === 'employee'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>موظف وكادر العمل</span>
                </button>
              </div>
            </div>

            {/* Quick Entity Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">
                {statementMode === 'party' ? 'اختر العميل/المورد:' : 'اختر الموظف:'}
              </span>
              {statementMode === 'party' ? (
                <select
                  value={currentParty?.id || ''}
                  onChange={e => setSelectedPartyId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-blue-500 max-w-xs truncate"
                >
                  <optgroup label="العملاء">
                    {parties.filter(p => p.type === 'customer' || p.type === 'both').map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code || 'عميل'})</option>
                    ))}
                  </optgroup>
                  <optgroup label="الموردين">
                    {parties.filter(p => p.type === 'supplier').map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code || 'مورد'})</option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <select
                  value={currentEmployee?.id || ''}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-amber-500 max-w-xs truncate"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} - {e.position} ({e.code || 'موظف'})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date Filter & Options Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>الفترة المحددة:</span>
              </span>

              <DateInput value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-500"
                title="من تاريخ"
              />
              <span className="text-slate-400 font-bold">إلى</span>
              <DateInput value={toDate} onChange={e => setToDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-blue-500"
                title="إلى تاريخ"
              />

              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-md gap-0.5 mr-1">
                <button
                  onClick={() => setDatePreset('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                    !fromDate && !toDate ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setDatePreset('today')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  اليوم
                </button>
                <button
                  onClick={() => setDatePreset('this_month')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  هذا الشهر
                </button>
                <button
                  onClick={() => setDatePreset('last_month')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  الشهر الماضي
                </button>
                <button
                  onClick={() => setDatePreset('this_year')}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  هذا العام
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {statementMode === 'party' && (
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-bold select-none">
                  <input
                    type="checkbox"
                    checked={showItemDetails}
                    onChange={e => setShowItemDetails(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>عرض تفاصيل وملاحظات وأبعاد الأصناف</span>
                </label>
              )}

              {statementMode === 'party' && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>تصفية:</span>
                  </span>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">كافة الحركات (الكل)</option>
                    <option value="debit">الحركات المدينة فقط (مدين / سحوبات)</option>
                    <option value="credit">الحركات الدائنة فقط (دائن / مقبوضات)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Printable Statement Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 print:p-0 print:overflow-visible report-a4-container">
          
          {/* Printable Official Facility Header (A4) - يعتمد الترويسة حسب إعدادات البرنامج واللوقو والبيانات الرسمية */}
          <PrintHeader />
          <div className="border-b-2 border-slate-900 pb-2">
            {/* سطر الكشف المبسط حسب الطلب */}
            {statementMode === 'party' && currentParty && (
              <div className="text-center font-bold text-base mb-1.5 mt-2 text-slate-900 leading-relaxed">
                {isCustomer ? 'كشف حساب عميل تفصيلي:' : 'كشف حساب مورد تفصيلي:'}{' '}
                <span className={isCustomer ? "text-blue-900" : "text-rose-900"}>
                  {clientDisplayName}
                </span>
                <div className="text-xs text-slate-600 mt-0.5 font-semibold">
                  من تاريخ: <span className="font-mono">{fromDate || 'بداية التعامل'}</span>{' '}
                  إلى تاريخ: <span className="font-mono">{toDate || 'تاريخ اليوم'}</span>
                </div>
              </div>
            )}
            {statementMode === 'employee' && currentEmployee && (
              <div className="text-center font-bold text-base mb-1.5 mt-2 text-slate-900 leading-relaxed">
                كشف حساب موظف:{' '}
                <span className="text-emerald-900">
                  {currentEmployee.name}
                </span>
                <div className="text-xs text-slate-600 mt-0.5 font-semibold">
                  من تاريخ: <span className="font-mono">{fromDate || 'بداية العمل'}</span>{' '}
                  إلى تاريخ: <span className="font-mono">{toDate || 'تاريخ اليوم'}</span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 1: PARTY FINANCIAL STATEMENT (CUSTOMER / SUPPLIER)*/}
          {/* ========================================================= */}
          {statementMode === 'party' && partyStatement && (
            <div className="space-y-3">
              
              {/* Summary Cards: Breakdown of Withdrawals, Receipts, Disbursements */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">رصيد أول المدة / سابق:</span>
                  <span className="text-xs font-black font-mono text-slate-800">
                    {formatNumber(partyStatement.openingBalance, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">قبل تاريخ {fromDate || 'البدء'}</span>
                </div>

                <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/80">
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    {isCustomer ? 'إجمالي السحوبات (مدين):' : 'إجمالي التوريدات (دائن):'}
                  </span>
                  <span className="text-xs font-black font-mono text-emerald-800">
                    {formatNumber(isCustomer ? partyStatement.totalWithdrawals : partyStatement.totalCredit, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-emerald-600 block mt-0.5">
                    {isCustomer ? 'فواتير المبيعات وأوامر التشغيل' : 'فواتير توريد الخامات'}
                  </span>
                </div>

                <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200/80">
                  <span className="text-[10px] text-blue-700 font-semibold block">
                    {isCustomer ? 'إجمالي المقبوضات (دائن):' : 'إجمالي الصرف والمسدد (مدين):'}
                  </span>
                  <span className="text-xs font-black font-mono text-blue-800">
                    {formatNumber(isCustomer ? partyStatement.totalReceipts : partyStatement.totalDebit, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-blue-600 block mt-0.5">
                    {isCustomer ? 'سندات القبض والدفعات والمقاصة' : 'سندات الصرف والسداد والمقاصة'}
                  </span>
                </div>

                <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200/80">
                  <span className="text-[10px] text-amber-700 font-semibold block">
                    {isCustomer ? 'إجمالي الصرف / مرتجعات:' : 'المردودات والمقبوضات:'}
                  </span>
                  <span className="text-xs font-black font-mono text-amber-800">
                    {formatNumber(isCustomer ? partyStatement.totalDisbursements : 0, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-amber-600 block mt-0.5">
                    {isCustomer ? 'سندات صرف أو استردادات' : 'مرتجع مشتريات'}
                  </span>
                </div>

                <div className={`p-2 rounded-lg border ${
                  partyStatement.closingBalance > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : partyStatement.closingBalance < 0
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}>
                  <span className="text-[10px] font-semibold block">
                    {isCustomer
                      ? (partyStatement.closingBalance > 0 ? 'صافي المتبقي على العميل (مدين):' : partyStatement.closingBalance < 0 ? 'رصيد دائن للعميل (دائن):' : 'الحساب متطابق (صفر):')
                      : (partyStatement.closingBalance > 0 ? 'صافي مستحق للمورد (دائن):' : partyStatement.closingBalance < 0 ? 'مبلغ مدين للمورد (مدين):' : 'الحساب خالص:')}
                  </span>
                  <span className="text-xs font-black font-mono">
                    {formatNumber(Math.abs(partyStatement.closingBalance), 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] font-bold block mt-0.5">
                    {partyStatement.closingBalance > 0 ? (isCustomer ? 'مطلوب سداده (مدين)' : 'التزام علينا (دائن)') : partyStatement.closingBalance < 0 ? (isCustomer ? 'مبلغ فائض (دائن)' : 'رصيد لصالحنا (مدين)') : 'تمت التسوية'}
                  </span>
                </div>
              </div>

              {/* Detailed Transactions Table - Optimized Font 12 & A4 Width */}
              <div className="border border-slate-400 rounded-md shadow-2xs flex flex-col justify-between bg-white w-full overflow-visible">
                <table className="w-full text-right report-table border-collapse h-full">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-900 print:bg-slate-200 print:text-slate-900">
                      <th className="w-7 min-w-7 text-center border-l border-slate-600 print:border-slate-400">م</th>
                      <th className="w-20 min-w-20 text-center border-l border-slate-600 print:border-slate-400">التاريخ</th>
                      <th className="border-l border-slate-600 print:border-slate-400">البيان والشرح والتفاصيل الكاملة</th>
                      <th className="w-24 min-w-24 text-left bg-rose-950/40 print:bg-rose-50 border-l border-slate-600 print:border-slate-400 whitespace-nowrap">
                        {isCustomer ? 'مدين (عليه)' : 'مدين (المسدد)'}
                      </th>
                      <th className="w-24 min-w-24 text-left bg-emerald-950/40 print:bg-emerald-50 border-l border-slate-600 print:border-slate-400 whitespace-nowrap">
                        {isCustomer ? 'دائن (له)' : 'دائن (التوريدات)'}
                      </th>
                      <th className="w-28 min-w-28 text-left bg-slate-700 print:bg-slate-300 whitespace-nowrap">
                        رصيد (التراكمي)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-100/90 font-bold border-b border-slate-300 text-slate-800">
                      <td className="text-center text-slate-400 font-sans border-l border-slate-300 p-2">-</td>
                      <td className="text-center text-slate-600 font-mono border-l border-slate-300 p-2">{fromDate || 'الرصيد السابق'}</td>
                      <td className="font-sans text-slate-800 font-bold border-l border-slate-300 p-2 bg-slate-100/60">
                        رصيد افتتاحي سابق - رصيد الحساب الافتتاحي السابق (ما قبل تاريخ {fromDate || 'بدء الحركة'})
                      </td>
                      <td className="text-left font-bold text-rose-800 font-mono whitespace-nowrap border-l border-slate-300 p-2">
                        {partyStatement.openingBalance > 0 ? partyStatement.openingBalance.toFixed(2) : '-'}
                      </td>
                      <td className="text-left font-bold text-emerald-800 font-mono whitespace-nowrap border-l border-slate-300 p-2">
                        {partyStatement.openingBalance < 0 ? Math.abs(partyStatement.openingBalance).toFixed(2) : '-'}
                      </td>
                      <td className="text-left font-black text-slate-950 bg-slate-100 font-mono whitespace-nowrap p-2">
                        {partyStatement.openingBalance.toFixed(2)} {settings.currency}
                      </td>
                    </tr>

                    {displayedPartyRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-sans font-bold">
                          لا توجد حركات مالية مسجلة خلال هذه الفترة المحددة.
                        </td>
                      </tr>
                    ) : (
                      displayedPartyRows.map((row, idx) => {
                        const typeLabel = row.typeLabel || (
                          row.type === 'invoice' ? 'فاتورة مبيعات' :
                          row.type === 'receipt' ? 'سند قبض' :
                          row.type === 'payment' ? 'سند صرف' :
                          row.type === 'purchase' ? 'فاتورة مشتريات' :
                          row.type === 'sales_return' ? 'مردودات مبيعات' :
                          row.type === 'purchase_return' ? 'مردودات مشتريات' :
                          row.type === 'clearance' ? 'مقاصة ديون' :
                          row.type === 'opening' ? 'رصيد سابق' : 'حركة مالية'
                        );

                        let note = '';
                        if (row.type === 'invoice') {
                          if (row.invoiceNotes) {
                            note = row.invoiceNotes;
                            if (row.subCustomerName) note += ` [الزبون الفرعي: ${row.subCustomerName}]`;
                          } else if (row.subCustomerName) {
                            note = `[الزبون الفرعي: ${row.subCustomerName}]`;
                          } else if (row.description) {
                            note = row.description.replace(/^فاتورة مبيعات\s*(\([^)]*\))?\s*(-\s*)?/, '');
                          }
                        } else if (row.type === 'purchase') {
                          if (row.invoiceNotes) {
                            note = row.invoiceNotes;
                          } else if (row.description) {
                            note = row.description.replace(/^فاتورة مشتريات\s*(\([^)]*\))?\s*(-\s*)?/, '');
                          }
                        } else if (row.type === 'receipt') {
                          const rawNote = row.voucherNotes || row.description || '';
                          note = rawNote.replace(/^سند قبض\s*(نقدية|شيك|تحويل)?\s*(-\s*)?/, '');
                        } else if (row.type === 'payment') {
                          const rawNote = row.voucherNotes || row.description || '';
                          note = rawNote.replace(/^سند صرف\s*(نقدية|شيك|تحويل)?\s*(-\s*)?/, '');
                        } else if (row.type === 'sales_return' || row.type === 'purchase_return') {
                          const rawNote = row.invoiceNotes || row.voucherNotes || row.description || '';
                          note = rawNote.replace(/^مردودات (مبيعات|مشتريات)\s*(-\s*)?/, '');
                        } else {
                          note = row.description || '';
                        }
                        const trimmedNote = note.trim();

                        const hasReceiptExtraDetails = row.type === 'receipt' && Boolean(
                          row.chequeNumber || row.chequeBank || row.chequeDueDate || row.transferReference ||
                          (row.paymentMethodLabel && row.paymentMethodLabel !== 'نقداً')
                        );

                        const hasPaymentExtraDetails = row.type === 'payment' && Boolean(
                          row.chequeNumber || row.chequeBank || row.chequeDueDate || row.transferReference ||
                          (row.paymentMethodLabel && row.paymentMethodLabel !== 'نقداً')
                        );

                        return (
                        <React.Fragment key={`${row.id || 'party-row'}-${idx}`}>
                          <tr
                            className={`hover:bg-slate-50/90 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                            }`}
                          >
                            <td className="text-center text-slate-400 font-sans align-middle border-l border-slate-300">{idx + 1}</td>
                            <td className="text-slate-700 whitespace-nowrap text-center align-middle font-mono border-l border-slate-300">{row.date}</td>
                            <td className="font-sans text-slate-800 align-middle space-y-1 border-l border-slate-300">
                              {/* سطر مدمج وموحد: نوع العملية - رقم الحركة - الملاحظات */}
                              <div className="font-bold text-slate-900 leading-tight flex flex-wrap items-center gap-1">
                                <span className="text-slate-900 font-bold">{typeLabel}</span>
                                {row.referenceNumber && row.referenceNumber !== 'OPENING' && (
                                  <>
                                    <span className="text-slate-400 font-normal">-</span>
                                    <span className="font-mono font-bold text-slate-800">{row.referenceNumber}</span>
                                  </>
                                )}
                                {trimmedNote && (
                                  <>
                                    <span className="text-slate-400 font-normal">-</span>
                                    <span className="text-slate-700 font-medium">{trimmedNote}</span>
                                  </>
                                )}
                              </div>

                              {/* تفاصيل إضافية لسند القبض بدون تكرار السند أو رقمه أو المبلغ */}
                              {hasReceiptExtraDetails && (
                                <div className="mt-1 p-1 bg-blue-50/60 border border-blue-200/80 rounded text-[11px] text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {row.paymentMethodLabel && row.paymentMethodLabel !== 'نقداً' && (
                                    <div>
                                      <span className="text-slate-500">طريقة القبض: </span>
                                      <span className="font-bold text-slate-800">{row.paymentMethodLabel}</span>
                                    </div>
                                  )}
                                  {row.chequeNumber && (
                                    <div>
                                      <span className="text-slate-500">رقم الشيك: </span>
                                      <span className="font-bold text-slate-900 font-mono">{row.chequeNumber}</span>
                                    </div>
                                  )}
                                  {row.chequeBank && (
                                    <div>
                                      <span className="text-slate-500">البنك المسحوب عليه: </span>
                                      <span className="font-bold text-slate-800">{row.chequeBank}</span>
                                    </div>
                                  )}
                                  {row.chequeDueDate && (
                                    <div>
                                      <span className="text-slate-500">تاريخ الاستحقاق: </span>
                                      <span className="font-bold text-slate-900 font-mono">{row.chequeDueDate}</span>
                                    </div>
                                  )}
                                  {row.transferReference && (
                                    <div>
                                      <span className="text-slate-500">رقم الحوالة: </span>
                                      <span className="font-bold text-slate-900 font-mono">{row.transferReference}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* تفاصيل المقاصة */}
                              {row.type === 'clearance' && (row.counterPartyName || row.reason) && (
                                <div className="mt-1 p-1 bg-teal-50/60 border border-teal-200/80 rounded text-[11px] text-slate-700 flex flex-wrap items-center gap-2">
                                  {row.counterPartyName && (
                                    <div>
                                      <span className="text-teal-900 font-bold">الطرف المقابل: </span>
                                      <span className="font-medium text-slate-800">{row.counterPartyName}</span>
                                    </div>
                                  )}
                                  {row.reason && (
                                    <div>
                                      <span className="text-teal-900 font-bold">السبب: </span>
                                      <span className="text-slate-700">{row.reason}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* تفاصيل إضافية لسند الصرف بدون تكرار السند أو رقمه أو المبلغ */}
                              {hasPaymentExtraDetails && (
                                <div className="mt-1 p-1 bg-amber-50/60 border border-amber-200/80 rounded text-[11px] text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {row.paymentMethodLabel && row.paymentMethodLabel !== 'نقداً' && (
                                    <div>
                                      <span className="text-slate-500">طريقة الصرف: </span>
                                      <span className="font-bold text-slate-800">{row.paymentMethodLabel}</span>
                                    </div>
                                  )}
                                  {row.chequeNumber && (
                                    <div>
                                      <span className="text-slate-500">رقم الشيك: </span>
                                      <span className="font-bold text-slate-900 font-mono">{row.chequeNumber}</span>
                                    </div>
                                  )}
                                  {row.chequeBank && (
                                    <div>
                                      <span className="text-slate-500">البنك: </span>
                                      <span className="font-bold text-slate-800">{row.chequeBank}</span>
                                    </div>
                                  )}
                                  {row.chequeDueDate && (
                                    <div>
                                      <span className="text-slate-500">تاريخ الاستحقاق: </span>
                                      <span className="font-bold text-slate-900 font-mono">{row.chequeDueDate}</span>
                                    </div>
                                  )}
                                  {row.transferReference && (
                                    <div>
                                      <span className="text-slate-500">رقم الحوالة: </span>
                                      <span className="font-bold text-slate-900 font-mono">{row.transferReference}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="text-left font-bold text-rose-700 font-mono align-middle whitespace-nowrap border-l border-slate-300">
                              {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                            </td>
                            <td className="text-left font-bold text-emerald-700 font-mono align-middle whitespace-nowrap border-l border-slate-300">
                              {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                            </td>
                            <td className="text-left font-black text-slate-900 bg-slate-50/70 font-mono align-middle whitespace-nowrap">
                              {row.runningBalance.toFixed(2)}
                            </td>
                          </tr>

                          {/* تفاصيل الفاتورة: جدول الأصناف ممتد بالكامل تحت أعمدة مدين ودائن ورصيد */}
                          {showItemDetails && row.items && row.items.length > 0 && (
                            <tr className="bg-slate-50/60 print:bg-transparent">
                              <td colSpan={6} className="p-1 px-1.5 sm:px-2 border-b border-slate-300">
                                <div className="border border-slate-300 rounded overflow-hidden shadow-2xs bg-white w-full">
                                  <table className="w-full text-right report-sub-table border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                        <th className="border-l border-slate-200">الصنف</th>
                                        <th className="text-center w-12 min-w-12 border-l border-slate-200">الطول</th>
                                        <th className="text-center w-12 min-w-12 border-l border-slate-200">العرض</th>
                                        <th className="text-center w-10 min-w-10 border-l border-slate-200">العدد</th>
                                        <th className="text-center w-12 min-w-12 border-l border-slate-200">الكمية</th>
                                        <th className="text-left w-16 min-w-16 border-l border-slate-200">السعر</th>
                                        <th className="text-left w-18 min-w-18">الإجمالي</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {row.items.map((it, iIdx) => (
                                        <tr key={iIdx} className="hover:bg-slate-50">
                                          <td className="font-bold text-slate-900 border-l border-slate-200">
                                            <div>{it.itemName}</div>
                                          </td>
                                          <td className="text-center font-mono text-slate-800 border-l border-slate-200">{it.length != null && it.length !== 0 ? it.length : '-'}</td>
                                          <td className="text-center font-mono text-slate-800 border-l border-slate-200">{it.width != null && it.width !== 0 ? it.width : '-'}</td>
                                          <td className="text-center font-mono font-bold text-slate-800 border-l border-slate-200">{it.count || 1}</td>
                                          <td className="text-center font-mono font-bold text-slate-900 border-l border-slate-200">
                                            {it.quantity}
                                          </td>
                                          <td className="text-left font-mono text-slate-800 border-l border-slate-200">{it.unitPrice.toFixed(2)}</td>
                                          <td className="text-left font-mono font-bold text-slate-900">{it.total.toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 border-t border-slate-300 font-bold">
                                      <tr>
                                        <td colSpan={4} className="py-1 px-1.5 text-slate-700">
                                          {row.subCustomerName && (
                                            <span className="ml-2 text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                                              الزبون الفرعي: {row.subCustomerName}
                                            </span>
                                          )}
                                          {row.invoiceNotes && (
                                            <span className="text-amber-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 font-medium">
                                              📝 ملاحظة الفاتورة: {row.invoiceNotes}
                                            </span>
                                          )}
                                        </td>
                                        <td colSpan={3} className="py-1 px-1.5 text-left font-mono">
                                          <div className="flex items-center justify-end gap-1.5 text-slate-800">
                                            {row.subtotal !== undefined && row.subtotal !== row.totalAmount && (
                                              <span>المجموع: <span className="font-bold">{row.subtotal.toFixed(2)}</span></span>
                                            )}
                                            {row.discountTotal !== undefined && row.discountTotal > 0 && (
                                              <span className="text-rose-600 font-bold">الخصم: -{row.discountTotal.toFixed(2)}</span>
                                            )}
                                            {row.taxAmount !== undefined && row.taxAmount > 0 && (
                                              <span className="text-slate-600">الضريبة: +{row.taxAmount.toFixed(2)}</span>
                                            )}
                                            <span className="text-slate-950 font-black bg-slate-200 px-1.5 py-0.5 rounded">
                                              صافي الفاتورة: {(row.totalAmount || row.debit).toFixed(2)} {settings.currency}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900">
                      <td colSpan={3} className="text-left font-sans">الإجمالي العام للحركات بالفترة:</td>
                      <td className="text-left font-mono text-rose-800 font-black whitespace-nowrap">
                        {partyStatement.totalDebit.toFixed(2)}
                      </td>
                      <td className="text-left font-mono text-emerald-800 font-black whitespace-nowrap">
                        {partyStatement.totalCredit.toFixed(2)}
                      </td>
                      <td className="text-left font-mono text-slate-900 font-black bg-slate-200/80 whitespace-nowrap">
                        {partyStatement.closingBalance.toFixed(2)} {settings.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ملخص نهاية الكشف بعد الجدول بتنسيق رسمي ومضغوط سطر واحد للبنرات الأربعة */}
              <div className="mt-2 p-1.5 bg-slate-50 border border-slate-400 rounded-md space-y-1.5 shadow-2xs print:border-slate-300">
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  <div className="bg-white border border-slate-300 rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs">
                    <span className="font-bold text-slate-700 text-[10px] whitespace-nowrap">رصيد سابق:</span>
                    <div className="font-black font-mono text-slate-900 text-[11px] flex items-center gap-1 whitespace-nowrap">
                      <span>{partyStatement.openingBalance.toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold text-slate-500">{settings.currency}</span>
                    </div>
                  </div>
                  <div className={`bg-white border ${isCustomer ? 'border-rose-300' : 'border-emerald-300'} rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs`}>
                    <span className={`font-bold text-[10px] whitespace-nowrap ${isCustomer ? 'text-rose-900' : 'text-emerald-900'}`}>إجمالي مدين:</span>
                    <div className={`font-black font-mono text-[11px] ${isCustomer ? 'text-rose-700' : 'text-emerald-700'} flex items-center gap-1 whitespace-nowrap`}>
                      <span>{partyStatement.totalDebit.toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold opacity-75">{settings.currency}</span>
                    </div>
                  </div>
                  <div className={`bg-white border ${isCustomer ? 'border-emerald-300' : 'border-rose-300'} rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs`}>
                    <span className={`font-bold text-[10px] whitespace-nowrap ${isCustomer ? 'text-emerald-900' : 'text-rose-900'}`}>إجمالي دائن:</span>
                    <div className={`font-black font-mono text-[11px] ${isCustomer ? 'text-emerald-700' : 'text-rose-700'} flex items-center gap-1 whitespace-nowrap`}>
                      <span>{partyStatement.totalCredit.toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold opacity-75">{settings.currency}</span>
                    </div>
                  </div>
                  <div className={`bg-white border rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs ${partyStatement.closingBalance > 0 ? (isCustomer ? 'border-amber-400 bg-amber-50/20' : 'border-rose-400 bg-rose-50/20') : partyStatement.closingBalance < 0 ? (isCustomer ? 'border-blue-400 bg-blue-50/20' : 'border-emerald-400 bg-emerald-50/20') : 'border-slate-300'}`}>
                    <span className="font-bold text-slate-900 text-[10px] whitespace-nowrap">
                      الإجمالي:
                    </span>
                    <div className={`font-black font-mono text-[11px] flex items-center gap-1 whitespace-nowrap ${partyStatement.closingBalance > 0 ? (isCustomer ? 'text-amber-700' : 'text-rose-700') : partyStatement.closingBalance < 0 ? (isCustomer ? 'text-blue-700' : 'text-emerald-700') : 'text-slate-800'}`}>
                      <span>{Math.abs(partyStatement.closingBalance).toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold opacity-75">{settings.currency}</span>
                      <span className="text-[9.5px] font-sans font-bold">
                        ({isCustomer ? (partyStatement.closingBalance > 0 ? 'مدين' : partyStatement.closingBalance < 0 ? 'دائن' : 'متزن') : (partyStatement.closingBalance > 0 ? 'دائن' : partyStatement.closingBalance < 0 ? 'مدين' : 'متزن')})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tafqeet & Closing Balance */}
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="flex items-center justify-between text-[10.5px] mb-0.5">
                    <span className="font-bold text-slate-700">المبلغ كتابة وتفقيطاً:</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      الرصيد الإجمالي ({isCustomer ? (partyStatement.closingBalance > 0 ? 'مدين' : partyStatement.closingBalance < 0 ? 'دائن' : 'متزن') : (partyStatement.closingBalance > 0 ? 'دائن' : partyStatement.closingBalance < 0 ? 'مدين' : 'متزن')}): {Math.abs(partyStatement.closingBalance).toFixed(2)} {settings.currency}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-semibold text-slate-800 bg-slate-50 p-1 rounded border border-slate-200 font-arabic">
                    {partyTafqeet}
                  </div>
                </div>
              </div>

              {/* Official Signatures Section */}
              <div className="pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px] mt-4">
                {/* Right Column */}
                <div className="space-y-4 flex flex-col items-center justify-end">
                  <span className="font-bold text-slate-700 block mb-auto">إعداد وتدقيق المحاسب</span>
                  <div className="border-b border-dashed border-slate-400 w-28 mx-auto mt-6"></div>
                  <span className="text-[10px] text-slate-400 block font-mono">التوقيع والتاريخ</span>
                </div>

                {/* Center Column */}
                <div className="space-y-4 flex flex-col items-center justify-end">
                  <span className="font-bold text-slate-700 block mb-auto">توقيع وإقرار الموظف بالمطابقة</span>
                  <div className="border-b border-dashed border-slate-400 w-28 mx-auto mt-6"></div>
                  <span className="text-[10px] text-slate-400 block font-mono">الموظف</span>
                </div>

                {/* Left Column - Official Stamp & Signature */}
                <div className="space-y-2 flex flex-col items-center justify-end">
                  <span className="font-bold text-slate-700 block mb-auto">اعتماد الإدارة / التوقيع</span>
                  
                  <div className="min-h-[4.2cm] flex items-center justify-center relative">
                    {settings.stampUrl ? (
                      <div className="relative flex items-center justify-center">
                        <OfficialStamp size="3.5cm" />
                        {settings.signatureUrl && (
                          <img
                            src={settings.signatureUrl}
                            alt="Signature"
                            className="absolute bottom-1 max-h-12 max-w-[120px] object-contain mix-blend-multiply opacity-85 pointer-events-none"
                          />
                        )}
                      </div>
                    ) : settings.signatureUrl ? (
                      <img
                        src={settings.signatureUrl}
                        alt="Signature"
                        className="max-h-16 max-w-[140px] object-contain mix-blend-multiply opacity-90"
                      />
                    ) : (
                      <div className="border-b border-dashed border-slate-400 w-36 mx-auto mt-10"></div>
                    )}
                  </div>
                  
                  <span className="text-[11px] text-slate-400 block font-mono mt-2">الختم والتوقيع المعتمد</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: EMPLOYEE FINANCIAL STATEMENT & ATTENDANCE SUMMARY */}
          {/* ========================================================= */}
          {statementMode === 'employee' && employeeStatement && (
            <div className="space-y-3.5">
              
              {/* Employee Job & Salary Profile Header Strip */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 flex items-center justify-center font-bold text-sm">
                    {employeeStatement.employee.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{employeeStatement.employee.name}</span>
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                        {employeeStatement.employee.code || 'EMP'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                      <span>{employeeStatement.employee.position || 'عامل'}</span>
                      <span>•</span>
                      <span>{employeeStatement.employee.department || 'قسم الإنتاج والورشة'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium">
                    <span className="text-slate-400 text-[10px] ml-1">نظام الراتب:</span>
                    <span className="font-bold text-indigo-700">
                      {employeeStatement.employee.salaryType === 'daily' ? 'أجر يومي (يوميات)' :
                       employeeStatement.employee.salaryType === 'weekly' ? 'راتب أسبوعي' : 'راتب شهري مقطوع'}
                    </span>
                  </div>

                  <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium font-mono">
                    <span className="text-slate-400 text-[10px] ml-1 font-sans">الأجر المعتمد:</span>
                    <span className="font-bold text-slate-900">
                      {formatNumber(employeeStatement.employee.salaryAmount || 0, 2)} {settings.currency}
                    </span>
                  </div>

                  {employeeStatement.employee.allowances ? (
                    <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium font-mono">
                      <span className="text-slate-400 text-[10px] ml-1 font-sans">البدلات:</span>
                      <span className="font-bold text-emerald-700">
                        +{formatNumber(employeeStatement.employee.allowances, 2)} {settings.currency}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Attendance & Hours Calculation Summary (احتساب أيام وساعات العمل والراتب المفترض) */}
              <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-200 rounded-xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-blue-950">
                        احتساب ساعات وأيام العمل والراتب المفترض للصرف بناءً على الحضور
                      </h4>
                      <p className="text-[10px] text-blue-800 font-medium">
                        {employeeStatement.attendanceSummary.calculationExplanation}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-100/90 text-blue-900 font-bold px-2.5 py-1 rounded-lg text-[11px] font-mono border border-blue-300">
                    <span>معدل الساعة: </span>
                    <span className="font-black">{employeeStatement.attendanceSummary.hourlyRate.toFixed(2)} {settings.currency}/س</span>
                  </div>
                </div>

                {/* Grid of Attendance Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-medium">أيام الحضور الفعلي</span>
                    <span className="font-black text-emerald-700 text-sm font-mono mt-0.5 block">
                      {employeeStatement.attendanceSummary.presentDays} يوم
                    </span>
                    <span className="text-[9px] text-slate-400">حضور ودوام معتمد</span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-medium">أيام الغياب</span>
                    <span className={`font-black text-sm font-mono mt-0.5 block ${employeeStatement.attendanceSummary.absentDays > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {employeeStatement.attendanceSummary.absentDays} يوم
                    </span>
                    <span className="text-[9px] text-slate-400">غير مدفوع الأجر</span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-medium">ساعات العمل الفعلية</span>
                    <span className="font-black text-blue-900 text-sm font-mono mt-0.5 block">
                      {formatDecimalHours(employeeStatement.attendanceSummary.totalWorkedHours, 'long')}
                    </span>
                    <span className="text-[9px] text-blue-600 font-medium">صافي بعد الاستراحة</span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-medium">ساعات الإضافي (أوفرتايم)</span>
                    <span className="font-black text-amber-700 text-sm font-mono mt-0.5 block">
                      {employeeStatement.attendanceSummary.overtimeHours > 0 ? `+${formatDecimalHours(employeeStatement.attendanceSummary.overtimeHours, 'short')}` : '0 س'}
                    </span>
                    <span className="text-[9px] text-amber-800 font-bold font-mono">
                      +{formatNumber(employeeStatement.attendanceSummary.overtimePay, 2)} {settings.currency}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-medium">الأساسي المحتسب بالدوام</span>
                    <span className="font-black text-indigo-900 text-sm font-mono mt-0.5 block">
                      {formatNumber(employeeStatement.attendanceSummary.expectedBasicSalary, 2)}
                    </span>
                    <span className="text-[9px] text-indigo-700 font-semibold">{settings.currency}</span>
                  </div>

                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300 shadow-2xs">
                    <span className="text-emerald-800 text-[10px] block font-bold">الراتب المفترض للصرف</span>
                    <span className="font-black text-emerald-900 text-sm font-mono mt-0.5 block">
                      {formatNumber(employeeStatement.attendanceSummary.netExpectedPayable, 2)}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-semibold">{settings.currency} (صافي الفترة)</span>
                  </div>
                </div>
              </div>

              {/* Summary Cards: 5 Financial Pillars for the Employee */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">رصيد أول المدة / سابق:</span>
                  <span className="text-xs font-black font-mono text-slate-800">
                    {formatNumber(employeeStatement.openingBalance, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">قبل تاريخ {fromDate || 'البدء'}</span>
                </div>

                <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-semibold block">إجمالي المستحقات (له):</span>
                  <span className="text-xs font-black font-mono text-emerald-900">
                    {formatNumber(employeeStatement.totalEntitlements, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-emerald-700 block mt-0.5">رواتب بالدوام + إضافي + حوافز</span>
                </div>

                <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-semibold block">إجمالي السلف المسحوبة (عليه):</span>
                  <span className="text-xs font-black font-mono text-amber-900">
                    {formatNumber(employeeStatement.totalAdvances, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-amber-700 block mt-0.5">سلف نقدية مقبوضة</span>
                </div>

                <div className="bg-rose-50/80 p-2 rounded-lg border border-rose-200">
                  <span className="text-[10px] text-rose-800 font-semibold block">إجمالي الخصومات والجزاءات:</span>
                  <span className="text-xs font-black font-mono text-rose-900">
                    {formatNumber(employeeStatement.totalDeductions, 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] text-rose-700 block mt-0.5">جزاءات وتأخيرات معتمدة</span>
                </div>

                <div className={`p-2 rounded-lg border ${
                  employeeStatement.closingBalance > 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : employeeStatement.closingBalance < 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}>
                  <span className="text-[10px] font-semibold block">
                    {employeeStatement.closingBalance > 0
                      ? 'صافي مستحق للموظف (دائن):'
                      : employeeStatement.closingBalance < 0
                      ? 'مبلغ مدين على الموظف (سلف):'
                      : 'الحساب خالص (صفر):'}
                  </span>
                  <span className="text-xs font-black font-mono">
                    {formatNumber(Math.abs(employeeStatement.closingBalance), 2)} {settings.currency}
                  </span>
                  <span className="text-[9.5px] font-bold block mt-0.5">
                    {employeeStatement.closingBalance > 0 ? 'رصيد متبقي للصرف' : employeeStatement.closingBalance < 0 ? 'متبقي عليه سلف' : 'تمت التسوية بالكامل'}
                  </span>
                </div>
              </div>

              {/* اختيار نمط عرض الكشف للموظف (منع العرض في الطباعة ليكون الكشف المطبوع نظيفاً) */}
              <div className="flex flex-wrap items-center justify-between bg-slate-100 p-2.5 rounded-xl border border-slate-200 print:hidden text-xs gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                  شكل وتفاصيل كشف حساب الموظف للمعاينة والطباعة:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEmpViewMode('attendance_diary')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      empViewMode === 'attendance_diary'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>دفتر الدوام واليوميات التفصيلي (الافتراضي)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpViewMode('financial_ledger')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      empViewMode === 'financial_ledger'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>كشف الحركات والقيود المالية العام</span>
                  </button>
                </div>
              </div>

              {/* Detailed Transactions & Movements Table */}
              <div className="border border-slate-400 rounded-md overflow-x-auto shadow-2xs min-h-[440px] print:min-h-[720px] flex flex-col justify-between bg-white">
                <table className="w-full text-right report-table border-collapse h-full">
                  {empViewMode === 'attendance_diary' ? (
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold border-b border-slate-900 print:bg-slate-200 print:text-slate-900 text-xs">
                        <th className="w-7 min-w-7 text-center border-l border-slate-600 print:border-slate-400">م</th>
                        <th className="w-20 min-w-20 text-center border-l border-slate-600 print:border-slate-400">التاريخ</th>
                        <th className="w-16 min-w-16 text-center border-l border-slate-600 print:border-slate-400">حضور 1</th>
                        <th className="w-16 min-w-16 text-center border-l border-slate-600 print:border-slate-400">انصراف 1</th>
                        <th className="w-16 min-w-16 text-center border-l border-slate-600 print:border-slate-400">حضور 2</th>
                        <th className="w-16 min-w-16 text-center border-l border-slate-600 print:border-slate-400">انصراف 2</th>
                        <th className="w-20 min-w-20 text-center border-l border-slate-600 print:border-slate-400">الساعات الفعلية</th>
                        <th className="w-20 min-w-20 text-center border-l border-slate-600 print:border-slate-400">ساعات عمل رسمي</th>
                        <th className="w-16 min-w-16 text-center border-l border-slate-600 print:border-slate-400">أوفر تايم</th>
                        <th className="border-l border-slate-600 print:border-slate-400">راتب اليوم / السلفة والعمليات المتبقية</th>
                        <th className="w-28 min-w-28 text-left bg-slate-700 print:bg-slate-300 whitespace-nowrap">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                  ) : (
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold border-b border-slate-900 print:bg-slate-200 print:text-slate-900 text-xs">
                        <th className="w-7 min-w-7 text-center border-l border-slate-600 print:border-slate-400">م</th>
                        <th className="w-20 min-w-20 text-center border-l border-slate-600 print:border-slate-400">التاريخ</th>
                        <th className="border-l border-slate-600 print:border-slate-400">البيان والشرح وسجل الحركة والدوام</th>
                        <th className="w-28 min-w-28 text-left bg-emerald-950/40 print:bg-emerald-50 border-l border-slate-600 print:border-slate-400 whitespace-nowrap">
                          دائن (له - راتب/حافز)
                        </th>
                        <th className="w-28 min-w-28 text-left bg-rose-950/40 print:bg-rose-50 border-l border-slate-600 print:border-slate-400 whitespace-nowrap">
                          مدين (عليه - سلفة/صرف/خصم)
                        </th>
                        <th className="w-28 min-w-28 text-left bg-slate-700 print:bg-slate-300 whitespace-nowrap">
                          رصيد (التراكمي)
                        </th>
                      </tr>
                    </thead>
                  )}

                  {empViewMode === 'attendance_diary' ? (
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      {/* Opening Balance Row for Attendance Diary */}
                      <tr className="bg-slate-100/90 font-bold border-b border-slate-300 text-slate-800 text-[11px]">
                        <td className="text-center text-slate-400 font-sans border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-600 font-mono border-l border-slate-300 p-2">{fromDate || 'الرصيد السابق'}</td>
                        <td className="text-center text-slate-400 font-mono border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-400 font-mono border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-400 font-mono border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-400 font-mono border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-400 font-mono border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-400 font-mono border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-400 font-mono border-l border-slate-300 p-2">-</td>
                        <td className="font-sans text-slate-700 font-semibold border-l border-slate-300 p-2">
                          رصيد سابق - الرصيد الافتتاحي السابق للموظف (ما قبل تاريخ {fromDate || 'بداية العمل'})
                        </td>
                        <td className="text-left font-black text-slate-950 bg-slate-100 font-mono whitespace-nowrap p-2">
                          {employeeStatement.openingBalance.toFixed(2)} {settings.currency}
                        </td>
                      </tr>

                      {employeeStatement.rows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400 font-sans font-bold">
                            لا توجد حركات أو سجلات دوام مسجلة للموظف خلال هذه الفترة المحددة.
                          </td>
                        </tr>
                      ) : (
                        employeeStatement.rows.map((row, idx) => {
                          const isAttendance = row.type === 'salary_accrual' && row.typeLabel === 'يومية دوام' && row.attendanceRecord;
                          
                          const clockIn1 = isAttendance ? (row.attendanceRecord.checkInTime || row.attendanceRecord.shift1CheckInTime || '-') : '-';
                          const clockOut1 = isAttendance ? (row.attendanceRecord.checkOutTime || row.attendanceRecord.shift1CheckOutTime || '-') : '-';
                          const clockIn2 = isAttendance && row.attendanceRecord.hasSecondShift ? (row.attendanceRecord.shift2CheckInTime || '-') : '-';
                          const clockOut2 = isAttendance && row.attendanceRecord.hasSecondShift ? (row.attendanceRecord.shift2CheckOutTime || '-') : '-';
                          
                          const workedHours = isAttendance ? formatDecimalHours(row.attendanceRecord.actualWorkedHours || 0) : '-';
                          const regHours = isAttendance ? formatDecimalHours(row.attendanceRecord.regularHours || 0) : '-';
                          const otHours = isAttendance && row.attendanceRecord.overtimeHours > 0 ? `+${formatDecimalHours(row.attendanceRecord.overtimeHours)}` : '-';
                          
                          let detailContent: React.ReactNode = null;
                          if (isAttendance) {
                            const isPresent = row.attendanceRecord.status === 'present';
                            const statusBadge = !isPresent ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold mr-1.5 bg-slate-100 text-slate-700 border border-slate-300">
                                {row.attendanceRecord.status === 'absent' ? 'غائب' :
                                 row.attendanceRecord.status === 'half_day' ? 'نصف دوام' :
                                 row.attendanceRecord.status === 'off' ? 'عطلة' :
                                 row.attendanceRecord.status === 'sick' ? 'إجازة مرضية' :
                                 row.attendanceRecord.status === 'excused_leave' ? 'إجازة بعذر' : 'غير مسجل'}
                              </span>
                            ) : null;

                            detailContent = (
                              <div className="flex flex-col gap-0.5 font-sans">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="font-bold text-slate-700 text-[10.5px]">أجر اليومية:</span>
                                    {statusBadge}
                                  </div>
                                  <strong className={`font-mono px-1.5 py-0.5 rounded border text-[11px] ${
                                    row.entitlement > 0
                                      ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
                                      : 'text-slate-500 bg-slate-50 border-slate-200'
                                  }`}>
                                    {row.entitlement.toFixed(2)} {settings.currency}
                                  </strong>
                                </div>
                                {row.notes && (
                                  <div className="text-[10px] text-slate-500 italic">ملاحظة: {row.notes}</div>
                                )}
                              </div>
                            );
                          } else if (row.type === 'advance') {
                            detailContent = (
                              <div className="bg-amber-50 text-amber-900 p-2 rounded border border-amber-200 font-sans">
                                <div className="font-bold flex items-center justify-between">
                                  <span className="flex items-center gap-1">💸 سلفة نقدية مستقطعة:</span>
                                  <strong className="font-mono text-amber-800">-{row.advance.toFixed(2)} {settings.currency}</strong>
                                </div>
                                <div className="text-[10px] text-amber-700 italic mt-0.5 font-bold">ملاحظات السلفة: {row.notes || row.description}</div>
                              </div>
                            );
                          } else if (row.type === 'deduction') {
                            detailContent = (
                              <div className="bg-rose-50 text-rose-900 p-2 rounded border border-rose-200 font-sans">
                                <div className="font-bold flex items-center justify-between">
                                  <span>🚨 خصم / جزاء مالي:</span>
                                  <strong className="font-mono text-rose-800">-{row.deduction.toFixed(2)} {settings.currency}</strong>
                                </div>
                                <div className="text-[10px] text-rose-700 italic mt-0.5 font-bold">السبب: {row.notes || row.description}</div>
                              </div>
                            );
                          } else if (row.type === 'incentive') {
                            detailContent = (
                              <div className="bg-purple-50 text-purple-900 p-2 rounded border border-purple-200 font-sans">
                                <div className="font-bold flex items-center justify-between">
                                  <span>🎁 مكافأة وحافز مالي:</span>
                                  <strong className="font-mono text-purple-800">+{row.entitlement.toFixed(2)} {settings.currency}</strong>
                                </div>
                                <div className="text-[10px] text-purple-700 italic mt-0.5 font-bold font-arabic">السبب: {row.notes || row.description}</div>
                              </div>
                            );
                          } else if (row.type === 'payment_disbursement') {
                            detailContent = (
                              <div className="bg-blue-50 text-blue-900 p-2 rounded border border-blue-200 font-sans">
                                <div className="font-bold flex items-center justify-between">
                                  <span>📥 صرف راتب مستلم:</span>
                                  <strong className="font-mono text-blue-800">-{row.disbursement.toFixed(2)} {settings.currency}</strong>
                                </div>
                                <div className="text-[10px] text-blue-700 italic mt-0.5 font-bold">البيان: {row.notes || row.description}</div>
                              </div>
                            );
                          } else {
                            detailContent = (
                              <div className="font-sans text-slate-700">
                                <span className="font-bold">{row.typeLabel}:</span>
                                <span className="mr-1">{row.description}</span>
                                {row.entitlement > 0 && <span className="text-emerald-700 font-bold font-mono mr-1"> (له: +{row.entitlement.toFixed(2)})</span>}
                                {row.disbursement > 0 && <span className="text-blue-700 font-bold font-mono mr-1"> (صرف: -{row.disbursement.toFixed(2)})</span>}
                              </div>
                            );
                          }

                          return (
                            <tr
                              key={`${row.id || 'emp-row-attendance'}-${idx}`}
                              className={`hover:bg-slate-50/90 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                              }`}
                            >
                              <td className="text-center text-slate-400 font-sans align-middle border-l border-slate-300 p-2">{idx + 1}</td>
                              <td className="text-slate-700 whitespace-nowrap text-center align-middle font-mono border-l border-slate-300 p-2">{row.date}</td>
                              <td className="text-center text-slate-800 font-mono align-middle border-l border-slate-300 p-2">{clockIn1}</td>
                              <td className="text-center text-slate-800 font-mono align-middle border-l border-slate-300 p-2">{clockOut1}</td>
                              <td className="text-center text-slate-800 font-mono align-middle border-l border-slate-300 p-2">{clockIn2}</td>
                              <td className="text-center text-slate-800 font-mono align-middle border-l border-slate-300 p-2">{clockOut2}</td>
                              <td className="text-center text-blue-950 bg-blue-50/25 font-mono align-middle border-l border-slate-300 font-bold p-2">{workedHours}</td>
                              <td className="text-center text-indigo-950 bg-indigo-50/25 font-mono align-middle border-l border-slate-300 font-bold p-2">{regHours}</td>
                              <td className="text-center text-amber-700 font-mono align-middle border-l border-slate-300 font-bold p-2">{otHours}</td>
                              <td className="font-sans text-slate-800 align-middle p-2 border-l border-slate-300">
                                {detailContent}
                              </td>
                              <td className="text-left font-black text-slate-950 bg-slate-50/80 font-mono align-middle whitespace-nowrap p-2">
                                {row.runningBalance.toFixed(2)} {settings.currency}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  ) : (
                    <tbody className="divide-y divide-slate-200 font-mono text-xs">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-100/90 font-bold border-b border-slate-300 text-slate-800">
                        <td className="text-center text-slate-400 font-sans border-l border-slate-300 p-2">-</td>
                        <td className="text-center text-slate-600 font-mono border-l border-slate-300 p-2">{fromDate || 'الرصيد السابق'}</td>
                        <td className="font-sans text-slate-800 font-bold border-l border-slate-300 p-2 bg-slate-100/60">
                          رصيد افتتاحي سابق - الرصيد الافتتاحي السابق للموظف (ما قبل تاريخ {fromDate || 'بداية العمل'})
                        </td>
                        <td className="text-left font-bold text-emerald-800 font-mono whitespace-nowrap border-l border-slate-300 p-2">
                          {employeeStatement.openingBalance > 0 ? employeeStatement.openingBalance.toFixed(2) : '-'}
                        </td>
                        <td className="text-left font-bold text-rose-800 font-mono whitespace-nowrap border-l border-slate-300 p-2">
                          {employeeStatement.openingBalance < 0 ? Math.abs(employeeStatement.openingBalance).toFixed(2) : '-'}
                        </td>
                        <td className="text-left font-black text-slate-950 bg-slate-100 font-mono whitespace-nowrap p-2">
                          {employeeStatement.openingBalance.toFixed(2)} {settings.currency}
                        </td>
                      </tr>

                      {employeeStatement.rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-sans font-bold">
                            لا توجد حركات أو مسيرات رواتب مسجلة للموظف خلال هذه الفترة المحددة.
                          </td>
                        </tr>
                      ) : (
                        employeeStatement.rows.map((row, idx) => {
                          const debitAmount = (row.advance || 0) + (row.deduction || 0) + (row.disbursement || 0);
                          const creditAmount = row.entitlement || 0;

                          return (
                          <tr
                            key={`${row.id || 'emp-row'}-${idx}`}
                            className={`hover:bg-slate-50/90 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                            }`}
                          >
                            <td className="text-center text-slate-400 font-sans align-middle border-l border-slate-300 p-2">{idx + 1}</td>
                            <td className="text-slate-700 whitespace-nowrap text-center align-middle font-mono border-l border-slate-300 p-2">{row.date}</td>
                            <td className="font-sans text-slate-800 align-middle space-y-1 border-l border-slate-300 p-2">
                              <div className="font-bold text-slate-900 leading-tight flex flex-wrap items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${
                                  row.type === 'salary_accrual' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                  row.type === 'advance' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                  row.type === 'deduction' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                  row.type === 'incentive' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                                  'bg-blue-100 text-blue-900 border border-blue-300'
                                }`}>
                                  {row.type === 'advance' ? '💸 سلفة نقدية' : row.typeLabel}
                                </span>
                                {row.referenceNumber && (
                                  <span className="font-mono font-semibold text-slate-700">[{row.referenceNumber}]</span>
                                )}
                                <span className="text-slate-800 font-medium">{row.description}</span>
                              </div>

                              {/* شريط معلومات الدوام إن وجدت في الحركة */}
                              {row.type === 'salary_accrual' && row.typeLabel === 'يومية دوام' && row.attendanceRecord ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-lg mt-1 print:bg-white print:border-slate-300">
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">حضور 1:</span>
                                    <strong className="font-mono text-slate-800">{row.attendanceRecord.checkInTime || row.attendanceRecord.shift1CheckInTime || '-'}</strong>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">انصراف 1:</span>
                                    <strong className="font-mono text-slate-800">{row.attendanceRecord.checkOutTime || row.attendanceRecord.shift1CheckOutTime || '-'}</strong>
                                  </div>
                                  {row.attendanceRecord.hasSecondShift ? (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-400">حضور 2:</span>
                                        <strong className="font-mono text-slate-800">{row.attendanceRecord.shift2CheckInTime || '-'}</strong>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-400">انصراف 2:</span>
                                        <strong className="font-mono text-slate-800">{row.attendanceRecord.shift2CheckOutTime || '-'}</strong>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="col-span-2 text-[10px] text-slate-400">دوام مستمر (فترة واحدة)</div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">الساعات الفعلية:</span>
                                    <strong className="font-mono text-blue-900 bg-blue-50 px-1 rounded">{formatDecimalHours(row.attendanceRecord.actualWorkedHours || 0)}</strong>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">عمل رسمي:</span>
                                    <strong className="font-mono text-indigo-900 bg-indigo-50 px-1 rounded">{formatDecimalHours(row.attendanceRecord.regularHours || 0)}</strong>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">أوفر تايم:</span>
                                    <strong className="font-mono text-amber-900 bg-amber-50 px-1 rounded">+{formatDecimalHours(row.attendanceRecord.overtimeHours || 0)}</strong>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">راتب اليوم:</span>
                                    <strong className="font-mono text-emerald-900 bg-emerald-50 px-1 rounded">{row.attendanceRecord.totalDailyEarnings || 0} {settings.currency}</strong>
                                  </div>
                                </div>
                              ) : (row.presentDays !== undefined && row.presentDays > 0) ? (
                                <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-600 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100">
                                  <span>دوام: <strong className="text-blue-900 font-mono">{row.presentDays}</strong> يوم</span>
                                  {row.workedHours !== undefined && (
                                    <span>• ساعات العمل: <strong className="text-blue-900 font-mono">{formatDecimalHours(row.workedHours)}</strong></span>
                                  )}
                                  {row.overtimeHours !== undefined && row.overtimeHours > 0 && (
                                    <span className="text-amber-700 font-bold">• إضافي: +{formatDecimalHours(row.overtimeHours)}</span>
                                  )}
                                  {row.absentDays !== undefined && row.absentDays > 0 && (
                                    <span className="text-rose-600 font-bold">• غياب: {row.absentDays} يوم</span>
                                  )}
                                </div>
                              ) : null}

                              {row.notes && !row.description.includes(row.notes) && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5">
                                  ملاحظة: {row.notes}
                                </div>
                              )}
                            </td>
                            <td className="text-left font-bold text-emerald-700 font-mono align-middle whitespace-nowrap border-l border-slate-300 p-2">
                              {creditAmount > 0 ? creditAmount.toFixed(2) : '-'}
                            </td>
                            <td className="text-left font-bold text-rose-700 font-mono align-middle whitespace-nowrap border-l border-slate-300 p-2">
                              {debitAmount > 0 ? debitAmount.toFixed(2) : '-'}
                            </td>
                            <td className={`text-left font-black font-mono align-middle whitespace-nowrap bg-slate-50/70 p-2 ${
                              row.runningBalance >= 0 ? 'text-slate-900' : 'text-amber-800'
                            }`}>
                              {row.runningBalance.toFixed(2)} {settings.currency}
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  )}

                  {empViewMode === 'attendance_diary' ? (
                    <tfoot>
                      {/* Summary Breakdown Row */}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                        <td colSpan={6} className="text-right font-sans p-2 border-l border-slate-300">
                          <span className="font-bold text-slate-800">إجمالي الفترة المحددة:</span>
                        </td>
                        <td className="text-center font-mono text-blue-900 font-black bg-blue-50/50 p-2 border-l border-slate-300">
                          {employeeStatement.attendanceSummary.totalWorkedHours} س
                        </td>
                        <td className="text-center font-mono text-indigo-900 font-bold bg-indigo-50/50 p-2 border-l border-slate-300">
                          {employeeStatement.attendanceSummary.officialHoursExpected} س
                        </td>
                        <td className="text-center font-mono text-amber-800 font-black bg-amber-50/50 p-2 border-l border-slate-300">
                          {employeeStatement.attendanceSummary.overtimeHours > 0 ? `+${employeeStatement.attendanceSummary.overtimeHours} س` : '0 س'}
                        </td>
                        <td className="font-sans p-2 border-l border-slate-300">
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                            <span className="text-emerald-800 font-bold">
                              مجموع الرواتب اليومية: +{employeeStatement.totalEntitlements.toFixed(2)} {settings.currency}
                            </span>
                            {employeeStatement.totalAdvances > 0 && (
                              <span className="text-amber-800 font-bold">
                                خصم السلف: -{employeeStatement.totalAdvances.toFixed(2)} {settings.currency}
                              </span>
                            )}
                            {employeeStatement.totalDeductions > 0 && (
                              <span className="text-rose-800 font-bold">
                                خصومات: -{employeeStatement.totalDeductions.toFixed(2)} {settings.currency}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-left font-mono text-slate-950 font-black bg-slate-200/90 p-2 whitespace-nowrap">
                          {employeeStatement.closingBalance.toFixed(2)} {settings.currency}
                        </td>
                      </tr>

                      {/* Prominent Net Payable Row */}
                      <tr className="bg-emerald-50/90 font-black border-t border-emerald-300 text-emerald-950 text-xs">
                        <td colSpan={10} className="text-right font-sans p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-black text-emerald-900">
                              صافي المطلوب والمستحق للفترة المحددة (مجموع الرواتب اليومية - إجمالي السلف والخصومات):
                            </span>
                            <span className="text-xs font-bold text-slate-600 font-mono">
                              [رواتب يومية: {employeeStatement.totalDailySalaries.toFixed(2)} - سلف: {employeeStatement.totalAdvances.toFixed(2)}{employeeStatement.totalDeductions > 0 ? ` - خصومات: ${employeeStatement.totalDeductions.toFixed(2)}` : ''}]
                            </span>
                          </div>
                        </td>
                        <td className="text-left font-mono text-emerald-950 font-black bg-emerald-100/90 p-2.5 whitespace-nowrap text-sm border-r border-emerald-300">
                          {employeeStatement.netPeriodPayable.toFixed(2)} {settings.currency}
                        </td>
                      </tr>
                    </tfoot>
                  ) : (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900 text-xs">
                        <td colSpan={3} className="text-left font-sans p-2">الإجمالي العام للحركات بالفترة:</td>
                        <td className="text-left font-mono text-emerald-800 font-black whitespace-nowrap p-2">
                          {employeeStatement.totalEntitlements.toFixed(2)}
                        </td>
                        <td className="text-left font-mono text-amber-800 font-black whitespace-nowrap p-2">
                          {employeeStatement.totalAdvances.toFixed(2)}
                        </td>
                        <td className="text-left font-mono text-rose-800 font-black whitespace-nowrap p-2">
                          {employeeStatement.totalDeductions.toFixed(2)}
                        </td>
                        <td className="text-left font-mono text-blue-800 font-black whitespace-nowrap p-2">
                          {employeeStatement.totalDisbursements.toFixed(2)}
                        </td>
                        <td className="text-left font-mono text-slate-900 font-black bg-slate-200/80 p-2 whitespace-nowrap">
                          {employeeStatement.closingBalance.toFixed(2)} {settings.currency}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* ملخص نهاية كشف حساب الموظف والتفقيط */}
              <div className="mt-2 p-2 bg-slate-50 border border-slate-400 rounded-md space-y-1.5 shadow-2xs print:border-slate-300">
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  <div className="bg-white border border-slate-300 rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs">
                    <span className="font-bold text-slate-700 text-[10px] whitespace-nowrap">رصيد سابق:</span>
                    <div className="font-black font-mono text-slate-900 text-[11px] flex items-center gap-1 whitespace-nowrap">
                      <span>{employeeStatement.openingBalance.toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold text-slate-500">{settings.currency}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-300 rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs">
                    <span className="font-bold text-[10px] whitespace-nowrap text-emerald-900">إجمالي المستحقات:</span>
                    <div className="font-black font-mono text-[11px] text-emerald-700 flex items-center gap-1 whitespace-nowrap">
                      <span>{employeeStatement.totalEntitlements.toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold opacity-75">{settings.currency}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-rose-300 rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs">
                    <span className="font-bold text-[10px] whitespace-nowrap text-rose-900">السلف والخصومات:</span>
                    <div className="font-black font-mono text-[11px] text-rose-700 flex items-center gap-1 whitespace-nowrap">
                      <span>{(employeeStatement.totalAdvances + employeeStatement.totalDeductions).toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold opacity-75">{settings.currency}</span>
                    </div>
                  </div>

                  <div className={`bg-white border rounded p-1 sm:p-1.5 flex items-center justify-center gap-1.5 shadow-2xs ${
                    employeeStatement.closingBalance > 0 ? 'border-emerald-400 bg-emerald-50/20' :
                    employeeStatement.closingBalance < 0 ? 'border-amber-400 bg-amber-50/20' : 'border-slate-300'
                  }`}>
                    <span className="font-bold text-slate-900 text-[10px] whitespace-nowrap">
                      الصافي المتبقي:
                    </span>
                    <div className={`font-black font-mono text-[11px] flex items-center gap-1 whitespace-nowrap ${
                      employeeStatement.closingBalance > 0 ? 'text-emerald-700' :
                      employeeStatement.closingBalance < 0 ? 'text-amber-700' : 'text-slate-800'
                    }`}>
                      <span>{Math.abs(employeeStatement.closingBalance).toFixed(2)}</span>
                      <span className="text-[9px] font-sans font-bold opacity-75">{settings.currency}</span>
                      <span className="text-[9.5px] font-sans font-bold">
                        ({employeeStatement.closingBalance > 0 ? 'مستحق له' : employeeStatement.closingBalance < 0 ? 'سلف عليه' : 'خالص'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tafqeet & Closing Balance */}
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="flex items-center justify-between text-[10.5px] mb-0.5">
                    <span className="font-bold text-slate-700">المبلغ كتابة وتفقيطاً:</span>
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      صافي رصيد الموظف ({employeeStatement.closingBalance >= 0 ? 'مستحق له' : 'مدين عليه'}): {Math.abs(employeeStatement.closingBalance).toFixed(2)} {settings.currency}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-semibold text-slate-800 bg-slate-50 p-1 rounded border border-slate-200 font-arabic">
                    {empTafqeet}
                  </div>
                </div>
              </div>

              {/* Official Signatures Section for Employee Statement */}
              <div className="pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px] mt-4">
                {/* Right Column */}
                <div className="space-y-4 flex flex-col items-center justify-end">
                  <span className="font-bold text-slate-700 block mb-auto">إعداد وتدقيق المحاسب</span>
                  <div className="border-b border-dashed border-slate-400 w-28 mx-auto mt-6"></div>
                  <span className="text-[10px] text-slate-400 block font-mono">التوقيع والتاريخ</span>
                </div>

                {/* Center Column */}
                <div className="space-y-4 flex flex-col items-center justify-end">
                  <span className="font-bold text-slate-700 block mb-auto">إقرار الموظف بالمطابقة والاستلام</span>
                  <div className="border-b border-dashed border-slate-400 w-28 mx-auto mt-6"></div>
                  <span className="text-[10px] text-slate-400 block font-mono">توقيع الموظف</span>
                </div>

                {/* Left Column - Official Stamp & Signature */}
                <div className="space-y-2 flex flex-col items-center justify-end">
                  <span className="font-bold text-slate-700 block mb-auto">اعتماد الإدارة / الختم</span>
                  
                  <div className="min-h-[4.2cm] flex items-center justify-center relative">
                    {settings.stampUrl ? (
                      <div className="relative flex items-center justify-center">
                        <OfficialStamp size="3.5cm" />
                        {settings.signatureUrl && (
                          <img
                            src={settings.signatureUrl}
                            alt="Signature"
                            className="absolute bottom-1 max-h-12 max-w-[120px] object-contain mix-blend-multiply opacity-85 pointer-events-none"
                          />
                        )}
                      </div>
                    ) : settings.signatureUrl ? (
                      <img
                        src={settings.signatureUrl}
                        alt="Signature"
                        className="max-h-16 max-w-[140px] object-contain mix-blend-multiply opacity-90"
                      />
                    ) : (
                      <div className="border-b border-dashed border-slate-400 w-36 mx-auto mt-10"></div>
                    )}
                  </div>
                  
                  <span className="text-[11px] text-slate-400 block font-mono mt-2">الختم والتوقيع المعتمد</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Official Notice */}
          <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100">
            تم استخراج كشف الحساب المالي آلياً عبر نظام إدارة الحسابات والمطابع - يرجى مراجعة الإدارة المالية في حال وجود أي استفسار أو تدقيق.
          </div>
        </div>
      </div>
    </div>
  );
};
