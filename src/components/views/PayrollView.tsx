import React, { useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Search,
  Plus,
  FileDown,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  X,
  CreditCard,
} from 'lucide-react';
import { db } from '../../db';
import type { PayrollRecord, CompanySettings, Employee } from '../../types';
import { PDFGenerator } from '../../services/pdf';
import { AccountingEngine } from '../../services/accounting';

interface PayrollViewProps {
  settings: CompanySettings;
}

export const PayrollView: React.FC<PayrollViewProps> = ({ settings }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);
  const [month, setMonth] = useState('October 2026');
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<number>(0);
  const [overtimeHours, setOvertimeHours] = useState<number>(10);
  const [overtimeAmount, setOvertimeAmount] = useState<number>(3500);
  const [advanceDeductions, setAdvanceDeductions] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const pList = await db.payroll.toArray();
    const eList = await db.employees.toArray();
    setPayrollList(pList.reverse());
    setEmployees(eList);

    if (eList.length > 0 && selectedEmployeeId === 0) {
      handleSelectEmployee(eList[0]);
    }
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id!);
    setBasicSalary(emp.basicSalary);
    setAllowances(emp.allowances);
    // suggest deducting whatever advance is pending
    setAdvanceDeductions(emp.currentAdvanceBalance || 0);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPin = settings.payrollPin || '1234';
    if (pinInput === targetPin) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const totalDeductions = advanceDeductions + otherDeductions;
  const netPayable = basicSalary + allowances + overtimeAmount + bonus - totalDeductions;

  const handleProcessPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp || !emp.id) {
      alert('Please select an employee.');
      return;
    }

    try {
      const count = await db.payroll.count();
      const payrollNumber = `PAYROLL-26-${(count + 1).toString().padStart(4, '0')}`;
      const todayStr = new Date().toISOString().split('T')[0];

      // Auto Double-Entry Accounting:
      // Debit Factory & Office Salaries Expense (6030) -> Rs. netPayable
      // Credit Cash / Bank (1010 / 1020) -> Rs. netPayable
      const je = await AccountingEngine.postJournalEntry({
        date: todayStr,
        description: `Payroll for ${emp.name} (${month}) - Net paid`,
        referenceType: 'payroll',
        debits: [{ accountCode: '6030', amount: netPayable }],
        credits: [{ accountCode: paymentMethod === 'cash' ? '1010' : '1020', amount: netPayable }],
      });

      const newRecord: PayrollRecord = {
        payrollNumber,
        month,
        year: 2026,
        date: todayStr,
        employeeId: emp.id,
        employeeName: emp.name,
        basicSalary,
        allowances,
        overtimeHours,
        overtimeAmount,
        advanceDeductions,
        bonus,
        totalDeductions,
        netPayable,
        status: 'paid',
        paymentMethod,
        paidDate: todayStr,
        journalEntryId: je.id,
      };

      await db.payroll.add(newRecord);

      // Adjust employee advance balance if deductions were made
      if (advanceDeductions > 0) {
        const remainingAdv = Math.max(0, emp.currentAdvanceBalance - advanceDeductions);
        await db.employees.update(emp.id, {
          currentAdvanceBalance: remainingAdv,
        });
      }

      setIsModalOpen(false);
      await loadData();
      alert(`Payroll processed for ${emp.name}! Journal Entry ${je.entryNumber} posted to General Ledger.`);
    } catch (err) {
      alert('Failed to process payroll: ' + err);
    }
  };

  // PIN Protection Gate
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-sky-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Confidential Payroll Access</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter local security PIN to view employee salaries and monthly compensation.
          </p>
        </div>

        <form onSubmit={handleVerifyPin} className="space-y-3 pt-2">
          <input
            type="password"
            autoFocus
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Default PIN: 1234"
            className="w-full text-center tracking-widest text-lg font-bold py-2.5 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
          {pinError && (
            <p className="text-xs font-bold text-rose-600">Incorrect PIN. Try 1234 or update in Settings.</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            Unlock Payroll
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
          <strong>Honest Security Note:</strong> This local PIN prevents casual over-the-shoulder viewing on mobile screens in the factory. It is not equivalent to server-side enterprise role isolation.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Factory Payroll & Payslips</h2>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              UNLOCKED
            </span>
          </div>
          <p className="text-xs text-slate-500">Monthly wages, overtime calculations, advance deductions & payslip printing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Process Salary</span>
          </button>
          <button
            onClick={() => setIsUnlocked(false)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            title="Lock Screen"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Slip #</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Basic + Allowances</th>
                <th className="py-3 px-4">Advance Deduction</th>
                <th className="py-3 px-4 text-right">Net Paid (PKR)</th>
                <th className="py-3 px-4 text-center">Payslip PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No payroll slips generated yet. Click "+ Process Salary" to generate payslips.
                  </td>
                </tr>
              ) : (
                payrollList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.payrollNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{p.month}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{p.employeeName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      Rs. {(p.basicSalary + p.allowances).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-amber-700 font-medium">
                      {p.advanceDeductions > 0 ? `- Rs. ${p.advanceDeductions.toLocaleString()}` : 'None'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      Rs. {p.netPayable.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => PDFGenerator.generatePayslipPDF(p, settings)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                        title="Download Payslip PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Payroll Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Process Employee Monthly Salary</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayroll} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Employee *</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => {
                      const emp = employees.find((em) => em.id === Number(e.target.value));
                      if (emp) handleSelectEmployee(emp);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    {employees.map((em) => (
                      <option key={em.id} value={em.id}>
                        {em.name} ({em.designation})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payroll Month Period</label>
                  <input
                    type="text"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="e.g. October 2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Basic Salary</label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Allowances</label>
                  <input
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Overtime (PKR)</label>
                  <input
                    type="number"
                    value={overtimeAmount}
                    onChange={(e) => setOvertimeAmount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bonus (PKR)</label>
                  <input
                    type="number"
                    value={bonus}
                    onChange={(e) => setBonus(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 mb-1">
                    Advance Salary Deduction (Adjusts Loan)
                  </label>
                  <input
                    type="number"
                    value={advanceDeductions}
                    onChange={(e) => setAdvanceDeductions(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 font-bold text-amber-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank_transfer">HBL Factory Payroll Account</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Net Salary Payable</span>
                  <div className="text-lg font-black text-emerald-400">
                    Rs. {netPayable.toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  Total Deductions: Rs. {totalDeductions.toLocaleString()}
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
                  Pay & Generate Payslip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
