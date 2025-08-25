// Mock data for the BuyList Dashboard

export interface Product {
  id: string;
  name: string;
  set_code: string;
  type: string;
  release_date: string;
  product_contents: string[];
  upc?: string;
  tcgplayer_product_url?: string;
  tcg_is_verified: boolean;
}

export interface DailyMetric {
  id: string;
  product_id: string;
  date: string;
  lowest_total_price: number;
  lowest_item_price_only: number;
  target_product_cost: number;
  max_product_cost: number;
}

export interface TCGSearchResult {
  productId: string;
  productName: string;
  setName: string;
  price: number;
}

export interface UPCCandidate {
  id: string;
  scraped_name: string;
  scraped_upc: string;
  matched_product: {
    id: string;
    name: string;
    set_code: string;
  };
  confidence_score: number;
}

// Mock Products
export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Bloomburrow Commander Deck",
    set_code: "BLB",
    type: "Commander Deck",
    release_date: "2024-08-02",
    product_contents: ["100 Card Commander Deck", "1 Life Wheel", "1 Deck Box"],
    upc: "195166217928",
    tcgplayer_product_url: "https://tcgplayer.com/product/123456",
    tcg_is_verified: true,
  },
  {
    id: "2", 
    name: "Duskmourn: House of Horror Draft Booster Box",
    set_code: "DSK",
    type: "Draft Booster Box",
    release_date: "2024-09-27",
    product_contents: ["36 Draft Booster Packs", "15 Cards per Pack"],
    tcg_is_verified: false,
  },
  {
    id: "3",
    name: "Foundations Bundle",
    set_code: "FDN", 
    type: "Bundle",
    release_date: "2024-11-15",
    product_contents: ["10 Set Boosters", "1 Foil Promo Card", "1 Oversized Spindown Die"],
    tcg_is_verified: false,
  },
  {
    id: "4",
    name: "Modern Horizons 3 Play Booster Box",
    set_code: "MH3",
    type: "Play Booster Box", 
    release_date: "2024-06-14",
    product_contents: ["36 Play Booster Packs", "14 Cards per Pack"],
    upc: "195166218741",
    tcgplayer_product_url: "https://tcgplayer.com/product/789012",
    tcg_is_verified: true,
  },
  {
    id: "5",
    name: "Thunder Junction Commander Deck - Desert Bloom",
    set_code: "OTJ",
    type: "Commander Deck",
    release_date: "2024-04-19",
    product_contents: ["100 Card Commander Deck", "10 Double-Sided Tokens", "1 Life Wheel"],
    tcg_is_verified: false,
  }
];

// Mock Daily Metrics
export const mockDailyMetrics: DailyMetric[] = [
  {
    id: "1",
    product_id: "1",
    date: new Date().toISOString().split('T')[0],
    lowest_total_price: 39.99,
    lowest_item_price_only: 35.99,
    target_product_cost: 32.00,
    max_product_cost: 45.00,
  },
  {
    id: "2", 
    product_id: "2",
    date: new Date().toISOString().split('T')[0],
    lowest_total_price: 119.95,
    lowest_item_price_only: 115.00,
    target_product_cost: 98.00,
    max_product_cost: 140.00,
  },
  {
    id: "3",
    product_id: "3", 
    date: new Date().toISOString().split('T')[0],
    lowest_total_price: 45.99,
    lowest_item_price_only: 42.50,
    target_product_cost: 38.00,
    max_product_cost: 55.00,
  },
  {
    id: "4",
    product_id: "4",
    date: new Date().toISOString().split('T')[0],
    lowest_total_price: 259.99,
    lowest_item_price_only: 249.99,
    target_product_cost: 220.00,
    max_product_cost: 300.00,
  },
  {
    id: "5",
    product_id: "5",
    date: new Date().toISOString().split('T')[0],
    lowest_total_price: 42.99,
    lowest_item_price_only: 39.99,
    target_product_cost: 35.00,
    max_product_cost: 50.00,
  }
];

// Mock TCG Search Results
export const mockTCGSearchResults: Record<string, TCGSearchResult[]> = {
  "2": [
    {
      productId: "534291",
      productName: "Duskmourn: House of Horror Draft Booster Box", 
      setName: "Duskmourn: House of Horror",
      price: 119.95,
    },
    {
      productId: "534292",
      productName: "Duskmourn Draft Booster Display", 
      setName: "Duskmourn: House of Horror",
      price: 115.99,
    },
  ],
  "3": [
    {
      productId: "612847",
      productName: "Foundations Bundle",
      setName: "Foundations", 
      price: 45.99,
    },
    {
      productId: "612848", 
      productName: "Magic: The Gathering Foundations Bundle",
      setName: "Foundations",
      price: 47.50,
    },
  ],
  "5": [
    {
      productId: "498302",
      productName: "Outlaws of Thunder Junction Commander Deck - Desert Bloom",
      setName: "Outlaws of Thunder Junction",
      price: 42.99,
    },
  ],
};

// Mock UPC Candidates
export const mockUPCCandidates: UPCCandidate[] = [
  {
    id: "upc-1",
    scraped_name: "MTG Duskmourn Draft Booster Box 36ct",
    scraped_upc: "195166219845",
    matched_product: {
      id: "2",
      name: "Duskmourn: House of Horror Draft Booster Box",
      set_code: "DSK",
    },
    confidence_score: 0.92,
  },
  {
    id: "upc-2", 
    scraped_name: "Magic Foundations Bundle English",
    scraped_upc: "195166220887", 
    matched_product: {
      id: "3",
      name: "Foundations Bundle",
      set_code: "FDN",
    },
    confidence_score: 0.87,
  },
  {
    id: "upc-3",
    scraped_name: "OTJ Commander Deck Desert Bloom", 
    scraped_upc: "195166218963",
    matched_product: {
      id: "5",
      name: "Thunder Junction Commander Deck - Desert Bloom", 
      set_code: "OTJ",
    },
    confidence_score: 0.94,
  },
];

// Helper functions
export const getProductById = (id: string): Product | undefined => {
  return mockProducts.find(p => p.id === id);
};

export const getDailyMetricsByProductId = (productId: string): DailyMetric | undefined => {
  return mockDailyMetrics.find(m => m.product_id === productId);
};

export const getUnverifiedProducts = (): Product[] => {
  return mockProducts.filter(p => !p.tcg_is_verified);
};

export const getTCGSearchResults = (productId: string): TCGSearchResult[] => {
  return mockTCGSearchResults[productId] || [];
};

export const getDashboardMetrics = () => {
  return mockProducts.map(product => {
    const metrics = getDailyMetricsByProductId(product.id);
    return {
      ...product,
      ...metrics,
    };
  }).filter(item => item.lowest_total_price); // Only include items with metrics
};