export interface ProductFlyer {
  code: string;
  barcode: string;
  description: string;
  unit: string;
  kategori: string;
  subKategori: string;
  merk: string;
  hppAkhir: string;
  hppPpn: string;
  hppPM: string;
  eceran: string;
  hrgBaru: string;
  qty: number;
  stat: string;
  photo: string;
  info: string;
  open: string;
  gambarStory: string; // Col 20 - Google Drive image ID of the story flyer
  lastUpdate: string;   // Col 21 - Date string when the story flyer was updated
  fotoProduk: string;  // Col 22 - Google Drive image ID of the product photo
  lastUpdate1: string;  // Col 23 - Date string when the product photo was updated
  variasiCode?: string; // Variation code mapped from sheet "variasi"
}

export interface GroupedCatalogFlyer {
  id: string; // The catalog image ID (gambarStory) or primary product code
  gambarStory: string;
  variasiCode?: string;
  primaryProduct: ProductFlyer;
  variations: ProductFlyer[];
  totalVariations: number;
  merk: string;
  kategori: string;
  subKategori: string;
  lastUpdate: string;
  isNew: boolean;
}

export interface Stats {
  totalProducts: number;
  totalWithFlyers: number;
  totalWithPhotos: number;
  categoriesCount: number;
  brandsCount: number;
  recentlyUpdatedCount: number;
}
