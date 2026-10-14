import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  FileDown,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  X,
  Share2,
} from 'lucide-react';
import { db } from '../../db';
import type { Quotation, QuotationItem, CompanySettings, Customer, NavigationTab } from '../../types';
import { PDFGenerator } from '../../services/pdf';

interface QuotationsViewProps {
  settings: CompanySettings;
  initialAction?: string;
  onNavigateToOrder?: (orderId: number) => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  settings,
  initialAction,
  onNavigateToOrder,
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [validUntil, setValidUntil] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('50% Advance, 50% on Delivery');
  const [items, setItems] = useState<QuotationItem[]>([
    {
      productName: '',
      dimensions: '8 x 4 x 2 inches',
      paperBoardSpec: '350 GSM Bleached Board',
      gsm: 350,
      quantity: 10000,
      unitPrice: 12.5,
      lineTotal: 125000,
      finishingRequirements: 'Matte Lamination + Spot UV + Die Cutting',
      printingRequirements: '4 Color Offset CMYK',
    },
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
    const defaultValid = new Date();
    defaultValid.setDate(defaultValid.getDate() + 15);
    setValidUntil(defaultValid.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    const qList = await db.quotations.toArray();
    const cList = await db.customers.toArray();
    setQuotations(qList.reverse());
    setCustomers(cList);
    if (cList.length > 0 && selectedCustomerId === 0) {
      setSelectedCustomerId(cList[0].id || 0);
    }
    if (qList.length > 0 && !selectedQuotation) {
      setSelectedQuotation(qList[0]);
    }
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : updated[index].quantity;
      const p = field === 'unitPrice' ? Number(value) : updated[index].unitPrice;
      updated[index].lineTotal = Math.round(q * p * 100) / 100;
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productName: '',
        dimensions: '6 x 3 x 2 inches',
        paperBoardSpec: '300 GSM Duplex Board',
        gsm: 300,
        quantity: 5000,
        unitPrice: 8.5,
        lineTotal: 42500,
        finishingRequirements: 'Gloss Varnish + Die Cutting',
        printingRequirements: '4 Color Offset CMYK',
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const taxAmount = Math.round(((subtotal - discount) * (taxRate / 100)) * 100) / 100;
  const grandTotal = Math.max(0, subtotal - discount + deliveryCharges + taxAmount);

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === Number(selectedCustomerId));
    if (!cust) {
      alert('Please select a customer.');
      return;
    }
    if (items.some((i) => !i.productName.trim())) {
      alert('Please provide product names for all quotation items.');
      return;
    }

    try {
      const count = await db.quotations.count();
      const quotationNumber = `${settings.quotationPrefix}${(count + 1).toString().padStart(4, '0')}`;
      const newQuote: Quotation = {
        quotationNumber,
        customerId: cust.id!,
        customerName: cust.name,
        date: new Date().toISOString().split('T')[0],
        validUntil,
        items,
        subtotal,
        discount: Number(discount) || 0,
        deliveryCharges: Number(deliveryCharges) || 0,
        taxRate: Number(taxRate) || 0,
        taxAmount,
        grandTotal,
        paymentTerms,
        status: 'draft',
        notes,
        createdAt: new Date().toISOString(),
      };

      const id = await db.quotations.add(newQuote);
      setIsModalOpen(false);
      await loadData();
      setSelectedQuotation({ ...newQuote, id });
    } catch (err) {
      alert('Failed to save quotation: ' + err);
    }
  };

  const handleConvertToOrder = async (quote: Quotation) => {
    if (!quote.id) return;
    const confirm = window.confirm(
      `Convert quotation ${quote.quotationNumber} into a confirmed Sales Order? All specifications, GSM, quantities and prices will be transferred without re-typing.`
    );
    if (!confirm) return;

    try {
      const orderCount = await db.orders.count();
      const orderNumber = `${settings.orderPrefix}${(orderCount + 1).toString().padStart(4, '0')}`;
      const deliveryTarget = new Date();
      deliveryTarget.setDate(deliveryTarget.getDate() + 10);

      const newOrder = {
        orderNumber,
        quotationId: quote.id,
        customerId: quote.customerId,
        customerName: quote.customerName,
        date: new Date().toISOString().split('T')[0],
        deliveryDate: deliveryTarget.toISOString().split('T')[0],
        items: quote.items.map((it) => ({
          ...it,
          deliveredQty: 0,
          invoicedQty: 0,
        })),
        subtotal: quote.subtotal,
        discount: quote.discount,
        deliveryCharges: quote.deliveryCharges,
        taxAmount: quote.taxAmount,
        totalAmount: quote.grandTotal,
        advanceReceived: 0,
        balanceDue: quote.grandTotal,
        productionStatus: 'pending' as const,
        paymentStatus: 'unpaid' as const,
        deliveryStatus: 'pending' as const,
        notes: `Converted from Quotation ${quote.quotationNumber}. ${quote.notes || ''}`,
        createdAt: new Date().toISOString(),
      };

      const orderId = await db.orders.add(newOrder);

      // Update quote status
      await db.quotations.update(quote.id, {
        status: 'converted',
        convertedOrderId: orderId,
      });

      await loadData();
      alert(`Success! Quotation converted to Sales Order ${orderNumber}.`);
      if (onNavigateToOrder) {
        onNavigateToOrder(orderId);
      }
    } catch (err) {
      alert('Failed to convert quotation: ' + err);
    }
  };

  const handleDeleteQuotation = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this quotation?')) {
      await db.quotations.delete(id);
      await loadData();
      setSelectedQuotation(null);
    }
  };

  const filtered = quotations.filter(
    (q) =>
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Quotations & Estimations</h2>
          <p className="text-xs text-slate-500">Packaging rates, paper GSM, finishing options and 1-click order conversion</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotation # or client..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Grid: List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No quotations recorded. Click "+ New Quotation" to estimate a job.
            </div>
          ) : (
            filtered.map((quote) => {
              const isSelected = selectedQuotation?.id === quote.id;
              return (
                <div
                  key={quote.id}
                  onClick={() => setSelectedQuotation(quote)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{quote.quotationNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            quote.status === 'converted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : quote.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {quote.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate max-w-[200px]">
                        {quote.customerName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        Rs. {quote.grandTotal.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">Valid: {quote.validUntil}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 truncate">
                    {quote.items.map((i) => `${i.productName} (${i.quantity.toLocaleString()} pcs)`).join(', ')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Quotation Full Detail */}
        <div className="lg:col-span-7">
          {selectedQuotation ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedQuotation.quotationNumber}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedQuotation.customerName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quoted Date: {selectedQuotation.date} • Valid Until: {selectedQuotation.validUntil}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedQuotation.status !== 'converted' ? (
                    <button
                      onClick={() => handleConvertToOrder(selectedQuotation)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <span>Convert to Order</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      ✓ Converted
                    </span>
                  )}

                  <button
                    onClick={() => PDFGenerator.generateQuotationPDF(selectedQuotation, settings)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
                    title="Download Quotation PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteQuotation(selectedQuotation.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title="Delete Quotation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Printing & Packaging Specifications ({selectedQuotation.items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {selectedQuotation.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{item.productName}</span>
                        <span className="font-black text-slate-900">
                          Rs. {item.lineTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500">
                        <div>
                          <span className="text-slate-400">Dimensions: </span>
                          <span className="font-medium text-slate-700">{item.dimensions}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Material: </span>
                          <span className="font-medium text-slate-700">{item.paperBoardSpec} ({item.gsm} GSM)</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Quantity: </span>
                          <span className="font-medium text-slate-700">{item.quantity.toLocaleString()} pcs</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Unit Price: </span>
                          <span className="font-medium text-slate-700">Rs. {item.unitPrice}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 pt-1">
                        <span className="text-slate-400">Finishing: </span>
                        <span>{item.finishingRequirements}</span> • <span className="text-slate-400">Printing: </span>
                        <span>{item.printingRequirements}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Payment Terms: </span>
                  <span className="text-slate-600">{selectedQuotation.paymentTerms}</span>
                  {selectedQuotation.notes && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Notes: {selectedQuotation.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-right sm:w-48">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>Rs. {selectedQuotation.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedQuotation.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>- Rs. {selectedQuotation.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>Rs. {selectedQuotation.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a quotation to view specifications, export PDF, or convert to a confirmed sales order.
            </div>
          )}
        </div>
      </div>

      {/* Create Quotation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">New Packaging Quotation</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Client *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company || 'Client'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Valid Until Date</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Packaging Items</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Product Name *</label>
                        <input
                          type="text"
                          required
                          value={it.productName}
                          onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                          placeholder="e.g. Cough Syrup 120ml Carton"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Dimensions (Inches / mm)</label>
                        <input
                          type="text"
                          value={it.dimensions}
                          onChange={(e) => handleItemChange(idx, 'dimensions', e.target.value)}
                          placeholder="e.g. 4.5 x 2.25 x 2.25 inches"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Material Spec</label>
                        <input
                          type="text"
                          value={it.paperBoardSpec}
                          onChange={(e) => handleItemChange(idx, 'paperBoardSpec', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">GSM</label>
                        <input
                          type="number"
                          value={it.gsm}
                          onChange={(e) => handleItemChange(idx, 'gsm', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quantity</label>
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Unit Price (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Printing Process</label>
                        <input
                          type="text"
                          value={it.printingRequirements}
                          onChange={(e) => handleItemChange(idx, 'printingRequirements', e.target.value)}
                          placeholder="e.g. 4 Color Offset CMYK"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Finishing (Lamination, Die, Foil)</label>
                        <input
                          type="text"
                          value={it.finishingRequirements}
                          onChange={(e) => handleItemChange(idx, 'finishingRequirements', e.target.value)}
                          placeholder="e.g. Matte Lamination + Spot UV + Pasting"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Row */}
              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-xs">Estimated Grand Total:</span>
                <span className="text-base font-black text-sky-400">Rs. {grandTotal.toLocaleString()}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
