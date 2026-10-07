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

export const initialAccounts: Account[] = [
  // 1. الأصول (Assets)
  { code: '1101', name: 'الصندوق النقدي (الكاشير)', type: 'asset', balance: 14250, isSystem: true, description: 'السيولة النقدية في خزينة ورشة ومشغل الخياطة' },
  { code: '1102', name: 'الحساب البنكي (الحساب الجاري)', type: 'asset', balance: 85600, isSystem: true, description: 'الحساب الجاري الرئيسي ومبيعات نقاط الدفع الإلكتروني (مدى)' },
  { code: '1103', name: 'جهاز نقاط البيع ومدى (POS)', type: 'asset', balance: 18400, isSystem: true, description: 'متحصلات شبكة مدى وبطاقات الدفع في الورشة' },
  { code: '1105', name: 'تطبيق الدفع الإلكتروني والمحافظ', type: 'asset', balance: 6500, isSystem: true, description: 'محفظة رقمية للمدفوعات السريعة عبر رمز QR' },
  { code: '1104', name: 'سلف ومستحقات الخياطين والعاملين', type: 'asset', balance: 500, isSystem: true, description: 'سلف الخياطين والعمال المعلقة للخصم من أجور القطع والرواتب' },
  { code: '1201', name: 'العملاء والذمم المدينة', type: 'asset', balance: 12400, isSystem: true, description: 'مستحقات آجلة وعرابين متبقية على زبائن التفصيل والشركات' },
  { code: '1301', name: 'مخزون الأقمشة والخامات', type: 'asset', balance: 42000, isSystem: true, description: 'قيمة مخزون أقمشة الصوف والحرير والقطن والكتان والبطانات' },
  { code: '1302', name: 'مخزون مستلزمات الخياطة والأزرار والخيوط', type: 'asset', balance: 28500, isSystem: true, description: 'بكرات الخيوط، الأزرار، السحابات، الفازلين، والكلف والتطريز' },
  { code: '1501', name: 'ماكينات ومعدات الخياطة والقص والكي', type: 'asset', balance: 165000, isSystem: true, description: 'ماكينات الخياطة الصناعية، ماكينات السرفلة والتطريز، ومقصات القماش وطاولات الكي بالبخار' },
  
  // 2. الخصوم (Liabilities)
  { code: '2101', name: 'الموردون والذمم الدائنة', type: 'liability', balance: 18500, isSystem: true, description: 'مستحقات شركات وتجار الأقمشة وموردي مستلزمات الخياطة' },
  { code: '2103', name: 'أمانات ضريبة القيمة المضافة المستحقة (VAT)', type: 'liability', balance: 3450, isSystem: true, description: 'صافي الضريبة الواجب توريدها' },
  
  // 3. حقوق الملكية (Equity)
  { code: '3101', name: 'رأس المال المدفوع', type: 'equity', balance: 300000, isSystem: true, description: 'رأس المال المؤسس لمشغل الخياطة' },
  { code: '3102', name: 'جاري المالك / مسحوبات الشركاء', type: 'equity', balance: 0, isSystem: true, description: 'المسحوبات الشخصية وتغذية رأس المال' },
  { code: '3201', name: 'الأرباح المبقاة والمرحلة', type: 'equity', balance: 25800, isSystem: true, description: 'أرباح متراكمة من الفترات السابقة' },
  
  // 4. الإيرادات (Revenue)
  { code: '4101', name: 'إيرادات مبيعات الأقمشة والملابس الجاهزة', type: 'revenue', balance: 48900, isSystem: true, description: 'مبيعات الكاشير من طاقات الأقمشة والإكسسوارات والملابس الجاهزة' },
  { code: '4102', name: 'إيرادات عقود وأوامر تفصيل وخياطة الملابس', type: 'revenue', balance: 76500, isSystem: true, description: 'إيرادات تفصيل الأثواب والبدل والفساتين والزي الموحد' },
  { code: '4103', name: 'إيرادات خدمات التعديل والتقصير والتطريز', type: 'revenue', balance: 11200, isSystem: true, description: 'تعديل ملابس، تقصير، تضييق، تركيب سحابات وتطريز' },
  { code: '4201', name: 'إيرادات نقدية متنوعة وأخرى', type: 'revenue', balance: 0, isSystem: true, description: 'إيرادات متفرقة غير تشغيلية' },
  
  // 5. المصروفات وتكلفة البضاعة (Expenses & COGS)
  { code: '5101', name: 'تكلفة مبيعات الأقمشة والملابس', type: 'expense', balance: 28400, isSystem: true, description: 'تكلفة شراء الأقمشة والقطع المباعة' },
  { code: '5102', name: 'تكلفة مستلزمات وخيوط وأزرار الخياطة', type: 'expense', balance: 34800, isSystem: true, description: 'قيمة الخيوط والأزرار والسحابات والفازلين المستهلك في التفصيل' },
  { code: '5201', name: 'أجور الخياطين ومصروفات الرواتب', type: 'expense', balance: 22000, isSystem: true, description: 'أجور الخياطين بالقطعة ورواتب العمال ومساعدي التفصيل' },
  { code: '5202', name: 'إيجار المشغل وورشة الخياطة', type: 'expense', balance: 15000, isSystem: true, description: 'إيجار مقر المشغل والمعرض' },
  { code: '5203', name: 'مصروفات صيانة ماكينات الخياطة والمعدات', type: 'expense', balance: 4500, isSystem: true, description: 'صيانة دورية لماكينات Juki و Brother ومقصات الأقمشة' },
  { code: '5204', name: 'الكهرباء والمياه والإنترنت', type: 'expense', balance: 3200, isSystem: true, description: 'فواتير الطاقة والمرافق' },
  { code: '5205', name: 'مصروفات عمومية وتسويق', type: 'expense', balance: 2100, isSystem: true, description: 'مصاريف تسويقية وضيافة وأدوات نظافة' },
];

export const initialInventory: InventoryItem[] = [
  // أقمشة وخامات تفصيل
  {
    id: 'inv-1',
    code: 'FAB-0001',
    barcode: '62820010001',
    name: 'قماش صوف كشمير إنجليزي فاخر للبدل والأثواب',
    category: 'fabrics',
    unit: 'متر',
    purchasePrice: 65.0,
    sellingPrice: 120.0,
    sellingPrice2: 105.0,
    sellingPrice3: 95.0,
    customerSpecialPrices: [
      {
        customerId: 'pt-1',
        customerName: 'عميل كاشير نقدي',
        customerCode: 'CUST-0001',
        price: 95.0,
        notes: 'سعر خاص عميل دائم'
      }
    ],
    stockQuantity: 120,
    minAlertQuantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&auto=format&fit=crop&q=60',
    isFavorite: true,
    description: 'صوف إنجليزي فاخر سوبر 150، انسيابي ومقاوم للتجعد'
  },
  {
    id: 'inv-2',
    code: 'FAB-0002',
    barcode: '62820010002',
    name: 'قماش قطن مصري ممتاز للثياب والقمصان',
    category: 'fabrics',
    unit: 'متر',
    purchasePrice: 28.0,
    sellingPrice: 50.0,
    sellingPrice2: 45.0,
    sellingPrice3: 40.0,
    stockQuantity: 250,
    minAlertQuantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1604754742629-3e5728249d73?w=400&auto=format&fit=crop&q=60',
    isFavorite: true,
    description: 'قطن مصري 100% ناعم وبارد مناسب للأجواء الحارة'
  },
  {
    id: 'inv-3',
    code: 'FAB-0003',
    barcode: '62820010003',
    name: 'قماش حرير كريب فاخر للفساتين والعبايات',
    category: 'fabrics',
    unit: 'متر',
    purchasePrice: 45.0,
    sellingPrice: 85.0,
    sellingPrice2: 75.0,
    sellingPrice3: 70.0,
    stockQuantity: 80,
    minAlertQuantity: 10,
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&auto=format&fit=crop&q=60',
    isFavorite: true,
    description: 'حرير كريب ياباني فاخر، لمعة خفيفة وملمس ناعم'
  },
  // خيوط ومستلزمات خياطة
  {
    id: 'inv-4',
    code: 'THRD-0001',
    barcode: '62820010004',
    name: 'بكرة خيط خياطة بوليستر ألماني متين 1000 متر',
    category: 'threads_yarn',
    unit: 'بكرة',
    purchasePrice: 4.0,
    sellingPrice: 8.0,
    stockQuantity: 150,
    minAlertQuantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=60',
    isFavorite: true,
    description: 'خيط عالي المتانة ضد القطع مناسب لكافة الماكينات'
  },
  {
    id: 'inv-5',
    code: 'BTN-0001',
    barcode: '62820010005',
    name: 'طقم أزرار صدف طبيعي فاخر للأثواب والبدل (دستة 12 حبة)',
    category: 'buttons_zippers',
    unit: 'دستة (12 حبة)',
    purchasePrice: 12.0,
    sellingPrice: 25.0,
    stockQuantity: 90,
    minAlertQuantity: 15,
    isFavorite: true,
    description: 'أزرار صدفية طبيعية ممتازة ذات جودة عالية'
  },
  {
    id: 'inv-6',
    code: 'SUPP-0001',
    barcode: '62820010006',
    name: 'فازلين حشو وياقات إيطالي فاخر (رول 50 متر)',
    category: 'tailoring_supplies',
    unit: 'لفة / متر',
    purchasePrice: 120.0,
    sellingPrice: 180.0,
    stockQuantity: 12,
    minAlertQuantity: 2,
    isRawMaterial: true,
    description: 'حشو وياقات عالي التثبيت بالحرارة والبخار'
  },
  // خدمات تفصيل وخياطة
  {
    id: 'srv-1',
    code: 'SRV-0001',
    barcode: '9902000001',
    name: 'أمر تفصيل وخياطة ثوب رجالي ممتاز (شامل التفصيل والبروفا)',
    category: 'tailoring_services',
    unit: 'خدمة',
    purchasePrice: 40.0,
    sellingPrice: 100.0,
    stockQuantity: 9999,
    minAlertQuantity: 0,
    description: 'قص وتفصيل حسب القياسات الدقيقة والبروفا والكي'
  },
  {
    id: 'srv-2',
    code: 'SRV-0002',
    barcode: '9902000002',
    name: 'أمر تفصيل وخياطة فستان / بدلة رسمية راقية',
    category: 'tailoring_services',
    unit: 'خدمة',
    purchasePrice: 80.0,
    sellingPrice: 220.0,
    stockQuantity: 9999,
    minAlertQuantity: 0,
    description: 'تفصيل خاص حسب الموديل والتصميم المطلوب'
  },
  {
    id: 'srv-3',
    code: 'SRV-0003',
    barcode: '9902000003',
    name: 'خدمة تعديل وتقصير وتضييق ملابس فورية',
    category: 'tailoring_services',
    unit: 'خدمة',
    purchasePrice: 5.0,
    sellingPrice: 20.0,
    stockQuantity: 9999,
    minAlertQuantity: 0,
    description: 'تعديل سريع وتضبيط مقاسات فورية'
  }
];

export const initialParties: Party[] = [
  {
    id: 'pt-1',
    code: 'CUST-0001',
    type: 'customer',
    name: 'عميل كاشير نقدي',
    phone: '0551122334',
    email: 'client@sewingworkshop.com',
    taxNumber: '300998877600003',
    commercialRegister: '1010897654',
    contactPerson: 'عميل تفصيل نقدي',
    city: 'رام الله',
    address: 'شارع الإرسال',
    balance: 0,
    openingBalance: 0,
    openingBalanceDate: '2026-01-01',
    openingBalanceType: 'debit',
    creditLimit: 5000,
    notes: 'عميل عام لطلبات التفصيل والخياطة النقدية'
  },
  {
    id: 'pt-2',
    code: 'CUST-0002',
    type: 'customer',
    name: 'أحمد خليل المصري',
    phone: '0599112233',
    city: 'القدس',
    address: 'شارع صلاح الدين',
    balance: 350.0,
    openingBalance: 350.0,
    openingBalanceDate: '2026-01-01',
    openingBalanceType: 'debit',
    creditLimit: 2000,
    notes: 'زبون دائم لتفصيل الأثواب والبدل الرجالية'
  },
  {
    id: 'pt-3',
    code: 'SUPP-0001',
    type: 'supplier',
    name: 'شركة النسيج العربي لتجارة الأقمشة الفاخرة',
    phone: '022987650',
    email: 'sales@arabtextiles.com',
    taxNumber: '310112233400003',
    commercialRegister: '1010998877',
    contactPerson: 'خالد عبد الوهاب (مسؤول التوريد)',
    city: 'رام الله',
    address: 'المنطقة الصناعية',
    balance: -4500.0,
    openingBalance: -4500.0,
    openingBalanceDate: '2026-01-01',
    openingBalanceType: 'credit',
    creditLimit: 30000,
    notes: 'توريد أقمشة الصوف الإنجليزي والقطن المصري والحرير'
  },
  {
    id: 'pt-4',
    code: 'SUPP-0002',
    type: 'supplier',
    name: 'مؤسسة الخيوط الذهبية للأزرار ومستلزمات الخياطة',
    phone: '0568123456',
    email: 'supplies@goldenthreads.com',
    city: 'نابلس',
    address: 'شارع عمان',
    balance: -1200.0,
    openingBalance: -1200.0,
    openingBalanceDate: '2026-01-01',
    openingBalanceType: 'credit',
    creditLimit: 10000,
    notes: 'توريد بكرات الخيوط والأزرار الصدفية والسحابات والفازلين'
  }
];

export const initialPrintOrders: PrintJobOrder[] = [
  {
    id: 'job-101',
    orderNumber: 'SEW-2026-0001',
    customerId: 'pt-3',
    customerName: 'أ. عبد الله السالم',
    customerPhone: '0509988112',
    title: 'تفصيل ثوب رجالي كلاسيكي تطريز كم مخفي',
    serviceType: 'mens_thobe',
    fabricType: 'سلك ياباني أصلي تترون',
    fabricColor: 'أبيض كريمي (سكر)',
    fabricSource: 'workshop',
    fabricMetersUsed: 3.5,
    assignedTailorId: 'emp-2',
    assignedTailorName: 'المعلم مصطفى كمال (خياط أول)',
    pieceRateWage: 45.0,
    dimensions: 'مقاس تفصيل خاص',
    quantity: 2,
    finishingOptions: ['أزرار صدف طبيعي', 'ياقة قلاب كلاسيك', 'جيب جوال داخلي', 'كي بخار وتجهيز'],
    unitCost: 180.0,
    totalPrice: 414.0, // شامل الضريبة
    depositPaid: 200.0,
    remainingBalance: 214.0,
    status: 'sewing',
    notes: 'توسيع خفيف عند الصدر وترك 2 سم ثنية إضافية بالأسفل',
    createdAt: '2026-09-02',
    fittingDate: '2026-09-05',
    deliveryDate: '2026-09-07',
    measurements: {
      customerId: 'pt-3',
      standardSize: 'مخصص',
      length: 152,
      shoulder: 46,
      chest: 108,
      waist: 98,
      sleeveLength: 62,
      sleeveWidth: 26,
      neckCollar: 41,
      collarType: 'قلاب',
      pocketType: 'مخفي + جيب جوال',
      unit: 'cm',
      notes: 'مقاس معتمد للعميل الدائم'
    },
    suppliedMaterials: [
      {
        id: 'mat-init-1',
        itemName: 'أزرار صدف طبيعي أصلي',
        unit: 'حبة',
        requiredQuantity: 24,
        receivedQuantity: 24,
        missingQuantity: 0,
        notes: 'موردة من المخزن للياقة والأكمام'
      },
      {
        id: 'mat-init-2',
        itemName: 'سحاب مخفي 50 سم',
        unit: 'قطعة',
        requiredQuantity: 2,
        receivedQuantity: 2,
        missingQuantity: 0,
        notes: 'لون سكري مطابق للقماش'
      },
      {
        id: 'mat-init-3',
        itemName: 'بكرات خيوط تطريز حرير بيج',
        unit: 'بكرة',
        requiredQuantity: 2,
        receivedQuantity: 1,
        missingQuantity: 1,
        notes: 'بكرة واحدة ناقصة للتطريز'
      }
    ]
  },
  {
    id: 'job-102',
    orderNumber: 'SEW-2026-0002',
    customerId: 'pt-2',
    customerName: 'سيدة مشاعل العتيبي',
    customerPhone: '0544332211',
    title: 'تفصيل عباية خليجية كلوش مع شيلة مطرزة',
    serviceType: 'abaya',
    fabricType: 'كريب ملكي كوري كلاسيك',
    fabricColor: 'أسود فاحم داكن',
    fabricSource: 'customer',
    fabricMetersUsed: 4.0,
    assignedTailorId: 'emp-3',
    assignedTailorName: 'الأسطى رضوان محمد',
    pieceRateWage: 60.0,
    dimensions: 'مقاس 56',
    quantity: 1,
    finishingOptions: ['شك خرز يدوي على الأكمام', 'أزرار طق طق مخفية', 'شيلة مطابقة 2 متر'],
    unitCost: 280.0,
    totalPrice: 322.0,
    depositPaid: 322.0,
    remainingBalance: 0.0,
    status: 'ironing_finishing',
    notes: 'القماش مستلم من الزبونة، يرجى الكي بالبخار بدون حرارة مباشرة',
    createdAt: '2026-09-03',
    fittingDate: '2026-09-06',
    deliveryDate: '2026-09-08',
    measurements: {
      customerId: 'pt-2',
      standardSize: '56',
      length: 142,
      shoulder: 42,
      chest: 102,
      waist: 90,
      sleeveLength: 59,
      unit: 'cm'
    }
  },
  {
    id: 'job-103',
    orderNumber: 'SEW-2026-0003',
    customerId: 'pt-1',
    customerName: 'عميل تفصيل نقدي',
    customerPhone: '0551122334',
    title: 'تفصيل طقم بدلة رسمية رجالية جاكيت وبنطلون',
    serviceType: 'formal_suit',
    fabricType: 'جوخ صوف كشميري سوبر 120',
    fabricColor: 'كحلي غامق (Navy Blue)',
    fabricSource: 'workshop',
    fabricMetersUsed: 3.8,
    assignedTailorId: 'emp-2',
    assignedTailorName: 'المعلم مصطفى كمال (خياط أول)',
    pieceRateWage: 120.0,
    dimensions: 'تفصيل إيطالي سليم فيت',
    quantity: 1,
    finishingOptions: ['بطانة حرير داخلية', 'حشوة صدر إيطالية صلبة', 'أزرار عاج فاخرة'],
    unitCost: 650.0,
    totalPrice: 747.5,
    depositPaid: 400.0,
    remainingBalance: 347.5,
    status: 'cutting',
    notes: 'موعد بروفة القياس الأولى يوم الخميس قبل تقفيل الأكمام',
    createdAt: '2026-09-04',
    fittingDate: '2026-09-08',
    deliveryDate: '2026-09-12',
    measurements: {
      customerId: 'pt-1',
      length: 76,
      shoulder: 48,
      chest: 106,
      waist: 88,
      sleeveLength: 64,
      pantsLength: 104,
      pantsWaist: 88,
      unit: 'cm'
    }
  },
  {
    id: 'job-104',
    orderNumber: 'SEW-2026-0004',
    customerId: 'pt-3',
    customerName: 'أ. عبد الله السالم',
    customerPhone: '0509988112',
    title: 'تفصيل ثوب شتوي صوف مقلم',
    serviceType: 'mens_thobe',
    fabricType: 'صوف انجليزي شتوي ثقيل',
    fabricColor: 'رصاصي مقلم دافئ',
    fabricSource: 'workshop',
    fabricMetersUsed: 3.5,
    assignedTailorId: 'emp-3',
    assignedTailorName: 'الأسطى رضوان محمد',
    pieceRateWage: 50.0,
    dimensions: 'مقاس تفصيل خاص',
    quantity: 1,
    finishingOptions: ['خياطة دربل مزدوجة', 'أزرار خشبية راقية', 'كي بخار مكثف'],
    unitCost: 240.0,
    totalPrice: 276.0,
    depositPaid: 276.0,
    remainingBalance: 0.0,
    status: 'ready',
    notes: 'القطعة جاهزة ومعلقة في ستاند التسليم برقم الكارت',
    createdAt: '2026-09-01',
    deliveryDate: '2026-09-04',
    measurements: {
      customerId: 'pt-3',
      length: 152,
      shoulder: 46,
      chest: 108,
      waist: 98,
      sleeveLength: 62,
      unit: 'cm'
    }
  }
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv-pos-1001',
    invoiceNumber: 'INV-2026-1001',
    date: '2026-09-04',
    customerName: 'عميل كاشير نقدي',
    type: 'pos',
    items: [
      { itemId: 'inv-1', itemName: 'دفتر سلك جامعي 200 صفحة مسطر فاخر', quantity: 2, unitPrice: 15.0, discount: 0, tax: 4.5, total: 34.5 },
      { itemId: 'inv-2', itemName: 'طقم أقلام حبر جاف أزرق روكو', quantity: 1, unitPrice: 35.0, discount: 0, tax: 5.25, total: 40.25 },
      { itemId: 'srv-1', itemName: 'تصوير مستندات A4 أبيض وأسود', quantity: 40, unitPrice: 0.25, discount: 0, tax: 1.5, total: 11.5 }
    ],
    subtotal: 75.0,
    discountTotal: 0,
    taxRate: 15,
    taxAmount: 11.25,
    totalAmount: 86.25,
    paidAmount: 86.25,
    remainingAmount: 0,
    paymentMethod: 'card',
    status: 'paid'
  },
  {
    id: 'inv-pos-1002',
    invoiceNumber: 'INV-2026-1002',
    date: '2026-09-04',
    customerName: 'الأستاذ فهد القحطاني',
    type: 'pos',
    items: [
      { itemId: 'inv-4', itemName: 'آلة حاسبة علمية كاسيو fx-991ARX الأصلية', quantity: 1, unitPrice: 120.0, discount: 10.0, tax: 16.5, total: 126.5 },
      { itemId: 'inv-5', itemName: 'كتاب "قوة العادات" - تشارلز دويج', quantity: 1, unitPrice: 55.0, discount: 0, tax: 8.25, total: 63.25 }
    ],
    subtotal: 165.0,
    discountTotal: 10.0,
    taxRate: 15,
    taxAmount: 24.75,
    totalAmount: 189.75,
    paidAmount: 189.75,
    remainingAmount: 0,
    paymentMethod: 'cash',
    status: 'paid'
  },
  {
    id: 'inv-job-1003',
    invoiceNumber: 'INV-2026-1003',
    date: '2026-09-03',
    customerId: 'pt-3',
    customerName: 'مؤسسة أفق التقنية للتجارة',
    customerPhone: '0509988112',
    customerTaxNumber: '302334455600003',
    type: 'print_order',
    printJobId: 'job-102',
    items: [
      { itemId: 'job-102', itemName: 'كروت شخصية للمديرين التنفيذيين مع بصمة ذهبية (2000 كرت)', quantity: 1, unitPrice: 1200.0, discount: 0, tax: 180.0, total: 1380.0 }
    ],
    subtotal: 1200.0,
    discountTotal: 0,
    taxRate: 15,
    taxAmount: 180.0,
    totalAmount: 1380.0,
    paidAmount: 1380.0,
    remainingAmount: 0,
    paymentMethod: 'bank_transfer',
    status: 'paid',
    workflowStatus: 'ready',
    subCustomerName: 'الإدارة التنفيذية',
    deliveryDate: '2026-09-05',
    notes: 'كروت شخصية فاخرة مع بصمة ذهب وسلوفان ناعم'
  },
  {
    id: 'inv-wk-1004',
    invoiceNumber: 'INV-2026-1004',
    date: '2026-09-04',
    customerId: 'pt-1',
    customerName: 'شركة إعمار الأندلس للمقاولات',
    customerPhone: '0551122334',
    subCustomerName: 'إدارة المشاريع والتخطيط',
    deliveryDate: '2026-09-12',
    workflowStatus: 'design',
    status: 'paid',
    type: 'print_order',
    notes: 'مطلوب الالتزام بالألوان المعتمدة ومراجعة مواضع الشعار بدقة قبل الاعتماد النهائي',
    items: [
      {
        itemId: 'ds-1',
        itemName: 'كتيب بروفايل الشركة الفاخر مقاس A4',
        dimensions: 'A4 مغلق (21×29.7 سم)',
        quantity: 500,
        unit: 'كتيب',
        unitPrice: 12.0,
        discount: 0,
        tax: 900,
        total: 6900,
        notes: 'غلاف كوشيه 350g سلوفان مطفي + داخلي 150g كوشيه لامع مع تجليد سلك مخفي',
        attachments: [
          {
            id: 'att-orig-1',
            name: 'الهوية_البصرية_والشعار_الرسمي_V1.pdf',
            size: 4520000,
            type: 'application/pdf',
            uploadedAt: '2026-09-04 10:30',
            isOriginal: true,
            uploadedBy: 'أحمد النجار (قسم المبيعات)'
          }
        ]
      }
    ],
    technicalNotes: [
      {
        id: 'tn-1',
        userName: 'م. سليم (مصمم جرافيك)',
        text: 'تم الانتهاء من المسودة الأولى للغلاف، بانتظار استلام النصوص المعدلة للصفحات الداخلية من العميل.',
        createdAt: '2026-09-04 14:15'
      }
    ],
    subtotal: 6000.0,
    discountTotal: 0,
    taxRate: 15,
    taxAmount: 900.0,
    totalAmount: 6900.0,
    paidAmount: 6900.0,
    remainingAmount: 0,
    paymentMethod: 'bank_transfer'
  },
  {
    id: 'inv-wk-1005',
    invoiceNumber: 'INV-2026-1005',
    date: '2026-09-04',
    customerId: 'pt-2',
    customerName: 'مدارس رواد الغد الأهلية',
    customerPhone: '0544332211',
    subCustomerName: 'المرحلة الابتدائية - قسم الأنشطة',
    deliveryDate: '2026-09-10',
    workflowStatus: 'pending_approval',
    status: 'partial',
    type: 'print_order',
    notes: 'تم إرسال بروفة رقمية عبر الواتساب للمدير المالي وننتظر الموافقة الخطية للبدء الفعلي',
    items: [
      {
        itemId: 'ds-2',
        itemName: 'شهادات تقدير وتفوق مع فولدرات مقوى بصمة ذهبية',
        dimensions: 'A4 فاخر',
        quantity: 300,
        unit: 'طقم',
        unitPrice: 8.5,
        discount: 0,
        tax: 382.5,
        total: 2932.5,
        notes: 'ورق فابريانو إيطالي 280 جرام مع كليشة بصمة ساخنة ذهبي فلاش',
        attachments: [
          {
            id: 'att-orig-2',
            name: 'تصميم_شهادة_التقدير_المعتمد_مبدئيا.pdf',
            size: 3120000,
            type: 'application/pdf',
            uploadedAt: '2026-09-04 09:15',
            isOriginal: true,
            uploadedBy: 'أحمد النجار (قسم المبيعات)'
          },
          {
            id: 'att-rev-1',
            name: 'بروفة_تصحيح_أسماء_الطلاب_المتفوقين.xlsx',
            size: 140000,
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            uploadedAt: '2026-09-04 11:20',
            isOriginal: false,
            uploadedBy: 'رامي الكردي (فني تدقيق)'
          }
        ]
      }
    ],
    technicalNotes: [
      {
        id: 'tn-2',
        userName: 'م. طارق (مشرف الإنتاج)',
        text: 'زنكة البصمة جاهزة في الدرج رقم 4، فقط ننتظر إشارة الاعتماد من إدارة المدرسة للبدء فوراً.',
        createdAt: '2026-09-04 12:40'
      }
    ],
    subtotal: 2550.0,
    discountTotal: 0,
    taxRate: 15,
    taxAmount: 382.5,
    totalAmount: 2932.5,
    paidAmount: 1500.0,
    remainingAmount: 1432.5,
    paymentMethod: 'cash'
  },
  {
    id: 'inv-wk-1006',
    invoiceNumber: 'INV-2026-1006',
    date: '2026-09-03',
    customerName: 'مجموعة الميدان للتطوير والاستثمار',
    customerPhone: '0567788990',
    subCustomerName: 'معرض أبراج النخيل السكني',
    deliveryDate: '2026-09-09',
    workflowStatus: 'print_external',
    status: 'paid',
    type: 'print_order',
    notes: 'لوحات فلكس عملاقة مع هياكل حديدية، تم التنسيق مع ورشة الحسام الخارجية للطباعة واللحام',
    items: [
      {
        itemId: 'ds-3',
        itemName: 'لوحة فلكس عملاقة مع شاسيه حديد وأذرع إضاءة ليد',
        dimensions: '600 × 300 سم (18 م²)',
        quantity: 2,
        unit: 'لوحة',
        unitPrice: 1600.0,
        discount: 0,
        tax: 480.0,
        total: 3680.0,
        notes: 'فلكس كوري ثقيل مقاوم للأشعة فوق البنفسجية طباعة UV خارجية مع حلقات نحاسية',
        attachments: [
          {
            id: 'att-orig-3',
            name: 'ملف_الطباعة_النهائي_دقة_عالية_أبراج_النخيل.tiff',
            size: 18500000,
            type: 'image/tiff',
            uploadedAt: '2026-09-03 16:00',
            isOriginal: true,
            uploadedBy: 'سالم الدوسري'
          }
        ]
      }
    ],
    technicalNotes: [
      {
        id: 'tn-3',
        userName: 'سامي مرعي (مسؤول التوريدات الخارجية)',
        text: 'تم تسليم الملفات والحديد لورشة الحسام الخارجية، وتأكيد موعد استلام اللوحات المطبوعة صباح الغد.',
        createdAt: '2026-09-04 08:30'
      }
    ],
    subtotal: 3200.0,
    discountTotal: 0,
    taxRate: 15,
    taxAmount: 480.0,
    totalAmount: 3680.0,
    paidAmount: 3680.0,
    remainingAmount: 0,
    paymentMethod: 'bank_transfer'
  },
  {
    id: 'inv-wk-1007',
    invoiceNumber: 'INV-2026-1007',
    date: '2026-09-03',
    customerId: 'pt-1',
    customerName: 'عميل كاشير نقدي',
    customerPhone: '0551122334',
    subCustomerName: 'فرع الكورنيش الشمالي',
    deliveryDate: '2026-09-08',
    workflowStatus: 'print_internal',
    printStartedAt: '2026-09-04 10:00',
    printStartedBy: 'أبو خالد (فني ماكينة الهايدلبرغ)',
    status: 'paid',
    type: 'print_order',
    notes: 'منيو طعام مقوى مقاوم للسوائل مع ريجة وسلوفان مطفي ناعم عالي المتانة',
    items: [
      {
        itemId: 'ds-4',
        itemName: 'منيو طعام مطوي 3 طيات مقاس A3 مفتوح',
        dimensions: '42 × 29.7 سم',
        quantity: 1000,
        unit: 'منيو',
        unitPrice: 2.2,
        discount: 0,
        tax: 330.0,
        total: 2530.0,
        notes: 'كوشيه 350g ألماني، طباعة أوفست 4 ألوان وجهين + سلوفان حراري مطفي وجهين',
        attachments: [
          {
            id: 'att-orig-4',
            name: 'Menu_Alsahab_HighRes_PressReady.pdf',
            size: 9200000,
            type: 'application/pdf',
            uploadedAt: '2026-09-03 17:30',
            isOriginal: true,
            uploadedBy: 'محمد المبيعات'
          }
        ]
      }
    ],
    technicalNotes: [
      {
        id: 'tn-4',
        userName: 'أبو خالد (فني الطباعة)',
        text: 'الماكينة تعمل الآن على سحب الوجه الثاني، الألوان متطابقة تماماً مع عينة الكود اللوني.',
        createdAt: '2026-09-04 11:45'
      }
    ],
    subtotal: 2200.0,
    discountTotal: 0,
    taxRate: 15,
    taxAmount: 330.0,
    totalAmount: 2530.0,
    paidAmount: 2530.0,
    remainingAmount: 0,
    paymentMethod: 'bank_transfer'
  },
  {
    id: 'inv-wk-1008',
    invoiceNumber: 'INV-2026-1008',
    date: '2026-09-02',
    customerId: 'pt-3',
    customerName: 'مؤسسة أفق التقنية للتجارة',
    customerPhone: '0509988112',
    subCustomerName: 'قسم العلاقات العامة والمعارض',
    deliveryDate: '2026-09-07',
    workflowStatus: 'ready',
    printFinishedAt: '2026-09-04 13:00',
    printFinishedBy: 'أبو خالد (فني الطباعة)',
    status: 'paid',
    type: 'print_order',
    notes: 'أكياس ورقية هدايا فاخرة مع حبال حرير وبصمة سيلفر للشعار',
    items: [
      {
        itemId: 'ds-5',
        itemName: 'أكياس هدايا فاخرة كرافت أبيض مع يد حبل قطن',
        dimensions: '35 × 25 × 10 سم',
        quantity: 500,
        unit: 'كيس',
        unitPrice: 3.5,
        discount: 0,
        tax: 262.5,
        total: 2012.5,
        notes: 'ورق كرافت أبيض 220 جرام مع بصمة فضية هولوجرامية للشعار وتخريم مقوى',
        attachments: [
          {
            id: 'att-orig-5',
            name: 'قالب_القص_والتكسير_لكيس_الهدايا_أفق.ai',
            size: 5400000,
            type: 'application/illustrator',
            uploadedAt: '2026-09-02 11:00',
            isOriginal: true,
            uploadedBy: 'رامي الكردي'
          }
        ]
      }
    ],
    technicalNotes: [
      {
        id: 'tn-5',
        userName: 'هشام (مسؤول التغليف والتسليم)',
        text: 'تم فحص الجودة والتغليف في 10 كراتين مغلقة ومعلمة برقم الفاتورة، موجودة في قسم التسليم.',
        createdAt: '2026-09-04 13:15'
      }
    ],
    subtotal: 1750.0,
    discountTotal: 0,
    taxRate: 15,
    taxAmount: 262.5,
    totalAmount: 2012.5,
    paidAmount: 2012.5,
    remainingAmount: 0,
    paymentMethod: 'bank_transfer'
  }
];

export const initialPurchases: PurchaseInvoice[] = [
  {
    id: 'pur-2026-01',
    invoiceNumber: 'PUR-2026-0042',
    supplierInvoiceNumber: 'INV-RAW-9921',
    date: '2026-09-01',
    supplierId: 'pt-4',
    supplierName: 'شركة روائع الورق للتجارة والتوزيع',
    items: [
      { itemId: 'raw-1', itemName: 'رول ورق كوشيه مطفي 300 جرام مقاس 70×100', quantity: 10, unitPrice: 420.0, total: 4200.0 },
      { itemId: 'raw-2', itemName: 'ورق كوشيه لامع 150 جرام مقاس 70×100', quantity: 15, unitPrice: 260.0, total: 3900.0 }
    ],
    subtotal: 8100.0,
    taxRate: 15,
    taxAmount: 1215.0,
    totalAmount: 9315.0,
    paidAmount: 5000.0,
    paymentMethod: 'bank_transfer',
    status: 'partial',
    warehouse: 'مستودع الخامات الرئيسي',
    notes: 'متبقي 4315 ر.س يسدد خلال 30 يوماً'
  }
];

export const initialPurchaseReturns: PurchaseReturn[] = [
  {
    id: 'prn-2026-01',
    returnNumber: 'PRN-2026-0001',
    date: '2026-09-03',
    purchaseInvoiceId: 'pur-2026-01',
    purchaseInvoiceNumber: 'PUR-2026-0042',
    supplierId: 'pt-4',
    supplierName: 'شركة روائع الورق للتجارة والتوزيع',
    items: [
      {
        itemId: 'raw-2',
        itemName: 'ورق كوشيه لامع 150 جرام مقاس 70×100',
        quantity: 2,
        unitPrice: 260.0,
        total: 520.0,
        reason: 'تلف في حواف الرزم بسبب سوء التخزين أثناء النقل'
      }
    ],
    subtotal: 520.0,
    taxRate: 15,
    taxAmount: 78.0,
    totalAmount: 598.0,
    settlementType: 'credit_balance',
    notes: 'تم خصم القيمة من الرصيد المستحق للمورد بموجب إشعار مدين معتمد',
    createdAt: '2026-09-03'
  }
];

export const initialSalesReturns: SalesReturn[] = [
  {
    id: 'srn-2026-01',
    returnNumber: 'SR-2026-0001',
    date: '2026-09-04',
    invoiceId: 'inv-001',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'pt-1',
    customerName: 'مؤسسة الأفق للدعاية والإعلان',
    items: [
      {
        itemId: 'item-2',
        itemName: 'بروشورات دعائية مطوية A4 فاخرة',
        quantity: 1,
        unitPrice: 350.0,
        total: 350.0,
        reason: 'زيادة طفيفة عن حاجة العميل'
      }
    ],
    subtotal: 350.0,
    taxRate: 15,
    taxAmount: 52.5,
    totalAmount: 402.5,
    settlementType: 'credit_balance',
    notes: 'تم قيد المبلغ كرصيد دائن في حساب العميل بموجب إشعار دائن ضريبي معتمد',
    createdAt: '2026-09-04'
  }
];

export const initialJournalEntries: JournalEntry[] = [
  {
    id: 'je-001',
    entryNumber: 'JE-2026-0001',
    date: '2026-09-01',
    description: 'قيد إثبات فاتورة مشتريات ورق ومواد خام من شركة روائع الورق',
    referenceType: 'purchase',
    referenceId: 'pur-2026-01',
    createdAt: '2026-09-01',
    lines: [
      { accountCode: '1302', accountName: 'مخزون خامات وأوراق المطبعة', debit: 8100.0, credit: 0, description: 'إضافة الورق إلى مخزن الخامات' },
      { accountCode: '2103', accountName: 'أمانات ضريبة القيمة المضافة المستحقة (VAT)', debit: 1215.0, credit: 0, description: 'ضريبة المدخلات القابلة للخصم' },
      { accountCode: '1102', accountName: 'الحساب البنكي (مصرف الراجحي)', debit: 0, credit: 5000.0, description: 'دفعة مسددة تحويل بنكي' },
      { accountCode: '2101', accountName: 'الموردون والذمم الدائنة', debit: 0, credit: 4315.0, description: 'المتبقي للمورد في حسابه' }
    ]
  },
  {
    id: 'je-002',
    entryNumber: 'JE-2026-0002',
    date: '2026-09-03',
    description: 'قيد إثبات إيراد أمر طباعة كروت شخصية فاخرة لمؤسسة أفق التقنية',
    referenceType: 'print_order',
    referenceId: 'job-102',
    createdAt: '2026-09-03',
    lines: [
      { accountCode: '1102', accountName: 'الحساب البنكي (مصرف الراجحي)', debit: 1380.0, credit: 0, description: 'استلام قيمة الفاتورة بنكياً' },
      { accountCode: '4102', accountName: 'إيرادات أعمال ومطبوعات المطبعة', debit: 0, credit: 1200.0, description: 'صافي إيراد الطباعة' },
      { accountCode: '2103', accountName: 'أمانات ضريبة القيمة المضافة المستحقة (VAT)', debit: 0, credit: 180.0, description: 'ضريبة المخرجات 15%' }
    ]
  },
  {
    id: 'je-003',
    entryNumber: 'JE-2026-0003',
    date: '2026-09-04',
    description: 'قيد إثبات مبيعات نقطة البيع النقدية والشبكة (إقفال وردية كاشير)',
    referenceType: 'pos_invoice',
    referenceId: 'inv-pos-1001',
    createdAt: '2026-09-04',
    lines: [
      { accountCode: '1102', accountName: 'الحساب البنكي (مصرف الراجحي)', debit: 86.25, credit: 0, description: 'مقبوضات شبكة مدى' },
      { accountCode: '1101', accountName: 'الصندوق النقدي (الكاشير)', debit: 189.75, credit: 0, description: 'مقبوضات كاش الصندوق' },
      { accountCode: '4101', accountName: 'إيرادات مبيعات المكتبة والقرطاسية', debit: 0, credit: 230.0, description: 'مبيعات القرطاسية والكتب' },
      { accountCode: '4103', accountName: 'إيرادات خدمات التصوير والتجليد الفوري', debit: 0, credit: 10.0, description: 'خدمات تصوير مستندات' },
      { accountCode: '2103', accountName: 'أمانات ضريبة القيمة المضافة المستحقة (VAT)', debit: 0, credit: 36.0, description: 'ضريبة القيمة المضافة 15%' }
    ]
  }
];

export const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    code: 'EMP-001',
    name: 'المعلم مصطفى كمال',
    jobTitle: 'كبير خياطي الثياب والبدلات الرسمية',
    department: 'tailoring_sewing',
    nationalId: '2398471920',
    phone: '0551122334',
    email: 'mustafa.tailor@workshop.com',
    salaryType: 'monthly',
    salaryAmount: 4800,
    allowances: 600,
    pieceRatePerGarment: 45,
    tailorSpecialty: 'ثياب رجالية فاخرة وبدلات رسمية',
    hireDate: '2023-01-15',
    status: 'active',
    paymentMethod: 'bank_transfer',
    bankName: 'مصرف الراجحي',
    iban: 'SA0380000201608010111111',
    emergencyContactName: 'كمال مصطفى',
    emergencyContactPhone: '0559988776',
    emergencyRelation: 'الابن',
    notes: 'خبرة أكثر من 15 سنة في تفصيل الثياب الرجالية والقص الإيطالي للبدلات.',
    officialDailyHours: 8,
    officialStartTime: '08:00',
    officialEndTime: '16:30',
    defaultSplitShift: false,
    defaultBreakMinutes: 30,
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 1.5,
    customHourlyRate: 20,
    paymentHistory: [
      {
        id: 'sp-1',
        date: '2026-08-30',
        amount: 5400,
        type: 'salary',
        period: 'راتب شهر أغسطس 2026',
        paymentMethod: 'bank_transfer',
        voucherNumber: 'PV-SAL-001',
        notes: 'راتب أساسي 4800 + بدلات 600'
      }
    ]
  },
  {
    id: 'emp-2',
    code: 'EMP-002',
    name: 'الأسطى رضوان محمد',
    jobTitle: 'خياط ومفصل عبايات وفساتين سهرة',
    department: 'tailoring_sewing',
    nationalId: '1098234716',
    phone: '0562233445',
    email: 'radwan.sewing@workshop.com',
    salaryType: 'daily',
    salaryAmount: 140, // 140 شيكل يومية
    allowances: 0,
    pieceRatePerGarment: 55,
    tailorSpecialty: 'عبايات خليجية، فساتين مناسبات، تطريز يدوي',
    hireDate: '2023-06-01',
    status: 'active',
    paymentMethod: 'cash',
    notes: 'محاسبة بيومية العمل مع الساعات الإضافية (ساعة ونصف 1.5x).',
    officialDailyHours: 8,
    officialStartTime: '08:00',
    officialEndTime: '16:30',
    defaultSplitShift: false,
    defaultBreakMinutes: 30,
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 1.5, // ساعة ونصف
    paymentHistory: [
      {
        id: 'sp-2',
        date: '2026-08-30',
        amount: 3640,
        type: 'salary',
        period: 'مستحقات أيام شهر أغسطس 2026',
        paymentMethod: 'cash',
        voucherNumber: 'PV-SAL-002',
        notes: '26 يوم عمل فعلي'
      }
    ]
  },
  {
    id: 'emp-3',
    code: 'EMP-003',
    name: 'أمينة خليل الدوسري',
    jobTitle: 'مصممة أزياء وباترونات ومسؤولة أخذ المقاسات',
    department: 'design_patterns',
    nationalId: '1087654321',
    phone: '0543344556',
    email: 'amina.design@workshop.com',
    salaryType: 'monthly',
    salaryAmount: 4200,
    allowances: 400,
    hireDate: '2024-02-10',
    status: 'active',
    paymentMethod: 'bank_transfer',
    notes: 'مسؤولة عن استقبال الزبائن، أخذ القياسات بدقة، وتجهيز الباترونات الورقية والرقمية.',
    officialDailyHours: 8,
    officialStartTime: '08:00',
    officialEndTime: '16:30',
    defaultSplitShift: false,
    defaultBreakMinutes: 30,
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 1.5,
    paymentHistory: [
      {
        id: 'sp-3',
        date: '2026-08-30',
        amount: 4600,
        type: 'salary',
        period: 'راتب شهر أغسطس 2026',
        paymentMethod: 'bank_transfer',
        voucherNumber: 'PV-SAL-003',
        notes: 'راتب أساسي 4200 + بدلات 400'
      }
    ]
  },
  {
    id: 'emp-4',
    code: 'EMP-004',
    name: 'كريم عبد الباسط',
    jobTitle: 'فني فصال وقص أقمشة وباترونات',
    department: 'cutting',
    nationalId: '2411559988',
    phone: '0574455667',
    salaryType: 'weekly',
    salaryAmount: 850,
    allowances: 100,
    hireDate: '2024-05-01',
    status: 'active',
    paymentMethod: 'cash',
    notes: 'مسؤول طاولة الفصال والقص الأوتوماتيكي واليدوي وتجهيز الأثواب لمرحلة الخياطة.',
    officialDailyHours: 8,
    officialStartTime: '08:00',
    officialEndTime: '16:30',
    defaultSplitShift: false,
    defaultBreakMinutes: 30,
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 2.0, // ساعتين لكل ساعة أوفر تايم في مواسم الذروة
    paymentHistory: [
      {
        id: 'sp-4',
        date: '2026-09-02',
        amount: 950,
        type: 'salary',
        period: 'الأسبوع 35 (28 أغسطس - 3 سبتمبر)',
        paymentMethod: 'cash',
        voucherNumber: 'PV-SAL-004',
        notes: 'تسليم نقدي نهاية الأسبوع'
      }
    ]
  },
  {
    id: 'emp-5',
    code: 'EMP-005',
    name: 'طارق عبد المنعم',
    jobTitle: 'فني كي بالبخار وتشطيب وأزرار وسحابات',
    department: 'ironing_finishing',
    nationalId: '2455667788',
    phone: '0595566778',
    salaryType: 'daily',
    salaryAmount: 110,
    allowances: 0,
    hireDate: '2024-07-20',
    status: 'active',
    paymentMethod: 'cash',
    notes: 'مسؤول الكي النهائي بالبخار وتركيب الإكسسوارات والتغليف قبل التسليم للزبون.',
    officialDailyHours: 8,
    officialStartTime: '08:00',
    officialEndTime: '16:30',
    defaultSplitShift: false,
    defaultBreakMinutes: 30,
    overtimeMethod: 'fixed_rate',
    customOvertimeRate: 20, // 20 شيكل لكل ساعة أوفر تايم
    paymentHistory: [
      {
        id: 'sp-5',
        date: '2026-09-03',
        amount: 110,
        type: 'salary',
        period: 'يومية عمل 3 سبتمبر 2026',
        paymentMethod: 'cash',
        voucherNumber: 'PV-SAL-005',
        notes: 'يومية كاملة 8 ساعات'
      }
    ]
  }
];

export const initialAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-2026-0904-01',
    date: '2026-09-04',
    employeeId: 'emp-1',
    employeeName: 'المعلم مصطفى كمال',
    employeeCode: 'EMP-001',
    department: 'tailoring_sewing',
    status: 'present',
    checkInTime: '08:00',
    checkOutTime: '18:00', // عمل ساعتين إضافيتين
    breakMinutes: 60,
    officialDailyHours: 8,
    actualWorkedMinutes: 540, // 9 ساعات عمل فعلية
    actualWorkedHours: 9.0,
    regularHours: 8.0,
    overtimeHours: 1.0,
    lateMinutes: 0,
    earlyDepartureMinutes: 0,
    hourlyRateType: 'from_salary',
    baseHourlyRate: 20.0, // 4800 / 30 / 8 = 20 شيكل/ساعة
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 1.5, // ساعة ونصف
    overtimeRatePerHour: 30.0, // 20 * 1.5 = 30 شيكل
    regularPayEarned: 160.0,
    overtimePayEarned: 30.0,
    lateDeductionAmount: 0.0,
    totalDailyEarnings: 190.0,
    notes: 'إنهاء تفصيل ثوب رجالي عاجل قبل نهاية الدوام',
    createdAt: '2026-09-04 18:05'
  },
  {
    id: 'att-2026-0904-02',
    date: '2026-09-04',
    employeeId: 'emp-2',
    employeeName: 'الأسطى رضوان محمد',
    employeeCode: 'EMP-002',
    department: 'tailoring_sewing',
    status: 'present',
    checkInTime: '08:30',
    checkOutTime: '19:00', // 10.5 ساعات - 1 ساعة استراحة = 9.5 ساعات (1.5 ساعة أوفر تايم)
    breakMinutes: 60,
    officialDailyHours: 8,
    actualWorkedMinutes: 570,
    actualWorkedHours: 9.5,
    regularHours: 8.0,
    overtimeHours: 1.5,
    lateMinutes: 0,
    earlyDepartureMinutes: 0,
    hourlyRateType: 'from_salary',
    baseHourlyRate: 17.5, // 140 يومية / 8 ساعات = 17.5 شيكل
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 1.5,
    overtimeRatePerHour: 26.25,
    regularPayEarned: 140.0,
    overtimePayEarned: 39.38,
    lateDeductionAmount: 0.0,
    totalDailyEarnings: 179.38,
    notes: 'تطريز كم عباية سهرة',
    createdAt: '2026-09-04 19:02'
  },
  {
    id: 'att-2026-0904-03',
    date: '2026-09-04',
    employeeId: 'emp-3',
    employeeName: 'أمينة خليل الدوسري',
    employeeCode: 'EMP-003',
    department: 'design_patterns',
    status: 'present',
    checkInTime: '09:00',
    checkOutTime: '17:00',
    breakMinutes: 60,
    officialDailyHours: 8,
    actualWorkedMinutes: 420, // 7 ساعات عمل فعلية
    actualWorkedHours: 7.0,
    regularHours: 7.0,
    overtimeHours: 0.0,
    lateMinutes: 0,
    earlyDepartureMinutes: 0,
    hourlyRateType: 'from_salary',
    baseHourlyRate: 17.5,
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 1.5,
    overtimeRatePerHour: 26.25,
    regularPayEarned: 140.0,
    overtimePayEarned: 0.0,
    lateDeductionAmount: 0.0,
    totalDailyEarnings: 140.0,
    notes: 'أخذ مقاسات زبائن الفترة الصباحية والمسائية',
    createdAt: '2026-09-04 17:00'
  },
  {
    id: 'att-2026-0904-04',
    date: '2026-09-04',
    employeeId: 'emp-4',
    employeeName: 'كريم عبد الباسط',
    employeeCode: 'EMP-004',
    department: 'cutting',
    status: 'present',
    checkInTime: '08:00',
    checkOutTime: '18:30', // 10.5 ساعات - 1 ساعة استراحة = 9.5 ساعات (1.5 ساعة أوفر تايم بمضاعف 2x)
    breakMinutes: 60,
    officialDailyHours: 8,
    actualWorkedMinutes: 570,
    actualWorkedHours: 9.5,
    regularHours: 8.0,
    overtimeHours: 1.5,
    lateMinutes: 0,
    earlyDepartureMinutes: 0,
    hourlyRateType: 'from_salary',
    baseHourlyRate: 17.7, // 850 / 6 أيام / 8 = 17.7 شيكل
    overtimeMethod: 'multiplier',
    overtimeMultiplier: 2.0, // ساعتين لكل ساعة
    overtimeRatePerHour: 35.4,
    regularPayEarned: 141.6,
    overtimePayEarned: 53.1,
    lateDeductionAmount: 0.0,
    totalDailyEarnings: 194.7,
    notes: 'قص 6 أثواب رجالية وبدلتين',
    createdAt: '2026-09-04 18:35'
  },
  {
    id: 'att-2026-0904-05',
    date: '2026-09-04',
    employeeId: 'emp-5',
    employeeName: 'طارق عبد المنعم',
    employeeCode: 'EMP-005',
    department: 'ironing_finishing',
    status: 'present',
    checkInTime: '08:00',
    checkOutTime: '17:00', // 9 ساعات - 45 دقيقة استراحة = 8.25 ساعات (0.25 ساعة إضافي بمبلغ ثابت 20 شيكل)
    breakMinutes: 45,
    officialDailyHours: 8,
    actualWorkedMinutes: 495,
    actualWorkedHours: 8.25,
    regularHours: 8.0,
    overtimeHours: 0.25,
    lateMinutes: 0,
    earlyDepartureMinutes: 0,
    hourlyRateType: 'from_salary',
    baseHourlyRate: 13.75, // 110 / 8 = 13.75 شيكل
    overtimeMethod: 'fixed_rate',
    overtimeMultiplier: 1.0,
    overtimeRatePerHour: 20.0, // مبلغ مقطوع 20 شيكل للساعة
    regularPayEarned: 110.0,
    overtimePayEarned: 5.0,
    lateDeductionAmount: 0.0,
    totalDailyEarnings: 115.0,
    notes: 'كي وتغليف وتجهيز طلبيات التسليم',
    createdAt: '2026-09-04 17:05'
  }
];

export const initialEmployeeAdvances: EmployeeAdvance[] = [
  {
    id: 'adv-1',
    employeeId: 'emp-1',
    employeeName: 'محمد عبد الله الشمري',
    date: '2026-09-01',
    amount: 500,
    treasuryAccountCode: '1101',
    treasuryName: 'الصندوق النقدي (الكاشير)',
    reason: 'سلفة طارئة لشراء مستلزمات شخصية',
    status: 'pending',
    disbursedImmediately: true,
    voucherNumber: 'PV-ADV-2026-0001'
  }
];

export const initialEmployeeDeductions: EmployeeDeduction[] = [
  {
    id: 'ded-1',
    employeeId: 'emp-2',
    employeeName: 'كريم أحمد طارق',
    date: '2026-09-02',
    amount: 150,
    reason: 'خصم تأخير متكرر عن موعد بدء وردية تجهيز ملفات الفرز والطباعة',
    status: 'pending'
  }
];

export const initialEmployeeIncentives: EmployeeIncentive[] = [
  {
    id: 'inc-1',
    employeeId: 'emp-3',
    employeeName: 'سارة خالد المنصور',
    date: '2026-09-03',
    amount: 250,
    reason: 'حافز تميز في خدمة العملاء ومبيعات الأدوات المدرسية والقرطاسية',
    status: 'pending'
  }
];

export const initialPayrollSheets: PayrollSheet[] = [
  {
    id: 'prs-aug-2026',
    sheetNumber: 'PR-2026-0801',
    title: 'مسير رواتب شهر أغسطس 2026 (شهري)',
    salaryType: 'monthly',
    period: 'أغسطس 2026',
    createdAt: '2026-08-30',
    status: 'approved',
    disbursedAt: '2026-08-30',
    treasuryAccountCode: '1102',
    treasuryName: 'الحساب البنكي (مصرف الراجحي)',
    voucherNumber: 'PV-SAL-2026-0801',
    notes: 'تم اعتماد وصرف مسير رواتب الموظفين ذوي الرواتب الشهرية عن شهر أغسطس 2026 بنجاح',
    totalBasic: 12500,
    totalAllowances: 1300,
    totalIncentives: 400,
    totalDeductions: 0,
    totalAdvances: 300,
    totalNet: 13900,
    employeesCount: 3,
    items: [
      {
        employeeId: 'emp-1',
        employeeName: 'محمد عبد الله الشمري',
        employeeCode: 'EMP-001',
        jobTitle: 'كبير فنيي ومشغلي ماكينات الطباعة الرقمية والأوفست',
        department: 'printing',
        salaryType: 'monthly',
        basicSalary: 4500,
        allowances: 500,
        incentives: 200,
        deductions: 0,
        advancesDeducted: 300,
        netSalary: 4900,
        isIncluded: true,
        notes: 'خصم سلفة 300 ريال + حافز 200 ريال'
      },
      {
        employeeId: 'emp-2',
        employeeName: 'كريم أحمد طارق',
        employeeCode: 'EMP-002',
        jobTitle: 'مصمم جرافيك ومسؤول فرز الألوان ومونتاج الطباعة',
        department: 'design',
        salaryType: 'monthly',
        basicSalary: 4200,
        allowances: 400,
        incentives: 0,
        deductions: 0,
        advancesDeducted: 0,
        netSalary: 4600,
        isIncluded: true
      },
      {
        employeeId: 'emp-3',
        employeeName: 'سارة خالد المنصور',
        employeeCode: 'EMP-003',
        jobTitle: 'كاشيرة ومسؤولة مبيعات القرطاسية والخدمات الطلابية',
        department: 'sales_pos',
        salaryType: 'monthly',
        basicSalary: 3800,
        allowances: 400,
        incentives: 200,
        deductions: 0,
        advancesDeducted: 0,
        netSalary: 4400,
        isIncluded: true,
        notes: 'مكافأة تميز مبيعات 200 ريال'
      }
    ]
  }
];

export const initialTreasuries: Treasury[] = [
  {
    id: 'treasury-cash-main',
    name: 'الصندوق النقدي (الخزينة الرئيسية)',
    type: 'cash_box',
    accountCode: '1101',
    balance: 6560, // القيمة التقديرية بالعملة الأساسية (1000 + 800*3.70 + 500*5.20 = 6,560 ₪)
    currencyBalances: {
      ILS: 1000,
      USD: 800,
      JOD: 500
    },
    isDefault: true,
    status: 'active',
    notes: 'الخزينة النقدية الرئيسية لمكتب المبيعات والكاشير والسيولة متعددة العملات (شيكل، دولار، دينار)',
    createdAt: '2026-01-01',
    transactions: [
      {
        id: 'tx-rc-1',
        treasuryId: 'treasury-cash-main',
        treasuryName: 'الصندوق النقدي (الخزينة الرئيسية)',
        date: '2026-09-10',
        type: 'deposit',
        amount: 1000,
        currency: 'ILS',
        currencySymbol: '₪',
        exchangeRate: 1.0,
        baseCurrency: 'ILS',
        baseAmount: 1000,
        balanceAfter: 1000,
        balanceAfterCurrency: 1000,
        voucherNumber: 'RC-1',
        partyName: 'عميل نقدي',
        description: 'سند قبض مبيعات نقدية',
        referenceType: 'receipt'
      },
      {
        id: 'tx-rc-2',
        treasuryId: 'treasury-cash-main',
        treasuryName: 'الصندوق النقدي (الخزينة الرئيسية)',
        date: '2026-09-10',
        type: 'deposit',
        amount: 1000,
        currency: 'USD',
        currencySymbol: '$',
        exchangeRate: 3.70,
        baseCurrency: 'ILS',
        baseAmount: 3700,
        balanceAfter: 4700,
        balanceAfterCurrency: 1000,
        voucherNumber: 'RC-2',
        partyName: 'شركة النور للدعاية',
        description: 'سند قبض - دفعة حساب عميل بالدولار',
        referenceType: 'receipt'
      },
      {
        id: 'tx-pv-1',
        treasuryId: 'treasury-cash-main',
        treasuryName: 'الصندوق النقدي (الخزينة الرئيسية)',
        date: '2026-09-10',
        type: 'withdrawal',
        amount: 200,
        currency: 'USD',
        currencySymbol: '$',
        exchangeRate: 3.70,
        baseCurrency: 'ILS',
        baseAmount: -740,
        balanceAfter: 3960,
        balanceAfterCurrency: 800,
        voucherNumber: 'PV-1',
        partyName: 'مصروفات تشغيلية ونثريات',
        description: 'سند صرف مصروفات تشغيلية بالدولار',
        referenceType: 'expense'
      },
      {
        id: 'tx-rc-3',
        treasuryId: 'treasury-cash-main',
        treasuryName: 'الصندوق النقدي (الخزينة الرئيسية)',
        date: '2026-09-10',
        type: 'deposit',
        amount: 500,
        currency: 'JOD',
        currencySymbol: 'د.أ',
        exchangeRate: 5.20,
        baseCurrency: 'ILS',
        baseAmount: 2600,
        balanceAfter: 6560,
        balanceAfterCurrency: 500,
        voucherNumber: 'RC-3',
        partyName: 'مكتب القدس للاستشارات',
        description: 'سند قبض - عميل بالدينار الأردني',
        referenceType: 'receipt'
      }
    ]
  },
  {
    id: 'treasury-bank-rajhi',
    name: 'تطبيق مصرف الراجحي للأعمال',
    type: 'bank_app',
    accountCode: '1102',
    balance: 94850,
    currencyBalances: {
      ILS: 85600,
      USD: 2500
    },
    bankName: 'مصرف الراجحي',
    accountNumber: 'SA0380000201608010099999',
    status: 'active',
    notes: 'حساب التطبيق البنكي للتحويلات الفورية السريعة وسداد الموردين والرواتب',
    createdAt: '2026-01-01',
    transactions: [
      {
        id: 'tx-2',
        treasuryId: 'treasury-bank-rajhi',
        treasuryName: 'تطبيق مصرف الراجحي للأعمال',
        date: '2026-09-01',
        type: 'deposit',
        amount: 85600,
        currency: 'ILS',
        currencySymbol: '₪',
        exchangeRate: 1.0,
        baseCurrency: 'ILS',
        baseAmount: 85600,
        balanceAfter: 85600,
        balanceAfterCurrency: 85600,
        voucherNumber: 'OB-01',
        description: 'رصيد افتتاحي في الحساب البنكي بالشيكل',
        referenceType: 'opening'
      }
    ]
  },
  {
    id: 'treasury-pos-mada',
    name: 'جهاز نقاط البيع ومدى (POS)',
    type: 'pos_terminal',
    accountCode: '1103',
    balance: 18400,
    currencyBalances: {
      ILS: 18400
    },
    bankName: 'شبكة المدفوعات السعودية (مدى)',
    accountNumber: 'POS-TERM-8841',
    status: 'active',
    notes: 'متحصلات شبكة مدى والبطاقات البنكية في الكاشير',
    createdAt: '2026-01-10',
    transactions: [
      {
        id: 'tx-3',
        treasuryId: 'treasury-pos-mada',
        treasuryName: 'جهاز نقاط البيع ومدى (POS)',
        date: '2026-09-01',
        type: 'deposit',
        amount: 18400,
        currency: 'ILS',
        currencySymbol: '₪',
        exchangeRate: 1.0,
        baseCurrency: 'ILS',
        baseAmount: 18400,
        balanceAfter: 18400,
        balanceAfterCurrency: 18400,
        voucherNumber: 'POS-01',
        description: 'رصيد عمليات مدى المرحلة',
        referenceType: 'opening'
      }
    ]
  },
  {
    id: 'treasury-wallet-stcpay',
    name: 'تطبيق STC Pay للأعمال',
    type: 'digital_wallet',
    accountCode: '1105',
    balance: 6500,
    currencyBalances: {
      ILS: 6500
    },
    bankName: 'stc pay / بنك STC',
    accountNumber: '0501234567',
    status: 'active',
    notes: 'محفظة رقمية للمدفوعات السريعة عبر رمز الاستجابة QR',
    createdAt: '2026-02-01',
    transactions: [
      {
        id: 'tx-4',
        treasuryId: 'treasury-wallet-stcpay',
        treasuryName: 'تطبيق STC Pay للأعمال',
        date: '2026-09-01',
        type: 'deposit',
        amount: 6500,
        currency: 'ILS',
        currencySymbol: '₪',
        exchangeRate: 1.0,
        baseCurrency: 'ILS',
        baseAmount: 6500,
        balanceAfter: 6500,
        balanceAfterCurrency: 6500,
        voucherNumber: 'WAL-01',
        description: 'رصيد المحفظة الإلكترونية',
        referenceType: 'opening'
      }
    ]
  }
];

export const initialVouchers: PaymentVoucher[] = [
  {
    id: 'vch-init-1',
    voucherNumber: 'RCT-2026-0001',
    type: 'receipt',
    date: '2026-09-02',
    partyId: 'pt-1',
    partyName: 'عميل كاشير نقدي',
    amount: 1300.0,
    paymentMethod: 'bank_transfer',
    accountCode: '1201',
    description: 'سند قبض دفعة على الحساب تحويل لحساب مصرف الراجحي'
  },
  {
    id: 'vch-init-2',
    voucherNumber: 'RCT-2026-0002',
    type: 'receipt',
    date: '2026-09-03',
    partyId: 'pt-2',
    partyName: 'مدارس رواد الغد الأهلية',
    amount: 2000.0,
    paymentMethod: 'bank_transfer',
    accountCode: '1201',
    description: 'سداد دفعة تحت حساب طباعة الملازم ودفاتر المتابعة'
  },
  {
    id: 'vch-init-3',
    voucherNumber: 'PAY-2026-0001',
    type: 'payment',
    date: '2026-09-01',
    partyId: 'pt-4',
    partyName: 'شركة روائع الورق للتجارة والتوزيع',
    amount: 5000.0,
    paymentMethod: 'bank_transfer',
    accountCode: '2101',
    description: 'سند صرف دفعة مسددة من فاتورة توريد الورق PUR-2026-0042'
  },
  {
    id: 'vch-init-4',
    voucherNumber: 'PAY-2026-0002',
    type: 'payment',
    date: '2026-09-02',
    partyId: 'pt-5',
    partyName: 'مؤسسة التقنية للأحبار ومستلزمات المطابع',
    amount: 2000.0,
    paymentMethod: 'bank_transfer',
    accountCode: '2101',
    description: 'سداد دفعة على الحساب من مستحقات أحبار المطبعة'
  }
];

export const initialStockMovements: StockMovement[] = [
  // 1. دفتر سلك جامعي 200 صفحة (STAT-0001)
  {
    id: 'sm-1',
    itemId: 'inv-1',
    itemCode: 'STAT-0001',
    itemName: 'دفتر سلك جامعي 200 صفحة مسطر فاخر',
    category: 'stationery',
    date: '2026-08-15',
    time: '09:00',
    type: 'in_opening',
    quantity: 150,
    balanceBefore: 0,
    balanceAfter: 150,
    unitPrice: 8.5,
    totalValue: 1275,
    referenceType: 'opening',
    referenceNumber: 'OP-2026',
    reason: 'رصيد افتتاحي لبداية الفترة المالية',
    performedBy: 'أمين المستودع'
  },
  {
    id: 'sm-2',
    itemId: 'inv-1',
    itemCode: 'STAT-0001',
    itemName: 'دفتر سلك جامعي 200 صفحة مسطر فاخر',
    category: 'stationery',
    date: '2026-08-25',
    time: '11:30',
    type: 'in_purchase',
    quantity: 50,
    balanceBefore: 150,
    balanceAfter: 200,
    unitPrice: 8.5,
    totalValue: 425,
    referenceType: 'purchase',
    referenceNumber: 'PUR-2026-0038',
    reason: 'توريد دفعة جديدة مع بدء العام الدراسي',
    performedBy: 'مشتريات'
  },
  {
    id: 'sm-3',
    itemId: 'inv-1',
    itemCode: 'STAT-0001',
    itemName: 'دفتر سلك جامعي 200 صفحة مسطر فاخر',
    category: 'stationery',
    date: '2026-08-28',
    time: '14:20',
    type: 'out_sale',
    quantity: 15,
    balanceBefore: 200,
    balanceAfter: 185,
    unitPrice: 15.0,
    totalValue: 225,
    referenceType: 'pos_invoice',
    referenceNumber: 'INV-2026-0089',
    reason: 'مبيعات كاشير المعرض',
    performedBy: 'كاشير 1'
  },
  {
    id: 'sm-4',
    itemId: 'inv-1',
    itemCode: 'STAT-0001',
    itemName: 'دفتر سلك جامعي 200 صفحة مسطر فاخر',
    category: 'stationery',
    date: '2026-09-02',
    time: '16:45',
    type: 'out_sale',
    quantity: 5,
    balanceBefore: 185,
    balanceAfter: 180,
    unitPrice: 15.0,
    totalValue: 75,
    referenceType: 'pos_invoice',
    referenceNumber: 'INV-2026-0102',
    reason: 'مبيعات كاشير للطلاب',
    performedBy: 'كاشير 2'
  },

  // 2. رول ورق كوشيه مطفي 300 جرام (RAW-0001)
  {
    id: 'sm-5',
    itemId: 'raw-1',
    itemCode: 'RAW-0001',
    itemName: 'رول ورق كوشيه مطفي 300 جرام مقاس 70×100 (باندة)',
    category: 'print_raw',
    date: '2026-08-10',
    time: '08:30',
    type: 'in_opening',
    quantity: 10,
    balanceBefore: 0,
    balanceAfter: 10,
    unitPrice: 420.0,
    totalValue: 4200,
    referenceType: 'opening',
    referenceNumber: 'OP-2026',
    reason: 'رصيد افتتاحي مستودع خامات المطبعة',
    performedBy: 'مسؤول المستودع'
  },
  {
    id: 'sm-6',
    itemId: 'raw-1',
    itemCode: 'RAW-0001',
    itemName: 'رول ورق كوشيه مطفي 300 جرام مقاس 70×100 (باندة)',
    category: 'print_raw',
    date: '2026-08-22',
    time: '10:15',
    type: 'in_purchase',
    quantity: 8,
    balanceBefore: 10,
    balanceAfter: 18,
    unitPrice: 420.0,
    totalValue: 3360,
    referenceType: 'purchase',
    referenceNumber: 'PUR-2026-0040',
    reason: 'توريد خامات من شركة روائع الورق',
    performedBy: 'قسم المشتريات'
  },
  {
    id: 'sm-7',
    itemId: 'raw-1',
    itemCode: 'RAW-0001',
    itemName: 'رول ورق كوشيه مطفي 300 جرام مقاس 70×100 (باندة)',
    category: 'print_raw',
    date: '2026-08-27',
    time: '13:00',
    type: 'out_print_job',
    quantity: 3,
    balanceBefore: 18,
    balanceAfter: 15,
    unitPrice: 420.0,
    totalValue: 1260,
    referenceType: 'print_order',
    referenceNumber: 'JOB-2026-001',
    reason: 'صرف للإنتاج: طباعة كروت وبطاقات دعائية',
    performedBy: 'فني المطبعة'
  },
  {
    id: 'sm-8',
    itemId: 'raw-1',
    itemCode: 'RAW-0001',
    itemName: 'رول ورق كوشيه مطفي 300 جرام مقاس 70×100 (باندة)',
    category: 'print_raw',
    date: '2026-09-03',
    time: '15:30',
    type: 'out_adjustment',
    quantity: 1,
    balanceBefore: 15,
    balanceAfter: 14,
    unitPrice: 420.0,
    totalValue: 420,
    referenceType: 'adjustment',
    referenceNumber: 'ADJ-2026-003',
    reason: 'عجز وتسوية جرد: تالف وهالك تجارب ضبط ألوان الماكينة',
    performedBy: 'لجنة الجرد والمراقبة'
  },

  // 3. كرتون ورق تصوير A4 رويال 80 جرام (STAT-003)
  {
    id: 'sm-9',
    itemId: 'inv-3',
    itemCode: 'STAT-003',
    itemName: 'كرتون ورق تصوير A4 رويال 80 جرام (5 رزم)',
    category: 'stationery',
    date: '2026-08-18',
    time: '09:45',
    type: 'in_opening',
    quantity: 40,
    balanceBefore: 0,
    balanceAfter: 40,
    unitPrice: 75.0,
    totalValue: 3000,
    referenceType: 'opening',
    referenceNumber: 'OP-2026',
    reason: 'رصيد مخزني مدور',
    performedBy: 'أمين المستودع'
  },
  {
    id: 'sm-10',
    itemId: 'inv-3',
    itemCode: 'STAT-003',
    itemName: 'كرتون ورق تصوير A4 رويال 80 جرام (5 رزم)',
    category: 'stationery',
    date: '2026-08-26',
    time: '12:10',
    type: 'in_purchase',
    quantity: 30,
    balanceBefore: 40,
    balanceAfter: 70,
    unitPrice: 75.0,
    totalValue: 2250,
    referenceType: 'purchase',
    referenceNumber: 'PUR-2026-0042',
    reason: 'طلب توريد كميات إضافية',
    performedBy: 'مشتريات'
  },
  {
    id: 'sm-11',
    itemId: 'inv-3',
    itemCode: 'STAT-003',
    itemName: 'كرتون ورق تصوير A4 رويال 80 جرام (5 رزم)',
    category: 'stationery',
    date: '2026-09-01',
    time: '17:00',
    type: 'out_sale',
    quantity: 5,
    balanceBefore: 70,
    balanceAfter: 65,
    unitPrice: 95.0,
    totalValue: 475,
    referenceType: 'pos_invoice',
    referenceNumber: 'INV-2026-0098',
    reason: 'بيع جملة لمكتب هندسي',
    performedBy: 'كاشير 1'
  },

  // 4. رول بانر كوري أوت دور (RAW-003) - تحت حد الطلب
  {
    id: 'sm-12',
    itemId: 'raw-3',
    itemCode: 'RAW-003',
    itemName: 'رول بانر كوري أوت دور وزن 440 جرام مقاس 3.2م × 50م',
    category: 'print_raw',
    date: '2026-08-10',
    time: '08:30',
    type: 'in_opening',
    quantity: 12,
    balanceBefore: 0,
    balanceAfter: 12,
    unitPrice: 380.0,
    totalValue: 4560,
    referenceType: 'opening',
    referenceNumber: 'OP-2026',
    reason: 'رصيد افتتاحي مستودع اللوحات',
    performedBy: 'مسؤول المستودع'
  },
  {
    id: 'sm-13',
    itemId: 'raw-3',
    itemCode: 'RAW-003',
    itemName: 'رول بانر كوري أوت دور وزن 440 جرام مقاس 3.2م × 50م',
    category: 'print_raw',
    date: '2026-08-25',
    time: '14:30',
    type: 'out_print_job',
    quantity: 4,
    balanceBefore: 12,
    balanceAfter: 8,
    unitPrice: 380.0,
    totalValue: 1520,
    referenceType: 'print_order',
    referenceNumber: 'JOB-2026-003',
    reason: 'صرف لتشغيل لوحات إعلانية انتخابية وترويجية (وصل لحد الطلب 8 رولات)',
    performedBy: 'فني طابعات الفليكس'
  },

  // 5. كتاب "قوة العادات" (BOOK-001)
  {
    id: 'sm-14',
    itemId: 'inv-5',
    itemCode: 'BOOK-001',
    itemName: 'كتاب "قوة العادات" - تشارلز دويج (مترجم)',
    category: 'books',
    date: '2026-08-12',
    time: '10:00',
    type: 'in_opening',
    quantity: 25,
    balanceBefore: 0,
    balanceAfter: 25,
    unitPrice: 35.0,
    totalValue: 875,
    referenceType: 'opening',
    referenceNumber: 'OP-2026',
    reason: 'رصيد افتتاحي ركن الكتب',
    performedBy: 'مسؤول المكتبة'
  },
  {
    id: 'sm-15',
    itemId: 'inv-5',
    itemCode: 'BOOK-001',
    itemName: 'كتاب "قوة العادات" - تشارلز دويج (مترجم)',
    category: 'books',
    date: '2026-08-29',
    time: '18:15',
    type: 'out_sale',
    quantity: 7,
    balanceBefore: 25,
    balanceAfter: 18,
    unitPrice: 55.0,
    totalValue: 385,
    referenceType: 'pos_invoice',
    referenceNumber: 'INV-2026-0092',
    reason: 'مبيعات معرض الكتاب الداخلي',
    performedBy: 'كاشير 2'
  }
];

export const initialExpenses: ExpenseItem[] = [
  {
    id: 'exp-1',
    date: '2026-09-13',
    expenseAccountCode: '5203',
    expenseAccountName: 'مصروفات الصيانة وقطع غيار الماكينات',
    category: 'maintenance',
    categoryName: 'صيانة ماكينات',
    amount: 450,
    paymentMethod: 'cash',
    treasuryAccountCode: '1101',
    treasuryName: 'الصندوق الرئيسي (كاش)',
    beneficiary: 'فني صيانة ماكينات Heidelberg',
    taxInvoiceNumber: 'INV-MT-8841',
    notes: 'صيانة دورية للمقص الهيدروليكي وتبديل حساس الأمان',
    createdAt: '2026-09-13T10:00:00.000Z'
  },
  {
    id: 'exp-2',
    date: '2026-09-13',
    expenseAccountCode: '5205',
    expenseAccountName: 'مصروفات عمومية وتسويق',
    category: 'hospitality',
    categoryName: 'ضيافة وبوفيه',
    amount: 180,
    paymentMethod: 'cash',
    treasuryAccountCode: '1101',
    treasuryName: 'الصندوق الرئيسي (كاش)',
    beneficiary: 'سوبرماركت المدينة',
    taxInvoiceNumber: 'REC-992',
    notes: 'شراء شاي وقهوة ومستلزمات نظافة للمطبعة والمكتبة',
    createdAt: '2026-09-13T11:30:00.000Z'
  },
  {
    id: 'exp-3',
    date: '2026-09-11',
    expenseAccountCode: '5204',
    expenseAccountName: 'مصروفات الكهرباء والماء والمرافق',
    category: 'utilities',
    categoryName: 'كهرباء ومرافق',
    amount: 1250,
    paymentMethod: 'bank_transfer',
    treasuryAccountCode: '1102',
    treasuryName: 'بنك فلسطين - جاري',
    beneficiary: 'شركة توزيع الكهرباء',
    taxInvoiceNumber: 'ELEC-2026-09',
    notes: 'سداد فاتورة استهلاك كهرباء خط الورشة والمطبعة',
    createdAt: '2026-09-11T14:00:00.000Z'
  },
  {
    id: 'exp-4',
    date: '2026-09-08',
    expenseAccountCode: '5205',
    expenseAccountName: 'مصروفات عمومية وتسويق',
    category: 'marketing',
    categoryName: 'تسويق وإعلانات',
    amount: 600,
    paymentMethod: 'bank_transfer',
    treasuryAccountCode: '1102',
    treasuryName: 'بنك فلسطين - جاري',
    beneficiary: 'وكالة الإعلان الرقمي',
    taxInvoiceNumber: 'ADS-1049',
    notes: 'حملة إعلانية ممولة على منصات التواصل لموسم المدارس والطباعة',
    createdAt: '2026-09-08T09:15:00.000Z'
  }
];


