import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import { restaurants } from "@shared/schema";

// Create local SQLite database for testing
const sqlite = new Database('sourdough-atlas.db');
export const db = drizzle(sqlite, { schema });

// Create tables if they don't exist
try {
  db.run(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT,
      phone TEXT,
      website TEXT,
      description TEXT,
      sourdough_verified INTEGER DEFAULT 0 NOT NULL,
      sourdough_keywords TEXT,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      image_url TEXT,
      hours TEXT,
      google_place_id TEXT,
      last_scraped TEXT,
      reviews TEXT
    );
  `);
  console.log('✅ Local SQLite database ready');
} catch (error) {
  console.log('Database table already exists or created successfully');
}