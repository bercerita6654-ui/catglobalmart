import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Download, 
  FileImage, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  Layers, 
  Tag, 
  Package, 
  Calendar 
} from "lucide-react";
import { ProductFlyer, GroupedCatalogFlyer } from "../types";
import { 
  getDriveImageUrl, 
  getDriveDownloadUrl, 
  isWithinLast24Hours, 
  formatRupiah, 
  formatUpdateDate 
} from "../utils/dataService";

interface FlyerDetailModalProps {
  item: GroupedCatalogFlyer | ProductFlyer | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export const FlyerDetailModal: React.FC<FlyerDetailModalProps> = ({ 
  item, 
  onClose,
  onPrev,
  onNext
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Touch Swipe coordinates
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset image status when item changes
  useEffect(() => {
    if (item) {
      setImgError(false);
      setImgLoading(true);
      setCopiedSku(null);
    }
  }, [item]);

  // Handle outside click, Escape, and Arrow keys to navigate
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose, onPrev, onNext]);

  if (!item) return null;

  // Determine if item is GroupedCatalogFlyer or ProductFlyer
  const isGrouped = "variations" in item;
  const primaryProduct: ProductFlyer = isGrouped ? item.primaryProduct : (item as ProductFlyer);
  const variations: ProductFlyer[] = isGrouped ? item.variations : [primaryProduct];
  const totalVariations = variations.length;

  const activeImageId = isGrouped ? item.gambarStory : primaryProduct.gambarStory;
  const activeImageUrl = activeImageId ? getDriveImageUrl(activeImageId) : "";

  const lastUpdate = isGrouped ? item.lastUpdate : (primaryProduct.lastUpdate || primaryProduct.lastUpdate1);
  const isNew = isGrouped ? item.isNew : isWithinLast24Hours(lastUpdate);

  // Touch handlers for mobile swipe
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSku(code);
    setTimeout(() => {
      setCopiedSku(null);
    }, 2000);
  };

  const handleDownload = async () => {
    if (!activeImageId) return;
    setDownloading(true);
    const imageUrl = getDriveImageUrl(activeImageId);
    const sanitizedCode = (primaryProduct.code || "catalog").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Catalog_${sanitizedCode}_${totalVariations}_SKU.png`;

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        />

        {/* Modal Sheet body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[92vh] p-4 sm:p-6 z-10"
        >
          {/* Close button top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={20} className="stroke-[2.5]" />
          </button>

          {/* Header */}
          <div className="mb-4 pr-10">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
                {primaryProduct.kategori || "UMUM"}
              </span>
              {primaryProduct.merk && (
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <Tag size={10} className="stroke-[2.5]" />
                  {primaryProduct.merk}
                </span>
              )}
              {totalVariations > 1 && (
                <span className="text-[10px] sm:text-xs font-black text-blue-900 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <Layers size={11} className="stroke-[2.5]" />
                  {totalVariations} SKU Variasi Tergabung
                </span>
              )}
              {isGrouped && item.variasiCode && (
                <span className="text-[10px] sm:text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <Package size={11} className="stroke-[2.5]" />
                  Variasi: {item.variasiCode}
                </span>
              )}
              {isNew && (
                <span className="text-[10px] font-black text-white bg-rose-600 border border-rose-500/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                  <Sparkles size={10} className="fill-current stroke-[2.5]" />
                  New Update
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
              {primaryProduct.description}
            </h3>
          </div>

          {/* Main content body: Image + SKU Variations table */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-5">
            {/* Flyer Image Container */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative flex items-center justify-center bg-slate-100/80 rounded-2xl border border-slate-200 overflow-hidden p-2 min-h-[260px] sm:min-h-[380px] max-h-[50vh] group"
            >
              {/* Left navigation arrow */}
              {onPrev && (
                <button
                  onClick={onPrev}
                  className="absolute left-3.5 z-20 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-slate-200 text-slate-800 hover:text-blue-900 shadow-md transition-all cursor-pointer opacity-85 hover:opacity-100 active:scale-90"
                  aria-label="Flyer Sebelumnya"
                >
                  <ChevronLeft size={22} className="stroke-[2.5]" />
                </button>
              )}

              {/* Right navigation arrow */}
              {onNext && (
                <button
                  onClick={onNext}
                  className="absolute right-3.5 z-20 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-slate-200 text-slate-800 hover:text-blue-900 shadow-md transition-all cursor-pointer opacity-85 hover:opacity-100 active:scale-90"
                  aria-label="Flyer Berikutnya"
                >
                  <ChevronRight size={22} className="stroke-[2.5]" />
                </button>
              )}

              {activeImageUrl && !imgError ? (
                <>
                  {imgLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 gap-2 z-10">
                      <div className="w-9 h-9 rounded-full border-2 border-slate-300 border-t-blue-900 animate-spin" />
                      <span className="text-xs font-bold text-slate-600">Mengunduh gambar catalog...</span>
                    </div>
                  )}
                  <img
                    src={activeImageUrl}
                    alt={primaryProduct.description}
                    referrerPolicy="no-referrer"
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgError(true);
                      setImgLoading(false);
                    }}
                    className={`max-h-[46vh] max-w-full object-contain transition-all duration-300 rounded-xl select-none pointer-events-none ${
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
                      : "Catalog ini belum memiliki lampiran berkas gambar flyer."}
                  </p>
                </div>
              )}
            </div>

            {/* List of SKU Variations Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-blue-900 stroke-[2.5]" />
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                    Daftar SKU / Variasi Produk ({totalVariations} SKU)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                  <Calendar size={12} className="stroke-[2.5]" />
                  Update: {formatUpdateDate(lastUpdate)}
                </span>
              </div>

              {/* Variations Table / Responsive Cards */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {variations.map((v, index) => (
                  <div 
                    key={v.code + "_" + index}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-lg bg-blue-100 text-blue-900 font-black text-[11px] flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            SKU: {v.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(v.code)}
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Salin Kode SKU"
                          >
                            {copiedSku === v.code ? (
                              <Check size={13} className="text-emerald-600 stroke-[3]" />
                            ) : (
                              <Copy size={13} className="stroke-[2.5]" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate" title={v.description}>
                          {v.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Harga Eceran / Baru</span>
                        <span className="text-xs font-black text-emerald-700">
                          {formatRupiah(v.hrgBaru || v.eceran)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Action: Download Catalog Image */}
          {activeImageId && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-900/10 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} className="stroke-[2.5]" />
                <span>{downloading ? "Sedang Mengunduh Catalog..." : `Unduh Gambar Catalog (${totalVariations} SKU)`}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
