import React, { useEffect, useState } from 'react';
import {
  HardDriveDownload,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  Database,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  RefreshCw,
} from 'lucide-react';
import { db, seedDemoData } from '../../db';
import type { CompanySettings } from '../../types';
import { BackupService, type BackupPayload } from '../../services/backup';

interface BackupsViewProps {
  settings: CompanySettings;
  onRefreshData?: () => void;
}

export const BackupsView: React.FC<BackupsViewProps> = ({ settings, onRefreshData }) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [restoreFileContent, setRestoreFileContent] = useState<string>('');
  const [restorePreview, setRestorePreview] = useState<{
    valid: boolean;
    error?: string;
    payload?: BackupPayload;
    previewCounts?: Record<string, number>;
  } | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details: string[];
  } | null>(null);

  const [csvTable, setCsvTable] = useState<'customers' | 'suppliers' | 'inventoryItems'>('customers');
  const [csvInput, setCsvInput] = useState('');
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    const c: Record<string, number> = {
      customers: await db.customers.count(),
      suppliers: await db.suppliers.count(),
      quotations: await db.quotations.count(),
      orders: await db.orders.count(),
      invoices: await db.invoices.count(),
      payments: await db.customerPayments.count(),
      expenses: await db.expenses.count(),
      inventory: await db.inventoryItems.count(),
      productionJobs: await db.productionJobs.count(),
      jobCostings: await db.jobCostings.count(),
      deliveryChallans: await db.deliveryChallans.count(),
      employees: await db.employees.count(),
      payroll: await db.payroll.count(),
      journalEntries: await db.journalEntries.count(),
    };
    setCounts(c);

    const logs = await db.backupLogs.toArray();
    setBackupLogs(logs.reverse());
  };

  const handleDownloadFullBackup = async () => {
    try {
      const res = await BackupService.exportFullBackup();
      BackupService.downloadFile(res.jsonString, res.fileName);
      await loadCounts();
      alert(`Full JSON backup created! Saved as "${res.fileName}".`);
    } catch (err) {
      alert('Backup failed: ' + err);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setRestoreFileContent(content);
      const validation = BackupService.validateBackupFile(content);
      setRestorePreview(validation);
      setTestResult(null);
    };
    reader.readAsText(file);
  };

  const handleRunRestorationTest = async () => {
    if (!restoreFileContent) return;
    const res = await BackupService.runRestorationTest(restoreFileContent);
    setTestResult(res);
  };

  const handleCommitRestore = async () => {
    if (!restorePreview || !restorePreview.valid || !restorePreview.payload) return;

    const confirm = window.confirm(
      'WARNING: Restoring will overwrite all current factory records on this browser with the backup data. Do you wish to proceed?'
    );
    if (!confirm) return;

    try {
      await BackupService.restoreFromPayload(restorePreview.payload);
      await loadCounts();
      setRestoreFileContent('');
      setRestorePreview(null);
      setTestResult(null);
      alert('Database restored successfully from backup payload!');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('Failed to restore database: ' + err);
    }
  };

  const handleTableCsvExport = async () => {
    let records: any[] = [];
    if (csvTable === 'customers') records = await db.customers.toArray();
    else if (csvTable === 'suppliers') records = await db.suppliers.toArray();
    else if (csvTable === 'inventoryItems') records = await db.inventoryItems.toArray();

    BackupService.exportTableToCSV(records, csvTable);
  };

  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvInput(text);
      const rows = BackupService.parseCSV(text);
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleCommitCsvImport = async () => {
    if (csvPreview.length === 0) return;

    try {
      if (csvTable === 'customers') {
        let added = 0;
        for (const row of csvPreview) {
          if (!row.name) continue;
          const count = await db.customers.count();
          await db.customers.add({
            code: row.code || `CUST-${(count + 1).toString().padStart(3, '0')}`,
            name: row.name,
            company: row.company || '',
            contactPerson: row.contactPerson || '',
            phone: row.phone || '',
            whatsapp: row.whatsapp || '',
            email: row.email || '',
            address: row.address || '',
            industry: row.industry || 'Packaging',
            paymentTerms: row.paymentTerms || '30 Days Net',
            creditLimit: Number(row.creditLimit) || 500000,
            openingBalance: Number(row.openingBalance) || 0,
            currentBalance: Number(row.currentBalance) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          added++;
        }
        alert(`Successfully imported ${added} customer record(s) from CSV!`);
      } else if (csvTable === 'suppliers') {
        let added = 0;
        for (const row of csvPreview) {
          if (!row.name) continue;
          const count = await db.suppliers.count();
          await db.suppliers.add({
            code: row.code || `SUP-${(count + 1).toString().padStart(3, '0')}`,
            name: row.name,
            company: row.company || '',
            contactPerson: row.contactPerson || '',
            phone: row.phone || '',
            email: row.email || '',
            address: row.address || '',
            paymentTerms: row.paymentTerms || 'Credit 30 Days',
            openingBalance: Number(row.openingBalance) || 0,
            currentBalance: Number(row.currentBalance) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          added++;
        }
        alert(`Successfully imported ${added} supplier record(s) from CSV!`);
      }

      setCsvInput('');
      setCsvPreview([]);
      await loadCounts();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert('CSV import failed: ' + err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Data Backups & Portability</h2>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              100% PORTABLE
            </span>
          </div>
          <p className="text-xs text-slate-500">Versioned JSON full backups, relationship validation, CSV table export & dry-run restoration testing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadFullBackup}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>Export Full Backup</span>
          </button>
        </div>
      </div>

      {/* Honest Architecture Limitations Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Honest Free-Tier Storage & Persistence Guidelines</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="space-y-1">
            <strong className="text-white block">1. Local Device IndexedDB:</strong>
            All factory documents, invoices, production jobs, and journals reside securely in your browser's IndexedDB. Closing the tab, reopening, or rebooting the PC does not delete records.
          </div>
          <div className="space-y-1">
            <strong className="text-white block">2. Browser Cleaning Hazard:</strong>
            If someone clears browser browsing history/cookies or damages the physical drive, local data will be erased. No third party holds your data.
          </div>
          <div className="space-y-1">
            <strong className="text-white block">3. Routine Backup Routine:</strong>
            Click "Export Full Backup" weekly and save the generated `.json` file to your personal USB, external drive, or Google Drive for complete safety.
          </div>
        </div>
      </div>

      {/* Live Record Counts Grid */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Live Database Record Counts (Ready for Backup)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {Object.entries(counts).map(([name, count]) => (
            <div key={name} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block truncate capitalize">
                {name.replace(/([A-Z])/g, ' $1')}
              </span>
              <span className="text-lg font-black text-slate-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Restore JSON Backup & Dry-Run Integrity Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restore Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Restore from JSON Backup</h3>
              <p className="text-xs text-slate-500">Select a previously exported Puma Art Printers backup file</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Backup File (.json)</label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelected}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {/* Backup Preview */}
          {restorePreview && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs animate-in fade-in">
              {restorePreview.valid ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Backup Verified: {restorePreview.payload?.appName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Backup Date: {new Date(restorePreview.payload?.timestamp || '').toLocaleString()}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    {Object.entries(restorePreview.previewCounts || {}).slice(0, 6).map(([tbl, cnt]) => (
                      <div key={tbl} className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-slate-400 capitalize">{tbl}:</span>{' '}
                        <strong className="text-slate-800">{cnt}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Dry Run Test Action */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleRunRestorationTest}
                      className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer text-center"
                    >
                      Run Restoration Integrity Test
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitRestore}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer text-center"
                    >
                      Restore & Overwrite Live DB
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-rose-700 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Validation Failed: {restorePreview.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Test Result Box */}
          {testResult && (
            <div className={`p-4 rounded-xl border space-y-2 text-xs animate-in fade-in ${
              testResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{testResult.message}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
                {testResult.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CSV Import/Export Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">CSV Import & Export</h3>
              <p className="text-xs text-slate-500">Spreadsheet compatibility for customers, suppliers & items</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={csvTable}
              onChange={(e) => setCsvTable(e.target.value as any)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
            >
              <option value="customers">Customers Table</option>
              <option value="suppliers">Suppliers Table</option>
              <option value="inventoryItems">Inventory Items</option>
            </select>

            <button
              onClick={handleTableCsvExport}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition shrink-0"
            >
              Export CSV
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <span className="font-bold text-slate-700 block">Import CSV into {csvTable}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileSelected}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 cursor-pointer"
            />

            {csvPreview.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Preview: {csvPreview.length} rows parsed</span>
                  <button
                    onClick={handleCommitCsvImport}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                  >
                    Commit Import
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  First record: {JSON.stringify(csvPreview[0])}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
