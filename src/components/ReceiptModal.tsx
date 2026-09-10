import React, { useRef, useState } from 'react';
import { Printer, Download, X, Building2, Check, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Transaction, SchoolProfile } from '../types';
import { formatRupiah, terbilang, formatDateIndo } from '../utils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  schoolProfile: SchoolProfile;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  schoolProfile,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !transaction) return null;

  const totalTax =
    (transaction.taxPpn || 0) +
    (transaction.taxPph21 || 0) +
    (transaction.taxPph22 || 0) +
    (transaction.taxPph23 || 0);
  const netAmount = Math.max(0, transaction.amount - totalTax);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Kuitansi_${transaction.receiptNumber || transaction.id}_${transaction.date}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to export receipt image', err);
      alert('Gagal mengunduh gambar kuitansi');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Toolbar (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Bukti Kuitansi Pengeluaran BOS</h3>
              <p className="text-xs text-slate-400">Format Resmi Dokumen Pertanggungjawaban (SPJ)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors"
              title="Cetak Kuitansi ke Printer atau PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak (A4)</span>
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-colors"
              title="Unduh format gambar PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Memproses...' : 'Unduh Gambar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 sm:p-10 bg-white print:p-0" ref={receiptRef}>
          {/* Header Kop */}
          <div className="border-b-2 border-slate-900 pb-3 text-center relative">
            <div className="text-xs uppercase font-bold tracking-widest text-slate-700">
              PEMERINTAH KOTA / KABUPATEN {schoolProfile.city.toUpperCase()}
            </div>
            <div className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-900 mt-0.5">
              {schoolProfile.schoolName}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              NPSN: {schoolProfile.npsn} • {schoolProfile.address}
            </div>
          </div>

          {/* Judul Dokumen & Metadata */}
          <div className="mt-4 text-center">
            <h2 className="text-base sm:text-lg font-black tracking-wider uppercase underline underline-offset-4 text-slate-900">
              KUITANSI / BUKTI PENGELUARAN KAS
            </h2>
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 mt-2 font-mono px-1">
              <span>No. Bukti: <strong className="text-slate-900">{transaction.receiptNumber || '-'}</strong></span>
              <span>Tahun Anggaran: <strong className="text-slate-900">{schoolProfile.fiscalYear}</strong></span>
              <span>Mata Anggaran: <strong className="text-slate-900">{transaction.fundSource}</strong></span>
            </div>
          </div>

          {/* Tabel Isi Kuitansi */}
          <div className="mt-5 border border-slate-800 rounded-lg overflow-hidden text-xs text-slate-900">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-4 sm:col-span-3 bg-slate-100/90 p-3 font-semibold border-r border-slate-200">
                Sudah Terima Dari
              </div>
              <div className="col-span-8 sm:col-span-9 p-3 font-medium">
                Bendahara BOS {schoolProfile.schoolName}
              </div>
            </div>

            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-4 sm:col-span-3 bg-slate-100/90 p-3 font-semibold border-r border-slate-200">
                Uang Sejumlah
              </div>
              <div className="col-span-8 sm:col-span-9 p-3 font-bold italic bg-slate-50/50 text-slate-800">
                "{terbilang(transaction.amount)}"
              </div>
            </div>

            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-4 sm:col-span-3 bg-slate-100/90 p-3 font-semibold border-r border-slate-200">
                Untuk Pembayaran
              </div>
              <div className="col-span-8 sm:col-span-9 p-3 leading-relaxed">
                {transaction.description}
                <div className="mt-1 text-[11px] text-slate-600">
                  Komponen: <span className="font-semibold text-slate-800">{transaction.category}</span>
                </div>
              </div>
            </div>

            {/* Penerima / Toko */}
            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-4 sm:col-span-3 bg-slate-100/90 p-3 font-semibold border-r border-slate-200">
                Penerima / Rekanan
              </div>
              <div className="col-span-8 sm:col-span-9 p-3">
                <span className="font-bold">{transaction.recipient || '-'}</span>
                {transaction.recipientAddress && (
                  <span className="text-slate-500 block text-[11px]">{transaction.recipientAddress}</span>
                )}
              </div>
            </div>

            {/* Rincian Angka & Pajak */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center justify-between font-mono text-sm py-0.5">
                <span className="font-bold text-slate-700">Jumlah Kotor (Bruto):</span>
                <span className="font-bold text-slate-900">{formatRupiah(transaction.amount)}</span>
              </div>

              {totalTax > 0 && (
                <div className="space-y-1 my-1.5 py-1.5 border-y border-dashed border-slate-300 text-xs">
                  {transaction.taxPpn ? (
                    <div className="flex justify-between text-slate-600">
                      <span>• Potongan PPN (11%):</span>
                      <span className="font-mono text-rose-600">- {formatRupiah(transaction.taxPpn)}</span>
                    </div>
                  ) : null}
                  {transaction.taxPph21 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>• Potongan PPh 21 (Honor):</span>
                      <span className="font-mono text-rose-600">- {formatRupiah(transaction.taxPph21)}</span>
                    </div>
                  ) : null}
                  {transaction.taxPph22 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>• Potongan PPh 22 (Barang):</span>
                      <span className="font-mono text-rose-600">- {formatRupiah(transaction.taxPph22)}</span>
                    </div>
                  ) : null}
                  {transaction.taxPph23 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>• Potongan PPh 23 (Jasa):</span>
                      <span className="font-mono text-rose-600">- {formatRupiah(transaction.taxPph23)}</span>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-center justify-between font-mono text-sm pt-1 border-t border-slate-300">
                <span className="font-extrabold text-slate-900">Jumlah Diterima Bersih (Netto):</span>
                <span className="font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {formatRupiah(netAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Kolom Tanda Tangan Tiga Pihak Standar SPJ */}
          <div className="mt-8 text-xs text-slate-900">
            <div className="text-right text-[11px] mb-2">
              {schoolProfile.city}, {formatDateIndo(transaction.date)}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Kolom 1: Setuju dibayar (Kepala Sekolah) */}
              <div className="flex flex-col justify-between h-36">
                <div>
                  <p className="font-bold">Setuju Dibayar:</p>
                  <p className="text-[11px] text-slate-600">Kepala {schoolProfile.schoolName}</p>
                </div>
                <div className="border-t border-slate-800 pt-1 mx-2">
                  <p className="font-bold underline">{schoolProfile.headmaster}</p>
                  <p className="text-[10px] font-mono text-slate-600">NIP. {schoolProfile.headmasterNip}</p>
                </div>
              </div>

              {/* Kolom 2: Lunas dibayar (Bendahara BOS) */}
              <div className="flex flex-col justify-between h-36">
                <div>
                  <p className="font-bold">Lunas Dibayar:</p>
                  <p className="text-[11px] text-slate-600">Bendahara BOS</p>
                </div>
                <div className="border-t border-slate-800 pt-1 mx-2">
                  <p className="font-bold underline">{schoolProfile.treasurer}</p>
                  <p className="text-[10px] font-mono text-slate-600">NIP. {schoolProfile.treasurerNip}</p>
                </div>
              </div>

              {/* Kolom 3: Penerima Uang / Toko */}
              <div className="flex flex-col justify-between h-36">
                <div>
                  <p className="font-bold">Yang Menerima:</p>
                  <p className="text-[11px] text-slate-600">Toko / Rekanan / Penerima</p>
                  {transaction.amount >= 5000000 && (
                    <span className="text-[9px] border border-dashed border-slate-400 px-1 py-0.5 rounded text-slate-500 inline-block mt-1">
                      Meterai Rp 10.000
                    </span>
                  )}
                </div>
                <div className="border-t border-slate-800 pt-1 mx-2">
                  <p className="font-bold underline">{transaction.recipient || '(................................)'}</p>
                  <p className="text-[10px] text-slate-500">Tanda Tangan & Cap</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>* Kuitansi ini sah sebagai lampiran SPJ BKU Dana BOS.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
