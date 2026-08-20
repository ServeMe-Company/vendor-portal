import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import QRCode from "qrcode";
import { Pool } from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RestaurantTable {
  id: string;
  restaurantId: string;
  tableNumber: number;
  tableName: string;
  capacity: number;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function generateQrToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function generateUniqueQrToken(tables: RestaurantTable[] = []): string {
  let token: string;
  do {
    token = generateQrToken();
  } while (tables.some((table) => table.qrToken === token));
  return token;
}

function isValidCategory(categoryInput: string, categories: any[] = []): boolean {
  if (!categoryInput || typeof categoryInput !== "string") return false;
  const target = categoryInput.trim().toLowerCase();

  for (const cat of categories) {
    if (
      cat.id?.toLowerCase() === target ||
      cat.name?.toLowerCase() === target ||
      cat.slug?.toLowerCase() === target
    ) {
      return true;
    }
    if (Array.isArray(cat.subcategories)) {
      for (const sub of cat.subcategories) {
        if (
          sub.id?.toLowerCase() === target ||
          sub.name?.toLowerCase() === target ||
          sub.slug?.toLowerCase() === target
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function generateOrderNumber(orders: any[] = []): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePrefix = `SM-${year}${month}${day}`;

  let maxSeq = 0;
  for (const order of orders) {
    const numToCheck = order.orderNumber || order.id || "";
    if (typeof numToCheck === "string" && numToCheck.startsWith(datePrefix)) {
      const parts = numToCheck.split("-");
      const seqStr = parts[parts.length - 1];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${datePrefix}-${nextSeq}`;
}

const VALID_ORDER_STATUSES = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
];

function isValidOrderStatus(statusInput: string): boolean {
  if (!statusInput || typeof statusInput !== "string") return false;
  const target = statusInput.trim().toLowerCase();
  return VALID_ORDER_STATUSES.some((s) => s.toLowerCase() === target);
}

function normalizeOrderStatus(statusInput: string): string {
  const target = statusInput.trim().toLowerCase();
  const matched = VALID_ORDER_STATUSES.find((s) => s.toLowerCase() === target);
  return matched || statusInput.trim();
}

// WebSocket / Real-time Event Broadcast Placeholder
function broadcast(event: string, data: any): void {
  console.log(`[WS BROADCAST] Event: '${event}'`, JSON.stringify(data, null, 2));
}

const DB_FILE = path.join(__dirname, "db.json");
const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;
if (DATABASE_URL && typeof DATABASE_URL === "string" && DATABASE_URL.trim() !== "") {
  let connectionString = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
  if (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://")) {
    if (connectionString.startsWith("//")) {
      connectionString = "postgresql:" + connectionString;
    } else {
      connectionString = "postgresql://" + connectionString;
    }
  }
  console.log("Initializing PostgreSQL connection pool...");
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Database schema initialization
async function initPGSchema() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_data (
        id INT PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);
    const res = await pool.query("SELECT id FROM store_data WHERE id = 1");
    if (res.rows.length === 0) {
      console.log("Seeding initial store state to PostgreSQL database...");
      let initialState = {};
      if (fs.existsSync(DB_FILE)) {
        try {
          initialState = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        } catch (e) {
          console.error("Failed to parse local db.json for seeding", e);
        }
      }
      await pool.query("INSERT INTO store_data (id, data) VALUES (1, $1)", [initialState]);
    }
    console.log("PostgreSQL database is ready.");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL schema:", err);
  }
}

// Helper function to read DB with error handling and fallback
async function readDB() {
  if (pool) {
    try {
      const res = await pool.query("SELECT data FROM store_data WHERE id = 1");
      if (res.rows && res.rows.length > 0) {
        return res.rows[0].data;
      }
    } catch (err) {
      console.error("Error reading from PostgreSQL database, falling back to db.json:", err);
    }
  }

  const possiblePaths = [
    DB_FILE,
    path.join(process.cwd(), "backend", "db.json"),
    path.join(process.cwd(), "db.json")
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
  }

  return {};
}

// Helper function to write DB
async function writeDB(data: any) {
  if (pool) {
    try {
      await pool.query("UPDATE store_data SET data = $1 WHERE id = 1", [data]);
      return true;
    } catch (err) {
      console.error("Error writing to PostgreSQL database:", err);
    }
  }

  const possiblePaths = [
    DB_FILE,
    path.join(process.cwd(), "backend", "db.json"),
    path.join(process.cwd(), "db.json")
  ];

  for (const filePath of possiblePaths) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err);
    }
  }

  return true;
}

async function ensureDatabaseStructure() {
  const db = await readDB();

  if (!db.restaurant) {
    db.restaurant = {
      id: "restaurant_001",
      name: "ServeMe Restaurant",
      slug: "serveme",
      address: "",
      phone: "",
      isOpen: true,
      preparationTime: "20–30 min",
      currency: "INR",
      gst: "18",
      serviceChargePercentage: 5,
      logo: "",
      banner: "",
      updatedAt: new Date().toISOString()
    };
  } else {
    if (db.restaurant.address === undefined) db.restaurant.address = "";
    if (db.restaurant.phone === undefined) db.restaurant.phone = "";
    if (db.restaurant.currency === undefined) db.restaurant.currency = "INR";
    if (db.restaurant.gst === undefined) db.restaurant.gst = "18";
    if (db.restaurant.serviceChargePercentage === undefined) db.restaurant.serviceChargePercentage = 5;
    if (db.restaurant.logo === undefined) db.restaurant.logo = "";
    if (db.restaurant.banner === undefined) db.restaurant.banner = "";
    if (db.restaurant.updatedAt === undefined) db.restaurant.updatedAt = new Date().toISOString();
  }

  if (!Array.isArray(db.tables) || db.tables.length === 0) {
    db.tables = [
      {
        id: "table_962ca052-d857-4ef2-aa41-3c89babed809",
        restaurantId: "restaurant_001",
        tableNumber: 1,
        tableName: "Table 1",
        capacity: 4,
        qrToken: "cfUmnVwm9GB1gD-2YS9e-mdLxgzvdtCh",
        isActive: true,
        createdAt: "2026-07-27T12:20:59.161Z"
      }
    ];
  }

  if (!Array.isArray(db.products)) {
    db.products = [];
  }

  if (!Array.isArray(db.orders)) {
    db.orders = [];
  }

  if (!Array.isArray(db.serviceRequests)) {
    db.serviceRequests = [];
  }

  if (!Array.isArray(db.categories) || db.categories.length === 0) {
    db.categories = [
      {
        id: "cat_food",
        name: "Food",
        slug: "food",
        subcategories: [
          { id: "sub_burger", name: "Burger", slug: "burger" },
          { id: "sub_pizza", name: "Pizza", slug: "pizza" },
          { id: "sub_appetizers", name: "Appetizers", slug: "appetizers" }
        ]
      },
      {
        id: "cat_drinks",
        name: "Drinks",
        slug: "drinks",
        subcategories: [
          { id: "sub_coffee", name: "Coffee", slug: "coffee" },
          { id: "sub_tea", name: "Tea", slug: "tea" },
          { id: "sub_beverages", name: "Beverages", slug: "beverages" }
        ]
      },
      {
        id: "cat_desserts",
        name: "Desserts",
        slug: "desserts",
        subcategories: [
          { id: "sub_icecream", name: "Ice Cream", slug: "ice-cream" }
        ]
      }
    ];
  }

  await writeDB(db);
}

export interface VendorRequest extends express.Request {
  vendor?: {
    id: string;
    name: string;
    restaurantId: string;
  };
}

// Authentication placeholder middleware for vendor endpoints
function authenticateVendor(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  // Placeholder: Automatically attach Vendor 1
  (req as VendorRequest).vendor = {
    id: "vendor_001",
    name: "Vendor 1",
    restaurantId: "restaurant_001",
  };

  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS for local Vite development & production QR menu
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "https://qr-menu.serveme.in",
        "http://qr-menu.serveme.in",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
    }),
  );

  if (pool) {
    await initPGSchema();
  }

  await ensureDatabaseStructure();

  // Increase payload limit just in case (after CORS)
  app.use(express.json({ limit: "50mb" }));

  // Mount vendor authentication placeholder middleware
  app.use("/api/vendor", authenticateVendor);

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GET the complete DB state
  app.get("/api/db", async (req, res) => {
    try {
      const data = await readDB();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read database state: " + err.message });
    }
  });

  // Safely update DB state without deleting missing sections
  app.post("/api/db", async (req, res) => {
    try {
      const currentDB = await readDB();
      const incoming = req.body;

      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return res.status(400).json({
          error: "A valid database object is required.",
        });
      }

      const protectedKeys = [
        "restaurant",
        "tables",
        "categories",
        "orders",
        "products",
        "insights",
        "trends",
        "campaigns",
        "ingredients",
        "recipes",
        "wastageLogs",
        "paymentModes",
        "deductedOrderIds",
        "serviceRequests",
      ];

      const mergedDB = {
        ...currentDB,
        ...incoming,
      };

      // Preserve existing sections when they are missing from the request
      for (const key of protectedKeys) {
        if (incoming[key] === undefined && currentDB[key] !== undefined) {
          mergedDB[key] = currentDB[key];
        }
      }

      // Never allow required QR Menu sections to disappear
      if (!mergedDB.restaurant) {
        mergedDB.restaurant = currentDB.restaurant;
      }

      if (!Array.isArray(mergedDB.tables)) {
        mergedDB.tables = Array.isArray(currentDB.tables)
          ? currentDB.tables
          : [];
      }

      if (!Array.isArray(mergedDB.categories)) {
        mergedDB.categories = Array.isArray(currentDB.categories)
          ? currentDB.categories
          : [];
      }

      if (!Array.isArray(mergedDB.products)) {
        mergedDB.products = Array.isArray(currentDB.products)
          ? currentDB.products
          : [];
      }

      if (!Array.isArray(mergedDB.orders)) {
        mergedDB.orders = Array.isArray(currentDB.orders)
          ? currentDB.orders
          : [];
      }

      const success = await writeDB(mergedDB);

      if (!success) {
        return res.status(500).json({
          error: "Failed to write database.",
        });
      }

      return res.json({
        success: true,
        data: mergedDB,
      });
    } catch (err: any) {
      console.error("Database update error:", err);

      return res.status(500).json({
        error: "Failed to update database state: " + err.message,
      });
    }
  });

  // Mock-data proxy or backend service info
  app.get("/api/info", (req, res) => {
    res.json({
      name: "Boba Shop POS Backend",
      version: "1.0.0",
      features: [
        "Real-time Inventory Management",
        "Automated Restock Insights",
        "Interactive POS Sales Dashboard",
        "Dynamic Ingredient Cost & Pricing Analytics"
      ]
    });
  });

  // Get all categories
  app.get("/api/vendor/categories", async (req, res) => {
    const db = await readDB();

    const categories = Array.isArray(db.categories)
      ? db.categories
      : [];

    return res.json(categories);
  });

  // Create new category
  app.post("/api/vendor/categories", async (req, res) => {
    const { name, subcategories } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required." });
    }

    const db = await readDB();
    if (!Array.isArray(db.categories)) {
      db.categories = [];
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = db.categories.find(
      (c: any) => c.name?.toLowerCase() === name.trim().toLowerCase() || c.slug === slug
    );

    if (existing) {
      return res.status(409).json({ error: `Category '${name}' already exists.` });
    }

    const newCategory = {
      id: `cat_${slug}_${Date.now()}`,
      name: name.trim(),
      slug,
      subcategories: Array.isArray(subcategories)
        ? subcategories.map((sub: string) => ({
            id: `sub_${sub.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            name: sub,
            slug: sub.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          }))
        : []
    };

    db.categories.push(newCategory);

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to save category." });
    }

    return res.status(201).json(newCategory);
  });

  // Update existing category
  app.patch("/api/vendor/categories/:categoryId", async (req, res) => {
    const { categoryId } = req.params;
    const { name, subcategories } = req.body;

    const db = await readDB();
    if (!Array.isArray(db.categories)) {
      return res.status(404).json({ error: "Category not found." });
    }

    const catIndex = db.categories.findIndex(
      (c: any) => c.id === categoryId || c.name?.toLowerCase() === categoryId.toLowerCase()
    );

    if (catIndex === -1) {
      return res.status(404).json({ error: "Category not found." });
    }

    const oldName = db.categories[catIndex].name;
    if (name && typeof name === "string" && name.trim()) {
      const newName = name.trim();
      db.categories[catIndex].name = newName;
      db.categories[catIndex].slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      // Also update matching product categories in DB if renamed
      if (Array.isArray(db.products)) {
        db.products.forEach((p: any) => {
          if (p.category === oldName) {
            p.category = newName;
          }
        });
      }
    }

    if (Array.isArray(subcategories)) {
      db.categories[catIndex].subcategories = subcategories.map((sub: string) => ({
        id: `sub_${sub.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: sub,
        slug: sub.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      }));
    }

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to update category." });
    }

    return res.json(db.categories[catIndex]);
  });

  // Delete category
  app.delete("/api/vendor/categories/:categoryId", async (req, res) => {
    const { categoryId } = req.params;
    const db = await readDB();

    if (!Array.isArray(db.categories)) {
      return res.status(404).json({ error: "Category not found." });
    }

    const catIndex = db.categories.findIndex(
      (c: any) => c.id === categoryId || c.name?.toLowerCase() === categoryId.toLowerCase()
    );

    if (catIndex === -1) {
      return res.status(404).json({ error: "Category not found." });
    }

    const deletedCat = db.categories.splice(catIndex, 1)[0];

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to delete category." });
    }

    return res.json({ success: true, category: deletedCat });
  });

  // Get all active (non-deleted) products
  app.get("/api/vendor/products", async (req, res) => {
    const db = await readDB();
    const products = Array.isArray(db.products)
      ? db.products.filter((p: any) => !p.deleted)
      : [];
    return res.json(products);
  });

  // Create product with category validation
  app.post("/api/vendor/products", async (req, res) => {
    const { name, price, category, subcategory, foodType, isVeg, gstIncluded, preparationTime, description, image, stock, status, popular, featured, displayOrder } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required." });
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: "Valid price is required." });
    }

    const db = await readDB();
    const categories = Array.isArray(db.categories) ? db.categories : [];

    if (!category || !isValidCategory(category, categories)) {
      return res.status(400).json({
        error: `Invalid category '${category}'. Category must exist in Food, Drinks, Desserts or subcategories.`,
      });
    }

    if (!Array.isArray(db.products)) {
      db.products = [];
    }

    const isVegVal = isVeg !== undefined ? Boolean(isVeg) : (foodType === "Veg");
    const isFeaturedVal = featured !== undefined ? Boolean(featured) : Boolean(popular);
    const orderVal = displayOrder !== undefined && !isNaN(Number(displayOrder)) ? Number(displayOrder) : 1;

    const nowIso = req.body.createdAt || new Date().toISOString();
    const newProduct = {
      id: generateId("prod"),
      name: name.trim(),
      category: category.trim(),
      price: parsedPrice,
      stock: Number.isInteger(Number(stock)) ? Number(stock) : 0,
      status: status || "Available",
      isVeg: isVegVal,
      foodType: isVegVal ? "Veg" : "Non-Veg",
      displayOrder: orderVal,
      preparationTime: typeof preparationTime === "string" ? preparationTime.trim() : "15-20 min",
      featured: isFeaturedVal,
      popular: isFeaturedVal,
      image: typeof image === "string" ? image.trim() : "",
      description: typeof description === "string" ? description.trim() : "",
      subcategory: typeof subcategory === "string" ? subcategory.trim() : "",
      gstIncluded: typeof gstIncluded === "boolean" ? gstIncluded : true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    db.products.push(newProduct);

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to save product." });
    }

    return res.status(201).json(newProduct);
  });

  // Update product with category validation
  app.patch("/api/vendor/products/:productId", async (req, res) => {
    const { productId } = req.params;
    const { name, price, category, subcategory, foodType, isVeg, gstIncluded, preparationTime, description, image, stock, status, popular, featured, displayOrder } = req.body;

    const db = await readDB();
    if (!Array.isArray(db.products)) {
      return res.status(404).json({ error: "Product not found." });
    }

    const productIndex = db.products.findIndex((p: any) => p.id === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found." });
    }

    const currentProduct = db.products[productIndex];

    if (category !== undefined) {
      const categories = Array.isArray(db.categories) ? db.categories : [];
      if (!isValidCategory(category, categories)) {
        return res.status(400).json({
          error: `Invalid category '${category}'. Category must exist in Food, Drinks, Desserts or subcategories.`,
        });
      }
      currentProduct.category = category.trim();
    }

    if (name !== undefined && typeof name === "string" && name.trim()) {
      currentProduct.name = name.trim();
    }
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        currentProduct.price = parsedPrice;
      }
    }
    if (subcategory !== undefined && typeof subcategory === "string") {
      currentProduct.subcategory = subcategory.trim();
    }
    if (isVeg !== undefined) {
      currentProduct.isVeg = Boolean(isVeg);
      currentProduct.foodType = Boolean(isVeg) ? "Veg" : "Non-Veg";
    } else if (foodType !== undefined && typeof foodType === "string") {
      currentProduct.foodType = foodType === "Non-Veg" ? "Non-Veg" : "Veg";
      currentProduct.isVeg = foodType === "Veg";
    }
    if (gstIncluded !== undefined) {
      currentProduct.gstIncluded = Boolean(gstIncluded);
    }
    if (preparationTime !== undefined && typeof preparationTime === "string") {
      currentProduct.preparationTime = preparationTime.trim();
    }
    if (description !== undefined && typeof description === "string") {
      currentProduct.description = description.trim();
    }
    if (image !== undefined && typeof image === "string") {
      currentProduct.image = image.trim();
    }
    if (stock !== undefined && Number.isInteger(Number(stock))) {
      currentProduct.stock = Number(stock);
    }
    if (status !== undefined && typeof status === "string") {
      currentProduct.status = status;
    }
    if (featured !== undefined) {
      currentProduct.featured = Boolean(featured);
      currentProduct.popular = Boolean(featured);
    } else if (popular !== undefined) {
      currentProduct.popular = Boolean(popular);
      currentProduct.featured = Boolean(popular);
    }
    if (displayOrder !== undefined && !isNaN(Number(displayOrder))) {
      currentProduct.displayOrder = Number(displayOrder);
    }

    if (!currentProduct.createdAt) {
      currentProduct.createdAt = req.body.createdAt || new Date().toISOString();
    }
    currentProduct.updatedAt = new Date().toISOString();
    db.products[productIndex] = currentProduct;

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to update product." });
    }

    return res.json(currentProduct);
  });

  // SOFT DELETE product
  app.delete("/api/vendor/products/:productId", async (req, res) => {
    const { productId } = req.params;
    const db = await readDB();

    if (!Array.isArray(db.products)) {
      return res.status(404).json({ error: "Product not found." });
    }

    const productIndex = db.products.findIndex((p: any) => p.id === productId && !p.deleted);
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found or already deleted." });
    }

    const currentProduct = db.products[productIndex];
    currentProduct.deleted = true;
    currentProduct.deletedAt = new Date().toISOString();
    currentProduct.updatedAt = currentProduct.deletedAt;

    db.products[productIndex] = currentProduct;

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to delete product." });
    }

    return res.json({
      success: true,
      message: "Product soft deleted successfully.",
      product: currentProduct,
    });
  });

  // GET all orders
  app.get("/api/vendor/orders", async (req, res) => {
    const db = await readDB();
    const orders = Array.isArray(db.orders) ? db.orders : [];
    return res.json(orders);
  });

  // CREATE order with generated order number and product/price validation
  app.post("/api/vendor/orders", async (req, res) => {
    const { customerName, mobileNumber, items, tableId, notes } = req.body;
    const db = await readDB();

    if (tableId) {
      const table = Array.isArray(db.tables)
        ? db.tables.find(
            (t: RestaurantTable) => t.id === tableId && t.isActive && !t.deleted,
          )
        : null;

      if (!table) {
        return res.status(400).json({
          error: "Invalid or inactive table.",
        });
      }
    }

    const parsedItems = Array.isArray(items) ? items : [];

    if (parsedItems.length === 0) {
      return res.status(400).json({
        error: "Order must contain at least one product item.",
      });
    }

    const availableProducts = Array.isArray(db.products) ? db.products : [];
    const validatedItems: any[] = [];
    let total = 0;

    for (const item of parsedItems) {
      const prodId = item.productId || item.id;
      const dbProduct = availableProducts.find(
        (p: any) => (p.id === prodId || p.productId === prodId) && !p.deleted,
      );

      if (!dbProduct) {
        return res.status(400).json({
          error: `Product '${prodId || item.name || "unknown"}' not found or unavailable.`,
        });
      }

      if (dbProduct.status && dbProduct.status.toLowerCase() === "out of stock") {
        return res.status(400).json({
          error: `Product '${dbProduct.name}' is currently out of stock.`,
        });
      }

      const qty = Math.max(1, Number.isInteger(Number(item.quantity)) ? Number(item.quantity) : 1);
      const unitPrice = Number(dbProduct.price) || 0;
      const itemTotal = unitPrice * qty;

      total += itemTotal;

      validatedItems.push({
        productId: dbProduct.id,
        name: dbProduct.name,
        price: unitPrice,
        quantity: qty,
        category: dbProduct.category || "",
      });
    }

    if (!Array.isArray(db.orders)) {
      db.orders = [];
    }

    const orderNumber = generateOrderNumber(db.orders);

    const nowIso = new Date().toISOString();

    const newOrder = {
      id: orderNumber,
      orderNumber,
      customerName: typeof customerName === "string" ? customerName.trim() : "Guest",
      mobileNumber: typeof mobileNumber === "string" ? mobileNumber.trim() : "",
      tableId: tableId || null,
      notes: typeof notes === "string" ? notes.trim() : "",
      items: validatedItems,
      total,
      status: "Pending",
      date: nowIso,
      createdAt: nowIso,
      pendingAt: nowIso,
    };

    db.orders.unshift(newOrder);

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to save order." });
    }

    broadcast("ORDER_CREATED", newOrder);

    return res.status(201).json(newOrder);
  });

  // UPDATE order status with status constants validation
  app.patch("/api/vendor/orders/:orderId/status", async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !isValidOrderStatus(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Status must be one of: ${VALID_ORDER_STATUSES.join(", ")}.`,
      });
    }

    const db = await readDB();
    if (!Array.isArray(db.orders)) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = db.orders.find((o: any) => o.id === orderId || o.orderNumber === orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const nowIso = new Date().toISOString();
    const normalizedStatus = normalizeOrderStatus(status);

    order.status = normalizedStatus;
    order.updatedAt = nowIso;

    switch (normalizedStatus) {
      case "Accepted":
        if (!order.acceptedAt) order.acceptedAt = nowIso;
        break;
      case "Preparing":
        if (!order.preparingAt) order.preparingAt = nowIso;
        break;
      case "Ready":
        if (!order.readyAt) order.readyAt = nowIso;
        break;
      case "Completed":
        if (!order.completedAt) order.completedAt = nowIso;
        break;
      case "Cancelled":
        if (!order.cancelledAt) order.cancelledAt = nowIso;
        break;
    }

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to update order status." });
    }

    broadcast("ORDER_STATUS_CHANGED", order);

    return res.json(order);
  });

  // GET restaurant settings
  app.get("/api/vendor/settings", async (req, res) => {
    const db = await readDB();

    const restaurant = db.restaurant || {
      id: "restaurant_001",
      name: "ServeMe Restaurant",
      slug: "serveme",
      address: "",
      phone: "",
      isOpen: true,
      preparationTime: "20–30 min",
      currency: "INR",
      gst: "18"
    };

    return res.json({
      name: restaurant.name || "ServeMe Restaurant",
      address: restaurant.address || "",
      phone: restaurant.phone || "",
      isOpen: typeof restaurant.isOpen === "boolean" ? restaurant.isOpen : true,
      currency: restaurant.currency || "INR",
      gst: restaurant.gst || "18",
      serviceChargePercentage: Number(restaurant.serviceChargePercentage || 0),
      preparationTime: restaurant.preparationTime || "20–30 min",
      logo: restaurant.logo || "",
      banner: restaurant.banner || "",
      updatedAt: restaurant.updatedAt || new Date().toISOString()
    });
  });

  // UPDATE restaurant settings
  app.patch("/api/vendor/settings", async (req, res) => {
    const { name, address, phone, isOpen, currency, gst, serviceChargePercentage, preparationTime, logo, banner } = req.body;
    const db = await readDB();

    if (!db.restaurant) {
      db.restaurant = {
        id: "restaurant_001",
        name: "ServeMe Restaurant",
        slug: "serveme",
        address: "",
        phone: "",
        isOpen: true,
        preparationTime: "20–30 min",
        currency: "INR",
        gst: "18",
        serviceChargePercentage: 5,
        logo: "",
        banner: "",
        updatedAt: new Date().toISOString()
      };
    }

    if (name !== undefined && typeof name === "string") {
      db.restaurant.name = name;
    }
    if (address !== undefined && typeof address === "string") {
      db.restaurant.address = address;
    }
    if (phone !== undefined && typeof phone === "string") {
      db.restaurant.phone = phone;
    }
    if (typeof isOpen === "boolean") {
      db.restaurant.isOpen = isOpen;
    }
    if (currency !== undefined && typeof currency === "string") {
      db.restaurant.currency = currency;
    }
    if (gst !== undefined && (typeof gst === "string" || typeof gst === "number")) {
      db.restaurant.gst = String(gst);
    }
    if (serviceChargePercentage !== undefined && !isNaN(Number(serviceChargePercentage))) {
      db.restaurant.serviceChargePercentage = Number(serviceChargePercentage);
    }
    if (preparationTime !== undefined && typeof preparationTime === "string") {
      db.restaurant.preparationTime = preparationTime;
    }
    if (logo !== undefined && typeof logo === "string") {
      db.restaurant.logo = logo.trim();
    }
    if (banner !== undefined && typeof banner === "string") {
      db.restaurant.banner = banner.trim();
    }

    db.restaurant.updatedAt = new Date().toISOString();

    if (!(await writeDB(db))) {
      return res.status(500).json({
        error: "Failed to update restaurant settings.",
      });
    }

    return res.json({
      name: db.restaurant.name,
      address: db.restaurant.address || "",
      phone: db.restaurant.phone || "",
      isOpen: db.restaurant.isOpen,
      currency: db.restaurant.currency || "INR",
      gst: db.restaurant.gst || "18",
      serviceChargePercentage: Number(db.restaurant.serviceChargePercentage || 0),
      preparationTime: db.restaurant.preparationTime || "20–30 min",
      logo: db.restaurant.logo || "",
      banner: db.restaurant.banner || "",
      updatedAt: db.restaurant.updatedAt
    });
  });

  // Toggle restaurant open/close status
  app.patch("/api/vendor/restaurant/status", async (req, res) => {
    const { isOpen } = req.body;

    if (typeof isOpen !== "boolean") {
      return res.status(400).json({
        error: "isOpen must be true or false.",
      });
    }

    const db = await readDB();

    if (!db.restaurant) {
      db.restaurant = {
        id: "restaurant_001",
        name: "ServeMe Restaurant",
        slug: "serveme",
        address: "",
        phone: "",
        isOpen: true,
        preparationTime: "20–30 min",
        currency: "INR",
        gst: "18",
        updatedAt: new Date().toISOString()
      };
    }

    db.restaurant.isOpen = isOpen;
    db.restaurant.updatedAt = new Date().toISOString();

    if (!(await writeDB(db))) {
      return res.status(500).json({
        error: "Failed to update restaurant status.",
      });
    }

    broadcast("RESTAURANT_STATUS_CHANGED", {
      isOpen: db.restaurant.isOpen,
      name: db.restaurant.name,
      updatedAt: db.restaurant.updatedAt,
    });

    return res.json({
      isOpen: db.restaurant.isOpen,
      name: db.restaurant.name,
      updatedAt: db.restaurant.updatedAt
    });
  });

  // Get all active (non-deleted) tables
  app.get("/api/vendor/tables", async (req, res) => {
    const db = await readDB();

    const tables = Array.isArray(db.tables)
      ? db.tables.filter((t: RestaurantTable) => !t.deleted)
      : [];

    tables.sort(
      (a: RestaurantTable, b: RestaurantTable) =>
        a.tableNumber - b.tableNumber,
    );

    res.json(tables);
  });

  // Get single table by ID
  app.get("/api/vendor/tables/:tableId", async (req, res) => {
    const { tableId } = req.params;
    const db = await readDB();

    const table = db.tables?.find(
      (item: RestaurantTable) => item.id === tableId && !item.deleted,
    );

    if (!table) {
      return res.status(404).json({
        error: "Table not found.",
      });
    }

    return res.json(table);
  });

  // Table summary stats (excluding deleted)
  app.get("/api/vendor/table-summary", async (req, res) => {
    const db = await readDB();

    const tables = Array.isArray(db.tables)
      ? db.tables.filter((t: RestaurantTable) => !t.deleted)
      : [];

    const total = tables.length;
    const active = tables.filter((t: RestaurantTable) => t.isActive === true).length;
    const inactive = total - active;

    return res.json({
      total,
      active,
      inactive,
    });
  });

  // GET dashboard statistics overview
  app.get("/api/vendor/dashboard", async (req, res) => {
    const db = await readDB();

    const nonDeletedTables = Array.isArray(db.tables) ? db.tables.filter((t: RestaurantTable) => !t.deleted) : [];
    const nonDeletedProducts = Array.isArray(db.products) ? db.products.filter((p: any) => !p.deleted) : [];

    const tables = nonDeletedTables.length;
    const products = nonDeletedProducts.length;

    let categoryCount = 0;
    if (Array.isArray(db.categories)) {
      categoryCount = db.categories.reduce((acc: number, cat: any) => {
        const subCount = Array.isArray(cat.subcategories) ? cat.subcategories.length : 0;
        return acc + 1 + subCount;
      }, 0);
    }

    const orders = Array.isArray(db.orders) ? db.orders : [];
    const todayStr = new Date().toISOString().split("T")[0];

    const todayOrders = orders.filter((o: any) => {
      if (!o.date) return false;
      return o.date.startsWith(todayStr);
    });

    const ordersToday = todayOrders.length;

    const todayRevenue = todayOrders.reduce((acc: number, o: any) => {
      const status = (o.status || "").toLowerCase();
      if (status === "cancelled" || status === "canceled") return acc;
      return acc + (Number(o.total) || 0);
    }, 0);

    const activeOrdersList = orders.filter((o: any) => {
      const status = (o.status || "").toLowerCase();
      return status !== "completed" && status !== "cancelled" && status !== "canceled";
    });

    const activeOrders = activeOrdersList.length;

    const pendingRevenue = activeOrdersList.reduce((acc: number, o: any) => {
      return acc + (Number(o.total) || 0);
    }, 0);

    const restaurantOpen = typeof db.restaurant?.isOpen === "boolean" ? db.restaurant.isOpen : true;

    return res.json({
      tables,
      products,
      categories: categoryCount,
      ordersToday,
      activeOrders,
      todayRevenue,
      pendingRevenue,
      restaurantOpen,
    });
  });

  // Create a table
  app.post("/api/vendor/tables", async (req, res) => {
    const {
      tableNumber,
      tableName,
      capacity = 4,
    } = req.body;

    const parsedTableNumber = Number(tableNumber);
    const parsedCapacity = Number(capacity);

    if (
      !Number.isInteger(parsedTableNumber) ||
      parsedTableNumber < 1
    ) {
      return res.status(400).json({
        error: "A valid table number is required.",
      });
    }

    if (
      !Number.isInteger(parsedCapacity) ||
      parsedCapacity < 1
    ) {
      return res.status(400).json({
        error: "Capacity must be at least 1.",
      });
    }

    const db = await readDB();

    if (!Array.isArray(db.tables)) {
      db.tables = [];
    }

    const existingActiveTable = db.tables.find(
      (table: RestaurantTable) =>
        table.tableNumber === parsedTableNumber &&
        !table.deleted,
    );

    if (existingActiveTable) {
      return res.status(409).json({
        error: `Table ${parsedTableNumber} already exists.`,
      });
    }

    const deletedTableIndex = db.tables.findIndex(
      (table: RestaurantTable) =>
        table.tableNumber === parsedTableNumber &&
        table.deleted === true,
    );

    if (deletedTableIndex !== -1) {
      const deletedTable = db.tables[deletedTableIndex] as RestaurantTable;

      const restoredTable: RestaurantTable = {
        ...deletedTable,
        tableName:
          typeof tableName === "string" && tableName.trim()
            ? tableName.trim()
            : `Table ${parsedTableNumber}`,
        capacity: parsedCapacity,
        isActive: true,
        deleted: false,
      };

      delete restoredTable.deletedAt;

      db.tables[deletedTableIndex] = restoredTable;

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to restore table.",
        });
      }

      return res.status(201).json(restoredTable);
    }

    const restaurantId =
      db.restaurant?.id || "restaurant_001";

    const newTable: RestaurantTable = {
      id: generateId("table"),
      restaurantId,
      tableNumber: parsedTableNumber,
      tableName:
        typeof tableName === "string" && tableName.trim()
          ? tableName.trim()
          : `Table ${parsedTableNumber}`,
      capacity: parsedCapacity,
      qrToken: generateUniqueQrToken(db.tables),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.tables.push(newTable);

    if (!(await writeDB(db))) {
      return res.status(500).json({
        error: "Failed to save table.",
      });
    }

    return res.status(201).json(newTable);
  });

  // Update a table
  app.patch("/api/vendor/tables/:tableId", async (req, res) => {
    const { tableId } = req.params;
    const {
      tableNumber,
      tableName,
      capacity,
      isActive,
    } = req.body;

    const db = await readDB();

    if (!Array.isArray(db.tables)) {
      return res.status(404).json({
        error: "Table not found.",
      });
    }

    const tableIndex = db.tables.findIndex(
      (table: RestaurantTable) =>
        table.id === tableId,
    );

    if (tableIndex === -1) {
      return res.status(404).json({
        error: "Table not found.",
      });
    }

    const currentTable =
      db.tables[tableIndex] as RestaurantTable;

    if (tableNumber !== undefined) {
      const parsedTableNumber = Number(tableNumber);

      if (
        !Number.isInteger(parsedTableNumber) ||
        parsedTableNumber < 1
      ) {
        return res.status(400).json({
          error: "Invalid table number.",
        });
      }

      const duplicate = db.tables.some(
        (table: RestaurantTable) =>
          table.id !== tableId &&
          table.tableNumber === parsedTableNumber,
      );

      if (duplicate) {
        return res.status(409).json({
          error: `Table ${parsedTableNumber} already exists.`,
        });
      }

      currentTable.tableNumber = parsedTableNumber;
    }

    if (tableName !== undefined) {
      currentTable.tableName =
        typeof tableName === "string" &&
        tableName.trim()
          ? tableName.trim()
          : `Table ${currentTable.tableNumber}`;
    }

    if (capacity !== undefined) {
      const parsedCapacity = Number(capacity);

      if (
        !Number.isInteger(parsedCapacity) ||
        parsedCapacity < 1
      ) {
        return res.status(400).json({
          error: "Invalid table capacity.",
        });
      }

      currentTable.capacity = parsedCapacity;
    }

    if (typeof isActive === "boolean") {
      currentTable.isActive = isActive;
    }

    db.tables[tableIndex] = currentTable;

    if (!(await writeDB(db))) {
      return res.status(500).json({
        error: "Failed to update table.",
      });
    }

    return res.json(currentTable);
  });

  // SOFT DELETE table
  app.delete("/api/vendor/tables/:tableId", async (req, res) => {
    const { tableId } = req.params;
    const db = await readDB();

    if (!Array.isArray(db.tables)) {
      return res.status(404).json({ error: "Table not found." });
    }

    const tableIndex = db.tables.findIndex(
      (t: RestaurantTable) => t.id === tableId && !t.deleted,
    );

    if (tableIndex === -1) {
      return res.status(404).json({ error: "Table not found or already deleted." });
    }

    const currentTable = db.tables[tableIndex];
    currentTable.deleted = true;
    currentTable.deletedAt = new Date().toISOString();

    db.tables[tableIndex] = currentTable;

    if (!(await writeDB(db))) {
      return res.status(500).json({ error: "Failed to delete table." });
    }

    return res.json({
      success: true,
      message: "Table soft deleted successfully.",
      table: currentTable,
    });
  });

  // Activate or deactivate a table
  app.patch(
    "/api/vendor/tables/:tableId/status",
    async (req, res) => {
      const { tableId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          error: "isActive must be true or false.",
        });
      }

      const db = await readDB();

      const table = db.tables?.find(
        (item: RestaurantTable) =>
          item.id === tableId,
      );

      if (!table) {
        return res.status(404).json({
          error: "Table not found.",
        });
      }

      table.isActive = isActive;

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to update table status.",
        });
      }

      return res.json(table);
    },
  );

  // Regenerate QR token
  app.post(
    "/api/vendor/tables/:tableId/regenerate-qr",
    async (req, res) => {
      const { tableId } = req.params;
      const db = await readDB();

      const table = db.tables?.find(
        (item: RestaurantTable) =>
          item.id === tableId,
      );

      if (!table) {
        return res.status(404).json({
          error: "Table not found.",
        });
      }

      table.qrToken = generateUniqueQrToken(db.tables || []);

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to regenerate QR token.",
        });
      }

      return res.json(table);
    },
  );

  // Public QR validation
  app.get("/api/qr/:token", async (req, res) => {
    const { token } = req.params;
    const db = await readDB();

    console.log("Received token:", token);
    console.log("Working directory:", process.cwd());
    console.log("Database tables:", db.tables);
    console.log("Database file path:", DB_FILE);

    const table = db.tables?.find(
      (item: RestaurantTable) =>
        (item.qrToken === token || (item as any).qr_token === token) &&
        item.isActive === true &&
        !item.deleted,
    );

    if (!table) {
      return res.status(404).json({
        error: "This QR code is invalid or inactive.",
      });
    }

    const restaurant = db.restaurant;

    if (!restaurant) {
      return res.status(404).json({
        error: "Restaurant information not found.",
      });
    }

    if (!restaurant.isOpen) {
      return res.status(403).json({
        error: "Restaurant is currently closed.",
      });
    }

    return res.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        logo: restaurant.logo || "",
        banner: restaurant.banner || "",
        is_open: restaurant.isOpen,
        prep_time: restaurant.preparationTime,
        gst_percentage: Number(restaurant.gst || 0),
        service_charge_percentage: Number(
          restaurant.serviceChargePercentage || 0,
        ),
      },
      table: {
        id: table.id,
        table_number: table.tableNumber,
        table_name: table.tableName,
        is_active: table.isActive,
      },
      qr_token: table.qrToken || (table as any).qr_token,
    });
  });

  // Public Menu by QR Token endpoint
  app.get("/api/public/menu/:qrToken", async (req, res) => {
    const { qrToken } = req.params;
    const db = await readDB();

    const table = db.tables?.find(
      (item: RestaurantTable) =>
        (item.qrToken === qrToken || (item as any).qr_token === qrToken) &&
        item.isActive === true &&
        !item.deleted,
    );

    if (!table) {
      return res.status(404).json({
        error: "This QR code is invalid or inactive.",
      });
    }

    const restaurant = db.restaurant;

    if (!restaurant) {
      return res.status(404).json({
        error: "Restaurant information not found.",
      });
    }

    if (!restaurant.isOpen) {
      return res.status(403).json({
        error: "Restaurant is currently closed.",
      });
    }

    const products = (db.products || [])
      .filter(
        (product: any) =>
          !product.deleted &&
          product.status === "Available" &&
          Number(product.stock ?? 0) > 0,
      )
      .sort(
        (a: any, b: any) =>
          Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0),
      )
      .map((product: any) => ({
        id: String(product.id),
        name: product.name,
        description: product.description || "",
        price: Number(product.price || 0),
        image_url: product.image || "",
        is_available: product.status === "Available",
        is_active: !product.deleted,
        is_veg:
          product.foodType === "Veg"
            ? true
            : product.foodType === "Non-Veg"
              ? false
              : Boolean(product.isVeg),
        stock: Number(product.stock ?? 0),
        category_id: product.category || "uncategorized",
        category_name: product.category || "Other",
        prep_time: product.preparationTime || "15-20 min",
        featured: Boolean(product.featured),
        display_order: Number(product.displayOrder ?? 1),
      }));

    const categoryOrderMap = new Map<string, number>(
      (Array.isArray(db.categories) ? db.categories : []).map(
        (category: any) => [
          String(category.name || category.id || "").toLowerCase(),
          Number(category.displayOrder ?? 9999),
        ],
      ),
    );

    const categoryNames = [
      ...new Set(products.map((product: any) => product.category_name)),
    ].sort((a: string, b: string) => {
      const orderA = Number(categoryOrderMap.get(a.toLowerCase()) ?? 9999);
      const orderB = Number(categoryOrderMap.get(b.toLowerCase()) ?? 9999);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.localeCompare(b);
    });

    const categories = categoryNames.map((categoryName) => ({
      id: String(categoryName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      name: categoryName,
      restaurant_id: String(restaurant.id),
      menu_items: products.filter(
        (product: any) => product.category_name === categoryName,
      ),
    }));

    return res.json({
      restaurant: {
        id: String(restaurant.id),
        name: restaurant.name,
        logo_url: restaurant.logo || "",
        banner_url: restaurant.banner || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        is_open: restaurant.isOpen,
        prep_time: restaurant.preparationTime,
        gst_percentage: Number(restaurant.gst || 0),
        service_charge_percentage: Number(
          restaurant.serviceChargePercentage || 0,
        ),
      },
      table: {
        id: String(table.id),
        table_number: table.tableNumber,
        table_name: table.tableName,
        is_active: table.isActive,
      },
      categories,
    });
  });

  // Generate QR code image endpoint
  app.get(
    "/api/vendor/tables/:tableId/qr",
    async (req, res) => {
      try {
        const { tableId } = req.params;
        const db = await readDB();

        const table = db.tables?.find(
          (item: RestaurantTable) =>
            item.id === tableId,
        );

        if (!table) {
          return res.status(404).json({
            error: "Table not found.",
          });
        }

        const qrMenuBaseUrl = (
          process.env.QR_MENU_URL ||
          "https://qr-menu.serveme.in"
        ).replace(/\/+$/, "");

        const targetUrl =
          `${qrMenuBaseUrl}/q/${encodeURIComponent(
            table.qrToken,
          )}`;

        const dataUrl = await QRCode.toDataURL(
          targetUrl,
          {
            width: 420,
            margin: 2,
            errorCorrectionLevel: "M",
          },
        );

        return res.json({
          tableId: table.id,
          tableNumber: table.tableNumber,
          tableName: table.tableName,
          targetUrl,
          qrDataUrl: dataUrl,
        });
      } catch (error) {
        console.error("QR generation error:", error);

        return res.status(500).json({
          error: "Failed to generate QR code.",
        });
      }
    },
  );

  // Download QR code image endpoint
  app.get(
    "/api/vendor/tables/:tableId/download",
    async (req, res) => {
      try {
        const { tableId } = req.params;
        const db = await readDB();

        const table = db.tables?.find(
          (item: RestaurantTable) =>
            item.id === tableId,
        );

        if (!table) {
          return res.status(404).json({
            error: "Table not found.",
          });
        }

        const qrMenuBaseUrl = (
          process.env.QR_MENU_URL ||
          "https://qr-menu.serveme.in"
        ).replace(/\/+$/, "");

        const targetUrl =
          `${qrMenuBaseUrl}/q/${encodeURIComponent(
            table.qrToken,
          )}`;

        const buffer = await QRCode.toBuffer(targetUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
        });

        res.setHeader("Content-Type", "image/png");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="table-${table.tableNumber}-qr.png"`,
        );

        return res.send(buffer);
      } catch (error) {
        console.error("QR download generation error:", error);

        return res.status(500).json({
          error: "Failed to generate QR code for download.",
        });
      }
    },
  );

  // Print table QR card HTML page endpoint
  app.get(
    "/api/vendor/tables/:tableId/print",
    async (req, res) => {
      try {
        const { tableId } = req.params;
        const db = await readDB();

        const table = db.tables?.find(
          (item: RestaurantTable) => item.id === tableId,
        );

        if (!table) {
          return res.status(404).send("<h1>Table not found</h1>");
        }

        const restaurant = db.restaurant || {
          name: "ServeMe Restaurant",
        };

        const qrMenuBaseUrl = (
          process.env.QR_MENU_URL || "https://qr-menu.serveme.in"
        ).replace(/\/+$/, "");

        const targetUrl = `${qrMenuBaseUrl}/q/${encodeURIComponent(table.qrToken)}`;

        const dataUrl = await QRCode.toDataURL(targetUrl, {
          width: 500,
          margin: 2,
          errorCorrectionLevel: "M",
        });

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Print QR Card - ${table.tableName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #f4f4f5; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
    .card { background: #ffffff; border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.08); width: 380px; padding: 2.5rem 2rem; text-align: center; border: 1px solid #e4e4e7; }
    .logo-container { width: 64px; height: 64px; background: #000000; color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: bold; margin: 0 auto 1.25rem; }
    .restaurant-name { font-size: 1.25rem; font-weight: 700; color: #18181b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .subtitle { font-size: 0.875rem; color: #71717a; margin-bottom: 1.5rem; }
    .table-badge { display: inline-block; background: #f4f4f5; color: #18181b; font-size: 1.125rem; font-weight: 700; padding: 0.5rem 1.25rem; border-radius: 9999px; margin-bottom: 1.5rem; }
    .qr-box { background: #ffffff; padding: 1rem; border-radius: 1rem; border: 2px dashed #e4e4e7; display: inline-block; margin-bottom: 1.5rem; }
    .qr-box img { width: 260px; height: 260px; display: block; }
    .scan-title { font-size: 1.5rem; font-weight: 800; color: #000000; margin-bottom: 0.35rem; }
    .scan-desc { font-size: 0.875rem; color: #71717a; }
    .print-btn { margin-top: 2rem; background: #000000; color: #ffffff; border: none; padding: 0.75rem 1.75rem; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .print-btn:hover { opacity: 0.9; }
    @media print {
      body { background: #ffffff; padding: 0; min-height: auto; }
      .card { box-shadow: none; border: 2px solid #000000; page-break-inside: avoid; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">🍽️</div>
    <h1 class="restaurant-name">${restaurant.name || "ServeMe Restaurant"}</h1>
    <p class="subtitle">Digital Dining Experience</p>
    <div class="table-badge">${table.tableName}</div>
    <div class="qr-box">
      <img src="${dataUrl}" alt="QR Code for ${table.tableName}">
    </div>
    <h2 class="scan-title">Scan to Order</h2>
    <p class="scan-desc">Point your phone camera to view menu & pay</p>
    <button class="print-btn" onclick="window.print()">Print Card</button>
  </div>
</body>
</html>`;

        res.setHeader("Content-Type", "text/html");
        return res.send(html);
      } catch (error) {
        console.error("QR print page error:", error);
        return res.status(500).send("<h1>Failed to generate print page</h1>");
      }
    },
  );

  // Create order from QR Menu
  app.post("/api/public/orders", async (req, res) => {
    try {
      const {
        qrToken,
        customerName,
        mobileNumber,
        notes,
        items,
      } = req.body;

      if (!qrToken || typeof qrToken !== "string") {
        return res.status(400).json({
          error: "QR token is required.",
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: "Order must contain at least one item.",
        });
      }

      const db = await readDB();

      const table = Array.isArray(db.tables)
        ? db.tables.find(
            (item: RestaurantTable) =>
              (item.qrToken === qrToken ||
                (item as any).qr_token === qrToken) &&
              item.isActive === true &&
              !item.deleted,
          )
        : null;

      if (!table) {
        return res.status(404).json({
          error: "This QR code is invalid or inactive.",
        });
      }

      const restaurant = db.restaurant;

      if (!restaurant) {
        return res.status(404).json({
          error: "Restaurant information not found.",
        });
      }

      if (!restaurant.isOpen) {
        return res.status(403).json({
          error: "Restaurant is currently closed.",
        });
      }

      const products = Array.isArray(db.products)
        ? db.products
        : [];

      const validatedItems: any[] = [];
      let subtotal = 0;

      for (const item of items) {
        const productId = item.productId || item.id;

        const product = products.find(
          (entry: any) =>
            String(entry.id) === String(productId) &&
            !entry.deleted,
        );

        if (!product) {
          return res.status(400).json({
            error: `Product '${productId}' was not found.`,
          });
        }

        if (
          product.status !== "Available" ||
          Number(product.stock ?? 0) <= 0
        ) {
          return res.status(400).json({
            error: `${product.name} is unavailable.`,
          });
        }

        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
          return res.status(400).json({
            error: `Invalid quantity for ${product.name}.`,
          });
        }

        if (quantity > Number(product.stock)) {
          return res.status(400).json({
            error: `Only ${product.stock} ${product.name} available.`,
          });
        }

        const unitPrice = Number(product.price || 0);
        const itemSubtotal = unitPrice * quantity;

        subtotal += itemSubtotal;

        validatedItems.push({
          productId: String(product.id),
          name: product.name,
          quantity,
          price: unitPrice,
          itemTotal: itemSubtotal,
          category: product.category || "",
          notes:
            typeof item.notes === "string"
              ? item.notes.trim()
              : "",
          customizations: Array.isArray(item.customizations)
            ? item.customizations
            : [],
        });
      }

      const enableGst = restaurant.enableGst !== false;
      const enableServiceCharge = restaurant.enableServiceCharge !== false;

      const gstPercentage = enableGst ? Number(restaurant.gst || 0) : 0;
      const serviceChargePercentage = enableServiceCharge
        ? Number(restaurant.serviceChargePercentage || 0)
        : 0;

      const gstAmount = Number(
        ((subtotal * gstPercentage) / 100).toFixed(2),
      );

      const serviceChargeAmount = Number(
        (
          (subtotal * serviceChargePercentage) /
          100
        ).toFixed(2),
      );

      const total = Number(
        (
          subtotal +
          gstAmount +
          serviceChargeAmount
        ).toFixed(2),
      );

      if (!Array.isArray(db.orders)) {
        db.orders = [];
      }

      const orderNumber = generateOrderNumber(db.orders);
      const now = new Date().toISOString();

      const newOrder = {
        id: orderNumber,
        orderNumber,

        restaurantId: restaurant.id,

        tableId: table.id,
        tableNumber: table.tableNumber,
        tableName: table.tableName,

        qrToken,

        customerName:
          typeof customerName === "string" &&
          customerName.trim()
            ? customerName.trim()
            : "Guest",

        mobileNumber:
          typeof mobileNumber === "string"
            ? mobileNumber.trim()
            : "",

        notes:
          typeof notes === "string"
            ? notes.trim()
            : "",

        items: validatedItems,

        subtotal,
        gstPercentage,
        gstAmount,
        serviceChargePercentage,
        serviceChargeAmount,
        total,

        status: "Pending",
        paymentStatus: "Unpaid",
        paymentMethod: null,
        paidAt: null,
        transactionRef: "",

        date: now,
        createdAt: now,
        updatedAt: now,
        pendingAt: now,
      };

      db.orders.unshift(newOrder);

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to save order.",
        });
      }

      broadcast("ORDER_CREATED", newOrder);

      return res.status(201).json(newOrder);
    } catch (error) {
      console.error("Public order creation error:", error);

      return res.status(500).json({
        error: "Failed to place order.",
      });
    }
  });

  // Vendor Settings: Get Tax & Service Charge Settings
  app.get("/api/vendor/settings/tax", async (req, res) => {
    try {
      const db = await readDB();
      const restaurant = db.restaurant || {};

      const enableGst = restaurant.enableGst !== false && Number(restaurant.gst ?? 18) > 0;
      const gstPercentage = Number(restaurant.gst ?? 18);
      const enableServiceCharge = restaurant.enableServiceCharge !== false && Number(restaurant.serviceChargePercentage ?? 5) > 0;
      const serviceChargePercentage = Number(restaurant.serviceChargePercentage ?? 5);

      return res.json({
        enableGst,
        gstPercentage,
        enableServiceCharge,
        serviceChargePercentage,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Vendor Settings: Update Tax & Service Charge Settings
  const handleTaxSettingsUpdate = async (req: any, res: any) => {
    try {
      const { enableGst, gstPercentage, enableServiceCharge, serviceChargePercentage } = req.body;
      const db = await readDB();

      if (!db.restaurant) {
        db.restaurant = {
          id: "restaurant_001",
          name: "ServeMe Restaurant",
          isOpen: true,
        };
      }

      const isGstEnabled = Boolean(enableGst);
      const isServiceEnabled = Boolean(enableServiceCharge);

      const parsedGst = isGstEnabled ? Math.max(0, Number(gstPercentage || 0)) : 0;
      const parsedService = isServiceEnabled ? Math.max(0, Number(serviceChargePercentage || 0)) : 0;

      db.restaurant.enableGst = isGstEnabled;
      db.restaurant.gst = parsedGst;
      db.restaurant.enableServiceCharge = isServiceEnabled;
      db.restaurant.serviceChargePercentage = parsedService;
      db.restaurant.updatedAt = new Date().toISOString();

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to save tax settings to database.",
        });
      }

      const updatedSettings = {
        success: true,
        enableGst: isGstEnabled,
        gstPercentage: parsedGst,
        enableServiceCharge: isServiceEnabled,
        serviceChargePercentage: parsedService,
      };

      broadcast("RESTAURANT_TAX_SETTINGS_UPDATED", updatedSettings);

      return res.json(updatedSettings);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  app.patch("/api/vendor/settings/tax", handleTaxSettingsUpdate);
  app.post("/api/vendor/settings/tax", handleTaxSettingsUpdate);

  // Vendor Settings: Get Restaurant Info for Bills
  app.get("/api/vendor/settings/restaurant", async (req, res) => {
    try {
      const db = await readDB();
      const restaurant = db.restaurant || {};

      return res.json({
        name: restaurant.name || "serveMe Restaurant",
        address: restaurant.address || "123 Food Street, Culinary Capital",
        phone: restaurant.phone || "+1 234-567-8900",
        footerNote: restaurant.footerNote || "Thank you for dining with serveMe!\nPlease visit us again soon.",
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Vendor Settings: Save Restaurant Info for Bills
  const handleRestaurantInfoUpdate = async (req: any, res: any) => {
    try {
      const { name, address, phone, footerNote } = req.body;
      const db = await readDB();

      if (!db.restaurant) {
        db.restaurant = {
          id: "restaurant_001",
          isOpen: true,
        };
      }

      if (typeof name === "string") db.restaurant.name = name.trim();
      if (typeof address === "string") db.restaurant.address = address.trim();
      if (typeof phone === "string") db.restaurant.phone = phone.trim();
      if (typeof footerNote === "string") db.restaurant.footerNote = footerNote.trim();
      db.restaurant.updatedAt = new Date().toISOString();

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to save restaurant details to database.",
        });
      }

      return res.json({
        success: true,
        restaurant: db.restaurant,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  app.patch("/api/vendor/settings/restaurant", handleRestaurantInfoUpdate);
  app.post("/api/vendor/settings/restaurant", handleRestaurantInfoUpdate);

  // Update Specific Order Details (Customer Name, Mobile Number, Notes)
  app.patch("/api/vendor/orders/:orderId/details", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { customerName, mobileNumber, notes } = req.body;
      const db = await readDB();

      if (!Array.isArray(db.orders)) {
        return res.status(404).json({ error: "No orders found." });
      }

      const index = db.orders.findIndex(
        (o: any) => o.id === orderId || o.orderNumber === orderId
      );

      if (index === -1) {
        return res.status(404).json({ error: `Order '${orderId}' not found.` });
      }

      const targetOrder = db.orders[index];
      if (typeof customerName === "string") targetOrder.customerName = customerName.trim() || "Guest";
      if (typeof mobileNumber === "string") targetOrder.mobileNumber = mobileNumber.trim();
      if (typeof notes === "string") targetOrder.notes = notes.trim();
      targetOrder.updatedAt = new Date().toISOString();

      db.orders[index] = targetOrder;

      if (!(await writeDB(db))) {
        return res.status(500).json({ error: "Failed to update order details." });
      }

      broadcast("ORDER_DETAILS_UPDATED", targetOrder);

      return res.json(targetOrder);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Service Requests Public Endpoint
  app.post("/api/public/service-requests", async (req, res) => {
    try {
      const { qrToken, requestType, message } = req.body;
      const db = await readDB();

      if (!qrToken || typeof qrToken !== "string") {
        return res.status(400).json({
          error: "QR token is required.",
        });
      }

      if (!requestType || typeof requestType !== "string") {
        return res.status(400).json({
          error: "Request type is required.",
        });
      }

      const table = Array.isArray(db.tables)
        ? db.tables.find(
            (item: RestaurantTable) =>
              (item.qrToken === qrToken ||
                (item as any).qr_token === qrToken) &&
              item.isActive === true &&
              !item.deleted,
          )
        : null;

      if (!table) {
        return res.status(404).json({
          error: "This QR code is invalid or inactive.",
        });
      }

      if (!Array.isArray(db.serviceRequests)) {
        db.serviceRequests = [];
      }

      const now = new Date().toISOString();

      const newRequest = {
        id: `REQ-${crypto.randomUUID()}`,
        qrToken,
        tableId: table.id,
        tableNumber: table.tableNumber,
        tableName: table.tableName,
        requestType: requestType.trim(),
        message:
          typeof message === "string"
            ? message.trim()
            : "",
        status: "Pending",
        createdAt: now,
        updatedAt: now,
      };

      db.serviceRequests.unshift(newRequest);

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to save service request.",
        });
      }

      broadcast("SERVICE_REQUEST_CREATED", newRequest);

      return res.status(201).json(newRequest);
    } catch (error) {
      console.error("Create service request error:", error);

      return res.status(500).json({
        error: "Failed to create service request.",
      });
    }
  });

  // Get all vendor service requests
  app.get("/api/vendor/service-requests", async (req, res) => {
    try {
      const db = await readDB();
      const requests = Array.isArray(db.serviceRequests)
        ? db.serviceRequests.filter((r: any) => !r.deleted)
        : [];
      return res.json(requests);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to fetch service requests: " + error.message });
    }
  });

  // Update service request status (Accept / Complete / Cancel)
  app.patch("/api/vendor/service-requests/:requestId/status", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      const db = await readDB();

      if (!Array.isArray(db.serviceRequests)) {
        return res.status(404).json({ error: "Service request not found." });
      }

      const index = db.serviceRequests.findIndex((r: any) => r.id === requestId);
      if (index === -1) {
        return res.status(404).json({ error: "Service request not found." });
      }

      if (status && typeof status === "string") {
        db.serviceRequests[index].status = status;
        db.serviceRequests[index].updatedAt = new Date().toISOString();
      }

      if (!(await writeDB(db))) {
        return res.status(500).json({ error: "Failed to update service request status." });
      }

      return res.json(db.serviceRequests[index]);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to update service request: " + error.message });
    }
  });

  // Delete service request
  app.delete("/api/vendor/service-requests/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const db = await readDB();

      if (!Array.isArray(db.serviceRequests)) {
        return res.status(404).json({ error: "Service request not found." });
      }

      const index = db.serviceRequests.findIndex((r: any) => r.id === requestId);
      if (index === -1) {
        return res.status(404).json({ error: "Service request not found." });
      }

      db.serviceRequests.splice(index, 1);

      if (!(await writeDB(db))) {
        return res.status(500).json({ error: "Failed to delete service request." });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to delete service request: " + error.message });
    }
  });

  // Kitchen API: Get active orders
  app.get("/api/kitchen/orders", async (req, res) => {
    const db = await readDB();

    const orders = Array.isArray(db.orders)
      ? db.orders
          .filter((order: any) => {
            const status = String(order.status || "").toLowerCase();

            return (
              status !== "completed" &&
              status !== "cancelled" &&
              status !== "canceled"
            );
          })
          .sort(
            (a: any, b: any) =>
              new Date(a.createdAt || a.date).getTime() -
              new Date(b.createdAt || b.date).getTime(),
          )
      : [];

    return res.json(orders);
  });

  // Kitchen API: Get single order
  app.get("/api/kitchen/orders/:orderId", async (req, res) => {
    const { orderId } = req.params;
    const db = await readDB();

    const order = Array.isArray(db.orders)
      ? db.orders.find(
          (item: any) =>
            item.id === orderId ||
            item.orderNumber === orderId,
        )
      : null;

    if (!order) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    return res.json(order);
  });

  // Kitchen API: Update order status
  app.patch(
    "/api/kitchen/orders/:orderId/status",
    async (req, res) => {
      const { orderId } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "Accepted",
        "Preparing",
        "Ready",
        "Completed",
        "Cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `Status must be one of: ${allowedStatuses.join(", ")}`,
        });
      }

      const db = await readDB();

      const order = Array.isArray(db.orders)
        ? db.orders.find(
            (item: any) =>
              item.id === orderId ||
              item.orderNumber === orderId,
          )
        : null;

      if (!order) {
        return res.status(404).json({
          error: "Order not found.",
        });
      }

      const now = new Date().toISOString();

      order.status = status;
      order.updatedAt = now;

      if (status === "Accepted" && !order.acceptedAt) {
        order.acceptedAt = now;
      }

      if (status === "Preparing" && !order.preparingAt) {
        order.preparingAt = now;
      }

      if (status === "Ready" && !order.readyAt) {
        order.readyAt = now;
      }

      if (status === "Completed" && !order.completedAt) {
        order.completedAt = now;
      }

      if (status === "Cancelled" && !order.cancelledAt) {
        order.cancelledAt = now;
      }

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to update order status.",
        });
      }

      broadcast("ORDER_STATUS_CHANGED", order);

      return res.json(order);
    },
  );

  // Vendor Order Payment Collection API
  app.patch("/api/vendor/orders/:orderId/payment", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { paymentStatus, paymentMethod, transactionRef } = req.body;

      const db = await readDB();

      const order = Array.isArray(db.orders)
        ? db.orders.find(
            (item: any) =>
              item.id === orderId ||
              item.orderNumber === orderId,
          )
        : null;

      if (!order) {
        return res.status(404).json({
          error: "Order not found.",
        });
      }

      if (paymentStatus && paymentStatus !== "Paid" && paymentStatus !== "Unpaid") {
        return res.status(400).json({
          error: "Invalid payment status. Must be 'Paid' or 'Unpaid'.",
        });
      }

      const validMethods = ["Cash", "UPI", "Card"];
      if (paymentMethod && !validMethods.includes(paymentMethod)) {
        return res.status(400).json({
          error: `Payment method must be one of: ${validMethods.join(", ")}`,
        });
      }

      const now = new Date().toISOString();

      order.paymentStatus = paymentStatus || "Paid";
      order.paymentMethod = paymentMethod || order.paymentMethod || "Cash";
      order.transactionRef = typeof transactionRef === "string" ? transactionRef.trim() : (order.transactionRef || "");
      
      if (order.paymentStatus === "Paid") {
        order.paidAt = order.paidAt || now;
      }
      order.updatedAt = now;

      if (!(await writeDB(db))) {
        return res.status(500).json({
          error: "Failed to update payment details.",
        });
      }

      broadcast("ORDER_PAYMENT_UPDATED", order);

      return res.json(order);
    } catch (error: any) {
      console.error("Update order payment error:", error);
      return res.status(500).json({
        error: "Failed to update order payment.",
      });
    }
  });

  // Track a public QR Menu order
  app.get("/api/public/orders/:orderNumber", async (req, res) => {
    try {
      const { orderNumber } = req.params;

      const qrToken =
        typeof req.query.qr_token === "string"
          ? req.query.qr_token
          : typeof req.query.qrToken === "string"
            ? req.query.qrToken
            : "";

      if (!qrToken) {
        return res.status(400).json({
          error: "QR token is required.",
        });
      }

      const db = await readDB();

      const table = Array.isArray(db.tables)
        ? db.tables.find(
            (item: RestaurantTable) =>
              (item.qrToken === qrToken ||
                (item as any).qr_token === qrToken) &&
              item.isActive === true &&
              !item.deleted,
          )
        : null;

      if (!table) {
        return res.status(404).json({
          error: "This QR code is invalid or inactive.",
        });
      }

      const order = Array.isArray(db.orders)
        ? db.orders.find(
            (item: any) =>
              (String(item.orderNumber) === String(orderNumber) ||
                String(item.id) === String(orderNumber)) &&
              String(item.tableId) === String(table.id),
          )
        : null;

      if (!order) {
        return res.status(404).json({
          error: "Order not found.",
        });
      }

      return res.json(order);
    } catch (error) {
      console.error("Public order tracking error:", error);

      return res.status(500).json({
        error: "Failed to track order.",
      });
    }
  });

  // Setup Vite development server or production static serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.join(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});