import { CATEGORY_DEFINITIONS } from '../utils/barcodeGenerator';
import {
  Account,
  InventoryItem,
  Party,
  PrintJobOrder,
  Invoice,
  PurchaseInvoice,
  PurchaseReturn,
  SalesReturn,
  JournalEntry,
  PaymentVoucher,
  BusinessSettings,
  Employee,
  EmployeeAdvance,
  EmployeeDeduction,
  EmployeeIncentive,
  AttendanceRecord,
  PayrollSheet,
  Treasury,
  StockMovement,
  ExpenseItem
} from '../types';
import { defaultCurrencies } from '../utils/currencies';
import { defaultUnitsOfMeasure } from '../utils/unitsOfMeasure';

export const initialSettings: BusinessSettings = {
  categories: Object.values(CATEGORY_DEFINITIONS),
  businessName: 'مشغل وورشة الخياطة والتفصيل والأزياء',
  businessNameEn: 'Modern Tailoring & Fashion Workshop',
  activityType: 'تصميم وتفصيل وخياطة الأزياء والملابس وتجارة الأقمشة ومستلزمات الخياطة',
  taxNumber: '310984725100003',
  crNumber: '1010729384',
  phone: '02-2987654 / 0599123456',
  email: 'info@sewingworkshop.com',
  address: 'فلسطين - رام الله / القدس / نابلس',
  addresses: [
    'المشغل الرئيسي وورشة التفصيل: رام الله - شارع الإرسال - مجمع الأزياء',
    'فرع الأقمشة والمبيعات: القدس - شارع صلاح الدين',
    'فرع تفصيل وخياطة الأزياء: نابلس - رفيديا'
  ],
  phones: [
    '02-2987654 (الإدارة العامة والطلبيات)',
    '0599-123456 (استقبال وقسم القياسات)',
    '0568-987654 (قسم الخياطة والتسليم)'
  ],
  name: 'مشغل وورشة الخياطة والتفصيل والأزياء',
  description: 'تفصيل وخياطة راقية - أقمشة وموديلات ومستلزمات خياطة متكاملة',
  currency: '₪',
  baseCurrencyCode: 'ILS',
  vatRate: 16,
  invoiceFooterNote: 'شكراً لتعاملكم معنا. القطع المفصلة بحسب القياسات والموديل المعتمد لا ترد ولا تستبدل بعد الاستلام والبروفا النهائية.',
  logoText: 'الخياطة والأزياء',
  currencies: defaultCurrencies,
  unitsOfMeasure: defaultUnitsOfMeasure,
  sqlServerConfig: {
    enabled: false,
    serverUrl: 'http://localhost:3000/api/sync',
    dbType: 'postgres',
    dbName: 'sewing_workshop_db',
    autoSync: false,
    syncIntervalMinutes: 30
  },
  homeShortcuts: [
    'pos',
    'customer_statement',
    'supplier_statement',
    'new_invoice',
    'new_print_order',
    'payment_voucher',
    'receipt_voucher',
    'purchases',
    'inventory',
    'treasury_transfer',
    'dashboard_info',
    'reports'
  ]
};

// دليل الحسابات المالي الافتراضي - كافة الأرصدة مصفّرة (0) للبدء الفعلي
export const initialAccounts: Account[] = [
  // 1. الأصول (Assets)
  { code: '1101', name: 'الصندوق النقدي (الكاشير)', type: 'asset', balance: 0, isSystem: true, description: 'السيولة النقدية في خزينة ورشة ومشغل الخياطة' },
  { code: '1102', name: 'الحساب البنكي (الحساب الجاري)', type: 'asset', balance: 0, isSystem: true, description: 'الحساب الجاري الرئيسي ومبيعات نقاط الدفع الإلكتروني' },
  { code: '1103', name: 'جهاز نقاط البيع ومدى (POS)', type: 'asset', balance: 0, isSystem: true, description: 'متحصلات شبكة مدى وبطاقات الدفع في الورشة' },
  { code: '1105', name: 'تطبيق الدفع الإلكتروني والمحافظ', type: 'asset', balance: 0, isSystem: true, description: 'محفظة رقمية للمدفوعات السريعة عبر رمز QR' },
  { code: '1104', name: 'سلف ومستحقات الخياطين والعاملين', type: 'asset', balance: 0, isSystem: true, description: 'سلف الخياطين والعمال المعلقة للخصم من أجور القطع والرواتب' },
  { code: '1201', name: 'العملاء والذمم المدينة', type: 'asset', balance: 0, isSystem: true, description: 'مستحقات آجلة وعرابين متبقية على زبائن التفصيل والشركات' },
  { code: '1301', name: 'مخزون الأقمشة والخامات', type: 'asset', balance: 0, isSystem: true, description: 'قيمة مخزون أقمشة الصوف والحرير والقطن والكتان والبطانات' },
  { code: '1302', name: 'مخزون مستلزمات الخياطة والأزرار والخيوط', type: 'asset', balance: 0, isSystem: true, description: 'بكرات الخيوط، الأزرار، السحابات، الفازلين، والكلف والتطريز' },
  { code: '1501', name: 'ماكينات ومعدات الخياطة والقص والكي', type: 'asset', balance: 0, isSystem: true, description: 'ماكينات الخياطة الصناعية، ماكينات السرفلة والتطريز، ومقصات القماش وطاولات الكي' },
  
  // 2. الخصوم (Liabilities)
  { code: '2101', name: 'الموردون والذمم الدائنة', type: 'liability', balance: 0, isSystem: true, description: 'مستحقات شركات وتجار الأقمشة وموردي مستلزمات الخياطة' },
  { code: '2103', name: 'أمانات ضريبة القيمة المضافة المستحقة (VAT)', type: 'liability', balance: 0, isSystem: true, description: 'صافي الضريبة الواجب توريدها' },
  
  // 3. حقوق الملكية (Equity)
  { code: '3101', name: 'رأس المال المدفوع', type: 'equity', balance: 0, isSystem: true, description: 'رأس المال المؤسس لمشغل الخياطة' },
  { code: '3102', name: 'جاري المالك / مسحوبات الشركاء', type: 'equity', balance: 0, isSystem: true, description: 'المسحوبات الشخصية وتغذية رأس المال' },
  { code: '3201', name: 'الأرباح المبقاة والمرحلة', type: 'equity', balance: 0, isSystem: true, description: 'أرباح متراكمة من الفترات السابقة' },
  
  // 4. الإيرادات (Revenue)
  { code: '4101', name: 'إيرادات مبيعات الأقمشة والملابس الجاهزة', type: 'revenue', balance: 0, isSystem: true, description: 'مبيعات الكاشير من طاقات الأقمشة والإكسسوارات والملابس الجاهزة' },
  { code: '4102', name: 'إيرادات عقود وأوامر تفصيل وخياطة الملابس', type: 'revenue', balance: 0, isSystem: true, description: 'إيرادات تفصيل الأثواب والبدل والفساتين والزي الموحد' },
  { code: '4103', name: 'إيرادات خدمات التعديل والتقصير والتطريز', type: 'revenue', balance: 0, isSystem: true, description: 'تعديل ملابس، تقصير، تضييق، تركيب سحابات وتطريز' },
  { code: '4201', name: 'إيرادات نقدية متنوعة وأخرى', type: 'revenue', balance: 0, isSystem: true, description: 'إيرادات متفرقة غير تشغيلية' },
  
  // 5. المصروفات وتكلفة البضاعة (Expenses & COGS)
  { code: '5101', name: 'تكلفة مبيعات الأقمشة والملابس', type: 'expense', balance: 0, isSystem: true, description: 'تكلفة شراء الأقمشة والقطع المباعة' },
  { code: '5102', name: 'تكلفة مستلزمات وخيوط وأزرار الخياطة', type: 'expense', balance: 0, isSystem: true, description: 'قيمة الخيوط والأزرار والسحابات والفازلين المستهلك في التفصيل' },
  { code: '5201', name: 'أجور الخياطين ومصروفات الرواتب', type: 'expense', balance: 0, isSystem: true, description: 'أجور الخياطين بالقطعة ورواتب العمال ومساعدي التفصيل' },
  { code: '5202', name: 'إيجار المشغل وورشة الخياطة', type: 'expense', balance: 0, isSystem: true, description: 'إيجار مقر المشغل والمعرض' },
  { code: '5203', name: 'مصروفات صيانة ماكينات الخياطة والمعدات', type: 'expense', balance: 0, isSystem: true, description: 'صيانة دورية لماكينات الخياطة والمعدات' },
  { code: '5204', name: 'الكهرباء والمياه والإنترنت', type: 'expense', balance: 0, isSystem: true, description: 'فواتير الطاقة والمرافق' },
  { code: '5205', name: 'مصروفات عمومية وتسويق', type: 'expense', balance: 0, isSystem: true, description: 'مصاريف تسويقية وضيافة وأدوات نظافة' },
];

// الأصناف والمخزون الافتراضي مصفّر بالكامل - تبدأ فارغة ليقوم المستخدم بإدخال أصنافه يدوياً
export const initialInventory: InventoryItem[] = [];

// العملاء والموردين - فارغة تماماً ليتم إدخالهم يدوياً
export const initialParties: Party[] = [];

// أوامر التشغيل وطلبات التفصيل - فارغة تماماً
export const initialPrintOrders: PrintJobOrder[] = [];

// فواتير المبيعات - فارغة تماماً
export const initialInvoices: Invoice[] = [];

// فواتير المشتريات - فارغة تماماً
export const initialPurchases: PurchaseInvoice[] = [];

// مردودات المشتريات - فارغة تماماً
export const initialPurchaseReturns: PurchaseReturn[] = [];

// مردودات المبيعات - فارغة تماماً
export const initialSalesReturns: SalesReturn[] = [];

// قيود اليومية - فارغة تماماً
export const initialJournalEntries: JournalEntry[] = [];

// الموظفون والعمال - فارغة تماماً ليتم إدخالهم يدوياً
export const initialEmployees: Employee[] = [];

// سجلات الحضور والغياب - فارغة تماماً
export const initialAttendanceRecords: AttendanceRecord[] = [];

// سلف الموظفين - فارغة تماماً
export const initialEmployeeAdvances: EmployeeAdvance[] = [];

// خصومات وجزاءات الموظفين - فارغة تماماً
export const initialEmployeeDeductions: EmployeeDeduction[] = [];

// حوافز ومكافآت الموظفين - فارغة تماماً
export const initialEmployeeIncentives: EmployeeIncentive[] = [];

// كشوفات ومسيرات الرواتب - فارغة تماماً
export const initialPayrollSheets: PayrollSheet[] = [];

// الصناديق والخزائن - بأرصدة مصفّرة وبدون حركات سابقة
export const initialTreasuries: Treasury[] = [
  {
    id: 'treasury-cash-main',
    name: 'الصندوق النقدي (الخزينة الرئيسية)',
    type: 'cash_box',
    accountCode: '1101',
    balance: 0,
    currencyBalances: {
      ILS: 0,
      USD: 0,
      JOD: 0
    },
    isDefault: true,
    status: 'active',
    notes: 'الخزينة النقدية الرئيسية لمكتب المبيعات والكاشير',
    createdAt: new Date().toISOString().split('T')[0],
    transactions: []
  },
  {
    id: 'treasury-bank-main',
    name: 'الحساب البنكي الرئيسي',
    type: 'bank_app',
    accountCode: '1102',
    balance: 0,
    currencyBalances: {
      ILS: 0,
      USD: 0
    },
    bankName: 'بنك فلسطين / الحساب الجاري',
    accountNumber: 'IL99-0001-2345-6789',
    status: 'active',
    notes: 'حساب البنك للتحويلات وسداد الموردين والرواتب',
    createdAt: new Date().toISOString().split('T')[0],
    transactions: []
  },
  {
    id: 'treasury-pos-main',
    name: 'جهاز نقاط البيع ومدى (POS)',
    type: 'pos_terminal',
    accountCode: '1103',
    balance: 0,
    currencyBalances: {
      ILS: 0
    },
    bankName: 'شبكة المدفوعات والبطاقات',
    accountNumber: 'POS-001',
    status: 'active',
    notes: 'متحصلات شبكة البطاقات البنكية في الكاشير',
    createdAt: new Date().toISOString().split('T')[0],
    transactions: []
  }
];

// سندات القبض والصرف - فارغة تماماً
export const initialVouchers: PaymentVoucher[] = [];

// حركات المخزون - فارغة تماماً
export const initialStockMovements: StockMovement[] = [];

// المصروفات والنثريات - فارغة تماماً
export const initialExpenses: ExpenseItem[] = [];
