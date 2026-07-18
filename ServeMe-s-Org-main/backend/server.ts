import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";

const DB_PATH = path.join(process.cwd(), "backend", "db.json");
const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;
if (DATABASE_URL) {
  console.log("Initializing PostgreSQL connection pool...");
  pool = new Pool({
    connectionString: DATABASE_URL,
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
      if (fs.existsSync(DB_PATH)) {
        try {
          initialState = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
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
      if (res.rows.length > 0) {
        return res.rows[0].data;
      }
    } catch (err) {
      console.error("Error reading from PostgreSQL database:", err);
      throw err;
    }
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading db.json, returning empty object:", err);
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
      return false;
    }
  }
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing db.json:", err);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  if (pool) {
    await initPGSchema();
  }

  // Increase payload limit just in case
  app.use(express.json({ limit: "50mb" }));

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

  // POST update complete DB state
  app.post("/api/db", async (req, res) => {
    try {
      const success = await writeDB(req.body);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to write database file." });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update database state: " + err.message });
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

  // Setup Vite development server or production static serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
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
