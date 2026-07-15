import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  Package, 
  Tag, 
  Layers, 
  Sparkles, 
  Eye, 
  AlertCircle,
  FileImage,
  Smartphone
} from "lucide-react";
import { ProductFlyer } from "../types";
import { 
  formatUpdateDate, 
  formatRupiah, 
  getDriveImageUrl,
  isWithinLast24Hours
} from "../utils/dataService";

interface FlyerCardProps {
  product: ProductFlyer;
  onOpenDetails: (product: ProductFlyer) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (code: string) => void;
}

export const FlyerCard: React.FC<FlyerCardProps> = ({ 
  product, 
  onOpenDetails,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  // Only display image from Column 20 (gambarStory)
  const imageId = product.gambarStory;
  const isStory = true;

  const imageUrl = imageId ? getDriveImageUrl(imageId) : "";
  const lastUpdateFormatted = formatUpdateDate(product.lastUpdate);
  const isNew = isWithinLast24Hours(product.lastUpdate || product.lastUpdate1);

  // Color mappings based on category for rich visual rhythm
  const getCategoryColor = (cat: string) => {
    const text = (cat || "").toLowerCase();
    if (text.includes("isolasi") || text.includes("tape")) return "bg-blue-50 text-blue-700 border-blue-100/70";
    if (text.includes("cat") || text.includes("paint")) return "bg-purple-50 text-purple-700 border-purple-100/70";
    if (text.includes("kunci") || text.includes("lock")) return "bg-amber-50 text-amber-700 border-amber-100/70";
    if (text.includes("pipa") || text.includes("fitting")) return "bg-emerald-50 text-emerald-700 border-emerald-100/70";
    return "bg-slate-50 text-slate-700 border-slate-200/60";
  };

  const handleCardClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(product.code);
    } else {
      onOpenDetails(product);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      onClick={handleCardClick}
      className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-300 ease-out overflow-hidden cursor-pointer select-none ${
        isSelected 
          ? "border-blue-600 ring-4 ring-blue-100 shadow-lg scale-[1.02]" 
          : "border-slate-150/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:scale-[1.02] hover:-translate-y-1"
      }`}
    >
      {/* Floating Selection Checkbox Overlay */}
      {isSelectionMode && (
        <div className="absolute top-3 right-3 z-30">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-sm transition-all duration-200 ${
            isSelected 
              ? "bg-blue-600 border-blue-600 text-white scale-110" 
              : "bg-white/90 backdrop-blur-md border-slate-300 text-transparent"
          }`}>
            {isSelected && (
              <svg className="w-3.5 h-3.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Top badges floating over image */}
      <div className="absolute top-3 left-3 max-w-[85%] z-10 flex items-center justify-between pointer-events-none">
        <div className="flex flex-wrap gap-1.5">
          {product.merk && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white/90 backdrop-blur-md border border-slate-200/80 px-2.5 py-1 rounded-full uppercase tracking-wide shadow-xs">
              <Tag size={10} className="stroke-[2.5]" />
              {product.merk}
            </span>
          )}
          {isNew && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-white bg-rose-600 border border-rose-500/80 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
              <Sparkles size={10} className="fill-current stroke-[2.5]" />
              New Update
            </span>
          )}
        </div>
      </div>

      {/* Image container */}
      <div className="relative aspect-[3/4] bg-zinc-50 overflow-hidden flex items-center justify-center border-b border-slate-100">
        {imageUrl && !imgError ? (
          <>
            {imgLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50 gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Memuat Flyer...</span>
              </div>
            )}
            <img
              src={imageUrl}
              alt={product.description}
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgError(true);
                setImgLoading(false);
              }}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${
                imgLoading ? "opacity-0" : "opacity-100"
              }`}
            />
          </>
        ) : (
          /* Fallback No flyer state */
          <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center bg-zinc-50 relative">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3 group-hover:scale-110 transition-transform duration-300">
              <FileImage size={28} className="stroke-[2]" />
            </div>
            <p className="text-xs font-bold text-slate-600 max-w-[150px] leading-relaxed">
              {imgError ? "Gagal Memuat Gambar" : "Gambar Belum Tersedia"}
            </p>
            <p className="text-[10px] font-mono text-slate-400 mt-1">
              {product.barcode || product.code}
            </p>
          </div>
        )}

        {/* Hover overlay with action button in vibrant Yellow and Blue theme */}
        {!isSelectionMode && (
          <div className="absolute inset-0 bg-blue-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4.5 py-2.5 bg-yellow-400 text-blue-950 font-extrabold text-xs rounded-full border border-yellow-300 shadow-lg hover:bg-yellow-500 transition-colors cursor-pointer"
            >
              <Eye size={14} className="stroke-[2.5]" />
              Lihat Flyer Detail
            </motion.button>
          </div>
        )}
      </div>

      {/* Info body - Structured as a highly styled retail ticket */}
      <div className="p-4 flex flex-col flex-grow bg-white">
        {/* Category & Code row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getCategoryColor(product.kategori)}`}>
            {product.kategori || "UMUM"}
          </span>
          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
            {product.code}
          </span>
        </div>

        {/* Title / Description */}
        <h3 className="font-bold text-sm text-slate-800 group-hover:text-sky-600 transition-colors duration-200 leading-snug flex-grow mb-3" title={product.description}>
          {product.description}
        </h3>

        {/* Actions & Updates styled elegantly */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="p-2 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-150 rounded-xl flex items-center gap-1.5 transition-all font-bold text-xs shrink-0 select-none cursor-pointer shadow-xs hover:-translate-y-0.5 active:translate-y-0"
          >
            <Eye size={13} className="text-blue-900 stroke-[2.5]" />
            <span>{isSelectionMode ? (isSelected ? "Terpilih" : "Pilih") : "Lihat Detail"}</span>
          </button>
          
          <div className="text-right flex flex-col items-end">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 justify-end">
              <Calendar size={10} className="stroke-[2.5]" />
              Update
            </span>
            <span className="text-[9px] font-medium text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md mt-1 max-w-[110px] truncate" title={lastUpdateFormatted}>
              {product.lastUpdate ? product.lastUpdate.split(" ")[0] : "Belum diupdate"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
