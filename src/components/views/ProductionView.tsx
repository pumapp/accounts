import React, { useEffect, useState } from 'react';
import {
  Factory,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { db } from '../../db';
import type { ProductionJob, ProductionStage, CompanySettings, Employee } from '../../types';

interface ProductionViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

const PRODUCTION_STAGES: ProductionStage[] = [
  'Order Confirmed',
  'Artwork Preparation',
  'Customer Approval',
  'Material Preparation',
  'Plate Preparation',
  'Printing',
  'Die-Cutting',
  'UV Finishing',
  'Pasting',
  'Quality Inspection',
  'Packing',
  'Ready for Delivery',
  'Delivered',
];

export const ProductionView: React.FC<ProductionViewProps> = ({ settings, initialAction }) => {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Stage Update Modal Form
  const [nextStage, setNextStage] = useState<ProductionStage>('Printing');
  const [producedQty, setProducedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [wastageQty, setWastageQty] = useState<number>(0);
  const [completedBy, setCompletedBy] = useState('');
  const [stageNotes, setStageNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const jList = await db.productionJobs.toArray();
    const eList = await db.employees.toArray();
    setJobs(jList.reverse());
    setEmployees(eList);
    if (jList.length > 0 && !selectedJob) {
      setSelectedJob(jList[0]);
    }
  };

  const openStageUpdateModal = (job: ProductionJob) => {
    setSelectedJob(job);
    const currentIndex = PRODUCTION_STAGES.indexOf(job.currentStage);
    const nextDefault = currentIndex < PRODUCTION_STAGES.length - 1 ? PRODUCTION_STAGES[currentIndex + 1] : job.currentStage;
    setNextStage(nextDefault);
    setProducedQty(job.producedQuantity);
    setRejectedQty(job.rejectedQuantity);
    setWastageQty(job.wastageQuantity);
    setCompletedBy(job.responsiblePerson || (employees[0]?.name || 'Press Operator'));
    setStageNotes('');
    setIsUpdateModalOpen(true);
  };

  const handleCommitStageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !selectedJob.id) return;

    try {
      const now = new Date().toISOString();
      const updatedStages = [
        ...(selectedJob.stagesCompleted || []),
        {
          stage: nextStage,
          completedAt: now,
          completedBy: completedBy || 'Operator',
          notes: stageNotes || `Advanced to ${nextStage}`,
        },
      ];

      const isCompleted = nextStage === 'Delivered';
      const isReady = nextStage === 'Ready for Delivery';

      await db.productionJobs.update(selectedJob.id, {
        currentStage: nextStage,
        producedQuantity: Number(producedQty) || 0,
        rejectedQuantity: Number(rejectedQty) || 0,
        wastageQuantity: Number(wastageQty) || 0,
        stagesCompleted: updatedStages,
        status: isCompleted ? 'completed' : isReady ? 'ready_dispatch' : 'in_progress',
        actualCompletionDate: isCompleted ? now.split('T')[0] : undefined,
      });

      // If linked to Sales Order, update order's productionStatus
      if (selectedJob.orderId) {
        await db.orders.update(selectedJob.orderId, {
          productionStatus: isCompleted ? 'delivered' : isReady ? 'completed' : 'in_production',
        });
      }

      setIsUpdateModalOpen(false);
      await loadData();
      alert(`Job Card ${selectedJob.jobCardNumber} advanced to "${nextStage}"!`);
    } catch (err) {
      alert('Failed to update stage: ' + err);
    }
  };

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      j.jobCardNumber.toLowerCase().includes(search.toLowerCase()) ||
      j.customerName.toLowerCase().includes(search.toLowerCase()) ||
      j.productName.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || j.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Factory Production Tracking</h2>
          <p className="text-xs text-slate-500">13-stage packaging manufacturing pipeline from artwork to printing, die-cutting & dispatch</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job card # or product..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
          >
            <option value="all">All Stages</option>
            {PRODUCTION_STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Left List, Right Detail & Stage Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No production jobs found. Book a sales order to auto-generate job cards.
            </div>
          ) : (
            filtered.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              const isDelayed = job.status === 'delayed' || (job.targetCompletionDate < new Date().toISOString().split('T')[0] && job.status !== 'completed');
              const progressPct = Math.min(100, Math.round((job.producedQuantity / (job.targetQuantity || 1)) * 100));

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900">{job.jobCardNumber}</span>
                        {job.priority === 'urgent' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                            URGENT
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {job.currentStage}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 mt-1 truncate max-w-[200px]">
                        {job.productName}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                        Client: {job.customerName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        {job.targetQuantity.toLocaleString()} pcs
                      </div>
                      <span className={`text-[10px] font-bold ${isDelayed ? 'text-rose-600' : 'text-slate-500'}`}>
                        Due: {job.targetCompletionDate}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Produced: {job.producedQuantity.toLocaleString()}</span>
                      <span>{progressPct}% Done</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Job Detail */}
        <div className="lg:col-span-7">
          {selectedJob ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedJob.jobCardNumber}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedJob.productName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Client: {selectedJob.customerName} • Target Date: {selectedJob.targetCompletionDate}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openStageUpdateModal(selectedJob)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <span>Update Stage</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Target Quantity</span>
                  <div className="text-base font-black text-slate-900">
                    {selectedJob.targetQuantity.toLocaleString()} pcs
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Good Produced</span>
                  <div className="text-base font-black text-emerald-700">
                    {selectedJob.producedQuantity.toLocaleString()} pcs
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Rejected / QC</span>
                  <div className="text-base font-black text-rose-700">
                    {selectedJob.rejectedQuantity.toLocaleString()} pcs
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Paper Trim Wastage</span>
                  <div className="text-base font-black text-amber-700">
                    {selectedJob.wastageQuantity.toLocaleString()} pcs
                  </div>
                </div>
              </div>

              {/* 13 Stages Pipeline Visualizer */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Configurable 13-Stage Production Pipeline
                </h4>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {PRODUCTION_STAGES.map((stage, idx) => {
                    const isPassed = (selectedJob.stagesCompleted || []).some((s) => s.stage === stage);
                    const isCurrent = selectedJob.currentStage === stage;
                    const log = (selectedJob.stagesCompleted || []).find((s) => s.stage === stage);

                    return (
                      <div
                        key={stage}
                        className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition ${
                          isCurrent
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                            : 'bg-white text-slate-400 border border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrent
                              ? 'bg-white text-blue-600'
                              : isPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span>{stage}</span>
                        </div>

                        <div className="text-[11px] text-right">
                          {isPassed && log ? (
                            <span className={isCurrent ? 'text-blue-100' : 'text-emerald-700'}>
                              {log.completedBy} • {new Date(log.completedAt).toLocaleDateString('en-GB')}
                            </span>
                          ) : isCurrent ? (
                            <span className="text-blue-100 uppercase text-[10px]">Active on floor</span>
                          ) : (
                            <span>Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select a production job card to view stage progress, pressmen logs, and wastage.
            </div>
          )}
        </div>
      </div>

      {/* Stage Update Modal */}
      {isUpdateModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Advance Stage: {selectedJob.jobCardNumber}</h3>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCommitStageUpdate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Production Stage *</label>
                <select
                  value={nextStage}
                  onChange={(e) => setNextStage(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold"
                >
                  {PRODUCTION_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Produced Good (pcs)</label>
                  <input
                    type="number"
                    value={producedQty}
                    onChange={(e) => setProducedQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">QC Rejected (pcs)</label>
                  <input
                    type="number"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Wastage / Trim (pcs)</label>
                  <input
                    type="number"
                    value={wastageQty}
                    onChange={(e) => setWastageQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Responsible Operator / Supervisor</label>
                <input
                  type="text"
                  value={completedBy}
                  onChange={(e) => setCompletedBy(e.target.value)}
                  placeholder="e.g. Muhammad Farooq (Senior Pressman)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Machine Notes & Quality Comments</label>
                <textarea
                  rows={2}
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder="e.g. Color registration checked against approved client swatch."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Save Stage Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
