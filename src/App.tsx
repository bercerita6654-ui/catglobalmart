import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  RefreshCw, 
  X, 
  HelpCircle, 
  Info, 
  SlidersHorizontal, 
  ArrowUpDown, 
  TrendingUp, 
  Grid2X2,
  Layers3,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  DownloadCloud,
  CheckSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import { ProductFlyer, Stats } from "./types";
import { 
  fetchProductFlyers, 
  extractFilterOptions, 
  calculateStats,
  isWithinLast24Hours,
  getDriveImageUrl,
  GOOGLE_SHEETS_CSV_URL,
  hasProductImage 
} from "./utils/dataService";
import { StatsDashboard } from "./components/StatsDashboard";
import { FlyerCard } from "./components/FlyerCard";
import { FlyerDetailModal } from "./components/FlyerDetailModal";

export default function App() {
  // Main state
  const [products, setProducts] = useState<ProductFlyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("");
  const [metricFilter, setMetricFilter] = useState<"all" | "flyer" | "photo" | "recent">("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(24);

  // Interaction states
  const [selectedProduct, setSelectedProduct] = useState<ProductFlyer | null>(null);
  const [showDriveInfo, setShowDriveInfo] = useState<boolean>(false);

  // Bulk Download States
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  
  // Custom Selection States
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedProductCodes, setSelectedProductCodes] = useState<Set<string>>(new Set());

  // Filter panel collapse state (Closed by default on mobile, open by default on desktop)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true);
  const [isBulkPanelOpen, setIsBulkPanelOpen] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsFilterPanelOpen(false);
      setIsBulkPanelOpen(false);
    }
  }, []);

  // Bulk download select targets
  const [bulkDownloadCategory, setBulkDownloadCategory] = useState<string>("");
  const [bulkDownloadBrand, setBulkDownloadBrand] = useState<string>("");

  // Handler to toggle custom selection mode
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedProductCodes(new Set()); // Clear any previous selection
  };

  // Helper to package and download flyer images as a ZIP archive
  const downloadFlyersAsZip = async (productsToDownload: ProductFlyer[], zipFileName: string) => {
    // Only download products that actually have valid flyer images
    const productsWithImages = productsToDownload.filter(p => p.gambarStory !== "" || p.fotoProduk !== "");
    
    if (productsWithImages.length === 0) {
      alert("Tidak ada gambar flyer yang tersedia untuk produk terpilih.");
      return;
    }

    setDownloadingZip(true);
    setDownloadProgress({ current: 0, total: productsWithImages.length, label: "Mengkoneksikan..." });

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < productsWithImages.length; i++) {
        const product = productsWithImages[i];
        const imageId = product.gambarStory || product.fotoProduk;
        const imageUrl = getDriveImageUrl(imageId);

        setDownloadProgress({
          current: i + 1,
          total: productsWithImages.length,
          label: `${product.description.substring(0, 20)}...`
        });

        try {
          const response = await fetch(imageUrl, { referrerPolicy: "no-referrer" });
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const blob = await response.blob();
          
          // Clean product description for a safe, valid file name
          const cleanDesc = product.description.replace(/[\\/:*?"<>|]/g, "_").substring(0, 45);
          const fileName = `${product.code} - ${cleanDesc}.jpg`;
          
          zip.file(fileName, blob);
        } catch (err) {
          console.error(`Failed to download image for ${product.code}:`, err);
        }
      }

      setDownloadProgress({
        current: productsWithImages.length,
        total: productsWithImages.length,
        label: "Mengemas ke format ZIP..."
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${zipFileName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating ZIP:", error);
      alert("Gagal membuat berkas ZIP. Silakan coba lagi.");
    } finally {
      setDownloadingZip(false);
      setDownloadProgress(null);
    }
  };

  // Reset page when any filter, search query, or sorting is updated
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, selectedSubCategory, metricFilter, sortBy]);

  // Fetch data on load
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchProductFlyers();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "Gagal mengambil data dari spreadsheet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Only include products that have valid photos or flyer images
  const productsWithFlyers = useMemo(() => {
    return products.filter((p) => hasProductImage(p));
  }, [products]);

  // Filter lists derived from products with flyers
  const { categories, brands, subCategories } = useMemo(() => {
    return extractFilterOptions(productsWithFlyers);
  }, [productsWithFlyers]);

  // Overall statistics from products with flyers
  const stats: Stats = useMemo(() => {
    return calculateStats(productsWithFlyers);
  }, [productsWithFlyers]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    let result = [...productsWithFlyers];

    // 1. Filter by Search Query (Description, Code, Barcode, Kategori, Merk)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.description.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query) ||
          p.kategori.toLowerCase().includes(query) ||
          p.merk.toLowerCase().includes(query)
      );
    }

    // 2. Filter by dropdown Kategori
    if (selectedCategory) {
      result = result.filter((p) => p.kategori === selectedCategory);
    }

    // 3. Filter by dropdown Brand / Merk
    if (selectedBrand) {
      result = result.filter((p) => p.merk === selectedBrand);
    }

    // 4. Filter by dropdown SubKategori
    if (selectedSubCategory) {
      result = result.filter((p) => p.subKategori === selectedSubCategory);
    }

    // 5. Filter by Dashboard metric selection
    if (metricFilter === "flyer") {
      result = result.filter((p) => p.gambarStory !== "");
    } else if (metricFilter === "photo") {
      result = result.filter((p) => p.fotoProduk !== "");
    } else if (metricFilter === "recent") {
      result = result.filter((p) => isWithinLast24Hours(p.lastUpdate || p.lastUpdate1));
    }

    // 6. Sort results
    result.sort((a, b) => {
      if (sortBy === "newest") {
        // Compare date strings (format: DD-MM-YYYY HH:mm:ss)
        // If empty, sort to end
        const timeA = parseDateStringToTime(a.lastUpdate || a.lastUpdate1);
        const timeB = parseDateStringToTime(b.lastUpdate || b.lastUpdate1);
        return timeB - timeA;
      }
      if (sortBy === "oldest") {
        const timeA = parseDateStringToTime(a.lastUpdate || a.lastUpdate1);
        const timeB = parseDateStringToTime(b.lastUpdate || b.lastUpdate1);
        return timeA - timeB;
      }
      if (sortBy === "name_asc") {
        return a.description.localeCompare(b.description);
      }
      if (sortBy === "name_desc") {
        return b.description.localeCompare(a.description);
      }
      if (sortBy === "price_asc") {
        const priceA = parseNumericPrice(a.hrgBaru || a.eceran);
        const priceB = parseNumericPrice(b.hrgBaru || b.eceran);
        return priceA - priceB;
      }
      if (sortBy === "price_desc") {
        const priceA = parseNumericPrice(a.hrgBaru || a.eceran);
        const priceB = parseNumericPrice(b.hrgBaru || b.eceran);
        return priceB - priceA;
      }
      if (sortBy === "stock_desc") {
        return b.qty - a.qty;
      }
      return 0;
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedSubCategory, metricFilter, sortBy]);

  // Derive total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  }, [filteredProducts, itemsPerPage]);

  // Derive paginated products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Clean filters helper
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedBrand("");
    setSelectedSubCategory("");
    setMetricFilter("all");
    setSortBy("newest");
    setSelectedProductCodes(new Set());
    setIsSelectionMode(false);
  };

  // Check if any filter is active
  const isAnyFilterActive = useMemo(() => {
    return (
      searchQuery !== "" ||
      selectedCategory !== "" ||
      selectedBrand !== "" ||
      selectedSubCategory !== "" ||
      metricFilter !== "all"
    );
  }, [searchQuery, selectedCategory, selectedBrand, selectedSubCategory, metricFilter]);

  // Helper: Generate visible page numbers for pagination
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include 1
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }
      
      if (start > 2) {
        pages.push("...");
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push("...");
      }
      
      // Always include last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  // Helper: Extract date time number
  function parseDateStringToTime(dateStr: string): number {
    if (!dateStr || dateStr.trim() === "") return 0;
    try {
      const parts = dateStr.split(" ");
      const dParts = parts[0].split("-");
      const day = parseInt(dParts[0], 10);
      const month = parseInt(dParts[1], 10) - 1;
      const year = parseInt(dParts[2], 10);
      
      let hour = 0, min = 0, sec = 0;
      if (parts[1]) {
        const tParts = parts[1].split(":");
        hour = parseInt(tParts[0], 10) || 0;
        min = parseInt(tParts[1], 10) || 0;
        sec = parseInt(tParts[2], 10) || 0;
      }
      return new Date(year, month, day, hour, min, sec).getTime();
    } catch {
      return 0;
    }
  }

  // Helper: parse Indonesian style currency dot format
  function parseNumericPrice(priceStr: string): number {
    if (!priceStr) return 0;
    const cleanStr = priceStr.replace(/[^\d]/g, "");
    return parseInt(cleanStr, 10) || 0;
  }

  // Live Date label in Indonesian for Header
  const getTodayDateString = () => {
    const today = new Date();
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans text-slate-900 selection:bg-yellow-400 selection:text-blue-950">
      {/* Top Banner & Navigation Header in Blue, Yellow, White theme */}
      <header className="sticky top-0 z-30 bg-blue-900 text-white border-b border-blue-950 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Brand text */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center text-blue-950 shadow-md shrink-0">
              <Layers3 size={20} className="stroke-[2.5] text-blue-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
                <span className="text-[10px] font-extrabold text-yellow-300 uppercase tracking-widest leading-none">
                  Katalog Digital
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight leading-tight mt-0.5">
                FLYER PRODUCT GLOBAL MART
              </h1>
            </div>
          </div>

          {/* Right Action buttons (Refresh & Date badge) */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Today Date (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 bg-white/10 border border-white/20 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-100 shadow-xs">
              <Calendar size={13} className="text-yellow-400 stroke-[2.5]" />
              <span>{getTodayDateString()}</span>
            </div>

            {/* Manual Refresh Trigger in vibrant Yellow */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-blue-950 font-extrabold rounded-xl text-xs shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50`}
            >
              <RefreshCw size={13} className={`stroke-[3] ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Body container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Statistics Dashboard widgets - acts as quick filters */}
        <StatsDashboard 
          stats={stats} 
          activeFilter={metricFilter} 
          onFilterChange={(filterKey) => setMetricFilter(filterKey)} 
        />

        {/* Main interactive search, filter and sorting panel */}
        <div className="sticky top-[80px] z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-lg p-4 mb-6">
          <div 
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center justify-between gap-4 cursor-pointer select-none transition-all ${
              isFilterPanelOpen ? "border-b border-slate-100 pb-4 mb-5" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-slate-700 stroke-[2.5]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-755">
                Panel Filter & Cari
              </h3>
              {/* Active filters indicator */}
              {isAnyFilterActive && (
                <span className="bg-blue-100 text-blue-800 text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Aktif
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* Active filters counter / Clear triggers */}
              {isAnyFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  <X size={12} className="stroke-[3]" />
                  Reset Filter
                </button>
              )}

              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label={isFilterPanelOpen ? "Sembunyikan Filter" : "Tampilkan Filter"}
              >
                {isFilterPanelOpen ? (
                  <ChevronUp size={16} className="stroke-[2.5]" />
                ) : (
                  <ChevronDown size={16} className="stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isFilterPanelOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* Search Input */}
                  <div className="md:col-span-4 relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500">
                      <Search size={16} className="stroke-[2.5]" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari deskripsi, kode, barcode..."
                      className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-150 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-semibold shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer"
                      >
                        <X size={14} className="stroke-[3]" />
                      </button>
                    )}
                  </div>

                  {/* Category Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-150 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-semibold shadow-xs cursor-pointer"
                    >
                      <option value="">Semua Kategori ({categories.length})</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-150 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-semibold shadow-xs cursor-pointer"
                    >
                      <option value="">Semua Merk ({brands.length})</option>
                      {brands.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sorting Dropdown */}
                  <div className="md:col-span-2 relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                      <ArrowUpDown size={14} className="stroke-[2.5]" />
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-150 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm transition-all outline-none text-slate-800 font-semibold shadow-xs cursor-pointer"
                    >
                      <option value="newest">Terbaru Di-update</option>
                      <option value="oldest">Terlama Di-update</option>
                      <option value="name_asc">Nama (A-Z)</option>
                      <option value="name_desc">Nama (Z-A)</option>
                    </select>
                  </div>

                </div>

                {/* Sub-Category pills (Dynamic row depending on selected Category) */}
                {selectedCategory && subCategories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sub Kategori:</span>
                    <button
                      onClick={() => setSelectedSubCategory("")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
                        selectedSubCategory === "" 
                          ? "bg-blue-900 text-white border-blue-900 shadow-sm" 
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:-translate-y-0.5"
                      }`}
                    >
                      Semua
                    </button>
                    {subCategories
                      .filter((sub) => {
                        // Only show subcategories that exist in the selected category
                        return productsWithFlyers.some((p) => p.kategori === selectedCategory && p.subKategori === sub);
                      })
                      .filter(Boolean)
                      .map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setSelectedSubCategory(sub)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
                            selectedSubCategory === sub
                              ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:-translate-y-0.5"
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bulk Download Panel - Compact & Integrated style */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-slate-800">
          <div 
            onClick={() => setIsBulkPanelOpen(!isBulkPanelOpen)}
            className={`flex items-center justify-between gap-4 cursor-pointer select-none transition-all ${
              isBulkPanelOpen ? "mb-3 pb-2 border-b border-slate-200/60" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Download size={14} className="text-blue-600 stroke-[2.5]" />
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Unduh Banyak Flyer Sekaligus (ZIP)
              </h3>
              {isSelectionMode && (
                <span className="bg-emerald-100 text-emerald-850 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  Checklist Aktif ({selectedProductCodes.size})
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsBulkPanelOpen(!isBulkPanelOpen);
              }}
              className="p-1 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              aria-label={isBulkPanelOpen ? "Sembunyikan Panel Unduh" : "Tampilkan Panel Unduh"}
            >
              {isBulkPanelOpen ? (
                <ChevronUp size={14} className="stroke-[2.5]" />
              ) : (
                <ChevronDown size={14} className="stroke-[2.5]" />
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isBulkPanelOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Download by Category */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">1. Berdasarkan Kategori</h4>
                      <p className="text-[10px] text-slate-500 mb-2 font-semibold leading-relaxed">Unduh seluruh flyer dalam satu kategori sekaligus.</p>
                      <select
                        value={bulkDownloadCategory}
                        onChange={(e) => setBulkDownloadCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-lg text-[11px] font-bold transition-all outline-none text-slate-800 cursor-pointer"
                      >
                        <option value="" className="text-slate-500">Pilih Kategori...</option>
                        {categories.map((cat) => {
                          const count = products.filter(p => p.kategori === cat && (p.gambarStory || p.fotoProduk)).length;
                          return (
                            <option key={cat} value={cat} className="text-slate-800 font-semibold">
                              {cat} ({count} gambar)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (!bulkDownloadCategory) return;
                        const targets = products.filter(p => p.kategori === bulkDownloadCategory);
                        downloadFlyersAsZip(targets, `Flyer_Kategori_${bulkDownloadCategory.replace(/\s+/g, '_')}`);
                      }}
                      disabled={!bulkDownloadCategory || downloadingZip}
                      className="mt-2.5 w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <DownloadCloud size={12} className="stroke-[2.5]" />
                      Unduh Kategori
                    </button>
                  </div>

                  {/* Download by Brand */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">2. Berdasarkan Merk</h4>
                      <p className="text-[10px] text-slate-500 mb-2 font-semibold leading-relaxed">Unduh seluruh flyer dengan merk yang sama sekaligus.</p>
                      <select
                        value={bulkDownloadBrand}
                        onChange={(e) => setBulkDownloadBrand(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-lg text-[11px] font-bold transition-all outline-none text-slate-800 cursor-pointer"
                      >
                        <option value="" className="text-slate-500">Pilih Merk...</option>
                        {brands.map((brand) => {
                          const count = products.filter(p => p.merk === brand && (p.gambarStory || p.fotoProduk)).length;
                          return (
                            <option key={brand} value={brand} className="text-slate-800 font-semibold">
                              {brand} ({count} gambar)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (!bulkDownloadBrand) return;
                        const targets = products.filter(p => p.merk === bulkDownloadBrand);
                        downloadFlyersAsZip(targets, `Flyer_Merk_${bulkDownloadBrand.replace(/\s+/g, '_')}`);
                      }}
                      disabled={!bulkDownloadBrand || downloadingZip}
                      className="mt-2.5 w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <DownloadCloud size={12} className="stroke-[2.5]" />
                      Unduh Merk
                    </button>
                  </div>

                  {/* Custom selection trigger */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3 flex flex-col justify-between shadow-xs">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">3. Pilihan Bebas / Kustom</h4>
                      <p className="text-[10px] text-slate-500 mb-2 font-semibold leading-relaxed">Pilih sendiri flyer produk yang diinginkan lewat checklist.</p>
                      <div className="text-[10px] font-bold py-1 px-2.5 rounded bg-blue-50 text-blue-700 border border-blue-100 inline-block mb-1 font-mono">
                        {isSelectionMode ? `Mode Aktif: ${selectedProductCodes.size} terpilih` : "Mode Nonaktif"}
                      </div>
                    </div>
                    <button
                      onClick={handleToggleSelectionMode}
                      disabled={downloadingZip}
                      className={`mt-2.5 w-full py-1.5 font-extrabold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isSelectionMode 
                          ? "bg-rose-600 hover:bg-rose-700 text-white" 
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {isSelectionMode ? (
                        <>
                          <X size={12} className="stroke-[2.5]" />
                          Matikan Checklist
                        </>
                      ) : (
                        <>
                          <CheckSquare size={12} className="stroke-[2.5]" />
                          Aktifkan Checklist
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Callout state */}
        {error && (
          <div className="p-6 mb-8 rounded-2xl bg-rose-50 border border-rose-100 text-rose-950 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-rose-500 stroke-[2.5] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-950 uppercase tracking-wide">Gagal Memuat Data Produk</h4>
                <p className="text-xs text-rose-700 mt-1 font-semibold">{error}</p>
              </div>
            </div>
            <button
              onClick={() => loadData()}
              className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading / Skeleton State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4 animate-pulse overflow-hidden"
              >
                <div className="aspect-[3/4] bg-slate-100 border border-dashed border-slate-200 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-100 rounded w-1/2" />
                  <div className="h-5 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Products Display Grid / Empty state */
          <>
            {/* Header counters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {filteredProducts.length > 0 ? (
                  <>
                    Menampilkan <span className="text-sky-600 font-extrabold">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> dari <span className="text-slate-900 font-extrabold">{filteredProducts.length}</span> Flyer (Halaman {currentPage} dari {totalPages})
                  </>
                ) : (
                  `Menampilkan 0 dari ${filteredProducts.length} Flyer`
                )}
              </p>
              <div className="flex items-center gap-2">
                {filteredProducts.length > 0 && (
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs text-[11px] font-bold text-slate-700">
                    <span className="text-slate-400 uppercase tracking-wide">Tampilkan:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-transparent border-none focus:outline-none focus:ring-0 font-bold cursor-pointer pr-1"
                    >
                      <option value="12">12</option>
                      <option value="24">24</option>
                      <option value="48">48</option>
                      <option value="96">96</option>
                    </select>
                  </div>
                )}
                {isAnyFilterActive && (
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1.5 rounded-lg shadow-xs uppercase">
                    Filter Aktif
                  </span>
                )}
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={`${currentPage}-${searchQuery}-${selectedCategory}-${selectedBrand}-${selectedSubCategory}-${metricFilter}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-6"
                  >
                    {paginatedProducts.map((product) => (
                      <FlyerCard 
                        key={product.code} 
                        product={product} 
                        onOpenDetails={(p) => setSelectedProduct(p)} 
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedProductCodes.has(product.code)}
                        onToggleSelect={(code) => {
                          setSelectedProductCodes((prev) => {
                            const next = new Set(prev);
                            if (next.has(code)) {
                              next.delete(code);
                            } else {
                              next.add(code);
                            }
                            return next;
                          });
                        }}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-100/30">
                    <div className="text-xs font-semibold text-slate-500">
                      Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari <span className="font-bold text-slate-800">{totalPages}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* First Page */}
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          currentPage === 1
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                        title="Halaman Pertama"
                      >
                        <ChevronsLeft size={16} className="stroke-[2.5]" />
                      </button>

                      {/* Prev Page */}
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          currentPage === 1
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                        title="Halaman Sebelumnya"
                      >
                        <ChevronLeft size={16} className="stroke-[2.5]" />
                      </button>

                      {/* Numeric Pages */}
                      {getPageNumbers().map((pageNum, index) => {
                        if (pageNum === "...") {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-3 py-2 text-xs font-bold text-slate-400 select-none"
                            >
                              ...
                            </span>
                          );
                        }

                        const isCurrent = pageNum === currentPage;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => setCurrentPage(pageNum as number)}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/15"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {/* Next Page */}
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          currentPage === totalPages
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                        title="Halaman Berikutnya"
                      >
                        <ChevronRight size={16} className="stroke-[2.5]" />
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          currentPage === totalPages
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                        title="Halaman Terakhir"
                      >
                        <ChevronsRight size={16} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Beautiful Empty results placeholder */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-xl p-8 flex flex-col items-center justify-center max-w-lg mx-auto"
              >
                <div className="p-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-full mb-4 shadow-sm">
                  <Search size={32} className="stroke-[2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  Tidak Ada Hasil Ditemukan
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-[280px] leading-relaxed font-semibold">
                  Tidak ada flyer yang cocok dengan pencarian atau kriteria filter Anda saat ini.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-6 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-xs rounded-xl shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  Bersihkan Semua Filter
                </button>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Elegant, humble footer */}
      <footer className="bg-white border-t border-slate-100 py-10 mt-16 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-slate-900 font-extrabold">
            <Layers3 size={14} className="text-sky-500 stroke-[2.5]" />
            <span className="tracking-wide">FLYER PRODUCT GLOBAL MART</span>
          </div>
          <p className="max-w-md mx-auto leading-relaxed font-semibold text-slate-500">
            Aplikasi katalog real-time sinkronisasi cloud. Data diperbarui otomatis dari file Google Sheets "STOCK LIST".
          </p>
          <div className="h-0.5 bg-slate-100 max-w-xs mx-auto my-2" />
          <p className="font-mono text-[10px] font-semibold text-slate-400">
            Created by Bfrets Creative
          </p>
        </div>
      </footer>

      {/* Large detail viewer modal overlay */}
      <FlyerDetailModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onPrev={() => {
          if (!selectedProduct || filteredProducts.length === 0) return;
          const currentIndex = filteredProducts.findIndex((p) => p.code === selectedProduct.code);
          if (currentIndex === -1) return;
          const prevIndex = (currentIndex - 1 + filteredProducts.length) % filteredProducts.length;
          setSelectedProduct(filteredProducts[prevIndex]);
        }}
        onNext={() => {
          if (!selectedProduct || filteredProducts.length === 0) return;
          const currentIndex = filteredProducts.findIndex((p) => p.code === selectedProduct.code);
          if (currentIndex === -1) return;
          const nextIndex = (currentIndex + 1) % filteredProducts.length;
          setSelectedProduct(filteredProducts[nextIndex]);
        }}
      />

      {/* Downloading Zip Progress Overlay */}
      {downloadingZip && downloadProgress && (
        <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 relative">
              <DownloadCloud size={30} className="animate-bounce" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-600/25 border-t-blue-600 animate-spin" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Menyiapkan Unduhan ZIP</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-semibold">
              Sedang memproses dan mengemas flyer produk terpilih ke dalam arsip ZIP. Mohon tidak menutup halaman ini.
            </p>
            
            <div className="w-full mt-6 bg-slate-100 border border-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between w-full mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="truncate max-w-[200px] text-left">{downloadProgress.label}</span>
              <span>{downloadProgress.current} / {downloadProgress.total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Selection Bar for Custom Selection */}
      {isSelectionMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center gap-4 max-w-[calc(100%-2rem)] w-full sm:w-auto">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {selectedProductCodes.size} produk terpilih
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={() => {
                // Select all currently visible filtered products
                const allCurrentCodes = filteredProducts.map(p => p.code);
                setSelectedProductCodes(new Set(allCurrentCodes));
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Pilih Semua ({filteredProducts.length})
            </button>
            <button
              onClick={() => {
                setSelectedProductCodes(new Set());
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Bersihkan
            </button>
            <button
              onClick={() => {
                if (selectedProductCodes.size === 0) {
                  alert("Silakan pilih minimal 1 produk terlebih dahulu.");
                  return;
                }
                const targets = products.filter(p => selectedProductCodes.has(p.code));
                downloadFlyersAsZip(targets, `Flyer_Pilihan_Kustom_${Date.now()}`);
              }}
              disabled={selectedProductCodes.size === 0 || downloadingZip}
              className="px-4.5 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-400 text-blue-950 font-extrabold rounded-xl text-[11px] shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5"
            >
              <DownloadCloud size={13} className="stroke-[3]" />
              Unduh ZIP
            </button>
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedProductCodes(new Set());
              }}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 rounded-xl cursor-pointer transition-all"
              title="Batal"
            >
              <X size={14} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
