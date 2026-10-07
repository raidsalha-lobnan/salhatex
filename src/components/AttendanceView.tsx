import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coffee,
  DollarSign,
  UserCheck,
  UserX,
  Printer,
  Sparkles,
  Filter,
  ChevronRight,
  ChevronLeft,
  Save,
  Check,
  RefreshCw,
  TrendingUp,
  Settings,
  HelpCircle,
  Users,
  Search,
  ArrowUpRight,
  CalendarCheck,
  Building2,
  Scissors
} from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { AttendanceRecord, AttendanceStatus, Employee, OvertimeMethod, EmployeeDepartment } from '../types';

export const AttendanceView: React.FC = () => {
  const {
    employees,
    attendanceRecords,
    saveDailyAttendanceBatch,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    transferOvertimeToIncentives,
    settings,
    updateEmployee
  } = useAccounting();

  const currencySymbol = settings.currency || '₪';

  // Active view tab
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'settings'>('daily');

  // Selected date for daily attendance (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filters for monthly report
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Daily sheet local draft state (to allow edits before batch saving)
  const [dailyDrafts, setDailyDrafts] = useState<Record<string, {
    status: AttendanceStatus;
    checkInTime: string;
    checkOutTime: string;
    breakMinutes: number;
    officialDailyHours: number;
    baseHourlyRate: number;
    overtimeMethod: OvertimeMethod;
    overtimeMultiplier: number;
    overtimeRatePerHour: number;
    notes: string;
    isDirty: boolean;
    // نظام الدوام على مرحلتين / فترتين (خروج لمشوار والعودة)
    hasSecondShift: boolean;
    shift1CheckInTime: string;
    shift1CheckOutTime: string;
    shift2CheckInTime: string;
    shift2CheckOutTime: string;
  }>>({});

  // Notification / Toast state
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // Helper to get active employees
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'active');
  }, [employees]);

  // Existing saved records for selected date
  const existingRecordsForDate = useMemo(() => {
    return attendanceRecords.filter(r => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Map existing records by employeeId
  const recordsMapByEmpId = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    existingRecordsForDate.forEach(r => map.set(r.employeeId, r));
    return map;
  }, [existingRecordsForDate]);

  // Helper to compute default base hourly rate
  const computeDefaultBaseHourlyRate = (emp: Employee, officialHours: number = 8): number => {
    if (emp.customHourlyRate && emp.customHourlyRate > 0) return emp.customHourlyRate;
    const hours = Math.max(1, officialHours || emp.officialDailyHours || 8);
    if (emp.salaryType === 'daily') {
      return Number(((emp.salaryAmount || 140) / hours).toFixed(2));
    }
    if (emp.salaryType === 'weekly') {
      return Number(((emp.salaryAmount || 850) / 6 / hours).toFixed(2));
    }
    // Monthly
    return Number(((emp.salaryAmount || 4500) / 30 / hours).toFixed(2));
  };

  // Helper to calculate live metrics for a row
  const calculateRowLiveMetrics = (emp: Employee, draft: {
    status: AttendanceStatus;
    checkInTime: string;
    checkOutTime: string;
    breakMinutes: number;
    officialDailyHours: number;
    baseHourlyRate: number;
    overtimeMethod: OvertimeMethod;
    overtimeMultiplier: number;
    overtimeRatePerHour: number;
    hasSecondShift?: boolean;
    shift1CheckInTime?: string;
    shift1CheckOutTime?: string;
    shift2CheckInTime?: string;
    shift2CheckOutTime?: string;
  }) => {
    const officialHours = draft.officialDailyHours || 8;
    const baseRate = draft.baseHourlyRate > 0 ? draft.baseHourlyRate : computeDefaultBaseHourlyRate(emp, officialHours);
    
    let overtimeRate = draft.overtimeRatePerHour;
    if (draft.overtimeMethod === 'multiplier') {
      overtimeRate = Number((baseRate * (draft.overtimeMultiplier || 1.5)).toFixed(2));
    }

    if (draft.status === 'absent' || draft.status === 'unpaid_leave') {
      return {
        workedHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        baseRate,
        overtimeRate,
        regularPay: 0,
        overtimePay: 0,
        totalPay: 0,
        shift1Hours: 0,
        shift2Hours: 0,
        breakBetweenShiftsMinutes: 0
      };
    }

    if (draft.status === 'excused_leave') {
      const regularPay = Number((officialHours * baseRate).toFixed(2));
      return {
        workedHours: officialHours,
        regularHours: officialHours,
        overtimeHours: 0,
        baseRate,
        overtimeRate,
        regularPay,
        overtimePay: 0,
        totalPay: regularPay,
        shift1Hours: officialHours,
        shift2Hours: 0,
        breakBetweenShiftsMinutes: 0
      };
    }

    const parseMinutes = (timeStr?: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(n => parseInt(n, 10) || 0);
      return h * 60 + m;
    };

    let netMinutes = 0;
    let shift1Hours = 0;
    let shift2Hours = 0;
    let breakBetweenShiftsMinutes = 0;

    if (draft.hasSecondShift) {
      // المرحلة الأولى: من وقت الحضور حتى وقت الخروج لمشوار
      const s1In = parseMinutes(draft.shift1CheckInTime || draft.checkInTime || '08:00');
      const s1Out = parseMinutes(draft.shift1CheckOutTime || '10:00');
      // المرحلة الثانية: من وقت العودة حتى وقت الانصراف النهائي
      const s2In = parseMinutes(draft.shift2CheckInTime || '12:00');
      const s2Out = parseMinutes(draft.shift2CheckOutTime || draft.checkOutTime || '16:00');

      const s1Min = Math.max(0, s1Out - s1In);
      const s2Min = Math.max(0, s2Out - s2In);
      breakBetweenShiftsMinutes = Math.max(0, s2In - s1Out);

      shift1Hours = Number((s1Min / 60).toFixed(2));
      shift2Hours = Number((s2Min / 60).toFixed(2));

      // صافي دقائق العمل = المرحلة الأولى + المرحلة الثانية - الاستراحة الإضافية
      netMinutes = Math.max(0, (s1Min + s2Min) - (draft.breakMinutes || 0));
    } else {
      // الدوام المستمر المعتاد
      const inMin = parseMinutes(draft.checkInTime || '08:00');
      const outMin = parseMinutes(draft.checkOutTime || '16:00');
      const grossMinutes = Math.max(0, outMin - inMin);
      netMinutes = Math.max(0, grossMinutes - (draft.breakMinutes || 0));
      shift1Hours = Number((netMinutes / 60).toFixed(2));
      shift2Hours = 0;
    }

    const workedHours = Number((netMinutes / 60).toFixed(2));
    const regularHours = Math.min(workedHours, officialHours);
    const overtimeHours = Math.max(0, Number((workedHours - officialHours).toFixed(2)));

    const regularPay = Number((regularHours * baseRate).toFixed(2));
    const overtimePay = Number((overtimeHours * overtimeRate).toFixed(2));
    const totalPay = Number((regularPay + overtimePay).toFixed(2));

    return {
      workedHours,
      regularHours,
      overtimeHours,
      baseRate,
      overtimeRate,
      regularPay,
      overtimePay,
      totalPay,
      shift1Hours,
      shift2Hours,
      breakBetweenShiftsMinutes
    };
  };

  // Get current state for an employee on the daily sheet (saved record or local draft or employee defaults)
  const getEmployeeDailyState = (emp: Employee) => {
    const draft = dailyDrafts[emp.id];
    if (draft) return draft;

    const saved = recordsMapByEmpId.get(emp.id);
    if (saved) {
      return {
        status: saved.status,
        checkInTime: saved.shift1CheckInTime || saved.checkInTime || '08:00',
        checkOutTime: saved.shift2CheckOutTime || saved.checkOutTime || '16:00',
        breakMinutes: saved.breakMinutes !== undefined ? saved.breakMinutes : 0,
        officialDailyHours: saved.officialDailyHours || emp.officialDailyHours || 8,
        baseHourlyRate: saved.baseHourlyRate || computeDefaultBaseHourlyRate(emp),
        overtimeMethod: saved.overtimeMethod || emp.overtimeMethod || 'multiplier',
        overtimeMultiplier: saved.overtimeMultiplier || emp.overtimeMultiplier || 1.5,
        overtimeRatePerHour: saved.overtimeRatePerHour || Number((computeDefaultBaseHourlyRate(emp) * (emp.overtimeMultiplier || 1.5)).toFixed(2)),
        notes: saved.notes || '',
        isDirty: false,
        hasSecondShift: true,
        shift1CheckInTime: saved.shift1CheckInTime || saved.checkInTime || '08:00',
        shift1CheckOutTime: saved.shift1CheckOutTime || '10:00',
        shift2CheckInTime: saved.shift2CheckInTime || '12:00',
        shift2CheckOutTime: saved.shift2CheckOutTime || saved.checkOutTime || '16:00'
      };
    }

    // Default for fresh day (موحد لجميع العمال: مرحلتين 8-10 و 12-4)
    const officialDailyHours = emp.officialDailyHours || 8;
    const baseHourlyRate = computeDefaultBaseHourlyRate(emp, officialDailyHours);
    const overtimeMultiplier = emp.overtimeMultiplier || 1.5;
    const overtimeMethod = emp.overtimeMethod || 'multiplier';
    const overtimeRatePerHour = emp.overtimeMethod === 'fixed_rate' && emp.customOvertimeRate
      ? emp.customOvertimeRate
      : Number((baseHourlyRate * overtimeMultiplier).toFixed(2));

    return {
      status: 'present' as AttendanceStatus,
      checkInTime: '08:00',
      checkOutTime: '16:00',
      breakMinutes: 0,
      officialDailyHours,
      baseHourlyRate,
      overtimeMethod,
      overtimeMultiplier,
      overtimeRatePerHour,
      notes: '',
      isDirty: false,
      hasSecondShift: true,
      shift1CheckInTime: '08:00',
      shift1CheckOutTime: '10:00',
      shift2CheckInTime: '12:00',
      shift2CheckOutTime: '16:00'
    };
  };

  // Update a single draft field for an employee
  const handleDraftChange = (empId: string, field: string, value: any) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const current = getEmployeeDailyState(emp);
    const updated = {
      ...current,
      [field]: value,
      isDirty: true
    };

    // If base rate or multiplier changed and method is multiplier, recompute overtimeRatePerHour
    if (field === 'baseHourlyRate' || field === 'overtimeMultiplier' || field === 'overtimeMethod') {
      if (updated.overtimeMethod === 'multiplier') {
        updated.overtimeRatePerHour = Number((updated.baseHourlyRate * updated.overtimeMultiplier).toFixed(2));
      }
    }

    setDailyDrafts(prev => ({
      ...prev,
      [empId]: updated
    }));
  };

  // Helper to format current local time as HH:mm
  const getCurrentTimeString = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Quick Action: Set Phase 1 Check-In (حضور المرحلة 1) for all active
  const handleSetAllShift1CheckInNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          shift1CheckInTime: nowTime,
          checkInTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل حضور المرحلة 1 لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Set Phase 1 Check-Out (خروج لمشوار) for all active
  const handleSetAllShift1CheckOutNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          shift1CheckOutTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل خروج لمشوار لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Set Phase 2 Check-In (عودة من مشوار) for all active
  const handleSetAllShift2CheckInNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          shift2CheckInTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل عودة من مشوار لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Set Phase 2 Check-Out (انصراف نهائي) for all active
  const handleSetAllShift2CheckOutNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          shift2CheckOutTime: nowTime,
          checkOutTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل الانصراف النهائي لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Mark all active employees as Present with standard unified hours
  const handleMarkAllPresent = () => {
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const officialDailyHours = emp.officialDailyHours || 8;
      const baseHourlyRate = computeDefaultBaseHourlyRate(emp, officialDailyHours);
      const overtimeMultiplier = emp.overtimeMultiplier || 1.5;
      const overtimeMethod = emp.overtimeMethod || 'multiplier';
      const overtimeRatePerHour = emp.overtimeMethod === 'fixed_rate' && emp.customOvertimeRate
        ? emp.customOvertimeRate
        : Number((baseHourlyRate * overtimeMultiplier).toFixed(2));

      newDrafts[emp.id] = {
        status: 'present',
        checkInTime: '08:00',
        checkOutTime: '16:00',
        breakMinutes: 0,
        officialDailyHours,
        baseHourlyRate,
        overtimeMethod,
        overtimeMultiplier,
        overtimeRatePerHour,
        notes: 'دوام رسمي موحد (8:00 - 10:00 و 12:00 - 16:00)',
        isDirty: true,
        hasSecondShift: true,
        shift1CheckInTime: '08:00',
        shift1CheckOutTime: '10:00',
        shift2CheckInTime: '12:00',
        shift2CheckOutTime: '16:00'
      };
    });

    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback('تم ضبط الحضور الموحد للجميع (المرحلة 1: 8-10، المرحلة 2: 12-4) بنجاح!', 'info');
  };

  // Quick Action: Save entire daily sheet
  const handleSaveDailySheet = () => {
    const batchList: Array<Partial<AttendanceRecord> & { employeeId: string }> = [];

    activeEmployees.forEach(emp => {
      const state = getEmployeeDailyState(emp);
      batchList.push({
        employeeId: emp.id,
        status: state.status,
        checkInTime: state.hasSecondShift ? state.shift1CheckInTime : state.checkInTime,
        checkOutTime: state.hasSecondShift ? state.shift2CheckOutTime : state.checkOutTime,
        breakMinutes: state.breakMinutes,
        hasSecondShift: state.hasSecondShift,
        shift1CheckInTime: state.shift1CheckInTime,
        shift1CheckOutTime: state.shift1CheckOutTime,
        shift2CheckInTime: state.shift2CheckInTime,
        shift2CheckOutTime: state.shift2CheckOutTime,
        officialDailyHours: state.officialDailyHours,
        baseHourlyRate: state.baseHourlyRate,
        overtimeMethod: state.overtimeMethod,
        overtimeMultiplier: state.overtimeMultiplier,
        overtimeRatePerHour: state.overtimeRatePerHour,
        notes: state.notes
      });
    });

    saveDailyAttendanceBatch(selectedDate, batchList);
    setDailyDrafts({});
    showFeedback(`تم حفظ واعتماد كشف الحضور والدوام ليوم (${selectedDate}) بنجاح!`, 'success');
  };

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + days);
    setSelectedDate(curr.toISOString().split('T')[0]);
    setDailyDrafts({});
  };

  // Department labels helper
  const getDepartmentLabel = (dept: EmployeeDepartment) => {
    switch (dept) {
      case 'tailoring_sewing': return 'الخياطة والتفصيل 🧵';
      case 'cutting': return 'الفصال والقص ✂️';
      case 'ironing_finishing': return 'الكي والتشطيب 👔';
      case 'design_patterns': return 'الباترونات والتصميم 📐';
      case 'sales_pos': return 'الاستقبال والقياسات 🛍️';
      case 'management': return 'الإدارة العامة 📋';
      default: return 'عام';
    }
  };

  // Compute daily totals for header banner
  const dailyTotals = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let totalWorkedHours = 0;
    let totalOvertimeHours = 0;
    let totalOvertimePay = 0;
    let totalDailyPay = 0;

    activeEmployees.forEach(emp => {
      const state = getEmployeeDailyState(emp);
      const metrics = calculateRowLiveMetrics(emp, state);

      if (state.status === 'present') presentCount++;
      else if (state.status === 'absent' || state.status === 'unpaid_leave') absentCount++;
      else if (state.status === 'late' || state.status === 'half_day') lateCount++;
      else if (state.status === 'excused_leave') leaveCount++;

      totalWorkedHours += metrics.workedHours;
      totalOvertimeHours += metrics.overtimeHours;
      totalOvertimePay += metrics.overtimePay;
      totalDailyPay += metrics.totalPay;
    });

    return {
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      totalWorkedHours: Number(totalWorkedHours.toFixed(2)),
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
      totalOvertimePay: Number(totalOvertimePay.toFixed(2)),
      totalDailyPay: Number(totalDailyPay.toFixed(2))
    };
  }, [activeEmployees, dailyDrafts, existingRecordsForDate]);

  // Monthly Report Records
  const monthlyFilteredRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      const matchMonth = r.date.startsWith(selectedMonth);
      const matchEmp = selectedEmployeeFilter === 'all' || r.employeeId === selectedEmployeeFilter;
      const matchDept = selectedDepartmentFilter === 'all' || r.department === selectedDepartmentFilter;
      const matchSearch = !searchQuery || r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || r.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchEmp && matchDept && matchSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, selectedMonth, selectedEmployeeFilter, selectedDepartmentFilter, searchQuery]);

  // Monthly Aggregated Totals
  const monthlyTotals = useMemo(() => {
    let daysPresent = 0;
    let daysAbsent = 0;
    let totalWorkedHours = 0;
    let totalOvertimeHours = 0;
    let totalOvertimePay = 0;
    let totalEarnings = 0;
    let untransferredOvertimePay = 0;

    monthlyFilteredRecords.forEach(r => {
      if (r.status === 'present' || r.status === 'late' || r.status === 'half_day') daysPresent++;
      else if (r.status === 'absent' || r.status === 'unpaid_leave') daysAbsent++;

      totalWorkedHours += r.actualWorkedHours || 0;
      totalOvertimeHours += r.overtimeHours || 0;
      totalOvertimePay += r.overtimePayEarned || 0;
      totalEarnings += r.totalDailyEarnings || 0;
      if (!r.isTransferredToPayroll && r.overtimePayEarned > 0) {
        untransferredOvertimePay += r.overtimePayEarned;
      }
    });

    return {
      recordsCount: monthlyFilteredRecords.length,
      daysPresent,
      daysAbsent,
      totalWorkedHours: Number(totalWorkedHours.toFixed(2)),
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
      totalOvertimePay: Number(totalOvertimePay.toFixed(2)),
      totalEarnings: Number(totalEarnings.toFixed(2)),
      untransferredOvertimePay: Number(untransferredOvertimePay.toFixed(2))
    };
  }, [monthlyFilteredRecords]);

  // Handle Transferring Overtime to Incentives / Payroll
  const handleTransferOvertime = () => {
    const res = transferOvertimeToIncentives(selectedMonth, monthlyFilteredRecords);
    if (res.count > 0) {
      showFeedback(`تم بنجاح ترحيل ${res.count} سجل أوفرتايم بقيمة إجمالية (${res.totalAmount.toLocaleString()} ${currencySymbol}) لحسابات وحوافز مسير الرواتب!`, 'success');
    } else {
      showFeedback('لا توجد مستحقات أوفرتايم غير مرحلة في الفترة المحددة.', 'info');
    }
  };

  return (
    <div className="space-y-3 pb-12" dir="rtl">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div className={`p-3 rounded-xl border flex items-center justify-between shadow-md transition-all animate-fade-in ${
          feedbackMessage.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          feedbackMessage.type === 'error' ? 'bg-red-50 border-red-300 text-red-900' :
          'bg-indigo-50 border-indigo-300 text-indigo-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> :
             feedbackMessage.type === 'error' ? <XCircle className="w-4 h-4 text-red-600 shrink-0" /> :
             <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />}
            <span className="font-semibold text-xs">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-gray-400 hover:text-gray-700 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unified Compact Top Header & Navigation */}
      <div className="bg-white rounded-xl px-4 py-2.5 shadow-2xs border border-gray-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200/80 shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-base font-black text-gray-900 leading-tight">
            سجل الحضور والدوام وحساب الأوفرتايم
          </h1>
        </div>

        {/* Navigation Tabs Switcher */}
        <div className="flex items-center p-1 bg-gray-100/90 rounded-lg border border-gray-200/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-white text-indigo-950 shadow-2xs border border-gray-200/70'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>الكشف اليومي السريع</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-white text-indigo-950 shadow-2xs border border-gray-200/70'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>تقرير الدوام والأوفرتايم</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-indigo-950 shadow-2xs border border-gray-200/70'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>سياسات وساعات الدوام</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY ATTENDANCE SHEET */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-3">
          {/* Integrated Daily Toolbar & Single-Line KPIs Strip */}
          <div className="bg-white rounded-xl p-3 shadow-2xs border border-gray-200/90 space-y-2.5">
            {/* Action & Date Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Date Picker Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
                  title="اليوم السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setDailyDrafts({});
                    }}
                    className="bg-transparent font-bold text-gray-900 text-xs focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
                  title="اليوم التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setDailyDrafts({});
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 rounded-md hover:bg-indigo-100 transition"
                >
                  اليوم
                </button>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-lg transition shadow-2xs"
                  title="تحضير جميع العمال بالدوام الموحد (المرحلة 1: 8-10، المرحلة 2: 12-4)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تحضير موحد للجميع (8-10 و 12-4)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDailySheet}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ واعتماد كشف اليوم</span>
                </button>
              </div>
            </div>

            {/* Single-Line Compact Metrics Ribbon */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-2 px-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>الحاضرون:</span>
                <span className="font-bold text-gray-900 font-mono">{dailyTotals.presentCount}</span>
                <span className="text-gray-500 text-[11px]">عامل</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-slate-700">
                <UserX className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>الغياب:</span>
                <span className="font-bold text-gray-900 font-mono">{dailyTotals.absentCount}</span>
                <span className="text-gray-500 text-[11px]">عامل</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>الساعات الفعلية:</span>
                <span className="font-bold text-blue-700 font-mono">{dailyTotals.totalWorkedHours}</span>
                <span className="text-gray-500 text-[11px]">ساعة</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-amber-800">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>ساعات الأوفرتايم:</span>
                <span className="font-bold text-amber-900 font-mono">{dailyTotals.totalOvertimeHours}</span>
                <span className="text-amber-700 text-[11px]">ساعة</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-amber-800">
                <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>تكلفة الأوفرتايم:</span>
                <span className="font-bold text-amber-900 font-mono">{dailyTotals.totalOvertimePay.toLocaleString()}</span>
                <span className="text-amber-700 text-[11px]">{currencySymbol}</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-indigo-900 mr-auto">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>إجمالي مستحق اليوم:</span>
                <span className="font-bold text-indigo-950 font-mono">{dailyTotals.totalDailyPay.toLocaleString()}</span>
                <span className="text-indigo-700 text-[11px]">{currencySymbol}</span>
              </div>
            </div>
          </div>

          {/* Daily Interactive Attendance Table */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200/90 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  كشف التحضير وتفاصيل الساعات ليوم {selectedDate} ({activeEmployees.length} عامل)
                </h3>
              </div>
              <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                دوام موحد على مرحلتين: (م1: 8:00 - 10:00) • (مشوار: ساعتان) • (م2: 12:00 - 16:00)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase">
                    <th className="py-2.5 px-3 whitespace-nowrap">اسم العامل</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">حالة الدوام</th>
                    
                    {/* Stage 1: Check In */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-purple-50/40">
                      <div className="flex items-center justify-center gap-1">
                        <span>م1: حضور</span>
                        <button
                          type="button"
                          onClick={handleSetAllShift1CheckInNow}
                          className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-white transition"
                          title="تعيين الوقت الحالي لحضور المرحلة 1 للجميع"
                        >
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                        </button>
                      </div>
                    </th>

                    {/* Stage 1: Leave for Errand */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-purple-50/40">
                      <div className="flex items-center justify-center gap-1">
                        <span>م1: خروج لمشوار</span>
                        <button
                          type="button"
                          onClick={handleSetAllShift1CheckOutNow}
                          className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-white transition"
                          title="تعيين الوقت الحالي لخروج المشوار للجميع"
                        >
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                        </button>
                      </div>
                    </th>

                    {/* Stage 2: Return from Errand */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-emerald-50/40">
                      <div className="flex items-center justify-center gap-1">
                        <span>م2: عودة</span>
                        <button
                          type="button"
                          onClick={handleSetAllShift2CheckInNow}
                          className="p-1 rounded text-gray-400 hover:text-emerald-700 hover:bg-white transition"
                          title="تعيين الوقت الحالي لعودة المرحلة 2 للجميع"
                        >
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </th>

                    {/* Stage 2: Final Check Out */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-emerald-50/40">
                      <div className="flex items-center justify-center gap-1">
                        <span>م2: انصراف</span>
                        <button
                          type="button"
                          onClick={handleSetAllShift2CheckOutNow}
                          className="p-1 rounded text-gray-400 hover:text-emerald-700 hover:bg-white transition"
                          title="تعيين الوقت الحالي لانصراف نهاية الدوام للجميع"
                        >
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </th>

                    <th className="py-2.5 px-2 text-center whitespace-nowrap">المشوار (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">الرسمية (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap font-bold text-gray-900">الفعلية (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">الأوفرتايم (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">طريقة الإضافي</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">أجر الساعة</th>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">صافي اليوم ({currencySymbol})</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {activeEmployees.map((emp) => {
                    const state = getEmployeeDailyState(emp);
                    const metrics = calculateRowLiveMetrics(emp, state);
                    const isOff = state.status === 'absent' || state.status === 'unpaid_leave' || state.status === 'excused_leave';

                    return (
                      <tr
                        key={emp.id}
                        className={`transition-colors hover:bg-gray-50/80 ${
                          state.status === 'absent' ? 'bg-red-50/30' :
                          metrics.overtimeHours > 0 ? 'bg-amber-50/25' : ''
                        }`}
                      >
                        {/* Employee Name */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-bold text-gray-900 text-xs sm:text-sm block">{emp.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{emp.code}</span>
                        </td>

                        {/* Status Selector */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          <select
                            value={state.status}
                            onChange={(e) => handleDraftChange(emp.id, 'status', e.target.value as AttendanceStatus)}
                            className={`text-xs font-bold rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                              state.status === 'present' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              state.status === 'absent' ? 'bg-red-50 text-red-800 border-red-300' :
                              state.status === 'late' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                              state.status === 'excused_leave' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                              state.status === 'unpaid_leave' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                              'bg-purple-50 text-purple-800 border-purple-300'
                            }`}
                          >
                            <option value="present">حاضر 🟢</option>
                            <option value="late">متأخر 🟡</option>
                            <option value="half_day">نصف يوم 🟣</option>
                            <option value="excused_leave">إجازة مدفوعة 🔵</option>
                            <option value="unpaid_leave">إجازة بدون راتب ⚪</option>
                            <option value="absent">غائب بدون إذن 🔴</option>
                          </select>
                        </td>

                        {/* Stage 1: Check In (حضور م1) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-purple-50/20">
                          <div className={`inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-2xs hover:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500 ${
                            isOff ? 'opacity-40 pointer-events-none' : ''
                          }`}>
                            <input
                              type="time"
                              disabled={isOff}
                              value={state.shift1CheckInTime}
                              onChange={(e) => handleDraftChange(emp.id, 'shift1CheckInTime', e.target.value)}
                              className="bg-transparent border-0 px-2 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isOff}
                              onClick={() => {
                                const nowTime = getCurrentTimeString();
                                handleDraftChange(emp.id, 'shift1CheckInTime', nowTime);
                                showFeedback(`تم تعيين حضور م1 لـ ${emp.name} إلى (${nowTime})`, 'info');
                              }}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition border-r border-gray-200"
                              title="تعيين الوقت الحالي (حضور المرحلة 1)"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Stage 1: Check Out for Errand (خروج لمشوار) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-purple-50/20">
                          <div className={`inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-2xs hover:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500 ${
                            isOff ? 'opacity-40 pointer-events-none' : ''
                          }`}>
                            <input
                              type="time"
                              disabled={isOff}
                              value={state.shift1CheckOutTime}
                              onChange={(e) => handleDraftChange(emp.id, 'shift1CheckOutTime', e.target.value)}
                              className="bg-transparent border-0 px-2 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isOff}
                              onClick={() => {
                                const nowTime = getCurrentTimeString();
                                handleDraftChange(emp.id, 'shift1CheckOutTime', nowTime);
                                showFeedback(`تم تعيين خروج المشوار لـ ${emp.name} إلى (${nowTime})`, 'info');
                              }}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition border-r border-gray-200"
                              title="تعيين الوقت الحالي (خروج لمشوار)"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Stage 2: Return from Errand (عودة من مشوار) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-emerald-50/20">
                          <div className={`inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-2xs hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500 ${
                            isOff ? 'opacity-40 pointer-events-none' : ''
                          }`}>
                            <input
                              type="time"
                              disabled={isOff}
                              value={state.shift2CheckInTime}
                              onChange={(e) => handleDraftChange(emp.id, 'shift2CheckInTime', e.target.value)}
                              className="bg-transparent border-0 px-2 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isOff}
                              onClick={() => {
                                const nowTime = getCurrentTimeString();
                                handleDraftChange(emp.id, 'shift2CheckInTime', nowTime);
                                showFeedback(`تم تعيين عودة المشوار لـ ${emp.name} إلى (${nowTime})`, 'info');
                              }}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition border-r border-gray-200"
                              title="تعيين الوقت الحالي (عودة من مشوار)"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Stage 2: Final Check Out (انصراف نهائي) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-emerald-50/20">
                          <div className={`inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-2xs hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500 ${
                            isOff ? 'opacity-40 pointer-events-none' : ''
                          }`}>
                            <input
                              type="time"
                              disabled={isOff}
                              value={state.shift2CheckOutTime}
                              onChange={(e) => handleDraftChange(emp.id, 'shift2CheckOutTime', e.target.value)}
                              className="bg-transparent border-0 px-2 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isOff}
                              onClick={() => {
                                const nowTime = getCurrentTimeString();
                                handleDraftChange(emp.id, 'shift2CheckOutTime', nowTime);
                                showFeedback(`تم تعيين انصراف نهاية الدوام لـ ${emp.name} إلى (${nowTime})`, 'info');
                              }}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition border-r border-gray-200"
                              title="تعيين الوقت الحالي (انصراف نهائي)"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Errand Duration (مدة المشوار محسوبة) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {!isOff && metrics.breakBetweenShiftsMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-xs" title={`من ${state.shift1CheckOutTime} إلى ${state.shift2CheckInTime}`}>
                              {Number((metrics.breakBetweenShiftsMinutes / 60).toFixed(1))} س
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono text-xs">0</span>
                          )}
                        </td>

                        {/* Official Hours */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <input
                            type="number"
                            value={state.officialDailyHours}
                            onChange={(e) => handleDraftChange(emp.id, 'officialDailyHours', parseFloat(e.target.value) || 8)}
                            className="w-12 bg-gray-50 border border-gray-300 rounded-lg px-1 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            min="1"
                            max="24"
                            step="0.5"
                          />
                        </td>

                        {/* Actual Worked Hours (Calculated) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-blue-50/30">
                          <div className="font-mono font-black text-blue-900 text-xs sm:text-sm">
                            {metrics.workedHours} س
                          </div>
                          {!isOff && (
                            <div className="text-[10px] text-gray-500 font-mono" title={`م1: ${metrics.shift1Hours} س + م2: ${metrics.shift2Hours} س`}>
                              ({metrics.shift1Hours} + {metrics.shift2Hours})
                            </div>
                          )}
                        </td>

                        {/* Overtime Hours (Calculated) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {metrics.overtimeHours > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono font-black text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-full text-xs">
                              +{metrics.overtimeHours} س
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono text-xs">0</span>
                          )}
                        </td>

                        {/* Overtime Method & Multiplier Selector */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <select
                              value={state.overtimeMethod === 'multiplier' ? String(state.overtimeMultiplier) : 'fixed'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'fixed') {
                                  handleDraftChange(emp.id, 'overtimeMethod', 'fixed_rate');
                                } else {
                                  handleDraftChange(emp.id, 'overtimeMethod', 'multiplier');
                                  handleDraftChange(emp.id, 'overtimeMultiplier', parseFloat(val));
                                }
                              }}
                              className="text-xs bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 font-semibold text-gray-700 cursor-pointer"
                            >
                              <option value="1.5">ساعة ونصف (1.5x)</option>
                              <option value="2">ساعتين (2.0x)</option>
                              <option value="1">ساعة بساعة (1.0x)</option>
                              <option value="1.25">ساعة وربع (1.25x)</option>
                              <option value="fixed">مبلغ ثابت للساعة</option>
                            </select>
                          </div>
                        </td>

                        {/* Base Hourly Rate (Editable) */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={state.baseHourlyRate}
                              onChange={(e) => handleDraftChange(emp.id, 'baseHourlyRate', parseFloat(e.target.value) || 0)}
                              className="w-14 bg-gray-50 border border-gray-300 rounded-lg px-1 py-0.5 text-xs font-mono font-bold text-gray-800 text-center"
                              title="أجر الساعة العادية"
                            />
                            <span className="text-[11px] text-gray-500">{currencySymbol}</span>
                          </div>
                        </td>

                        {/* Net Total Daily Earnings */}
                        <td className="py-2 px-3 text-left whitespace-nowrap">
                          <span className="font-mono font-black text-gray-900 text-xs sm:text-sm">
                            {metrics.totalPay.toLocaleString()} {currencySymbol}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <input
                            type="text"
                            placeholder="ملاحظات..."
                            value={state.notes}
                            onChange={(e) => handleDraftChange(emp.id, 'notes', e.target.value)}
                            className="w-28 sm:w-36 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-xs text-gray-700 placeholder-gray-400 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Table Footer Bar */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveDailySheet}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-2xs"
              >
                <Save className="w-4 h-4" />
                <span>حفظ واعتماد الكشف اليومي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY TIMESHEET & OVERTIME REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-3">
          {/* Monthly Filter Toolbar & Single-Line KPI Strip */}
          <div className="bg-white rounded-xl p-3 shadow-2xs border border-gray-200/90 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Month Selector */}
                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-bold text-gray-600">الشهر:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Employee Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <select
                    value={selectedEmployeeFilter}
                    onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">جميع العاملين والموظفين</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
                    ))}
                  </select>
                </div>

                {/* Department Filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <select
                    value={selectedDepartmentFilter}
                    onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">جميع الأقسام والورش</option>
                    <option value="tailoring_sewing">الخياطة والتفصيل</option>
                    <option value="cutting">الفصال والقص</option>
                    <option value="ironing_finishing">الكي والتشطيب</option>
                    <option value="design_patterns">الباترونات والتصميم</option>
                    <option value="sales_pos">الاستقبال والقياسات</option>
                  </select>
                </div>
              </div>

              {/* Actions: Transfer Overtime & Print */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTransferOvertime}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shadow-2xs"
                  title="ترحيل مستحقات الأوفرتايم لكشف وحوافز الرواتب"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>ترحيل الأوفرتايم للرواتب ({monthlyTotals.untransferredOvertimePay.toLocaleString()} {currencySymbol})</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition border border-gray-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة التقرير</span>
                </button>
              </div>
            </div>

            {/* Single-Line Monthly KPI Overview */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-2 px-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span>إجمالي السجلات:</span>
                <span className="font-bold text-gray-900 font-mono">{monthlyTotals.recordsCount}</span>
                <span className="text-gray-500 text-[11px]">سجل</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-slate-700">
                <span>الساعات الفعلية:</span>
                <span className="font-bold text-blue-700 font-mono">{monthlyTotals.totalWorkedHours}</span>
                <span className="text-gray-500 text-[11px]">ساعة</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-amber-800">
                <span>ساعات الأوفرتايم:</span>
                <span className="font-bold text-amber-900 font-mono">{monthlyTotals.totalOvertimeHours}</span>
                <span className="text-amber-700 text-[11px]">ساعة</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-amber-800">
                <span>مستحقات الأوفرتايم:</span>
                <span className="font-bold text-amber-900 font-mono">{monthlyTotals.totalOvertimePay.toLocaleString()}</span>
                <span className="text-amber-700 text-[11px]">{currencySymbol}</span>
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 text-indigo-900 mr-auto">
                <span>إجمالي أجر الدوام والإضافي:</span>
                <span className="font-bold text-indigo-950 font-mono">{monthlyTotals.totalEarnings.toLocaleString()}</span>
                <span className="text-indigo-700 text-[11px]">{currencySymbol}</span>
              </div>
            </div>
          </div>

          {/* Monthly Timesheet Records Table */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200/90 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                سجل الدوام اليومي التفصيلي لشهر {selectedMonth}
              </h3>
              <span className="text-xs text-gray-500">
                عرض {monthlyFilteredRecords.length} يوم عمل مسجل
              </span>
            </div>

            {monthlyFilteredRecords.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-bold text-base text-gray-700">لا توجد سجلات دوام مسجلة لهذا الشهر أو الفلتر المحدد</p>
                <p className="text-xs text-gray-400 mt-1">انتقل إلى تبويب "الكشف اليومي السريع" لتسجيل حضور اليوم وحفظه.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-700">
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">العامل</th>
                      <th className="py-3 px-3">الحالة</th>
                      <th className="py-3 px-3 text-center">الحضور - الانصراف</th>
                      <th className="py-3 px-3 text-center">الساعات الفعلية</th>
                      <th className="py-3 px-3 text-center">الأوفرتايم</th>
                      <th className="py-3 px-3 text-center">سعر الساعة</th>
                      <th className="py-3 px-3 text-center">أجر الأوفرتايم</th>
                      <th className="py-3 px-4 text-left">إجمالي اليوم ({currencySymbol})</th>
                      <th className="py-3 px-3 text-center">حالة الترحيل للرواتب</th>
                      <th className="py-3 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {monthlyFilteredRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-800 whitespace-nowrap text-xs">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap text-xs sm:text-sm">
                          {rec.employeeName}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            rec.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                            rec.status === 'absent' ? 'bg-red-100 text-red-800' :
                            rec.status === 'late' ? 'bg-amber-100 text-amber-800' :
                            rec.status === 'excused_leave' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {rec.status === 'present' ? 'حاضر' :
                             rec.status === 'absent' ? 'غائب' :
                             rec.status === 'late' ? 'متأخر' :
                             rec.status === 'excused_leave' ? 'إجازة' : 'نصف يوم'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-700">
                          {rec.hasSecondShift ? (
                            <div className="space-y-0.5 text-center text-[11px]">
                              <div className="text-purple-900 font-bold">
                                م1: {rec.shift1CheckInTime || rec.checkInTime || '08:00'} ➔ {rec.shift1CheckOutTime || '10:00'}
                                <span className="text-purple-600 font-normal mr-1">({rec.shift1WorkedHours ?? 2}س)</span>
                              </div>
                              {Boolean(rec.breakBetweenShiftsMinutes) && (
                                <div className="text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded text-[10px] inline-block font-sans">
                                  🚶 مشوار: {Math.floor((rec.breakBetweenShiftsMinutes || 0) / 60)} س {(rec.breakBetweenShiftsMinutes || 0) % 60 > 0 ? `${(rec.breakBetweenShiftsMinutes || 0) % 60} د` : ''}
                                </div>
                              )}
                              <div className="text-emerald-900 font-bold">
                                م2: {rec.shift2CheckInTime || '12:00'} ➔ {rec.shift2CheckOutTime || rec.checkOutTime || '16:00'}
                                <span className="text-emerald-600 font-normal mr-1">({rec.shift2WorkedHours ?? 4}س)</span>
                              </div>
                            </div>
                          ) : (
                            <span>{rec.checkInTime || '-'} ➔ {rec.checkOutTime || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-gray-800">
                          {rec.actualWorkedHours} س
                        </td>
                        <td className="py-3 px-3 text-center">
                          {rec.overtimeHours > 0 ? (
                            <span className="font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-xs">
                              +{rec.overtimeHours} س
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono text-xs">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-gray-700">
                          {rec.baseHourlyRate} {currencySymbol}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                          {rec.overtimePayEarned > 0 ? `${rec.overtimePayEarned} ${currencySymbol}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-black text-gray-900">
                          {rec.totalDailyEarnings.toLocaleString()} {currencySymbol}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {rec.isTransferredToPayroll ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3" /> تم الترحيل
                            </span>
                          ) : rec.overtimePayEarned > 0 ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              مستحق للترحيل
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف سجل دوام يوم ${rec.date} للعامل ${rec.employeeName}؟`)) {
                                deleteAttendanceRecord(rec.id);
                                showFeedback('تم حذف السجل بنجاح.', 'info');
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="حذف السجل"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WORK HOURS & OVERTIME POLICY SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <Settings className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  إعدادات وسياسات احتساب ساعات الدوام والأوفرتايم لكل عامل
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  حدد ساعات العمل الرسمية الافتراضية، مواعيد الحضور والانصراف، وطريقة احتساب الأوفرتايم (ساعة ونصف 1.5x أو ساعتين 2.0x أو مبلغ مقطوع)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map(emp => (
                <div key={emp.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{emp.name}</h4>
                      <span className="text-xs text-indigo-600 font-medium">{getDepartmentLabel(emp.department)}</span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-gray-200">
                      {emp.code}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Official Daily Hours */}
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        ساعات العمل الرسمية المطلوبة باليوم:
                      </label>
                      <input
                        type="number"
                        defaultValue={emp.officialDailyHours || 8}
                        onChange={(e) => updateEmployee(emp.id, { officialDailyHours: parseFloat(e.target.value) || 8 })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-mono font-bold text-gray-800 text-sm"
                        min="1"
                        max="24"
                        step="0.5"
                      />
                    </div>

                    {/* Official Start & End Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-600 font-semibold mb-1">الحضور الرسمي:</label>
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                          <input
                            type="time"
                            defaultValue={emp.officialStartTime || '08:00'}
                            id={`start-time-${emp.id}`}
                            onChange={(e) => updateEmployee(emp.id, { officialStartTime: e.target.value })}
                            className="w-full bg-transparent border-0 px-2 py-1 font-mono text-xs font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nowTime = getCurrentTimeString();
                              updateEmployee(emp.id, { officialStartTime: nowTime });
                              const el = document.getElementById(`start-time-${emp.id}`) as HTMLInputElement;
                              if (el) el.value = nowTime;
                              showFeedback(`تم تعيين وقت الحضور الرسمي لـ ${emp.name} إلى (${nowTime})`, 'info');
                            }}
                            className="px-1.5 py-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition border-r border-gray-200"
                            title="تعيين الوقت الحالي الآن"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-600 font-semibold mb-1">الانصراف الرسمي:</label>
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                          <input
                            type="time"
                            defaultValue={emp.officialEndTime || '16:00'}
                            id={`end-time-${emp.id}`}
                            onChange={(e) => updateEmployee(emp.id, { officialEndTime: e.target.value })}
                            className="w-full bg-transparent border-0 px-2 py-1 font-mono text-xs font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nowTime = getCurrentTimeString();
                              updateEmployee(emp.id, { officialEndTime: nowTime });
                              const el = document.getElementById(`end-time-${emp.id}`) as HTMLInputElement;
                              if (el) el.value = nowTime;
                              showFeedback(`تم تعيين وقت الانصراف الرسمي لـ ${emp.name} إلى (${nowTime})`, 'info');
                            }}
                            className="px-1.5 py-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition border-r border-gray-200"
                            title="تعيين الوقت الحالي الآن"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Split Shift Default Policy (نظام الدوام على مرحلتين / فترتين) */}
                    <div className="bg-white p-2.5 rounded-xl border border-gray-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={emp.defaultSplitShift || false}
                          onChange={(e) => updateEmployee(emp.id, { defaultSplitShift: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="font-bold text-gray-800 text-xs">نظام الدوام الافتراضي: على مرحلتين (خروج لمشوار)</span>
                      </label>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 text-[11px]">
                        <div>
                          <label className="block text-gray-500 mb-0.5">المرحلة 1 (حضور ➔ خروج):</label>
                          <div className="flex items-center gap-1 font-mono">
                            <input
                              type="time"
                              defaultValue={emp.defaultShift1StartTime || '08:00'}
                              onChange={(e) => updateEmployee(emp.id, { defaultShift1StartTime: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                            />
                            <span>➔</span>
                            <input
                              type="time"
                              defaultValue={emp.defaultShift1EndTime || '10:00'}
                              onChange={(e) => updateEmployee(emp.id, { defaultShift1EndTime: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-0.5">المرحلة 2 (عودة ➔ انصراف):</label>
                          <div className="flex items-center gap-1 font-mono">
                            <input
                              type="time"
                              defaultValue={emp.defaultShift2StartTime || '12:00'}
                              onChange={(e) => updateEmployee(emp.id, { defaultShift2StartTime: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                            />
                            <span>➔</span>
                            <input
                              type="time"
                              defaultValue={emp.defaultShift2EndTime || '16:00'}
                              onChange={(e) => updateEmployee(emp.id, { defaultShift2EndTime: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Default Break Minutes */}
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">مدة الاستراحة الإضافية (بالدقائق):</label>
                      <input
                        type="number"
                        defaultValue={emp.defaultBreakMinutes !== undefined ? emp.defaultBreakMinutes : 0}
                        onChange={(e) => updateEmployee(emp.id, { defaultBreakMinutes: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-mono font-bold text-xs"
                        min="0"
                        step="15"
                      />
                    </div>

                    {/* Overtime Policy */}
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">طريقة احتساب الساعة الإضافية (الأوفرتايم):</label>
                      <select
                        defaultValue={emp.overtimeMultiplier || 1.5}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val === -1) {
                            updateEmployee(emp.id, { overtimeMethod: 'fixed_rate' });
                          } else {
                            updateEmployee(emp.id, { overtimeMethod: 'multiplier', overtimeMultiplier: val });
                          }
                        }}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-semibold text-xs text-gray-800"
                      >
                        <option value="1.5">ساعة ونصف من أجر الساعة (1.5x / 150%)</option>
                        <option value="2.0">ساعتين من أجر الساعة (2.0x / 200%)</option>
                        <option value="1.0">ساعة بساعة (1.0x / 100%)</option>
                        <option value="1.25">ساعة وربع (1.25x / 125%)</option>
                        <option value="-1">مبلغ مالي ثابت ومحدد لكل ساعة إضافية</option>
                      </select>
                    </div>

                    {/* Custom Hourly Rate Override */}
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">
                        أجر الساعة المخصص (اختياري - يترك فارغاً للحساب من الراتب/اليومية):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder={`تلقائي: ${computeDefaultBaseHourlyRate(emp)}`}
                          defaultValue={emp.customHourlyRate || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateEmployee(emp.id, { customHourlyRate: isNaN(val) ? undefined : val });
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-xs font-bold"
                        />
                        <span className="text-gray-500 font-bold">{currencySymbol}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
