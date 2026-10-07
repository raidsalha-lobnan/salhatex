export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  code: string;
  name: string;
  nameEn?: string;
  type: AccountType;
  balance: number;
  parentCode?: string;
  isSystem?: boolean;
  description?: string;
}

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  referenceType: 'pos_invoice' | 'print_order' | 'purchase' | 'purchase_return' | 'sales_return' | 'manual' | 'expense' | 'receipt' | 'payment' | 'transfer' | 'cogs' | 'clearance';
  referenceId?: string;
  lines: JournalEntryLine[];
  createdAt: string;
}

export type ItemCategory = string; // دروع تكريم وهدايا دعائية ومطبوعات جلدية

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'QR';

export interface AdditionalBarcode {
  barcode: string;
  label?: string; // e.g. "باركود كرتونة", "باركود حبة", "باركود مورد", "باركود بديل", "باركود عبوة"
  type?: BarcodeFormat;
  createdAt?: string;
}

export type UnitCalculationType = 
  | 'area'    // متر مربع: طول × عرض × كمية × سعر
  | 'linear'  // متر طولي: طول × كمية × سعر
  | 'unit'    // بالوحدة / حبة: كمية × سعر
  | 'custom'; // مخصص

export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  calculationType: UnitCalculationType;
  symbol: string;
  isDefault?: boolean;
  description?: string;
}

export type InvoicePaymentStatus =
  | 'unpaid'                // غير مدفوع
  | 'partially_paid_cash'   // مدفوع نقدا جزئيا
  | 'paid_cash'             // مدفوع نقدا بالكامل
  | 'partially_paid_bank'   // مدفوع بنكي جزئيا
  | 'paid_bank'             // مدفوع بنكي بالكامل
  | 'paid_cash_bank'        // مدفوع نقدي وبنكي
  | 'credit';               // آجل

export type PosInvoiceWorkflowStatus = 
  | 'new'                   // جديد (فاتورة مباشرة تدخل مباشرة ضمن القيود المحاسبية)
  | 'quotation'             // عرض سعر (لا يظهر إلا بالكاشير ولا يعتمد بالحسابات أو المخزون)
  | 'design'                // تصميم (تذهب للمصمم دون حسابات أو مخزون إلا حين تصبح جاهزة للتسليم)
  | 'pending_approval'      // بانتظار الاعتماد (تنتظر موافقة الزبون)
  | 'print_external'        // طباعة خارجي (قيد التنفيذ خارج المطبعة - أمر توريد)
  | 'print_internal'        // طباعة داخلي (قيد التنفيذ داخل ورشة المطبعة)
  | 'ready'                 // جاهز للتسليم (تدخل القيود المحاسبية وكشف الزبون حتى لو لم تدفع)
  | 'delivered'             // تم التسليم (تخرج من أوامر الطباعة وتدخل القيود المحاسبية)
  | 'deferred'              // مؤجل (لا تدخل القيود وتظهر فقط في كشف الحالات)
  | 'paused'                // متوقف (توقف العمل بها)
  | 'editing'               // تعديل (توقف العمل بها للتعديل)
  | 'cancelled'             // إلغاء (ملغاة)
  // توافق عكسي:
  | 'designing'
  | 'in_progress_external'
  | 'in_progress_internal'
  | 'in_progress';

export interface CategoryDefinition {
  id: ItemCategory;
  name: string;
  nameEn: string;
  prefix: string;
  description: string;
  defaultUnit: string;
  color: string;
}

export interface CustomerSpecialPrice {
  customerId: string;
  customerName?: string;
  customerCode?: string;
  price: number;
  notes?: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  barcode: string;
  barcodeType?: BarcodeFormat;
  additionalBarcodes?: string[]; // قائمة الباركودات الإضافية / البديلة
  barcodeEntries?: AdditionalBarcode[]; // بيانات تفصيلية للباركودات المتعددة (كرتونة، حبة، مورد...)
  name: string;
  category: ItemCategory;
  unit: string;
  unitId?: string;
  unitCalculationType?: UnitCalculationType;
  purchasePrice: number;
  sellingPrice: number; // سعر بيع 1 (الأساسي / الافتراضي)
  sellingPrice2?: number; // سعر بيع 2 (جملة)
  sellingPrice3?: number; // سعر بيع 3 (نصف جملة / موزع)
  customerSpecialPrices?: CustomerSpecialPrice[]; // أسعار خاصة لعملاء محددين
  stockQuantity: number;
  warehouseStock?: Record<string, number>; // توزيع الرصيد حسب المخزن { [warehouseId]: quantity }
  minAlertQuantity: number;
  description?: string;
  isRawMaterial?: boolean; // للمطبعة
  imageUrl?: string; // رابط أو صورة الصنف المرفوعة (تظهر في شاشة الكاشير والمفضلة)
  isFavorite?: boolean; // صنف مفضل في الكاشير للوصول السريع
  lastMovementDate?: string;
}

export type StockMovementType =
  | 'in_purchase'    // وارد مشتريات وتوريد
  | 'in_receipt'     // إذن استلام مخزني
  | 'in_return'      // وارد مرتجع مبيعات من عميل
  | 'in_adjustment'  // تسوية مخزنية (زيادة وفائض)
  | 'in_opening'     // رصيد افتتاحي
  | 'transfer_in'    // وارد تحويل بين المستودعات والفروع
  | 'out_sale'       // منصرف مبيعات كاشير
  | 'out_issue'      // إذن صرف مخزني
  | 'out_print_job'  // منصرف تشغيل أمر شغل مطبعة
  | 'out_return'     // منصرف مردودات مشتريات إلى مورد
  | 'out_adjustment' // تسوية مخزنية (عجز ونقص)
  | 'out_damaged'    // إتلاف وهالك تشغيل
  | 'transfer_out'   // منصرف تحويل بين المستودعات والفروع
  | 'inventory_audit'// محضر جرد دوري
  | 'stock_modify';  // تعديل مخزون مباشر

export interface StockMovement {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  category: ItemCategory;
  date: string;
  time?: string;
  type: StockMovementType;
  quantity: number; // كمية الحركة الموجبة
  balanceBefore: number;
  balanceAfter: number;
  unitPrice?: number;
  totalValue?: number;
  referenceType: 'purchase' | 'pos_invoice' | 'print_order' | 'adjustment' | 'return' | 'opening' | 'manual' | 'receipt' | 'issue' | 'transfer' | 'audit' | 'settlement' | 'damaged' | 'stock_modify';
  referenceNumber?: string;
  documentNumber?: string; // رقم المستند الرسمي (REC-..., ISS-..., TRF-..., AUD-..., ADJ-..., DMG-..., RET-..., MOD-...)
  userId?: string;        // المستخدم منفذ الحركة
  userName?: string;      // اسم المستخدم
  branchId?: string;      // الفرع
  branchName?: string;    // اسم الفرع
  warehouseId?: string;   // المستودع المعني
  warehouseName?: string; // اسم المستودع
  targetWarehouseId?: string;
  targetWarehouseName?: string;
  targetBranchId?: string;
  targetBranchName?: string;
  reason?: string;
  notes?: string;
  performedBy?: string;
}

export interface StockAdjustmentEntry {
  itemId: string;
  currentQuantity: number;
  countedQuantity: number;
  difference: number; // counted - current
  type: 'surplus' | 'deficit' | 'matched';
  unitCost: number;
  totalDiffValue: number;
  reason: string;
  notes?: string;
}

export type PrintServiceType = 
  | 'mens_thobe'          // ثوب رجالي / دشداشة
  | 'womens_dress'        // فستان سهرة / زفاف
  | 'abaya'               // عباية وجلابية
  | 'formal_suit'         // بدلة رسمية / جاكيت
  | 'shirt_pants'         // قميص وبنطلون
  | 'uniform'             // زي موحد / مريول مدرسي
  | 'school_uniform'      // زي مدرسي
  | 'workwear_uniform'    // يونيفورم مهني
  | 'curtains_furnishings'// ستائر ومفروشات
  | 'alterations_repair'  // تعديل وتقصير وتصليح
  | 'embroidery'          // تطريز وشك يدوي وآلي
  | 'custom_tailoring'    // تفصيل وموديل خاص
  | 'custom_sewing'       // خياطة حسب الطلب
  // توافق عكسي مع طلبات سابقة
  | 'business_cards'
  | 'flyer_brochure'
  | 'books_booklets'
  | 'banner_flex'
  | 'stickers_labels'
  | 'stamps'
  | 'binding_finishing'
  | 'custom_print';

export type PrintOrderStatus = 
  | 'new'                   // طلب جديد
  | 'cutting'               // مرحلة القص ✂️
  | 'sewing'                // مرحلة الخياطة والتجميع 🧵
  | 'ironing_finishing'     // مرحلة الكي والتشطيب والتطريز 👔
  | 'ready'                 // جاهز للتسليم والبروفة ✨
  | 'delivered'             // تم التسليم للزبون 📦
  | 'cancelled'             // ملغي ❌
  // توافق عكسي:
  | 'design'
  | 'pending_approval'
  | 'in_progress_external'
  | 'in_progress_internal'
  | 'printing'
  | 'finishing';

export interface ColorSizeQuantityRow {
  id: string;
  color: string;                 // اسم اللون (كحلي، أبيض، أسود، بيج، رصاصي، زيتي...)
  colorHex?: string;             // كود اللون اللوني (اختياري)
  quantities: Record<string, number>; // كمية كل مقاس: { 'XS': 2, 'S': 5, 'M': 10, 'L': 15, 'XL': 8, 'XXL': 3 }
  totalQuantity: number;         // إجمالي كميات المقاسات لهذا اللون
  notes?: string;                // ملاحظة خاصة بهذا اللون بالأخير
}

export interface TailoringMeasurements {
  customerId?: string;
  standardSize?: 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'custom' | string;
  colorSizeMatrix?: ColorSizeQuantityRow[]; // جدول القياسات والكميات والألوان (اللون، المقاسات، الكميات، وملاحظة بالأخير)
  availableSizes?: string[];     // قائمة أعمدة المقاسات المتاحة بالجدول
  length?: number;         // الطول الكامل (سم / إنش)
  shoulder?: number;       // عرض الكتف
  chest?: number;          // محيط الصدر
  waist?: number;          // محيط الخصر
  hips?: number;           // محيط الأرداف / الحوض
  sleeveLength?: number;   // طول الكم
  sleeveWidth?: number;    // وسع الكم
  wristCuff?: number;      // وسع المعصم / الكبك
  neckCollar?: number;     // فتحة الرقبة / الياقة
  collarType?: string;     // نوع الياقة
  pocketType?: string;     // نوع الجيب
  bottomSweep?: number;    // وسع أسفل الثوب / الفستان
  pantsLength?: number;    // طول البنطلون
  pantsWaist?: number;     // خصر البنطلون
  inseam?: number;         // طول الحجر / البنطلون الداخلي
  thighWidth?: number;     // وسع الفخذ
  armhole?: number;        // حردة الإبط
  unit?: 'cm' | 'inch';    // وحدة القياس (سم أو بوصة)
  modelImageUrl?: string;  // صورة الموديل
  modelImages?: string[];  // ألبوم صور الموديل
  notes?: string;          // ملاحظات خاصة بالقصة والتفصيل
}

export interface TailorPieceworkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  time?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  customerName?: string;
  modelName: string;
  operationType: 'cutting' | 'sewing' | 'finishing' | 'full_garment' | 'embroidery' | 'alteration';
  operationName: string;   // اسم العملية بالعربي: فصال وقص، خياطة وتجميع، كي وتشطيب، تطريز...
  quantity: number;        // عدد القطع المنجزة
  ratePerPiece: number;    // أجر القطعة الواحدة
  totalEarned: number;     // إجمالي المستحق = الكمية × سعر القطعة
  notes?: string;
  isPaid?: boolean;
  payrollSheetId?: string;
  createdAt: string;
}

export interface SuppliedMaterialItem {
  id: string;
  itemName: string;            // اسم الصنف / الخامة / الإكسسوار المورد
  inventoryItemId?: string;    // معرف الصنف من المستودع (اختياري)
  unit?: string;               // الوحدة (قطعة، متر، حبة، طقم، بكرة، درزن...)
  requiredQuantity: number;    // العدد أو الكمية المطلوبة للتشغيل
  receivedQuantity: number;    // الكمية المستلمة فعلياً من الزبون / المورد
  missingQuantity: number;     // الكمية الناقصة (المطلوبة - المستلمة)
  notes?: string;              // ملاحظات البند والمواصفات
}

export interface PrintJobOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  title: string;             // اسم الموديل / الطلبية (مثلاً: ثوب سعودي مطرز كبك، فستان سهرة حرير...)
  serviceType: PrintServiceType;
  garmentType?: string;      // نوع اللباس (ثوب، فستان، بدلة، عباية...)
  modelCode?: string;        // رمز أو كود الموديل
  fabricSource?: 'customer' | 'workshop'; // مصدر القماش (من الزبون / من الورشة)
  fabricType: string;        // نوع القماش (قطن مصري، كتان إيطالي، صوف كشميري، حرير طبيعي، جينز...)
  fabricColor?: string;      // لون القماش ونقشته
  fabricLengthMeters?: number; // عدد الأمتار المستهلكة من القماش
  fabricMetersUsed?: number;   // عدد الأمتار المستهلكة من القماش (اسم بديل)
  fabricItemId?: string;     // معرف صنف القماش لخصم المخزون
  dimensions: string;        // المقاس (جاهز S/M/L/XL أو تفصيل مخصص)
  measurements?: TailoringMeasurements; // جدول القياسات والكميات والألوان التفصيلية
  colorSizeMatrix?: ColorSizeQuantityRow[]; // جدول القياسات والكميات والألوان التفصيلي
  suppliedMaterials?: SuppliedMaterialItem[]; // جدول الخامات والإكسسوارات الموردة للتشغيل
  quantity: number;          // عدد القطع
  colorType?: string;        // لون الموديل أو التطريز
  finishingOptions: string[];// خيارات التشطيب (سحاب مخفي، أزرار صدف، تطريز كمبيوتر، كتافيات، بطانة كاملة...)
  unitCost: number;          // سعر تفصيل القطعة
  totalPrice: number;        // إجمالي الفاتورة
  depositPaid: number;       // العربون المدفوع
  remainingBalance: number;  // المتبقي عند الاستلام
  status: PrintOrderStatus;  // المرحلة الحالية (قص، خياطة، كي وتشطيب، جاهز، تم التسليم)
  assignedTailorId?: string; // الخياط المسؤول
  assignedTailorName?: string;
  cutterId?: string;         // مسؤول القص
  cutterName?: string;
  sewerId?: string;          // مسؤول الخياطة
  sewerName?: string;
  finisherId?: string;       // مسؤول الكي والتشطيب
  finisherName?: string;
  pieceRateWage?: number;    // أجر الخياط بالقطعة
  fittingDate?: string;      // موعد القياس والبروفة
  deliveryDate: string;      // تاريخ التسليم النهائي
  notes?: string;
  createdAt: string;
  createdAtTime?: string;
  associatedInvoiceId?: string;
  items?: InvoiceItem[];
  subCustomerName?: string;
  modelImageUrl?: string;    // رابط أو صورة الموديل والتصميم الأساسية (تظهر بوضوح بالمعاينة وبطاقة الشغل)
  modelImages?: string[];    // صور إضافية لتفاصيل الموديل والتطريز والباترون
  attachments?: LineAttachment[];
  isExternalPrint?: boolean;
  paperType?: string;        // للتوافق
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'credit';

export interface LineAttachment {

  id: string;
  name: string;
  size?: number;
  type?: string;
  data?: string;
  localBlobId?: string;       // معرف الملف المخزن محلياً بجودة أصلية كاملة
  driveFileId?: string;       // معرف الملف في Google Drive
  driveWebViewLink?: string;  // رابط المعاينة المباشر في Google Drive
  driveDownloadLink?: string; // رابط التحميل المباشر من Google Drive
  storageType?: 'drive' | 'local' | 'embedded' | 'link';
  uploadedAt?: string;
  isOriginal?: boolean;
  isModified?: boolean;
  modifiedAt?: string;
  uploadedByUserId?: string;
  uploadedByUserName?: string;       // هل هو مرفق أصلي محمي من الحذف
  uploadedBy?: string;        // اسم المستخدم الذي أرفقه
}

export interface InvoiceTechnicalNote {
  id: string;
  userName: string;
  userId?: string;
  text: string;
  createdAt: string;
}

export interface InvoiceItem {
  itemId: string;
  itemName: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  taxRate?: number;
  total: number;
  description?: string;
  notes?: string;
  hasDimensions?: boolean;
  dimensions?: string;
  length?: number;
  width?: number;
  count?: number;
  attachments?: LineAttachment[];
  barcode?: string;
  unit?: string;
  unitCalculationType?: UnitCalculationType;
}

export interface InvoiceStatusLog {
  id: string;
  userName: string;          // المستخدم
  userId?: string;           // معرف المستخدم
  date: string;              // التاريخ
  time: string;              // الوقت
  previousStatus: PosInvoiceWorkflowStatus; // الحالة السابقة
  newStatus: PosInvoiceWorkflowStatus;      // الحالة الجديدة
  notes?: string;            // الملاحظة
  createdAt: string;         // تاريخ التوثيق الفعلي ISO
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerTaxNumber?: string;
  type: 'pos' | 'print_order' | 'standard';
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  status: 'paid' | 'partial' | 'unpaid' | 'delivered';
  paymentStatus?: InvoicePaymentStatus; // حالة الدفع المنفصلة
  workflowStatus?: PosInvoiceWorkflowStatus; // حالة الفاتورة التشغيلية
  statusHistory?: InvoiceStatusLog[]; // سجل تتبع وتغييرات حالات الفاتورة
  printJobId?: string;
  additionalCharges?: number;
  representative?: string;
  branch?: string;
  branchId?: string;
  userId?: string;
  userName?: string;
  warehouse?: string;
  customCustomerText?: string;
  subCustomerId?: string;     // معرف الزبون الفرعي
  subCustomerName?: string;   // اسم الزبون الفرعي / الدين غير الدائم
  subCustomerPhone?: string;  // هاتف الزبون الفرعي
  deliveryDate?: string;      // موعد/تاريخ التسليم للعميل
  technicalNotes?: InvoiceTechnicalNote[]; // ملاحظات فنية من قسم الطباعة والورشة
  printStartedAt?: string;    // وقت وتاريخ بدء الطباعة
  printStartedBy?: string;    // المستخدم الذي بدأ الطباعة
  printFinishedAt?: string;   // وقت وتاريخ إنهاء الطباعة
  printFinishedBy?: string;   // المستخدم الذي أنهى الطباعة
  deliveredAt?: string;       // وقت وتاريخ تسليم الفاتورة للعميل
  deliveredBy?: string;       // المستخدم الذي اعتمد تسليم الفاتورة
  currency?: string;          // e.g. 'ILS', 'USD', 'JOD', 'EUR'
  currencySymbol?: string;    // e.g. '₪', '$', 'د.أ', '€'
  exchangeRate?: number;      // rate against base currency (ILS), e.g. 3.70 for USD, 1 for ILS
  baseTotalAmount?: number;   // Total converted to Palestinian Shekels (₪ ILS)
  basePaidAmount?: number;    // Paid amount converted to Palestinian Shekels (₪ ILS)
  cashPaidAmount?: number;
  bankPaidAmount?: number;
  cashTreasuryCode?: string;
  bankTreasuryCode?: string;
  isAccountingPosted?: boolean; // هل تم ترحيل القيود وحركات المخزون؟
  postedAt?: string;
}

export interface PurchaseItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string; // رقم فاتورة المورد اليدوية/الخارجية
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  status?: 'paid' | 'partial' | 'unpaid';
  paymentDueDate?: string;
  warehouse?: string;
  notes?: string;
  currency?: string;
  currencySymbol?: string;
  exchangeRate?: number;
  baseTotalAmount?: number;
  basePaidAmount?: number;
}

export interface PurchaseReturnItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason?: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  date: string;
  purchaseInvoiceId?: string;
  purchaseInvoiceNumber?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseReturnItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  settlementType: 'credit_balance' | 'cash_refund' | 'bank_refund';
  treasuryAccountCode?: string;
  notes?: string;
  createdAt: string;
  currency?: string;
  currencySymbol?: string;
  exchangeRate?: number;
}

export interface SalesReturnItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason?: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string; // مثل SR-2026-0001
  date: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId: string;
  customerName: string;
  items: SalesReturnItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  settlementType: 'credit_balance' | 'cash_refund' | 'bank_refund';
  treasuryAccountCode?: string;
  notes?: string;
  createdAt: string;
  currency?: string;
  currencySymbol?: string;
  exchangeRate?: number;
  branchId?: string;
}

export interface Party {
  id: string;
  code: string; // الرقم التسلسلي الآلي الصادر من النظام (مثل CUST-0001 أو SUPP-0001) غير قابل للتعديل أو التكرار
  type: 'customer' | 'supplier' | 'both';
  name: string;
  phone: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string; // السجل التجاري
  contactPerson?: string;       // الشخص المسؤول
  city?: string;                // المدينة
  address?: string;
  balance: number; // موجب = لنا عليه (مدين)، سالب = له علينا (دائن)
  openingBalance?: number;      // الدين السابق / الرصيد الافتتاحي
  openingBalanceDate?: string;  // تاريخ الدين السابق
  openingBalanceType?: 'debit' | 'credit'; // نوع الرصيد الافتتاحي (مدين عليه / دائن له)
  creditLimit?: number;         // الحد الائتماني
  notes?: string;
  parentPartyId?: string;       // معرف العميل الرئيسي إذا كان هذا زبون فرعي
  isSubCustomer?: boolean;      // هل هذا الحساب لزبون فرعي / دين مؤقت تابع لعميل رئيسي
  specialPrices?: Record<string, number>; // تسعير خاص للعميل: itemId -> specialPrice
  savedMeasurements?: TailoringMeasurements; // جدول القياسات والكميات والألوان الدائمة للزبون المحفوظة للرجوع إليها
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  type: 'receipt' | 'payment'; // receipt = سند قبض (استلام نقدية)، payment = سند صرف (دفع نقدية)
  date: string;
  partyId: string;
  partyName: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
  accountCode: string; // الحساب المقابل (الصندوق / البنك)
  description: string;
  referenceInvoiceId?: string;
  currency?: string;          // e.g. 'ILS', 'USD', 'JOD', 'EUR'
  currencySymbol?: string;    // e.g. '₪', '$', 'د.أ', '€'
  exchangeRate?: number;      // e.g. 3.70 for USD, 1.0 for ILS
  baseAmount?: number;        // المبلغ المعادل بالشيكل
  subCustomerId?: string;     // معرف الزبون الفرعي إن وجد
  subCustomerName?: string;   // اسم الزبون الفرعي
  treasuryAccountCode?: string; // كود الصندوق / الحساب البنكي المستخدم
  chequeNumber?: string;      // رقم الشيك في حال الدفع بشيك
  chequeBank?: string;        // البنك المسحوب عليه الشيك
  chequeDueDate?: string;     // تاريخ استحقاق وصرف الشيك
  transferReference?: string; // رقم الحوالة أو المرجع البنكي
}

export interface CurrencyInfo {
  code: string;           // 'ILS', 'USD', 'JOD', 'EUR', 'SAR', 'EGP'
  name: string;           // 'شيكل', 'دولار أمريكي', 'دينار أردني', etc.
  symbol: string;         // '₪', '$', 'د.أ', '€', 'ر.س', 'ج.م'
  rateAgainstBase: number;// 1 unit of currency = X Base (ILS) (e.g. 1 USD = 3.70 ILS, 1 JOD = 5.20 ILS, 1 ILS = 1.0)
  isBase: boolean;        // true for ILS
  isActive?: boolean;     // هل العملة مفعلة في شاشات الكاشير والمخزون
  updatedAt?: string;
}

export interface SqlServerConfig {
  enabled: boolean;
  serverUrl: string;
  dbType: 'postgres' | 'mysql' | 'sqlite';
  dbName: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncTime?: string;
  apiKey?: string;
}

export interface BusinessSettings {
  businessName: string;
  businessNameEn: string;
  activityType: string;
  taxNumber?: string;
  crNumber?: string;
  showTaxNumberInPrints?: boolean;
  showCrNumberInPrints?: boolean;
  phone: string;
  email: string;
  address: string;
  // إمكانية رفع لوقو المنشأة وهيدر الطباعة والعناوين والهواتف المتعددة
    logoUrl?: string;           // صورة لوقو المنشأة (Base64 أو رابط)
  headerImageUrl?: string;    // صورة هيدر كامل لكافة الكشوفات والأوراق المطبوعة
  stampUrl?: string;          // ختم المنشأة (Base64 أو رابط)
  signatureUrl?: string;      // توقيع المدير/المخول (Base64 أو رابط)
  addresses?: string[];       // قائمة عناوين وفروع المنشأة المتعددة
  phones?: string[];          // قائمة أرقام الهواتف والجوالات المتعددة
  name?: string;              // الاسم البديل المتوافق
  description?: string;       // وصف النشاط البديل المتوافق
  invoiceFooter?: string;     // تذييل الفاتورة
  currency: string;           // Default display symbol: '₪'
  baseCurrencyCode?: string;  // Default base code: 'ILS'
  vatRate: number;
  invoiceFooterNote: string;
  logoText: string;
  currencies?: CurrencyInfo[];
  unitsOfMeasure?: UnitOfMeasure[]; // وحدات القياس المعتمدة وخصائصها
  sqlServerConfig?: SqlServerConfig;
  defaultPosLayout?: any; // تخطيط وتنسيق شاشة الكاشير الافتراضي للنظام
  telegramConfig?: { botToken: string; defaultChatId: string; enabled: boolean };
  homeShortcuts?: string[];  categories?: CategoryDefinition[]; // قائمة معرفات الاختصارات المفعلة في الشاشة الرئيسية
}

export type TreasuryType = 
  | 'cash_box'       // الصندوق النقدي (الكاشير / الخزينة الرئيسية)
  | 'bank_app'       // تطبيق بنكي (الراجحي، الأهلي، الإنماء، بنك الرياض، إلخ)
  | 'digital_wallet' // محفظة إلكترونية (STC Pay, Urpay, Tiqmo, إلخ)
  | 'pos_terminal'   // جهاز نقاط بيع (مدى / شبكة POS)
  | 'bank_account';  // حساب بنكي جاري

export interface TreasuryTransaction {
  id: string;
  treasuryId: string;
  treasuryName: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  amount: number; // المبلغ الفعلي بالعملة الفعلية
  currency?: string; // العملة الفعلية e.g. 'USD', 'ILS', 'JOD'
  currencySymbol?: string; // رمز العملة e.g. '$', '₪', 'د.أ'
  exchangeRate?: number; // سعر الصرف وقت العملية (e.g. 3.70)
  baseCurrency?: string; // العملة الأساسية e.g. 'ILS'
  baseAmount?: number; // القيمة المكافئة بالعملة الأساسية وقت العملية (e.g. 3700)
  balanceAfter: number; // الرصيد التقديري الإجمالي بالعملة الأساسية بعدها
  balanceAfterCurrency?: number; // الرصيد الفعلي لتلك العملة في الصندوق بعد الحركة
  voucherNumber?: string; // رقم السند مثل RC-1 أو PV-1 أو INV-...
  partyName?: string; // اسم العميل أو المورد أو المستفيد
  description: string;
  referenceType?: 'pos_sale' | 'invoice' | 'print_order' | 'advance' | 'payroll' | 'expense' | 'transfer' | 'manual' | 'opening' | 'receipt' | 'payment';
  referenceId?: string;
  targetTreasuryId?: string;
  targetTreasuryName?: string;
  contraAccountCode?: string;
  contraAccountName?: string;
  actualCurrency?: string;
  actualAmount?: number;
}

export interface Treasury {
  id: string;
  name: string;
  type: TreasuryType;
  accountCode: string; // Linked account code in Chart of Accounts (e.g., '1101', '1102', '1103', etc.)
  balance: number; // الرصيد التقديري الإجمالي بالعملة الأساسية (الشيكل)
  currencyBalances?: Record<string, number>; // الأرصدة الحقيقية الفعلية لكل عملة منفصلة: { 'ILS': 1000, 'USD': 800, 'JOD': 500 }
  isDefault?: boolean; // الصندوق النقدي الرئيسي
  accountNumber?: string; // رقم الحساب أو الآيبان أو المعرف
  bankName?: string; // اسم البنك أو مشغل التطبيق
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  currency?: string;       // e.g. 'ILS', 'USD', 'JOD'
  currencySymbol?: string; // e.g. '₪', '$', 'د.أ'
  transactions?: TreasuryTransaction[];
}

export type SalaryType = 'daily' | 'weekly' | 'monthly' | 'piece_rate';

export type EmployeeDepartment =
  | 'tailoring_sewing'   // خياطة وتجميع
  | 'cutting'            // فصال وقص
  | 'ironing_finishing'  // كي وتشطيب وتطريز
  | 'design_patterns'    // تصميم وباترون
  | 'sales_reception'    // استقبال وزبائن ومقاسات
  | 'management'         // إدارة وإشراف
  | 'accounting'         // محاسبة ومالية
  | 'delivery'           // توصيل وخدمات
  | 'printing'
  | 'design'
  | 'sales_pos'
  | 'finishing'
  | 'other';

export interface SalaryPaymentRecord {
  id: string;
  date: string;
  amount: number;
  type: 'salary' | 'advance' | 'bonus' | 'deduction' | 'piece_rate';
  period: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  voucherNumber?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  jobTitle: string;
  department: EmployeeDepartment;
  nationalId?: string;
  phone: string;
  email?: string;
  salaryType: SalaryType;
  salaryAmount: number;
  pieceRatePerGarment?: number; // أجر الخياط بالقطعة (عند اختيار نظام الحساب بالقطعة)
  tailorSpecialty?: string;     // تخصص الخياط (رجالي، نسائي، فساتين، بدلات، قص...)
  allowances?: number;
  hireDate: string;
  status: 'active' | 'on_leave' | 'terminated';
  paymentMethod: PaymentMethod;
  bankName?: string;
  iban?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyRelation?: string;
  notes?: string;
  paymentHistory?: SalaryPaymentRecord[];
  
  // إعدادات ساعات العمل والدوام والأوفرتايم
  officialDailyHours?: number;    // ساعات العمل الرسمية باليوم (افتراضياً 8 ساعات)
  officialStartTime?: string;     // موعد الحضور الرسمي (مثلاً "08:00")
  officialEndTime?: string;       // موعد الانصراف الرسمي (مثلاً "16:00")
  defaultBreakMinutes?: number;   // وقت الاستراحة الافتراضي بالدقائق (مثلاً 60 دقيقة)
  hourlyRateCalculation?: 'auto_from_salary' | 'fixed_custom'; // طريقة حساب أجر الساعة العادية
  customHourlyRate?: number;      // أجر الساعة المخصص (إذا تم اختياره يدوياً)
  overtimeMethod?: 'multiplier' | 'fixed_rate'; // طريقة حساب الأوفرتايم: مضاعف من الساعة أو مبلغ ثابت
  overtimeMultiplier?: number;    // مضاعف الأوفرتايم: 1.0 (ساعة بساعة), 1.25, 1.5 (ساعة ونصف), 2.0 (ساعتين)
  customOvertimeRate?: number;    // أجر الساعة الإضافية المقطوع (مثلاً 25 شيكل لكل ساعة أوفرتايم)
  
  // إعدادات الدوام على مرحلتين / فترتين (الدوام المقسم أو خروج لمشوار والعودة)
  defaultSplitShift?: boolean;       // تفعيل نظام الفترتين افتراضياً للعامل
  defaultShift1StartTime?: string;   // حضور المرحلة الأولى (مثلاً 08:00)
  defaultShift1EndTime?: string;     // خروج المرحلة الأولى لمشوار (مثلاً 10:00)
  defaultShift2StartTime?: string;   // رجوع وحضور المرحلة الثانية (مثلاً 12:00)
  defaultShift2EndTime?: string;     // انصراف نهاية الدوام بالمرحلة الثانية (مثلاً 16:00)
}

// أنواع وحالات الحضور والغياب
export type AttendanceStatus = 
  | 'present'         // حاضر
  | 'absent'          // غائب بدون إذن
  | 'late'            // متأخر
  | 'excused_leave'   // إجازة مدفوعة / بإذن
  | 'unpaid_leave'    // إجازة غير مدفوعة
  | 'half_day';       // نصف يوم

export type OvertimeMethod = 'multiplier' | 'fixed_rate';

export interface AttendanceRecord {
  id: string;
  date: string;               // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: EmployeeDepartment;
  status: AttendanceStatus;
  
  // مواعيد الدوام والاستراحة
  checkInTime?: string;       // ساعة الحضور (الفترة الأولى أو الدوام المستمر، مثلاً "08:00")
  checkOutTime?: string;      // ساعة الانصراف (الانصراف النهائي أو الفترة الأولى، مثلاً "16:00")
  breakMinutes: number;       // وقت الاستراحة بالدقائق (مثلاً 60)

  // دعم الدوام على مرحلتين / فترتين (مثلاً حضور 8 وخروج 10 لمشوار، ثم رجوع 12 وانصراف 4)
  hasSecondShift?: boolean;   // هل الدوام مقسم لمرحلتين / فترتين اليوم
  shift1CheckInTime?: string; // حضور المرحلة الأولى (مثلاً "08:00")
  shift1CheckOutTime?: string;// خروج المرحلة الأولى لمشوار (مثلاً "10:00")
  shift2CheckInTime?: string; // عودة وحضور المرحلة الثانية (مثلاً "12:00")
  shift2CheckOutTime?: string;// انصراف نهائي للمرحلة الثانية (مثلاً "16:00")
  breakBetweenShiftsMinutes?: number; // وقت المشوار أو الفاصل بين المرحلتين بالدقائق (محسوب آلياً)
  shift1WorkedHours?: number; // ساعات العمل الفعلية للمرحلة الأولى
  shift2WorkedHours?: number; // ساعات العمل الفعلية للمرحلة الثانية
  
  // الساعات المحسوبة
  officialDailyHours: number; // الساعات الرسمية المطلوبة لهذا اليوم (مثلاً 8 ساعات)
  actualWorkedMinutes: number;// إجمالي الدقائق الفعلية = (المرحلة 1 + المرحلة 2 إن وجدت) - الاستراحة
  actualWorkedHours: number;  // الساعات الفعلية (بالكسور، مثلاً 6.0)
  regularHours: number;       // الساعات النظامية (حد أقصى الساعات الرسمية)
  overtimeHours: number;      // ساعات الأوفر تايم الإضافية
  lateMinutes: number;        // دقائق التأخير عن الموعد الرسمي
  earlyDepartureMinutes: number; // دقائق الانصراف المبكر
  
  // قواعد وتكلفة الساعة
  hourlyRateType: 'from_salary' | 'custom_rate';
  baseHourlyRate: number;     // أجر الساعة العادية (مشتق من اليومية/الراتب أو محدد يدوياً)
  overtimeMethod: OvertimeMethod; // 'multiplier' مضاعف أو 'fixed_rate' مبلغ ثابت
  overtimeMultiplier: number; // 1.5 (ساعة ونصف), 2.0 (ساعتين), 1.0 (ساعة بساعة), etc.
  overtimeRatePerHour: number;// الأجر الفعلي لساعة الأوفرتايم (مثلاً 1.5 × أجر الساعة العادية)
  
  // المستحقات المالية اليومية
  regularPayEarned: number;   // مستحق الساعات العادية لليوم
  overtimePayEarned: number;  // مستحق ساعات الأوفرتايم لليوم
  lateDeductionAmount: number;// خصم التأخير أو النقص (إن وجد)
  totalDailyEarnings: number; // صافي مستحق اليوم = (العادي + الإضافي - الخصم)
  
  // الربط بمسير الرواتب
  isTransferredToPayroll?: boolean; // هل تم ترحيل الإضافي للحوافز/مسير الرواتب
  transferredPayrollSheetId?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  amount: number;
  treasuryAccountCode: string; // '1101' | '1102'
  treasuryName: string;
  reason: string;
  status: 'pending' | 'deducted' | 'cancelled';
  disbursedImmediately: boolean;
  isCarryOver?: boolean;
  voucherNumber?: string;
  payrollSheetId?: string;
  payrollSheetTitle?: string;
  deductedAt?: string;
}

export interface EmployeeDeduction {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  amount: number;
  reason: string;
  status: 'pending' | 'deducted' | 'cancelled';
  payrollSheetId?: string;
  payrollSheetTitle?: string;
  deductedAt?: string;
}

export interface EmployeeIncentive {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  amount: number;
  reason: string;
  status: 'pending' | 'paid' | 'cancelled';
  payrollSheetId?: string;
  payrollSheetTitle?: string;
  paidAt?: string;
}

export interface PayrollSheetItem {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  jobTitle: string;
  department: EmployeeDepartment;
  salaryType: SalaryType;
  basicSalary: number;
  allowances: number;
  incentives: number; // حوافز ومكافآت
  deductions: number; // خصومات
  advancesDeducted: number; // سلف مقتطعة
  netSalary: number; // صافي الراتب المستحق = الأساسي + البدلات + الحوافز - الخصومات - السلف
  daysWorked?: number;
  isIncluded: boolean;
  notes?: string;
}

export interface PayrollSheet {
  id: string;
  sheetNumber: string; // e.g. PR-2026-0001
  title: string; // e.g. مسير رواتب شهر سبتمبر 2026
  salaryType: SalaryType; // 'monthly' | 'weekly' | 'daily'
  period: string; // e.g. "سبتمبر 2026"
  startDate?: string;
  endDate?: string;
  createdAt: string;
  status: 'draft' | 'approved'; // 'draft' مسودة | 'approved' معتمد ومصروف
  disbursedAt?: string;
  treasuryAccountCode: string; // '1101' | '1102'
  treasuryName: string;
  items: PayrollSheetItem[];
  totalBasic: number;
  totalAllowances: number;
  totalIncentives: number;
  totalDeductions: number;
  totalAdvances: number;
  totalNet: number;
  employeesCount: number;
  voucherNumber?: string;
  notes?: string;
}

export interface ExpenseItem {
  id: string;
  date: string;
  expenseAccountCode: string;
  expenseAccountName: string;
  category: 'maintenance' | 'rent' | 'utilities' | 'marketing' | 'hospitality' | 'supplies' | 'other';
  categoryName: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | PaymentMethod;
  treasuryAccountCode: string;
  treasuryName: string;
  beneficiary: string;
  taxInvoiceNumber?: string;
  notes: string;
  createdAt: string;
  currency?: string;
  currencySymbol?: string;
  exchangeRate?: number;
  voucherNumber?: string;
  journalEntryId?: string;
}

// Convenient aliases for POS & Financial components
export type Currency = CurrencyInfo;
export type TreasuryAccount = Treasury;

export interface DebtClearingRecord {
  id: string;
  clearingNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  currency?: string;
  reason: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  customerOldBalance: number;
  customerNewBalance: number;
  supplierOldBalance: number;
  supplierNewBalance: number;
  journalEntryId?: string;
}

// Multi-Company, Multi-Branch, Users & Granular Permissions System
export * from './companyBranchUser';

// Database Zeroing & Clean Start (تصفير قاعدة البيانات لبدء التشغيل الفعلي)
export interface DatabaseZeroingOptions {
  cutoffDate: string; // YYYY-MM-DD
  fromDate?: string; // YYYY-MM-DD
  scope: 'up_to_date' | 'from_date' | 'date_range' | 'all'; // تصفير حتى هذا التاريخ فقط، من تاريخ معين، بين تاريخين، أو تصفير شامل

  // 1. العمليات والحركات المالية والتجارية
  resetInvoices: boolean;           // فواتير المبيعات ونقاط البيع
  resetPurchases: boolean;          // فواتير المشتريات ومشتريات الخامات
  resetSalesReturns: boolean;       // مردودات المبيعات
  resetPurchaseReturns: boolean;    // مردودات المشتريات
  resetVouchers: boolean;           // سندات القبض والصرف
  resetJournalEntries: boolean;     // قيود اليومية وحركات الحسابات
  resetPrintOrders: boolean;        // أوامر تشغيل المطبعة والورشة
  resetDebtClearings?: boolean;     // عمليات المقاصة وتسوية الديون
  resetExpenses?: boolean;          // المصروفات والمصاريف التشغيلية

  // 2. المخازن والأصناف والكرتات المخزنية وكل ما يتعلق بالصنف
  zeroInventoryStock: boolean;      // تصفير كميات وأرصدة المخزون لجميع الأصناف (0.00 لبدء جرد فعلي)
  resetManualInventoryItems: boolean;// حذف كرتات الأصناف والمنتجات والخامات المضافة
  resetStockMovements: boolean;      // حركات المخزون بالكامل (صرف، قبض/توريد، جرد، بيع، شراء، تبديل وتغيير ومناقلات)
  resetWarehouseOperations: boolean;// عمليات المستودعات وأذونات الصرف والتوريد
  resetManualWarehouses: boolean;   // حذف المستودعات الإضافية المضافة يدوياً

  // 3. الموظفون والرواتب ومستحقاتهم بالكامل
  resetEmployees: boolean;          // حذف أسماء وسجلات الموظفين
  resetPayroll: boolean;            // كشوف ومسيرات الرواتب
  resetEmployeeAdvances?: boolean;  // سلف الموظفين
  resetEmployeeDeductions?: boolean;// خصومات وجزاءات الموظفين
  resetEmployeeIncentives?: boolean;// مكافآت وحوافز الموظفين

  // 4. العملاء والموردين والأطراف
  resetManualParties: boolean;      // حذف العملاء والموردين المضافين يدوياً
  zeroPartyBalances: boolean;       // تصفير أرصدة الذمم والمديونيات لجميع العملاء والموردين (0.00 ₪)

  // 5. الصناديق والخزنات والحسابات البنكية
  zeroTreasuryBalances: boolean;    // تصفير أرصدة وحركات الصناديق والخزنات لتصبح 0.00 ₪
  resetManualTreasuries: boolean;   // حذف الصناديق والحسابات البنكية المضافة يدوياً

  // 6. شجرة الحسابات والدليل المحاسبي
  zeroAccountBalances: boolean;     // تصفير أرصدة حسابات الدليل المحاسبي لتبدأ من 0.00 ₪
}

export interface ZeroingExecutionResult {
  success: boolean;
  message: string;
  summary: {
    deletedInvoices: number;
    deletedPurchases: number;
    deletedSalesReturns: number;
    deletedPurchaseReturns: number;
    deletedVouchers: number;
    deletedJournalEntries: number;
    deletedPrintOrders: number;
    deletedStockMovements: number;
    deletedWarehouseOperations: number;
    deletedDebtClearings: number;
    deletedExpenses: number;
    deletedEmployees: number;
    deletedPayrollSheets: number;
    deletedEmployeeAdvances: number;
    deletedEmployeeDeductions: number;
    deletedEmployeeIncentives: number;
    deletedPayrollRecords: number;
    deletedManualParties: number;
    zeroedPartyBalances: number;
    zeroedInventoryStocks: number;
    deletedManualItems: number;
    deletedManualWarehouses: number;
    zeroedTreasuries: number;
    deletedManualTreasuries: number;
    zeroedAccounts: number;
  };
  executedAt: string;
  executedBy: string;
}
