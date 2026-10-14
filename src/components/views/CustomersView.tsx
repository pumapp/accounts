import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  FileText,
  CreditCard,
  Building2,
  Share2,
  Trash2,
  Edit2,
  X,
  FileDown,
} from 'lucide-react';
import { db } from '../../db';
import type { Customer, CompanySettings, Invoice, Quotation, SalesOrder, CustomerPayment } from '../../types';
import { PDFGenerator } from '../../services/pdf';

interface CustomersViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ settings, initialAction }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Drilldown data for selected customer
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [customerOrders, setCustomerOrders] = useState<SalesOrder[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formIndustry, setFormIndustry] = useState('Pharmaceutical Packaging');
  const [formPaymentTerms, setFormPaymentTerms] = useState('30 Days Net');
  const [formCreditLimit, setFormCreditLimit] = useState<number>(1000000);
  const [formOpeningBalance, setFormOpeningBalance] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const list = await db.customers.toArray();
    setCustomers(list);
    if (list.length > 0 && !selectedCustomer) {
      handleSelectCustomer(list[0]);
    }
  };

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    if (cust.id) {
      const invs = await db.invoices.where('customerId').equals(cust.id).toArray();
      const ords = await db.orders.where('customerId').equals(cust.id).toArray();
      const pays = await db.customerPayments.where('customerId').equals(cust.id).toArray();
      setCustomerInvoices(invs);
      setCustomerOrders(ords);
      setCustomerPayments(pays);
    }
  };

  const openNewModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormCompany('');
    setFormContact('');
    setFormPhone('');
    setFormWhatsapp('');
    setFormEmail('');
    setFormAddress('');
    setFormIndustry('Pharmaceutical Packaging');
    setFormPaymentTerms('30 Days Net');
    setFormCreditLimit(1000000);
    setFormOpeningBalance(0);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormCompany(cust.company);
    setFormContact(cust.contactPerson);
    setFormPhone(cust.phone);
    setFormWhatsapp(cust.whatsapp);
    setFormEmail(cust.email);
    setFormAddress(cust.address);
    setFormIndustry(cust.industry);
    setFormPaymentTerms(cust.paymentTerms);
    setFormCreditLimit(cust.creditLimit);
    setFormOpeningBalance(cust.openingBalance);
    setFormNotes(cust.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Customer name is required.');
      return;
    }

    try {
      if (editingCustomer && editingCustomer.id) {
        await db.customers.update(editingCustomer.id, {
          name: formName,
          company: formCompany,
          contactPerson: formContact,
          phone: formPhone,
          whatsapp: formWhatsapp,
          email: formEmail,
          address: formAddress,
          industry: formIndustry,
          paymentTerms: formPaymentTerms,
          creditLimit: Number(formCreditLimit) || 0,
          notes: formNotes,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const count = await db.customers.count();
        const code = `CUST-${(count + 1).toString().padStart(3, '0')}`;
        await db.customers.add({
          code,
          name: formName,
          company: formCompany,
          contactPerson: formContact,
          phone: formPhone,
          whatsapp: formWhatsapp,
          email: formEmail,
          address: formAddress,
          industry: formIndustry,
          paymentTerms: formPaymentTerms,
          creditLimit: Number(formCreditLimit) || 0,
          openingBalance: Number(formOpeningBalance) || 0,
          currentBalance: Number(formOpeningBalance) || 0,
          notes: formNotes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setIsModalOpen(false);
      await loadCustomers();
    } catch (err) {
      alert('Failed to save customer: ' + err);
    }
  };

  const handleDeleteCustomer = async (id?: number) => {
    if (!id) return;
    const confirm = window.confirm('Are you sure you want to delete this customer record?');
    if (confirm) {
      await db.customers.delete(id);
      await loadCustomers();
      setSelectedCustomer(null);
    }
  };

  const handleGenerateStatementPDF = () => {
    if (!selectedCustomer) return;
    PDFGenerator.generateCustomerStatementPDF(selectedCustomer, customerInvoices, settings);
  };

  const handleShare = async () => {
    if (!selectedCustomer) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Account Statement: ${selectedCustomer.name}`,
          text: `Outstanding balance for ${selectedCustomer.name} at Puma Art Printers is Rs. ${selectedCustomer.currentBalance.toLocaleString()}.`,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      alert('Native sharing is not supported on this browser. Use the PDF download button instead.');
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-xs text-slate-500">Packaging clients, contact persons & ledger balances</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left List, Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Customer List Column */}
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No customers found. Click "+ Add Customer" to create one.
            </div>
          ) : (
            filtered.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {cust.code}
                        </span>
                        <h3 className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
                          {cust.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                        {cust.company || 'Direct Client'} • {cust.industry}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        Rs. {cust.currentBalance.toLocaleString()}
                      </div>
                      <span className={`text-[10px] font-semibold ${cust.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {cust.currentBalance > 0 ? 'Receivable' : 'Settled'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {cust.phone}
                    </span>
                    <span>Terms: {cust.paymentTerms}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Customer Detail Column */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedCustomer.code}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCustomer.company} • {selectedCustomer.address}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleGenerateStatementPDF}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer"
                    title="Download Statement PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Statement</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="Share account balance"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openEditModal(selectedCustomer)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Balance & Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Outstanding</span>
                  <div className="text-base font-black text-rose-700">
                    Rs. {selectedCustomer.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Credit Limit</span>
                  <div className="text-base font-black text-slate-900">
                    Rs. {selectedCustomer.creditLimit.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Contact Person</span>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {selectedCustomer.contactPerson || 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">WhatsApp</span>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {selectedCustomer.whatsapp || selectedCustomer.phone}
                  </div>
                </div>
              </div>

              {/* Transactions Tab Drilldown */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Customer Billing & Invoice History ({customerInvoices.length})
                </h4>

                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {customerInvoices.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">No invoices generated for this client yet.</div>
                  ) : (
                    customerInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                          <span className="text-[11px] text-slate-500">Date: {inv.date} • Due: {inv.dueDate}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-slate-900">Rs. {inv.grandTotal.toLocaleString()}</div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${inv.balanceDue > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {inv.balanceDue > 0 ? `Due: Rs. ${inv.balanceDue.toLocaleString()}` : 'Paid in full'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-2">
                  Payment History ({customerPayments.length})
                </h4>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {customerPayments.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">No payment receipts recorded yet.</div>
                  ) : (
                    customerPayments.map((pay) => (
                      <div key={pay.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-900">{pay.paymentNumber}</div>
                          <span className="text-[11px] text-slate-500">{pay.date} • Ref: {pay.referenceNumber || 'Cash'}</span>
                        </div>
                        <div className="font-black text-emerald-700">
                          + Rs. {pay.amount.toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a customer from the left to view profile, balance ledger, and generate account statements.
            </div>
          )}
        </div>
      </div>

      {/* Customer Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">
                {editingCustomer ? 'Edit Customer Record' : 'Register New Customer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Novartis Pharma Packaging"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Novartis Pakistan Ltd"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Industry Sector</label>
                  <select
                    value={formIndustry}
                    onChange={(e) => setFormIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="Pharmaceutical Packaging">Pharmaceutical Packaging</option>
                    <option value="Food & Bakery Packaging">Food & Bakery Packaging</option>
                    <option value="Cosmetics & Beauty">Cosmetics & Beauty</option>
                    <option value="Retail & Corrugated Cartons">Retail & Corrugated Cartons</option>
                    <option value="Commercial Offset Printing">Commercial Offset Printing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="orders@client.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Factory / Office Address (Lahore / Pakistan)</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Sundar Industrial Estate, Lahore"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="15 Days Net">15 Days Net</option>
                    <option value="30 Days Net">30 Days Net</option>
                    <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Credit Limit (PKR)</label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Opening Balance (PKR)</label>
                  <input
                    type="number"
                    disabled={!!editingCustomer}
                    value={formOpeningBalance}
                    onChange={(e) => setFormOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes / Packaging Specs</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special varnishing requirements, die archive numbers, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
