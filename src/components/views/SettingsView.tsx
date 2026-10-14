import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Lock,
  Globe,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Server,
  Smartphone,
  Save,
  RotateCcw,
} from 'lucide-react';
import { db, seedDemoData } from '../../db';
import type { CompanySettings } from '../../types';

interface SettingsViewProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (field: keyof CompanySettings, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.settings.put(formData);
      onUpdateSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + err);
    }
  };

  const handleResetDemoData = async () => {
    const confirm = window.confirm(
      'Are you sure you want to load starter demo records for Puma Art Printers? (Does not delete your custom company settings).'
    );
    if (!confirm) return;

    try {
      await seedDemoData();
      alert('Starter demo records reloaded successfully!');
      window.location.reload();
    } catch (err) {
      alert('Error seeding demo data: ' + err);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">System & Company Settings</h2>
          <p className="text-xs text-slate-500">Puma Art Printers legal identity, Lahore address, currency & document numbering</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          ✓ Company profile & document numbering updated successfully!
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="uppercase tracking-wider text-[11px]">Factory Identity & Branding</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Printing & Packaging Industry Scope</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Factory Location & City</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Physical Factory Address (Lahore)</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp Hotline</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Financial & Document Prefixes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="uppercase tracking-wider text-[11px]">Financials, Taxes & Document Prefixing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Base Currency</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">FBR NTN Number</label>
              <input
                type="text"
                value={formData.ntnNumber}
                onChange={(e) => handleChange('ntnNumber', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">PRA Sales Tax (STRN)</label>
              <input
                type="text"
                value={formData.strnNumber}
                onChange={(e) => handleChange('strnNumber', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Payment Remittance Details (Printed on Invoices)</label>
            <input
              type="text"
              value={formData.bankDetails}
              onChange={(e) => handleChange('bankDetails', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quotation Prefix</label>
              <input
                type="text"
                value={formData.quotationPrefix}
                onChange={(e) => handleChange('quotationPrefix', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Order Prefix</label>
              <input
                type="text"
                value={formData.orderPrefix}
                onChange={(e) => handleChange('orderPrefix', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Challan Prefix</label>
              <input
                type="text"
                value={formData.challanPrefix}
                onChange={(e) => handleChange('challanPrefix', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Payroll Screen PIN</label>
              <input
                type="password"
                maxLength={6}
                value={formData.payrollPin}
                onChange={(e) => handleChange('payrollPin', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono font-bold text-center"
              />
            </div>
          </div>
        </div>

        {/* Free Deployment & Running Options (Requirement 20) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
            <Server className="w-4 h-4 text-blue-600" />
            <span className="uppercase tracking-wider text-[11px]">Free Running & Zero-Cost Deployment Guide</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>OPTION A: Local Installation & Wi-Fi Phone Access</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Run directly on your PC:
                <br />
                1. Clone / download project code and run <code>npm run dev</code> or <code>npm run build && npm run preview</code>.
                <br />
                2. To access on your Android/iPhone over the factory Wi-Fi, open your PC's IP address (e.g. <code>http://192.168.1.50:3000</code>).
                <br />
                3. Tap <strong>"Install App"</strong> in the browser to add Puma ERP as a standalone PWA on your phone.
              </p>
            </div>

            {/* Option B */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>OPTION B: Free Static Cloud Hosting</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Run <code>npm run build</code> to produce pure static files in the <code>/dist</code> folder.
                <br />
                Deploy for 100% free with no credit card required to:
                <br />
                • GitHub Pages (Free forever)
                <br />
                • Cloudflare Pages (Free tier, no card required)
                <br />
                • Netlify / Vercel Free tier
                <br />
                <em>Note: Static hosting does not automatically sync databases across devices. Use the JSON backup to transfer data.</em>
              </p>
            </div>
          </div>
        </div>

        {/* Demo Seed Reset */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <h4 className="font-bold text-slate-800">Factory Demo Seed Records</h4>
            <p className="text-[11px] text-slate-500">Restore default Lahore client, paper board & machine data</p>
          </div>
          <button
            type="button"
            onClick={handleResetDemoData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Demo Data</span>
          </button>
        </div>
      </form>
    </div>
  );
};
