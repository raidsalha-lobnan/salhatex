import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { PrintJobOrder, PrintServiceType, PrintOrderStatus, TailoringMeasurements, Party, PaymentMethod, LineAttachment, SuppliedMaterialItem, ColorSizeQuantityRow } from '../../types';
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
  Palette
} from 'lucide-react';
import { posSound } from '../../utils/audio';
import { CustomerMeasurementsModal } from './CustomerMeasurementsModal';
import { ModelTypeAutocomplete } from './ModelTypeAutocomplete';
import { ColorSizeQuantityTable, DEFAULT_SIZES } from './ColorSizeQuantityTable';
import { ModelImageAttachment } from './ModelImageAttachment';

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

  // Tailors & Stages
  const [status, setStatus] = useState<PrintOrderStatus>(orderToEdit?.status || 'cutting');
  const [assignedTailorId, setAssignedTailorId] = useState(orderToEdit?.assignedTailorId || (tailors[0]?.id || ''));
  const [pieceRateWage, setPieceRateWage] = useState<number>(orderToEdit?.pieceRateWage || 25);

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [fittingDate, setFittingDate] = useState(orderToEdit?.fittingDate || '');
  const [deliveryDate, setDeliveryDate] = useState(orderToEdit?.deliveryDate || nextWeekStr);

  // Financials
  const [unitCost, setUnitCost] = useState<number>(orderToEdit?.unitCost || 180);
  const [totalPrice, setTotalPrice] = useState<number>(orderToEdit?.totalPrice || (orderToEdit?.unitCost ? orderToEdit.unitCost * (orderToEdit.quantity || 1) : 180));
  const [depositPaid, setDepositPaid] = useState<number>(orderToEdit?.depositPaid || 50);
  const [notes, setNotes] = useState(orderToEdit?.notes || '');

  // Calculate remaining
  const remainingBalance = Math.max(0, totalPrice - depositPaid);

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
      fittingDate: fittingDate || undefined,
      deliveryDate: deliveryDate || nextWeekStr,
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

        {/* Modal Form Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-slate-900">
          {/* Section 1: Customer Information - Single Line Row */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            {newCustomerMode ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-900">
                  <User className="w-4 h-4 text-indigo-600" />
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
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg shrink-0 transition-colors"
                >
                  اختيار مسجل
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-900">
                  <User className="w-4 h-4 text-indigo-600" />
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
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg shrink-0 transition-colors"
                >
                  + زبون جديد
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Model Type, Model Code, Description & Quantity - ALL IN ONE SINGLE LINE */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              {/* 1. نوع الموديل (قائمة استدلالية ذكية Autocomplete تقترح الموديلات السابقة بقاعدة البيانات) */}
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
                    // إذا كان الوصف فارغاً أو يطابق القيمة القديمة أو القيمة الافتراضية، قم بتحديثه
                    if (!title || title.trim() === '' || title === 'تفصيل ثوب وموديل' || title === 'ثوب كلاسيك سعودي مع كبك وياقة صدف' || title === garmentType) {
                      setTitle(selectedVal);
                    }
                  }}
                  placeholder="اكتب نوع الموديل (ثوب، فستان...)"
                />
              </div>

              {/* 2. رقم / كود الموديل */}
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

              {/* 3. وصف الموديل */}
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

              {/* 4. الكمية */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الكمية (القطع):
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                    className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-700"
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
                    className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fabric Source & Details */}
            <div className="mt-3 bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 space-y-3">
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

          {/* Section 3: Model & Garment Design Image (إرفاق وعرض صورة الموديل بشكل واضح) */}
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

          {/* Section 4: Color, Sizes, and Quantities Table (جدول القياسات والكميات والألوان) */}
          <div className="space-y-2.5">
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

            {/* Optional bespoke individual measurements drawer trigger */}
            <div className="flex items-center justify-between bg-purple-50/50 border border-purple-100 rounded-xl px-3.5 py-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-slate-700">
                  هل تحتاج لتسجيل أبعاد بدنية تفصيلية لشخص محدد (طول، كتف، صدر، خصر، كم...)؟
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMeasurementsDetailedModal(true)}
                className="px-3 py-1 bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>فتح القياسات الفردية التخصصية</span>
              </button>
            </div>
          </div>

          {/* Section 4: Finishing & Customization Options */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              خيارات التشطيب والإضافات الخاصة (Finishing & Extras):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FINISHING_OPTIONS_LIST.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleFinishing(opt)}
                  className={`p-2 rounded-lg border text-right text-xs transition-all flex items-center justify-between ${
                    selectedFinishing.includes(opt)
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{opt}</span>
                  {selectedFinishing.includes(opt) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Supplied Materials & Accessories Table (جدول الخامات والإكسسوارات الموردة) */}
          <div className="border border-indigo-200 bg-white rounded-xl shadow-xs overflow-hidden">
            {/* Table Section Header */}
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

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleAddMaterial()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة بند خامة / إكسسوار</span>
                </button>
              </div>
            </div>

            {/* Quick Presets Bar */}
            <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">إضافة سريعة:</span>
              {COMMON_MATERIAL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddMaterial(preset)}
                  className="px-2 py-0.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-md text-[11px] font-medium transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Materials Table */}
            {suppliedMaterials.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50/30">
                <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  لم يتم تسجيل خامات أو إكسسوارات موردة لهذا الأمر حتى الآن
                </p>
                <p className="text-[11px] text-slate-400 mb-3">
                  يمكنك إضافة بنود كالأزرار، السحابات، البطانات، الخيوط والكتافيات لمتابعة المستلم والنواقص
                </p>
                <button
                  type="button"
                  onClick={() => handleAddMaterial()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
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

                          {/* Item Name */}
                          <td className="py-2 px-2">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={mat.itemName}
                                onChange={(e) => handleUpdateMaterial(mat.id, 'itemName', e.target.value)}
                                placeholder="مثال: أزرار صدف، سحاب مخفي، بطانة..."
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                              />
                              {inventory.length > 0 && (
                                <select
                                  value={mat.inventoryItemId || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const item = inventory.find(i => i.id === selectedId);
                                    if (item) {
                                      handleUpdateMaterial(mat.id, 'inventoryItemId', selectedId);
                                      handleUpdateMaterial(mat.id, 'itemName', item.name);
                                      if (item.unit) {
                                        handleUpdateMaterial(mat.id, 'unit', item.unit);
                                      }
                                    } else {
                                      handleUpdateMaterial(mat.id, 'inventoryItemId', undefined);
                                    }
                                  }}
                                  className="w-full bg-slate-50 text-[10px] text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                                >
                                  <option value="">-- أو اختر من مخزون المستودع --</option>
                                  {inventory.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                      {inv.name} (رصيد: {inv.stockQuantity} {inv.unit || ''})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>

                          {/* Required Quantity */}
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

                          {/* Received Quantity */}
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

                          {/* Missing Quantity (Auto) */}
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

                          {/* Unit */}
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
                              <option value="درزن">درزن</option>
                              <option value="كيس">كيس</option>
                              <option value="كجم">كجم</option>
                            </select>
                          </td>

                          {/* Notes */}
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={mat.notes || ''}
                              onChange={(e) => handleUpdateMaterial(mat.id, 'notes', e.target.value)}
                              placeholder="ملاحظات الصنف، كود اللون، المقاس..."
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                          </td>

                          {/* Delete Action */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(mat.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="حذف البند"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Table Summary Footer */}
                <div className="bg-slate-50 p-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-slate-700">
                    <span>
                      عدد الأصناف الموردة: <strong className="font-mono font-bold text-slate-900">{suppliedMaterials.length}</strong>
                    </span>
                    <span>
                      إجمالي المطلوب: <strong className="font-mono font-bold text-indigo-700">
                        {suppliedMaterials.reduce((sum, m) => sum + (m.requiredQuantity || 0), 0)}
                      </strong>
                    </span>
                    <span>
                      إجمالي المستلم: <strong className="font-mono font-bold text-emerald-700">
                        {suppliedMaterials.reduce((sum, m) => sum + (m.receivedQuantity || 0), 0)}
                      </strong>
                    </span>
                  </div>

                  <div>
                    {suppliedMaterials.some(m => (m.missingQuantity || 0) > 0) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-bold font-mono text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>يوجد نواقص خامات: {suppliedMaterials.reduce((sum, m) => sum + (m.missingQuantity || 0), 0)} وحدة</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>جميع الخامات الموردة مكتملة بالكامل ✔️</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Production Stages & Tailor Assignment */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-indigo-600" />
              <span>مرحلة التشغيل وتعيين الخياط المسؤول:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Stage */}
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

              {/* Tailor */}
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

              {/* Piece Rate Wage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">أجر الخياط عن القطعة ({settings.currency}):</label>
                <input
                  type="number"
                  step="1"
                  value={pieceRateWage}
                  onChange={(e) => setPieceRateWage(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Fitting Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">موعد القياس / البروفة:</label>
                <input
                  type="date"
                  value={fittingDate}
                  onChange={(e) => setFittingDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ التسليم النهائي المحدد للزبون: *</label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 focus:outline-none focus:border-indigo-500"
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

          {/* Section 6: Financial Details (Price, Deposit, Balance) */}
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
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">إجمالي الحساب ({settings.currency}):</label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-indigo-50 border border-indigo-300 rounded-lg px-3 py-2 text-sm font-bold text-indigo-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">العربون المستلم مقدماً ({settings.currency}):</label>
                <input
                  type="number"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-emerald-400 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المتبقي عند الاستلام ({settings.currency}):</label>
                <div className={`px-3 py-2 text-sm font-bold rounded-lg border ${
                  remainingBalance > 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {remainingBalance.toLocaleString('ar-SA')} {settings.currency}
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Final Save Action Button inside Form End */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>{isEditMode ? 'حفظ التعديلات على أمر التشغيل والتفصيل' : 'حفظ وإصدار أمر التشغيل والتفصيل'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isEditMode ? 'حفظ التعديلات على أمر التشغيل' : 'إصدار أمر التشغيل والتفصيل'}</span>
          </button>
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
