import React, { useState } from 'react';
import { X, Check, School, ShieldCheck } from 'lucide-react';
import { SchoolProfile } from '../types';

interface SchoolProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchoolProfile;
  onSave: (updatedProfile: SchoolProfile) => void;
}

const SchoolProfileModal: React.FC<SchoolProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [formData, setFormData] = useState<SchoolProfile>(profile);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-auto overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Pengaturan Profil Sekolah & Pejabat</h3>
              <p className="text-xs text-slate-400">Digunakan pada Kop Kuitansi, BKU & SPJ BOS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Identitas Sekolah */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
              Data Identitas Sekolah
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NPSN</label>
                <input
                  type="text"
                  required
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Sekolah</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kota / Kabupaten</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Provinsi</label>
                <input
                  type="text"
                  required
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Pejabat Penandatangan SPJ */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
              Pejabat Penandatangan Dokumen BOS
            </h4>

            {/* Kepala Sekolah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  required
                  value={formData.headmaster}
                  onChange={(e) => setFormData({ ...formData, headmaster: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={formData.headmasterNip}
                  onChange={(e) => setFormData({ ...formData, headmasterNip: e.target.value })}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Bendahara BOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Bendahara BOS</label>
                <input
                  type="text"
                  required
                  value={formData.treasurer}
                  onChange={(e) => setFormData({ ...formData, treasurer: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP Bendahara BOS</label>
                <input
                  type="text"
                  value={formData.treasurerNip}
                  onChange={(e) => setFormData({ ...formData, treasurerNip: e.target.value })}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Tahun Anggaran & Periode */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tahun Anggaran</label>
              <input
                type="text"
                required
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                className="w-full text-xs font-mono rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tahap / Periode Salur</label>
              <input
                type="text"
                required
                value={formData.bosPeriod}
                onChange={(e) => setFormData({ ...formData, bosPeriod: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" /> Simpan Profil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolProfileModal;
