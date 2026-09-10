import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Check, 
  X, 
  Receipt, 
  Calculator, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  FundSource, 
  PaymentMethod 
} from '../types';
import { 
  formatRupiah, 
  BOS_EXPENSE_CATEGORIES, 
  BOS_INCOME_CATEGORIES 
} from '../utils';

interface TransactionFormProps {
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  editingTransaction: Transaction | null;
  onCancelEdit: () => void;
  lastReceiptCount?: number;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onAddTransaction,
  onUpdateTransaction,
  editingTransaction,
  onCancelEdit,
  lastReceiptCount = 0,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fundSource, setFundSource] = useState<FundSource>('BOS Reguler');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Kas Tunai');
  const [category, setCategory] = useState<string>(BOS_EXPENSE_CATEGORIES[4]); // Administrasi Sekolah
  const [description, setDescription] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Pajak SPJ
  const [showTaxSection, setShowTaxSection] = useState<boolean>(false);
  const [taxPpn, setTaxPpn] = useState<number>(0);
  const [taxPph21, setTaxPph21] = useState<number>(0);
  const [taxPph22, setTaxPph22] = useState<number>(0);
  const [taxPph23, setTaxPph23] = useState<number>(0);

  // Sync state when editingTransaction changes
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setFundSource(editingTransaction.fundSource);
      setPaymentMethod(editingTransaction.paymentMethod);
      setCategory(editingTransaction.category);
      setDescription(editingTransaction.description);
      setAmountStr(editingTransaction.amount.toString());
      setReceiptNumber(editingTransaction.receiptNumber || '');
      setRecipient(editingTransaction.recipient || '');
      setRecipientAddress(editingTransaction.recipientAddress || '');
      setNotes(editingTransaction.notes || '');
      
      const ppn = editingTransaction.taxPpn || 0;
      const pph21 = editingTransaction.taxPph21 || 0;
      const pph22 = editingTransaction.taxPph22 || 0;
      const pph23 = editingTransaction.taxPph23 || 0;
      setTaxPpn(ppn);
      setTaxPph21(pph21);
      setTaxPph22(pph22);
      setTaxPph23(pph23);
      if (ppn > 0 || pph21 > 0 || pph22 > 0 || pph23 > 0) {
        setShowTaxSection(true);
      }
    } else {
      resetForm();
    }
  }, [editingTransaction]);

  // When type toggles between income and expense
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(BOS_INCOME_CATEGORIES[0]);
      setPaymentMethod('Bank / Transfer');
      setShowTaxSection(false);
    } else {
      setCategory(BOS_EXPENSE_CATEGORIES[4]);
      setPaymentMethod('Kas Tunai');
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setFundSource('BOS Reguler');
    setPaymentMethod('Kas Tunai');
    setCategory(type === 'expense' ? BOS_EXPENSE_CATEGORIES[4] : BOS_INCOME_CATEGORIES[0]);
    setDescription('');
    setAmountStr('');
    setReceiptNumber('');
    setRecipient('');
    setRecipientAddress('');
    setNotes('');
    setTaxPpn(0);
    setTaxPph21(0);
    setTaxPph22(0);
    setTaxPph23(0);
    setShowTaxSection(false);
  };

  const generateReceiptNumber = () => {
    const d = new Date(date || Date.now());
    const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][d.getMonth()];
    const year = d.getFullYear();
    const count = String(lastReceiptCount + 1).padStart(3, '0');
    const prefix = type === 'income' ? 'P-BOS' : 'K-BOS';
    setReceiptNumber(`${count}/${prefix}/${monthRoman}/${year}`);
  };

  const currentAmount = parseFloat(amountStr) || 0;
  const totalDeduction = taxPpn + taxPph21 + taxPph22 + taxPph23;
  const netAmount = Math.max(0, currentAmount - totalDeduction);

  const calculateQuickPpn = () => {
    if (currentAmount > 0) {
      // PPN 11% dari dasar pengenaan pajak (DPP)
      // Jika harga termasuk PPN: DPP = Nominal / 1.11, PPN = DPP * 11%
      const ppn = Math.round((currentAmount * 11) / 111);
      setTaxPpn(ppn);
    }
  };

  const calculateQuickPph21 = () => {
    if (currentAmount > 0) {
      // PPh 21 standar honorarium non-PNS 5%
      const pph = Math.round(currentAmount * 0.05);
      setTaxPph21(pph);
    }
  };

  const calculateQuickPph22 = () => {
    if (currentAmount > 0) {
      // PPh 22 belanja barang pemerintah (1.5%)
      const pph = Math.round(currentAmount * 0.015);
      setTaxPph22(pph);
    }
  };

  const calculateQuickPph23 = () => {
    if (currentAmount > 0) {
      // PPh 23 sewa/jasa (2%)
      const pph = Math.round(currentAmount * 0.02);
      setTaxPph23(pph);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountStr || currentAmount <= 0) {
      alert('Mohon masukkan nominal transaksi yang valid (lebih dari Rp 0)');
      return;
    }
    if (!description.trim()) {
      alert('Mohon lengkapi uraian keperluan transaksi');
      return;
    }

    const payload = {
      date,
      type,
      fundSource,
      paymentMethod,
      category,
      description: description.trim(),
      amount: currentAmount,
      receiptNumber: receiptNumber.trim() || undefined,
      recipient: recipient.trim() || undefined,
      recipientAddress: recipientAddress.trim() || undefined,
      taxPpn: type === 'expense' && taxPpn > 0 ? taxPpn : undefined,
      taxPph21: type === 'expense' && taxPph21 > 0 ? taxPph21 : undefined,
      taxPph22: type === 'expense' && taxPph22 > 0 ? taxPph22 : undefined,
      taxPph23: type === 'expense' && taxPph23 > 0 ? taxPph23 : undefined,
      notes: notes.trim() || undefined,
    };

    if (editingTransaction) {
      onUpdateTransaction({
        ...payload,
        id: editingTransaction.id,
      });
    } else {
      onAddTransaction(payload);
      resetForm();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header Form */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingTransaction ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {editingTransaction ? <Receipt className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {editingTransaction ? 'Edit Transaksi BKU' : 'Catat Transaksi Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingTransaction ? 'Perbarui data pembukuan BOS' : 'Entri pengeluaran atau penyaluran dana'}
              </p>
            </div>
          </div>
          {editingTransaction && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Batal
            </button>
          )}
        </div>

        {/* Tipe Selector: Pengeluaran vs Penerimaan */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              type === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Pengeluaran (Belanja)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Penerimaan (Dana Masuk)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Row 1: Tanggal & Sumber Dana */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Transaksi <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full text-xs rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sumber Dana
            </label>
            <select
              value={fundSource}
              onChange={(e) => setFundSource(e.target.value as FundSource)}
              className="w-full text-xs rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
            >
              <option value="BOS Reguler">BOS Reguler</option>
              <option value="BOS Kinerja">BOS Kinerja</option>
              <option value="BOS Afirmasi">BOS Afirmasi</option>
              <option value="BOS Daerah (BOSDA)">BOS Daerah (BOSDA)</option>
              <option value="Komite / Lainnya">Komite / Lainnya</option>
            </select>
          </div>
        </div>

        {/* Row 2: Metode Kas/Bank & Nomor Bukti */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Buku Kas / Rekening
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('Kas Tunai')}
                className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                  paymentMethod === 'Kas Tunai'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kas Tunai
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Bank / Transfer')}
                className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                  paymentMethod === 'Bank / Transfer'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bank / Giro
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                No. Bukti / SPJ
              </label>
              <button
                type="button"
                onClick={generateReceiptNumber}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                title="Generate otomatis nomor bukti"
              >
                <Sparkles className="w-3 h-3" /> Auto
              </button>
            </div>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="Contoh: 001/K-BOS/II/2025"
              className="w-full text-xs rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border font-mono"
            />
          </div>
        </div>

        {/* Row 3: Komponen Standar BOS */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {type === 'expense' ? 'Kategori (SNP / Sumber / Komponen BOS)' : 'Kategori Penerimaan'} <span className="text-rose-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-xs rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border text-slate-800 font-medium"
          >
            {type === 'expense' ? (
              BOS_EXPENSE_CATEGORIES.map((cat, i) => (
                <option key={i} value={cat}>
                  {i + 1}. {cat}
                </option>
              ))
            ) : (
              BOS_INCOME_CATEGORIES.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Row 4: Uraian Kegiatan / Transaksi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Uraian Transaksi / Keperluan Belanja <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={2}
            placeholder={type === 'expense' ? 'Contoh: Pembelian Kertas HVS F4 70gr 5 Rim dan Tinta Printer Epson 003 untuk Semester I' : 'Contoh: Penyaluran Dana BOS Reguler Tahap I dari Kemenkeu/Kasda'}
            className="w-full text-xs rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
          />
        </div>

        {/* Row 5: Nominal Uang */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
            </label>
            {currentAmount > 0 && (
              <span className="text-xs font-mono font-bold text-indigo-700">
                {formatRupiah(currentAmount)}
              </span>
            )}
          </div>
          <div className="relative rounded-xl shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-400 font-bold text-xs">Rp</span>
            </div>
            <input
              type="number"
              min="1"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
              placeholder="0"
              className="w-full text-sm font-mono font-semibold rounded-xl border-slate-300 bg-white pl-9 pr-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 border"
            />
          </div>
        </div>

        {/* Row 6: Penerima / Toko Rekanan (Khusus Pengeluaran) */}
        {type === 'expense' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Penerima Uang / Toko Rekanan
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Contoh: Toko Buku Mandiri / CV Berkah"
                className="w-full text-xs rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat / Kota Rekanan (Opsional)
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Contoh: Jl. Merdeka Barat No. 10"
                className="w-full text-xs rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
              />
            </div>
          </div>
        )}

        {/* Section Pajak SPJ (Hanya untuk Pengeluaran) */}
        {type === 'expense' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowTaxSection(!showTaxSection)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                Potongan Pajak SPJ (PPN / PPh)
                {totalDeduction > 0 && (
                  <span className="ml-1.5 bg-indigo-100 text-indigo-700 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {formatRupiah(totalDeduction)}
                  </span>
                )}
              </span>
              {showTaxSection ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showTaxSection && (
              <div className="p-3.5 pt-1 space-y-3 border-t border-slate-200/60 bg-white">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">PPN (11%)</span>
                      <button
                        type="button"
                        onClick={calculateQuickPpn}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Auto 11%
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={taxPpn || ''}
                      onChange={(e) => setTaxPpn(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full text-xs font-mono rounded-lg border-slate-300 py-1.5 px-2.5 border"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">PPh 21 (Honor 5%)</span>
                      <button
                        type="button"
                        onClick={calculateQuickPph21}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Auto 5%
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={taxPph21 || ''}
                      onChange={(e) => setTaxPph21(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full text-xs font-mono rounded-lg border-slate-300 py-1.5 px-2.5 border"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">PPh 22 (Barang 1.5%)</span>
                      <button
                        type="button"
                        onClick={calculateQuickPph22}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Auto 1.5%
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={taxPph22 || ''}
                      onChange={(e) => setTaxPph22(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full text-xs font-mono rounded-lg border-slate-300 py-1.5 px-2.5 border"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">PPh 23 (Jasa/Sewa 2%)</span>
                      <button
                        type="button"
                        onClick={calculateQuickPph23}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Auto 2%
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={taxPph23 || ''}
                      onChange={(e) => setTaxPph23(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full text-xs font-mono rounded-lg border-slate-300 py-1.5 px-2.5 border"
                    />
                  </div>
                </div>

                {totalDeduction > 0 && (
                  <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Diterima Bersih (Netto):</span>
                    <strong className="font-mono text-indigo-900 font-bold">
                      {formatRupiah(netAmount)}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit & Reset Button */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="submit"
            className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all ${
              editingTransaction
                ? 'bg-amber-600 hover:bg-amber-700'
                : type === 'expense'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Check className="w-4 h-4" />
            {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi BKU'}
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors text-xs font-medium"
            title="Bersihkan Isian Form"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
