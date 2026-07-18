import { MenuItem, Order, StoreInsight, DailyTrend, MarketingCampaign, Ingredient, RecipeIngredient, WastageLog } from './types';

export const INITIAL_PRODUCTS: MenuItem[] = [
  {
    id: 'prod-1',
    name: 'Margherita Pizza',
    price: 299,
    category: 'Pizza',
    image: '',
    description: 'Classic tomato sauce, fresh mozzarella, fresh basil, and extra virgin olive oil.',
    stock: 25,
    status: 'Available',
    popular: true
  },
  {
    id: 'prod-2',
    name: 'Pepperoni Pizza',
    price: 399,
    category: 'Pizza',
    image: '',
    description: 'Classic tomato sauce, mozzarella cheese, and generous layers of spicy pepperoni slices.',
    stock: 18,
    status: 'Available',
    popular: true
  },
  {
    id: 'prod-3',
    name: 'Garlic Bread',
    price: 129,
    category: 'Appetizers',
    image: '',
    description: 'Toasted baguette slices with garlic butter, fresh parsley, and melted cheese.',
    stock: 45,
    status: 'Out of Stock',
    popular: false
  },
  {
    id: 'prod-4',
    name: 'Tiramisu',
    price: 199,
    category: 'Beverages',
    image: '',
    description: 'Traditional Italian dessert with layers of coffee-soaked ladyfingers and sweet mascarpone cream.',
    stock: 30,
    status: 'Available',
    popular: true
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-002',
    customerName: 'Jane Smith',
    mobileNumber: '+1 987-654-3210',
    date: '2026-07-14 13:12',
    total: 8960,
    status: 'Completed',
    items: [
      { productId: 'prod-2', name: 'Pepperoni Pizza', quantity: 20, price: 399 },
      { productId: 'prod-4', name: 'Tiramisu', quantity: 5, price: 196 }
    ]
  },
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    mobileNumber: '+1 234-567-8900',
    date: '2026-07-14 12:12',
    total: 3640,
    status: 'Completed',
    items: [
      { productId: 'prod-1', name: 'Margherita Pizza', quantity: 10, price: 299 },
      { productId: 'prod-3', name: 'Garlic Bread', quantity: 5, price: 130 }
    ]
  }
];

export const INITIAL_TRENDS: DailyTrend[] = [
  { date: 'Jul 9', revenue: 14500, orders: 12 },
  { date: 'Jul 10', revenue: 16200, orders: 15 },
  { date: 'Jul 11', revenue: 13900, orders: 11 },
  { date: 'Jul 12', revenue: 15100, orders: 14 },
  { date: 'Jul 13', revenue: 18400, orders: 19 },
  { date: 'Jul 14', revenue: 26800, orders: 28 }, // spike on jul 14
  { date: 'Jul 15', revenue: 12600, orders: 10 }  // current day
];

export const INITIAL_INSIGHTS: StoreInsight[] = [
  {
    id: 'ins-1',
    icon: 'lightbulb',
    message: 'Peak hours expected between 6 PM - 8 PM tonight. Consider increasing staff.',
    type: 'info'
  },
  {
    id: 'ins-2',
    icon: 'trending_up',
    message: "'Spicy Ramen' is trending in your local area. Add to featured items?",
    type: 'success'
  },
  {
    id: 'ins-3',
    icon: 'warning',
    message: 'Inventory alert: Matcha Bubble Milk Tea pearls are running low (12% left).',
    type: 'warning'
  }
];

export const INITIAL_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp-1',
    title: 'Monsoon Hot Ramen Sale',
    discount: '15% Off',
    status: 'Active',
    targetProduct: 'Spicy Tonkotsu Ramen',
    clicks: 142,
    conversions: 38
  },
  {
    id: 'camp-2',
    title: 'Mid-week Sweet Sensation',
    discount: 'Free Boba Topping',
    status: 'Draft',
    targetProduct: 'Matcha Bubble Milk Tea',
    clicks: 0,
    conversions: 0
  }
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-1',
    name: 'Pork Tonkotsu Broth Base',
    currentStock: 45, // 45 Liters
    reorderLevel: 15,
    unit: 'L',
    costPerUnit: 120, // ₹120 per Liter
    category: 'Dairy & Liquids'
  },
  {
    id: 'ing-2',
    name: 'Ramen Wheat Noodles',
    currentStock: 12500, // 12,500 grams (12.5 kg)
    reorderLevel: 4000,
    unit: 'g',
    costPerUnit: 0.15, // ₹0.15 per gram (₹150/kg)
    category: 'Dry Goods'
  },
  {
    id: 'ing-3',
    name: 'Chashu Pork Slices',
    currentStock: 180, // 180 slices
    reorderLevel: 50,
    unit: 'pcs',
    costPerUnit: 45,
    category: 'Proteins'
  },
  {
    id: 'ing-4',
    name: 'Ramen Soft Eggs',
    currentStock: 64, // 64 eggs
    reorderLevel: 24,
    unit: 'pcs',
    costPerUnit: 10,
    category: 'Fresh Produce'
  },
  {
    id: 'ing-5',
    name: 'Japanese Curry Roux',
    currentStock: 3200, // 3,200 grams
    reorderLevel: 1000,
    unit: 'g',
    costPerUnit: 0.35,
    category: 'Dry Goods'
  },
  {
    id: 'ing-6',
    name: 'Chicken Cutlet Breast',
    currentStock: 35, // 35 cutlets
    reorderLevel: 12,
    unit: 'pcs',
    costPerUnit: 60,
    category: 'Proteins'
  },
  {
    id: 'ing-7',
    name: 'Gyoza Wrapper Sheets',
    currentStock: 320, // 320 pieces
    reorderLevel: 100,
    unit: 'pcs',
    costPerUnit: 2,
    category: 'Dry Goods'
  },
  {
    id: 'ing-8',
    name: 'Minced Pork Filling',
    currentStock: 4800, // 4,800 grams
    reorderLevel: 1500,
    unit: 'g',
    costPerUnit: 0.28,
    category: 'Proteins'
  },
  {
    id: 'ing-9',
    name: 'Premium Matcha Powder',
    currentStock: 1200, // 1,200 grams
    reorderLevel: 400,
    unit: 'g',
    costPerUnit: 1.8,
    category: 'Dry Goods'
  },
  {
    id: 'ing-10',
    name: 'Boba Tapioca Pearls',
    currentStock: 180, // 180 grams (Very low!)
    reorderLevel: 1500, // Reorder at 1.5kg
    unit: 'g',
    costPerUnit: 0.45,
    category: 'Dry Goods'
  },
  {
    id: 'ing-11',
    name: 'Organic Whole Milk',
    currentStock: 28, // 28 Liters
    reorderLevel: 8,
    unit: 'L',
    costPerUnit: 65,
    category: 'Dairy & Liquids'
  }
];

export const INITIAL_RECIPES: RecipeIngredient[] = [
  // Spicy Tonkotsu Ramen (prod-1)
  { productId: 'prod-1', ingredientId: 'ing-1', quantityRequired: 0.4 }, // 0.4L Broth
  { productId: 'prod-1', ingredientId: 'ing-2', quantityRequired: 150 }, // 150g Noodles
  { productId: 'prod-1', ingredientId: 'ing-3', quantityRequired: 2 },   // 2 slices Chashu
  { productId: 'prod-1', ingredientId: 'ing-4', quantityRequired: 1 },   // 1 egg

  // Chicken Katsu Curry Rice (prod-2)
  { productId: 'prod-2', ingredientId: 'ing-5', quantityRequired: 80 },  // 80g Curry roux
  { productId: 'prod-2', ingredientId: 'ing-6', quantityRequired: 1 },   // 1 Chicken Cutlet

  // Pork Gyoza (6pcs) (prod-3)
  { productId: 'prod-3', ingredientId: 'ing-7', quantityRequired: 6 },   // 6 wrappers
  { productId: 'prod-3', ingredientId: 'ing-8', quantityRequired: 90 },  // 90g minced pork filling

  // Matcha Bubble Milk Tea (prod-4)
  { productId: 'prod-4', ingredientId: 'ing-9', quantityRequired: 15 },  // 15g Matcha
  { productId: 'prod-4', ingredientId: 'ing-10', quantityRequired: 40 }, // 40g Boba Pearls
  { productId: 'prod-4', ingredientId: 'ing-11', quantityRequired: 0.25 } // 0.25L whole milk
];

export const INITIAL_WASTAGE: WastageLog[] = [
  {
    id: 'wast-1',
    ingredientId: 'ing-11',
    ingredientName: 'Organic Whole Milk',
    quantity: 2,
    unit: 'L',
    reason: 'Expired',
    timestamp: 'Oct 11, 04:30 PM',
    loggedBy: 'Chef Akira'
  },
  {
    id: 'wast-2',
    ingredientId: 'ing-4',
    ingredientName: 'Ramen Soft Eggs',
    quantity: 4,
    unit: 'pcs',
    reason: 'Dropped',
    timestamp: 'Oct 12, 09:10 AM',
    loggedBy: 'Sous Chef Jin'
  }
];

