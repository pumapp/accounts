export type NavigationTab =
  | 'dashboard'
  | 'customers'
  | 'suppliers'
  | 'quotations'
  | 'orders'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'cash_bank'
  | 'inventory'
  | 'purchases'
  | 'production'
  | 'job_costing'
  | 'delivery_challans'
  | 'employees'
  | 'payroll'
  | 'accounting'
  | 'reports'
  | 'backups'
  | 'settings';

export interface CompanySettings {
  id: number;
  companyName: string;
  tagline: string;
  industry: string;
  location: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timezone: string;
  ntnNumber: string;
  strnNumber: string;
  bankDetails: string;
  invoicePrefix: string;
  quotationPrefix: string;
  orderPrefix: string;
  challanPrefix: string;
  purchasePrefix: string;
  payrollPin: string; // Optional local security PIN
  lastBackupDate?: string;
  notes?: string;
}

export interface Customer {
  id?: number;
  code: string;
  name: string;
  company: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  industry: string;
  paymentTerms: string;
  creditLimit: number;
  openingBalance: number;
  currentBalance: number; // Positive = customer owes us (Receivable)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id?: number;
  code: string;
  name: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  openingBalance: number;
  currentBalance: number; // Positive = we owe supplier (Payable)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  productName: string;
  dimensions: string; // e.g. "9.5 x 4 x 2 inches"
  paperBoardSpec: string; // e.g. "350 GSM Bleached Board"
  gsm: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  finishingRequirements: string; // e.g. "Matte Lamination + Spot UV + Die Cutting"
  printingRequirements: string; // e.g. "4 Color Offset CMYK"
}

export interface Quotation {
  id?: number;
  quotationNumber: string;
  customerId: number;
  customerName: string;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  deliveryCharges: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paymentTerms: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
  convertedOrderId?: number;
  notes?: string;
  createdAt: string;
}

export interface SalesOrderItem extends QuotationItem {
  deliveredQty?: number;
  invoicedQty?: number;
}

export interface SalesOrder {
  id?: number;
  orderNumber: string;
  quotationId?: number;
  customerId: number;
  customerName: string;
  date: string;
  deliveryDate: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharges: number;
  taxAmount: number;
  totalAmount: number;
  advanceReceived: number;
  balanceDue: number;
  productionStatus: 'pending' | 'in_production' | 'completed' | 'delivered';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  deliveryStatus: 'pending' | 'partial' | 'delivered';
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  orderId?: number;
  orderNumber?: string;
  customerId: number;
  customerName: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'reversed';
  notes?: string;
  journalEntryId?: number;
  createdAt: string;
}

export interface CustomerPayment {
  id?: number;
  paymentNumber: string;
  invoiceId?: number;
  invoiceNumber?: string;
  customerId: number;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
  referenceNumber: string; // Cheque number or bank transaction ID
  bankAccountId?: number;
  notes?: string;
  journalEntryId?: number;
  createdAt: string;
}

export interface Expense {
  id?: number;
  expenseNumber: string;
  category:
    | 'Factory Rent'
    | 'Electricity & Utilities'
    | 'Factory Salaries'
    | 'Office Salaries'
    | 'Machine Maintenance'
    | 'Transportation & Fuel'
    | 'Plates & Chemicals'
    | 'Tea & Staff Welfare'
    | 'Printing Inks & Solvents'
    | 'Packaging Supplies'
    | 'Marketing & Printing'
    | 'Government Fees & Taxes'
    | 'Misc Expense';
  title: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
  bankAccountId?: number;
  paidTo: string;
  description: string;
  receiptAttachment?: string; // base64 or description
  journalEntryId?: number;
  createdAt: string;
}

export interface BankAccount {
  id?: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  branchName?: string;
  openingBalance: number;
  currentBalance: number;
  notes?: string;
}

export type InventoryCategory =
  | 'paper'
  | 'board'
  | 'ink'
  | 'plates'
  | 'dies'
  | 'adhesives'
  | 'uv_consumables'
  | 'packaging_material'
  | 'finished_goods'
  | 'other';

export type InventoryUnit = 'sheets' | 'kg' | 'tons' | 'reams' | 'rolls' | 'pieces' | 'boxes';

export interface InventoryItem {
  id?: number;
  itemCode: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  gsm?: number;
  dimensions?: string;
  brandOrOrigin?: string;
  openingStock: number;
  currentStock: number;
  unitCost: number; // in PKR
  totalValue: number; // currentStock * unitCost
  reorderLevel: number;
  location?: string;
  notes?: string;
  updatedAt: string;
}

export interface StockMovement {
  id?: number;
  movementNumber: string;
  date: string;
  itemId: number;
  itemName: string;
  movementType: 'opening' | 'purchase_in' | 'production_issue' | 'production_return' | 'wastage' | 'adjustment';
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceType?: 'purchase' | 'job' | 'manual';
  referenceId?: number;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  itemId: number;
  itemName: string;
  unit: InventoryUnit;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  receivedQuantity: number;
}

export interface Purchase {
  id?: number;
  poNumber: string;
  supplierBillNumber?: string;
  supplierId: number;
  supplierName: string;
  date: string;
  dueDate: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: 'draft' | 'ordered' | 'partial_received' | 'received' | 'paid';
  goodsReceivedDate?: string;
  journalEntryId?: number;
  createdAt: string;
}

export type ProductionStage =
  | 'Order Confirmed'
  | 'Artwork Preparation'
  | 'Customer Approval'
  | 'Material Preparation'
  | 'Plate Preparation'
  | 'Printing'
  | 'Die-Cutting'
  | 'UV Finishing'
  | 'Pasting'
  | 'Quality Inspection'
  | 'Packing'
  | 'Ready for Delivery'
  | 'Delivered';

export interface StageLog {
  stage: ProductionStage;
  completedAt: string;
  completedBy: string;
  notes: string;
  skipped?: boolean;
}

export interface ProductionJob {
  id?: number;
  jobCardNumber: string;
  orderId?: number;
  orderNumber?: string;
  customerId: number;
  customerName: string;
  productName: string;
  targetQuantity: number;
  producedQuantity: number;
  rejectedQuantity: number;
  wastageQuantity: number;
  currentStage: ProductionStage;
  stagesCompleted: StageLog[];
  estimatedCost: number;
  actualCost: number;
  startDate: string;
  targetCompletionDate: string;
  actualCompletionDate?: string;
  responsiblePerson: string;
  priority: 'normal' | 'urgent' | 'high';
  status: 'scheduled' | 'in_progress' | 'qa_review' | 'ready_dispatch' | 'completed' | 'delayed';
  notes?: string;
  createdAt: string;
}

export interface JobCosting {
  id?: number;
  jobId?: number;
  jobCardNumber?: string;
  customerName: string;
  productName: string;
  orderQuantity: number;
  dimensions: string;
  materialType: string;
  materialGsm: number;
  formulaType: 'cartons' | 'labels' | 'leaflets' | 'bags' | 'corrugated';
  // Breakdown
  estimatedMaterialCost: number;
  actualMaterialCost: number;
  estimatedPlateCost: number;
  actualPlateCost: number;
  estimatedDieCost: number;
  actualDieCost: number;
  estimatedPrintingCost: number;
  actualPrintingCost: number;
  estimatedUvCost: number;
  actualUvCost: number;
  estimatedPastingCost: number;
  actualPastingCost: number;
  estimatedOutsourceCost: number;
  actualOutsourceCost: number;
  estimatedPackingCost: number;
  actualPackingCost: number;
  estimatedTransportCost: number;
  actualTransportCost: number;
  estimatedOtherDirectCost: number;
  actualOtherDirectCost: number;
  // Totals
  estimatedTotalCost: number;
  actualTotalCost: number;
  estimatedUnitCost: number;
  actualUnitCost: number;
  sellingPrice: number;
  estimatedGrossProfit: number;
  actualGrossProfit: number;
  profitMarginPercent: number;
  costVariance: number;
  notes?: string;
  createdAt: string;
}

export interface DeliveryChallanItem {
  productName: string;
  orderedQty: number;
  previouslyDeliveredQty: number;
  dispatchQty: number;
  remainingQty: number;
}

export interface DeliveryChallan {
  id?: number;
  challanNumber: string;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  date: string;
  items: DeliveryChallanItem[];
  deliveryAddress: string;
  vehicleNumber: string;
  driverName: string;
  receiverName?: string;
  receiverPhone?: string;
  acknowledged: boolean;
  notes?: string;
  createdAt: string;
}

export interface Employee {
  id?: number;
  empCode: string;
  name: string;
  designation: string;
  department: 'Production' | 'Press' | 'Finishing' | 'Artwork' | 'Accounts' | 'Administration' | 'Delivery';
  phone: string;
  cnic: string;
  joiningDate: string;
  basicSalary: number;
  allowances: number;
  currentAdvanceBalance: number; // outstanding salary advances
  status: 'active' | 'inactive';
  notes?: string;
}

export interface PayrollRecord {
  id?: number;
  payrollNumber: string;
  month: string; // e.g. "October 2026"
  year: number;
  date: string;
  employeeId: number;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  overtimeHours: number;
  overtimeAmount: number;
  advanceDeductions: number;
  bonus: number;
  totalDeductions: number;
  netPayable: number;
  status: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'bank_transfer' | 'cheque';
  paidDate?: string;
  journalEntryId?: number;
  notes?: string;
}

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'income' | 'cogs' | 'expense';

export interface Account {
  id?: number;
  code: string;
  name: string;
  category: AccountCategory;
  subcategory: string;
  balance: number;
  isSystem: boolean;
  description?: string;
}

export interface JournalLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number; // Always positive
}

export interface JournalEntry {
  id?: number;
  entryNumber: string;
  date: string;
  description: string;
  referenceType?: 'invoice' | 'payment' | 'purchase' | 'supplier_payment' | 'expense' | 'payroll' | 'manual';
  referenceId?: number;
  debits: JournalLine[];
  credits: JournalLine[];
  totalAmount: number;
  isReversed?: boolean;
  reversalOf?: number;
  createdAt: string;
}

export interface BackupMetadata {
  id?: number;
  timestamp: string;
  appVersion: string;
  recordCounts: Record<string, number>;
  fileName: string;
  isTestRestored?: boolean;
}
