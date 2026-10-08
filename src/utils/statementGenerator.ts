import {
  Party,
  Invoice,
  PurchaseInvoice,
  PurchaseReturn,
  SalesReturn,
  PaymentVoucher,
  PrintJobOrder,
  JournalEntry,
  DebtClearingRecord,
  Employee,
  EmployeeAdvance,
  EmployeeDeduction,
  EmployeeIncentive,
  AttendanceRecord
} from '../types';
import { isInvoiceAccountingEligible } from './invoiceStatusUtils';
import { formatDecimalHours } from './dateUtils';

export interface StatementItemDetail {
  itemId?: string;
  itemCode?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  length?: number;
  width?: number;
  count?: number;
  discount?: number;
  unit?: string;
  notes?: string;
  description?: string;
}

export interface StatementRow {
  id: string;
  date: string;
  referenceNumber: string;
  type: 'opening' | 'invoice' | 'print_order' | 'purchase' | 'purchase_return' | 'sales_return' | 'receipt' | 'payment' | 'journal' | 'clearance';
  category: 'withdrawal' | 'receipt' | 'disbursement' | 'opening' | 'other';
  typeLabel: string;
  description: string;
  invoiceNotes?: string;
  voucherNotes?: string;
  subtotal?: number;
  discountTotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeDueDate?: string;
  transferReference?: string;
  accountCode?: string;
  treasuryName?: string;
  counterPartyName?: string;
  reason?: string;
  subCustomerName?: string;
  items?: StatementItemDetail[];
  debit: number;   // مدين (سحوبات العميل / سداد المورد)
  credit: number;  // دائن (مقبوضات العميل / توريدات المورد)
  runningBalance: number; // الرصيد التراكمي المستمر
  notes?: string;
}

export interface StatementResult {
  party: Party;
  fromDate?: string;
  toDate?: string;
  openingBalance: number;
  rows: StatementRow[];
  totalDebit: number;
  totalCredit: number;
  totalWithdrawals: number;   // إجمالي السحوبات
  totalReceipts: number;      // إجمالي المقبوضات
  totalDisbursements: number; // إجمالي الصرف
  netMovement: number;
  closingBalance: number;
  creditLimit: number;
  isCreditExceeded: boolean;
  creditUsagePercentage: number;
  statementDate: string;
}

export function generateAccountStatement(params: {
  party: Party;
  fromDate?: string;
  toDate?: string;
  subCustomerId?: string;
  subCustomers?: Party[];
  invoices: Invoice[];
  purchases: PurchaseInvoice[];
  purchaseReturns?: PurchaseReturn[];
  salesReturns?: SalesReturn[];
  vouchers: PaymentVoucher[];
  printOrders?: PrintJobOrder[];
  journalEntries?: JournalEntry[];
  debtClearings?: DebtClearingRecord[];
}): StatementResult {
  const {
    party,
    fromDate,
    toDate,
    subCustomerId,
    subCustomers = [],
    invoices = [],
    purchases = [],
    purchaseReturns = [],
    salesReturns = [],
    vouchers = [],
    printOrders = [],
    journalEntries = [],
    debtClearings = []
  } = params;

  interface RawTx {
    id: string;
    date: string;
    refNum: string;
    type: StatementRow['type'];
    category: StatementRow['category'];
    typeLabel: string;
    description: string;
    invoiceNotes?: string;
    voucherNotes?: string;
    subtotal?: number;
    discountTotal?: number;
    taxAmount?: number;
    totalAmount?: number;
    paymentMethod?: string;
    paymentMethodLabel?: string;
    chequeNumber?: string;
    chequeBank?: string;
    chequeDueDate?: string;
    transferReference?: string;
    accountCode?: string;
    treasuryName?: string;
    counterPartyName?: string;
    reason?: string;
    subCustomerName?: string;
    items?: StatementItemDetail[];
    debit: number;
    credit: number;
  }

  const allTx: RawTx[] = [];

  // 1. Initial Opening Balance
  const partyInitDate = party.openingBalanceDate || '2000-01-01';
  let initialBal = Number(party.openingBalance || 0);
  if (party.openingBalanceType === 'credit') {
    initialBal = -Math.abs(initialBal);
  }

  if (initialBal !== 0) {
    allTx.push({
      id: `init-${party.id}`,
      date: partyInitDate,
      refNum: 'OPENING',
      type: 'opening',
      category: 'opening',
      typeLabel: 'رصيد افتتاحي تأسيسي',
      description: 'الرصيد الافتتاحي المقيد عند إنشاء الحساب',
      debit: initialBal > 0 ? initialBal : 0,
      credit: initialBal < 0 ? Math.abs(initialBal) : 0
    });
  }

  // 2. Sales Invoices (for Customers)
  invoices.forEach(inv => {
    // Only (بيع - جاهز للتسليم - تم التسليم) enter accounting and statement
    if (!isInvoiceAccountingEligible(inv.workflowStatus)) {
      return;
    }

    const isTarget = party.isSubCustomer
      ? (
          inv.subCustomerId === party.id ||
          (inv.subCustomerName && inv.subCustomerName.trim().toLowerCase() === party.name.trim().toLowerCase()) ||
          (inv.customCustomerText && inv.customCustomerText.toLowerCase().includes(party.name.toLowerCase()))
        )
      : (inv.customerId === party.id);

    if (isTarget) {
      const subCustNote = !party.isSubCustomer && (inv.subCustomerName || inv.customCustomerText)
        ? ` [الزبون الفرعي: ${inv.subCustomerName || inv.customCustomerText}]`
        : '';

      const itemsDetail: StatementItemDetail[] = (inv.items || []).map(it => ({
        itemName: it.itemName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
        length: it.length,
        width: it.width,
        count: it.count || 1,
        discount: it.discount || 0,
        unit: it.unit,
        notes: (it as any).notes || it.description,
        description: it.description
      }));

      // Invoices count as Withdrawals (سحوبات - مدين)
      allTx.push({
        id: inv.id,
        date: inv.date,
        refNum: inv.invoiceNumber,
        type: 'invoice',
        category: 'withdrawal',
        typeLabel: 'فاتورة مبيعات',
        description: `فاتورة مبيعات (${inv.items.length} أصناف) - إجمالي ${inv.totalAmount.toFixed(2)}${subCustNote}`,
        invoiceNotes: inv.notes,
        subtotal: inv.subtotal,
        discountTotal: inv.discountTotal || 0,
        taxAmount: inv.taxAmount || 0,
        totalAmount: inv.totalAmount,
        subCustomerName: inv.subCustomerName || inv.customCustomerText,
        items: itemsDetail,
        debit: inv.baseTotalAmount || inv.totalAmount,
        credit: 0
      });

      // Immediate payment received on invoice (سداد فوري - مقبوضات)
      const paidInInv = inv.basePaidAmount !== undefined ? inv.basePaidAmount : (inv.paidAmount || 0);
      if (paidInInv > 0 && inv.paymentMethod !== 'credit') {
        const pmtMethodLabel =
          inv.paymentMethod === 'cash' ? 'نقداً (الصندوق)' :
          inv.paymentMethod === 'card' ? 'بطاقة/شبكة' :
          inv.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
          inv.paymentMethod === 'cheque' ? 'شيك بنكي' : 'سداد مع الفاتورة';

        allTx.push({
          id: `${inv.id}-pmt`,
          date: inv.date,
          refNum: `PAY-${inv.invoiceNumber}`,
          type: 'receipt',
          category: 'receipt',
          typeLabel: 'سند قبض',
          description: `سداد قيمة الفاتورة (${pmtMethodLabel})`,
          paymentMethod: inv.paymentMethod,
          paymentMethodLabel: pmtMethodLabel,
          voucherNotes: inv.notes,
          subCustomerName: inv.subCustomerName || inv.customCustomerText,
          debit: 0,
          credit: paidInInv
        });
      }
    }
  });

  // 3. Print Orders (أوامر التشغيل)
  // RULE: "أمر التشغيل لا يسجل في الكشف إلا في حال تم اعتماده كمسلم ويظهر مرة واحدة وكفاتورة بيع"
  printOrders.forEach(job => {
    if (job.customerId === party.id) {
      // 1) ONLY include if delivered
      if (job.status !== 'delivered') {
        return;
      }

      // 2) Check if this job is already recorded as an invoice in invoices to prevent duplicate!
      const alreadyHasInvoice = invoices.some(inv =>
        inv.printJobId === job.id ||
        (job.associatedInvoiceId && inv.id === job.associatedInvoiceId) ||
        (inv.invoiceNumber && job.orderNumber && inv.invoiceNumber === job.orderNumber)
      );

      if (alreadyHasInvoice) {
        // It has already been billed and recorded in the invoices section above!
        return;
      }

      // 3) Appears ONCE as a sales invoice (فاتورة بيع - أمر تشغيل مسلّم)
      allTx.push({
        id: job.id,
        date: job.deliveryDate || job.createdAt,
        refNum: job.orderNumber,
        type: 'invoice',
        category: 'withdrawal',
        typeLabel: 'فاتورة مبيعات',
        description: `فاتورة مبيعات - أمر تشغيل مطبعة: ${job.title} (${job.quantity} نسخة)${job.paperType ? ` - ورق: ${job.paperType}` : ''}`,
        items: [
          {
            itemName: job.title,
            quantity: job.quantity,
            unitPrice: job.quantity > 0 ? (job.totalPrice / job.quantity) : job.totalPrice,
            total: job.totalPrice,
            unit: job.dimensions || 'وحدة',
            notes: job.notes
          }
        ],
        debit: job.totalPrice,
        credit: 0
      });

      // If deposit was paid on this job and not already entered as a payment voucher
      if (job.depositPaid > 0) {
        const hasMatchingVoucher = vouchers.some(v =>
          v.partyId === party.id &&
          (v.voucherNumber === `DEP-${job.orderNumber}` || (v.description && v.description.includes(job.orderNumber)))
        );

        if (!hasMatchingVoucher) {
          allTx.push({
            id: `${job.id}-dep`,
            date: job.createdAt,
            refNum: `DEP-${job.orderNumber}`,
            type: 'receipt',
            category: 'receipt',
            typeLabel: 'سند قبض',
            description: `عربون مستلم لأمر التشغيل المسلّم ${job.orderNumber}`,
            debit: 0,
            credit: job.depositPaid
          });
        }
      }
    }
  });

  // 4. Purchases (for suppliers)
  purchases.forEach(pur => {
    if (pur.supplierId === party.id) {
      const purItems: StatementItemDetail[] = (pur.items || []).map(it => ({
        itemName: it.itemName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
        count: 1,
        discount: 0,
        notes: (it as any).notes || (it as any).description,
        unit: (it as any).unit
      }));

      allTx.push({
        id: pur.id,
        date: pur.date,
        refNum: pur.invoiceNumber,
        type: 'purchase',
        category: 'withdrawal', // For supplier, supplies/purchases
        typeLabel: 'فاتورة مشتريات',
        description: `فاتورة مشتريات${pur.supplierInvoiceNumber ? ` (فاتورة مورد #${pur.supplierInvoiceNumber})` : ''} - ${pur.items.map(i => i.itemName).slice(0, 2).join('، ')}`,
        invoiceNotes: pur.notes,
        subtotal: pur.subtotal,
        discountTotal: 0,
        taxAmount: pur.taxAmount || 0,
        totalAmount: pur.totalAmount,
        items: purItems,
        debit: 0,
        credit: pur.baseTotalAmount || pur.totalAmount
      });

      const paidInPur = pur.basePaidAmount !== undefined ? pur.basePaidAmount : (pur.paidAmount || 0);
      if (paidInPur > 0) {
        allTx.push({
          id: `${pur.id}-pmt`,
          date: pur.date,
          refNum: `DISB-${pur.invoiceNumber}`,
          type: 'payment',
          category: 'disbursement',
          typeLabel: 'سند صرف',
          description: `سداد مسدد للمورد (${pur.paymentMethod === 'cash' ? 'نقداً' : 'تحويل بنكي'})`,
          paymentMethod: pur.paymentMethod,
          paymentMethodLabel: pur.paymentMethod === 'cash' ? 'نقداً (الصندوق)' : 'تحويل بنكي',
          voucherNotes: pur.notes,
          debit: paidInPur,
          credit: 0
        });
      }
    }
  });

  // 5. Purchase Returns (مردودات المشتريات)
  purchaseReturns.forEach(ret => {
    if (ret.supplierId === party.id) {
      allTx.push({
        id: ret.id,
        date: ret.date,
        refNum: ret.returnNumber,
        type: 'purchase_return',
        category: 'receipt',
        typeLabel: 'مردودات مشتريات',
        description: `مرتجع خامات للمورد (${ret.items.map(i => `${i.itemName} × ${i.quantity}`).join('، ')})${ret.notes ? ` - ${ret.notes}` : ''}`,
        invoiceNotes: ret.notes,
        subtotal: ret.totalAmount,
        totalAmount: ret.totalAmount,
        debit: ret.totalAmount,
        credit: 0
      });
    }
  });

  // 5.1 Sales Returns (مردودات المبيعات للعميل)
  salesReturns.forEach(ret => {
    if (ret.customerId === party.id) {
      allTx.push({
        id: ret.id,
        date: ret.date,
        refNum: ret.returnNumber,
        type: 'sales_return',
        category: 'receipt',
        typeLabel: 'مردودات مبيعات',
        description: `مرتجع مبيعات للعميل${ret.invoiceNumber ? ` (عن فاتورة ${ret.invoiceNumber})` : ''}: ${ret.items.map(i => `${i.itemName} × ${i.quantity}`).join('، ')}`,
        invoiceNotes: ret.notes,
        voucherNotes: ret.notes,
        subtotal: ret.subtotal,
        taxAmount: ret.taxAmount,
        totalAmount: ret.totalAmount,
        items: ret.items.map(it => ({
          itemId: it.itemId,
          itemName: it.itemName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
          notes: it.reason
        })),
        debit: 0,
        credit: ret.totalAmount
      });
    }
  });

  // 6. Payment & Receipt Vouchers (سندات القبض والصرف)
  vouchers.forEach(vch => {
    // Avoid double-counting invoice-generated immediate payment receipts or purchase payments
    if (vch.id.startsWith('vch-inv-') || vch.id.startsWith('vch-pur-')) {
      return;
    }

    const isTarget = party.isSubCustomer
      ? (
          vch.partyId === party.id ||
          (vch.description && vch.description.includes(party.name)) ||
          (vch.partyName && vch.partyName.includes(party.name))
        )
      : (vch.partyId === party.id);

    if (isTarget) {
      const vchNote = (vch as any).notes || vch.description;
      const paymentMethodLabel =
        vch.paymentMethod === 'cash' ? 'نقداً (الصندوق)' :
        vch.paymentMethod === 'cheque' ? 'شيك بنكي' :
        vch.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'أخرى';

      if (vch.type === 'receipt') {
        // Receipt from customer -> Credit
        allTx.push({
          id: vch.id,
          date: vch.date,
          refNum: vch.voucherNumber,
          type: 'receipt',
          category: 'receipt',
          typeLabel: 'سند قبض',
          description: vch.description || 'سند قبض وتحصيل دفعة نقدية من العميل',
          voucherNotes: vchNote,
          paymentMethod: vch.paymentMethod,
          paymentMethodLabel,
          chequeNumber: vch.chequeNumber,
          chequeBank: vch.chequeBank,
          chequeDueDate: vch.chequeDueDate,
          transferReference: vch.transferReference,
          accountCode: vch.treasuryAccountCode || vch.accountCode,
          subCustomerName: vch.subCustomerName,
          debit: 0,
          credit: vch.amount
        });
      } else {
        // Payment voucher -> If party is supplier: payment to supplier (debit)
        // If party is customer: refund or payment to customer (disbursement - debit)
        const isCust = party.type === 'customer';
        allTx.push({
          id: vch.id,
          date: vch.date,
          refNum: vch.voucherNumber,
          type: 'payment',
          category: 'disbursement',
          typeLabel: 'سند صرف',
          description: vch.description || (isCust ? 'سند صرف واسترداد للعميل' : 'سند صرف وسداد دفعة للمورد'),
          voucherNotes: vchNote,
          paymentMethod: vch.paymentMethod,
          paymentMethodLabel,
          chequeNumber: vch.chequeNumber,
          chequeBank: vch.chequeBank,
          chequeDueDate: vch.chequeDueDate,
          transferReference: vch.transferReference,
          accountCode: vch.treasuryAccountCode || vch.accountCode,
          subCustomerName: vch.subCustomerName,
          debit: vch.amount,
          credit: 0
        });
      }
    }
  });

  // 7. Journal Entries (قيد اليومية العامة)
  // Only include manual journal entries to prevent duplicating automatic system entries
  journalEntries.filter(e => !e.referenceType || e.referenceType === 'manual').forEach(entry => {
    entry.lines.forEach((line, lIdx) => {
      const isMatch = (line.description && line.description.includes(party.name)) ||
                      (entry.description && entry.description.includes(party.name)) ||
                      (line.accountName && line.accountName.includes(party.name));

      if (isMatch) {
        allTx.push({
          id: `${entry.id}-${lIdx}`,
          date: entry.date,
          refNum: entry.entryNumber,
          type: 'journal',
          category: line.debit > 0 ? 'withdrawal' : 'receipt',
          typeLabel: 'قيد يومية تسوية',
          description: `${line.description || entry.description} [حساب: ${line.accountName}]`,
          voucherNotes: (entry as any).notes || entry.description,
          accountCode: line.accountCode,
          debit: line.debit,
          credit: line.credit
        });
      }
    });
  });

  // 8. Debt Clearings (مقاصة ديون بين عميل ومورد)
  // لا تدخل ضمن الصناديق المالية وتظهر بكشف العميل (دائن/قبض) والمورد (مدين/صرف)
  debtClearings.forEach(clr => {
    // إذا كان الطرف هو العميل: مقاصة تسوية دائنة (بمثابة سداد/قبض يقلل مديونية العميل)
    if (clr.customerId === party.id) {
      allTx.push({
        id: `${clr.id}-cust`,
        date: clr.date,
        refNum: clr.clearingNumber,
        type: 'clearance',
        category: 'receipt',
        typeLabel: 'مقاصة حسابات (قبض / تسوية دائنة)',
        description: `مقاصة تسوية مع المورد: ${clr.supplierName} - ${clr.reason || 'تسوية أرصدة متبادلة'}`,
        voucherNotes: clr.notes,
        counterPartyName: clr.supplierName,
        reason: clr.reason,
        debit: 0,
        credit: clr.amount
      });
    }

    // إذا كان الطرف هو المورد: مقاصة تسوية مدينة (بمثابة سداد/صرف يقلل مستحقات المورد)
    if (clr.supplierId === party.id) {
      allTx.push({
        id: `${clr.id}-supp`,
        date: clr.date,
        refNum: clr.clearingNumber,
        type: 'clearance',
        category: 'disbursement',
        typeLabel: 'مقاصة حسابات (صرف / تسوية مدينة)',
        description: `مقاصة تسوية مع العميل: ${clr.customerName} - ${clr.reason || 'تسوية أرصدة متبادلة'}`,
        voucherNotes: clr.notes,
        counterPartyName: clr.customerName,
        reason: clr.reason,
        debit: clr.amount,
        credit: 0
      });
    }
  });

  // Sort chronologically
  allTx.sort((a, b) => {
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    if (a.type === 'opening') return -1;
    if (b.type === 'opening') return 1;
    return a.id.localeCompare(b.id);
  });

  // Calculate opening balance before `fromDate`
  let periodOpeningBalance = 0;
  const filteredTx: RawTx[] = [];

  allTx.forEach(tx => {
    if (fromDate && tx.date < fromDate) {
      periodOpeningBalance += (tx.debit - tx.credit);
    } else if (!toDate || tx.date <= toDate) {
      filteredTx.push(tx);
    }
  });

  let running = periodOpeningBalance;
  const rows: StatementRow[] = [];

  let totalDebit = 0;
  let totalCredit = 0;
  let totalWithdrawals = 0;
  let totalReceipts = 0;
  let totalDisbursements = 0;

  filteredTx.forEach(tx => {
    running += (tx.debit - tx.credit);
    totalDebit += tx.debit;
    totalCredit += tx.credit;

    if (tx.category === 'withdrawal') {
      totalWithdrawals += tx.debit;
    } else if (tx.category === 'receipt') {
      totalReceipts += tx.credit;
    } else if (tx.category === 'disbursement') {
      totalDisbursements += tx.debit;
    }

    rows.push({
      id: tx.id,
      date: tx.date,
      referenceNumber: tx.refNum,
      type: tx.type,
      category: tx.category,
      typeLabel: tx.typeLabel,
      description: tx.description,
      invoiceNotes: tx.invoiceNotes,
      voucherNotes: tx.voucherNotes,
      subtotal: tx.subtotal,
      discountTotal: tx.discountTotal,
      discountAmount: tx.discountTotal,
      taxAmount: tx.taxAmount,
      totalAmount: tx.totalAmount,
      paymentMethod: tx.paymentMethod,
      paymentMethodLabel: tx.paymentMethodLabel,
      chequeNumber: tx.chequeNumber,
      chequeBank: tx.chequeBank,
      chequeDueDate: tx.chequeDueDate,
      transferReference: tx.transferReference,
      accountCode: tx.accountCode,
      treasuryName: tx.treasuryName,
      counterPartyName: tx.counterPartyName,
      reason: tx.reason,
      subCustomerName: tx.subCustomerName,
      items: tx.items,
      debit: tx.debit,
      credit: tx.credit,
      runningBalance: running
    });
  });

  const closingBalance = running;
  const creditLimit = Number(party.creditLimit || 0);
  const isCreditExceeded = creditLimit > 0 && closingBalance > creditLimit;
  const creditUsagePercentage = creditLimit > 0 ? (closingBalance / creditLimit) * 100 : 0;

  return {
    party,
    fromDate,
    toDate,
    openingBalance: periodOpeningBalance,
    rows,
    totalDebit,
    totalCredit,
    totalWithdrawals,
    totalReceipts,
    totalDisbursements,
    netMovement: totalDebit - totalCredit,
    closingBalance,
    creditLimit,
    isCreditExceeded,
    creditUsagePercentage,
    statementDate: new Date().toISOString().split('T')[0]
  };
}

// ----------------------------------------------------------------------
// EMPLOYEE FINANCIAL STATEMENT GENERATOR (كشف مالي تفصيلي للموظف)
// ----------------------------------------------------------------------

export interface EmployeeStatementRow {
  id: string;
  date: string;
  referenceNumber: string;
  type: 'opening' | 'salary_accrual' | 'advance' | 'deduction' | 'incentive' | 'payment_disbursement';
  typeLabel: string;
  description: string;
  entitlement: number;   // دائن للموظف: راتب مستحق، حافز، مكافأة، بدل، أجر ساعات إضافية
  advance: number;       // مدين على الموظف: سلفة نقدية مسحوبة
  deduction: number;     // مدين على الموظف: خصم أو جزاء أو خصم تأخير
  disbursement: number;  // مدين على الموظف: صرف فعلي مسدد له نقدياً أو بنكياً
  runningBalance: number;// الرصيد التراكمي المتبقي للموظف (موجب = مستحق له، سالب = سلف عليه)
  paymentMethod?: string;
  period?: string;
  notes?: string;
  presentDays?: number;
  workedHours?: number;
  overtimeHours?: number;
  absentDays?: number;
}

export interface EmployeeStatementAttendanceSummary {
  presentDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  excusedLeaveDays: number;
  totalWorkedHours: number;
  officialHoursExpected: number;
  overtimeHours: number;
  overtimePay: number;
  lateMinutes: number;
  lateDeductionAmount: number;
  dailyRate: number;
  hourlyRate: number;
  salaryType: 'monthly' | 'daily' | 'weekly' | 'hourly' | 'piece_rate';
  expectedBasicSalary: number;
  allowances: number;
  incentives: number;
  grossExpectedEarnings: number;
  advancesTotal: number;
  deductionsTotal: number;
  totalDeductionsCombined: number;
  netExpectedPayable: number;
  calculationExplanation: string;
}

export interface EmployeeStatementResult {
  employee: Employee;
  fromDate?: string;
  toDate?: string;
  openingBalance: number;
  rows: EmployeeStatementRow[];
  totalEntitlements: number;   // إجمالي المستحقات (رواتب ومكافآت وإضافي)
  totalAdvances: number;       // إجمالي السلف
  totalDeductions: number;     // إجمالي الخصومات والجزاءات
  totalDisbursements: number;  // إجمالي الصرف الفعلي
  closingBalance: number;      // صافي الرصيد الختامي المتبقي للموظف
  statementDate: string;
  attendanceSummary: EmployeeStatementAttendanceSummary;
}

export function generateEmployeeStatement(params: {
  employee: Employee;
  fromDate?: string;
  toDate?: string;
  vouchers?: PaymentVoucher[];
  advances?: EmployeeAdvance[];
  deductions?: EmployeeDeduction[];
  incentives?: EmployeeIncentive[];
  attendanceRecords?: AttendanceRecord[];
  currencySymbol?: string;
}): EmployeeStatementResult {
  const {
    employee,
    fromDate,
    toDate,
    vouchers = [],
    advances = [],
    deductions = [],
    incentives = [],
    attendanceRecords = [],
    currencySymbol = '₪'
  } = params;

  // 1. تصفية سجلات الدوام الخاصة بالموظف للفترة المحددة
  const empAttendance = attendanceRecords.filter(r =>
    r.employeeId === employee.id &&
    (!fromDate || r.date >= fromDate) &&
    (!toDate || r.date <= toDate)
  );

  const presentDays = empAttendance.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'half_day').length;
  const absentDays = empAttendance.filter(r => r.status === 'absent' || r.status === 'unpaid_leave').length;
  const unpaidLeaveDays = empAttendance.filter(r => r.status === 'unpaid_leave').length;
  const excusedLeaveDays = empAttendance.filter(r => r.status === 'excused_leave').length;
  const totalWorkedHours = Number(empAttendance.reduce((sum, r) => sum + (r.actualWorkedHours || 0), 0).toFixed(1));
  const overtimeHours = Number(empAttendance.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1));
  const overtimePay = Number(empAttendance.reduce((sum, r) => sum + (r.overtimePayEarned || 0), 0).toFixed(2));
  const lateDeductions = Number(empAttendance.reduce((sum, r) => sum + (r.lateDeductionAmount || 0), 0).toFixed(2));
  const lateMinutes = empAttendance.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
  const officialDailyHours = employee.officialDailyHours || 8;
  const officialHoursExpected = (presentDays + absentDays) * officialDailyHours;

  const baseSalaryAmount = Number(employee.salaryAmount || 0);
  let dailyRate = 0;
  let hourlyRate = 0;

  if (employee.salaryType === 'daily') {
    dailyRate = baseSalaryAmount;
    const rawRate = dailyRate / officialDailyHours;
    hourlyRate = employee.roundHourlyRateUp ? Math.ceil(rawRate * 10) / 10 : Number(rawRate.toFixed(2));
  } else if (employee.salaryType === 'weekly') {
    dailyRate = baseSalaryAmount / 6;
    const rawRate = dailyRate / officialDailyHours;
    hourlyRate = employee.roundHourlyRateUp ? Math.ceil(rawRate * 10) / 10 : Number(rawRate.toFixed(2));
  } else {
    // monthly
    const workDays = employee.monthlyWorkDays || 26;
    dailyRate = baseSalaryAmount / workDays;
    const rawRate = dailyRate / officialDailyHours;
    hourlyRate = employee.roundHourlyRateUp ? Math.ceil(rawRate * 10) / 10 : Number(rawRate.toFixed(2));
  }

  // احتساب الراتب الأساسي المفترض للفترة بناءً على الحضور والغياب وساعات العمل
  let expectedBasicSalary = 0;
  let calculationExplanation = '';

  if (employee.salaryType === 'daily') {
    if (empAttendance.length > 0) {
      const regularPaySum = Number(empAttendance.reduce((sum, r) => sum + (r.regularPayEarned || 0), 0).toFixed(2));
      expectedBasicSalary = regularPaySum > 0 ? regularPaySum : Number((dailyRate * presentDays).toFixed(2));
      calculationExplanation = `أجر يومي: ${dailyRate.toFixed(2)} ${currencySymbol} × ${presentDays} يوم عمل (${totalWorkedHours} ساعة عمل فعلية صافية)`;
    } else {
      expectedBasicSalary = Number((dailyRate * 26).toFixed(2));
      calculationExplanation = `أجر يومي تقديري: ${dailyRate.toFixed(2)} ${currencySymbol} × 26 يوم عمل افتراضي`;
    }
  } else if (employee.salaryType === 'weekly') {
    const rawWeekly = baseSalaryAmount * 4;
    const absDed = Number((dailyRate * absentDays).toFixed(2));
    expectedBasicSalary = Math.max(0, Number((rawWeekly - absDed).toFixed(2)));
    calculationExplanation = `أجر أسبوعي: (${baseSalaryAmount.toFixed(2)} ${currencySymbol} × 4 أسابيع) - خصم غياب ${absentDays} أيام (${absDed.toFixed(2)} ${currencySymbol})`;
  } else {
    // monthly
    const absDed = Number((dailyRate * absentDays).toFixed(2));
    expectedBasicSalary = Math.max(0, Number((baseSalaryAmount - absDed).toFixed(2)));
    calculationExplanation = absentDays > 0
      ? `راتب شهري: ${baseSalaryAmount.toFixed(2)} ${currencySymbol} - خصم غياب ${absentDays} يوم (${absDed.toFixed(2)} ${currencySymbol})`
      : `راتب شهري كامل: ${baseSalaryAmount.toFixed(2)} ${currencySymbol} (${presentDays > 0 ? `${presentDays} يوم دوام مسجل` : 'دون غياب مسجل'})`;
  }

  const allowances = Number(employee.allowances || 0);

  // جمع الحوافز والسلف والخصومات للفترة المحددة
  const filteredIncentives = incentives.filter(i =>
    i.employeeId === employee.id &&
    (!fromDate || i.date >= fromDate) &&
    (!toDate || i.date <= toDate)
  );
  const totalIncentivesPeriod = Number(filteredIncentives.reduce((sum, i) => sum + i.amount, 0).toFixed(2));

  const filteredAdvances = advances.filter(a =>
    a.employeeId === employee.id &&
    a.status !== 'cancelled' &&
    (!fromDate || a.date >= fromDate) &&
    (!toDate || a.date <= toDate)
  );
  const totalAdvancesPeriod = Number(filteredAdvances.reduce((sum, a) => sum + a.amount, 0).toFixed(2));

  const filteredDeductions = deductions.filter(d =>
    d.employeeId === employee.id &&
    d.status !== 'cancelled' &&
    (!fromDate || d.date >= fromDate) &&
    (!toDate || d.date <= toDate)
  );
  const totalDeductionsPeriod = Number(filteredDeductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2));

  const grossExpectedEarnings = Number((expectedBasicSalary + overtimePay + allowances + totalIncentivesPeriod).toFixed(2));
  const totalDeductionsCombined = Number((totalAdvancesPeriod + totalDeductionsPeriod + lateDeductions).toFixed(2));
  const netExpectedPayable = Math.max(0, Number((grossExpectedEarnings - totalDeductionsCombined).toFixed(2)));

  const attendanceSummary: EmployeeStatementAttendanceSummary = {
    presentDays,
    absentDays,
    unpaidLeaveDays,
    excusedLeaveDays,
    totalWorkedHours,
    officialHoursExpected,
    overtimeHours,
    overtimePay,
    lateMinutes,
    lateDeductionAmount: lateDeductions,
    dailyRate: Number(dailyRate.toFixed(2)),
    hourlyRate: Number(hourlyRate.toFixed(2)),
    salaryType: employee.salaryType,
    expectedBasicSalary,
    allowances,
    incentives: totalIncentivesPeriod,
    grossExpectedEarnings,
    advancesTotal: totalAdvancesPeriod,
    deductionsTotal: totalDeductionsPeriod,
    totalDeductionsCombined,
    netExpectedPayable,
    calculationExplanation
  };

  // 2. إعداد الحركات المالية التاريخية للموظف
  interface RawEmpTx {
    id: string;
    date: string;
    refNum: string;
    type: EmployeeStatementRow['type'];
    typeLabel: string;
    description: string;
    entitlement: number;
    advance: number;
    deduction: number;
    disbursement: number;
    paymentMethod?: string;
    period?: string;
    notes?: string;
    presentDays?: number;
    workedHours?: number;
    overtimeHours?: number;
    absentDays?: number;
  }

  const allTx: RawEmpTx[] = [];

  // 1. Payment history from Employee record
  (employee.paymentHistory || []).forEach(record => {
    if (record.type === 'advance') {
      allTx.push({
        id: record.id,
        date: record.date,
        refNum: record.voucherNumber || `ADV-${record.id.slice(0, 6)}`,
        type: 'advance',
        typeLabel: 'سلفة نقدية',
        description: record.notes || `سلفة نقدية مستلمة (${record.paymentMethod === 'cash' ? 'نقداً' : 'تحويل'})`,
        entitlement: 0,
        advance: record.amount,
        deduction: 0,
        disbursement: record.amount,
        paymentMethod: record.paymentMethod,
        period: record.period,
        notes: record.notes
      });
    } else {
      allTx.push({
        id: record.id,
        date: record.date,
        refNum: record.voucherNumber || `PAY-${record.id.slice(0, 6)}`,
        type: 'payment_disbursement',
        typeLabel: 'صرف راتب',
        description: record.notes || `صرف الراتب المستحق عن فترة ${record.period || 'الشهر'}`,
        entitlement: 0,
        advance: 0,
        deduction: 0,
        disbursement: record.amount,
        paymentMethod: record.paymentMethod,
        period: record.period,
        notes: record.notes
      });
    }
  });

  // 2. Employee Advances from Context
  advances.forEach(adv => {
    if (adv.employeeId === employee.id && adv.status !== 'cancelled') {
      const exists = allTx.some(t => t.id === adv.id || (t.date === adv.date && t.advance === adv.amount));
      if (!exists) {
        allTx.push({
          id: adv.id,
          date: adv.date,
          refNum: adv.voucherNumber || `ADV-${adv.id.slice(0, 6)}`,
          type: 'advance',
          typeLabel: 'سلفة نقدية',
          description: adv.reason || 'طلب سلفة نقدية معتمدة',
          entitlement: 0,
          advance: adv.amount,
          deduction: 0,
          disbursement: adv.amount,
          notes: adv.reason
        });
      }
    }
  });

  // 3. Employee Deductions (الخصومات والجزاءات)
  deductions.forEach(ded => {
    if (ded.employeeId === employee.id && ded.status !== 'cancelled') {
      allTx.push({
        id: ded.id,
        date: ded.date,
        refNum: `DED-${ded.id.slice(0, 6)}`,
        type: 'deduction',
        typeLabel: 'خصم / جزاء',
        description: ded.reason || 'خصم إداري معتمد',
        entitlement: 0,
        advance: 0,
        deduction: ded.amount,
        disbursement: 0,
        notes: ded.reason
      });
    }
  });

  // 4. Employee Incentives (المكافآت والحوافز)
  incentives.forEach(inc => {
    if (inc.employeeId === employee.id) {
      allTx.push({
        id: inc.id,
        date: inc.date,
        refNum: `INC-${inc.id.slice(0, 6)}`,
        type: 'incentive',
        typeLabel: 'مكافأة / حافز',
        description: inc.reason || 'مكافأة تميز وحافز أداء',
        entitlement: inc.amount,
        advance: 0,
        deduction: 0,
        disbursement: 0,
        notes: inc.reason
      });
    }
  });

  // 5. Payment Vouchers linked to employee
  vouchers.forEach(vch => {
    const isTarget = vch.partyId === employee.id ||
      (vch.description && vch.description.includes(employee.name));

    if (isTarget && vch.type === 'payment') {
      const alreadyLogged = allTx.some(t => t.id === vch.id || t.refNum === vch.voucherNumber);
      if (!alreadyLogged) {
        allTx.push({
          id: vch.id,
          date: vch.date,
          refNum: vch.voucherNumber,
          type: 'payment_disbursement',
          typeLabel: 'سند صرف',
          description: vch.description || `سند صرف للموظف ${employee.name}`,
          entitlement: 0,
          advance: 0,
          deduction: 0,
          disbursement: vch.amount
        });
      }
    }
  });

  // 6. Base Monthly Salary Entitlements with Attendance Breakdown
  const hireYear = Math.max(2023, parseInt((employee.hireDate || '2024-01-01').split('-')[0], 10) || 2024);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  for (let y = hireYear; y <= currentYear; y++) {
    const maxM = (y === currentYear) ? currentMonth : 12;
    for (let m = 1; m <= maxM; m++) {
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      const accrualDate = `${monthStr}-28`;

      if (accrualDate >= (employee.hireDate || '2020-01-01')) {
        // فحص سجلات دوام هذا الشهر تحديداً
        const mAttendance = attendanceRecords.filter(r =>
          r.employeeId === employee.id && r.date.startsWith(monthStr)
        );

        let mPresentDays = mAttendance.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'half_day').length;
        let mAbsentDays = mAttendance.filter(r => r.status === 'absent' || r.status === 'unpaid_leave').length;
        let mWorkedHours = Number(mAttendance.reduce((sum, r) => sum + (r.actualWorkedHours || 0), 0).toFixed(1));
        let mOvertimeHours = Number(mAttendance.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1));
        let mOvertimePay = Number(mAttendance.reduce((sum, r) => sum + (r.overtimePayEarned || 0), 0).toFixed(2));
        let mLateDed = Number(mAttendance.reduce((sum, r) => sum + (r.lateDeductionAmount || 0), 0).toFixed(2));

        let monthBasicSalary = 0;
        let attendanceNotes = '';

        if (employee.salaryType === 'daily') {
          const dRate = Number(employee.salaryAmount || 0);
          if (mAttendance.length > 0) {
            const regPay = Number(mAttendance.reduce((sum, r) => sum + (r.regularPayEarned || 0), 0).toFixed(2));
            monthBasicSalary = regPay > 0 ? regPay : Number((dRate * mPresentDays).toFixed(2));
            attendanceNotes = ` [دوام: ${mPresentDays} يوم (${mWorkedHours} ساعة عمل)]`;
          } else {
            monthBasicSalary = Number((dRate * 26).toFixed(2));
            attendanceNotes = ` [أجر يومي: ${dRate} ${currencySymbol} × 26 يوم]`;
          }
        } else if (employee.salaryType === 'weekly') {
          const wRate = Number(employee.salaryAmount || 0);
          const rawW = wRate * 4;
          const absDed = mAbsentDays > 0 ? Number(((wRate / 6) * mAbsentDays).toFixed(2)) : 0;
          monthBasicSalary = Math.max(0, rawW - absDed);
          attendanceNotes = mAbsentDays > 0 ? ` [غياب: ${mAbsentDays} يوم - خصم ${absDed} ${currencySymbol}]` : ` [حضور كامل]`;
        } else {
          // monthly
          const mAmount = Number(employee.salaryAmount || 0);
          const workDays = employee.monthlyWorkDays || 26;
          const absDed = mAbsentDays > 0 ? Number(((mAmount / workDays) * mAbsentDays).toFixed(2)) : 0;
          monthBasicSalary = Math.max(0, mAmount - absDed);
          attendanceNotes = mAbsentDays > 0
            ? ` [غياب: ${mAbsentDays} يوم - خصم ${absDed} ${currencySymbol}]`
            : mPresentDays > 0 ? ` [دوام: ${mPresentDays} يوم (${mWorkedHours} س)]` : '';
        }

        const totalMonthSalary = Number((monthBasicSalary + allowances + mOvertimePay).toFixed(2));

        if (totalMonthSalary > 0) {
          allTx.push({
            id: `accrual-${employee.id}-${monthStr}`,
            date: accrualDate,
            refNum: `SAL-${monthStr}`,
            type: 'salary_accrual',
            typeLabel: employee.salaryType === 'daily' ? 'أجر يوميات الدوام' : 'راتب شهري مستحق',
            description: `استحقاق راتب شهر ${monthStr} (أساسي: ${monthBasicSalary.toFixed(2)}${allowances > 0 ? ` + بدلات: ${allowances.toFixed(2)}` : ''}${mOvertimePay > 0 ? ` + إضافي: ${mOvertimePay.toFixed(2)}` : ''})${attendanceNotes}`,
            entitlement: totalMonthSalary,
            advance: 0,
            deduction: 0,
            disbursement: 0,
            period: monthStr,
            presentDays: mPresentDays,
            workedHours: mWorkedHours,
            overtimeHours: mOvertimeHours,
            absentDays: mAbsentDays
          });
        }

        // إضافة حركة خصم التأخير المسجلة إن وجدت في سجلات الدوام لهذا الشهر
        if (mLateDed > 0) {
          allTx.push({
            id: `late-ded-${employee.id}-${monthStr}`,
            date: `${monthStr}-27`,
            refNum: `LATE-${monthStr}`,
            type: 'deduction',
            typeLabel: 'خصم تأخير الدوام',
            description: `خصم التأخير عن مواعيد الدوام لشهر ${monthStr}`,
            entitlement: 0,
            advance: 0,
            deduction: mLateDed,
            disbursement: 0,
            period: monthStr
          });
        }
      }
    }
  }

  // ترتيب الحركات تصاعدياً حسب التاريخ
  allTx.sort((a, b) => a.date.localeCompare(b.date));

  // احتساب الرصيد الافتتاحي والحركات قبل fromDate
  let periodOpeningBalance = 0;
  const filteredTx: RawEmpTx[] = [];

  allTx.forEach(tx => {
    const netChange = tx.entitlement - (tx.advance + tx.deduction + tx.disbursement);
    if (fromDate && tx.date < fromDate) {
      periodOpeningBalance += netChange;
    } else if (!toDate || tx.date <= toDate) {
      filteredTx.push(tx);
    }
  });

  let running = periodOpeningBalance;
  let totalEntitlements = 0;
  let totalAdvances = 0;
  let totalDeductions = 0;
  let totalDisbursements = 0;

  const rows: EmployeeStatementRow[] = [];

  filteredTx.forEach(tx => {
    const netChange = tx.entitlement - (tx.advance + tx.deduction + tx.disbursement);
    running += netChange;

    totalEntitlements += tx.entitlement;
    totalAdvances += tx.advance;
    totalDeductions += tx.deduction;
    totalDisbursements += tx.disbursement;

    rows.push({
      id: tx.id,
      date: tx.date,
      referenceNumber: tx.refNum,
      type: tx.type,
      typeLabel: tx.typeLabel,
      description: tx.description,
      entitlement: tx.entitlement,
      advance: tx.advance,
      deduction: tx.deduction,
      disbursement: tx.disbursement,
      runningBalance: running,
      paymentMethod: tx.paymentMethod,
      period: tx.period,
      notes: tx.notes,
      presentDays: tx.presentDays,
      workedHours: tx.workedHours,
      overtimeHours: tx.overtimeHours,
      absentDays: tx.absentDays
    });
  });

  return {
    employee,
    fromDate,
    toDate,
    openingBalance: periodOpeningBalance,
    rows,
    totalEntitlements,
    totalAdvances,
    totalDeductions,
    totalDisbursements,
    closingBalance: running,
    statementDate: new Date().toISOString().split('T')[0],
    attendanceSummary
  };
}

/**
 * Export Party Statement to CSV format (UTF-8 with BOM for Arabic Excel compatibility)
 */
export function exportStatementToCSV(statement: StatementResult, currencySymbol: string = '₪'): void {
  const isCust = statement.party.type === 'customer';
  const headers = [
    'م',
    'التاريخ',
    'رقم المرجع',
    'نوع الحركة',
    'البيان والتفاصيل',
    isCust ? `السحوبات (${currencySymbol})` : `التوريدات (${currencySymbol})`,
    isCust ? `المقبوضات (${currencySymbol})` : `الصرف والمسدد (${currencySymbol})`,
    `الرصيد التراكمي (${currencySymbol})`
  ];

  const rows = statement.rows.map((r, idx) => [
    idx + 1,
    r.date,
    r.referenceNumber,
    `"${r.typeLabel.replace(/"/g, '""')}"`,
    `"${(r.invoiceNotes ? `${r.description} [ملاحظة: ${r.invoiceNotes}]` : r.description).replace(/"/g, '""')}"`,
    r.debit > 0 ? r.debit.toFixed(2) : '0.00',
    r.credit > 0 ? r.credit.toFixed(2) : '0.00',
    r.runningBalance.toFixed(2)
  ]);

  const summaryRows = [
    [],
    ['', '', '', 'رصيد أول المدة / سابق', '', '', '', `${statement.openingBalance.toFixed(2)} ${currencySymbol}`],
    ['', '', '', 'إجمالي السحوبات / مدين', '', statement.totalDebit.toFixed(2), '', ''],
    ['', '', '', 'إجمالي المقبوضات / دائن', '', '', statement.totalCredit.toFixed(2), ''],
    ['', '', '', 'صافي الرصيد الختامي المستحق', '', '', '', `${statement.closingBalance.toFixed(2)} ${currencySymbol}`]
  ];

  const csvContent = '\uFEFF' + [
    [`"كشف حساب تفصيلي: ${statement.party.name}"`],
    [`"الفترة: ${statement.fromDate || 'البداية'} إلى ${statement.toDate || 'الآن'}"`],
    [`"الرقم الضريبي: ${statement.party.taxNumber || 'غير مسجل'}"`],
    [],
    headers.join(','),
    ...rows.map(row => row.join(',')),
    ...summaryRows.map(row => row.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `كشف_حساب_${statement.party.name.replace(/\s+/g, '_')}_${statement.statementDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export Employee Statement to CSV format (with Attendance & Working Hours breakdown)
 */
export function exportEmployeeStatementToCSV(statement: EmployeeStatementResult, currencySymbol: string = '₪'): void {
  const headers = [
    'م',
    'التاريخ',
    'رقم المرجع',
    'نوع الحركة',
    'البيان والتفاصيل وساعات الدوام',
    `المستحقات (${currencySymbol})`,
    `السلف المسحوبة (${currencySymbol})`,
    `الخصومات (${currencySymbol})`,
    `الصرف الفعلي (${currencySymbol})`,
    `الرصيد المتبقي (${currencySymbol})`
  ];

  const rows = statement.rows.map((r, idx) => [
    idx + 1,
    r.date,
    r.referenceNumber,
    `"${r.typeLabel.replace(/"/g, '""')}"`,
    `"${r.description.replace(/"/g, '""')}"`,
    r.entitlement > 0 ? r.entitlement.toFixed(2) : '0.00',
    r.advance > 0 ? r.advance.toFixed(2) : '0.00',
    r.deduction > 0 ? r.deduction.toFixed(2) : '0.00',
    r.disbursement > 0 ? r.disbursement.toFixed(2) : '0.00',
    r.runningBalance.toFixed(2)
  ]);

  const summary = statement.attendanceSummary;

  const summaryRows = [
    [],
    ['=== ملخص احتساب ساعات الدوام والراتب المفترض ==='],
    ['أيام الحضور الفعلي', `${summary.presentDays} يوم`],
    ['أيام الغياب غير المدفوع', `${summary.absentDays} يوم`],
    ['مجموع ساعات العمل الفعلية الصافية', `${formatDecimalHours(summary.totalWorkedHours, 'long')}`],
    ['ساعات العمل الإضافي (الأوفرتايم)', `${formatDecimalHours(summary.overtimeHours, 'long')} (${summary.overtimePay.toFixed(2)} ${currencySymbol})`],
    ['الراتب الأساسي المحتسب بناءً على الدوام', `${summary.expectedBasicSalary.toFixed(2)} ${currencySymbol}`],
    ['العلاوات والبدلات الثابتة', `${summary.allowances.toFixed(2)} ${currencySymbol}`],
    ['المكافآت والحوافز المعتمدة', `${summary.incentives.toFixed(2)} ${currencySymbol}`],
    ['إجمالي الاستحقاقات المفترضة', `${summary.grossExpectedEarnings.toFixed(2)} ${currencySymbol}`],
    ['إجمالي السلف والخصومات وجزاءات التأخير', `${summary.totalDeductionsCombined.toFixed(2)} ${currencySymbol}`],
    ['صافي الراتب المفترض للصرف', `${summary.netExpectedPayable.toFixed(2)} ${currencySymbol}`],
    [],
    ['=== ملخص الحركات المالية وكشف الحساب ==='],
    ['', '', '', 'إجمالي المستحقات والرواتب', '', statement.totalEntitlements.toFixed(2), '', '', '', ''],
    ['', '', '', 'إجمالي السلف المسحوبة', '', '', statement.totalAdvances.toFixed(2), '', '', ''],
    ['', '', '', 'إجمالي الخصومات والجزاءات', '', '', '', statement.totalDeductions.toFixed(2), '', ''],
    ['', '', '', 'إجمالي الصرف الفعلي المسدد', '', '', '', '', statement.totalDisbursements.toFixed(2), ''],
    ['', '', '', 'صافي الرصيد الختامي المتبقي للموظف', '', '', '', '', '', `${statement.closingBalance.toFixed(2)} ${currencySymbol}`]
  ];

  const csvContent = '\uFEFF' + [
    [`"كشف مالي وحساب تفصيلي للعامل/الموظف: ${statement.employee.name}"`],
    [`"الكود: ${statement.employee.code || 'غير محدد'}"`],
    [`"الوظيفة: ${statement.employee.position || 'موظف'}"`],
    [`"نظام الراتب: ${statement.employee.salaryType === 'daily' ? 'أجر يومي (يوميات)' : statement.employee.salaryType === 'weekly' ? 'راتب أسبوعي' : 'راتب شهري'}"`],
    [`"الفترة المحددة: ${statement.fromDate || 'بداية التعامل'} إلى ${statement.toDate || 'الآن'}"`],
    [`"معادلة الاحتساب: ${summary.calculationExplanation}"`],
    [],
    headers.join(','),
    ...rows.map(row => row.join(',')),
    ...summaryRows.map(row => row.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `كشف_حساب_موظف_${statement.employee.name.replace(/\s+/g, '_')}_${statement.statementDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

