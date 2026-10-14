import React, { useEffect, useState } from 'react';
import {
  SendHorizontal,
  Search,
  Plus,
  FileDown,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Truck,
} from 'lucide-react';
import { db } from '../../db';
import type { DeliveryChallan, DeliveryChallanItem, CompanySettings, SalesOrder } from '../../types';
import { PDFGenerator } from '../../services/pdf';

interface DeliveryChallansViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

export const DeliveryChallansView: React.FC<DeliveryChallansViewProps> = ({ settings, initialAction }) => {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [search, setSearch] = useState('');
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('LES-18-4592');
  const [driverName, setDriverName] = useState('Muhammad Akram');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [dispatchItems, setDispatchItems] = useState<DeliveryChallanItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const chList = await db.deliveryChallans.toArray();
    const ordList = await db.orders.toArray();
    setChallans(chList.reverse());
    setOrders(ordList);

    if (ordList.length > 0 && selectedOrderId === 0) {
      handleOrderSelect(ordList[0].id!);
    }
    if (chList.length > 0 && !selectedChallan) {
      setSelectedChallan(chList[0]);
    }
  };

  const handleOrderSelect = (orderId: number) => {
    setSelectedOrderId(orderId);
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    setDeliveryAddress('Customer Factory / Warehouse');
    const items: DeliveryChallanItem[] = ord.items.map((it) => {
      const prev = it.deliveredQty || 0;
      const remaining = Math.max(0, it.quantity - prev);
      return {
        productName: it.productName,
        orderedQty: it.quantity,
        previouslyDeliveredQty: prev,
        dispatchQty: remaining,
        remainingQty: 0,
      };
    });
    setDispatchItems(items);
  };

  const handleDispatchQtyChange = (idx: number, qty: number) => {
    const updated = [...dispatchItems];
    const prev = updated[idx].previouslyDeliveredQty;
    const ordered = updated[idx].orderedQty;
    const safeQty = Math.max(0, Math.min(qty, ordered - prev)); // prevent duplicate over-dispatch
    updated[idx].dispatchQty = safeQty;
    updated[idx].remainingQty = Math.max(0, ordered - (prev + safeQty));
    setDispatchItems(updated);
  };

  const handleSaveChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    const ord = orders.find((o) => o.id === selectedOrderId);
    if (!ord) {
      alert('Please select an order to dispatch against.');
      return;
    }

    try {
      const count = await db.deliveryChallans.count();
      const challanNumber = `${settings.challanPrefix}${(count + 1).toString().padStart(4, '0')}`;
      const todayStr = new Date().toISOString().split('T')[0];

      const newChallan: DeliveryChallan = {
        challanNumber,
        orderId: ord.id!,
        orderNumber: ord.orderNumber,
        customerId: ord.customerId,
        customerName: ord.customerName,
        date: todayStr,
        items: dispatchItems,
        deliveryAddress,
        vehicleNumber,
        driverName,
        receiverName,
        receiverPhone,
        acknowledged: false,
        notes,
        createdAt: new Date().toISOString(),
      };

      const chId = await db.deliveryChallans.add(newChallan);

      // Update delivered quantities on the order
      const updatedOrderItems = ord.items.map((item, idx) => {
        const match = dispatchItems.find((di) => di.productName === item.productName);
        const addedQty = match ? match.dispatchQty : 0;
        const totalDelivered = (item.deliveredQty || 0) + addedQty;
        return {
          ...item,
          deliveredQty: totalDelivered,
        };
      });

      const allDelivered = updatedOrderItems.every((it) => (it.deliveredQty || 0) >= it.quantity);

      await db.orders.update(ord.id!, {
        items: updatedOrderItems,
        deliveryStatus: allDelivered ? 'delivered' : 'partial',
      });

      setIsModalOpen(false);
      await loadData();
      setSelectedChallan({ ...newChallan, id: chId });
      alert(`Delivery Challan ${challanNumber} issued! Quantities updated without duplicate invoicing.`);
    } catch (err) {
      alert('Failed to save challan: ' + err);
    }
  };

  const handleAcknowledgeChallan = async (ch: DeliveryChallan) => {
    if (!ch.id) return;
    const name = window.prompt('Enter receiver name / stamp acknowledgment:', ch.receiverName || 'Client Store Officer');
    if (!name) return;

    await db.deliveryChallans.update(ch.id, {
      acknowledged: true,
      receiverName: name,
    });
    await loadData();
  };

  const filtered = challans.filter(
    (c) =>
      c.challanNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Delivery Challans & Dispatches</h2>
          <p className="text-xs text-slate-500">Material dispatch passes, partial delivery tracking, driver info & good-order receipts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challan #, client, order..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Challan</span>
          </button>
        </div>
      </div>

      {/* Grid: Left List, Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No delivery challans issued. Click "+ New Challan" to dispatch packaging.
            </div>
          ) : (
            filtered.map((ch) => {
              const isSelected = selectedChallan?.id === ch.id;
              const totalDispatched = ch.items.reduce((s, i) => s + i.dispatchQty, 0);

              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChallan(ch)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{ch.challanNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            ch.acknowledged ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ch.acknowledged ? 'ACKNOWLEDGED' : 'IN TRANSIT'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate max-w-[200px]">
                        {ch.customerName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        {totalDispatched.toLocaleString()} pcs
                      </div>
                      <span className="text-[10px] text-slate-400">Order: {ch.orderNumber}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Date: {ch.date}</span>
                    <span>Vehicle: {ch.vehicleNumber}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Challan Full Detail */}
        <div className="lg:col-span-7">
          {selectedChallan ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedChallan.challanNumber}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedChallan.customerName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order Ref: {selectedChallan.orderNumber} • Date: {selectedChallan.date} • Vehicle: {selectedChallan.vehicleNumber}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!selectedChallan.acknowledged && (
                    <button
                      onClick={() => handleAcknowledgeChallan(selectedChallan)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Receipt</span>
                    </button>
                  )}

                  <button
                    onClick={() => PDFGenerator.generateDeliveryChallanPDF(selectedChallan, settings)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
                    title="Download Official PDF Delivery Challan"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Dispatched Products
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {selectedChallan.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{item.productName}</span>
                        <span className="text-blue-700 text-sm">{item.dispatchQty.toLocaleString()} pcs Dispatched</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1">
                        <div>Ordered Qty: {item.orderedQty.toLocaleString()} pcs</div>
                        <div>Prev Delivered: {item.previouslyDeliveredQty.toLocaleString()} pcs</div>
                        <div>Balance Left: {item.remainingQty.toLocaleString()} pcs</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver & Consignee Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold text-slate-700">Driver & Van: </span>
                    <span className="text-slate-600">{selectedChallan.driverName} ({selectedChallan.vehicleNumber})</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Delivery Address: </span>
                    <span className="text-slate-600">{selectedChallan.deliveryAddress}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                  <span>
                    <strong>Receiver: </strong>
                    {selectedChallan.receiverName || 'Pending acknowledgment'}
                  </span>
                  <span className="text-slate-400">
                    Rule: Delivery Challan generates zero duplicate invoice entries.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a delivery challan to view items, receiver acknowledgment and print PDF pass.
            </div>
          )}
        </div>
      </div>

      {/* Create Challan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Issue Delivery Challan</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChallan} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Sales Order *</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.customerName} ({o.deliveryStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Muhammad Akram"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Vehicle / Truck Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. LES-18-4592"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Delivery Destination Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Plot 42 Sundar Industrial Estate, Lahore"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              {/* Items dispatch breakdown */}
              <div className="space-y-3 pt-2">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Dispatch Quantities (Prevents Over-Dispatch Duplicates)
                </span>
                {dispatchItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400">Total Ordered</span>
                        <div className="font-semibold text-slate-700">{item.orderedQty.toLocaleString()} pcs</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Already Delivered</span>
                        <div className="font-semibold text-slate-700">{item.previouslyDeliveredQty.toLocaleString()} pcs</div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 mb-0.5">Dispatch Now (pcs) *</label>
                        <input
                          type="number"
                          value={item.dispatchQty}
                          onChange={(e) => handleDispatchQtyChange(idx, Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg border border-blue-300 bg-white font-black text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                  Issue Delivery Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
