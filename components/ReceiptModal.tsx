import React, { useState } from 'react';
import { Transaction, SchoolSettings, DEFAULT_SCHOOL_SETTINGS, MonthlySignature } from '../types';
import { formatRupiah, terbilang } from '../utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  signature?: MonthlySignature | null;
  schoolSettings?: SchoolSettings;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ 
  isOpen, 
  onClose, 
  transaction,
  signature,
  schoolSettings = DEFAULT_SCHOOL_SETTINGS
}) => {
  const [isSavingJpg, setIsSavingJpg] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  // 1. Fungsi Cetak Langsung ke Printer Fisik
  const handlePrint = () => {
    setErrorMessage(null);
    const paperElement = document.getElementById('receipt-paper');
    if (!paperElement) {
      window.print();
      return;
    }

    setIsPrinting(true);

    try {
      const printIframe = document.createElement('iframe');
      printIframe.setAttribute('style', 'position:fixed;width:0px;height:0px;left:-9999px;top:-9999px;border:none;');
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        setIsPrinting(false);
        return;
      }

      let activeStyles = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(tag => {
        activeStyles += tag.outerHTML + '\n';
      });

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="UTF-8" />
            <title>Kwitansi_BOSP_${transaction.id}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${activeStyles}
            <style>
              @page {
                size: A4 portrait;
                margin: 10mm 15mm;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: "Times New Roman", Times, serif !important;
              }
              #isolated-print-wrapper {
                width: 100% !important;
                max-width: 760px !important;
                margin: 0 auto !important;
                padding: 10px !important;
                box-sizing: border-box !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body class="bg-white">
            <div id="isolated-print-wrapper">
              ${paperElement.outerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          console.warn("Iframe print terhalang, beralih ke window.print():", err);
          window.print();
        } finally {
          setIsPrinting(false);
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 2000);
        }
      }, 400);

    } catch (error) {
      console.error("Gagal mencetak kwitansi:", error);
      setIsPrinting(false);
      window.print();
    }
  };

  // 2. Fungsi Ekspor File PDF Asli (.pdf)
  const handleExportPdf = async () => {
    setErrorMessage(null);
    setIsExportingPdf(true);
    try {
      const element = document.getElementById('receipt-paper');
      if (!element) return;

      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 850,
        onclone: (clonedDoc) => {
          const cloned = clonedDoc.getElementById('receipt-paper');
          if (cloned) {
            cloned.style.width = '760px';
            cloned.style.maxWidth = '760px';
            cloned.style.margin = '0 auto';
            cloned.style.boxShadow = 'none';
            cloned.style.border = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      // Standar A4 Portrait (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfMargin = 15;
      const pdfContentWidth = 210 - (pdfMargin * 2); // 180mm
      const pdfContentHeight = (canvas.height * pdfContentWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', pdfMargin, pdfMargin, pdfContentWidth, pdfContentHeight);
      
      const safeRecipient = (signature?.recipientName || transaction.recipient || 'Kas').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Kwitansi-BOSP-${transaction.id}-${safeRecipient}.pdf`);
    } catch (error) {
      console.error("Gagal membuat PDF kwitansi:", error);
      setErrorMessage("Gagal membuat file PDF kwitansi. Silakan coba lagi atau gunakan tombol Cetak.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 3. Fungsi Simpan Gambar JPG (.jpg)
  const handleSaveImage = async () => {
    setErrorMessage(null);
    setIsSavingJpg(true);
    try {
      const element = document.getElementById('receipt-paper');
      if (element) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const canvas = await html2canvas(element, {
          scale: 2.5,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 850,
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('receipt-paper');
            if (clonedElement) {
              clonedElement.style.width = '760px';
              clonedElement.style.maxWidth = '760px';
              clonedElement.style.minWidth = '760px';
              clonedElement.style.margin = '0 auto';
              clonedElement.style.boxShadow = 'none';
              clonedElement.style.border = 'none';
            }
          }
        });
        
        const image = canvas.toDataURL('image/jpeg', 0.98);
        const link = document.createElement('a');
        link.href = image;
        const safeRecipient = (signature?.recipientName || transaction.recipient || 'Kas').replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `Kwitansi-BOSP-${transaction.id}-${safeRecipient}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Gagal menyimpan gambar:", error);
      setErrorMessage("Gagal menyimpan gambar kwitansi. Silakan coba lagi.");
    } finally {
      setIsSavingJpg(false);
    }
  };

  const terbilangText = terbilang(transaction.amount) + " Rupiah";
  const formattedDate = (() => {
    try {
      const parts = (transaction.date || '').split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      return new Date(transaction.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return transaction.date;
    }
  })();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm print:static print:p-0 print:bg-white print:z-auto">
      {/* Fallback CSS Cetak Standar */}
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 15mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            .no-print {
              display: none !important;
            }
            body * {
              visibility: hidden;
            }
            #receipt-paper, #receipt-paper * {
              visibility: visible;
            }
            #receipt-paper {
              position: fixed !important;
              left: 50% !important;
              top: 0 !important;
              transform: translateX(-50%) !important;
              box-shadow: none !important;
              border: none !important;
              max-width: 760px !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              z-index: 999999 !important;
            }
          }
        `}
      </style>

      <div className="bg-[#0B111B] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto border border-cyan-500/30 relative flex flex-col print:max-h-none print:shadow-none print:border-none print:max-w-none print:bg-white print:overflow-visible text-slate-100">
        
        {/* Toolbar Header Modal */}
        <div className="p-3 sm:p-4 bg-[#101621] border-b border-slate-800 text-white flex flex-wrap justify-between items-center gap-2 sticky top-0 z-20 no-print shrink-0 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base leading-none text-white">Pratinjau Bukti Transaksi</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Format Kwitansi SPJ BOSP &bull; No: <span className="font-mono text-cyan-300 font-semibold">{transaction.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Tombol Simpan JPG */}
                <button 
                  onClick={handleSaveImage} 
                  disabled={isSavingJpg || isExportingPdf || isPrinting}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="Download sebagai file gambar JPEG persis seperti pratinjau"
                >
                    {isSavingJpg ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>Simpan JPG</span>
                      </>
                    )}
                </button>

                {/* Tombol Ekspor PDF Asli */}
                <button 
                  onClick={handleExportPdf} 
                  disabled={isSavingJpg || isExportingPdf || isPrinting}
                  className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="Unduh langsung sebagai dokumen PDF resmi (A4)"
                >
                    {isExportingPdf ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Membuat PDF...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        <span>Download PDF</span>
                      </>
                    )}
                </button>

                {/* Tombol Cetak Langsung */}
                <button 
                  onClick={handlePrint} 
                  disabled={isSavingJpg || isExportingPdf || isPrinting}
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-md shadow-cyan-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="Kirim perintah cetak langsung ke printer"
                >
                    {isPrinting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Menyiapkan...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                        <span>Cetak</span>
                      </>
                    )}
                </button>

                <button 
                  onClick={onClose} 
                  className="px-3 py-1.5 text-xs bg-[#151C28] hover:bg-slate-800 rounded-xl transition-colors text-slate-300 hover:text-white border border-slate-700 ml-1 cursor-pointer"
                  disabled={isSavingJpg || isExportingPdf || isPrinting}
                  title="Tutup Pratinjau"
                >
                  Tutup
                </button>
            </div>
        </div>

        {/* Notifikasi Error In-App jika Ekspor Gagal */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Area Preview Lembar Kertas Kwitansi */}
        <div className="p-3 sm:p-6 md:p-8 bg-[#080B12] flex justify-center items-start overflow-x-auto min-h-[500px] print:p-0 print:bg-white print:block">
             {/* Wrapper Berbayang Khusus Tampilan Layar */}
             <div className="shadow-2xl border border-gray-300 bg-white rounded-sm w-full max-w-[760px] mx-auto print:shadow-none print:border-none print:max-w-full">
               
               {/* Elemen Kertas Kwitansi Murni (Yang ditangkap oleh JPG, PDF, dan Printer) */}
               <div 
                  id="receipt-paper" 
                  className="bg-white w-full max-w-[760px] p-5 sm:p-6 md:p-7 box-border text-gray-900 mx-auto" 
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
               >
                  {/* Bingkai Ganda Standar Kwitansi Resmi: Garis Luar Tebal, Jeda Rapi, Garis Dalam Tipis */}
                  <div className="border-[2.5px] border-black p-1 bg-white">
                    <div className="border border-black p-4 sm:p-5 md:p-6 bg-white">

                      {/* Kop Surat Resmi */}
                      <div className="text-center pb-2 mb-3 border-b-2 border-black">
                        <div className="border-b border-black pb-2">
                          <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-800 leading-tight">
                            PEMERINTAH {schoolSettings.city ? `KOTA / KABUPATEN ${schoolSettings.city.toUpperCase()}` : 'DAERAH'}
                          </h3>
                          <h4 className="text-[11px] sm:text-xs font-bold tracking-wide uppercase text-gray-700 leading-tight mt-0.5">
                            DINAS PENDIDIKAN DAN KEBUDAYAAN
                          </h4>
                          <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-black my-1 leading-tight">
                            {schoolSettings.schoolName}
                          </h1>
                          <p className="text-[11px] font-semibold text-gray-800 leading-tight">
                            NPSN: {schoolSettings.npsn} &bull; Tahun Anggaran {schoolSettings.fiscalYear} ({schoolSettings.bosPeriod})
                          </p>
                          <p className="text-[10px] text-gray-600 leading-tight mt-0.5">
                            {schoolSettings.address} {schoolSettings.city ? ` - ${schoolSettings.city}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Judul & Nomor Kuitansi */}
                      <div className="text-center my-3">
                        <h2 className="text-base sm:text-lg font-black uppercase tracking-wide underline decoration-2 underline-offset-4 text-black">
                          BUKTI PENGELUARAN KAS / KWITANSI
                        </h2>
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold text-gray-700 mt-1">
                          <span>Nomor: <span className="font-mono font-bold text-black">{transaction.id}/BOSP/{new Date(transaction.date).getFullYear()}</span></span>
                          <span className="hidden sm:inline">&bull;</span>
                          <span>BOSP Reguler</span>
                        </div>
                      </div>

                      {/* Baris Rincian Kwitansi Terstruktur Rapi */}
                      <div className="space-y-2.5 my-4 text-xs sm:text-sm">
                          
                          {/* Sudah Terima Dari */}
                          <div className="flex items-baseline">
                              <div className="w-36 sm:w-44 shrink-0 font-bold text-gray-800">Sudah Terima Dari</div>
                              <div className="w-4 shrink-0 text-center font-bold">:</div>
                              <div className="flex-1 border-b border-gray-400 pb-0.5 text-gray-900 font-medium">
                                Bendahara BOSP {schoolSettings.schoolName}
                              </div>
                          </div>

                          {/* Diberikan Kepada */}
                          <div className="flex items-baseline">
                              <div className="w-36 sm:w-44 shrink-0 font-bold text-gray-800">Diberikan Kepada</div>
                              <div className="w-4 shrink-0 text-center font-bold">:</div>
                              <div className="flex-1 border-b border-gray-400 pb-0.5 text-gray-900 font-bold">
                                {signature?.recipientName || transaction.recipient || '( .................................................. )'}
                              </div>
                          </div>
                          
                          {/* Uang Sejumlah */}
                          <div className="flex items-center">
                              <div className="w-36 sm:w-44 shrink-0 font-bold text-gray-800">Uang Sejumlah</div>
                              <div className="w-4 shrink-0 text-center font-bold">:</div>
                              <div className="flex-1">
                                  <span className="inline-block bg-slate-100 border-2 border-slate-700 px-3 py-1 font-mono font-black text-base sm:text-lg text-black rounded-sm shadow-2xs">
                                      {formatRupiah(transaction.amount)}
                                  </span>
                              </div>
                          </div>

                          {/* Terbilang */}
                          <div className="flex items-baseline">
                              <div className="w-36 sm:w-44 shrink-0 font-bold text-gray-800">Terbilang</div>
                              <div className="w-4 shrink-0 text-center font-bold">:</div>
                              <div className="flex-1 border-b border-gray-400 pb-0.5 italic font-bold text-gray-900 bg-slate-50 px-2 leading-relaxed capitalize">
                                 # {terbilangText} #
                              </div>
                          </div>

                          {/* Untuk Pembayaran */}
                          <div className="flex items-baseline">
                              <div className="w-36 sm:w-44 shrink-0 font-bold text-gray-800">Untuk Pembayaran</div>
                              <div className="w-4 shrink-0 text-center font-bold">:</div>
                              <div className="flex-1 border-b border-gray-400 pb-0.5 text-gray-900 leading-snug">
                                  {transaction.description}
                              </div>
                          </div>

                          {/* Kode Rekening (Baris Mandiri untuk Mencegah Wrap) */}
                          <div className="flex items-baseline">
                              <div className="w-36 sm:w-44 shrink-0 font-bold text-gray-800">Kode Rekening / Standar</div>
                              <div className="w-4 shrink-0 text-center font-bold">:</div>
                              <div className="flex-1 border-b border-gray-400 pb-0.5 text-gray-900 font-semibold text-xs sm:text-sm">
                                  {transaction.category}
                              </div>
                          </div>

                          {/* Sumber Dana (Baris Mandiri) */}
                          <div className="flex items-baseline">
                              <div className="w-36 sm:w-44 shrink-0 font-bold text-gray-800">Sumber Dana</div>
                              <div className="w-4 shrink-0 text-center font-bold">:</div>
                              <div className="flex-1 border-b border-gray-400 pb-0.5 text-gray-900 font-semibold text-xs sm:text-sm">
                                  {transaction.source || 'BOS Reguler'}
                              </div>
                          </div>
                      </div>

                      {/* Baris Tanggal di Atas Tanda Tangan */}
                      <div className="flex justify-end text-xs text-gray-800 mt-5 mb-2 pr-2">
                        <span>
                          {schoolSettings.city ? `${schoolSettings.city}, ` : ''}{signature?.signedAt || formattedDate}
                        </span>
                      </div>

                      {/* Kolom Tanda Tangan (3 Kolom yang Sejajar Sempurna & Bebas Bug Coret Teks) */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          
                          {/* Kolom 1: Kepala Sekolah */}
                          <div className="flex flex-col items-center justify-between min-h-[140px]">
                              <div>
                                <p className="font-semibold text-gray-900">Setuju Dibayar,</p>
                                <p className="text-gray-700">Kepala Sekolah</p>
                              </div>
                              
                              {/* Area tanda tangan fisik / stempel */}
                              <div className="h-14 w-full flex items-center justify-center">
                              </div>
                              
                              <div className="w-full flex flex-col items-center">
                                <p className="font-bold text-gray-900 leading-tight">
                                  {schoolSettings.headmasterName}
                                </p>
                                <div className="w-36 sm:w-44 border-b border-black mt-1 mb-0.5"></div>
                                <p className="text-[10px] text-gray-600">
                                  NIP. {schoolSettings.headmasterNip || '-'}
                                </p>
                              </div>
                          </div>

                          {/* Kolom 2: Bendahara */}
                          <div className="flex flex-col items-center justify-between min-h-[140px]">
                              <div>
                                <p className="font-semibold text-gray-900">Lunas Dibayar,</p>
                                <p className="text-gray-700">Bendahara BOSP</p>
                              </div>
                              
                              {/* Area tanda tangan bendahara */}
                              <div className="h-14 w-full flex items-center justify-center">
                              </div>
                              
                              <div className="w-full flex flex-col items-center">
                                <p className="font-bold text-gray-900 leading-tight">
                                  {schoolSettings.treasurerName}
                                </p>
                                <div className="w-36 sm:w-44 border-b border-black mt-1 mb-0.5"></div>
                                <p className="text-[10px] text-gray-600">
                                  NIP. {schoolSettings.treasurerNip || '-'}
                                </p>
                              </div>
                          </div>

                          {/* Kolom 3: Penerima Pembayaran */}
                          <div className="flex flex-col items-center justify-between min-h-[140px]">
                              <div>
                                <p className="font-semibold text-gray-900">Yang Menerima,</p>
                                <p className="text-gray-700">Penerima Pembayaran</p>
                              </div>
                              
                              {/* Gambar tanda tangan digital atau tempat tanda tangan basah */}
                              <div className="h-14 w-full flex items-center justify-center px-1">
                                {signature?.signatureDataUrl ? (
                                  <img 
                                    src={signature.signatureDataUrl} 
                                    alt={`Tanda tangan ${signature.recipientName || transaction.recipient}`} 
                                    className="max-h-14 max-w-[130px] sm:max-w-[150px] object-contain"
                                  />
                                ) : (
                                  <div className="text-[10px] text-gray-400 italic">
                                    ( Tanda Tangan Basah )
                                  </div>
                                )}
                              </div>
                              
                              <div className="w-full flex flex-col items-center">
                                <p className="font-bold text-gray-900 leading-tight">
                                  {signature?.recipientName || transaction.recipient || '( ................................. )'}
                                </p>
                                <div className="w-36 sm:w-44 border-b border-black mt-1 mb-0.5"></div>
                                <p className="text-[10px] text-gray-600">
                                  Tanda Tangan & Nama Terang
                                </p>
                              </div>
                          </div>

                      </div>

                    </div>
                  </div>

               </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;

