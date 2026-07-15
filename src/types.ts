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
}

export interface Stats {
  totalProducts: number;
  totalWithFlyers: number;
  totalWithPhotos: number;
  categoriesCount: number;
  brandsCount: number;
  recentlyUpdatedCount: number;
}
