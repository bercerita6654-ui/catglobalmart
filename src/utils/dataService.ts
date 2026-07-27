import { ProductFlyer, Stats } from "../types";

// The published CSV Google Sheets URL
export const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCxz1GPm7QU9IS1yBiSjvIdNTLUsvvplOCyT_R3XH4O-LuVbHoY_bXn1LTH5lpnlolJ29BhUgEdnFm/pub?gid=1564332470&single=true&output=csv";

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
 * Helper to check if a product has a valid image (gambarStory, fotoProduk, or photo)
 */
export function hasProductImage(p: ProductFlyer): boolean {
  const check = (val: string) => {
    if (!val) return false;
    const clean = val.trim().toLowerCase();
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
    return true;
  };
  return check(p.gambarStory) || check(p.fotoProduk) || check(p.photo);
}

/**
 * Fetches and processes the product flyers from the spreadsheet
 */
export async function fetchProductFlyers(): Promise<ProductFlyer[]> {
  try {
    // Add a timestamp parameter to force-bypass caching if needed, or simply load
    const response = await fetch(`${GOOGLE_SHEETS_CSV_URL}&_cb=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet data (Status ${response.status})`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return [];
    }

    // First row is the headers
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const flyers: ProductFlyer[] = dataRows
      .map((row) => {
        // Ensure we don't crash if row is too short
        const getVal = (index: number) => (row[index] || "").trim();

        const qtyParsed = parseInt(getVal(12).replace(/[^\d-]/g, "")) || 0;

        return {
          code: getVal(0),
          barcode: getVal(1),
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
          gambarStory: getVal(19), // Col 20
          lastUpdate: getVal(20),   // Col 21
          fotoProduk: getVal(21),  // Col 22
          lastUpdate1: getVal(22),  // Col 23
        };
      })
      // Filter out rows that don't have a code, description, or valid image
      .filter((item) => item.code !== "" && item.description !== "" && hasProductImage(item));

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
