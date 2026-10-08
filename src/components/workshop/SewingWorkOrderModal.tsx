import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { PrintJobOrder, PrintServiceType, PrintOrderStatus, TailoringMeasurements, Party, PaymentMethod, LineAttachment, SuppliedMaterialItem, ColorSizeQuantityRow, WorkOrderWorkerLabor, WorkOrderDailyTimeSlot, Employee } from '../../types';
import {
  Scissors,
  Layers,
  Ruler,
  Calendar,
  User,
  Phone,
  DollarSign,
  Sparkles,
  Save,
  X,
  Plus,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  Package,
  Trash2,
  Boxes,
  Palette,
  Calculator,
  Clock,
  Users,
  TrendingUp,
  Coins,
  Timer,
  Zap
} from 'lucide-react';
import { posSound } from '../../utils/audio';
import { CustomerMeasurementsModal } from './CustomerMeasurementsModal';
import { ModelTypeAutocomplete } from './ModelTypeAutocomplete';
import { ColorSizeQuantityTable, DEFAULT_SIZES } from './ColorSizeQuantityTable';
import { ModelImageAttachment } from './ModelImageAttachment';

// Helper to calculate time slot metrics (shift overlap, regular vs overtime hours and costs)
const calculateSlotMetrics = (
  startTimeStr: string,
  endTimeStr: string,
  emp: Employee | undefined
) => {
  if (!startTimeStr || !endTimeStr) {
    return {
      hoursWorked: 0,
      regularHours: 0,
      overtimeHours: 0,
      baseHourlyRate: emp ? (emp.customHourlyRate || (emp.salaryAmount ? emp.salaryAmount / ((emp.monthlyWorkDays || 26) * (emp.officialDailyHours || 8)) : 25)) : 25,
      overtimeMultiplier: emp?.overtimeMultiplier || 1.5,
      overtimeRate: 0,
      regularLaborCost: 0,
      overtimeLaborCost: 0,
      totalLaborCost: 0,
      slotType: 'regular' as const
    };
  }

  const parseMinutes = (t: string) => {
    const parts = t.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  let startMin = parseMinutes(startTimeStr);
  let endMin = parseMinutes(endTimeStr);
  if (endMin <= startMin) {
    endMin += 24 * 60; // Handle overnight/cross midnight
  }

  const totalMin = endMin - startMin;
  const hoursWorked = Math.round((totalMin / 60) * 100) / 100;

  let baseRate = 25;
  let mult = emp?.overtimeMultiplier || 1.5;
  let shiftStartMin = 8 * 60;  // 08:00 AM default
  let shiftEndMin = 16 * 60;   // 04:00 PM default

  if (emp) {
    if (emp.hourlyRateCalculation === 'fixed_custom' && emp.customHourlyRate && emp.customHourlyRate > 0) {
      baseRate = emp.customHourlyRate;
    } else if (emp.salaryAmount && emp.salaryAmount > 0) {
      const days = emp.monthlyWorkDays || 26;
      const hrs = emp.officialDailyHours || 8;
      const raw = emp.salaryAmount / (days * hrs);
      baseRate = emp.roundHourlyRateUp ? Math.ceil(raw * 2) / 2 : Math.round(raw * 100) / 100;
    } else if (emp.customHourlyRate && emp.customHourlyRate > 0) {
      baseRate = emp.customHourlyRate;
    }

    if (emp.officialStartTime) {
      shiftStartMin = parseMinutes(emp.officialStartTime);
    }
    if (emp.officialEndTime) {
      shiftEndMin = parseMinutes(emp.officialEndTime);
    }
    if (shiftEndMin <= shiftStartMin) {
      shiftEndMin += 24 * 60;
    }
  }

  // Calculate shift overlap (regular hours)
  const overlapStart = Math.max(startMin, shiftStartMin);
  const overlapEnd = Math.min(endMin, shiftEndMin);
  const regularMin = Math.max(0, overlapEnd - overlapStart);
  
  const regularHours = Math.round((regularMin / 60) * 100) / 100;
  const overtimeHours = Math.round(Math.max(0, hoursWorked - regularHours) * 100) / 100;

  const overtimeRate = emp?.overtimeMethod === 'fixed_rate' && emp.customOvertimeRate
    ? emp.customOvertimeRate
    : Math.round(baseRate * mult * 100) / 100;

  const regularLaborCost = Math.round(regularHours * baseRate * 100) / 100;
  const overtimeLaborCost = Math.round(overtimeHours * overtimeRate * 100) / 100;
  const totalLaborCost = Math.round((regularLaborCost + overtimeLaborCost) * 100) / 100;

  let slotType: 'regular' | 'overtime' | 'mixed' = 'regular';
  if (regularHours > 0 && overtimeHours > 0) {
    slotType = 'mixed';
  } else if (overtimeHours > 0 && regularHours === 0) {
    slotType = 'overtime';
  }

  return {
    hoursWorked,
    regularHours,
    overtimeHours,
    baseHourlyRate: baseRate,
    overtimeMultiplier: mult,
    overtimeRate,
    regularLaborCost,
    overtimeLaborCost,
    totalLaborCost,
    slotType
  };
};

const getArabicDayName = (dateStr: string) => {
  if (!dateStr) return '';
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : days[d.getDay()];
};

interface SewingWorkOrderModalProps {
  orderToEdit?: PrintJobOrder | null;
  onClose: () => void;
  onSave?: (savedOrder: PrintJobOrder) => void;
}

const COMMON_MATERIAL_PRESETS = [
  { label: '+ أزرار صدف', itemName: 'أزرار صدف طبيعي', unit: 'حبة', requiredQuantity: 12, notes: 'ياقة وأكمام' },
  { label: '+ سحاب مخفي', itemName: 'سحاب مخفي عالي المتانة', unit: 'قطعة', requiredQuantity: 1, notes: 'طول 50 سم' },
  { label: '+ قماش بطانة', itemName: 'قماش بطانة ساتان ناعم', unit: 'متر', requiredQuantity: 2.5, notes: 'مطابق للون' },
  { label: '+ كتافيات', itemName: 'كتافيات إسفنج مقواة', unit: 'طقم', requiredQuantity: 1, notes: 'مقاس مناسب' },
  { label: '+ خيوط وتطريز', itemName: 'بكرات خيوط تطريز حرير', unit: 'بكرة', requiredQuantity: 2, notes: 'درجة اللون حسب العينة' },
  { label: '+ فازلين وحشوات', itemName: 'فازلين لاصق للياقة والأسورة', unit: 'متر', requiredQuantity: 1, notes: 'جودة ممتازة' },
  { label: '+ كبك وإكسسوار', itemName: 'أزرار كبك معدني كلاسيك', unit: 'طقم', requiredQuantity: 1, notes: 'لون فضي/ذهبي' }
];

const STANDARD_PRESETS: Record<string, Partial<TailoringMeasurements>> = {
  S: { length: 135, shoulder: 42, chest: 96, waist: 82, hips: 98, sleeveLength: 58, sleeveWidth: 36, wristCuff: 24, neckCollar: 38, bottomSweep: 140 },
  M: { length: 140, shoulder: 45, chest: 104, waist: 90, hips: 106, sleeveLength: 60, sleeveWidth: 38, wristCuff: 25, neckCollar: 40, bottomSweep: 148 },
  L: { length: 145, shoulder: 48, chest: 112, waist: 98, hips: 114, sleeveLength: 62, sleeveWidth: 40, wristCuff: 26, neckCollar: 42, bottomSweep: 156 },
  XL: { length: 150, shoulder: 51, chest: 120, waist: 108, hips: 122, sleeveLength: 64, sleeveWidth: 43, wristCuff: 27, neckCollar: 44, bottomSweep: 164 },
  XXL: { length: 155, shoulder: 54, chest: 128, waist: 118, hips: 130, sleeveLength: 65, sleeveWidth: 46, wristCuff: 28, neckCollar: 46, bottomSweep: 172 },
  XXXL: { length: 158, shoulder: 57, chest: 136, waist: 128, hips: 138, sleeveLength: 66, sleeveWidth: 49, wristCuff: 29, neckCollar: 48, bottomSweep: 180 },
};

const COMMON_FABRICS = [
  'قطن مصري 100% ممتاز',
  'كتان إيطالي طبيعي',
  'صوف كشميري إنجليزي فاخر',
  'حرير طبيعي شيفون',
  'قماش ياباني تترون أصلي',
  'قماش زبدة كوري خفيف',
  'قماش جينز قطني مطاط',
  'ساتان ملكي للبطانات',
  'دانتيل مطرز تركي',
  'جوخ شتوي فاخر'
];

const FINISHING_OPTIONS_LIST = [
  'أزرار صدف طبيعي أصلي',
  'سحاب مخفي عالي المتانة',
  'تطريز كمبيوتر على الياقة والجيب',
  'بطانة داخلية كاملة (Full Lining)',
  'كتافيات داخلية مقواة',
  'خياطة وتجميع يدوي (Handmade)',
  'كبك كلاسيكي مزدوج',
  'جيب سري داخلي للهاتف',
  'عروات يد ومثبتات خاصة'
];

export const SewingWorkOrderModal: React.FC<SewingWorkOrderModalProps> = ({
  orderToEdit,
  onClose,
  onSave
}) => {
  const {
    parties,
    addParty,
    inventory,
    employees,
    settings,
    createPrintOrder,
    updatePrintOrder,
    treasuries,
    printOrders
  } = useAccounting();

  const isEditMode = !!orderToEdit;

  // Customers only
  const customers = useMemo(() => parties.filter(p => p.type === 'customer' || p.type === 'both'), [parties]);
  const tailors = useMemo(() => employees.filter(e => e.department === 'tailoring_sewing' || e.department === 'cutting' || e.jobTitle?.includes('خياط') || e.jobTitle?.includes('قص')), [employees]);
  const fabricInventory = useMemo(() => inventory.filter(i => i.category === 'fabrics' || i.category === 'print_raw' || i.unit?.includes('متر') || i.name?.includes('قماش')), [inventory]);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(orderToEdit?.customerId || (customers[0]?.id || ''));
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [customerName, setCustomerName] = useState(orderToEdit?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(orderToEdit?.customerPhone || '');

  // Garment & Order specs
  const [serviceType, setServiceType] = useState<PrintServiceType>(orderToEdit?.serviceType || 'mens_thobe');
  const [garmentType, setGarmentType] = useState<string>(orderToEdit?.garmentType || 'ثوب رجالي سعودي');
  const [modelCode, setModelCode] = useState<string>(orderToEdit?.modelCode || '');
  const [title, setTitle] = useState(orderToEdit?.title || 'ثوب كلاسيك سعودي مع كبك وياقة صدف');
  const [quantity, setQuantity] = useState<number>(orderToEdit?.quantity || 1);
  const [fabricSource, setFabricSource] = useState<'workshop' | 'customer'>(orderToEdit?.fabricSource || 'workshop');
  const [selectedFabricItem, setSelectedFabricItem] = useState<string>(orderToEdit?.fabricItemId || '');
  const [fabricType, setFabricType] = useState(orderToEdit?.fabricType || 'قطن مصري 100% ممتاز');
  const [fabricColor, setFabricColor] = useState(orderToEdit?.fabricColor || 'أبيض ناصع');
  const [fabricLengthMeters, setFabricLengthMeters] = useState<number>(orderToEdit?.fabricLengthMeters || 3.5);

  // Model & Design Images (صورة الموديل والتصميم الأساسية واللقطات الإضافية)
  const [modelImageUrl, setModelImageUrl] = useState<string | undefined>(
    orderToEdit?.modelImageUrl || orderToEdit?.measurements?.modelImageUrl || undefined
  );
  const [modelImages, setModelImages] = useState<string[]>(
    orderToEdit?.modelImages || orderToEdit?.measurements?.modelImages || []
  );

  // Measurements
  const [measurements, setMeasurements] = useState<TailoringMeasurements>(orderToEdit?.measurements || {
    standardSize: 'custom',
    unit: 'cm',
    length: 145,
    shoulder: 48,
    chest: 110,
    waist: 95,
    hips: 112,
    sleeveLength: 62,
    sleeveWidth: 40,
    wristCuff: 26,
    neckCollar: 42,
    bottomSweep: 155,
    notes: ''
  });

  const [activeSizePreset, setActiveSizePreset] = useState<string>(measurements.standardSize || 'custom');
  const [showMeasurementsDetailedModal, setShowMeasurementsDetailedModal] = useState(false);

  // Color, Size & Quantity Matrix State (جدول القياسات والكميات والألوان)
  const initialColorMatrix: ColorSizeQuantityRow[] = useMemo(() => {
    if (orderToEdit?.colorSizeMatrix && orderToEdit.colorSizeMatrix.length > 0) {
      return orderToEdit.colorSizeMatrix;
    }
    if (orderToEdit?.measurements?.colorSizeMatrix && orderToEdit.measurements.colorSizeMatrix.length > 0) {
      return orderToEdit.measurements.colorSizeMatrix;
    }
    return [
      {
        id: `csq-${Date.now()}-1`,
        color: orderToEdit?.fabricColor || 'كحلي',
        colorHex: '#1e3a8a',
        quantities: { S: 2, M: 4, L: 4, XL: 2, '2XL': 1, '3XL': 0 },
        totalQuantity: 13,
        notes: 'تفصيل حسب النموذج المعتمد'
      }
    ];
  }, [orderToEdit]);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'info' | 'measurements' | 'materials' | 'labor' | 'financials'>('info');

  const [colorSizeMatrix, setColorSizeMatrix] = useState<ColorSizeQuantityRow[]>(initialColorMatrix);
  const [availableSizes, setAvailableSizes] = useState<string[]>(
    orderToEdit?.measurements?.availableSizes || DEFAULT_SIZES
  );

  // Finishing & Details
  const [selectedFinishing, setSelectedFinishing] = useState<string[]>(orderToEdit?.finishingOptions || ['أزرار صدف طبيعي أصلي']);

  // Supplied Materials & Accessories List State
  const [suppliedMaterials, setSuppliedMaterials] = useState<SuppliedMaterialItem[]>(
    orderToEdit?.suppliedMaterials || []
  );

  // Workers Labor & Production Cost Calculation State
  const [assignedWorkersLabor, setAssignedWorkersLabor] = useState<WorkOrderWorkerLabor[]>(
    orderToEdit?.assignedWorkersLabor || []
  );
  const [selectedAddEmpId, setSelectedAddEmpId] = useState<string>('');

  // Tailors & Stages
  const [status, setStatus] = useState<PrintOrderStatus>(orderToEdit?.status || 'cutting');
  const [assignedTailorId, setAssignedTailorId] = useState(orderToEdit?.assignedTailorId || (tailors[0]?.id || ''));
  const [pieceRateWage, setPieceRateWage] = useState<number>(orderToEdit?.pieceRateWage || 25);

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [workStartDate, setWorkStartDate] = useState<string>(orderToEdit?.workStartDate || todayStr);
  const [fittingDate, setFittingDate] = useState(orderToEdit?.fittingDate || '');
  const [deliveryDate, setDeliveryDate] = useState(orderToEdit?.deliveryDate || nextWeekStr);

  // Daily Labor Time Logs State (سجل أيام وفترات عمل الموديل)
  const [dailyLaborLogs, setDailyLaborLogs] = useState<WorkOrderDailyTimeSlot[]>(
    orderToEdit?.dailyLaborLogs || []
  );

  // Form State for Adding Daily Labor Time Slot
  const [slotDate, setSlotDate] = useState<string>(todayStr);
  const [slotEmpId, setSlotEmpId] = useState<string>('');
  const [slotStage, setSlotStage] = useState<string>('خياطة وتجميع');
  const [slotStartTime, setSlotStartTime] = useState<string>('16:00');
  const [slotEndTime, setSlotEndTime] = useState<string>('19:00');
  const [slotNotes, setSlotNotes] = useState<string>('');

  // Financials
  const [unitCost, setUnitCost] = useState<number>(orderToEdit?.unitCost || 180);
  const [totalPrice, setTotalPrice] = useState<number>(orderToEdit?.totalPrice || (orderToEdit?.unitCost ? orderToEdit.unitCost * (orderToEdit.quantity || 1) : 180));
  const [depositPaid, setDepositPaid] = useState<number>(orderToEdit?.depositPaid || 50);
  const [notes, setNotes] = useState(orderToEdit?.notes || '');

  // Calculate remaining
  const remainingBalance = Math.max(0, totalPrice - depositPaid);

  // Helper to compute hourly rate automatically from Employee Monthly Salary
  const getEmployeeCalculatedRate = (emp: any): number => {
    if (!emp) return 25;
    if (emp.hourlyRateCalculation === 'fixed_custom' && emp.customHourlyRate && emp.customHourlyRate > 0) {
      return emp.customHourlyRate;
    }
    if (emp.customHourlyRate && emp.customHourlyRate > 0) {
      return emp.customHourlyRate;
    }
    const monthlySalary = emp.salaryAmount || 0;
    const workDays = emp.monthlyWorkDays || 26;
    const dailyHours = emp.officialDailyHours || 8;
    const totalHours = workDays * dailyHours;
    if (totalHours > 0 && monthlySalary > 0) {
      const rawRate = monthlySalary / totalHours;
      return emp.roundHourlyRateUp ? Math.ceil(rawRate * 2) / 2 : Math.round(rawRate * 100) / 100;
    }
    return emp.pieceRatePerGarment || 25;
  };

  // Helper to sync dailyLaborLogs into assignedWorkersLabor automatically
  const syncDailyLogsToAssignedWorkers = (logs: WorkOrderDailyTimeSlot[], existingAssigned: WorkOrderWorkerLabor[]) => {
    if (logs.length === 0) return existingAssigned;

    const map = new Map<string, {
      empName: string;
      jobTitle: string;
      stage: string;
      totalHrs: number;
      regHrs: number;
      otHrs: number;
      regCost: number;
      otCost: number;
      totalCost: number;
      hourlyRate: number;
      slots: WorkOrderDailyTimeSlot[];
    }>();

    logs.forEach(log => {
      const emp = employees.find(e => e.id === log.employeeId);
      const existing = map.get(log.employeeId) || {
        empName: log.employeeName || emp?.name || 'عامل',
        jobTitle: log.jobTitle || emp?.jobTitle || 'فني تشغيل',
        stage: log.stageOrRole || 'تشغيل',
        totalHrs: 0,
        regHrs: 0,
        otHrs: 0,
        regCost: 0,
        otCost: 0,
        totalCost: 0,
        hourlyRate: log.baseHourlyRate,
        slots: []
      };

      existing.totalHrs += log.hoursWorked;
      existing.regHrs += log.regularHours;
      existing.otHrs += log.overtimeHours;
      existing.regCost += log.regularLaborCost;
      existing.otCost += log.overtimeLaborCost;
      existing.totalCost += log.totalLaborCost;
      existing.slots.push(log);

      map.set(log.employeeId, existing);
    });

    const updatedWorkers: WorkOrderWorkerLabor[] = Array.from(map.entries()).map(([empId, data]) => {
      const prevLine = existingAssigned.find(w => w.employeeId === empId);
      return {
        id: prevLine?.id || `labor-sync-${empId}`,
        employeeId: empId,
        employeeName: data.empName,
        jobTitle: data.jobTitle,
        stageOrRole: data.stage,
        calculationType: 'daily_slots',
        hoursWorked: Math.round(data.totalHrs * 100) / 100,
        regularHours: Math.round(data.regHrs * 100) / 100,
        overtimeHours: Math.round(data.otHrs * 100) / 100,
        hourlyRate: data.hourlyRate,
        regularLaborCost: Math.round(data.regCost * 100) / 100,
        overtimeLaborCost: Math.round(data.otCost * 100) / 100,
        totalLaborCost: Math.round(data.totalCost * 100) / 100,
        dailyTimeSlots: data.slots,
        notes: `مسجل عبر ${data.slots.length} فترات عمل يومية`
      };
    });

    const manualWorkers = existingAssigned.filter(w => w.calculationType !== 'daily_slots' && !map.has(w.employeeId));
    return [...updatedWorkers, ...manualWorkers];
  };

  // Add Daily Time Slot Handler
  const handleAddDailySlot = () => {
    if (!slotEmpId) return;
    const emp = employees.find(e => e.id === slotEmpId);
    if (!emp) return;

    const metrics = calculateSlotMetrics(slotStartTime, slotEndTime, emp);

    const newSlot: WorkOrderDailyTimeSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: slotDate || todayStr,
      employeeId: emp.id,
      employeeName: emp.name,
      jobTitle: emp.jobTitle || 'فني تشغيل',
      stageOrRole: slotStage,
      startTime: slotStartTime,
      endTime: slotEndTime,
      hoursWorked: metrics.hoursWorked,
      baseHourlyRate: metrics.baseHourlyRate,
      regularHours: metrics.regularHours,
      overtimeHours: metrics.overtimeHours,
      overtimeMultiplier: metrics.overtimeMultiplier,
      overtimeRate: metrics.overtimeRate,
      regularLaborCost: metrics.regularLaborCost,
      overtimeLaborCost: metrics.overtimeLaborCost,
      totalLaborCost: metrics.totalLaborCost,
      slotType: metrics.slotType,
      notes: slotNotes.trim() || undefined
    };

    const nextLogs = [...dailyLaborLogs, newSlot];
    setDailyLaborLogs(nextLogs);
    setAssignedWorkersLabor(prev => syncDailyLogsToAssignedWorkers(nextLogs, prev));
    setSlotNotes('');
  };

  // Remove Daily Time Slot Handler
  const handleRemoveDailySlot = (slotId: string) => {
    const nextLogs = dailyLaborLogs.filter(s => s.id !== slotId);
    setDailyLaborLogs(nextLogs);
    setAssignedWorkersLabor(prev => syncDailyLogsToAssignedWorkers(nextLogs, prev));
  };

  // Add Worker Labor Line (Manual)
  const handleAddWorkerLabor = (empIdToAdd?: string) => {
    const targetId = empIdToAdd || selectedAddEmpId;
    if (!targetId) return;
    const emp = employees.find(e => e.id === targetId);
    if (!emp) return;

    const rate = getEmployeeCalculatedRate(emp);
    const defaultHours = 2; // افتراضي ساعتان عمل في الموديل

    const newLaborLine: WorkOrderWorkerLabor = {
      id: `labor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      jobTitle: emp.jobTitle || 'فني خياطة وتشغيل',
      stageOrRole: emp.jobTitle?.includes('قص') ? 'قص وفصال' : emp.jobTitle?.includes('كوي') ? 'كي وتشطيب' : 'خياطة وتجميع',
      calculationType: 'hourly',
      hoursWorked: defaultHours,
      hourlyRate: rate,
      totalLaborCost: Math.round(defaultHours * rate * 100) / 100,
      notes: emp.salaryAmount ? `راتبه الشهري: ${emp.salaryAmount} ${settings.currency}` : 'مقيم بأجر الساعة'
    };

    setAssignedWorkersLabor(prev => [...prev, newLaborLine]);
    setSelectedAddEmpId('');
  };

  // Update Worker Labor Line
  const handleUpdateWorkerLabor = (id: string, field: keyof WorkOrderWorkerLabor, value: any) => {
    setAssignedWorkersLabor(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (updated.calculationType === 'hourly') {
        const hrs = Number(updated.hoursWorked) || 0;
        const rate = Number(updated.hourlyRate) || 0;
        updated.totalLaborCost = Math.round(hrs * rate * 100) / 100;
      } else {
        const pcs = Number(updated.piecesCompleted) || 0;
        const pRate = Number(updated.pieceRate) || 0;
        updated.totalLaborCost = Math.round(pcs * pRate * 100) / 100;
      }
      return updated;
    }));
  };

  // Remove Worker Labor Line
  const handleRemoveWorkerLabor = (id: string) => {
    setAssignedWorkersLabor(prev => prev.filter(item => item.id !== id));
  };

  // Auto populate workers assigned in workshop
  const handleAutoPopulateTailors = () => {
    if (employees.length === 0) return;
    const newLines: WorkOrderWorkerLabor[] = [];
    
    // Assigned main tailor
    const mainTailor = employees.find(e => e.id === assignedTailorId);
    if (mainTailor && !assignedWorkersLabor.some(w => w.employeeId === mainTailor.id)) {
      const rate = getEmployeeCalculatedRate(mainTailor);
      newLines.push({
        id: `labor-${Date.now()}-1`,
        employeeId: mainTailor.id,
        employeeName: mainTailor.name,
        jobTitle: mainTailor.jobTitle || 'خياط رئيسي',
        stageOrRole: 'خياطة وتجميع',
        calculationType: 'hourly',
        hoursWorked: 3,
        hourlyRate: rate,
        totalLaborCost: Math.round(3 * rate * 100) / 100,
        notes: 'الخياط المعين في بطاقة الشغل'
      });
    }

    // Other tailoring/cutting staff
    const workshopEmps = employees.filter(e => 
      (e.department === 'tailoring_sewing' || e.department === 'cutting' || e.jobTitle?.includes('خياط') || e.jobTitle?.includes('قص')) && 
      e.id !== assignedTailorId
    );

    workshopEmps.forEach((emp, idx) => {
      if (!assignedWorkersLabor.some(w => w.employeeId === emp.id)) {
        const rate = getEmployeeCalculatedRate(emp);
        newLines.push({
          id: `labor-${Date.now()}-${idx + 2}`,
          employeeId: emp.id,
          employeeName: emp.name,
          jobTitle: emp.jobTitle || 'فني تشغيل',
          stageOrRole: emp.jobTitle?.includes('قص') ? 'قص وفصال' : 'كي وتشطيب',
          calculationType: 'hourly',
          hoursWorked: 1.5,
          hourlyRate: rate,
          totalLaborCost: Math.round(1.5 * rate * 100) / 100,
          notes: 'إضافة تلقائية من طاقم الورشة'
        });
      }
    });

    if (newLines.length > 0) {
      setAssignedWorkersLabor(prev => [...prev, ...newLines]);
    }
  };

  // Live Cost Calculations
  const totalLaborCost = useMemo(() => {
    const fromSlots = dailyLaborLogs.reduce((sum, s) => sum + (Number(s.totalLaborCost) || 0), 0);
    const fromManualWorkers = assignedWorkersLabor
      .filter(w => w.calculationType !== 'daily_slots')
      .reduce((sum, w) => sum + (Number(w.totalLaborCost) || 0), 0);
    return Math.round((fromSlots + fromManualWorkers) * 100) / 100;
  }, [dailyLaborLogs, assignedWorkersLabor]);

  const fabricUnitPrice = useMemo(() => {
    if (fabricSource === 'workshop' && selectedFabricItem) {
      const item = inventory.find(i => i.id === selectedFabricItem);
      return item?.costPrice || item?.unitPrice || 0;
    }
    return 0;
  }, [fabricSource, selectedFabricItem, inventory]);

  const totalFabricCost = useMemo(() => {
    if (fabricSource === 'workshop') {
      return Math.round((fabricLengthMeters || 0) * fabricUnitPrice * 100) / 100;
    }
    return 0;
  }, [fabricSource, fabricLengthMeters, fabricUnitPrice]);

  const totalSuppliedMaterialsCost = useMemo(() => {
    return Math.round(suppliedMaterials.reduce((sum, m) => {
      let itemCost = 0;
      if (m.inventoryItemId) {
        const invItem = inventory.find(i => i.id === m.inventoryItemId);
        itemCost = invItem?.costPrice || 0;
      }
      return sum + ((m.requiredQuantity || 0) * itemCost);
    }, 0) * 100) / 100;
  }, [suppliedMaterials, inventory]);

  const totalProductionCost = useMemo(() => {
    return Math.round((totalLaborCost + totalFabricCost + totalSuppliedMaterialsCost) * 100) / 100;
  }, [totalLaborCost, totalFabricCost, totalSuppliedMaterialsCost]);

  const productionCostPerUnit = useMemo(() => {
    return quantity > 0 ? Math.round((totalProductionCost / quantity) * 100) / 100 : totalProductionCost;
  }, [totalProductionCost, quantity]);

  const expectedProfit = useMemo(() => {
    return Math.round((totalPrice - totalProductionCost) * 100) / 100;
  }, [totalPrice, totalProductionCost]);

  const profitMarginPercent = useMemo(() => {
    return totalPrice > 0 ? Math.round(((totalPrice - totalProductionCost) / totalPrice) * 100) : 0;
  }, [totalPrice, totalProductionCost]);



  // Synchronize when customer changes
  useEffect(() => {
    if (!newCustomerMode && selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        setCustomerName(cust.name);
        setCustomerPhone(cust.phone || '');
        if (cust.savedMeasurements && !orderToEdit) {
          setMeasurements(cust.savedMeasurements);
          if (cust.savedMeasurements.standardSize) {
            setActiveSizePreset(cust.savedMeasurements.standardSize);
          }
        }
      }
    }
  }, [selectedCustomerId, newCustomerMode, customers, orderToEdit]);

  // Recalculate total price when unit cost or quantity changes
  const handleUnitCostChange = (val: number) => {
    setUnitCost(val);
    setTotalPrice(val * quantity);
  };

  const handleQuantityChange = (val: number) => {
    setQuantity(val);
    setTotalPrice(unitCost * val);
  };

  const applySizePreset = (sizeKey: string) => {
    setActiveSizePreset(sizeKey);
    const preset = STANDARD_PRESETS[sizeKey];
    if (preset) {
      setMeasurements(prev => ({
        ...prev,
        ...preset,
        standardSize: sizeKey
      }));
      posSound.playBeep();
    }
  };

  const toggleFinishing = (item: string) => {
    setSelectedFinishing(prev =>
      prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
    );
  };

  // Handlers for Supplied Materials & Accessories Table
  const handleAddMaterial = (preset?: { itemName: string; unit?: string; requiredQuantity?: number; notes?: string }) => {
    const newItem: SuppliedMaterialItem = {
      id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemName: preset?.itemName || '',
      unit: preset?.unit || 'قطعة',
      requiredQuantity: preset?.requiredQuantity ?? 1,
      receivedQuantity: 0,
      missingQuantity: preset?.requiredQuantity ?? 1,
      notes: preset?.notes || ''
    };
    setSuppliedMaterials(prev => [...prev, newItem]);
    posSound.playBeep();
  };

  const handleUpdateMaterial = (id: string, field: keyof SuppliedMaterialItem, value: any) => {
    setSuppliedMaterials(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'requiredQuantity' || field === 'receivedQuantity') {
        const req = field === 'requiredQuantity' ? (parseFloat(value) || 0) : item.requiredQuantity;
        const rec = field === 'receivedQuantity' ? (parseFloat(value) || 0) : item.receivedQuantity;
        updated.missingQuantity = Math.max(0, req - rec);
      }
      return updated;
    }));
  };

  const handleRemoveMaterial = (id: string) => {
    setSuppliedMaterials(prev => prev.filter(item => item.id !== id));
    posSound.playBeep();
  };

  const handleSave = () => {
    if (!customerName.trim()) {
      alert('يرجى كتابة اسم الزبون');
      return;
    }

    let customerId = selectedCustomerId;

    // If new customer, create or register
    if (newCustomerMode) {
      const newCust: Omit<Party, 'id'> = {
        code: `CUST-${String(parties.length + 1).padStart(4, '0')}`,
        type: 'customer',
        name: customerName.trim(),
        phone: customerPhone.trim(),
        balance: remainingBalance,
        savedMeasurements: measurements
      };
      // We can use addParty or set ID
      customerId = `cust-gen-${Date.now()}`;
      addParty(newCust);
    }

    const assignedTailor = tailors.find(t => t.id === assignedTailorId);

    const orderData: Omit<PrintJobOrder, 'id' | 'orderNumber' | 'createdAt'> & { id?: string; orderNumber?: string; createdAt?: string } = {
      customerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      title: title.trim() || 'تفصيل ثوب وموديل',
      serviceType,
      garmentType: garmentType.trim() || 'ثوب تفصيل',
      modelCode: modelCode.trim(),
      fabricSource,
      fabricType,
      fabricColor,
      fabricLengthMeters,
      fabricItemId: fabricSource === 'workshop' ? selectedFabricItem : undefined,
      dimensions: activeSizePreset === 'custom' ? 'تفصيل مخصص' : `مقاس ${activeSizePreset}`,
      modelImageUrl,
      modelImages,
      measurements: {
        ...measurements,
        modelImageUrl,
        modelImages,
        colorSizeMatrix,
        availableSizes
      },
      colorSizeMatrix,
      suppliedMaterials,
      assignedWorkersLabor,
      totalLaborCost,
      totalMaterialsCost: totalFabricCost + totalSuppliedMaterialsCost,
      totalProductionCost,
      productionCostPerUnit,
      quantity,
      colorType: fabricColor,
      finishingOptions: selectedFinishing,
      unitCost,
      totalPrice,
      depositPaid,
      remainingBalance,
      status,
      assignedTailorId,
      assignedTailorName: assignedTailor?.name,
      pieceRateWage,
      workStartDate: workStartDate || todayStr,
      fittingDate: fittingDate || undefined,
      deliveryDate: deliveryDate || nextWeekStr,
      dailyLaborLogs,
      notes: notes.trim()
    };

    if (isEditMode && orderToEdit) {
      updatePrintOrder(orderToEdit.id, orderData);
      if (onSave) onSave({ ...orderToEdit, ...orderData });
    } else {
      const newId = createPrintOrder(orderData as any);
      if (onSave) {
        const created = printOrders.find(o => o.id === newId) || {
          ...orderData,
          id: newId,
          orderNumber: `JOB-${new Date().getFullYear()}-${String(printOrders.length + 1).padStart(4, '0')}`,
          createdAt: todayStr
        } as PrintJobOrder;
        onSave(created);
      }
    }

    posSound.playSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>{isEditMode ? 'تعديل أمر تشغيل وتفصيل' : 'أمر تشغيل وتفصيل جديد (Work Order)'}</span>
                {orderToEdit && (
                  <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-md">
                    {orderToEdit.orderNumber}
                  </span>
                )}
              </h3>
              <p className="text-xs text-indigo-100">
                تسجيل بيانات الموديل، جدول القياسات والكميات والألوان، القماش، مراحل التشغيل، وأجر الخياط
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Order Summary Ribbon */}
        <div className="bg-slate-900 text-white px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold">
              <User className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300">الزبون:</span>
              <span className="text-white">{customerName || 'غير محدد'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300">الموديل:</span>
              <span className="text-white">{garmentType || 'ثوب تفصيل'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <Boxes className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">الكمية:</span>
              <span className="font-mono text-amber-300">{quantity} قطعة</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 font-bold">
              <span className="text-slate-400">الإجمالي:</span>
              <span className="font-mono text-emerald-400">{totalPrice.toLocaleString('ar-SA')} {settings.currency}</span>
            </div>
            <div className="flex items-center gap-1 font-bold">
              <span className="text-slate-400">المتبقي:</span>
              <span className={`font-mono ${remainingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {remainingBalance.toLocaleString('ar-SA')} {settings.currency}
              </span>
            </div>
            <div className="flex items-center gap-1 font-bold text-[11px] bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              <span className="text-indigo-300">المرحلة:</span>
              <span className="text-amber-300">
                {status === 'cutting' ? '✂️ قص' : status === 'sewing' ? '🧵 خياطة' : status === 'ironing_finishing' ? '👔 كي وتشطيب' : status === 'ready' ? '✨ جاهز' : '📦 تم التسليم'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-1 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. الزبون والموديل والقماش</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('measurements')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'measurements'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Ruler className="w-4 h-4" />
              <span>2. الألوان والمقاسات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
                activeTab === 'materials'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>3. الخامات والمستلزمات</span>
              {suppliedMaterials.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'materials' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {suppliedMaterials.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('labor')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
                activeTab === 'labor'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>4. التشغيل وعمالة الورشة</span>
              {assignedWorkersLabor.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'labor' ? 'bg-white text-indigo-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {assignedWorkersLabor.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('financials')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'financials'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>5. الحساب المالي والربحية</span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-5 space-y-4 min-h-[460px] max-h-[72vh] overflow-y-auto text-slate-900 bg-slate-50/50">
          
          {/* TAB 1: Customer & Model Information */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Section 1: Customer Information - Single Line Row */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>بيانات الزبون صاحب الطلبية:</span>
                </h4>
                {newCustomerMode ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-900">
                      <span>زبون جديد:</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="اسم الزبون الكامل *"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>
                    <div className="w-full sm:w-52">
                      <input
                        type="text"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="رقم الجوال / واتساب *"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomerMode(false);
                        if (customers.length > 0) {
                          setSelectedCustomerId(customers[0].id);
                          setCustomerName(customers[0].name);
                          setCustomerPhone(customers[0].phone || '');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                    >
                      اختيار مسجل
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-900">
                      <span>الزبون:</span>
                    </div>
                    <div className="flex-1">
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''} {c.savedMeasurements ? '📏 مقاسات محفوظة' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-44">
                      <input
                        type="text"
                        readOnly
                        value={customerPhone}
                        placeholder="جوال الزبون"
                        className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomerMode(true);
                        setCustomerName('');
                        setCustomerPhone('');
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                    >
                      + زبون جديد
                    </button>
                  </div>
                )}
              </div>

              {/* Section 2: Model Type, Model Code, Description & Quantity */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>نوع الموديل:</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 font-medium">استدلال تلقائي</span>
                    </label>
                    <ModelTypeAutocomplete
                      value={garmentType}
                      onChange={(val) => {
                        setGarmentType(val);
                        if (!title || title.trim() === '' || title === 'تفصيل ثوب وموديل') {
                          setTitle(val);
                        }
                      }}
                      onSelectSuggestion={(selectedVal) => {
                        setGarmentType(selectedVal);
                        if (!title || title.trim() === '' || title === 'تفصيل ثوب وموديل' || title === 'ثوب كلاسيك سعودي مع كبك وياقة صدف' || title === garmentType) {
                          setTitle(selectedVal);
                        }
                      }}
                      placeholder="اكتب نوع الموديل (ثوب، فستان...)"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم الموديل:
                    </label>
                    <input
                      type="text"
                      value={modelCode}
                      onChange={(e) => setModelCode(e.target.value)}
                      placeholder="كود (مثال: M-102)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      وصف الموديل / اسم الطلبية:
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: ثوب سعودي مطرز كبك ياقة صدف عريضة"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الكمية (القطع):
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                        className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-white border-y border-slate-300 py-1.5 text-xs font-bold text-slate-900 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fabric Source & Details */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-800">مصدر القماش:</span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="fabricSource"
                        checked={fabricSource === 'workshop'}
                        onChange={() => setFabricSource('workshop')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>من أقمشة المشغل / الورشة (خصم المخزون)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="fabricSource"
                        checked={fabricSource === 'customer'}
                        onChange={() => setFabricSource('customer')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>قماش مُحضَر من الزبون</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">الأمتار المستهلكة:</span>
                    <input
                      type="number"
                      step="0.25"
                      value={fabricLengthMeters}
                      onChange={(e) => setFabricLengthMeters(parseFloat(e.target.value) || 0)}
                      className="w-18 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center text-slate-900"
                    />
                    <span className="text-xs text-slate-500">متر</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {fabricSource === 'workshop' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">اختر صنف القماش من المخزن:</label>
                      <select
                        value={selectedFabricItem}
                        onChange={(e) => {
                          setSelectedFabricItem(e.target.value);
                          const itm = inventory.find(i => i.id === e.target.value);
                          if (itm) {
                            setFabricType(itm.name);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- اختر القماش المتاح بالمستودع --</option>
                        {fabricInventory.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} (رصيد: {f.stockQuantity} {f.unit || 'متر'})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">نوع قماش الزبون:</label>
                      <input
                        type="text"
                        value={fabricType}
                        onChange={(e) => setFabricType(e.target.value)}
                        placeholder="مثال: كتان سويسري، كشمير..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">نوع الخامة المقترح:</label>
                    <select
                      value={fabricType}
                      onChange={(e) => setFabricType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      {COMMON_FABRICS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">لون القماش ونقشته:</label>
                    <input
                      type="text"
                      value={fabricColor}
                      onChange={(e) => setFabricColor(e.target.value)}
                      placeholder="مثال: أبيض ناصع، سكري، كحلي مقلم..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Model & Garment Design Image Attachment */}
              <ModelImageAttachment
                primaryImage={modelImageUrl}
                additionalImages={modelImages}
                onChange={(primary, additional) => {
                  setModelImageUrl(primary);
                  setModelImages(additional);
                }}
                title={title}
                modelCode={modelCode}
                garmentType={garmentType}
              />
            </div>
          )}

          {/* TAB 2: Color, Sizes, Quantities & Finishing */}
          {activeTab === 'measurements' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <ColorSizeQuantityTable
                rows={colorSizeMatrix}
                availableSizes={availableSizes}
                onChange={(updatedRows, updatedSizes) => {
                  setColorSizeMatrix(updatedRows);
                  setAvailableSizes(updatedSizes);
                }}
                onTotalQuantityChange={(newTotal) => {
                  if (newTotal > 0) {
                    handleQuantityChange(newTotal);
                  }
                }}
              />

              {/* Bespoke Individual Measurements Trigger Drawer */}
              <div className="flex items-center justify-between bg-purple-50/50 border border-purple-100 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-slate-700">
                    تسجيل أبعاد بدنية تفصيلية لشخص محدد (طول، كتف، صدر، خصر، كم...)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMeasurementsDetailedModal(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>فتح القياسات الفردية التخصصية</span>
                </button>
              </div>

              {/* Finishing & Customization Options */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <label className="block text-xs font-bold text-slate-800 mb-2.5">
                  خيارات التشطيب والإضافات الخاصة (Finishing & Extras):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FINISHING_OPTIONS_LIST.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleFinishing(opt)}
                      className={`p-2.5 rounded-xl border text-right text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedFinishing.includes(opt)
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{opt}</span>
                      {selectedFinishing.includes(opt) && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Supplied Materials & Accessories */}
          {activeTab === 'materials' && (
            <div className="animate-in fade-in duration-200">
              <div className="border border-indigo-200 bg-white rounded-xl shadow-xs overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-purple-50 p-3.5 border-b border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          جدول الخامات والإكسسوارات الموردة للتشغيل
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">
                          {suppliedMaterials.length} بنود
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        متابعة الأصناف الموردة ومقارنة الكمية المطلوبة بالمستلمة واحتساب النواقص آلياً
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddMaterial()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة بند خامة / إكسسوار</span>
                  </button>
                </div>

                <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">إضافة سريعة:</span>
                  {COMMON_MATERIAL_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddMaterial(preset)}
                      className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {suppliedMaterials.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50/30">
                    <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-600 mb-1">
                      لم يتم تسجيل خامات أو إكسسوارات موردة لهذا الأمر حتى الآن
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddMaterial()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة أول بند خامة / إكسسوار</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5 w-8 text-center">#</th>
                          <th className="py-2 px-2.5 min-w-[180px]">الصنف / الخامة أو الإكسسوار</th>
                          <th className="py-2 px-2.5 w-24 text-center">العدد المطلوب</th>
                          <th className="py-2 px-2.5 w-24 text-center">كمية مستلمة</th>
                          <th className="py-2 px-2.5 w-24 text-center">كمية ناقصة</th>
                          <th className="py-2 px-2.5 w-24">الوحدة</th>
                          <th className="py-2 px-2.5 min-w-[160px]">ملاحظات ومواصفات</th>
                          <th className="py-2 px-2 w-10 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-900">
                        {suppliedMaterials.map((mat, index) => {
                          const isFullyReceived = mat.missingQuantity <= 0 && mat.requiredQuantity > 0;
                          const hasMissing = mat.missingQuantity > 0;

                          return (
                            <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-2 text-center font-mono text-slate-400 font-semibold text-[11px]">
                                {index + 1}
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={mat.itemName}
                                  onChange={(e) => handleUpdateMaterial(mat.id, 'itemName', e.target.value)}
                                  placeholder="مثال: أزرار صدف..."
                                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={mat.requiredQuantity || ''}
                                  onChange={(e) => handleUpdateMaterial(mat.id, 'requiredQuantity', e.target.value)}
                                  placeholder="0"
                                  className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-bold text-center text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={mat.receivedQuantity || ''}
                                  onChange={(e) => handleUpdateMaterial(mat.id, 'receivedQuantity', e.target.value)}
                                  placeholder="0"
                                  className="w-full bg-emerald-50/50 border border-emerald-300 rounded px-1.5 py-1 text-xs font-bold text-center text-emerald-800 focus:outline-none focus:border-emerald-500 font-mono"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <div className={`px-2 py-1 rounded text-xs font-bold font-mono inline-flex items-center justify-center gap-1 ${
                                  isFullyReceived
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : hasMissing
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <span>{mat.missingQuantity ?? Math.max(0, mat.requiredQuantity - mat.receivedQuantity)}</span>
                                  {isFullyReceived && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  {hasMissing && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <select
                                  value={mat.unit || 'قطعة'}
                                  onChange={(e) => handleUpdateMaterial(mat.id, 'unit', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="قطعة">قطعة</option>
                                  <option value="متر">متر</option>
                                  <option value="يارده">ياردة</option>
                                  <option value="حبة">حبة</option>
                                  <option value="طقم">طقم</option>
                                  <option value="بكرة">بكرة</option>
                                </select>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={mat.notes || ''}
                                  onChange={(e) => handleUpdateMaterial(mat.id, 'notes', e.target.value)}
                                  placeholder="ملاحظات الصنف..."
                                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMaterial(mat.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Production Stages & Daily Worker Labor Schedule */}
          {activeTab === 'labor' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Stage & Production Dates Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-indigo-600" />
                  <span>مرحلة التشغيل ومواعيد دخول الموديل والتسليم:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">المرحلة الحالية للتشغيل:</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PrintOrderStatus)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="cutting">✂️ 1. مرحلة القص والفصال</option>
                      <option value="sewing">🧵 2. مرحلة الخياطة والتجميع</option>
                      <option value="ironing_finishing">👔 3. مرحلة الكي والتشطيب</option>
                      <option value="ready">✨ 4. جاهز للتسليم والبروفة</option>
                      <option value="delivered">📦 5. تم التسليم للزبون</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الخياط المسؤول المعين:</label>
                    <select
                      value={assignedTailorId}
                      onChange={(e) => setAssignedTailorId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- لم يعين بعد --</option>
                      {tailors.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.jobTitle})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">أجر الخياط عن القطعة ({settings.currency}):</label>
                    <input
                      type="number"
                      step="1"
                      value={pieceRateWage}
                      onChange={(e) => setPieceRateWage(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ دخول الموديل للعمل: *</label>
                    <input
                      type="date"
                      required
                      value={workStartDate}
                      onChange={(e) => setWorkStartDate(e.target.value)}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">موعد القياس / البروفة:</label>
                    <input
                      type="date"
                      value={fittingDate}
                      onChange={(e) => setFittingDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ التسليم النهائي المحدد للزبون: *</label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full bg-rose-50 border border-rose-300 rounded-lg px-3 py-2 text-xs font-bold text-rose-800 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات خاصة للقص والخياطة:</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ملاحظات تفصيلية لغرفة القص والخياط..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* DAILY LABOR TIME LOGS & OVERTIME CALCULATOR SECTION */}
              <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-400" />
                      <span>جدول أوقات وساعات العمل اليومية للموديل ومقارنة الأوفرتايم تلقائياً</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      تسجيل العمال باليوم والساعات بالوقت (من ➔ إلى). يقارن النظام آلياً مع ساعات الدوام الرسمي لاحتساب الأوفرتايم ومضاعف الأجر.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoPopulateTailors}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>تعيين طاقم الورشة افتراضياً</span>
                    </button>
                  </div>
                </div>

                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">أيام العمل المسجلة:</span>
                      <strong className="text-sm text-white font-mono">
                        {Array.from(new Set(dailyLaborLogs.map(s => s.date))).length} يوم
                      </strong>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">ساعات رسمية:</span>
                      <strong className="text-sm text-emerald-300 font-mono">
                        {dailyLaborLogs.reduce((s, l) => s + (l.regularHours || 0), 0).toFixed(1)} س
                      </strong>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">ساعات أوفرتايم:</span>
                      <strong className="text-sm text-amber-300 font-mono">
                        {dailyLaborLogs.reduce((s, l) => s + (l.overtimeHours || 0), 0).toFixed(1)} س
                      </strong>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">تكلفة العمالة الإجمالية:</span>
                      <strong className="text-sm text-teal-300 font-mono">
                        {totalLaborCost.toLocaleString('ar-SA')} {settings.currency}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Form to Add Daily Time Slot */}
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-slate-700 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>إضافة قيد فترة عمل بالوقت لعام الموديل اليومي:</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      تحديد وقت البدء والانتهاء لحساب الدوام والأوفرتايم آلياً
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">التاريخ:</label>
                      <input
                        type="date"
                        value={slotDate}
                        onChange={(e) => setSlotDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">الموظف / العامل:</label>
                      <select
                        value={slotEmpId}
                        onChange={(e) => setSlotEmpId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- اختر العامل بالموديل --</option>
                        {employees.map(emp => {
                          const rate = getEmployeeCalculatedRate(emp);
                          return (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.jobTitle || 'فني'}) - أجر الساعة: {rate} {settings.currency}/س
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">المرحلة / المهمة:</label>
                      <select
                        value={slotStage}
                        onChange={(e) => setSlotStage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="قص وفصال">✂️ قص وفصال</option>
                        <option value="خياطة وتجميع">🧵 خياطة وتجميع</option>
                        <option value="تطريز وشك">🪡 تطريز وشك</option>
                        <option value="كي وتشطيب">👔 كي وتشطيب</option>
                        <option value="جودة وتفتيش">✨ جودة وتفتيش</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">وقت البدء:</label>
                      <input
                        type="time"
                        value={slotStartTime}
                        onChange={(e) => setSlotStartTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">وقت الانتهاء:</label>
                      <input
                        type="time"
                        value={slotEndTime}
                        onChange={(e) => setSlotEndTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Realtime Live Preview Box & Quick Presets */}
                  {slotEmpId && (
                    (() => {
                      const selectedEmp = employees.find(e => e.id === slotEmpId);
                      const m = calculateSlotMetrics(slotStartTime, slotEndTime, selectedEmp);

                      return (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-slate-400">التحليل الآلي للفترة:</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-mono font-bold">
                              ⏱️ الساعات: {m.hoursWorked} س
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono font-bold">
                              🟢 رسمي: {m.regularHours} س ({m.regularLaborCost} {settings.currency})
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono font-bold">
                              ⚡ أوفرتايم (x{m.overtimeMultiplier}): {m.overtimeHours} س ({m.overtimeLaborCost} {settings.currency})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">إجمالي الفترة:</span>
                            <span className="text-sm font-bold font-mono text-emerald-400">
                              {m.totalLaborCost} {settings.currency}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">اختصارات الفترات:</span>
                      <button
                        type="button"
                        onClick={() => { setSlotStartTime('08:00'); setSlotEndTime('16:00'); }}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px]"
                      >
                        ☀️ الدوام الرسمي (08:00 - 16:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSlotStartTime('16:00'); setSlotEndTime('19:00'); }}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-700 text-amber-300 rounded border border-amber-900/50 text-[10px]"
                      >
                        ⚡ أوفرتايم مسائي (16:00 - 19:00)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={slotNotes}
                        onChange={(e) => setSlotNotes(e.target.value)}
                        placeholder="ملاحظة خاصة بالفترة..."
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none w-48"
                      />
                      <button
                        type="button"
                        onClick={handleAddDailySlot}
                        disabled={!slotEmpId}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ تسجيل قيد اليوم</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Daily Time Slots Table */}
                {dailyLaborLogs.length === 0 ? (
                  <div className="p-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                    لم يتم تسجيل فترات يومية بالوقت بعد لهذا الموديل. يمكنك إضافتها أعلاه أو إضافة العمال بشكل إجمالي أدناه.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700 text-[11px]">
                        <tr>
                          <th className="py-2 px-3 w-8 text-center">#</th>
                          <th className="py-2 px-3 w-32">اليوم والتاريخ</th>
                          <th className="py-2 px-3">العامل / الموظف</th>
                          <th className="py-2 px-3 w-28">المرحلة</th>
                          <th className="py-2 px-3 w-28 text-center">الوقت من ➔ إلى</th>
                          <th className="py-2 px-3 w-24 text-center">الساعات</th>
                          <th className="py-2 px-3 min-w-[160px] text-center">حالة الدوام / الأوفرتايم</th>
                          <th className="py-2 px-3 w-28 text-center">التكلفة ({settings.currency})</th>
                          <th className="py-2 px-3 w-10 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {dailyLaborLogs.map((slot, idx) => {
                          const dayName = getArabicDayName(slot.date);
                          const isOvertime = slot.slotType === 'overtime';
                          const isMixed = slot.slotType === 'mixed';

                          return (
                            <tr key={slot.id || idx} className="hover:bg-slate-900/80 transition-colors">
                              <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono text-[11px]">
                                <span className="font-bold text-white block">{slot.date}</span>
                                <span className="text-[10px] text-slate-400">{dayName}</span>
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                {slot.employeeName}
                                {slot.jobTitle ? <span className="text-[10px] text-slate-400 font-normal block">{slot.jobTitle}</span> : null}
                              </td>
                              <td className="py-2 px-3 font-semibold text-indigo-300">{slot.stageOrRole}</td>
                              <td className="py-2 px-3 text-center font-mono text-emerald-300 font-bold dir-ltr">
                                {slot.startTime} - {slot.endTime}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-white">
                                {slot.hoursWorked} س
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isOvertime ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-amber-400" />
                                    <span>أوفر تايم بالكامل ({slot.overtimeHours}س x{slot.overtimeMultiplier})</span>
                                  </span>
                                ) : isMixed ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 text-[10px] font-bold inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-400" />
                                    <span>مختلط ({slot.regularHours}س رسمي + {slot.overtimeHours}س أوفرتايم)</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>دوام رسمي (100%)</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-emerald-400 text-sm">
                                {slot.totalLaborCost.toLocaleString('ar-SA')} {settings.currency}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDailySlot(slot.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-950/60 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Additional / Lump Sum Workers List (Fallback & Summary) */}
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">
                      ملخص وساعات عمال الموديل التراكمي (Labor Summary Breakdown):
                    </span>
                  </div>

                  {assignedWorkersLabor.length === 0 ? (
                    <div className="p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-lg text-center text-slate-400 text-xs">
                      لا يوجد ملخص تراكمي للعمالة حتى الآن.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700 text-[11px]">
                          <tr>
                            <th className="py-2 px-3 w-8 text-center">#</th>
                            <th className="py-2 px-3">العامل / الموظف</th>
                            <th className="py-2 px-3 w-32">المهمة / المرحلة</th>
                            <th className="py-2 px-3 w-28 text-center">إجمالي الساعات</th>
                            <th className="py-2 px-3 w-28 text-center">رسمي / أوفرتايم</th>
                            <th className="py-2 px-3 w-28 text-center">أجر الساعة ({settings.currency})</th>
                            <th className="py-2 px-3 w-32 text-center">إجمالي الأجر</th>
                            <th className="py-2 px-3 w-10 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {assignedWorkersLabor.map((worker, idx) => {
                            const empObj = employees.find(e => e.id === worker.employeeId);
                            return (
                              <tr key={worker.id || idx} className="hover:bg-slate-900/80 transition-colors">
                                <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                                <td className="py-2 px-3 font-bold text-white">
                                  <div>{worker.employeeName}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {worker.jobTitle || empObj?.jobTitle || 'فني'}
                                  </div>
                                </td>
                                <td className="py-2 px-3">{worker.stageOrRole}</td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-emerald-300">
                                  {worker.hoursWorked} س
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-[11px]">
                                  <span className="text-emerald-400">{worker.regularHours || 0} س رسمي</span>
                                  {worker.overtimeHours ? (
                                    <span className="text-amber-400 block">+ {worker.overtimeHours} س إضافي</span>
                                  ) : null}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-amber-300">
                                  {worker.hourlyRate} {settings.currency}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-emerald-400 text-sm">
                                  {worker.totalLaborCost.toLocaleString('ar-SA')} {settings.currency}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWorkerLabor(worker.id)}
                                    className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-950/60 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Financials & Profit Margin */}
          {activeTab === 'financials' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-200/80 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span>الحساب المالي والعربون والدفعات:</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">سعر تفصيل القطعة ({settings.currency}):</label>
                    <input
                      type="number"
                      value={unitCost}
                      onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">إجمالي الحساب ({settings.currency}):</label>
                    <input
                      type="number"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-indigo-50 border border-indigo-300 rounded-lg px-3 py-2 text-sm font-bold text-indigo-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">العربون المستلم مقدماً ({settings.currency}):</label>
                    <input
                      type="number"
                      value={depositPaid}
                      onChange={(e) => setDepositPaid(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-emerald-400 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 focus:outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">المتبقي عند الاستلام ({settings.currency}):</label>
                    <div className={`px-3 py-2 text-sm font-bold rounded-lg border font-mono ${
                      remainingBalance > 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {remainingBalance.toLocaleString('ar-SA')} {settings.currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profitability & Production Cost Summary Cards */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-lg space-y-3">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>تحليل التكلفة والهامش الربحي المالي للموديل:</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-lg">
                    <span className="text-[11px] text-slate-400 block mb-0.5">أجور وساعات العمالة:</span>
                    <strong className="text-sm font-mono font-bold text-emerald-400">
                      {totalLaborCost.toLocaleString('ar-SA')} {settings.currency}
                    </strong>
                  </div>

                  <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-lg">
                    <span className="text-[11px] text-slate-400 block mb-0.5">تكلفة القماش والخامات:</span>
                    <strong className="text-sm font-mono font-bold text-blue-400">
                      {(totalFabricCost + totalSuppliedMaterialsCost).toLocaleString('ar-SA')} {settings.currency}
                    </strong>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-700/80 p-2.5 rounded-lg">
                    <span className="text-[11px] text-indigo-300 block mb-0.5">التكلفة الإنتاجية الكلية:</span>
                    <strong className="text-sm font-mono font-bold text-amber-300">
                      {totalProductionCost.toLocaleString('ar-SA')} {settings.currency}
                    </strong>
                  </div>

                  <div className="bg-slate-800/90 border border-slate-700 p-2.5 rounded-lg">
                    <span className="text-[11px] text-slate-400 block mb-0.5">تكلفة إنتاج القطعة:</span>
                    <strong className="text-sm font-mono font-bold text-purple-300">
                      {productionCostPerUnit.toLocaleString('ar-SA')} {settings.currency}
                    </strong>
                  </div>

                  <div className={`border p-2.5 rounded-lg col-span-2 sm:col-span-1 ${
                    expectedProfit >= 0
                      ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-700/80 text-rose-200'
                  }`}>
                    <span className="text-[11px] block mb-0.5 opacity-90">هامش الربح المتوقع:</span>
                    <div className="flex items-center justify-between gap-1 font-mono font-bold text-sm">
                      <span>{expectedProfit.toLocaleString('ar-SA')} {settings.currency}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 font-bold">
                        ({profitMarginPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Step Navigation & Save Action */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            {/* Previous Step Button */}
            {activeTab !== 'info' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'measurements') setActiveTab('info');
                  else if (activeTab === 'materials') setActiveTab('measurements');
                  else if (activeTab === 'labor') setActiveTab('materials');
                  else if (activeTab === 'financials') setActiveTab('labor');
                }}
                className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
              >
                ➔ السابق
              </button>
            )}

            {/* Next Step Button */}
            {activeTab !== 'financials' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'info') setActiveTab('measurements');
                  else if (activeTab === 'measurements') setActiveTab('materials');
                  else if (activeTab === 'materials') setActiveTab('labor');
                  else if (activeTab === 'labor') setActiveTab('financials');
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                التالي ⬅
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 bg-slate-200/80 rounded-xl text-slate-800">
              <span>الإجمالي: {totalPrice.toLocaleString('ar-SA')} {settings.currency}</span>
              <span className="text-slate-400">|</span>
              <span className={remainingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                المتبقي: {remainingBalance.toLocaleString('ar-SA')} {settings.currency}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditMode ? 'حفظ التعديلات' : 'إصدار أمر التشغيل والتفصيل'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Measurements Detailed Modal */}
      {showMeasurementsDetailedModal && (
        <CustomerMeasurementsModal
          customer={{
            id: selectedCustomerId || 'temp',
            code: 'CUST-TEMP',
            type: 'customer',
            name: customerName || 'زبون',
            phone: customerPhone,
            balance: 0,
            savedMeasurements: measurements
          }}
          initialMeasurements={measurements}
          onSave={(newMeasurements) => {
            setMeasurements(newMeasurements);
            setShowMeasurementsDetailedModal(false);
          }}
          onClose={() => setShowMeasurementsDetailedModal(false)}
        />
      )}
    </div>
  );
};
