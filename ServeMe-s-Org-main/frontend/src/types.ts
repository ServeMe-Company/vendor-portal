export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  stock: number;
  status: 'Available' | 'Out of Stock' | 'Draft';
  popular: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  mobileNumber?: string;
  date: string; // formatted date
  total: number;
  status: 'Pending Payment' | 'Preparing' | 'Completed' | 'Cancelled';
  items: OrderItem[];
  paymentMode?: string;
}

export interface StoreInsight {
  id: string;
  icon: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

export interface DailyTrend {
  date: string;
  revenue: number;
  orders: number;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  discount: string;
  status: 'Draft' | 'Active' | 'Completed';
  targetProduct: string;
  clicks: number;
  conversions: number;
}

export interface Ingredient {
  id: string;
  name: string;
  currentStock: number; // in grams, liters, units
  reorderLevel: number;
  unit: string; // e.g. "g", "ml", "pcs", "kg"
  costPerUnit: number; // in ₹
  category: 'Dry Goods' | 'Fresh Produce' | 'Proteins' | 'Dairy & Liquids' | 'Packaging';
}

export interface RecipeIngredient {
  productId: string; // references MenuItem.id
  ingredientId: string; // references Ingredient.id
  quantityRequired: number; // portion consumed per order
}

export interface WastageLog {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  reason: 'Spillage' | 'Expired' | 'Burnt/Ruined' | 'Dropped';
  timestamp: string;
  loggedBy: string;
}

export interface PaymentMode {
  id: string;
  name: string;
  type: 'Digital' | 'Cash' | 'Card' | 'Wallet' | 'Voucher' | 'Other';
  status: 'Active' | 'Inactive';
  surchargePercentage: number;
  discountPercentage: number;
}

