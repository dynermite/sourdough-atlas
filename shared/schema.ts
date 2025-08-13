import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").default(null),
  phone: text("phone"),
  website: text("website"),
  description: text("description"),
  sourdoughVerified: integer("sourdough_verified").default(0).notNull(), // 1 for verified, 0 for unverified, -1 for rejected
  sourdoughKeywords: text("sourdough_keywords").array(), // Array of found keywords
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  imageUrl: text("image_url"),
  hours: text("hours"), // JSON string for operating hours
  googlePlaceId: text("google_place_id"), // Google Places ID for tracking
  lastScraped: varchar("last_scraped"), // ISO date string when last scraped
  reviews: text("reviews").array(), // Array of review text for analysis
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
