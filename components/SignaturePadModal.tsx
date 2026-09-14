import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  recipientName: string;
  onSave: (recipientName: string, signatureDataUrl: string) => void;
  initialSignature?: string;
}

const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  title,
  recipientName: initialRecipientName,
  onSave,
  initialSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [name, setName] = useState(initialRecipientName || '');
  const [penColor, setPenColor] = useState('#1e3a8a'); // Biru formal khas tanda tangan berkas dinas
  const [penWidth, setPenWidth] = useState(2.5);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialRecipientName || '');
      setHasDrawn(!!initialSignature);
      setErrorMessage(null);
      setTimeout(() => {
        initCanvas();
      }, 50);
    }
  }, [isOpen, initialRecipientName, initialSignature]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for crisp display
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    // If there is an existing signature, draw it
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialSignature;
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setErrorMessage(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasDrawn) {
      setErrorMessage('Silakan goreskan tanda tangan pada area kanvas di bawah sebelum menyimpan.');
      return;
    }

    // Export transparent PNG
    const signatureDataUrl = canvas.toDataURL('image/png');
    onSave(name.trim() || 'Penerima', signatureDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
      <div className="bg-[#101621] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-cyan-500/30 flex flex-col text-slate-100">
        {/* Header */}
        <div className="bg-[#151C28] border-b border-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Tanda Tangan Digital Touchscreen
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Notifikasi Peringatan In-App */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-2.5 bg-amber-950/80 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-amber-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Input Nama Penerima */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Nama Lengkap Penerima / Pihak yang Menerima:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Toko ATK Mandiri / Bpk. H. Sukirman"
              className="w-full px-3.5 py-2.5 text-sm bg-[#080B12] border border-cyan-500/25 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          {/* Area Canvas Touchscreen */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
                Goreskan Tanda Tangan (Sentuh / Mouse):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPenColor('#1e3a8a')}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${penColor === '#1e3a8a' ? 'border-cyan-400 scale-110 shadow-sm' : 'border-slate-700'}`}
                  style={{ backgroundColor: '#1e3a8a' }}
                  title="Tinta Biru Dokumen Resmi"
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#000000')}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${penColor === '#000000' ? 'border-cyan-400 scale-110 shadow-sm' : 'border-slate-700'}`}
                  style={{ backgroundColor: '#000000' }}
                  title="Tinta Hitam"
                />
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-0.5 rounded-lg hover:bg-rose-950/40 border border-rose-500/20 transition-colors ml-1 cursor-pointer"
                >
                  Hapus / Ulang
                </button>
              </div>
            </div>

            <div className="relative border-2 border-dashed border-cyan-500/30 rounded-xl overflow-hidden touch-none select-none bg-white">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair bg-white"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1 opacity-60 text-slate-500"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                  <p className="text-xs italic text-slate-500">Sentuh dengan jari atau gunakan stylus / mouse di sini</p>
                </div>
              )}
              {/* Garis tanda tangan dasar */}
              <div className="absolute bottom-6 left-8 right-8 border-b border-dashed border-slate-300 pointer-events-none"></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 italic">
              * Tanda tangan akan disimpan secara aman dan otomatis dicetak berdampingan dengan rekapitulasi bukti pengeluaran.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0B111B] border-t border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#151C28] text-slate-300 hover:text-white font-medium border border-slate-700 rounded-xl hover:bg-slate-800 text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-950/40 flex items-center gap-1.5 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Terapkan Tanda Tangan
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePadModal;
