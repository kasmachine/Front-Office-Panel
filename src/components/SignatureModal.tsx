import React, { useRef, useState, useEffect } from 'react';
import { Edit3, RotateCcw, Check, X, Trash2, PenTool, CheckCircle2 } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
  initialSignature?: string | null;
  signerName?: string;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'เซ็นชื่อดิจิทัล (E-Signature)',
  initialSignature,
  signerName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0f172a'); // slate-900 / dark blue
  const [lineWidth, setLineWidth] = useState(2.5);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high DPI scaling
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = lineWidth;

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw initial signature if exists
      if (initialSignature) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = initialSignature;
      } else {
        setHasDrawn(false);
      }
    }
  }, [isOpen]);

  // Update pen styles when changed
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = lineWidth;
      }
    }
  }, [penColor, lineWidth]);

  if (!isOpen) return null;

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault();
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!canvasRef.current || !hasDrawn) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              {signerName && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  สำหรับ: <span className="font-bold text-slate-800 dark:text-slate-200">{signerName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Controls Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-400">สีหมึก:</span>
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-transform ${
                  penColor === '#0f172a' ? 'scale-110 border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'
                }`}
                title="หมึกสีน้ำเงินเข้ม/ดำ"
              />
              <button
                type="button"
                onClick={() => setPenColor('#1e40af')}
                className={`w-6 h-6 rounded-full bg-blue-800 border-2 transition-transform ${
                  penColor === '#1e40af' ? 'scale-110 border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'
                }`}
                title="หมึกสีน้ำเงิน"
              />
              <button
                type="button"
                onClick={() => setPenColor('#047857')}
                className={`w-6 h-6 rounded-full bg-emerald-700 border-2 transition-transform ${
                  penColor === '#047857' ? 'scale-110 border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'
                }`}
                title="หมึกสีเขียว"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ล้างทั้งหมด
              </button>
            </div>
          </div>

          {/* Canvas Box */}
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950/40 p-1 flex flex-col items-center justify-center overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 bg-transparent cursor-crosshair rounded-lg"
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                <Edit3 className="w-8 h-8 mb-1 opacity-50" />
                <span className="text-xs font-medium">ใช้นิ้วหรือเมาส์จรดลายเซ็นลงบนพื้นที่นี้</span>
              </div>
            )}

            {/* Signature Line */}
            <div className="absolute bottom-6 left-8 right-8 border-b border-slate-300 dark:border-slate-700 border-dashed pointer-events-none flex justify-end">
              <span className="text-[10px] text-slate-400 dark:text-slate-600 pr-1">ลายเซ็นดิจิทัล (Digital Signature)</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
            * ลายเซ็นดิจิทัลนี้จะถูกนำไปแสดงประทับในเอกสารแบบฟอร์มเพื่อยืนยันความถูกต้องและใช้อ้างอิงการอนุมัติ
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
              hasDrawn
                ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            บันทึกลายเซ็น (Apply Signature)
          </button>
        </div>
      </div>
    </div>
  );
};
