import React, { useState } from 'react';
import { Party, TailoringMeasurements } from '../../types';
import { Ruler, Save, X, RotateCcw, Check, Sparkles, User, Info } from 'lucide-react';
import { posSound } from '../../utils/audio';

interface CustomerMeasurementsModalProps {
  customer: Party;
  initialMeasurements?: TailoringMeasurements;
  onSave: (measurements: TailoringMeasurements) => void;
  onClose: () => void;
}

const STANDARD_PRESETS: Record<string, Partial<TailoringMeasurements>> = {
  S: { length: 135, shoulder: 42, chest: 96, waist: 82, hips: 98, sleeveLength: 58, sleeveWidth: 36, wristCuff: 24, neckCollar: 38, bottomSweep: 140 },
  M: { length: 140, shoulder: 45, chest: 104, waist: 90, hips: 106, sleeveLength: 60, sleeveWidth: 38, wristCuff: 25, neckCollar: 40, bottomSweep: 148 },
  L: { length: 145, shoulder: 48, chest: 112, waist: 98, hips: 114, sleeveLength: 62, sleeveWidth: 40, wristCuff: 26, neckCollar: 42, bottomSweep: 156 },
  XL: { length: 150, shoulder: 51, chest: 120, waist: 108, hips: 122, sleeveLength: 64, sleeveWidth: 43, wristCuff: 27, neckCollar: 44, bottomSweep: 164 },
  XXL: { length: 155, shoulder: 54, chest: 128, waist: 118, hips: 130, sleeveLength: 65, sleeveWidth: 46, wristCuff: 28, neckCollar: 46, bottomSweep: 172 },
  XXXL: { length: 158, shoulder: 57, chest: 136, waist: 128, hips: 138, sleeveLength: 66, sleeveWidth: 49, wristCuff: 29, neckCollar: 48, bottomSweep: 180 },
};

export const CustomerMeasurementsModal: React.FC<CustomerMeasurementsModalProps> = ({
  customer,
  initialMeasurements,
  onSave,
  onClose
}) => {
  const [measurements, setMeasurements] = useState<TailoringMeasurements>(() => {
    return initialMeasurements || customer.savedMeasurements || {
      standardSize: 'custom',
      unit: 'cm',
      length: undefined,
      shoulder: undefined,
      chest: undefined,
      waist: undefined,
      hips: undefined,
      sleeveLength: undefined,
      sleeveWidth: undefined,
      wristCuff: undefined,
      neckCollar: undefined,
      bottomSweep: undefined,
      inseam: undefined,
      thighWidth: undefined,
      armhole: undefined,
      notes: ''
    };
  });

  const [unit, setUnit] = useState<'cm' | 'inch'>(measurements.unit || 'cm');
  const [activePreset, setActivePreset] = useState<string>(measurements.standardSize || 'custom');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const applyPreset = (sizeKey: string) => {
    setActivePreset(sizeKey);
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

  const handleFieldChange = (field: keyof TailoringMeasurements, value: any) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave({
      ...measurements,
      unit,
      standardSize: activePreset
    });
    setSavedSuccess(true);
    posSound.playSuccess();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Ruler className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>جدول القياسات والكميات والألوان</span>
                <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">
                  {customer.name}
                </span>
              </h3>
              <p className="text-xs text-indigo-100">
                تسجيل وحفظ القياسات بدقة لاستخدامها في كافة طلبيات وأوامر الخياطة
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

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Presets & Unit Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                تعبئة سريعة بمقاس جاهز (Standard Size Preset):
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.keys(STANDARD_PRESETS).map((sizeKey) => (
                  <button
                    key={sizeKey}
                    type="button"
                    onClick={() => applyPreset(sizeKey)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      activePreset === sizeKey
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                    }`}
                  >
                    {sizeKey}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActivePreset('custom')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    activePreset === 'custom'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-purple-50'
                  }`}
                >
                  تفصيل مخصص (Custom)
                </button>
              </div>
            </div>

            {/* Unit */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                وحدة القياس:
              </label>
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`px-3 py-1 text-xs font-bold rounded-md ${
                    unit === 'cm'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  سنتيمتر (cm)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('inch')}
                  className={`px-3 py-1 text-xs font-bold rounded-md ${
                    unit === 'inch'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  بوصة / إنش (inch)
                </button>
              </div>
            </div>
          </div>

          {/* Core Measurements Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>القياسات الأساسية للجسم (الأبعاد الرئيسية):</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  الطول الكامل ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.length ?? ''}
                  onChange={(e) => handleFieldChange('length', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 145"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  عرض الكتف ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.shoulder ?? ''}
                  onChange={(e) => handleFieldChange('shoulder', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 48"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  محيط الصدر ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.chest ?? ''}
                  onChange={(e) => handleFieldChange('chest', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 110"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  محيط الخصر ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.waist ?? ''}
                  onChange={(e) => handleFieldChange('waist', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 95"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sleeve & Collar Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <span>الأكمام والياقة والمعصم:</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  طول الكم ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.sleeveLength ?? ''}
                  onChange={(e) => handleFieldChange('sleeveLength', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 62"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  وسع الكم / الزند ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.sleeveWidth ?? ''}
                  onChange={(e) => handleFieldChange('sleeveWidth', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 40"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  المعصم / الكبك ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.wristCuff ?? ''}
                  onChange={(e) => handleFieldChange('wristCuff', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 26"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  فتحة الرقبة / الياقة ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.neckCollar ?? ''}
                  onChange={(e) => handleFieldChange('neckCollar', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 42"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Lower Body & Extra Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>محيط الحوض، وسع الأسفل، والبنطلون:</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  محيط الأرداف / الحوض ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.hips ?? ''}
                  onChange={(e) => handleFieldChange('hips', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 115"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  وسع أسفل الثوب/الفستان ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.bottomSweep ?? ''}
                  onChange={(e) => handleFieldChange('bottomSweep', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 155"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  طول الحجر / البنطلون ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.inseam ?? ''}
                  onChange={(e) => handleFieldChange('inseam', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 85"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  حردة الإبط ({unit}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={measurements.armhole ?? ''}
                  onChange={(e) => handleFieldChange('armhole', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="مثال: 26"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-700 mb-1 font-bold">
              ملاحظات وتفضيلات الزبون في القَصّة والتفصيل:
            </label>
            <textarea
              rows={2}
              value={measurements.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="مثال: قصة سعودية كلاسيك وسيعة، جيب مخفي داخلي للجوال، ياقة قلاب مع زرارين صدف، ثنية كم كبك عريضة..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
            />
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
            className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>تم حفظ القياسات بنجاح</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ وتثبيت المقاسات للزبون</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
