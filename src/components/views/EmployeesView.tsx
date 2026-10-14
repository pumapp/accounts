import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Briefcase,
  BadgeDollarSign,
  Trash2,
  X,
  CreditCard,
} from 'lucide-react';
import { db } from '../../db';
import type { Employee, CompanySettings } from '../../types';

interface EmployeesViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ settings, initialAction }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState<'Production' | 'Press' | 'Finishing' | 'Artwork' | 'Accounts' | 'Administration' | 'Delivery'>('Press');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [basicSalary, setBasicSalary] = useState<number>(55000);
  const [allowances, setAllowances] = useState<number>(5000);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await db.employees.toArray();
    setEmployees(list);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Employee name is required.');
      return;
    }

    try {
      const count = await db.employees.count();
      const empCode = `EMP-${(count + 1).toString().padStart(2, '0')}`;

      await db.employees.add({
        empCode,
        name,
        designation,
        department,
        phone,
        cnic,
        joiningDate,
        basicSalary: Number(basicSalary),
        allowances: Number(allowances),
        currentAdvanceBalance: 0,
        status: 'active',
      });

      setIsModalOpen(false);
      setName('');
      setDesignation('');
      await loadData();
      alert(`Employee ${name} (${empCode}) registered!`);
    } catch (err) {
      alert('Failed to save employee: ' + err);
    }
  };

  const handleGiveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedEmployee.id) return;
    const adv = Number(advanceAmount);
    if (!adv || adv <= 0) {
      alert('Advance amount must be greater than zero.');
      return;
    }

    try {
      const newAdvBalance = selectedEmployee.currentAdvanceBalance + adv;
      await db.employees.update(selectedEmployee.id, {
        currentAdvanceBalance: newAdvBalance,
      });

      // Record in expenses as Salary Advance
      const count = await db.expenses.count();
      await db.expenses.add({
        expenseNumber: `EXP-26-${(count + 1).toString().padStart(4, '0')}`,
        category: 'Office Salaries',
        title: `Recoverable Salary Advance - ${selectedEmployee.name}`,
        date: new Date().toISOString().split('T')[0],
        amount: adv,
        paymentMethod: 'cash',
        paidTo: selectedEmployee.name,
        description: `Advance against monthly salary (to be adjusted in payroll)`,
        createdAt: new Date().toISOString(),
      });

      setIsAdvanceModalOpen(false);
      setAdvanceAmount(0);
      await loadData();
      alert(`Rs. ${adv.toLocaleString()} salary advance issued to ${selectedEmployee.name}. Treatable as recoverable until payroll adjustment.`);
    } catch (err) {
      alert('Failed to issue advance: ' + err);
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.empCode.toLowerCase().includes(search.toLowerCase()) ||
      e.designation.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Factory Workforce & Employees</h2>
          <p className="text-xs text-slate-500">Offset pressmen, die-cut operators, graphic prepress, salaries and advance loans</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, role..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3 hover:border-blue-300 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {emp.empCode}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                    {emp.department}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 mt-1">
                  {emp.name}
                </h3>
                <p className="text-xs text-slate-500">{emp.designation}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Basic Salary</span>
                <div className="font-black text-sm text-slate-900">
                  Rs. {emp.basicSalary.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div>Phone: {emp.phone || 'N/A'}</div>
              <div>CNIC: {emp.cnic || 'N/A'}</div>
              <div>Joined: {emp.joiningDate}</div>
              <div>Allowances: Rs. {emp.allowances.toLocaleString()}</div>
            </div>

            {/* Advance Status */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Salary Advance Balance</span>
                <div className={`text-xs font-black ${emp.currentAdvanceBalance > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                  Rs. {emp.currentAdvanceBalance.toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedEmployee(emp);
                  setIsAdvanceModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Issue Advance
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Give Advance Modal */}
      {isAdvanceModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Issue Salary Advance: {selectedEmployee.name}</h3>
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGiveAdvance} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Advance Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-black text-slate-900 text-sm bg-slate-50"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <strong>Notice:</strong> This amount is treated as a recoverable asset. It will be deducted automatically from the employee's monthly payroll slip.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Confirm Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Register Factory Employee</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Muhammad Farooq"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Offset Pressman"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="Press">Press (Offset Printing)</option>
                    <option value="Finishing">Finishing & Die-Cutting</option>
                    <option value="Artwork">Artwork & Prepress CTP</option>
                    <option value="Accounts">Accounts & Administration</option>
                    <option value="Delivery">Delivery & Logistics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 312 4001234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">National CNIC #</label>
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="35201-1234567-1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Monthly Basic Salary (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Allowances (PKR)</label>
                  <input
                    type="number"
                    value={allowances}
                    onChange={(e) => setAllowances(Number(e.target.value))}
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
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
