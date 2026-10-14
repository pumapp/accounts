import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  PackageCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Trash2,
  X,
} from 'lucide-react';
import { db } from '../../db';
import type { Purchase, PurchaseItem, CompanySettings, Supplier, InventoryItem } from '../../types';
import { AccountingEngine } from '../../services/accounting';

interface PurchasesViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ settings, initialAction }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [supplierBillNumber, setSupplierBillNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      itemId: 0,
      itemName: '',
      unit: 'sheets',
      quantity: 5000,
      unitPrice: 65,
      lineTotal: 325000,
      receivedQuantity: 5000, // received by default on booking
    },
  ]);
  const [autoReceiveStock, setAutoReceiveStock] = useState(true);

  useEffect(() => {
    loadData();
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    setDueDate(defaultDue.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    const pList = await db.purchases.toArray();
    const sList = await db.suppliers.toArray();
    const invList = await db.inventoryItems.toArray();

    setPurchases(pList.reverse());
    setSuppliers(sList);
    setInventoryItems(invList);

    if (sList.length > 0 && selectedSupplierId === 0) {
      setSelectedSupplierId(sList[0].id || 0);
    }
    if (invList.length > 0 && items[0].itemId === 0) {
      setItems([
        {
          itemId: invList[0].id!,
          itemName: invList[0].name,
          unit: invList[0].unit,
          quantity: 5000,
          unitPrice: invList[0].unitCost,
          lineTotal: 5000 * invList[0].unitCost,
          receivedQuantity: 5000,
        },
      ]);
    }
    if (pList.length > 0 && !selectedPurchase) {
      setSelectedPurchase(pList[0]);
    }
  };

  const handleItemSelect = (index: number, itemId: number) => {
    const it = inventoryItems.find((i) => i.id === itemId);
    if (!it) return;
    const updated = [...items];
    updated[index].itemId = it.id!;
    updated[index].itemName = it.name;
    updated[index].unit = it.unit;
    updated[index].unitPrice = it.unitCost;
    updated[index].lineTotal = updated[index].quantity * it.unitCost;
    setItems(updated);
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].quantity = qty;
    updated[index].receivedQuantity = qty;
    updated[index].lineTotal = Math.round(qty * updated[index].unitPrice * 100) / 100;
    setItems(updated);
  };

  const handleItemPriceChange = (index: number, price: number) => {
    const updated = [...items];
    updated[index].unitPrice = price;
    updated[index].lineTotal = Math.round(updated[index].quantity * price * 100) / 100;
    setItems(updated);
  };

  const addItemRow = () => {
    const first = inventoryItems[0];
    if (!first) return;
    setItems([
      ...items,
      {
        itemId: first.id!,
        itemName: first.name,
        unit: first.unit,
        quantity: 1000,
        unitPrice: first.unitCost,
        lineTotal: 1000 * first.unitCost,
        receivedQuantity: 1000,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((s, i) => s + (i.lineTotal || 0), 0);
  const grandTotal = subtotal;

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) {
      alert('Please select a supplier.');
      return;
    }

    try {
      const count = await db.purchases.count();
      const poNumber = `${settings.purchasePrefix}${(count + 1).toString().padStart(4, '0')}`;
      const todayStr = new Date().toISOString().split('T')[0];

      // Auto Double-Entry Accounting Posting:
      // Debit Inventory (1110 Raw Materials) -> Rs. grandTotal
      // Credit Accounts Payable (2010 Trade Creditors) -> Rs. grandTotal
      // IMPORTANT: Does NOT hit operating expenses! It enters inventory asset.
      const je = await AccountingEngine.postJournalEntry({
        date: todayStr,
        description: `Material Purchase Bill from ${sup.name} (${supplierBillNumber || poNumber})`,
        referenceType: 'purchase',
        debits: [{ accountCode: '1110', amount: grandTotal }],
        credits: [{ accountCode: '2010', amount: grandTotal }],
      });

      const newPurchase: Purchase = {
        poNumber,
        supplierBillNumber,
        supplierId: sup.id!,
        supplierName: sup.name,
        date: todayStr,
        dueDate,
        items,
        subtotal,
        taxAmount: 0,
        grandTotal,
        paidAmount: 0,
        balanceDue: grandTotal,
        status: autoReceiveStock ? 'received' : 'ordered',
        goodsReceivedDate: autoReceiveStock ? todayStr : undefined,
        journalEntryId: je.id,
        createdAt: new Date().toISOString(),
      };

      const purId = await db.purchases.add(newPurchase);

      // Increase Supplier's payable balance
      await db.suppliers.update(sup.id!, {
        currentBalance: sup.currentBalance + grandTotal,
        updatedAt: new Date().toISOString(),
      });

      // Update Inventory Quantities if received
      if (autoReceiveStock) {
        for (const item of items) {
          const inv = await db.inventoryItems.get(item.itemId);
          if (inv && inv.id) {
            const newStock = inv.currentStock + item.receivedQuantity;
            await db.inventoryItems.update(inv.id, {
              currentStock: newStock,
              unitCost: item.unitPrice, // update weighted cost
              totalValue: Math.round(newStock * item.unitPrice * 100) / 100,
              updatedAt: new Date().toISOString(),
            });

            // Traceable stock movement
            await db.stockMovements.add({
              movementNumber: `SM-26-${Date.now().toString().slice(-5)}`,
              date: todayStr,
              itemId: inv.id,
              itemName: inv.name,
              movementType: 'purchase_in',
              quantity: item.receivedQuantity,
              unitCost: item.unitPrice,
              totalCost: item.lineTotal,
              referenceType: 'purchase',
              referenceId: purId,
              notes: `Received via PO ${poNumber} from ${sup.name}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      setIsModalOpen(false);
      await loadData();
      setSelectedPurchase({ ...newPurchase, id: purId });
      alert(`Purchase Bill ${poNumber} recorded! Inventory updated & Accounts Payable posted.`);
    } catch (err) {
      alert('Failed to save purchase bill: ' + err);
    }
  };

  const filtered = purchases.filter(
    (p) =>
      p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplierBillNumber && p.supplierBillNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Paper & Material Purchases</h2>
          <p className="text-xs text-slate-500">Mill purchase orders, raw board delivery intake, supplier bills & payables</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO # or paper mill..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* Grid: Left List, Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No purchases recorded. Click "+ New Purchase" to record board/ink intake.
            </div>
          ) : (
            filtered.map((pur) => {
              const isSelected = selectedPurchase?.id === pur.id;
              return (
                <div
                  key={pur.id}
                  onClick={() => setSelectedPurchase(pur)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{pur.poNumber}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          {pur.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate max-w-[200px]">
                        {pur.supplierName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        Rs. {pur.grandTotal.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-amber-700 font-bold">
                        Payable: Rs. {pur.balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 truncate">
                    {pur.items.map((i) => `${i.itemName} (${i.quantity.toLocaleString()} ${i.unit})`).join(', ')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Purchase Detail */}
        <div className="lg:col-span-7">
          {selectedPurchase ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedPurchase.poNumber}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedPurchase.supplierName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order Date: {selectedPurchase.date} • Due Date: {selectedPurchase.dueDate}
                    {selectedPurchase.supplierBillNumber && ` • Supplier Bill: ${selectedPurchase.supplierBillNumber}`}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Raw Materials Received ({selectedPurchase.items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {selectedPurchase.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/50 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{item.itemName}</div>
                        <span className="text-[11px] text-slate-500">
                          {item.quantity.toLocaleString()} {item.unit} @ Rs. {item.unitPrice} / {item.unit}
                        </span>
                      </div>
                      <div className="font-black text-slate-900">
                        Rs. {item.lineTotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Accounting Note: </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Classified as Raw Materials Inventory (Acct 1110) & Trade Creditors (Acct 2010).
                  </p>
                </div>

                <div className="space-y-1 text-right sm:w-52">
                  <div className="flex justify-between text-slate-500">
                    <span>Bill Amount:</span>
                    <span>Rs. {selectedPurchase.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-rose-700 pt-1 border-t border-slate-200">
                    <span>Payable Balance:</span>
                    <span>Rs. {selectedPurchase.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a purchase order to view materials received and supplier invoice balance.
            </div>
          )}
        </div>
      </div>

      {/* Create Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Record Material Purchase & Goods Intake</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Paper Mill / Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Bill / Invoice #</label>
                  <input
                    type="text"
                    value={supplierBillNumber}
                    onChange={(e) => setSupplierBillNumber(e.target.value)}
                    placeholder="e.g. C-184920"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Materials Received</span>
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
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Inventory Item *</label>
                        <select
                          value={it.itemId}
                          onChange={(e) => handleItemSelect(idx, Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {inventoryItems.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quantity ({it.unit})</label>
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Unit Rate (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="autoReceive"
                  checked={autoReceiveStock}
                  onChange={(e) => setAutoReceiveStock(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoReceive" className="font-semibold text-slate-800">
                  Goods Received in Factory Warehouse (Immediately increments inventory stock count)
                </label>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-xs">Total Purchase Payable:</span>
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
                  Save Purchase Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
