export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  foodType?: 'Veg' | 'Non-Veg';
  isVeg?: boolean;
  gstIncluded?: boolean;
  preparationTime?: string;
  image: string;
  description: string;
  stock: number;
  status: 'Available' | 'Out of Stock' | 'Draft';
  popular?: boolean;
  featured?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryItem {
  id?: string;
  name: string;
  displayOrder: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerName: string;
  mobileNumber?: string;
  date: string; // formatted date
  total: number;
  subtotal?: number;
  gstPercentage?: number;
  gstAmount?: number;
  serviceChargePercentage?: number;
  serviceChargeAmount?: number;
  status: 'Pending' | 'Accepted' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled' | string;
  paymentStatus?: 'Unpaid' | 'Paid' | string;
  paymentMethod?: 'Cash' | 'UPI' | 'Card' | string | null;
  paidAt?: string;
  transactionRef?: string;
  items: OrderItem[];
  paymentMode?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  tableNumber: number;
  tableName: string;
  capacity: number;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  qrToken?: string;
  tableId: string;
  tableNumber: number;
  tableName?: string;
  requestType: 'Call Waiter' | 'Water Request' | 'Bill Request' | 'Cleaning' | string;
  message?: string;
  status: 'Pending' | 'Accepted' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt?: string;
}

export interface TaxSettings {
  enableGst: boolean;
  gstPercentage: number;
  enableServiceCharge: boolean;
  serviceChargePercentage: number;
}

