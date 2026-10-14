import React, { useEffect, useState } from 'react';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  Receipt,
  Trash2,
  Edit2,
  X,
  CreditCard,
} from 'lucide-react';
import { db } from '../../db';
import type { Supplier, CompanySettings, Purchase } from '../../types';

interface SuppliersViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ settings, initialAction }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<Purchase[]>([]);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Credit 30 Days');
  const [formOpeningBalance, setFormOpeningBalance] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const list = await db.suppliers.toArray();
    setSuppliers(list);
    if (list.length > 0 && !selectedSupplier) {
      handleSelectSupplier(list[0]);
    }
  };

  const handleSelectSupplier = async (sup: Supplier) => {
    setSelectedSupplier(sup);
    if (sup.id) {
      const purs = await db.purchases.where('supplierId').equals(sup.id).toArray();
      setSupplierPurchases(purs);
    }
  };

  const openNewModal = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormCompany('');
    setFormContact('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormPaymentTerms('Credit 30 Days');
    setFormOpeningBalance(0);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormName(sup.name);
    setFormCompany(sup.company);
    setFormContact(sup.contactPerson);
    setFormPhone(sup.phone);
    setFormEmail(sup.email);
    setFormAddress(sup.address);
    setFormPaymentTerms(sup.paymentTerms);
    setFormOpeningBalance(sup.openingBalance);
    setFormNotes(sup.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Supplier name is required.');
      return;
    }

    try {
      if (editingSupplier && editingSupplier.id) {
        await db.suppliers.update(editingSupplier.id, {
          name: formName,
          company: formCompany,
          contactPerson: formContact,
          phone: formPhone,
          email: formEmail,
          address: formAddress,
          paymentTerms: formPaymentTerms,
          notes: formNotes,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const count = await db.suppliers.count();
        const code = `SUP-${(count + 1).toString().padStart(3, '0')}`;
        await db.suppliers.add({
          code,
          name: formName,
          company: formCompany,
          contactPerson: formContact,
          phone: formPhone,
          email: formEmail,
          address: formAddress,
          paymentTerms: formPaymentTerms,
          openingBalance: Number(formOpeningBalance) || 0,
          currentBalance: Number(formOpeningBalance) || 0,
          notes: formNotes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setIsModalOpen(false);
      await loadSuppliers();
    } catch (err) {
      alert('Failed to save supplier: ' + err);
    }
  };

  const handleDeleteSupplier = async (id?: number) => {
    if (!id) return;
    const confirm = window.confirm('Are you sure you want to delete this supplier?');
    if (confirm) {
      await db.suppliers.delete(id);
      await loadSuppliers();
      setSelectedSupplier(null);
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Suppliers & Mills</h2>
          <p className="text-xs text-slate-500">Paper board mills, ink importers, plate makers & chemical vendors</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by mill, name, code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left List, Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No suppliers found. Click "+ Add Supplier" to register one.
            </div>
          ) : (
            filtered.map((sup) => {
              const isSelected = selectedSupplier?.id === sup.id;
              return (
                <div
                  key={sup.id}
                  onClick={() => handleSelectSupplier(sup)}
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
                          {sup.code}
                        </span>
                        <h3 className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
                          {sup.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                        {sup.company || 'Mill / Vendor'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-rose-900">
                        Rs. {sup.currentBalance.toLocaleString()}
                      </div>
                      <span className="text-[10px] font-semibold text-rose-600">
                        Payable
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {sup.phone}
                    </span>
                    <span>Terms: {sup.paymentTerms}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Supplier Detail Column */}
        <div className="lg:col-span-7">
          {selectedSupplier ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedSupplier.code}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedSupplier.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedSupplier.company} • {selectedSupplier.address}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(selectedSupplier)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="Edit Supplier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(selectedSupplier.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title="Delete Supplier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <span className="text-[10px] text-rose-700 font-bold uppercase">Payable Balance</span>
                  <div className="text-base font-black text-rose-900">
                    Rs. {selectedSupplier.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Contact Person</span>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {selectedSupplier.contactPerson || 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Payment Terms</span>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {selectedSupplier.paymentTerms}
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Raw Material Purchase Bills ({supplierPurchases.length})
                </h4>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {supplierPurchases.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">No purchase bills recorded for this supplier yet.</div>
                  ) : (
                    supplierPurchases.map((pur) => (
                      <div key={pur.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-900">{pur.poNumber} {pur.supplierBillNumber ? `(Bill: ${pur.supplierBillNumber})` : ''}</div>
                          <span className="text-[11px] text-slate-500">Date: {pur.date} • Due: {pur.dueDate}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-slate-900">Rs. {pur.grandTotal.toLocaleString()}</div>
                          <span className="text-[10px] font-bold text-amber-700">Due: Rs. {pur.balanceDue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a supplier from the list to view payable balance and purchase orders.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">
                {editingSupplier ? 'Edit Supplier Record' : 'Register Paper Mill / Supplier'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier / Paper Mill Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Century Paper & Board Mills Ltd"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Mill Group</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Lakson Group"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="e.g. Hassan Raza"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+92 42 35870041"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sales@mill.com.pk"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Address / Lahore Depot</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Kot Lakhpat / Saggian Lahore"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Credit 15 Days">Credit 15 Days</option>
                    <option value="Credit 30 Days">Credit 30 Days</option>
                    <option value="Credit 45 Days">Credit 45 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Opening Payable Balance (PKR)</label>
                  <input
                    type="number"
                    disabled={!!editingSupplier}
                    value={formOpeningBalance}
                    onChange={(e) => setFormOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Board qualities supplied, bank account numbers, etc."
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
