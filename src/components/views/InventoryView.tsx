import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  History,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  X,
  Package,
} from 'lucide-react';
import { db } from '../../db';
import type { InventoryItem, StockMovement, CompanySettings, InventoryCategory, InventoryUnit } from '../../types';

interface InventoryViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  board: 'Bleached & Duplex Board',
  paper: 'Offset & Art Paper',
  ink: 'Printing Inks & Varnishes',
  plates: 'CTP Aluminum Plates',
  dies: 'Cutting & Creasing Dies',
  adhesives: 'Glues & Adhesives',
  uv_consumables: 'UV Coatings & Foil',
  packaging_material: 'Cartons & Strapping',
  finished_goods: 'Finished Packaging',
  other: 'Sundry Materials',
};

export const InventoryView: React.FC<InventoryViewProps> = ({ settings, initialAction }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(null);

  // New Item Form
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<InventoryCategory>('board');
  const [formUnit, setFormUnit] = useState<InventoryUnit>('sheets');
  const [formGsm, setFormGsm] = useState<number>(350);
  const [formDimensions, setFormDimensions] = useState('28 x 40 inches');
  const [formOrigin, setFormOrigin] = useState('Century Mills');
  const [formStock, setFormStock] = useState<number>(1000);
  const [formUnitCost, setFormUnitCost] = useState<number>(65);
  const [formReorder, setFormReorder] = useState<number>(200);
  const [formLocation, setFormLocation] = useState('Warehouse Bay 1');
  const [formNotes, setFormNotes] = useState('');

  // Stock Movement Form
  const [movementType, setMovementType] = useState<'production_issue' | 'purchase_in' | 'wastage' | 'adjustment'>('production_issue');
  const [movementQty, setMovementQty] = useState<number>(0);
  const [movementNotes, setMovementNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await db.inventoryItems.toArray();
    const movList = await db.stockMovements.toArray();
    setItems(list);
    setMovements(movList.reverse().slice(0, 30));
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Material name is required.');
      return;
    }

    try {
      const count = await db.inventoryItems.count();
      const itemCode = `MAT-${(count + 1).toString().padStart(4, '0')}`;
      const stock = Number(formStock) || 0;
      const cost = Number(formUnitCost) || 0;
      const totalVal = Math.round(stock * cost * 100) / 100;

      const id = await db.inventoryItems.add({
        itemCode,
        name: formName,
        category: formCategory,
        unit: formUnit,
        gsm: Number(formGsm) || undefined,
        dimensions: formDimensions,
        brandOrOrigin: formOrigin,
        openingStock: stock,
        currentStock: stock,
        unitCost: cost,
        totalValue: totalVal,
        reorderLevel: Number(formReorder) || 0,
        location: formLocation,
        notes: formNotes,
        updatedAt: new Date().toISOString(),
      });

      // Record opening movement
      if (stock > 0) {
        await db.stockMovements.add({
          movementNumber: `SM-26-${Date.now().toString().slice(-5)}`,
          date: new Date().toISOString().split('T')[0],
          itemId: id,
          itemName: formName,
          movementType: 'opening',
          quantity: stock,
          unitCost: cost,
          totalCost: totalVal,
          referenceType: 'manual',
          notes: 'Initial opening stock',
          createdAt: new Date().toISOString(),
        });
      }

      setIsModalOpen(false);
      await loadData();
      alert(`Inventory material ${formName} (${itemCode}) added!`);
    } catch (err) {
      alert('Failed to save material: ' + err);
    }
  };

  const handleOpenMovementModal = (item: InventoryItem) => {
    setSelectedItemForMovement(item);
    setMovementQty(0);
    setMovementNotes('');
    setIsMovementModalOpen(true);
  };

  const handleRecordStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForMovement || !selectedItemForMovement.id) return;
    const qty = Number(movementQty);
    if (!qty || qty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    const item = selectedItemForMovement;
    let newStock = item.currentStock;

    if (movementType === 'production_issue' || movementType === 'wastage') {
      if (qty > item.currentStock) {
        alert(`Cannot issue ${qty} ${item.unit}. Only ${item.currentStock} ${item.unit} available in warehouse.`);
        return;
      }
      newStock -= qty;
    } else {
      newStock += qty;
    }

    try {
      const count = await db.stockMovements.count();
      const movementNumber = `SM-26-${(count + 1).toString().padStart(5, '0')}`;
      const totalCost = Math.round(qty * item.unitCost * 100) / 100;

      await db.stockMovements.add({
        movementNumber,
        date: new Date().toISOString().split('T')[0],
        itemId: item.id!,
        itemName: item.name,
        movementType,
        quantity: qty,
        unitCost: item.unitCost,
        totalCost,
        referenceType: 'manual',
        notes: movementNotes || `Stock update: ${movementType.replace('_', ' ')}`,
        createdAt: new Date().toISOString(),
      });

      // Update item in inventory
      await db.inventoryItems.update(item.id!, {
        currentStock: newStock,
        totalValue: Math.round(newStock * item.unitCost * 100) / 100,
        updatedAt: new Date().toISOString(),
      });

      setIsMovementModalOpen(false);
      await loadData();
      alert(`Stock movement recorded! New stock for ${item.name}: ${newStock} ${item.unit}`);
    } catch (err) {
      alert('Failed to update stock: ' + err);
    }
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      (item.dimensions && item.dimensions.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalInventoryValuation = items.reduce((s, i) => s + i.totalValue, 0);
  const lowStockItems = items.filter((i) => i.currentStock <= i.reorderLevel);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Raw Materials & Inventory</h2>
          <p className="text-xs text-slate-500">Board sheets, offset paper, inks, CTP plates, dies and adhesives</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* Valuation & Low Stock Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Materials</span>
            <div className="text-xl font-black text-slate-900">{items.length} SKUs</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Inventory Valuation</span>
            <div className="text-xl font-black text-emerald-800">
              Rs. {totalInventoryValuation.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between ${
          lowStockItems.length > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-slate-200/90'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-800">Reorder Warnings</span>
            <div className="text-xl font-black text-amber-950">
              {lowStockItems.length} Low Stock
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by material code, name, size..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <option key={cat} value={cat}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Material Stock Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const isLowStock = item.currentStock <= item.reorderLevel;
          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition bg-white space-y-3 ${
                isLowStock ? 'border-amber-300 shadow-amber-50/50 shadow-md' : 'border-slate-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.itemCode}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 mt-1 leading-snug">
                    {item.name}
                  </h3>
                </div>

                {isLowStock && (
                  <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                    Reorder
                  </span>
                )}
              </div>

              {/* Specs & Dimensions */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                {item.dimensions && (
                  <div>
                    <span className="text-slate-400">Dimensions: </span>
                    <span className="font-semibold text-slate-800">{item.dimensions}</span>
                  </div>
                )}
                {item.gsm && (
                  <div>
                    <span className="text-slate-400">GSM: </span>
                    <span className="font-semibold text-slate-800">{item.gsm} GSM</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Unit Rate: </span>
                  <span className="font-semibold text-slate-800">Rs. {item.unitCost} / {item.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400">Reorder Min: </span>
                  <span className="font-semibold text-slate-800">{item.reorderLevel} {item.unit}</span>
                </div>
              </div>

              {/* Stock and Value */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Current Stock</span>
                  <div className={`text-base font-black ${isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                    {item.currentStock.toLocaleString()} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Valuation</span>
                  <div className="text-sm font-black text-slate-900">
                    Rs. {item.totalValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleOpenMovementModal(item)}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                <span>Issue / Receive Stock</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Stock Movement Audit Log */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Traceable Stock Movement History (Last 30 Movements)
          </h3>
          <span className="text-[11px] text-slate-400">Traceable audit logs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Log #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Material</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Quantity</th>
                <th className="py-2.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{m.movementNumber}</td>
                  <td className="py-2.5 px-4 text-slate-500">{m.date}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{m.itemName}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.movementType.includes('in') || m.movementType === 'opening'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {m.movementType.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">
                    {m.movementType.includes('issue') || m.movementType === 'wastage' ? '-' : '+'} {m.quantity.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">{m.notes || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Modal */}
      {isMovementModalOpen && selectedItemForMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Update Stock: {selectedItemForMovement.name}</h3>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordStockMovement} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Current Stock</span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedItemForMovement.currentStock} {selectedItemForMovement.unit}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Unit Cost</span>
                  <div className="font-bold text-slate-900 text-sm">
                    Rs. {selectedItemForMovement.unitCost}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Stock Movement Action *</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold"
                >
                  <option value="production_issue">Issue to Press / Finishing (Deduct from Stock)</option>
                  <option value="purchase_in">Receive from Mill / Supplier (Add to Stock)</option>
                  <option value="wastage">Record Material Wastage / Damage (Deduct from Stock)</option>
                  <option value="adjustment">Stock Audit Adjustment (+ / -)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity ({selectedItemForMovement.unit}) *</label>
                <input
                  type="number"
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-black text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Job Card Ref / Notes</label>
                <input
                  type="text"
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  placeholder="e.g. Issued 2500 sheets for Job JC-26-101"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Commit Stock Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Add Inventory Material</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Bleached Board 350 GSM Century Grade-A"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <option key={cat} value={cat}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Measurement Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="sheets">Sheets</option>
                    <option value="reams">Reams</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="pieces">Pieces / Plates</option>
                    <option value="boxes">Boxes</option>
                    <option value="rolls">Rolls</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Sheet Size / Dimensions</label>
                  <input
                    type="text"
                    value={formDimensions}
                    onChange={(e) => setFormDimensions(e.target.value)}
                    placeholder="28 x 40 inches"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">GSM (if board/paper)</label>
                  <input
                    type="number"
                    value={formGsm}
                    onChange={(e) => setFormGsm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mill / Brand Origin</label>
                  <input
                    type="text"
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value)}
                    placeholder="Century Mills / DIC"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit Cost (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Reorder Alert Level</label>
                  <input
                    type="number"
                    value={formReorder}
                    onChange={(e) => setFormReorder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Storage Location in Factory</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Warehouse Bay 1 / Ink Room"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Grain direction, shelf life, etc."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
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
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
