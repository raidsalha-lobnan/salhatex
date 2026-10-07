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
  Scissors,
  Footprints,
  Pencil,
  Copy,
  BookmarkCheck,
  Zap,
  Info,
  Sliders,
  FileText
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
    recalculateEmployeeAttendanceRecords,
    recalculateAllAttendanceRecords,
    setSelectedEmployeeForStatement,
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

  // Tab 3: Local drafts for Employee Policies & Settings
  const [policyDrafts, setPolicyDrafts] = useState<Record<string, Partial<Employee> & { isDirty?: boolean }>>({});
  const [policySearchQuery, setPolicySearchQuery] = useState<string>('');

  // Tab 2: Editing existing attendance record state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editModalDraft, setEditModalDraft] = useState<Partial<AttendanceRecord> | null>(null);

  // Notification / Toast state
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
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
      const raw = (emp.salaryAmount || 140) / hours;
      return emp.roundHourlyRateUp ? Math.ceil(raw * 10) / 10 : Number(raw.toFixed(2));
    }
    if (emp.salaryType === 'weekly') {
      const raw = (emp.salaryAmount || 850) / 6 / hours;
      return emp.roundHourlyRateUp ? Math.ceil(raw * 10) / 10 : Number(raw.toFixed(2));
    }
    // Monthly (salary / monthlyWorkDays / hours)
    const workDays = emp.monthlyWorkDays || 26;
    const raw = (emp.salaryAmount || 8000) / Math.max(1, workDays) / hours;
    return emp.roundHourlyRateUp ? Math.ceil(raw * 10) / 10 : Number(raw.toFixed(2));
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
      const s2Out = parseMinutes(draft.shift2CheckOutTime || draft.checkOutTime || '16:30');

      const s1Min = Math.max(0, s1Out - s1In);
      const s2Min = Math.max(0, s2Out - s2In);
      breakBetweenShiftsMinutes = Math.max(0, s2In - s1Out);

      shift1Hours = Number((s1Min / 60).toFixed(2));
      shift2Hours = Number((s2Min / 60).toFixed(2));

      // صافي دقائق العمل = المرحلة الأولى + المرحلة الثانية - الاستراحة الإضافية
      netMinutes = Math.max(0, (s1Min + s2Min) - (draft.breakMinutes || 0));
    } else {
      // الدوام المستمر المعتاد (حضور 8:00 وانصراف 16:30)
      const inMin = parseMinutes(draft.checkInTime || '08:00');
      const outMin = parseMinutes(draft.checkOutTime || '16:30');
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
      const isSecond = Boolean(saved.hasSecondShift);
      const actualCheckIn = isSecond
        ? (saved.shift1CheckInTime || saved.checkInTime || emp.officialStartTime || '08:00')
        : (saved.checkInTime || emp.officialStartTime || '08:00');
      const actualCheckOut = isSecond
        ? (saved.shift2CheckOutTime || saved.checkOutTime || emp.officialEndTime || '16:30')
        : (saved.checkOutTime || emp.officialEndTime || '16:30');

      return {
        status: saved.status,
        checkInTime: actualCheckIn,
        checkOutTime: actualCheckOut,
        breakMinutes: saved.breakMinutes !== undefined ? saved.breakMinutes : (emp.defaultBreakMinutes !== undefined ? emp.defaultBreakMinutes : 30),
        officialDailyHours: saved.officialDailyHours || emp.officialDailyHours || 8,
        baseHourlyRate: saved.baseHourlyRate || computeDefaultBaseHourlyRate(emp),
        overtimeMethod: saved.overtimeMethod || emp.overtimeMethod || 'multiplier',
        overtimeMultiplier: saved.overtimeMultiplier || emp.overtimeMultiplier || 1.5,
        overtimeRatePerHour: saved.overtimeRatePerHour || Number((computeDefaultBaseHourlyRate(emp) * (emp.overtimeMultiplier || 1.5)).toFixed(2)),
        notes: saved.notes || '',
        isDirty: false,
        hasSecondShift: isSecond,
        shift1CheckInTime: actualCheckIn,
        shift1CheckOutTime: saved.shift1CheckOutTime || '10:00',
        shift2CheckInTime: saved.shift2CheckInTime || '12:00',
        shift2CheckOutTime: actualCheckOut
      };
    }

    // Default for fresh day (المعتمد: الحضور 08:00 والانصراف 16:30 والمشوار مغلق افتراضياً مع خصم الاستراحة 30 دقيقة = 8 ساعات عمل صافية)
    const officialDailyHours = emp.officialDailyHours || 8;
    const baseHourlyRate = computeDefaultBaseHourlyRate(emp, officialDailyHours);
    const overtimeMultiplier = emp.overtimeMultiplier || 1.5;
    const overtimeMethod = emp.overtimeMethod || 'multiplier';
    const overtimeRatePerHour = emp.overtimeMethod === 'fixed_rate' && emp.customOvertimeRate
      ? emp.customOvertimeRate
      : Number((baseHourlyRate * overtimeMultiplier).toFixed(2));

    const defaultCheckIn = emp.officialStartTime || '08:00';
    const defaultCheckOut = emp.officialEndTime || '16:30';

    return {
      status: 'present' as AttendanceStatus,
      checkInTime: defaultCheckIn,
      checkOutTime: defaultCheckOut,
      breakMinutes: emp.defaultBreakMinutes !== undefined ? emp.defaultBreakMinutes : 30,
      officialDailyHours,
      baseHourlyRate,
      overtimeMethod,
      overtimeMultiplier,
      overtimeRatePerHour,
      notes: '',
      isDirty: false,
      hasSecondShift: Boolean(emp.defaultSplitShift),
      shift1CheckInTime: emp.defaultShift1StartTime || defaultCheckIn,
      shift1CheckOutTime: emp.defaultShift1EndTime || '10:00',
      shift2CheckInTime: emp.defaultShift2StartTime || '12:00',
      shift2CheckOutTime: emp.defaultShift2EndTime || defaultCheckOut
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

    // Keep check-in and check-out in sync with shift endpoints so they never overwrite with old defaults
    if (field === 'checkInTime') {
      updated.shift1CheckInTime = value;
    }
    if (field === 'checkOutTime') {
      updated.shift2CheckOutTime = value;
    }
    if (field === 'shift1CheckInTime') {
      updated.checkInTime = value;
    }
    if (field === 'shift2CheckOutTime') {
      updated.checkOutTime = value;
    }

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

  // Quick Action: Set Check-In (حضور الدوام 08:00 أو الوقت الحالي) for all active
  const handleSetAllCheckInNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          checkInTime: nowTime,
          shift1CheckInTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل حضور الدوام لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Set Final Check-Out (انصراف الدوام 16:30 أو الوقت الحالي) for all active
  const handleSetAllCheckOutNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          checkOutTime: nowTime,
          shift2CheckOutTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل انصراف الدوام لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Set Phase 1 Check-Out (خروج لمشوار) for all active who have errand active
  const handleSetAllShift1CheckOutNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          hasSecondShift: true,
          shift1CheckOutTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل خروج لمشوار لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Set Phase 2 Check-In (عودة من مشوار) for all active who have errand active
  const handleSetAllShift2CheckInNow = () => {
    const nowTime = getCurrentTimeString();
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          hasSecondShift: true,
          shift2CheckInTime: nowTime,
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(`تم تسجيل عودة من مشوار لجميع الحاضرين بالوقت الحالي (${nowTime})`, 'info');
  };

  // Quick Action: Toggle Errand (مشوار أثناء الدوام) for all active employees
  const handleToggleAllErrands = (enable: boolean) => {
    const newDrafts: typeof dailyDrafts = {};
    activeEmployees.forEach(emp => {
      const current = dailyDrafts[emp.id] || getEmployeeDailyState(emp);
      if (current.status !== 'absent' && current.status !== 'unpaid_leave' && current.status !== 'excused_leave') {
        newDrafts[emp.id] = {
          ...current,
          hasSecondShift: enable,
          shift1CheckInTime: current.shift1CheckInTime || current.checkInTime || '08:00',
          shift1CheckOutTime: current.shift1CheckOutTime || '10:00',
          shift2CheckInTime: current.shift2CheckInTime || '12:00',
          shift2CheckOutTime: current.shift2CheckOutTime || current.checkOutTime || '16:30',
          isDirty: true
        };
      }
    });
    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback(
      enable 
        ? 'تم تفعيل تسجيل مشوار أثناء الدوام لجميع الحاضرين' 
        : 'تم إغلاق المشوار للجميع والعودة للدوام المستمر المعتاد (08:00 - 16:30)', 
      'info'
    );
  };

  // Quick Action: Mark all active employees as Present with standard unified hours (08:00 - 16:30, errand closed)
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
        checkInTime: emp.officialStartTime || '08:00',
        checkOutTime: emp.officialEndTime || '16:30',
        breakMinutes: emp.defaultBreakMinutes !== undefined ? emp.defaultBreakMinutes : 30,
        officialDailyHours,
        baseHourlyRate,
        overtimeMethod,
        overtimeMultiplier,
        overtimeRatePerHour,
        notes: 'دوام رسمي موحد (08:00 - 16:30) مع استراحة 30 دقيقة',
        isDirty: true,
        hasSecondShift: false, // مغلق افتراضياً ويفعل عند الضغط على الأيقونة
        shift1CheckInTime: emp.officialStartTime || '08:00',
        shift1CheckOutTime: '10:00',
        shift2CheckInTime: '12:00',
        shift2CheckOutTime: emp.officialEndTime || '16:30'
      };
    });

    setDailyDrafts(prev => ({ ...prev, ...newDrafts }));
    showFeedback('تم ضبط الحضور للجميع (08:00 - 16:30) مع خصم 30 دقيقة استراحة (8 ساعات عمل صافية بدون أوفرتايم)!', 'info');
  };

  // Quick Action: Save entire daily sheet
  const handleSaveDailySheet = () => {
    const batchList: Array<Partial<AttendanceRecord> & { employeeId: string }> = [];

    activeEmployees.forEach(emp => {
      const state = getEmployeeDailyState(emp);
      const isSecond = Boolean(state.hasSecondShift);
      const effectiveCheckIn = state.checkInTime || (isSecond ? state.shift1CheckInTime : (emp.officialStartTime || '08:00'));
      const effectiveCheckOut = state.checkOutTime || (isSecond ? state.shift2CheckOutTime : (emp.officialEndTime || '16:30'));

      batchList.push({
        employeeId: emp.id,
        status: state.status,
        checkInTime: effectiveCheckIn,
        checkOutTime: effectiveCheckOut,
        breakMinutes: state.breakMinutes,
        hasSecondShift: isSecond,
        shift1CheckInTime: effectiveCheckIn,
        shift1CheckOutTime: isSecond ? state.shift1CheckOutTime : undefined,
        shift2CheckInTime: isSecond ? state.shift2CheckInTime : undefined,
        shift2CheckOutTime: effectiveCheckOut,
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

  // Quick Action: Save single employee row
  const handleSaveSingleRow = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const state = getEmployeeDailyState(emp);
    const isSecond = Boolean(state.hasSecondShift);
    const effectiveCheckIn = state.checkInTime || (isSecond ? state.shift1CheckInTime : (emp.officialStartTime || '08:00'));
    const effectiveCheckOut = state.checkOutTime || (isSecond ? state.shift2CheckOutTime : (emp.officialEndTime || '16:30'));

    saveDailyAttendanceBatch(selectedDate, [{
      employeeId: emp.id,
      status: state.status,
      checkInTime: effectiveCheckIn,
      checkOutTime: effectiveCheckOut,
      breakMinutes: state.breakMinutes,
      hasSecondShift: isSecond,
      shift1CheckInTime: effectiveCheckIn,
      shift1CheckOutTime: isSecond ? state.shift1CheckOutTime : undefined,
      shift2CheckInTime: isSecond ? state.shift2CheckInTime : undefined,
      shift2CheckOutTime: effectiveCheckOut,
      officialDailyHours: state.officialDailyHours,
      baseHourlyRate: state.baseHourlyRate,
      overtimeMethod: state.overtimeMethod,
      overtimeMultiplier: state.overtimeMultiplier,
      overtimeRatePerHour: state.overtimeRatePerHour,
      notes: state.notes
    }]);

    setDailyDrafts(prev => {
      const next = { ...prev };
      delete next[empId];
      return next;
    });

    showFeedback(`تم حفظ واعتماد دوام العامل "${emp.name}" ليوم (${selectedDate}) بنجاح!`, 'success');
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

  // Policy Drafts Helpers (Tab 3: إعدادات وسياسات احتساب ساعات الدوام والأوفرتايم)
  const getEmployeePolicyDraft = (emp: Employee) => {
    const draft = policyDrafts[emp.id];
    return {
      officialDailyHours: draft?.officialDailyHours ?? emp.officialDailyHours ?? 8,
      officialStartTime: draft?.officialStartTime ?? emp.officialStartTime ?? '08:00',
      officialEndTime: draft?.officialEndTime ?? emp.officialEndTime ?? '16:30',
      defaultBreakMinutes: draft?.defaultBreakMinutes ?? (emp.defaultBreakMinutes !== undefined ? emp.defaultBreakMinutes : 30),
      hourlyRateCalculation: draft?.hourlyRateCalculation ?? emp.hourlyRateCalculation ?? 'auto_from_salary',
      customHourlyRate: draft?.customHourlyRate ?? emp.customHourlyRate,
      overtimeMethod: draft?.overtimeMethod ?? emp.overtimeMethod ?? 'multiplier',
      overtimeMultiplier: draft?.overtimeMultiplier ?? emp.overtimeMultiplier ?? 1.5,
      customOvertimeRate: draft?.customOvertimeRate ?? emp.customOvertimeRate,
      defaultSplitShift: draft?.defaultSplitShift ?? emp.defaultSplitShift ?? false,
      defaultShift1StartTime: draft?.defaultShift1StartTime ?? emp.defaultShift1StartTime ?? '08:00',
      defaultShift1EndTime: draft?.defaultShift1EndTime ?? emp.defaultShift1EndTime ?? '10:00',
      defaultShift2StartTime: draft?.defaultShift2StartTime ?? emp.defaultShift2StartTime ?? '12:00',
      defaultShift2EndTime: draft?.defaultShift2EndTime ?? emp.defaultShift2EndTime ?? '16:30',
      deductLateMinutes: draft?.deductLateMinutes ?? emp.deductLateMinutes ?? false,
      isDirty: Boolean(draft?.isDirty)
    };
  };

  const handlePolicyDraftChange = (empId: string, field: string, value: any) => {
    setPolicyDrafts(prev => {
      const current = prev[empId] || {};
      return {
        ...prev,
        [empId]: {
          ...current,
          [field]: value,
          isDirty: true
        }
      };
    });
  };

  const handleSaveEmployeePolicy = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const draft = getEmployeePolicyDraft(emp);
    const updates: Partial<Employee> = {
      officialDailyHours: draft.officialDailyHours,
      officialStartTime: draft.officialStartTime,
      officialEndTime: draft.officialEndTime,
      defaultBreakMinutes: draft.defaultBreakMinutes,
      hourlyRateCalculation: draft.hourlyRateCalculation,
      customHourlyRate: draft.customHourlyRate,
      overtimeMethod: draft.overtimeMethod,
      overtimeMultiplier: draft.overtimeMultiplier,
      customOvertimeRate: draft.customOvertimeRate,
      defaultSplitShift: draft.defaultSplitShift,
      defaultShift1StartTime: draft.defaultShift1StartTime,
      defaultShift1EndTime: draft.defaultShift1EndTime,
      defaultShift2StartTime: draft.defaultShift2StartTime,
      defaultShift2EndTime: draft.defaultShift2EndTime,
      deductLateMinutes: draft.deductLateMinutes
    };

    // 1. Update in context
    updateEmployee(empId, updates);

    // 2. Mark local draft as clean
    setPolicyDrafts(prev => ({
      ...prev,
      [empId]: { ...draft, isDirty: false }
    }));

    // 3. Update daily draft if loaded
    setDailyDrafts(prev => {
      if (!prev[empId]) return prev;
      const updatedEmp = { ...emp, ...updates };
      const cur = prev[empId];
      const baseHourlyRate = updates.customHourlyRate && updates.customHourlyRate > 0
        ? updates.customHourlyRate
        : computeDefaultBaseHourlyRate(updatedEmp, updates.officialDailyHours || 8);
      const overtimeMultiplier = updates.overtimeMultiplier || 1.5;
      const overtimeMethod = updates.overtimeMethod || 'multiplier';
      const overtimeRatePerHour = overtimeMethod === 'fixed_rate' && updates.customOvertimeRate
        ? updates.customOvertimeRate
        : Number((baseHourlyRate * overtimeMultiplier).toFixed(2));

      return {
        ...prev,
        [empId]: {
          ...cur,
          checkInTime: updates.officialStartTime || cur.checkInTime,
          checkOutTime: updates.officialEndTime || cur.checkOutTime,
          breakMinutes: updates.defaultBreakMinutes !== undefined ? updates.defaultBreakMinutes : cur.breakMinutes,
          officialDailyHours: updates.officialDailyHours || 8,
          baseHourlyRate,
          overtimeMethod,
          overtimeMultiplier,
          overtimeRatePerHour,
          isDirty: true
        }
      };
    });

    // 4. Automatically recalculate all records for this employee
    const res = recalculateEmployeeAttendanceRecords(empId);

    showFeedback(
      `تم حفظ وتثبيت إعدادات وسياسات الدوام والأوفرتايم لـ "${emp.name}" بنجاح! وتم تطبيقها فوراً على كافة سجلات الحضور (${res.updated} سجل).`,
      'success'
    );
  };

  const handleApplyPolicyToRecords = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const res = recalculateEmployeeAttendanceRecords(empId);
    showFeedback(
      `تمت إعادة احتساب وتطبيق السياسة المحفوظة فوراً لـ "${emp.name}" على كافة سجلات الحضور (${res.updated} سجل).`,
      'success'
    );
  };

  const handleSaveAllEmployeePolicies = () => {
    let savedCount = 0;
    employees.forEach(emp => {
      const draft = policyDrafts[emp.id];
      if (draft && draft.isDirty) {
        const updates = { ...draft };
        delete (updates as any).isDirty;
        updateEmployee(emp.id, updates);
        savedCount++;
      }
    });

    setPolicyDrafts(prev => {
      const next: Record<string, any> = {};
      Object.keys(prev).forEach(id => {
        next[id] = { ...prev[id], isDirty: false };
      });
      return next;
    });

    const res = recalculateAllAttendanceRecords();
    showFeedback(
      `تم حفظ إعدادات جميع العمال بنجاح (${savedCount || 'الجميع'})، وتطبيقها تلقائياً على كافة سجلات الحضور (${res.updated} سجل تم تحديثه).`,
      'success'
    );
  };

  const handleApplyStandardPresetToAll = () => {
    if (!confirm('هل ترغب بتطبيق السياسة القياسية (الحضور 08:00، الانصراف 16:30، استراحة 30 دقيقة تخصم من الدوام = 8 ساعات عمل صافية، أوفرتايم 1.5x) وحفظها لكافة العمال؟')) return;

    employees.forEach(emp => {
      updateEmployee(emp.id, {
        officialDailyHours: 8,
        officialStartTime: '08:00',
        officialEndTime: '16:30',
        defaultBreakMinutes: 30,
        hourlyRateCalculation: 'auto_from_salary',
        overtimeMethod: 'multiplier',
        overtimeMultiplier: 1.5,
        defaultSplitShift: false
      });
    });

    setPolicyDrafts({});
    const res = recalculateAllAttendanceRecords();
    showFeedback(`تم تطبيق السياسة القياسية الموحدة (08:00 - 16:30 مع استراحة 30 د) وحفظها لكافة العمال بنجاح (${res.updated} سجل تم تحديثه).`, 'success');
  };

  const handleCopyPolicyToAll = (sourceEmp: Employee) => {
    const sourceDraft = getEmployeePolicyDraft(sourceEmp);
    if (!confirm(`هل ترغب بنسخ سياسة الدوام والأوفرتايم الخاصة بالعامل "${sourceEmp.name}" وتعميمها على باقي العمال؟`)) return;

    employees.forEach(emp => {
      if (emp.id !== sourceEmp.id) {
        updateEmployee(emp.id, {
          officialDailyHours: sourceDraft.officialDailyHours,
          officialStartTime: sourceDraft.officialStartTime,
          officialEndTime: sourceDraft.officialEndTime,
          defaultBreakMinutes: sourceDraft.defaultBreakMinutes,
          overtimeMethod: sourceDraft.overtimeMethod,
          overtimeMultiplier: sourceDraft.overtimeMultiplier,
          customOvertimeRate: sourceDraft.customOvertimeRate,
          defaultSplitShift: sourceDraft.defaultSplitShift,
          defaultShift1StartTime: sourceDraft.defaultShift1StartTime,
          defaultShift1EndTime: sourceDraft.defaultShift1EndTime,
          defaultShift2StartTime: sourceDraft.defaultShift2StartTime,
          defaultShift2EndTime: sourceDraft.defaultShift2EndTime,
          deductLateMinutes: sourceDraft.deductLateMinutes
        });
      }
    });

    setPolicyDrafts({});
    const res = recalculateAllAttendanceRecords();
    showFeedback(`تم نسخ سياسة "${sourceEmp.name}" وتطبيقها على جميع العمال بنجاح (${res.updated} سجل تم تحديثه).`, 'success');
  };

  // Monthly Record Editing Save Handler (Tab 2)
  const handleSaveEditedRecord = () => {
    if (!editingRecord || !editModalDraft) return;
    const isSecond = Boolean(editModalDraft.hasSecondShift);
    const finalCheckIn = isSecond
      ? (editModalDraft.shift1CheckInTime || editModalDraft.checkInTime || '08:00')
      : (editModalDraft.checkInTime || '08:00');
    const finalCheckOut = isSecond
      ? (editModalDraft.shift2CheckOutTime || editModalDraft.checkOutTime || '16:30')
      : (editModalDraft.checkOutTime || '16:30');

    updateAttendanceRecord(editingRecord.id, {
      ...editModalDraft,
      checkInTime: finalCheckIn,
      checkOutTime: finalCheckOut,
      hasSecondShift: isSecond,
      shift1CheckInTime: finalCheckIn,
      shift1CheckOutTime: isSecond ? editModalDraft.shift1CheckOutTime : undefined,
      shift2CheckInTime: isSecond ? editModalDraft.shift2CheckInTime : undefined,
      shift2CheckOutTime: finalCheckOut,
      breakMinutes: editModalDraft.breakMinutes
    });
    showFeedback(`تم تحديث سجل الدوام ليوم ${editingRecord.date} للعامل "${editingRecord.employeeName}" وتطبيق السياسة المحفوظة بنجاح!`, 'success');
    setEditingRecord(null);
    setEditModalDraft(null);
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
                  title="تحضير جميع العمال بالدوام الموحد (الحضور 08:00 والانصراف 16:30) وبدون مشوار"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تحضير موحد للجميع (08:00 - 16:30)</span>
                </button>

                {/* Batch Errand Toggle Buttons */}
                <button
                  type="button"
                  onClick={() => handleToggleAllErrands(true)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-900 text-xs font-semibold rounded-lg transition cursor-pointer"
                  title="فتح وتفعيل تسجيل مشوار لجميع العمال الحاضرين اليوم"
                >
                  <Footprints className="w-3.5 h-3.5 text-purple-600" />
                  <span>تفعيل مشوار للجميع</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleAllErrands(false)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                  title="إغلاق المشوار لجميع العمال والعودة للدوام المستمر (08:00 - 16:30)"
                >
                  <span>إغلاق المشوار للجميع</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDailySheet}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
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
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  كشف التحضير وتفاصيل الساعات ليوم {selectedDate} ({activeEmployees.length} عامل)
                </h3>
              </div>
              <span className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                الدوام المعتمد: الحضور 08:00 • الانصراف 16:30 • المشوار مغلق افتراضياً ويفعل بالنقر على أيقونة المشوار 🚶 بجانب العامل
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase">
                    <th className="py-2.5 px-3 whitespace-nowrap">اسم العامل</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">حالة الدوام</th>
                    
                    {/* Stage 1: Check In */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-blue-50/50">
                      <div className="flex items-center justify-center gap-1">
                        <span>الحضور (08:00)</span>
                        <button
                          type="button"
                          onClick={handleSetAllCheckInNow}
                          className="p-1 rounded text-gray-400 hover:text-blue-700 hover:bg-white transition cursor-pointer"
                          title="تعيين الوقت الحالي لحضور الجميع الآن"
                        >
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      </div>
                    </th>

                    {/* Mid-day Errand Column (الانصراف والحضور أثناء الدوام) */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-purple-50/40">
                      <div className="flex items-center justify-center gap-1.5">
                        <Footprints className="w-3.5 h-3.5 text-purple-600" />
                        <span>مشوار أثناء الدوام</span>
                        <span className="text-[10px] text-purple-700 font-normal bg-purple-100/70 px-1 rounded">
                          (مغلق افتراضياً)
                        </span>
                      </div>
                    </th>

                    {/* Stage 2: Final Check Out */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-emerald-50/50">
                      <div className="flex items-center justify-center gap-1">
                        <span>الانصراف (16:30)</span>
                        <button
                          type="button"
                          onClick={handleSetAllCheckOutNow}
                          className="p-1 rounded text-gray-400 hover:text-emerald-700 hover:bg-white transition cursor-pointer"
                          title="تعيين الوقت الحالي لانصراف الجميع الآن"
                        >
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </th>

                    <th className="py-2.5 px-2 text-center whitespace-nowrap">المشوار (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap bg-amber-50/40 text-amber-950 font-bold" title="وقت الاستراحة بالدقائق (يخصم من إجمالي ساعات الدوام)">
                      <div className="flex items-center justify-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-amber-700" />
                        <span>الاستراحة (د)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">الرسمية (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap font-bold text-gray-900">الفعلية (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">الأوفرتايم (س)</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">طريقة الإضافي</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">أجر الساعة</th>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">صافي اليوم ({currencySymbol})</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ملاحظات</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap bg-indigo-50/40 text-indigo-900">حفظ السجل</th>
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

                        {/* Check In: حضور الدوام (08:00) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-blue-50/20">
                          <div className={`inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-2xs hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 ${
                            isOff ? 'opacity-40 pointer-events-none' : ''
                          }`}>
                            <input
                              type="time"
                              disabled={isOff}
                              value={state.hasSecondShift ? state.shift1CheckInTime : state.checkInTime}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleDraftChange(emp.id, 'checkInTime', val);
                                if (state.hasSecondShift) {
                                  handleDraftChange(emp.id, 'shift1CheckInTime', val);
                                }
                              }}
                              className="bg-transparent border-0 px-2 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isOff}
                              onClick={() => {
                                const nowTime = getCurrentTimeString();
                                handleDraftChange(emp.id, 'checkInTime', nowTime);
                                if (state.hasSecondShift) {
                                  handleDraftChange(emp.id, 'shift1CheckInTime', nowTime);
                                }
                                showFeedback(`تم تعيين وقت حضور ${emp.name} إلى (${nowTime})`, 'info');
                              }}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition border-r border-gray-200 cursor-pointer"
                              title="تعيين الوقت الحالي (حضور)"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Mid-day Errand Column (الانصراف والحضور أثناء الدوام: مغلق افتراضياً ويفعل بالنقر على الأيقونة) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-purple-50/20">
                          {!state.hasSecondShift ? (
                            /* الحالة المغلقة (الافتراضية) */
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                disabled={isOff}
                                onClick={() => {
                                  handleDraftChange(emp.id, 'hasSecondShift', true);
                                  if (!state.shift1CheckInTime) {
                                    handleDraftChange(emp.id, 'shift1CheckInTime', state.checkInTime || '08:00');
                                  }
                                  if (!state.shift1CheckOutTime) {
                                    handleDraftChange(emp.id, 'shift1CheckOutTime', '10:00');
                                  }
                                  if (!state.shift2CheckInTime) {
                                    handleDraftChange(emp.id, 'shift2CheckInTime', '12:00');
                                  }
                                  if (!state.shift2CheckOutTime) {
                                    handleDraftChange(emp.id, 'shift2CheckOutTime', state.checkOutTime || '16:30');
                                  }
                                  showFeedback(`تم تفعيل تسجيل مشوار أثناء الدوام لـ ${emp.name}`, 'info');
                                }}
                                className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300 transition shadow-2xs cursor-pointer ${
                                  isOff ? 'opacity-40 pointer-events-none' : ''
                                }`}
                                title="مشوار أثناء الدوام مغلق — اضغط على هذه الأيقونة لتفعيل تسجيل خروج وعودة لمشوار"
                              >
                                <Footprints className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600 transition" />
                                <span className="text-[11px] font-semibold text-gray-500 group-hover:text-purple-800">
                                  مغلق (بدون مشوار)
                                </span>
                                <span className="text-[10px] bg-gray-100 group-hover:bg-purple-100 text-gray-600 group-hover:text-purple-700 px-1 py-0.2 rounded font-bold transition">
                                  + تفعيل
                                </span>
                              </button>
                            </div>
                          ) : (
                            /* الحالة المفعلة عند الضغط على الأيقونة */
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                              {/* زر الأيقونة لإغلاق المشوار */}
                              <button
                                type="button"
                                disabled={isOff}
                                onClick={() => {
                                  handleDraftChange(emp.id, 'hasSecondShift', false);
                                  showFeedback(`تم إغلاق المشوار لـ ${emp.name} والعودة للدوام المستمر (08:00 - 16:30)`, 'info');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-purple-300 bg-purple-100 text-purple-900 hover:bg-purple-200 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                title="انقر هنا لإغلاق المشوار والعودة للدوام المستمر"
                              >
                                <Footprints className="w-3 h-3 text-purple-700" />
                                <span>مشوار مفعّل</span>
                                <span className="text-purple-600 font-normal">✕ إغلاق</span>
                              </button>

                              {/* خروج لمشوار */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-purple-700">خروج:</span>
                                <div className="inline-flex items-center bg-white border border-purple-300 rounded overflow-hidden shadow-2xs">
                                  <input
                                    type="time"
                                    disabled={isOff}
                                    value={state.shift1CheckOutTime}
                                    onChange={(e) => handleDraftChange(emp.id, 'shift1CheckOutTime', e.target.value)}
                                    className="bg-transparent border-0 px-1 py-0.2 text-[11px] font-mono font-bold text-gray-800 text-center focus:outline-none w-16"
                                  />
                                  <button
                                    type="button"
                                    disabled={isOff}
                                    onClick={() => {
                                      const nowTime = getCurrentTimeString();
                                      handleDraftChange(emp.id, 'shift1CheckOutTime', nowTime);
                                      showFeedback(`تم تعيين وقت خروج مشوار ${emp.name} إلى (${nowTime})`, 'info');
                                    }}
                                    className="px-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition border-r border-purple-200 cursor-pointer"
                                    title="تعيين الوقت الحالي (خروج لمشوار)"
                                  >
                                    <Clock className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* عودة من مشوار */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-700">عودة:</span>
                                <div className="inline-flex items-center bg-white border border-emerald-300 rounded overflow-hidden shadow-2xs">
                                  <input
                                    type="time"
                                    disabled={isOff}
                                    value={state.shift2CheckInTime}
                                    onChange={(e) => handleDraftChange(emp.id, 'shift2CheckInTime', e.target.value)}
                                    className="bg-transparent border-0 px-1 py-0.2 text-[11px] font-mono font-bold text-gray-800 text-center focus:outline-none w-16"
                                  />
                                  <button
                                    type="button"
                                    disabled={isOff}
                                    onClick={() => {
                                      const nowTime = getCurrentTimeString();
                                      handleDraftChange(emp.id, 'shift2CheckInTime', nowTime);
                                      showFeedback(`تم تعيين وقت عودة مشوار ${emp.name} إلى (${nowTime})`, 'info');
                                    }}
                                    className="px-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition border-r border-emerald-200 cursor-pointer"
                                    title="تعيين الوقت الحالي (عودة من مشوار)"
                                  >
                                    <Clock className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Check Out: انصراف الدوام (16:30) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-emerald-50/20">
                          <div className={`inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-2xs hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500 ${
                            isOff ? 'opacity-40 pointer-events-none' : ''
                          }`}>
                            <input
                              type="time"
                              disabled={isOff}
                              value={state.hasSecondShift ? state.shift2CheckOutTime : state.checkOutTime}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleDraftChange(emp.id, 'checkOutTime', val);
                                if (state.hasSecondShift) {
                                  handleDraftChange(emp.id, 'shift2CheckOutTime', val);
                                }
                              }}
                              className="bg-transparent border-0 px-2 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={isOff}
                              onClick={() => {
                                const nowTime = getCurrentTimeString();
                                handleDraftChange(emp.id, 'checkOutTime', nowTime);
                                if (state.hasSecondShift) {
                                  handleDraftChange(emp.id, 'shift2CheckOutTime', nowTime);
                                }
                                showFeedback(`تم تعيين وقت انصراف ${emp.name} إلى (${nowTime})`, 'info');
                              }}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition border-r border-gray-200 cursor-pointer"
                              title="تعيين الوقت الحالي (انصراف)"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Errand Duration (مدة المشوار محسوبة) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {!isOff && state.hasSecondShift && metrics.breakBetweenShiftsMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-purple-800 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded text-xs" title={`من ${state.shift1CheckOutTime} إلى ${state.shift2CheckInTime}`}>
                              {Number((metrics.breakBetweenShiftsMinutes / 60).toFixed(1))} س
                            </span>
                          ) : (
                            <span className="text-gray-300 font-mono text-xs">-</span>
                          )}
                        </td>

                        {/* Break Time (وقت الاستراحة يخصم من ساعات الدوام) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap bg-amber-50/20">
                          <div className={`inline-flex items-center justify-center gap-1 ${isOff ? 'opacity-40 pointer-events-none' : ''}`}>
                            <input
                              type="number"
                              disabled={isOff}
                              value={state.breakMinutes}
                              onChange={(e) => handleDraftChange(emp.id, 'breakMinutes', Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-12 bg-white border border-amber-300 rounded-lg px-1 py-0.5 text-xs font-mono font-bold text-gray-800 text-center focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                              min="0"
                              step="5"
                              title={`وقت الاستراحة المخصوم: ${state.breakMinutes} دقيقة`}
                            />
                            <span className="text-[10px] text-gray-500 font-bold">د</span>
                          </div>
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
                            <div className="text-[10px] text-gray-500 font-mono">
                              {state.breakMinutes > 0 && (
                                <span className="text-amber-700 font-semibold" title={`خصم استراحة: ${state.breakMinutes} دقيقة`}>
                                  (-{state.breakMinutes}د)
                                </span>
                              )}
                              {state.hasSecondShift && ` (${metrics.shift1Hours}+${metrics.shift2Hours})`}
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

                        {/* Individual Save Action */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSaveSingleRow(emp.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                              state.isDirty
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 ring-offset-1 animate-pulse'
                                : 'bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 border border-gray-200'
                            }`}
                            title="حفظ واعتماد هذا السجل للعامل مباشرة وتطبيق إعدادات احتساب الدوام"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{state.isDirty ? 'حفظ *' : 'حفظ'}</span>
                          </button>
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
                  onClick={() => {
                    const res = recalculateAllAttendanceRecords();
                    showFeedback(`تمت إعادة احتساب وتطبيق السياسات المحفوظة بنجاح على ${res.updated} سجل حضور.`, 'success');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition"
                  title="إعادة احتساب وتطبيق السياسات المحفوظة لكافة العمال على جميع سجلات الحضور"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تطبيق السياسات المحفوظة على السجلات</span>
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
                                م2: {rec.shift2CheckInTime || '12:00'} ➔ {rec.shift2CheckOutTime || rec.checkOutTime || '16:30'}
                                <span className="text-emerald-600 font-normal mr-1">({rec.shift2WorkedHours ?? 4.5}س)</span>
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const emp = employees.find(e => e.id === rec.employeeId);
                                if (emp) {
                                  setSelectedEmployeeForStatement(emp);
                                }
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                              title="عرض كشف الحساب التفصيلي واحتساب الراتب بناء على ساعات الحضور"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(rec);
                                setEditModalDraft({
                                  status: rec.status,
                                  checkInTime: rec.checkInTime || '08:00',
                                  checkOutTime: rec.checkOutTime || '16:30',
                                  hasSecondShift: Boolean(rec.hasSecondShift),
                                  shift1CheckInTime: rec.shift1CheckInTime || rec.checkInTime || '08:00',
                                  shift1CheckOutTime: rec.shift1CheckOutTime || '10:00',
                                  shift2CheckInTime: rec.shift2CheckInTime || '12:00',
                                  shift2CheckOutTime: rec.shift2CheckOutTime || rec.checkOutTime || '16:30',
                                  breakMinutes: rec.breakMinutes !== undefined ? rec.breakMinutes : (employees.find(e => e.id === rec.employeeId)?.defaultBreakMinutes ?? 30),
                                  notes: rec.notes || ''
                                });
                              }}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                              title="تعديل سجل الدوام وتطبيق السياسة المحفوظة"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف سجل دوام يوم ${rec.date} للعامل ${rec.employeeName}؟`)) {
                                  deleteAttendanceRecord(rec.id);
                                  showFeedback('تم حذف السجل بنجاح.', 'info');
                                }
                              }}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                              title="حذف السجل"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
            {/* Header & Main Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <Settings className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    إعدادات وسياسات احتساب ساعات الدوام والأوفرتايم لكل عامل
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    حدد ساعات العمل الرسمية، مواعيد الحضور (08:00) والانصراف (16:30)، وطريقة احتساب الأوفرتايم (ساعة ونصف 1.5x أو ساعتين 2.0x أو مبلغ مقطوع). احفظ الإعدادات لتطبيقها تلقائياً على أي إدخال أو تعديل لحضور العامل.
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAllEmployeePolicies}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-2xs"
                  title="حفظ كافة الإعدادات والسياسات المعدلة لجميع العمال دفعة واحدة"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ إعدادات كافة العمال</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const res = recalculateAllAttendanceRecords();
                    showFeedback(`تمت إعادة احتساب وتطبيق السياسات المحفوظة لكافة العمال بنجاح على ${res.updated} سجل حضور.`, 'success');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition shadow-2xs"
                  title="إعادة احتساب وتطبيق السياسات المحفوظة على كافة سجلات الحضور السابقة والجديدة لجميع العمال"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>تطبيق السياسات على كافة سجلات الحضور</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyStandardPresetToAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold text-xs border border-gray-300 transition"
                  title="تعميم السياسة القياسية (08:00 إلى 16:30 وأوفرتايم 1.5x) على الجميع"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>تعميم المواعيد القياسية (08:00 - 16:30)</span>
                </button>
              </div>
            </div>

            {/* Notification Banner about Auto-Apply */}
            <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-950 font-medium">
                <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>
                  <strong>تطبيق تلقائي فوري:</strong> عند حفظ إعدادات أي عامل بواسطة أيقونة الحفظ 💾، يتم اعتمادها وتطبيقها تلقائياً على أي إدخال يومي جديد، وأي تعديل على أيام الحضور للعامل، مع تحديث كافة السجلات السابقة والجديدة.
                </span>
              </div>
            </div>

            {/* Filter / Search within Settings */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث عن عامل بالاسم أو الرقم الوظيفي..."
                  value={policySearchQuery}
                  onChange={(e) => setPolicySearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-9 pl-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Employee Policy Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees
                .filter(emp => {
                  if (!policySearchQuery.trim()) return true;
                  const q = policySearchQuery.toLowerCase();
                  return emp.name.toLowerCase().includes(q) || (emp.code && emp.code.toLowerCase().includes(q));
                })
                .map(emp => {
                  const draft = getEmployeePolicyDraft(emp);
                  const officialDailyHours = draft.officialDailyHours || 8;
                  const baseHourlyRate = draft.hourlyRateCalculation === 'fixed_custom' && draft.customHourlyRate && draft.customHourlyRate > 0
                    ? draft.customHourlyRate
                    : computeDefaultBaseHourlyRate(emp, officialDailyHours);
                  
                  let effectiveOvertimeRate = 0;
                  if (draft.overtimeMethod === 'fixed_rate' && draft.customOvertimeRate && draft.customOvertimeRate > 0) {
                    effectiveOvertimeRate = draft.customOvertimeRate;
                  } else {
                    effectiveOvertimeRate = Number((baseHourlyRate * (draft.overtimeMultiplier || 1.5)).toFixed(2));
                  }

                  return (
                    <div
                      key={emp.id}
                      className={`rounded-2xl border transition-all space-y-4 p-5 ${
                        draft.isDirty
                          ? 'bg-amber-50/30 border-amber-300 ring-2 ring-amber-200 shadow-md'
                          : 'bg-gray-50/70 border-gray-200 shadow-2xs hover:shadow-sm'
                      }`}
                    >
                      {/* Worker Header Card */}
                      <div className="flex items-start justify-between border-b border-gray-200 pb-3 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-gray-900 text-sm">{emp.name}</h4>
                            <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
                              {emp.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-indigo-600 font-semibold">{getDepartmentLabel(emp.department)}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[11px] text-gray-500 font-medium">
                              {emp.salaryType === 'daily'
                                ? `يومي: ${emp.salaryAmount} ${currencySymbol}`
                                : emp.salaryType === 'weekly'
                                ? `أسبوعي: ${emp.salaryAmount} ${currencySymbol}`
                                : `شهري: ${emp.salaryAmount} ${currencySymbol}`}
                            </span>
                          </div>
                        </div>

                        {/* Top Actions: Save Icon & Batch Recompute */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApplyPolicyToRecords(emp.id)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-gray-200 transition"
                            title="إعادة احتساب وتطبيق السياسة المحفوظة فوراً على سجلات الحضور السابقة والجديدة لهذا العامل"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPolicyToAll(emp)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-gray-200 transition"
                            title="نسخ وتعميم هذه السياسة على كافة العمال الآخرين"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEmployeePolicy(emp.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs ${
                              draft.isDirty
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 ring-offset-1 animate-pulse'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                            title="حفظ الإعدادات وتطبيقها تلقائياً على أي إدخال أو تعديل لحضور هذا العامل"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{draft.isDirty ? 'حفظ السياسة *' : 'حفظ'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Status indicator badge */}
                      <div className="flex items-center justify-between text-[11px]">
                        {draft.isDirty ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            يوجد تعديلات غير محفوظة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <BookmarkCheck className="w-3 h-3 text-emerald-600" />
                            السياسة محفوظة ومطبقة تلقائياً
                          </span>
                        )}
                        <span className="text-gray-400 font-mono text-[10px]">
                          الساعة: {baseHourlyRate} {currencySymbol} | الإضافي: {effectiveOvertimeRate} {currencySymbol}
                        </span>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        {/* 1. Official Daily Hours & Schedule */}
                        <div>
                          <label className="block text-gray-800 font-bold mb-1">
                            ساعات العمل الرسمية اليومية المطلوبة:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={draft.officialDailyHours}
                              onChange={(e) => handlePolicyDraftChange(emp.id, 'officialDailyHours', parseFloat(e.target.value) || 8)}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-mono font-bold text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500"
                              min="1"
                              max="24"
                              step="0.5"
                            />
                            <span className="text-gray-500 font-bold shrink-0 text-xs">ساعات / يوم</span>
                          </div>
                        </div>

                        {/* 2. Official Shift Start & End Time */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-gray-700 font-semibold mb-1">الحضور الرسمي:</label>
                            <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                              <input
                                type="time"
                                value={draft.officialStartTime}
                                id={`start-time-${emp.id}`}
                                onChange={(e) => handlePolicyDraftChange(emp.id, 'officialStartTime', e.target.value)}
                                className="w-full bg-transparent border-0 px-2 py-1 font-mono text-xs font-bold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nowTime = getCurrentTimeString();
                                  handlePolicyDraftChange(emp.id, 'officialStartTime', nowTime);
                                  showFeedback(`تم ضبط وقت الحضور الرسمي لـ "${emp.name}" إلى (${nowTime})`, 'info');
                                }}
                                className="px-1.5 py-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition border-r border-gray-200"
                                title="تعيين الوقت الحالي الآن"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-gray-700 font-semibold mb-1">الانصراف الرسمي:</label>
                            <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                              <input
                                type="time"
                                value={draft.officialEndTime}
                                id={`end-time-${emp.id}`}
                                onChange={(e) => handlePolicyDraftChange(emp.id, 'officialEndTime', e.target.value)}
                                className="w-full bg-transparent border-0 px-2 py-1 font-mono text-xs font-bold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nowTime = getCurrentTimeString();
                                  handlePolicyDraftChange(emp.id, 'officialEndTime', nowTime);
                                  showFeedback(`تم ضبط وقت الانصراف الرسمي لـ "${emp.name}" إلى (${nowTime})`, 'info');
                                }}
                                className="px-1.5 py-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition border-r border-gray-200"
                                title="تعيين الوقت الحالي الآن"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Shift Span Indicator */}
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg px-2.5 py-1 text-[11px] text-indigo-900 flex items-center justify-between font-mono">
                          <span>⏱️ الدوام المعتمد: {draft.officialStartTime} ➔ {draft.officialEndTime}</span>
                          <span className="font-bold">المطلوب: {draft.officialDailyHours} س</span>
                        </div>

                        {/* 3. Overtime Policy */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                          <label className="block text-gray-800 font-bold">
                            طريقة وسياسة احتساب ساعات الأوفرتايم (الإضافي):
                          </label>
                          <select
                            value={draft.overtimeMethod === 'fixed_rate' ? 'fixed_rate' : String(draft.overtimeMultiplier || 1.5)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'fixed_rate') {
                                handlePolicyDraftChange(emp.id, 'overtimeMethod', 'fixed_rate');
                              } else {
                                handlePolicyDraftChange(emp.id, 'overtimeMethod', 'multiplier');
                                handlePolicyDraftChange(emp.id, 'overtimeMultiplier', parseFloat(val) || 1.5);
                              }
                            }}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-xs text-gray-800 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="1.5">ساعة ونصف (1.5x / 150%) - المعتمد والشائع</option>
                            <option value="2.0">ساعتان (2.0x / 200%) - مضاعف كامل</option>
                            <option value="1.0">ساعة بساعة (1.0x / 100%) - بدون زيادة</option>
                            <option value="1.25">ساعة وربع (1.25x / 125%)</option>
                            <option value="fixed_rate">أجر مقطوع محدد لكل ساعة أوفرتايم</option>
                          </select>

                          {/* Fixed rate input if selected */}
                          {draft.overtimeMethod === 'fixed_rate' && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[11px] text-gray-600 font-bold shrink-0">أجر الساعة الإضافية:</span>
                              <input
                                type="number"
                                value={draft.customOvertimeRate || ''}
                                placeholder="مثلاً: 25"
                                onChange={(e) => handlePolicyDraftChange(emp.id, 'customOvertimeRate', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 font-mono text-xs font-bold text-amber-700"
                              />
                              <span className="text-gray-500 font-bold">{currencySymbol} / س</span>
                            </div>
                          )}

                          {/* Effective Overtime Result Banner */}
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between text-[11px] text-amber-900 font-bold">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-600" />
                              أجر ساعة الأوفرتايم المعتمد:
                            </span>
                            <span className="font-mono text-xs text-amber-800">
                              {effectiveOvertimeRate} {currencySymbol} / ساعة
                            </span>
                          </div>
                        </div>

                        {/* 4. Base Hourly Rate Configuration */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                          <label className="block text-gray-800 font-bold">
                            أجر الساعة العادية:
                          </label>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`rate-calc-${emp.id}`}
                                checked={draft.hourlyRateCalculation !== 'fixed_custom'}
                                onChange={() => {
                                  handlePolicyDraftChange(emp.id, 'hourlyRateCalculation', 'auto_from_salary');
                                  handlePolicyDraftChange(emp.id, 'customHourlyRate', undefined);
                                }}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-gray-700 text-xs">
                                تلقائي من الراتب / اليومية ({computeDefaultBaseHourlyRate(emp, draft.officialDailyHours)} {currencySymbol}/س)
                              </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`rate-calc-${emp.id}`}
                                checked={draft.hourlyRateCalculation === 'fixed_custom'}
                                onChange={() => handlePolicyDraftChange(emp.id, 'hourlyRateCalculation', 'fixed_custom')}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-gray-700 text-xs">تحديد أجر ساعة مخصص يدوياً:</span>
                            </label>

                            {draft.hourlyRateCalculation === 'fixed_custom' && (
                              <div className="flex items-center gap-2 pt-1 mr-5">
                                <input
                                  type="number"
                                  value={draft.customHourlyRate || ''}
                                  placeholder={`افتراضي: ${computeDefaultBaseHourlyRate(emp, draft.officialDailyHours)}`}
                                  onChange={(e) => handlePolicyDraftChange(emp.id, 'customHourlyRate', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono text-xs font-bold text-gray-900"
                                />
                                <span className="text-gray-500 font-bold">{currencySymbol}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 5. Midday Errand Policy (المشوار أثناء الدوام) */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.defaultSplitShift}
                              onChange={(e) => handlePolicyDraftChange(emp.id, 'defaultSplitShift', e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            />
                            <span className="font-bold text-gray-800 text-xs">
                              تفعيل نظام المشوار أثناء الدوام افتراضياً (مرحلتين)
                            </span>
                          </label>

                          {draft.defaultSplitShift && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-[11px]">
                              <div>
                                <label className="block text-gray-500 mb-0.5">م1 (حضور ➔ خروج لمشوار):</label>
                                <div className="flex items-center gap-1 font-mono">
                                  <input
                                    type="time"
                                    value={draft.defaultShift1StartTime}
                                    onChange={(e) => handlePolicyDraftChange(emp.id, 'defaultShift1StartTime', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                                  />
                                  <span>➔</span>
                                  <input
                                    type="time"
                                    value={draft.defaultShift1EndTime}
                                    onChange={(e) => handlePolicyDraftChange(emp.id, 'defaultShift1EndTime', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-gray-500 mb-0.5">م2 (عودة ➔ انصراف نهائي):</label>
                                <div className="flex items-center gap-1 font-mono">
                                  <input
                                    type="time"
                                    value={draft.defaultShift2StartTime}
                                    onChange={(e) => handlePolicyDraftChange(emp.id, 'defaultShift2StartTime', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                                  />
                                  <span>➔</span>
                                  <input
                                    type="time"
                                    value={draft.defaultShift2EndTime}
                                    onChange={(e) => handlePolicyDraftChange(emp.id, 'defaultShift2EndTime', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded px-1 py-0.5 font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 6. Break Time Policy (وقت الاستراحة يخصم من ساعات الدوام) */}
                        <div className="bg-amber-50/50 border border-amber-200/90 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                              <Coffee className="w-4 h-4 text-amber-700" />
                              <span>وقت الاستراحة المخصوم من ساعات الدوام:</span>
                            </label>
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100/70 px-2 py-0.5 rounded">
                              يخصم تلقائياً
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={draft.defaultBreakMinutes}
                              onChange={(e) => handlePolicyDraftChange(emp.id, 'defaultBreakMinutes', Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-20 bg-white border border-amber-300 rounded-lg px-2 py-1 font-mono text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              min="0"
                              step="5"
                            />
                            <span className="text-xs font-bold text-amber-900">دقيقة</span>
                            <div className="flex items-center gap-1 mr-auto">
                              {[0, 15, 30, 45, 60].map(mins => (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => handlePolicyDraftChange(emp.id, 'defaultBreakMinutes', mins)}
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                                    draft.defaultBreakMinutes === mins
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100'
                                  }`}
                                >
                                  {mins}د
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="text-[11px] text-amber-900/90 bg-white/80 border border-amber-200/60 rounded-lg p-2 font-mono leading-relaxed">
                            💡 عند الحضور 08:00 والانصراف 16:30 (8.5 س) ➔ خصم {draft.defaultBreakMinutes} دقيقة استراحة = <strong className="text-emerald-700 font-black">{Number(Math.max(0, 8.5 - (draft.defaultBreakMinutes / 60)).toFixed(2))} ساعة</strong> عمل محتسبة للعامل.
                          </div>
                        </div>

                        {/* 7. Late Deduction Policy */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div>
                            <span className="block text-gray-800 font-bold text-xs">خصم دقائق التأخير:</span>
                            <span className="text-[11px] text-gray-500">خصم التأخير الصباحي عن ({draft.officialStartTime}) تلقائياً</span>
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.deductLateMinutes}
                              onChange={(e) => handlePolicyDraftChange(emp.id, 'deductLateMinutes', e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700 font-bold">تفعيل</span>
                          </label>
                        </div>

                        {/* Card Bottom Action Buttons */}
                        <div className="pt-2 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEmployeePolicy(emp.id)}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer ${
                              draft.isDirty
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 ring-offset-1'
                                : 'bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-700 border border-gray-200'
                            }`}
                          >
                            <Save className="w-4 h-4" />
                            <span>
                              {draft.isDirty ? '💾 حفظ وتثبيت السياسة وتطبيقها فوراً' : '✓ السياسة محفوظة ومطبقة تلقائياً'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyPolicyToRecords(emp.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-1 text-gray-500 hover:text-indigo-700 text-[11px] font-bold hover:underline transition cursor-pointer"
                            title="إعادة احتساب كافة سجلات وأيام حضور هذا العامل بناءً على السياسة المحفوظة"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>إعادة تطبيق السياسة على كافة سجلات العامل السابقة والجديدة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT ATTENDANCE RECORD MODAL (عند تعديل أي يوم حضور للعامل) */}
      {/* ========================================================================= */}
      {editingRecord && editModalDraft && (() => {
        const editEmp = employees.find(e => e.id === editingRecord.employeeId);
        const liveMetrics = editEmp ? calculateRowLiveMetrics(editEmp, {
          status: editModalDraft.status || 'present',
          checkInTime: editModalDraft.checkInTime || '08:00',
          checkOutTime: editModalDraft.checkOutTime || '16:30',
          breakMinutes: editModalDraft.breakMinutes !== undefined ? editModalDraft.breakMinutes : (editEmp.defaultBreakMinutes ?? 30),
          officialDailyHours: editEmp.officialDailyHours || 8,
          baseHourlyRate: editEmp.customHourlyRate || computeDefaultBaseHourlyRate(editEmp),
          overtimeMethod: editEmp.overtimeMethod || 'multiplier',
          overtimeMultiplier: editEmp.overtimeMultiplier || 1.5,
          overtimeRatePerHour: editEmp.overtimeMethod === 'fixed_rate' && editEmp.customOvertimeRate
            ? editEmp.customOvertimeRate
            : Number((computeDefaultBaseHourlyRate(editEmp) * (editEmp.overtimeMultiplier || 1.5)).toFixed(2)),
          hasSecondShift: editModalDraft.hasSecondShift,
          shift1CheckInTime: editModalDraft.shift1CheckInTime,
          shift1CheckOutTime: editModalDraft.shift1CheckOutTime,
          shift2CheckInTime: editModalDraft.shift2CheckInTime,
          shift2CheckOutTime: editModalDraft.shift2CheckOutTime
        }) : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                    <Pencil className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      تعديل سجل حضور يوم ({editingRecord.date})
                    </h3>
                    <p className="text-xs text-indigo-700 font-bold mt-0.5">
                      العامل: {editingRecord.employeeName} ({editingRecord.employeeCode})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditModalDraft(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Saved Policy Callout Banner */}
              {editEmp && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                      السياسة المعتمدة المحفوظة للعامل:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditModalDraft(prev => ({
                          ...prev,
                          checkInTime: editEmp.officialStartTime || '08:00',
                          checkOutTime: editEmp.officialEndTime || '16:30',
                          breakMinutes: editEmp.defaultBreakMinutes ?? 30,
                          hasSecondShift: false,
                          shift1CheckInTime: editEmp.officialStartTime || '08:00',
                          shift1CheckOutTime: '10:00',
                          shift2CheckInTime: '12:00',
                          shift2CheckOutTime: editEmp.officialEndTime || '16:30'
                        }));
                        showFeedback('تم استعادة المواعيد والاستراحة المعتمدة وفق سياسة العامل (08:00 - 16:30)', 'info');
                      }}
                      className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      استعادة مواعيد السياسة (08:00 - 16:30)
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 font-mono">
                    الدوام: {editEmp.officialStartTime || '08:00'} إلى {editEmp.officialEndTime || '16:30'} ({editEmp.officialDailyHours || 8} س) | استراحة مخصومة: {editEmp.defaultBreakMinutes ?? 30} د | أوفرتايم: {editEmp.overtimeMethod === 'fixed_rate' ? `${editEmp.customOvertimeRate} ${currencySymbol}/س` : `${editEmp.overtimeMultiplier || 1.5}x`}
                  </p>
                </div>
              )}

              {/* Status Radio Choices */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">حالة الحضور لهذا اليوم:</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'present', label: 'حاضر', color: 'emerald' },
                    { id: 'late', label: 'متأخر', color: 'amber' },
                    { id: 'excused_leave', label: 'إجازة', color: 'blue' },
                    { id: 'absent', label: 'غائب', color: 'red' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setEditModalDraft(prev => ({ ...prev, status: st.id as AttendanceStatus }))}
                      className={`py-1.5 rounded-lg font-bold border transition text-center ${
                        editModalDraft.status === st.id
                          ? `bg-${st.color}-600 text-white border-${st.color}-600 ring-2 ring-${st.color}-300`
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Errand Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-purple-600" />
                  مشوار وخروج أثناء الدوام (فترتين):
                </span>
                <button
                  type="button"
                  onClick={() => setEditModalDraft(prev => ({ ...prev, hasSecondShift: !prev?.hasSecondShift }))}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                    editModalDraft.hasSecondShift
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {editModalDraft.hasSecondShift ? 'مفعل (خروج وعودة)' : 'مغلق (دوام مستمر)'}
                </button>
              </div>

              {/* Time Inputs */}
              {!editModalDraft.hasSecondShift ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">وقت الحضور:</label>
                    <input
                      type="time"
                      value={editModalDraft.checkInTime || '08:00'}
                      onChange={(e) => setEditModalDraft(prev => ({ ...prev, checkInTime: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">وقت الانصراف:</label>
                    <input
                      type="time"
                      value={editModalDraft.checkOutTime || '16:30'}
                      onChange={(e) => setEditModalDraft(prev => ({ ...prev, checkOutTime: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-purple-50/50 p-2.5 rounded-xl border border-purple-200">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 mb-0.5">م1 حضور ➔ خروج لمشوار:</label>
                      <div className="flex items-center gap-1 font-mono">
                        <input
                          type="time"
                          value={editModalDraft.shift1CheckInTime || editModalDraft.checkInTime || '08:00'}
                          onChange={(e) => setEditModalDraft(prev => ({ ...prev, shift1CheckInTime: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-xs font-bold"
                        />
                        <span>➔</span>
                        <input
                          type="time"
                          value={editModalDraft.shift1CheckOutTime || '10:00'}
                          onChange={(e) => setEditModalDraft(prev => ({ ...prev, shift1CheckOutTime: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-0.5">م2 عودة ➔ انصراف نهائي:</label>
                      <div className="flex items-center gap-1 font-mono">
                        <input
                          type="time"
                          value={editModalDraft.shift2CheckInTime || '12:00'}
                          onChange={(e) => setEditModalDraft(prev => ({ ...prev, shift2CheckInTime: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-xs font-bold"
                        />
                        <span>➔</span>
                        <input
                          type="time"
                          value={editModalDraft.shift2CheckOutTime || editModalDraft.checkOutTime || '16:30'}
                          onChange={(e) => setEditModalDraft(prev => ({ ...prev, shift2CheckOutTime: e.target.value }))}
                          className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Break Minutes Input (وقت الاستراحة يخصم من ساعات الدوام) */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-amber-700" />
                    <span>وقت الاستراحة المخصوم من ساعات الدوام:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditModalDraft(prev => prev ? ({ ...prev, breakMinutes: editEmp?.defaultBreakMinutes ?? 30 }) : null)}
                    className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                  >
                    استعادة استراحة السياسة ({editEmp?.defaultBreakMinutes ?? 30} د)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editModalDraft.breakMinutes ?? 30}
                    onChange={(e) => setEditModalDraft(prev => prev ? ({ ...prev, breakMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) }) : null)}
                    className="w-20 bg-white border border-amber-300 rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    min="0"
                    step="5"
                  />
                  <span className="text-gray-700 font-bold">دقيقة استراحة</span>
                  <span className="text-[11px] text-gray-500 mr-2">
                    (تخصم مباشرة من إجمالي ساعات الدوام لهذا اليوم)
                  </span>
                </div>
              </div>

              {/* Live Preview based on Employee Saved Policy */}
              {liveMetrics && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-700 font-bold">
                    <span>حساب الساعات والمستحقات بالسياسة المحفوظة:</span>
                    <span className="font-mono text-indigo-700 font-black">
                      {liveMetrics.totalPay.toLocaleString()} {currencySymbol}
                    </span>
                  </div>

                  <div className="bg-white/90 border border-gray-200 rounded-lg p-2 text-[11px] font-mono text-gray-600 flex items-center justify-between">
                    <span>خصم الاستراحة: <strong className="text-amber-800">{editModalDraft.breakMinutes ?? 30} د</strong></span>
                    <span>العمل الفعلي المحتسب: <strong className="text-blue-800">{liveMetrics.workedHours} س</strong></span>
                    <span>الرسمي المطلوب: <strong className="text-gray-800">{editEmp?.officialDailyHours || 8} س</strong></span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-center pt-1 border-t border-gray-200">
                    <div className="bg-white p-1 rounded border border-gray-200">
                      <span className="block text-gray-500 text-[10px]">العمل الفعلي</span>
                      <span className="font-bold text-gray-900">{liveMetrics.workedHours} س</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-gray-200">
                      <span className="block text-gray-500 text-[10px]">الأوفرتايم</span>
                      <span className="font-black text-amber-700">+{liveMetrics.overtimeHours} س</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-gray-200">
                      <span className="block text-gray-500 text-[10px]">أجر الإضافي</span>
                      <span className="font-black text-emerald-700">{liveMetrics.overtimePay} {currencySymbol}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditModalDraft(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedRecord}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديل وتطبيق السياسة المحفوظة</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
