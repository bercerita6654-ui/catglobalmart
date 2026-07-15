import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, FileImage, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductFlyer } from "../types";
import { getDriveImageUrl, getDriveDownloadUrl, isWithinLast24Hours } from "../utils/dataService";

interface FlyerDetailModalProps {
  product: ProductFlyer | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export const FlyerDetailModal: React.FC<FlyerDetailModalProps> = ({ 
  product, 
  onClose,
  onPrev,
  onNext
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Touch Swipe coordinates
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset image status when product changes
  useEffect(() => {
    if (product) {
      setImgError(false);
      setImgLoading(true);
    }
  }, [product]);

  // Handle outside click, Escape, and Arrow keys to navigate
  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [product, onClose, onPrev, onNext]);

  if (!product) return null;

  const activeImageId = product.gambarStory;
  const activeImageUrl = activeImageId ? getDriveImageUrl(activeImageId) : "";

  // Handle Touch Events
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onNext) {
      onNext();
    } else if (isRightSwipe && onPrev) {
      onPrev();
    }
  };

  const handleDownload = async () => {
    if (!activeImageId) return;
    setDownloading(true);
    const imageUrl = getDriveImageUrl(activeImageId);
    const sanitizedCode = (product.code || "product").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${sanitizedCode}.png`;

    try {
      const response = await fetch(imageUrl, {
        referrerPolicy: "no-referrer"
      });
      if (!response.ok) throw new Error("Gagal mengunduh gambar");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Direct blob download failed, falling back to direct drive URL download", e);
      const downloadUrl = getDriveDownloadUrl(activeImageId);
      window.open(downloadUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Sheet body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[95vh] p-6"
        >
          {/* Close button top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-900/10 hover:bg-slate-900/25 text-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} className="stroke-[2.5]" />
          </button>

          {/* Header */}
          {(() => {
            const isNew = isWithinLast24Hours(product.lastUpdate || product.lastUpdate1);
            return (
              <div className="mb-4 pr-10">
                <h3 className="text-base font-black text-slate-950 tracking-tight leading-snug">
                  {product.description}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    SKU: {product.code}
                  </span>
                  {isNew && (
                    <span className="text-[10px] font-black text-white bg-rose-600 border border-rose-500/80 px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                      <Sparkles size={10} className="fill-current stroke-[2.5]" />
                      New Update
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Flyer Image Container */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative flex-grow flex items-center justify-center bg-slate-100/60 rounded-2xl border border-slate-200 overflow-hidden p-2 min-h-[300px] md:min-h-[480px] group"
          >
            {/* Left navigation arrow */}
            {onPrev && (
              <button
                onClick={onPrev}
                className="absolute left-3.5 z-20 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-slate-200 text-slate-800 hover:text-blue-900 shadow-md transition-all cursor-pointer opacity-85 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
                aria-label="Flyer Sebelumnya"
              >
                <ChevronLeft size={22} className="stroke-[2.5]" />
              </button>
            )}

            {/* Right navigation arrow */}
            {onNext && (
              <button
                onClick={onNext}
                className="absolute right-3.5 z-20 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-slate-200 text-slate-800 hover:text-blue-900 shadow-md transition-all cursor-pointer opacity-85 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
                aria-label="Flyer Berikutnya"
              >
                <ChevronRight size={22} className="stroke-[2.5]" />
              </button>
            )}

            {activeImageUrl && !imgError ? (
              <>
                {imgLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 gap-2 z-10">
                    <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-t-blue-900 animate-spin" />
                    <span className="text-xs font-bold text-slate-600">Mengunduh dari Google Drive...</span>
                  </div>
                )}
                <img
                  src={activeImageUrl}
                  alt={product.description}
                  referrerPolicy="no-referrer"
                  onLoad={() => setImgLoading(false)}
                  onError={() => {
                    setImgError(true);
                    setImgLoading(false);
                  }}
                  className={`max-h-[60vh] max-w-full object-contain transition-all duration-300 rounded-xl select-none pointer-events-none ${
                    imgLoading ? "scale-95 opacity-0" : "scale-100 opacity-100"
                  }`}
                />
              </>
            ) : (
              /* No Image Attached / Error Placeholder */
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="p-3.5 rounded-full bg-slate-100 text-slate-400 mb-3">
                  <FileImage size={32} className="stroke-[2]" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {imgError ? "Gagal Memuat Gambar" : "Gambar Belum Tersedia"}
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px] leading-relaxed font-semibold">
                  {imgError 
                    ? "Terjadi masalah saat mengakses server Google Drive."
                    : "Produk ini belum melampirkan file gambar flyer."}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Actions: Just Download Button */}
          {activeImageId && (
            <div className="mt-4">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-900/10 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} className="stroke-[2.5]" />
                <span>{downloading ? "Sedang Mengunduh..." : `Unduh Gambar (${product.code}.png)`}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
