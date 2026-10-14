import Dexie, { type Table } from 'dexie';
import type {
  CompanySettings,
  Customer,
  Supplier,
  Quotation,
  SalesOrder,
  Invoice,
  CustomerPayment,
  Expense,
  BankAccount,
  InventoryItem,
  StockMovement,
  Purchase,
  ProductionJob,
  JobCosting,
  DeliveryChallan,
  Employee,
  PayrollRecord,
  Account,
  JournalEntry,
  BackupMetadata,
} from '../types';

export class PumaERPDatabase extends Dexie {
  settings!: Table<CompanySettings, number>;
  customers!: Table<Customer, number>;
  suppliers!: Table<Supplier, number>;
  quotations!: Table<Quotation, number>;
  orders!: Table<SalesOrder, number>;
  invoices!: Table<Invoice, number>;
  customerPayments!: Table<CustomerPayment, number>;
  expenses!: Table<Expense, number>;
  bankAccounts!: Table<BankAccount, number>;
  inventoryItems!: Table<InventoryItem, number>;
  stockMovements!: Table<StockMovement, number>;
  purchases!: Table<Purchase, number>;
  productionJobs!: Table<ProductionJob, number>;
  jobCostings!: Table<JobCosting, number>;
  deliveryChallans!: Table<DeliveryChallan, number>;
  employees!: Table<Employee, number>;
  payroll!: Table<PayrollRecord, number>;
  accounts!: Table<Account, number>;
  journalEntries!: Table<JournalEntry, number>;
  backupLogs!: Table<BackupMetadata, number>;

  constructor() {
    super('PumaArtPrintersDB');
    this.version(1).stores({
      settings: 'id',
      customers: '++id, code, name, company, phone, currentBalance',
      suppliers: '++id, code, name, company, phone, currentBalance',
      quotations: '++id, quotationNumber, customerId, status, date',
      orders: '++id, orderNumber, customerId, productionStatus, paymentStatus, deliveryStatus, date',
      invoices: '++id, invoiceNumber, orderId, customerId, status, dueDate, date',
      customerPayments: '++id, paymentNumber, invoiceId, customerId, date',
      expenses: '++id, expenseNumber, category, date, paymentMethod',
      bankAccounts: '++id, accountName, bankName',
      inventoryItems: '++id, itemCode, name, category, currentStock',
      stockMovements: '++id, movementNumber, itemId, movementType, date',
      purchases: '++id, poNumber, supplierId, status, date',
      productionJobs: '++id, jobCardNumber, orderId, currentStage, status, startDate',
      jobCostings: '++id, jobId, jobCardNumber, customerName',
      deliveryChallans: '++id, challanNumber, orderId, customerId, date',
      employees: '++id, empCode, name, department, status',
      payroll: '++id, payrollNumber, employeeId, month, status',
      accounts: '++id, code, name, category',
      journalEntries: '++id, entryNumber, date, referenceType',
      backupLogs: '++id, timestamp',
    });
  }
}

export const db = new PumaERPDatabase();

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: 1,
  companyName: 'Puma Art Printers',
  tagline: 'PRINTING & PACKAGING SOLUTION',
  industry: 'Cartons, Pharmaceutical, Food, Cosmetic, Retail Packaging & Commercial Printing',
  location: 'Lahore, Pakistan',
  address: 'China Park, Opposite Raja Farm House, Saggian, Lahore, Pakistan',
  phone: '+92 300 4567890',
  whatsapp: '+92 321 8456789',
  email: 'info@pumaartprinters.com',
  website: 'www.pumaartprinters.com',
  currency: 'PKR',
  currencySymbol: 'Rs. ',
  dateFormat: 'DD-MM-YYYY',
  timezone: 'Asia/Karachi',
  ntnNumber: '1432890-7',
  strnNumber: '03-05-9999-888-66',
  bankDetails: 'Meezan Bank Ltd | Account: 02010103456789 | IBAN: PK55MEZN0002010103456789',
  invoicePrefix: 'INV-26-',
  quotationPrefix: 'QT-26-',
  orderPrefix: 'PO-26-',
  challanPrefix: 'DC-26-',
  purchasePrefix: 'PUR-26-',
  payrollPin: '1234',
  lastBackupDate: undefined,
  notes: 'Quality packaging and offset printing since 2005. Free and portable local ERP architecture.',
};

export const DEFAULT_CHART_OF_ACCOUNTS: Omit<Account, 'id'>[] = [
  // ASSETS
  { code: '1010', name: 'Cash in Hand', category: 'asset', subcategory: 'Current Assets', balance: 0, isSystem: true, description: 'Factory & office cash drawer' },
  { code: '1020', name: 'Meezan Bank (Main Operations)', category: 'asset', subcategory: 'Current Assets', balance: 0, isSystem: true, description: 'Primary company bank account' },
  { code: '1021', name: 'HBL Factory Payroll Account', category: 'asset', subcategory: 'Current Assets', balance: 0, isSystem: true, description: 'Secondary bank account' },
  { code: '1050', name: 'Accounts Receivable (Trade Debtors)', category: 'asset', subcategory: 'Current Assets', balance: 0, isSystem: true, description: 'Amounts owed by customers for delivered goods' },
  { code: '1110', name: 'Raw Materials - Bleached & Duplex Board', category: 'asset', subcategory: 'Inventory', balance: 0, isSystem: true, description: 'Carton board stock in warehouse' },
  { code: '1120', name: 'Raw Materials - Printing Inks & Chemicals', category: 'asset', subcategory: 'Inventory', balance: 0, isSystem: true, description: 'CMYK inks, varnish, fountain solutions' },
  { code: '1130', name: 'Raw Materials - Plates & Cutting Dies', category: 'asset', subcategory: 'Inventory', balance: 0, isSystem: true, description: 'CTP aluminum plates and wooden cutting dies' },
  { code: '1140', name: 'Raw Materials - Adhesives & Glues', category: 'asset', subcategory: 'Inventory', balance: 0, isSystem: true, description: 'Hotmelt & cold pasting adhesives' },
  { code: '1150', name: 'Work in Progress (WIP)', category: 'asset', subcategory: 'Inventory', balance: 0, isSystem: true, description: 'Jobs currently on printing/die-cutting machines' },
  { code: '1160', name: 'Finished Goods Inventory', category: 'asset', subcategory: 'Inventory', balance: 0, isSystem: true, description: 'Packed cartons and labels awaiting dispatch' },
  { code: '1510', name: 'Offset Printing Presses', category: 'asset', subcategory: 'Fixed Assets', balance: 0, isSystem: true, description: 'Heidelberg & Roland 4/5 color offset presses' },
  { code: '1520', name: 'Die-Cutting & Finishing Machinery', category: 'asset', subcategory: 'Fixed Assets', balance: 0, isSystem: true, description: 'Automatic die cutters, folder gluers, laminators' },
  
  // LIABILITIES
  { code: '2010', name: 'Accounts Payable (Trade Creditors)', category: 'liability', subcategory: 'Current Liabilities', balance: 0, isSystem: true, description: 'Amounts owed to paper mills and ink suppliers' },
  { code: '2030', name: 'Customer Advances & Deposits', category: 'liability', subcategory: 'Current Liabilities', balance: 0, isSystem: true, description: 'Prepayments received before job completion' },
  { code: '2050', name: 'Accrued Factory Wages', category: 'liability', subcategory: 'Current Liabilities', balance: 0, isSystem: true, description: 'Unpaid monthly salaries and labor wages' },
  { code: '2080', name: 'Sales Tax Payable (PRA/FBR)', category: 'liability', subcategory: 'Current Liabilities', balance: 0, isSystem: true, description: 'Output sales tax collected from customers' },
  { code: '2100', name: 'Short Term Loans', category: 'liability', subcategory: 'Current Liabilities', balance: 0, isSystem: true, description: 'Short-term credit lines' },

  // EQUITY
  { code: '3010', name: 'Owner Capital', category: 'equity', subcategory: 'Equity', balance: 0, isSystem: true, description: 'Initial invested capital' },
  { code: '3020', name: 'Additional Paid-in Capital', category: 'equity', subcategory: 'Equity', balance: 0, isSystem: true, description: 'Partner additions to capital' },
  { code: '3030', name: 'Owner Drawings', category: 'equity', subcategory: 'Equity', balance: 0, isSystem: true, description: 'Withdrawals by owners for personal use' },
  { code: '3040', name: 'Retained Earnings', category: 'equity', subcategory: 'Equity', balance: 0, isSystem: true, description: 'Accumulated business profits' },

  // INCOME
  { code: '4010', name: 'Carton Packaging Revenue', category: 'income', subcategory: 'Revenue', balance: 0, isSystem: true, description: 'Sales of folding cartons and master cartons' },
  { code: '4020', name: 'Pharmaceutical Packaging Revenue', category: 'income', subcategory: 'Revenue', balance: 0, isSystem: true, description: 'Blister cards, pharma boxes, insert leaflets' },
  { code: '4030', name: 'Food & Cosmetic Packaging Revenue', category: 'income', subcategory: 'Revenue', balance: 0, isSystem: true, description: 'Sweet boxes, bakery cartons, beauty cosmetics' },
  { code: '4040', name: 'Commercial Printing Revenue', category: 'income', subcategory: 'Revenue', balance: 0, isSystem: true, description: 'Brochures, catalogs, calendars, flyers' },
  { code: '4090', name: 'Scrap & Paper Waste Sales', category: 'income', subcategory: 'Other Income', balance: 0, isSystem: true, description: 'Sale of paper cutoffs, trim waste, scrap metal' },

  // COST OF GOODS SOLD (COGS)
  { code: '5010', name: 'Direct Paper & Board Consumed', category: 'cogs', subcategory: 'Cost of Sales', balance: 0, isSystem: true, description: 'Cost of board/paper sheets used in production' },
  { code: '5020', name: 'Direct Inks & Varnishes Consumed', category: 'cogs', subcategory: 'Cost of Sales', balance: 0, isSystem: true, description: 'Cost of printing inks, primers, overprint coatings' },
  { code: '5030', name: 'Direct Production Labor', category: 'cogs', subcategory: 'Cost of Sales', balance: 0, isSystem: true, description: 'Pressmen, die-cut operators, manual pasting labor' },
  { code: '5040', name: 'Outsourced UV & Foil Stamping', category: 'cogs', subcategory: 'Cost of Sales', balance: 0, isSystem: true, description: 'Subcontracted spot UV, gold leaf foiling, embossing' },
  { code: '5050', name: 'Die-Making & CTP Plate Expenses', category: 'cogs', subcategory: 'Cost of Sales', balance: 0, isSystem: true, description: 'CTP laser plates and custom wooden dies per job' },

  // OPERATING EXPENSES
  { code: '6010', name: 'Factory Rent (Saggian Lahore)', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Monthly shed and factory ground rental' },
  { code: '6020', name: 'Factory Electricity (LESCO)', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Industrial power tariff & fuel for diesel generator' },
  { code: '6030', name: 'Office Salaries & Admin Wages', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Accounts, estimators, graphics designers, office staff' },
  { code: '6040', name: 'Printing Press Repairs & Maintenance', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Rollers, blankets, machine spare parts, oil' },
  { code: '6050', name: 'Delivery Transport & Fuel Expenses', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Suzuki pickup fuel and truck freight charges' },
  { code: '6060', name: 'Packaging Straps, Tape & Shink Wrap', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Packing materials for final dispatch' },
  { code: '6070', name: 'Staff Tea, Mess & Welfare', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Daily tea and worker refreshments' },
  { code: '6080', name: 'Marketing, Website & Samples', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'Promotional material and client mockups' },
  { code: '6090', name: 'Miscellaneous Factory Expenses', category: 'expense', subcategory: 'Operating Expenses', balance: 0, isSystem: true, description: 'General sundry factory expenses' },
];

/**
 * Initialize DB with default settings, bank accounts and accounts if empty
 */
export async function initializeDatabase(): Promise<void> {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_COMPANY_SETTINGS);
  }

  const accountsCount = await db.accounts.count();
  if (accountsCount === 0) {
    for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
      await db.accounts.add(acc as Account);
    }
  }

  const bankCount = await db.bankAccounts.count();
  if (bankCount === 0) {
    await db.bankAccounts.add({
      accountName: 'Meezan Bank - Main Operations',
      bankName: 'Meezan Islamic Bank',
      accountNumber: '02010103456789',
      iban: 'PK55MEZN0002010103456789',
      branchName: 'Saggian Bypass Branch, Lahore',
      openingBalance: 1250000,
      currentBalance: 1250000,
      notes: 'Company primary operational current account',
    });
    await db.bankAccounts.add({
      accountName: 'HBL - Factory & Payroll',
      bankName: 'Habib Bank Limited',
      accountNumber: '01020034567801',
      iban: 'PK44HABB0001020034567801',
      branchName: 'Ravi Road Branch, Lahore',
      openingBalance: 450000,
      currentBalance: 450000,
      notes: 'Dedicated for monthly payroll and worker stipends',
    });
  }
}

/**
 * Seeds realistic starter data for Puma Art Printers so the user immediately has
 * active customers (pharma & food brands in Lahore), real inventory (Bleached board, inks),
 * sample quotations, active orders, production jobs, and employees.
 */
export async function seedDemoData(): Promise<void> {
  // Check if customers already exist
  const custCount = await db.customers.count();
  if (custCount > 0) return;

  // Customers
  const c1 = await db.customers.add({
    code: 'CUST-001',
    name: 'Novartis Labs Packaging Div.',
    company: 'Novartis Pharma Pakistan',
    contactPerson: 'Mr. Tariq Mehmood (Procurement Manager)',
    phone: '+92 300 8492011',
    whatsapp: '+92 300 8492011',
    email: 'procurement@novartispack.pk',
    address: 'Sundar Industrial Estate, Raiwind Road, Lahore',
    industry: 'Pharmaceutical Packaging',
    paymentTerms: '30 Days Net',
    creditLimit: 2500000,
    openingBalance: 0,
    currentBalance: 345000,
    notes: 'Premium client for syrup boxes and antibiotic blister unit cartons.',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  });

  const c2 = await db.customers.add({
    code: 'CUST-002',
    name: 'Gourmet Bakers & Foods Ltd.',
    company: 'Gourmet Foods Lahore',
    contactPerson: 'Sheikh Asim Rafiq',
    phone: '+92 321 4455667',
    whatsapp: '+92 321 4455667',
    email: 'packaging@gourmet.pk',
    address: 'Multan Road, Near Thokar Niaz Baig, Lahore',
    industry: 'Food Packaging',
    paymentTerms: '15 Days Net',
    creditLimit: 1500000,
    openingBalance: 0,
    currentBalance: 180000,
    notes: 'Cake boxes, pastry cartons, and sweet gift boxes.',
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-10-05T11:00:00Z',
  });

  const c3 = await db.customers.add({
    code: 'CUST-003',
    name: 'Rivaj UK Cosmetics Pakistan',
    company: 'Rivaj Cosmetics Distribution',
    contactPerson: 'Zainab Bibi',
    phone: '+92 333 9876543',
    whatsapp: '+92 333 9876543',
    email: 'order@rivajpk.com',
    address: 'Gulberg III, MM Alam Road, Lahore',
    industry: 'Cosmetic Packaging',
    paymentTerms: 'Advance / Cash on Delivery',
    creditLimit: 500000,
    openingBalance: 0,
    currentBalance: 0,
    notes: 'High-end cosmetic outer boxes with gold foil and soft-touch lamination.',
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-10-10T12:00:00Z',
  });

  // Suppliers
  const s1 = await db.suppliers.add({
    code: 'SUP-001',
    name: 'Century Paper & Board Mills Ltd',
    company: 'Century Mills Lahore',
    contactPerson: 'Hassan Raza',
    phone: '+92 42 35870041',
    email: 'sales@centurypaper.com.pk',
    address: 'Bhikhi, Sheikhupura Road, Lahore Depot',
    paymentTerms: 'Credit 30 Days',
    openingBalance: 0,
    currentBalance: 420000,
    notes: 'Primary supplier for 300-350 GSM Bleached Board & Duplex Grey Back.',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  });

  const s2 = await db.suppliers.add({
    code: 'SUP-002',
    name: 'DIC Pakistan (Inks & Varnishes)',
    company: 'DIC Pakistan Limited',
    contactPerson: 'Khalid Butt',
    phone: '+92 42 35114178',
    email: 'orders@dicpakistan.com',
    address: 'Kot Lakhpat Industrial Area, Lahore',
    paymentTerms: 'Credit 15 Days',
    openingBalance: 0,
    currentBalance: 95000,
    notes: 'Four-color CMYK process inks, metallic inks, food grade varnish.',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-10-02T14:00:00Z',
  });

  // Inventory Items
  const inv1 = await db.inventoryItems.add({
    itemCode: 'MAT-BD-350',
    name: 'Bleached Folding Box Board (FBB) 350 GSM',
    category: 'board',
    unit: 'sheets',
    gsm: 350,
    dimensions: '28 x 40 inches',
    brandOrOrigin: 'Century Mills Grade-A',
    openingStock: 12000,
    currentStock: 9500,
    unitCost: 68.5,
    totalValue: 650750,
    reorderLevel: 3000,
    location: 'Warehouse Bay 1',
    notes: 'Standard pharmaceutical carton stock',
    updatedAt: '2026-10-12T10:00:00Z',
  });

  const inv2 = await db.inventoryItems.add({
    itemCode: 'MAT-DP-300',
    name: 'Duplex Board Grey Back 300 GSM',
    category: 'board',
    unit: 'sheets',
    gsm: 300,
    dimensions: '25 x 36 inches',
    brandOrOrigin: 'Bulleh Shah Paper Mills',
    openingStock: 15000,
    currentStock: 14200,
    unitCost: 46.0,
    totalValue: 653200,
    reorderLevel: 4000,
    location: 'Warehouse Bay 2',
    notes: 'Used for retail and bakery product cartons',
    updatedAt: '2026-10-12T10:00:00Z',
  });

  const inv3 = await db.inventoryItems.add({
    itemCode: 'INK-CMYK-SET',
    name: 'Offset Process Inks (CMYK 4-Pack)',
    category: 'ink',
    unit: 'kg',
    openingStock: 250,
    currentStock: 185,
    unitCost: 1850,
    totalValue: 342250,
    reorderLevel: 50,
    location: 'Ink Room Rack A',
    notes: 'DIC High-gloss fast-drying process series',
    updatedAt: '2026-10-12T10:00:00Z',
  });

  const inv4 = await db.inventoryItems.add({
    itemCode: 'PLT-CTP-1030',
    name: 'CTP Thermal Aluminum Plates (1030x790mm)',
    category: 'plates',
    unit: 'pieces',
    openingStock: 120,
    currentStock: 35,
    unitCost: 1450,
    totalValue: 50750,
    reorderLevel: 40,
    location: 'CTP Prepress Storage',
    notes: 'For Heidelberg Speedmaster CD 102 (Needs reorder alert!)',
    updatedAt: '2026-10-12T10:00:00Z',
  });

  const inv5 = await db.inventoryItems.add({
    itemCode: 'ADH-COLD-GLUE',
    name: 'Water-based Folder Gluer Adhesive',
    category: 'adhesives',
    unit: 'kg',
    openingStock: 300,
    currentStock: 240,
    unitCost: 480,
    totalValue: 115200,
    reorderLevel: 60,
    location: 'Finishing Department',
    notes: 'For automatic carton side-seam pasting',
    updatedAt: '2026-10-12T10:00:00Z',
  });

  // Employees
  await db.employees.add({
    empCode: 'EMP-01',
    name: 'Muhammad Farooq',
    designation: 'Senior Pressman (Offset Operator)',
    department: 'Press',
    phone: '+92 312 4001234',
    cnic: '35201-1234567-1',
    joiningDate: '2021-03-15',
    basicSalary: 65000,
    allowances: 10000,
    currentAdvanceBalance: 5000,
    status: 'active',
  });

  await db.employees.add({
    empCode: 'EMP-02',
    name: 'Rashid Ali',
    designation: 'Die-Cutting & Finishing Master',
    department: 'Finishing',
    phone: '+92 313 5123456',
    cnic: '35201-7654321-3',
    joiningDate: '2022-06-01',
    basicSalary: 55000,
    allowances: 8000,
    currentAdvanceBalance: 0,
    status: 'active',
  });

  await db.employees.add({
    empCode: 'EMP-03',
    name: 'Zeeshan Akhtar',
    designation: 'Prepress & CTP Graphic Designer',
    department: 'Artwork',
    phone: '+92 304 9988776',
    cnic: '35202-3344556-7',
    joiningDate: '2023-01-10',
    basicSalary: 60000,
    allowances: 7000,
    currentAdvanceBalance: 0,
    status: 'active',
  });

  // Sample Order & Production Job
  const orderId = await db.orders.add({
    orderNumber: 'PO-26-001',
    customerId: c1,
    customerName: 'Novartis Labs Packaging Div.',
    date: '2026-10-02',
    deliveryDate: '2026-10-18',
    items: [
      {
        productName: 'Cough Syrup 120ml Outer Unit Carton',
        dimensions: '4.5 x 2.25 x 2.25 inches',
        paperBoardSpec: '350 GSM Bleached Board',
        gsm: 350,
        quantity: 25000,
        unitPrice: 13.8,
        lineTotal: 345000,
        finishingRequirements: 'Matte Lamination + Spot UV on Brand Logo + Die Cutting',
        printingRequirements: '4 Color Offset CMYK + Overprint Varnish',
        deliveredQty: 10000,
        invoicedQty: 25000,
      },
    ],
    subtotal: 345000,
    discount: 0,
    deliveryCharges: 0,
    taxAmount: 0,
    totalAmount: 345000,
    advanceReceived: 100000,
    balanceDue: 245000,
    productionStatus: 'in_production',
    paymentStatus: 'partial',
    deliveryStatus: 'partial',
    notes: 'Phase 1 delivered (10,000 pcs). Remaining 15,000 on folder gluer machine.',
    createdAt: '2026-10-02T10:00:00Z',
  });

  // Production Job
  await db.productionJobs.add({
    jobCardNumber: 'JC-26-101',
    orderId: orderId,
    orderNumber: 'PO-26-001',
    customerId: c1,
    customerName: 'Novartis Labs Packaging Div.',
    productName: 'Cough Syrup 120ml Outer Unit Carton',
    targetQuantity: 25000,
    producedQuantity: 18500,
    rejectedQuantity: 320,
    wastageQuantity: 650,
    currentStage: 'Pasting',
    stagesCompleted: [
      { stage: 'Order Confirmed', completedAt: '2026-10-02T11:00:00Z', completedBy: 'Admin', notes: 'Approved by client' },
      { stage: 'Artwork Preparation', completedAt: '2026-10-03T15:00:00Z', completedBy: 'Zeeshan Akhtar', notes: 'Die line verified' },
      { stage: 'Customer Approval', completedAt: '2026-10-04T12:00:00Z', completedBy: 'Tariq Mehmood', notes: 'Signed sample print' },
      { stage: 'Material Preparation', completedAt: '2026-10-05T09:00:00Z', completedBy: 'Warehouse Master', notes: '2500 sheets 350 GSM issued' },
      { stage: 'Plate Preparation', completedAt: '2026-10-05T14:00:00Z', completedBy: 'Zeeshan Akhtar', notes: '4 CTP thermal plates imaged' },
      { stage: 'Printing', completedAt: '2026-10-07T18:00:00Z', completedBy: 'Muhammad Farooq', notes: 'Offset run completed' },
      { stage: 'UV Finishing', completedAt: '2026-10-09T17:00:00Z', completedBy: 'Finishing Team', notes: 'Spot UV cured' },
      { stage: 'Die-Cutting', completedAt: '2026-10-11T16:00:00Z', completedBy: 'Rashid Ali', notes: 'Creased and cut clean' },
    ],
    estimatedCost: 195000,
    actualCost: 198500,
    startDate: '2026-10-02',
    targetCompletionDate: '2026-10-18',
    responsiblePerson: 'Rashid Ali',
    priority: 'high',
    status: 'in_progress',
    notes: 'Urgent pharmaceutical order. Folder gluer currently running.',
    createdAt: '2026-10-02T11:30:00Z',
  });

  // Job Costing Record
  await db.jobCostings.add({
    jobId: 1,
    jobCardNumber: 'JC-26-101',
    customerName: 'Novartis Labs Packaging Div.',
    productName: 'Cough Syrup 120ml Outer Unit Carton',
    orderQuantity: 25000,
    dimensions: '4.5 x 2.25 x 2.25 inches',
    materialType: '350 GSM Bleached Folding Box Board',
    materialGsm: 350,
    formulaType: 'cartons',
    estimatedMaterialCost: 120000,
    actualMaterialCost: 122500,
    estimatedPlateCost: 6000,
    actualPlateCost: 5800,
    estimatedDieCost: 7500,
    actualDieCost: 7500,
    estimatedPrintingCost: 22000,
    actualPrintingCost: 23200,
    estimatedUvCost: 18000,
    actualUvCost: 18000,
    estimatedPastingCost: 12000,
    actualPastingCost: 12500,
    estimatedOutsourceCost: 0,
    actualOutsourceCost: 0,
    estimatedPackingCost: 4500,
    actualPackingCost: 4500,
    estimatedTransportCost: 5000,
    actualTransportCost: 4500,
    estimatedOtherDirectCost: 0,
    actualOtherDirectCost: 0,
    estimatedTotalCost: 195000,
    actualTotalCost: 198500,
    estimatedUnitCost: 7.80,
    actualUnitCost: 7.94,
    sellingPrice: 345000,
    estimatedGrossProfit: 150000,
    actualGrossProfit: 146500,
    profitMarginPercent: 42.46,
    costVariance: -3500,
    notes: 'Variance due to minor paper sheet trim waste during setup.',
    createdAt: '2026-10-02T12:00:00Z',
  });

  // Sample Invoice
  const invoiceId = await db.invoices.add({
    invoiceNumber: 'INV-26-001',
    orderId: orderId,
    orderNumber: 'PO-26-001',
    customerId: c1,
    customerName: 'Novartis Labs Packaging Div.',
    date: '2026-10-10',
    dueDate: '2026-11-09',
    items: [
      {
        productName: 'Cough Syrup 120ml Outer Unit Carton',
        quantity: 25000,
        unitPrice: 13.8,
        lineTotal: 345000,
      },
    ],
    subtotal: 345000,
    discount: 0,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: 345000,
    paidAmount: 100000,
    balanceDue: 245000,
    status: 'partial',
    notes: 'Advance Rs. 100,000 received. Balance payable on 30 days net.',
    createdAt: '2026-10-10T11:00:00Z',
  });

  // Customer Payment
  await db.customerPayments.add({
    paymentNumber: 'PAY-26-001',
    invoiceId: invoiceId,
    invoiceNumber: 'INV-26-001',
    customerId: c1,
    customerName: 'Novartis Labs Packaging Div.',
    date: '2026-10-02',
    amount: 100000,
    paymentMethod: 'bank_transfer',
    referenceNumber: 'TXN-MEEZAN-99201',
    bankAccountId: 1,
    notes: 'Initial production booking advance deposit',
    createdAt: '2026-10-02T14:00:00Z',
  });

  // Delivery Challan
  await db.deliveryChallans.add({
    challanNumber: 'DC-26-001',
    orderId: orderId,
    orderNumber: 'PO-26-001',
    customerId: c1,
    customerName: 'Novartis Labs Packaging Div.',
    date: '2026-10-10',
    items: [
      {
        productName: 'Cough Syrup 120ml Outer Unit Carton',
        orderedQty: 25000,
        previouslyDeliveredQty: 0,
        dispatchQty: 10000,
        remainingQty: 15000,
      },
    ],
    deliveryAddress: 'Novartis Labs, Plot 42 Sundar Industrial Estate, Lahore',
    vehicleNumber: 'LES-18-4592',
    driverName: 'Muhammad Akram',
    receiverName: 'Usman Ali (Store Incharge)',
    receiverPhone: '+92 301 2233445',
    acknowledged: true,
    notes: 'Partial shipment: 20 corrugated master cartons of 500 pcs each received in good order.',
    createdAt: '2026-10-10T16:30:00Z',
  });

  // Sample Expenses
  await db.expenses.add({
    expenseNumber: 'EXP-26-001',
    category: 'Electricity & Utilities',
    title: 'LESCO Factory Industrial Electricity Bill',
    date: '2026-10-05',
    amount: 148500,
    paymentMethod: 'bank_transfer',
    bankAccountId: 1,
    paidTo: 'LESCO Saggian Sub-Division',
    description: 'Electricity consumption for September printing presses run',
    createdAt: '2026-10-05T09:00:00Z',
  });

  await db.expenses.add({
    expenseNumber: 'EXP-26-002',
    category: 'Transportation & Fuel',
    title: 'Diesel Fuel for Factory Generator & Pickup Van',
    date: '2026-10-08',
    amount: 28000,
    paymentMethod: 'cash',
    paidTo: 'Shell Petrol Pump Saggian',
    description: '100 Liters high speed diesel for generator backup',
    createdAt: '2026-10-08T11:00:00Z',
  });

  // Balanced Journal Entries
  await db.journalEntries.add({
    entryNumber: 'JE-26-0001',
    date: '2026-10-02',
    description: 'Customer advance received for PO-26-001 (Novartis)',
    referenceType: 'payment',
    referenceId: 1,
    debits: [{ accountId: 2, accountCode: '1020', accountName: 'Meezan Bank (Main Operations)', amount: 100000 }],
    credits: [{ accountId: 14, accountCode: '2030', accountName: 'Customer Advances & Deposits', amount: 100000 }],
    totalAmount: 100000,
    createdAt: '2026-10-02T14:05:00Z',
  });

  await db.journalEntries.add({
    entryNumber: 'JE-26-0002',
    date: '2026-10-10',
    description: 'Invoice INV-26-001 issued for Cough Syrup cartons',
    referenceType: 'invoice',
    referenceId: invoiceId,
    debits: [{ accountId: 4, accountCode: '1050', accountName: 'Accounts Receivable (Trade Debtors)', amount: 345000 }],
    credits: [{ accountId: 21, accountCode: '4020', accountName: 'Pharmaceutical Packaging Revenue', amount: 345000 }],
    totalAmount: 345000,
    createdAt: '2026-10-10T11:05:00Z',
  });

  // Update account balances
  const meezanAcc = await db.accounts.where('code').equals('1020').first();
  if (meezanAcc && meezanAcc.id) {
    await db.accounts.update(meezanAcc.id, { balance: meezanAcc.balance + 100000 - 148500 });
  }

  const arAcc = await db.accounts.where('code').equals('1050').first();
  if (arAcc && arAcc.id) {
    await db.accounts.update(arAcc.id, { balance: arAcc.balance + 345000 });
  }
}
