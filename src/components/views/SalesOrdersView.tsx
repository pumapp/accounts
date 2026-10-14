import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Factory,
  Receipt,
  SendHorizontal,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  X,
} from 'lucide-react';
import { db } from '../../db';
import type { SalesOrder, CompanySettings, Customer, NavigationTab } from '../../types';

interface SalesOrdersViewProps {
  settings: CompanySettings;
  initialAction?: string;
  onNavigate: (tab: NavigationTab, action?: string) => void;
}

export const SalesOrdersView: React.FC<SalesOrdersViewProps> = ({
  settings,
  initialAction,
  onNavigate,
}) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [advanceReceived, setAdvanceReceived] = useState<number>(0);
  const [productName, setProductName] = useState('');
  const [dimensions, setDimensions] = useState('4.5 x 2.25 x 2.25 in');
  const [paperBoardSpec, setPaperBoardSpec] = useState('350 GSM Bleached Board');
  const [gsm, setGsm] = useState<number>(350);
  const [quantity, setQuantity] = useState<number>(10000);
  const [unitPrice, setUnitPrice] = useState<number>(12);
  const [finishing, setFinishing] = useState('Matte Lamination + Die Cutting + Pasting');
  const [printing, setPrinting] = useState('4 Color Offset CMYK');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 12);
    setDeliveryDate(targetDate.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    const ordList = await db.orders.toArray();
    const custList = await db.customers.toArray();
    setOrders(ordList.reverse());
    setCustomers(custList);
    if (custList.length > 0 && selectedCustomerId === 0) {
      setSelectedCustomerId(custList[0].id || 0);
    }
    if (ordList.length > 0 && !selectedOrder) {
      setSelectedOrder(ordList[0]);
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === Number(selectedCustomerId));
    if (!cust) {
      alert('Please select a customer.');
      return;
    }
    if (!productName.trim()) {
      alert('Product name is required.');
      return;
    }

    try {
      const count = await db.orders.count();
      const orderNumber = `${settings.orderPrefix}${(count + 1).toString().padStart(4, '0')}`;
      const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
      const totalAmount = lineTotal;
      const adv = Number(advanceReceived) || 0;
      const balanceDue = Math.max(0, totalAmount - adv);

      const newOrder: SalesOrder = {
        orderNumber,
        customerId: cust.id!,
        customerName: cust.name,
        date: new Date().toISOString().split('T')[0],
        deliveryDate,
        items: [
          {
            productName,
            dimensions,
            paperBoardSpec,
            gsm: Number(gsm),
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
            lineTotal,
            finishingRequirements: finishing,
            printingRequirements: printing,
            deliveredQty: 0,
            invoicedQty: 0,
          },
        ],
        subtotal: totalAmount,
        discount: 0,
        deliveryCharges: 0,
        taxAmount: 0,
        totalAmount,
        advanceReceived: adv,
        balanceDue,
        productionStatus: 'pending',
        paymentStatus: adv >= totalAmount ? 'paid' : adv > 0 ? 'partial' : 'unpaid',
        deliveryStatus: 'pending',
        notes,
        createdAt: new Date().toISOString(),
      };

      const orderId = await db.orders.add(newOrder);

      // Automatically launch Production Job Card for this order!
      const jobCount = await db.productionJobs.count();
      const jobCardNumber = `JC-26-${(jobCount + 101).toString()}`;
      await db.productionJobs.add({
        jobCardNumber,
        orderId,
        orderNumber,
        customerId: cust.id!,
        customerName: cust.name,
        productName,
        targetQuantity: Number(quantity),
        producedQuantity: 0,
        rejectedQuantity: 0,
        wastageQuantity: 0,
        currentStage: 'Order Confirmed',
        stagesCompleted: [
          {
            stage: 'Order Confirmed',
            completedAt: new Date().toISOString(),
            completedBy: 'Order Booking Desk',
            notes: 'Order confirmed and job card queued for artwork verification.',
          },
        ],
        estimatedCost: Math.round(totalAmount * 0.55),
        actualCost: 0,
        startDate: new Date().toISOString().split('T')[0],
        targetCompletionDate: deliveryDate,
        responsiblePerson: 'Press Supervisor',
        priority: 'normal',
        status: 'scheduled',
        notes: `Packaging spec: ${paperBoardSpec} (${gsm} GSM). ${finishing}`,
        createdAt: new Date().toISOString(),
      });

      setIsModalOpen(false);
      await loadData();
      setSelectedOrder({ ...newOrder, id: orderId });
      alert(`Sales Order ${orderNumber} created! Production Job Card ${jobCardNumber} queued automatically.`);
    } catch (err) {
      alert('Failed to save order: ' + err);
    }
  };

  const handleCreateInvoiceForOrder = async (order: SalesOrder) => {
    if (!order.id) return;
    try {
      const invCount = await db.invoices.count();
      const invoiceNumber = `${settings.invoicePrefix}${(invCount + 1).toString().padStart(4, '0')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const newInv = {
        invoiceNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        date: new Date().toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        taxRate: 0,
        taxAmount: order.taxAmount,
        grandTotal: order.totalAmount,
        paidAmount: order.advanceReceived,
        balanceDue: order.balanceDue,
        status: order.balanceDue <= 0 ? ('paid' as const) : order.advanceReceived > 0 ? ('partial' as const) : ('issued' as const),
        notes: `Generated against Sales Order ${order.orderNumber}`,
        createdAt: new Date().toISOString(),
      };

      await db.invoices.add(newInv);
      alert(`Invoice ${invoiceNumber} generated! Head over to Invoices tab to view or export PDF.`);
      onNavigate('invoices');
    } catch (err) {
      alert('Failed to generate invoice: ' + err);
    }
  };

  const handleCreateChallanForOrder = async (order: SalesOrder) => {
    if (!order.id) return;
    try {
      const chCount = await db.deliveryChallans.count();
      const challanNumber = `${settings.challanPrefix}${(chCount + 1).toString().padStart(4, '0')}`;

      const newChallan = {
        challanNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        date: new Date().toISOString().split('T')[0],
        items: order.items.map((i) => {
          const prev = i.deliveredQty || 0;
          const remaining = Math.max(0, i.quantity - prev);
          return {
            productName: i.productName,
            orderedQty: i.quantity,
            previouslyDeliveredQty: prev,
            dispatchQty: remaining,
            remainingQty: 0,
          };
        }),
        deliveryAddress: 'Client Warehouse / Site',
        vehicleNumber: 'LES-Factory Van',
        driverName: 'Muhammad Akram',
        acknowledged: false,
        notes: `Delivery against Order ${order.orderNumber}`,
        createdAt: new Date().toISOString(),
      };

      await db.deliveryChallans.add(newChallan);

      // Update delivered quantities on order
      const updatedItems = order.items.map((i) => ({
        ...i,
        deliveredQty: i.quantity,
      }));
      await db.orders.update(order.id, {
        items: updatedItems,
        deliveryStatus: 'delivered',
      });

      alert(`Delivery Challan ${challanNumber} created!`);
      onNavigate('delivery_challans');
    } catch (err) {
      alert('Failed to create challan: ' + err);
    }
  };

  const handleDeleteOrder = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this sales order? Associated jobs will remain.')) {
      await db.orders.delete(id);
      await loadData();
      setSelectedOrder(null);
    }
  };

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Sales Orders</h2>
          <p className="text-xs text-slate-500">Confirmed packaging bookings, delivery schedules and job dispatch tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order # or customer..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Grid: Left List, Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No sales orders found. Create one or convert an approved quotation.
            </div>
          ) : (
            filtered.map((ord) => {
              const isSelected = selectedOrder?.id === ord.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{ord.orderNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            ord.productionStatus === 'completed' || ord.productionStatus === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.productionStatus === 'in_production'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ord.productionStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate max-w-[200px]">
                        {ord.customerName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        Rs. {ord.totalAmount.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">Delivery: {ord.deliveryDate}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 truncate">
                    {ord.items.map((i) => `${i.productName} (${i.quantity.toLocaleString()} pcs)`).join(', ')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Order Full Detail */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedOrder.orderNumber}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedOrder.customerName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order Date: {selectedOrder.date} • Delivery Due: {selectedOrder.deliveryDate}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCreateInvoiceForOrder(selectedOrder)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                    title="Generate Invoice from this order"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Create Invoice</span>
                  </button>

                  <button
                    onClick={() => handleCreateChallanForOrder(selectedOrder)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                    title="Generate Delivery Challan"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Dispatch Challan</span>
                  </button>

                  <button
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                    title="Delete Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Production Status</span>
                  <div className="font-bold text-slate-900 mt-0.5 capitalize">
                    {selectedOrder.productionStatus.replace('_', ' ')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Payment Status</span>
                  <div className="font-bold text-slate-900 mt-0.5 capitalize">
                    {selectedOrder.paymentStatus}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Delivery Status</span>
                  <div className="font-bold text-slate-900 mt-0.5 capitalize">
                    {selectedOrder.deliveryStatus}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ordered Products ({selectedOrder.items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {selectedOrder.items.map((item, idx) => (
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
                          <span className="text-slate-400">Ordered Qty: </span>
                          <span className="font-medium text-slate-700">{item.quantity.toLocaleString()} pcs</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Unit Rate: </span>
                          <span className="font-medium text-slate-700">Rs. {item.unitPrice}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  {selectedOrder.notes && (
                    <p className="text-[11px] text-slate-500">
                      Notes: {selectedOrder.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-right sm:w-52">
                  <div className="flex justify-between text-slate-500">
                    <span>Order Total:</span>
                    <span>Rs. {selectedOrder.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Advance Received:</span>
                    <span>Rs. {selectedOrder.advanceReceived.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-rose-700 pt-1 border-t border-slate-200">
                    <span>Balance Due:</span>
                    <span>Rs. {selectedOrder.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a sales order from the left to view specs, generate invoice or dispatch delivery challan.
            </div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Book Confirmed Sales Order</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
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
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Delivery Target Date *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Packaging Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Pharmaceutical Syrup Unit Carton"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Dimensions (L x W x H)</label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 4.5 x 2.25 x 2.25 inches"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Paper / Board Spec</label>
                  <input
                    type="text"
                    value={paperBoardSpec}
                    onChange={(e) => setPaperBoardSpec(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">GSM</label>
                  <input
                    type="number"
                    value={gsm}
                    onChange={(e) => setGsm(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quantity (pcs)</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Unit Price (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Printing Requirements</label>
                  <input
                    type="text"
                    value={printing}
                    onChange={(e) => setPrinting(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Finishing Requirements</label>
                  <input
                    type="text"
                    value={finishing}
                    onChange={(e) => setFinishing(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Advance Received (PKR)</label>
                  <input
                    type="number"
                    value={advanceReceived}
                    onChange={(e) => setAdvanceReceived(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Order Notes / Production Instructions</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Machine speed, special packing, etc."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-xs">Total Order Value:</span>
                <span className="text-base font-black text-sky-400">Rs. {(quantity * unitPrice).toLocaleString()}</span>
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
                  Book Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
