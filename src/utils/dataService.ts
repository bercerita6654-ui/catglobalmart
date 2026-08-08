import { ProductFlyer, GroupedCatalogFlyer, Stats } from "../types";

// The published CSV Google Sheets URLs
export const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCxz1GPm7QU9IS1yBiSjvIdNTLUsvvplOCyT_R3XH4O-LuVbHoY_bXn1LTH5lpnlolJ29BhUgEdnFm/pub?gid=1564332470&single=true&output=csv";
export const GOOGLE_SHEETS_VARIATION_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCxz1GPm7QU9IS1yBiSjvIdNTLUsvvplOCyT_R3XH4O-LuVbHoY_bXn1LTH5lpnlolJ29BhUgEdnFm/pub?gid=2014848858&single=true&output=csv";

/**
 * Custom robust CSV parser to handle nested quotes, commas, and escaping correctly.
 */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let entry = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          entry += '"';
          i++; // Skip the second quote
        } else {
          inQuotes = false;
        }
      } else {
        entry += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(entry.trim());
        entry = "";
      } else if (char === "\r" || char === "\n") {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        row.push(entry.trim());
        // Only push rows that actually have some content
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          result.push(row);
        }
        row = [];
        entry = "";
      } else {
        entry += char;
      }
    }
  }

  if (row.length > 0 || entry !== "") {
    row.push(entry.trim());
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
      result.push(row);
    }
  }

  return result;
}

/**
 * Fetches variation mappings from the published "variasi" sheet
 */
export async function fetchVariationMap(): Promise<{
  codeMap: Map<string, string>;
  barcodeMap: Map<string, string>;
}> {
  const codeMap = new Map<string, string>();
  const barcodeMap = new Map<string, string>();

  try {
    const response = await fetch(`${GOOGLE_SHEETS_VARIATION_CSV_URL}&_cb=${Date.now()}`);
    if (!response.ok) return { codeMap, barcodeMap };

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) return { codeMap, barcodeMap };

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const codeIdx = headers.findIndex((h) => h.includes("code") || h.includes("sku") || h.includes("kode"));
    const barcodeIdx = headers.findIndex((h) => h.includes("barcode"));
    const variasiIdx = headers.findIndex((h) => h.includes("variasi"));

    const finalCodeIdx = codeIdx !== -1 ? codeIdx : 0;
    const finalBarcodeIdx = barcodeIdx !== -1 ? barcodeIdx : 1;
    const finalVariasiIdx = variasiIdx !== -1 ? variasiIdx : 3;

    const dataRows = rows.slice(1);
    dataRows.forEach((row) => {
      const sku = (row[finalCodeIdx] || "").trim().toLowerCase();
      const barcode = (row[finalBarcodeIdx] || "").trim().toLowerCase();
      const variasi = (row[finalVariasiIdx] || "").trim();

      if (variasi !== "") {
        if (sku !== "") codeMap.set(sku, variasi);
        if (barcode !== "") barcodeMap.set(barcode, variasi);
      }
    });
  } catch (error) {
    console.warn("Failed to fetch variation sheet:", error);
  }

  return { codeMap, barcodeMap };
}

/**
 * Helper to check if a product has a valid image (gambarStory, fotoProduk, or photo)
 */
export function hasProductImage(p: ProductFlyer): boolean {
  if (!p.gambarStory) return false;
  const clean = p.gambarStory.trim().toLowerCase();
  if (
    clean === "" ||
    clean === "-" ||
    clean === "0" ||
    clean === "null" ||
    clean === "undefined" ||
    clean === "none" ||
    clean.includes("belum tersedia") ||
    clean.includes("tidak ada") ||
    clean.includes("kosong") ||
    clean.includes("no image") ||
    clean.includes("not available")
  ) {
    return false;
  }

  const infoCheck = p.info ? p.info.trim().toLowerCase() : "";
  const statCheck = p.stat ? p.stat.trim().toLowerCase() : "";
  if (
    infoCheck.includes("belum tersedia") ||
    infoCheck.includes("tidak ada") ||
    statCheck.includes("belum tersedia") ||
    statCheck.includes("tidak ada")
  ) {
    return false;
  }

  return true;
}

/**
 * Fetches and processes the product flyers from the spreadsheet
 */
export async function fetchProductFlyers(): Promise<ProductFlyer[]> {
  try {
    const [productsRes, variationData] = await Promise.all([
      fetch(`${GOOGLE_SHEETS_CSV_URL}&_cb=${Date.now()}`),
      fetchVariationMap().catch(() => ({ codeMap: new Map(), barcodeMap: new Map() })),
    ]);

    if (!productsRes.ok) {
      throw new Error(`Failed to fetch spreadsheet data (Status ${productsRes.status})`);
    }

    const csvText = await productsRes.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return [];
    }

    const dataRows = rows.slice(1);
    const { codeMap, barcodeMap } = variationData;

    const rawFlyers: ProductFlyer[] = dataRows
      .map((row) => {
        const getVal = (index: number) => (row[index] || "").trim();

        const qtyParsed = parseInt(getVal(12).replace(/[^\d-]/g, "")) || 0;
        const code = getVal(0);
        const barcode = getVal(1);

        const variasiCode = 
          codeMap.get(code.toLowerCase()) || 
          barcodeMap.get(barcode.toLowerCase()) || 
          "";

        const flyer: ProductFlyer = {
          code,
          barcode,
          description: getVal(2),
          unit: getVal(3),
          kategori: getVal(4),
          subKategori: getVal(5),
          merk: getVal(6),
          hppAkhir: getVal(7),
          hppPpn: getVal(8),
          hppPM: getVal(9),
          eceran: getVal(10),
          hrgBaru: getVal(11),
          qty: qtyParsed,
          stat: getVal(13),
          photo: getVal(14),
          info: getVal(15),
          open: getVal(16),
          gambarStory: getVal(21), // Col V (Index 21) - ID Gambar
          lastUpdate: getVal(22),   // Col W (Index 22) - Tanggal Update Gambar
          fotoProduk: getVal(21),  // Col V
          lastUpdate1: getVal(22),  // Col W
          variasiCode: variasiCode !== "" ? variasiCode : undefined,
        };

        return flyer;
      })
      .filter((item) => item.code !== "" && item.description !== "");

    // Build map of variation code -> image ID from items that have valid images
    const variationImageMap = new Map<string, { gambarStory: string; lastUpdate: string }>();
    rawFlyers.forEach((p) => {
      if (p.variasiCode) {
        const key = p.variasiCode.toLowerCase();
        const img = p.gambarStory || p.fotoProduk;
        if (img && img.trim() !== "" && !variationImageMap.has(key)) {
          variationImageMap.set(key, {
            gambarStory: img,
            lastUpdate: p.lastUpdate || p.lastUpdate1 || ""
          });
        }
      }
    });

    // Inherit image for variation SKUs that don't have their own image
    rawFlyers.forEach((p) => {
      if ((!p.gambarStory || p.gambarStory.trim() === "") && p.variasiCode) {
        const key = p.variasiCode.toLowerCase();
        if (variationImageMap.has(key)) {
          const varData = variationImageMap.get(key)!;
          p.gambarStory = varData.gambarStory;
          p.fotoProduk = varData.gambarStory;
          if (!p.lastUpdate) p.lastUpdate = varData.lastUpdate;
          if (!p.lastUpdate1) p.lastUpdate1 = varData.lastUpdate;
        }
      }
    });

    // Filter out rows that don't have a code, description, or valid image
    const flyers = rawFlyers.filter((item) => hasProductImage(item));

    return flyers;
  } catch (error) {
    console.error("Error in fetchProductFlyers:", error);
    throw error;
  }
}

/**
 * Extracts unique categories, brands, and subcategories
 */
export function extractFilterOptions(flyers: ProductFlyer[]) {
  const categories = Array.from(new Set(flyers.map(f => f.kategori).filter(Boolean))).sort();
  const brands = Array.from(new Set(flyers.map(f => f.merk).filter(Boolean))).sort();
  const subCategories = Array.from(new Set(flyers.map(f => f.subKategori).filter(Boolean))).sort();

  return { categories, brands, subCategories };
}

/**
 * Helper to determine if a date string in "DD-MM-YYYY HH:mm:ss" format is within the last 24 hours.
 */
export function isWithinLast24Hours(dateStr: string): boolean {
  if (!dateStr || dateStr.trim() === "") return false;
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
    const updateTime = new Date(year, month, day, hour, min, sec).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return updateTime >= (now - twentyFourHours) && updateTime <= now;
  } catch {
    return false;
  }
}

/**
 * Calculates dashboard statistics
 */
export function calculateStats(flyers: ProductFlyer[]): Stats {
  const totalProducts = flyers.length;
  const totalWithFlyers = flyers.filter(f => f.gambarStory !== "").length;
  const totalWithPhotos = flyers.filter(f => f.fotoProduk !== "").length;
  
  const categories = new Set(flyers.map(f => f.kategori).filter(Boolean));
  const brands = new Set(flyers.map(f => f.merk).filter(Boolean));

  // Determine recently updated products (updated in the last 24 hours)
  const recentlyUpdatedCount = flyers.filter(f => isWithinLast24Hours(f.lastUpdate || f.lastUpdate1)).length;

  return {
    totalProducts,
    totalWithFlyers,
    totalWithPhotos,
    categoriesCount: categories.size,
    brandsCount: brands.size,
    recentlyUpdatedCount,
  };
}

/**
 * Parses and formats dates from "DD-MM-YYYY HH:mm:ss" format to Indonesian style
 */
export function formatUpdateDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "Belum di-update";

  try {
    // Standard format from sheets is DD-MM-YYYY HH:mm:ss (e.g. 25-06-2026 14:41:51)
    const parts = dateStr.split(" ");
    const datePart = parts[0];
    const timePart = parts[1] || "";

    const dateComponents = datePart.split("-");
    if (dateComponents.length !== 3) return dateStr;

    const day = parseInt(dateComponents[0], 10);
    const monthIndex = parseInt(dateComponents[1], 10) - 1;
    const year = parseInt(dateComponents[2], 10);

    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const formattedDate = `${day} ${months[monthIndex]} ${year}`;
    const formattedTime = timePart ? ` pukul ${timePart.substring(0, 5)}` : "";

    return `${formattedDate}${formattedTime}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Formats numeric string price as Rupiahcurrency
 */
export function formatRupiah(priceStr: string): string {
  if (!priceStr || priceStr.trim() === "" || priceStr === "0") return "Hubungi Admin";
  
  // Clean dots if it is already formatted like 13.054, or parse float
  // In the CSV, price is formatted as e.g., "13.720", "20.000", which means thousands separator is '.' or standard number.
  // Let's clean up and reformat.
  let cleanStr = priceStr.replace(/[^\d]/g, "");
  if (!cleanStr) return `Rp ${priceStr}`;

  const num = parseInt(cleanStr, 10);
  
  // Wait, if "13.720" is stored as "13720" or as decimal "13.72" or float?
  // Let's check the CSV preview: Eceran "20.000", Hrg Baru "13.720"
  // It has a thousand separator or decimal? If it's Rupiah, "13.720" is 13,720 IDR (Thirteen thousand seven hundred twenty Rupiah).
  // So it's already in thousands! Let's display it elegantly.
  return "Rp " + num.toLocaleString("id-ID");
}

/**
 * Generates direct Google Drive view and thumbnail link
 */
export function getDriveImageUrl(id: string): string {
  if (!id) return "";
  // High-performance image loading link
  return `https://lh3.googleusercontent.com/d/${id}`;
}

export function getDriveDownloadUrl(id: string): string {
  if (!id) return "";
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

/**
 * Groups product flyers by their variation code (from "variasi" sheet) or catalog image (gambarStory).
 * Combines multiple SKU variations into 1 GroupedCatalogFlyer.
 */
export function groupFlyersByCatalogImage(flyers: ProductFlyer[]): GroupedCatalogFlyer[] {
  if (flyers.length === 0) return [];

  const n = flyers.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  // Key map to connect product indices that share the same key
  const keyToFirstIndex = new Map<string, number>();

  flyers.forEach((flyer, index) => {
    const keys: string[] = [];

    // Key 1: variasiCode from "variasi" sheet
    if (flyer.variasiCode && flyer.variasiCode.trim() !== "") {
      keys.push(`var_${flyer.variasiCode.trim().toLowerCase()}`);
    }

    // Key 2: catalog image ID (gambarStory)
    if (flyer.gambarStory && flyer.gambarStory.trim() !== "") {
      keys.push(`img_${flyer.gambarStory.trim()}`);
    }

    // Fallback: SKU code if neither variation code nor image exists
    if (keys.length === 0) {
      keys.push(`sku_${flyer.code.trim().toLowerCase()}`);
    }

    keys.forEach((k) => {
      if (keyToFirstIndex.has(k)) {
        union(index, keyToFirstIndex.get(k)!);
      } else {
        keyToFirstIndex.set(k, index);
      }
    });
  });

  // Collect grouped products
  const rootMap = new Map<number, ProductFlyer[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!rootMap.has(root)) {
      rootMap.set(root, []);
    }
    rootMap.get(root)!.push(flyers[i]);
  }

  const groupedList: GroupedCatalogFlyer[] = [];

  rootMap.forEach((variations) => {
    // Pick primary product (preferably one with a valid catalog image)
    const primaryProduct =
      variations.find((v) => v.gambarStory && v.gambarStory.trim() !== "") ||
      variations[0];

    // Check recent updates
    let latestUpdate = primaryProduct.lastUpdate || primaryProduct.lastUpdate1 || "";
    let hasNewUpdate = isWithinLast24Hours(latestUpdate);

    variations.forEach((v) => {
      const vDate = v.lastUpdate || v.lastUpdate1 || "";
      if (isWithinLast24Hours(vDate)) {
        hasNewUpdate = true;
      }
    });

    const foundVarCode = variations.find((v) => v.variasiCode && v.variasiCode.trim() !== "")?.variasiCode || "";
    const foundImgId = primaryProduct.gambarStory || variations.find((v) => v.gambarStory)?.gambarStory || "";

    const groupId = foundVarCode
      ? `var_${foundVarCode}`
      : foundImgId
      ? `img_${foundImgId}`
      : `sku_${primaryProduct.code}`;

    const brandsSet = new Set(variations.map((v) => v.merk).filter(Boolean));
    const categoriesSet = new Set(variations.map((v) => v.kategori).filter(Boolean));
    const subCategoriesSet = new Set(variations.map((v) => v.subKategori).filter(Boolean));

    groupedList.push({
      id: groupId,
      gambarStory: foundImgId,
      variasiCode: foundVarCode,
      primaryProduct,
      variations,
      totalVariations: variations.length,
      merk: Array.from(brandsSet).join(", ") || primaryProduct.merk,
      kategori: Array.from(categoriesSet).join(", ") || primaryProduct.kategori,
      subKategori: Array.from(subCategoriesSet).join(", ") || primaryProduct.subKategori,
      lastUpdate: latestUpdate,
      isNew: hasNewUpdate,
    });
  });

  return groupedList;
}
