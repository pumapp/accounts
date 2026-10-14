import React, { useEffect, useState } from 'react';
import {
  Calculator,
  Search,
  Plus,
  TrendingUp,
  Percent,
  CheckCircle2,
  Trash2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { db } from '../../db';
import type { JobCosting, CompanySettings, Customer } from '../../types';

interface JobCostingViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

export const JobCostingView: React.FC<JobCostingViewProps> = ({ settings, initialAction }) => {
  const [costings, setCostings] = useState<JobCosting[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCosting, setSelectedCosting] = useState<JobCosting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number>(20000);
  const [dimensions, setDimensions] = useState('4.5 x 2.25 x 2.25 in');
  const [materialType, setMaterialType] = useState('350 GSM Bleached Folding Box Board');
  const [materialGsm, setMaterialGsm] = useState<number>(350);
  const [formulaType, setFormulaType] = useState<'cartons' | 'labels' | 'leaflets' | 'bags' | 'corrugated'>('cartons');

  // Estimated values
  const [estMaterial, setEstMaterial] = useState<number>(95000);
  const [actMaterial, setActMaterial] = useState<number>(97000);
  const [estPlate, setEstPlate] = useState<number>(5800);
  const [actPlate, setActPlate] = useState<number>(5800);
  const [estDie, setEstDie] = useState<number>(6500);
  const [actDie, setActDie] = useState<number>(6500);
  const [estPrinting, setEstPrinting] = useState<number>(18000);
  const [actPrinting, setActPrinting] = useState<number>(18500);
  const [estUv, setEstUv] = useState<number>(14000);
  const [actUv, setActUv] = useState<number>(14000);
  const [estPasting, setEstPasting] = useState<number>(9000);
  const [actPasting, setActPasting] = useState<number>(9200);
  const [estOutsource, setEstOutsource] = useState<number>(0);
  const [actOutsource, setActOutsource] = useState<number>(0);
  const [estPacking, setEstPacking] = useState<number>(3500);
  const [actPacking, setActPacking] = useState<number>(3500);
  const [estTransport, setEstTransport] = useState<number>(4000);
  const [actTransport, setActTransport] = useState<number>(3800);
  const [estOther, setEstOther] = useState<number>(0);
  const [actOther, setActOther] = useState<number>(0);

  const [sellingPrice, setSellingPrice] = useState<number>(260000);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await db.jobCostings.toArray();
    const cList = await db.customers.toArray();
    setCostings(list.reverse());
    setCustomers(cList);
    if (cList.length > 0 && !customerName) {
      setCustomerName(cList[0].name);
    }
    if (list.length > 0 && !selectedCosting) {
      setSelectedCosting(list[0]);
    }
  };

  // Calculations
  const calcEstTotal =
    estMaterial + estPlate + estDie + estPrinting + estUv + estPasting + estOutsource + estPacking + estTransport + estOther;
  const calcActTotal =
    actMaterial + actPlate + actDie + actPrinting + actUv + actPasting + actOutsource + actPacking + actTransport + actOther;
  const calcEstUnit = orderQuantity > 0 ? Math.round((calcEstTotal / orderQuantity) * 100) / 100 : 0;
  const calcActUnit = orderQuantity > 0 ? Math.round((calcActTotal / orderQuantity) * 100) / 100 : 0;
  const calcEstProfit = sellingPrice - calcEstTotal;
  const calcActProfit = sellingPrice - calcActTotal;
  const calcMargin = sellingPrice > 0 ? Math.round((calcActProfit / sellingPrice) * 10000) / 100 : 0;
  const calcVariance = calcEstTotal - calcActTotal; // positive = saved money; negative = cost overrun

  const handleSaveCosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('Product name is required.');
      return;
    }

    try {
      const count = await db.jobCostings.count();
      const jobCardNumber = `JC-26-${(count + 101).toString()}`;

      const newCosting: JobCosting = {
        jobCardNumber,
        customerName,
        productName,
        orderQuantity: Number(orderQuantity),
        dimensions,
        materialType,
        materialGsm: Number(materialGsm),
        formulaType,
        estimatedMaterialCost: Number(estMaterial),
        actualMaterialCost: Number(actMaterial),
        estimatedPlateCost: Number(estPlate),
        actualPlateCost: Number(actPlate),
        estimatedDieCost: Number(estDie),
        actualDieCost: Number(actDie),
        estimatedPrintingCost: Number(estPrinting),
        actualPrintingCost: Number(actPrinting),
        estimatedUvCost: Number(estUv),
        actualUvCost: Number(actUv),
        estimatedPastingCost: Number(estPasting),
        actualPastingCost: Number(actPasting),
        estimatedOutsourceCost: Number(estOutsource),
        actualOutsourceCost: Number(actOutsource),
        estimatedPackingCost: Number(estPacking),
        actualPackingCost: Number(actPacking),
        estimatedTransportCost: Number(estTransport),
        actualTransportCost: Number(actTransport),
        estimatedOtherDirectCost: Number(estOther),
        actualOtherDirectCost: Number(actOther),
        estimatedTotalCost: calcEstTotal,
        actualTotalCost: calcActTotal,
        estimatedUnitCost: calcEstUnit,
        actualUnitCost: calcActUnit,
        sellingPrice: Number(sellingPrice),
        estimatedGrossProfit: calcEstProfit,
        actualGrossProfit: calcActProfit,
        profitMarginPercent: calcMargin,
        costVariance: calcVariance,
        createdAt: new Date().toISOString(),
      };

      const id = await db.jobCostings.add(newCosting);
      setIsModalOpen(false);
      await loadData();
      setSelectedCosting({ ...newCosting, id });
      alert(`Job Costing analysis saved! Actual Gross Profit: Rs. ${calcActProfit.toLocaleString()} (${calcMargin}% Margin).`);
    } catch (err) {
      alert('Failed to save costing: ' + err);
    }
  };

  const filtered = costings.filter(
    (c) =>
      c.productName.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (c.jobCardNumber && c.jobCardNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Printing & Packaging Job Costing</h2>
          <p className="text-xs text-slate-500">Board consumption, plates, dies, printing setup, UV, actual vs estimated variance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, job card #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Job Costing</span>
          </button>
        </div>
      </div>

      {/* Grid: Left List, Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No job costing records found. Click "+ New Job Costing" to analyze margins.
            </div>
          ) : (
            filtered.map((cost) => {
              const isSelected = selectedCosting?.id === cost.id;
              const hasOverrun = cost.costVariance < 0;

              return (
                <div
                  key={cost.id}
                  onClick={() => setSelectedCosting(cost)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900">{cost.jobCardNumber || 'Job'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold capitalize">
                          {cost.formulaType}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 mt-1 truncate max-w-[200px]">
                        {cost.productName}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                        {cost.customerName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-emerald-800">
                        Rs. {cost.actualGrossProfit.toLocaleString()}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {cost.profitMarginPercent.toFixed(1)}% Margin
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Rate: Rs. {cost.actualUnitCost} / pc</span>
                    <span className={hasOverrun ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      Variance: {hasOverrun ? '-' : '+'}Rs. {Math.abs(cost.costVariance).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Costing Breakdown */}
        <div className="lg:col-span-7">
          {selectedCosting ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedCosting.jobCardNumber || 'JC-COST'}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedCosting.productName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Client: {selectedCosting.customerName} • Qty: {selectedCosting.orderQuantity.toLocaleString()} pcs • Type: {selectedCosting.formulaType.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Profitability Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Selling Price</span>
                  <div className="text-base font-black text-slate-900">
                    Rs. {selectedCosting.sellingPrice.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Actual Total Cost</span>
                  <div className="text-base font-black text-slate-900">
                    Rs. {selectedCosting.actualTotalCost.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold">Actual Gross Profit</span>
                  <div className="text-base font-black text-emerald-900">
                    Rs. {selectedCosting.actualGrossProfit.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] text-blue-700 uppercase font-bold">Gross Margin</span>
                  <div className="text-base font-black text-blue-900">
                    {selectedCosting.profitMarginPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Cost Component Comparison Table */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cost Component Variance (Estimated vs Actual)
                </h4>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-slate-50 p-2.5 font-bold text-slate-600 text-[10px] uppercase">
                    <span className="col-span-5">Cost Element</span>
                    <span className="col-span-3 text-right">Estimated (PKR)</span>
                    <span className="col-span-4 text-right">Actual Incurred (PKR)</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">Paper / Bleached Board Sheets</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedMaterialCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualMaterialCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">CTP Laser Aluminum Plates</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedPlateCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualPlateCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">Cutting & Creasing Wooden Die</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedDieCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualDieCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">Offset Printing & Ink Consumption</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedPrintingCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualPrintingCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">Lamination & Spot UV Finishing</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedUvCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualUvCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">Folder Gluer & Manual Pasting</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedPastingCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualPastingCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">Packing, Strapping & Cartons</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedPackingCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualPackingCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 items-center">
                    <span className="col-span-5 font-semibold text-slate-800">Delivery Transport (Lahore)</span>
                    <span className="col-span-3 text-right text-slate-600">Rs. {selectedCosting.estimatedTransportCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right font-bold text-slate-900">Rs. {selectedCosting.actualTransportCost.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-12 p-3 bg-slate-100 font-bold items-center">
                    <span className="col-span-5 text-slate-900">TOTAL DIRECT COST</span>
                    <span className="col-span-3 text-right text-slate-700">Rs. {selectedCosting.estimatedTotalCost.toLocaleString()}</span>
                    <span className="col-span-4 text-right text-blue-900 text-sm">Rs. {selectedCosting.actualTotalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a job costing sheet to view actual margins, board consumption, and production variance.
            </div>
          )}
        </div>
      </div>

      {/* Create Costing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">New Packaging Job Costing Estimation</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCosting} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer *</label>
                  <select
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Pharmaceutical Syrup Unit Carton"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Costing Formula</label>
                  <select
                    value={formulaType}
                    onChange={(e) => setFormulaType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="cartons">Folding Cartons</option>
                    <option value="labels">Self-Adhesive Labels</option>
                    <option value="leaflets">Pharmaceutical Leaflets</option>
                    <option value="corrugated">Corrugated Master Cartons</option>
                    <option value="bags">Paper Shopping Bags</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Order Quantity (pcs)</label>
                  <input
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Selling Price to Client (PKR)</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-black text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Board Spec & GSM</label>
                  <input
                    type="text"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Cost Breakdown (Estimated vs Actual Incurred)
                </span>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Estimated Board / Material Cost</label>
                    <input
                      type="number"
                      value={estMaterial}
                      onChange={(e) => setEstMaterial(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Actual Board / Material Cost</label>
                    <input
                      type="number"
                      value={actMaterial}
                      onChange={(e) => setActMaterial(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Estimated Plates (CTP)</label>
                    <input
                      type="number"
                      value={estPlate}
                      onChange={(e) => setEstPlate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Actual Plates (CTP)</label>
                    <input
                      type="number"
                      value={actPlate}
                      onChange={(e) => setActPlate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Estimated Cutting Die</label>
                    <input
                      type="number"
                      value={estDie}
                      onChange={(e) => setEstDie(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Actual Cutting Die</label>
                    <input
                      type="number"
                      value={actDie}
                      onChange={(e) => setActDie(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Estimated Printing & Inks</label>
                    <input
                      type="number"
                      value={estPrinting}
                      onChange={(e) => setEstPrinting(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Actual Printing & Inks</label>
                    <input
                      type="number"
                      value={actPrinting}
                      onChange={(e) => setActPrinting(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Estimated UV & Pasting</label>
                    <input
                      type="number"
                      value={estUv + estPasting}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEstUv(Math.round(val * 0.6));
                        setEstPasting(Math.round(val * 0.4));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Actual UV & Pasting</label>
                    <input
                      type="number"
                      value={actUv + actPasting}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setActUv(Math.round(val * 0.6));
                        setActPasting(Math.round(val * 0.4));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Results Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Calculated Actual Profit</span>
                  <div className="text-base font-black text-emerald-400">
                    Rs. {calcActProfit.toLocaleString()} ({calcMargin}% Margin)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Cost Per Piece</span>
                  <div className="text-sm font-bold text-sky-300">
                    Rs. {calcActUnit} / pc
                  </div>
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
                  Save Job Costing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
