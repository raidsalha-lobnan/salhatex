import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Printer, X, Scissors, Layers, CheckCircle2, Ruler, User, Package, AlertTriangle, Palette, Image as ImageIcon, Maximize2, Sparkles, Users, Calculator, Clock } from 'lucide-react';
import { PrintHeader } from './common/PrintHeader';
import { SuppliedMaterialItem, ColorSizeQuantityRow } from '../types';
import { ImagePreviewModal } from './workshop/ImagePreviewModal';

export const JobTicketModal: React.FC = () => {
  const { selectedJobForTicket, setSelectedJobForTicket, settings } = useAccounting();

  if (!selectedJobForTicket) return null;

  const job = selectedJobForTicket;

  const handlePrint = () => {
    window.print();
  };

  const measurements = (job as any).measurements || {};
  const hasMeasurements = Boolean(
    measurements.length ||
    measurements.shoulder ||
    measurements.chest ||
    measurements.waist ||
    measurements.sleeveLength
  );

  const colorSizeMatrix: ColorSizeQuantityRow[] =
    (job as any).colorSizeMatrix ||
    measurements.colorSizeMatrix ||
    [];
  const hasColorSizeMatrix = colorSizeMatrix.length > 0;

  // Extract all distinct size keys from matrix
  const matrixSizes: string[] = measurements.availableSizes && measurements.availableSizes.length > 0
    ? measurements.availableSizes
    : Array.from(
        new Set(
          colorSizeMatrix.flatMap((r) => Object.keys(r.quantities || {}))
        )
      );

  const suppliedMaterials: SuppliedMaterialItem[] = (job as any).suppliedMaterials || [];
  const hasSuppliedMaterials = suppliedMaterials.length > 0;

  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  const modelImageUrl =
    (job as any).modelImageUrl ||
    measurements.modelImageUrl ||
    (job.attachments && job.attachments.length > 0 && job.attachments[0].data ? job.attachments[0].data : undefined);

  const additionalModelImages: string[] =
    (job as any).modelImages ||
    measurements.modelImages ||
    (job.attachments && job.attachments.length > 1
      ? job.attachments.slice(1).map((a: any) => a.data).filter(Boolean)
      : []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:m-0 print:bg-white print:static print:overflow-visible print-modal-container">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none print:overflow-visible">
        {/* Header Controls (Hidden during print) */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-bold text-slate-900">أمر تشغيل وبطاقة ورشة الخياطة والتفصيل (Job Ticket)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كارت وبطاقة الشغل</span>
            </button>
            <button
              onClick={() => setSelectedJobForTicket(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Body */}
        <div className="p-8 space-y-5 text-slate-900 text-xs font-sans print:p-4">
          {/* Header */}
          <PrintHeader
            title="بطاقة أمر تشغيل ورشة الخياطة والتفصيل"
            subtitle="Tailoring & Sewing Workshop Job Ticket"
            docNumber={job.orderNumber}
            docDate={job.createdAt}
            badge="أمر تشغيل معتمد"
          />

          {/* Job Overview Grid & Model Image */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div className={`space-y-1.5 ${modelImageUrl ? 'sm:col-span-8' : 'sm:col-span-6'}`}>
              <div>
                <span className="text-slate-500">الموديل / نوع القطعة:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-slate-900 text-sm">{job.title}</strong>
                  {(job as any).modelCode && (
                    <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded print:border print:border-slate-400">
                      #{(job as any).modelCode}
                    </span>
                  )}
                </div>
                {(job as any).garmentType && (job as any).garmentType !== job.title && (
                  <span className="text-[11px] text-indigo-700 font-semibold block mt-0.5 print:text-black">
                    نوع الموديل: {(job as any).garmentType}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">اسم الزبون:</span>
                  <strong className="text-slate-900 block">{job.customerName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">جوال التواصل:</span>
                  <span className="font-mono font-semibold">{job.customerPhone}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 print:border-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500 block">تاريخ الأمر:</span>
                  <span className="font-mono font-semibold">{job.createdAt}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">موعد التسليم:</span>
                  <strong className="text-rose-600 print:text-black font-mono font-bold">{job.deadline || (job as any).deliveryDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">الخياط المسؤول:</span>
                  <span className="font-bold text-indigo-700 print:text-black">{(job as any).assignedTailorName || 'مشرف الورشة'}</span>
                </div>
              </div>
            </div>

            {/* Attached Model Photo Display */}
            {modelImageUrl ? (
              <div className="sm:col-span-4 flex flex-col items-center justify-center bg-white p-2 rounded-lg border border-slate-300 print:border-slate-400 shadow-2xs">
                <div
                  className="relative group w-full h-32 sm:h-36 rounded overflow-hidden cursor-pointer flex items-center justify-center bg-slate-100"
                  onClick={() => setActivePreviewImage(modelImageUrl)}
                  title="انقر لتكبير صورة الموديل"
                >
                  <img
                    src={modelImageUrl}
                    alt={job.title}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center print:hidden">
                    <span className="bg-white/90 text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow flex items-center gap-1">
                      <Maximize2 className="w-3 h-3 text-indigo-600" />
                      تكبير
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-600 text-center flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-indigo-600 print:hidden" />
                  <span>صورة الموديل المعتمد (7×10 سم)</span>
                </div>
                {additionalModelImages.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 overflow-x-auto max-w-full pb-0.5 print:hidden">
                    {additionalModelImages.map((extraImg, idx) => (
                      <img
                        key={idx}
                        src={extraImg}
                        alt={`تفصيل ${idx + 1}`}
                        onClick={() => setActivePreviewImage(extraImg)}
                        className="w-7 h-7 rounded object-cover border border-slate-300 cursor-pointer hover:scale-110 transition-transform"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex sm:col-span-6 flex-col justify-center space-y-1.5 pl-2 border-r border-slate-200">
                <div>
                  <span className="text-slate-500">تاريخ أمر الشغل:</span>
                  <span className="font-mono font-semibold block">{job.createdAt}</span>
                </div>
                <div>
                  <span className="text-slate-500">موعد التسليم النهائي للزبون:</span>
                  <strong className="text-rose-600 font-mono text-sm block">{job.deadline || (job as any).deliveryDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500">الخياط المسؤول:</span>
                  <span className="font-bold text-indigo-700 block">{(job as any).assignedTailorName || 'مشرف الورشة'}</span>
                </div>
              </div>
            )}
          </div>

          {/* جدول القياسات والكميات والألوان (Color, Size & Quantity Matrix) */}
          {hasColorSizeMatrix && (
            <div className="border border-purple-300 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-purple-100/80 px-3.5 py-2 font-bold text-purple-950 text-xs border-b border-purple-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-700" />
                  <span className="font-bold text-sm">جدول القياسات والكميات والألوان</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                    {colorSizeMatrix.length} ألوان
                  </span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold font-mono">
                    الإجمالي: {colorSizeMatrix.reduce((sum, r) => sum + (r.totalQuantity || 0), 0)} قطعة
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-purple-50 text-purple-900 font-bold border-b border-purple-200">
                    <tr>
                      <th className="py-2 px-2.5 w-8 text-center">#</th>
                      <th className="py-2 px-3">اللون</th>
                      {matrixSizes.map((s) => (
                        <th key={s} className="py-2 px-2 text-center font-mono">
                          {s}
                        </th>
                      ))}
                      <th className="py-2 px-3 text-center bg-purple-100 font-bold">
                        إجمالي اللون
                      </th>
                      <th className="py-2 px-3">ملاحظات التشغيل والقص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100 bg-white">
                    {colorSizeMatrix.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-purple-50/40">
                        <td className="py-2 px-2.5 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {row.colorHex && (
                              <span
                                className="w-3 h-3 rounded-full border border-slate-300 inline-block shrink-0"
                                style={{ backgroundColor: row.colorHex }}
                              />
                            )}
                            <span>{row.color || '-'}</span>
                          </div>
                        </td>
                        {matrixSizes.map((s) => {
                          const q = row.quantities ? (row.quantities[s] || 0) : 0;
                          return (
                            <td key={s} className="py-2 px-2 text-center">
                              {q > 0 ? (
                                <span className="font-mono font-bold text-purple-950 bg-purple-50 px-2 py-0.5 rounded">
                                  {q}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-purple-50/50 font-mono font-bold text-purple-950">
                          {row.totalQuantity || 0}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {row.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-purple-100/60 font-bold border-t border-purple-200">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-right">
                        المجموع لكل مقاس:
                      </td>
                      {matrixSizes.map((s) => {
                        const colSum = colorSizeMatrix.reduce((sum, r) => sum + (r.quantities?.[s] || 0), 0);
                        return (
                          <td key={s} className="py-2 px-2 text-center font-mono text-purple-950 font-bold">
                            {colSum}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center bg-purple-200/80 font-mono font-black text-purple-950">
                        {colorSizeMatrix.reduce((sum, r) => sum + (r.totalQuantity || 0), 0)} قطعة
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        إجمالي عدد القطع المطلوب تفصيلها
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Measurements Table (Body dimensions for bespoke tailoring) */}
          {hasMeasurements && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 text-xs border-b border-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-slate-600" />
                  <span>القياسات البدنية والتفصيل الفردي</span>
                </span>
                <span className="font-mono text-slate-700">
                  {measurements.standardSize ? `مقاس: ${measurements.standardSize}` : 'تفصيل مخصص'}
                </span>
              </div>

              <div className="p-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                {measurements.length && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">الطول الكامل</span>
                    <strong className="text-sm font-mono text-slate-900">{measurements.length} {measurements.unit || 'سم'}</strong>
                  </div>
                )}
                {measurements.shoulder && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">عرض الكتف</span>
                    <strong className="text-sm font-mono text-slate-900">{measurements.shoulder} {measurements.unit || 'سم'}</strong>
                  </div>
                )}
                {measurements.chest && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">محيط الصدر</span>
                    <strong className="text-sm font-mono text-slate-900">{measurements.chest} {measurements.unit || 'سم'}</strong>
                  </div>
                )}
                {measurements.waist && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">محيط الخصر</span>
                    <strong className="text-sm font-mono text-slate-900">{measurements.waist} {measurements.unit || 'سم'}</strong>
                  </div>
                )}
                {measurements.sleeveLength && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">طول الكم</span>
                    <strong className="text-sm font-mono text-slate-900">{measurements.sleeveLength} {measurements.unit || 'سم'}</strong>
                  </div>
                )}
                {measurements.neckCollar && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">الياقة / الرقبة</span>
                    <strong className="text-sm font-mono text-slate-900">{measurements.neckCollar} {measurements.unit || 'سم'}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sewing Production Specifications */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 p-2.5 font-bold text-slate-900 text-xs border-b border-slate-200 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-indigo-600" />
              <span>مواصفات القماش والتشطيب والفصال</span>
            </div>
            <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 block">العدد المطلوب:</span>
                <strong className="text-sm font-mono text-indigo-700">{job.quantity || 1} قطعة</strong>
              </div>
              <div>
                <span className="text-slate-500 block">نوع القماش والخامة:</span>
                <strong>{(job as any).fabricType || job.specs?.paperType || 'قماش مختار'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">لون القماش:</span>
                <strong>{(job as any).fabricColor || job.specs?.colors || 'حسب العينة'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">مصدر القماش:</span>
                <strong>{(job as any).fabricSource === 'customer' ? 'من الزبون' : 'من أقمشة المشغل'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">المرحلة الحالية:</span>
                <strong className="text-indigo-700">{job.status}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">خيارات التشطيب:</span>
                <strong>
                  {Array.isArray((job as any).finishingOptions)
                    ? (job as any).finishingOptions.join('، ')
                    : (job.specs?.finishing || 'حسب الموديل')}
                </strong>
              </div>
            </div>
          </div>

          {/* Supplied Materials & Accessories Table (جدول الخامات والإكسسوارات الموردة) */}
          {hasSuppliedMaterials && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-900 text-xs border-b border-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  <span>جدول الخامات والإكسسوارات الموردة وأدوات التشغيل</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {suppliedMaterials.length} بنود
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-1.5 px-2.5 w-6 text-center">#</th>
                      <th className="py-1.5 px-2.5">الصنف / الخامة أو الإكسسوار</th>
                      <th className="py-1.5 px-2.5 text-center w-20">العدد المطلوب</th>
                      <th className="py-1.5 px-2.5 text-center w-20">كمية مستلمة</th>
                      <th className="py-1.5 px-2.5 text-center w-20">كمية ناقصة</th>
                      <th className="py-1.5 px-2.5 w-16">الوحدة</th>
                      <th className="py-1.5 px-2.5">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {suppliedMaterials.map((mat, idx) => {
                      const hasMissing = (mat.missingQuantity || 0) > 0;
                      return (
                        <tr key={mat.id || idx} className="text-xs">
                          <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900">{mat.itemName}</td>
                          <td className="py-1.5 px-2.5 text-center font-mono font-semibold">{mat.requiredQuantity}</td>
                          <td className="py-1.5 px-2.5 text-center font-mono font-semibold text-emerald-700">{mat.receivedQuantity}</td>
                          <td className="py-1.5 px-2.5 text-center font-mono font-bold">
                            {hasMissing ? (
                              <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                {mat.missingQuantity} (ناقص)
                              </span>
                            ) : (
                              <span className="text-emerald-700">0 (مكتمل)</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-600">{mat.unit || 'قطعة'}</td>
                          <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">{mat.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Special Notes */}
          {(job.specs?.notes || (job as any).notes) && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900">
              <strong className="block mb-1">تعليمات وملاحظات الزبون والخياطة:</strong>
              <p>{(job as any).notes || job.specs?.notes}</p>
            </div>
          )}

          {/* Workers Labor & Production Cost Breakdown Table */}
          {(((job as any).assignedWorkersLabor && (job as any).assignedWorkersLabor.length > 0) || ((job as any).dailyLaborLogs && (job as any).dailyLaborLogs.length > 0)) && (
            <div className="border border-slate-300 rounded-xl overflow-hidden print:border-slate-400 space-y-0">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-900 text-xs border-b border-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                  <span>بيان عمالة الموديل وساعات العمل والإنتاج (Daily Labor & Overtime Breakdown)</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  إجمالي أجور العمالة: {(job as any).totalLaborCost || 0} {settings.currency}
                </span>
              </div>

              {/* Detailed Daily Slots Breakdown if available */}
              {(job as any).dailyLaborLogs && (job as any).dailyLaborLogs.length > 0 ? (
                <div className="overflow-x-auto border-b border-slate-200">
                  <div className="bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    🗓️ جدول سجل الفترات وساعات العمل اليومية للموديل:
                  </div>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-1 px-2 w-6 text-center">#</th>
                        <th className="py-1 px-2">التاريخ واليوم</th>
                        <th className="py-1 px-2">العامل / الموظف</th>
                        <th className="py-1 px-2">المهمة</th>
                        <th className="py-1 px-2 text-center">الوقت (من ➔ إلى)</th>
                        <th className="py-1 px-2 text-center">الساعات</th>
                        <th className="py-1 px-2 text-center">الدوام / الإضافي</th>
                        <th className="py-1 px-2 text-center">التكلفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900 text-[11px]">
                      {((job as any).dailyLaborLogs as any[]).map((slot, idx) => (
                        <tr key={slot.id || idx}>
                          <td className="py-1 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1 px-2 font-mono font-semibold">{slot.date}</td>
                          <td className="py-1 px-2 font-bold">{slot.employeeName}</td>
                          <td className="py-1 px-2 text-indigo-700">{slot.stageOrRole}</td>
                          <td className="py-1 px-2 text-center font-mono dir-ltr">{slot.startTime} - {slot.endTime}</td>
                          <td className="py-1 px-2 text-center font-mono font-bold">{slot.hoursWorked} س</td>
                          <td className="py-1 px-2 text-center font-mono text-[10px]">
                            {slot.overtimeHours > 0 ? (
                              <span className="text-amber-800 font-bold">أوفرتايم ({slot.overtimeHours}س x{slot.overtimeMultiplier})</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">رسمي (100%)</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-center font-mono font-bold text-emerald-800">{slot.totalLaborCost} {settings.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Workers Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-1.5 px-2.5 w-6 text-center">#</th>
                      <th className="py-1.5 px-2.5">العامل / الموظف</th>
                      <th className="py-1.5 px-2.5">المهمة / المرحلة</th>
                      <th className="py-1.5 px-2.5 text-center">طريقة الحساب</th>
                      <th className="py-1.5 px-2.5 text-center">ساعات / قطع</th>
                      <th className="py-1.5 px-2.5 text-center">أجر الساعة</th>
                      <th className="py-1.5 px-2.5 text-center">إجمالي الأجر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-900">
                    {((job as any).assignedWorkersLabor as any[] || []).map((w, idx) => (
                      <tr key={w.id || idx} className="text-xs">
                        <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900">
                          {w.employeeName}
                          {w.jobTitle ? <span className="text-[10px] text-slate-500 font-normal block">{w.jobTitle}</span> : null}
                        </td>
                        <td className="py-1.5 px-2.5 font-semibold text-indigo-700">{w.stageOrRole}</td>
                        <td className="py-1.5 px-2.5 text-center text-slate-600 font-medium">
                          {w.calculationType === 'daily_slots' ? 'فترات يومية (بالوقت)' : w.calculationType === 'hourly' ? 'بالساعة (من الراتب)' : 'بالقطعة'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-700">
                          {w.calculationType === 'piece' ? `${w.piecesCompleted || 1} قطعة` : `${w.hoursWorked} ساعة`}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-mono font-semibold">
                          {w.hourlyRate || w.pieceRate || 0} {settings.currency}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-700">
                          {w.totalLaborCost} {settings.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(job as any).totalProductionCost > 0 && (
                <div className="bg-slate-50 p-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold">
                  <span className="text-slate-600 font-sans">
                    إجمالي التكلفة الإنتاجية (خامات + أجور عمالة): <strong className="text-indigo-800">{(job as any).totalProductionCost} {settings.currency}</strong>
                  </span>
                  <span className="text-slate-600 font-sans">
                    تكلفة القطعة الواحدة: <strong className="text-purple-800">{(job as any).productionCostPerUnit || 0} {settings.currency}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3 bg-slate-100 p-3 rounded-xl border border-slate-200 font-mono text-center">
            <div>
              <span className="text-slate-500 text-[11px] block font-sans">إجمالي قيمة التفصيل:</span>
              <strong className="text-slate-900 text-sm">{(job.totalCost || (job as any).totalPrice || 0).toFixed(2)} {settings.currency}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block font-sans">العربون المسدد:</span>
              <strong className="text-emerald-700 text-sm">{(job.paidDeposit || (job as any).depositPaid || 0).toFixed(2)} {settings.currency}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block font-sans">المتبقي عند الاستلام:</span>
              <strong className="text-rose-600 text-sm font-black">{(job.remainingCost || (job as any).remainingBalance || 0).toFixed(2)} {settings.currency}</strong>
            </div>
          </div>

          {/* Signatures for Workshop */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-200 text-center">
            <div className="space-y-6">
              <span className="text-slate-500 font-semibold block">مسؤول القص والفصال</span>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
            </div>
            <div className="space-y-6">
              <span className="text-slate-500 font-semibold block">الخياط المنفذ</span>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
            </div>
            <div className="space-y-6">
              <span className="text-slate-500 font-semibold block">توقيع استلام الزبون</span>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview Lightbox */}
      {activePreviewImage && (
        <ImagePreviewModal
          isOpen={!!activePreviewImage}
          onClose={() => setActivePreviewImage(null)}
          imageUrl={activePreviewImage}
          title={job.title}
          subtitle={`أمر تشغيل رقم: ${job.orderNumber} ${job.customerName ? `• الزبون: ${job.customerName}` : ''}`}
        />
      )}
    </div>
  );
};
