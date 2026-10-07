import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { PrintJobOrder, PrintOrderStatus, TailoringMeasurements, Invoice } from '../types';
import {
  Scissors,
  Layers,
  Ruler,
  Calendar,
  User,
  Phone,
  DollarSign,
  Plus,
  Printer,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Edit,
  Eye,
  Trash2,
  Image as ImageIcon,
  Maximize2
} from 'lucide-react';
import { posSound } from '../utils/audio';
import { SewingWorkOrderModal } from './workshop/SewingWorkOrderModal';
import { CustomerMeasurementsModal } from './workshop/CustomerMeasurementsModal';
import { ImagePreviewModal } from './workshop/ImagePreviewModal';

export const SEWING_WORKFLOW_STAGES: Array<{
  id: PrintOrderStatus;
  label: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  bgLight: string;
  description: string;
}> = [
  {
    id: 'cutting',
    label: '1. مرحلة القص والفصال',
    icon: '✂️',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-300',
    bgLight: 'bg-amber-50/40',
    description: 'فصال القماش وقص الباترون حسب جدول القياسات والكميات والألوان'
  },
  {
    id: 'sewing',
    label: '2. مرحلة الخياطة والتجميع',
    icon: '🧵',
    color: 'text-indigo-700',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900',
    borderColor: 'border-indigo-300',
    bgLight: 'bg-indigo-50/40',
    description: 'خياطة الأجزاء وتجميع الثوب / الفستان لدى الخياط'
  },
  {
    id: 'ironing_finishing',
    label: '3. الكي والتشطيب والأزرار',
    icon: '👔',
    color: 'text-purple-700',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    borderColor: 'border-purple-300',
    bgLight: 'bg-purple-50/40',
    description: 'تركيب الأزرار، السحابات، الكي بالبخار، والفحص'
  },
  {
    id: 'ready',
    label: '4. جاهز للتسليم والبروفة',
    icon: '✨',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    bgLight: 'bg-emerald-50/40',
    description: 'القطعة جاهزة في قسم التسليم بانتظار الزبون'
  },
  {
    id: 'delivered',
    label: '5. تم التسليم للزبون',
    icon: '📦',
    color: 'text-slate-700',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-900',
    borderColor: 'border-slate-300',
    bgLight: 'bg-slate-50/40',
    description: 'تم تسليم القطعة وتحصيل الحساب بالكامل'
  }
];

export const PrintOrdersView: React.FC = () => {
  const {
    printOrders,
    updatePrintOrder,
    deletePrintOrder,
    parties,
    updateParty,
    settings,
    setSelectedJobForTicket,
    currentUser,
    hasPermission
  } = useAccounting();

  // View state
  const [activeViewMode, setActiveViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<PrintJobOrder | null>(null);

  const [measurementsModalCustomer, setMeasurementsModalCustomer] = useState<{
    orderId: string;
    customerId: string;
    customerName: string;
    measurements?: TailoringMeasurements;
  } | null>(null);

  // Fullscreen Model Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return printOrders.filter((order) => {
      // Status filter
      let matchStatus = true;
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'finishing') {
          matchStatus = order.status === 'finishing' || order.status === 'ironing_finishing';
        } else if (selectedStatusFilter === 'design' || selectedStatusFilter === 'printing') {
          matchStatus = order.status === 'cutting' || order.status === 'sewing';
        } else {
          matchStatus = order.status === selectedStatusFilter;
        }
      }

      // Search filter
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.toLowerCase().includes(q) ||
        order.title.toLowerCase().includes(q) ||
        (order.fabricType && order.fabricType.toLowerCase().includes(q)) ||
        (order.assignedTailorName && order.assignedTailorName.toLowerCase().includes(q));

      return matchStatus && matchSearch;
    });
  }, [printOrders, selectedStatusFilter, searchQuery]);

  // Advance to next stage helper
  const handleAdvanceStage = (order: PrintJobOrder) => {
    let nextStatus: PrintOrderStatus = 'sewing';
    if (order.status === 'cutting' || order.status === 'design') {
      nextStatus = 'sewing';
    } else if (order.status === 'sewing' || order.status === 'printing') {
      nextStatus = 'ironing_finishing';
    } else if (order.status === 'ironing_finishing' || order.status === 'finishing') {
      nextStatus = 'ready';
    } else if (order.status === 'ready') {
      nextStatus = 'delivered';
    } else {
      return;
    }

    updatePrintOrder(order.id, { status: nextStatus });
    posSound.playBeep();
  };

  // Open Ticket
  const handleOpenTicket = (order: PrintJobOrder) => {
    setSelectedJobForTicket({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      title: order.title,
      quantity: order.quantity,
      status: order.status,
      deadline: order.deliveryDate,
      totalCost: order.totalPrice,
      paidDeposit: order.depositPaid,
      remainingCost: order.remainingBalance,
      createdAt: order.createdAt,
      garmentType: order.garmentType,
      modelCode: order.modelCode,
      fabricType: order.fabricType,
      fabricColor: order.fabricColor,
      fabricSource: order.fabricSource,
      assignedTailorName: order.assignedTailorName,
      finishingOptions: order.finishingOptions,
      measurements: order.measurements,
      suppliedMaterials: order.suppliedMaterials,
      notes: order.notes,
      specs: {
        paperType: order.fabricType || 'قماش مختار',
        dimensions: order.dimensions || 'مقاس تفصيل',
        colors: order.fabricColor || 'حسب العينة',
        lamination: 'كي وتشطيب بخار',
        finishing: (order.finishingOptions || []).join('، '),
        notes: order.notes
      }
    } as any);
  };

  // Open Edit
  const handleEditOrder = (order: PrintJobOrder) => {
    setOrderToEdit(order);
    setIsWorkOrderModalOpen(true);
  };

  // Delete Order
  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm('هل أنت متأكد من حذف أمر التشغيل هذا؟')) {
      deletePrintOrder(orderId);
      posSound.playBeep();
    }
  };

  // Stats calculation
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: printOrders.length,
      cutting: 0,
      sewing: 0,
      ironing_finishing: 0,
      ready: 0,
      delivered: 0
    };
    printOrders.forEach(o => {
      const st = o.status === 'design' ? 'cutting' : o.status === 'printing' ? 'sewing' : o.status === 'finishing' ? 'ironing_finishing' : o.status;
      if (counts[st] !== undefined) {
        counts[st]++;
      }
    });
    return counts;
  }, [printOrders]);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>أوامر التشغيل والإنتاج لورشة الخياطة والتفصيل</span>
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-normal">
                Work Orders & Production
              </span>
            </h2>
            <p className="text-xs text-indigo-100 mt-0.5">
              متابعة مراحل التفصيل (قص ✂️ ➔ خياطة 🧵 ➔ كي وتشطيب 👔 ➔ جاهز للتسليم ✨) وتعيين الخياطين
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setOrderToEdit(null);
            setIsWorkOrderModalOpen(true);
          }}
          className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ أمر تشغيل وتفصيل جديد</span>
        </button>
      </div>

      {/* Stage Flow Indicator Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {SEWING_WORKFLOW_STAGES.map((stage) => {
          const count = stageCounts[stage.id] || 0;
          const isSelected = selectedStatusFilter === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStatusFilter(isSelected ? 'all' : stage.id)}
              className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-900 text-white border-indigo-900 shadow-md ring-2 ring-indigo-400/50'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">{stage.icon}</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {count}
                </span>
              </div>
              <div>
                <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {stage.label}
                </div>
                <div className={`text-[11px] line-clamp-1 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {stage.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & View Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الأمر، اسم الزبون، الجوال، الموديل، الخياط..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">كافة المراحل ({printOrders.length})</option>
              <option value="cutting">✂️ 1. مرحلة القص ({stageCounts.cutting || 0})</option>
              <option value="sewing">🧵 2. مرحلة الخياطة ({stageCounts.sewing || 0})</option>
              <option value="ironing_finishing">👔 3. الكي والتشطيب ({stageCounts.ironing_finishing || 0})</option>
              <option value="ready">✨ 4. جاهز للتسليم ({stageCounts.ready || 0})</option>
              <option value="delivered">📦 5. تم التسليم ({stageCounts.delivered || 0})</option>
            </select>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
          <button
            onClick={() => setActiveViewMode('kanban')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeViewMode === 'kanban'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            لوحة المراحل (Kanban)
          </button>
          <button
            onClick={() => setActiveViewMode('list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeViewMode === 'list'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            جدول تفصيلي (List)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeViewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start">
          {SEWING_WORKFLOW_STAGES.map((stage) => {
            const stageOrders = filteredOrders.filter(o => {
              if (stage.id === 'cutting') return o.status === 'cutting' || o.status === 'design';
              if (stage.id === 'sewing') return o.status === 'sewing' || o.status === 'printing';
              if (stage.id === 'ironing_finishing') return o.status === 'ironing_finishing' || o.status === 'finishing';
              return o.status === stage.id;
            });

            return (
              <div
                key={stage.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3 flex flex-col min-h-[500px]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <span>{stage.icon}</span>
                    <span>{stage.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                    {stageOrders.length}
                  </span>
                </div>

                {/* Orders Stack */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {stageOrders.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      لا توجد طلبيات في هذه المرحلة
                    </div>
                  ) : (
                    stageOrders.map((order) => {
                      const m = order.measurements || {};
                      const hasM = Boolean(m.length || m.shoulder || m.chest);

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md transition-shadow space-y-2.5 relative group"
                        >
                          {/* Top Row: Order# & Delivery Date */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {order.orderNumber}
                            </span>
                            <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{order.deliveryDate}</span>
                            </span>
                          </div>

                          {/* Garment Title & Model Photo */}
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{order.title}</h4>
                              {order.modelCode && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                                  #{order.modelCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {order.garmentType && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100 font-medium">
                                  {order.garmentType}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 line-clamp-1">
                                {order.fabricType || 'قماش مخصص'} {order.fabricColor ? `(${order.fabricColor})` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Model Image Preview Banner */}
                          {(() => {
                            const modelImg = order.modelImageUrl || order.measurements?.modelImageUrl || (order.attachments && order.attachments.length > 0 ? order.attachments[0].data : undefined);
                            if (!modelImg) return null;
                            return (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage({
                                    isOpen: true,
                                    url: modelImg,
                                    title: order.title,
                                    subtitle: `أمر رقم: ${order.orderNumber} • الموديل: ${order.modelCode ? `#${order.modelCode}` : ''} • الزبون: ${order.customerName}`
                                  });
                                  posSound.playBeep();
                                }}
                                className="relative group/img w-full h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer flex items-center justify-center hover:border-indigo-400 transition-colors shadow-2xs"
                                title="انقر لتكبير صورة الموديل"
                              >
                                <img
                                  src={modelImg}
                                  alt={order.title}
                                  className="w-full h-full object-contain group-hover/img:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="bg-white/95 text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow flex items-center gap-1">
                                    <Maximize2 className="w-3 h-3 text-indigo-600" />
                                    <span>تكبير صورة الموديل</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Customer & Tailor */}
                          <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">الزبون:</span>
                              <strong className="text-slate-900">{order.customerName}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">الخياط:</span>
                              <span className="font-semibold text-indigo-700">
                                {order.assignedTailorName || 'لم يُعين'}
                              </span>
                            </div>
                          </div>

                          {/* Mini Measurements Summary */}
                          {hasM && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-purple-50/50 p-1.5 rounded border border-purple-100">
                              <Ruler className="w-3 h-3 text-purple-600 shrink-0" />
                              <span className="truncate">
                                ط: {m.length || '-'} | ك: {m.shoulder || '-'} | ص: {m.chest || '-'} | ك: {m.sleeveLength || '-'}
                              </span>
                            </div>
                          )}

                          {/* Supplied Materials Mini Badge */}
                          {order.suppliedMaterials && order.suppliedMaterials.length > 0 && (
                            <div className="flex items-center justify-between text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                              <span className="text-slate-500 font-semibold flex items-center gap-1">
                                📦 الخامات ({order.suppliedMaterials.length}):
                              </span>
                              {order.suppliedMaterials.some(sm => (sm.missingQuantity || 0) > 0) ? (
                                <span className="text-rose-700 font-bold font-mono">
                                  نقص: {order.suppliedMaterials.reduce((s, x) => s + (x.missingQuantity || 0), 0)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">مكتملة ✔️</span>
                              )}
                            </div>
                          )}

                          {/* Financials & Balance */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-mono">
                            <div>
                              <span className="text-slate-400 text-[10px] block font-sans">الإجمالي</span>
                              <strong className="text-slate-900">{order.totalPrice} {settings.currency}</strong>
                            </div>
                            <div className="text-left">
                              <span className="text-slate-400 text-[10px] block font-sans">المتبقي</span>
                              <strong className={order.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                {order.remainingBalance} {settings.currency}
                              </strong>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-3 gap-1 pt-1.5">
                            <button
                              onClick={() => handleOpenTicket(order)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded flex items-center justify-center gap-1"
                              title="طباعة أمر الشغل"
                            >
                              <Printer className="w-3 h-3" />
                              <span>كارت</span>
                            </button>

                            <button
                              onClick={() => handleEditOrder(order)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded flex items-center justify-center gap-1"
                              title="تعديل أمر الشغل"
                            >
                              <Edit className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>

                            {order.status !== 'delivered' ? (
                              <button
                                onClick={() => handleAdvanceStage(order)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded flex items-center justify-center gap-1"
                                title="تقديم إلى المرحلة التالية"
                              >
                                <span>تقديم</span>
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-center text-[10px] text-emerald-600 font-bold self-center">
                                ✓ مكتمل
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-900">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">رقم الأمر</th>
                  <th className="p-3.5">الزبون والتواصل</th>
                  <th className="p-3.5">الموديل والقطعة</th>
                  <th className="p-3.5">القماش والخامة</th>
                  <th className="p-3.5">الخياط المسؤول</th>
                  <th className="p-3.5">المرحلة الحالية</th>
                  <th className="p-3.5">موعد التسليم</th>
                  <th className="p-3.5 text-center">الإجمالي</th>
                  <th className="p-3.5 text-center">المتبقي</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      لا توجد أوامر تشغيل مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const stage = SEWING_WORKFLOW_STAGES.find(s => s.id === order.status) || SEWING_WORKFLOW_STAGES[0];
                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-700">
                          {order.orderNumber}
                        </td>
                        <td className="p-3.5">
                          <strong className="block text-slate-900">{order.customerName}</strong>
                          <span className="text-[11px] font-mono text-slate-500">{order.customerPhone}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {(() => {
                            const modelImg = order.modelImageUrl || order.measurements?.modelImageUrl || (order.attachments && order.attachments.length > 0 ? order.attachments[0].data : undefined);
                            return (
                              <div className="flex items-start gap-2.5">
                                {modelImg ? (
                                  <div
                                    onClick={() => {
                                      setPreviewImage({
                                        isOpen: true,
                                        url: modelImg,
                                        title: order.title,
                                        subtitle: `أمر رقم: ${order.orderNumber} • الزبون: ${order.customerName}`
                                      });
                                      posSound.playBeep();
                                    }}
                                    className="relative group/thumb w-10 h-10 rounded-lg overflow-hidden border border-slate-300 shrink-0 cursor-pointer bg-slate-100 hover:border-indigo-500 shadow-2xs"
                                    title="انقر لتكبير صورة الموديل"
                                  >
                                    <img
                                      src={modelImg}
                                      alt={order.title}
                                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                      <Maximize2 className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900">{order.title}</span>
                                    {order.modelCode && (
                                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                        #{order.modelCode}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {order.garmentType && (
                                      <span className="text-[10px] text-indigo-700 font-medium bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                        {order.garmentType}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-500">الكمية: {order.quantity} قطعة</span>
                                    {order.suppliedMaterials && order.suppliedMaterials.length > 0 && (
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                        order.suppliedMaterials.some(m => (m.missingQuantity || 0) > 0)
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}>
                                        📦 {order.suppliedMaterials.length} خامات
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3.5">
                          <span className="block text-slate-700">{order.fabricType || 'قماش مخصص'}</span>
                          <span className="text-[11px] text-slate-500">{order.fabricColor || '-'}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-indigo-700">
                          {order.assignedTailorName || 'لم يُعين بعد'}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${stage.badgeBg} ${stage.badgeText} ${stage.borderColor}`}>
                            <span>{stage.icon}</span>
                            <span>{stage.label}</span>
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-rose-600">
                          {order.deliveryDate}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold">
                          {order.totalPrice} {settings.currency}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold">
                          <span className={order.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {order.remainingBalance} {settings.currency}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenTicket(order)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                              title="طباعة بطاقة وتذكرة الشغل"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                              title="تعديل أمر التشغيل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {order.status !== 'delivered' && (
                              <button
                                onClick={() => handleAdvanceStage(order)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                title="تقديم للمرحلة التالية"
                              >
                                <span>تقديم</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف أمر التشغيل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Work Order Create / Edit Modal */}
      {isWorkOrderModalOpen && (
        <SewingWorkOrderModal
          orderToEdit={orderToEdit}
          onClose={() => {
            setIsWorkOrderModalOpen(false);
            setOrderToEdit(null);
          }}
          onSave={() => {
            setIsWorkOrderModalOpen(false);
            setOrderToEdit(null);
          }}
        />
      )}

      {/* Fullscreen Model Image Lightbox Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={previewImage.isOpen}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
        />
      )}
    </div>
  );
};
