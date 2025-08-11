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
  zipCode: text("zip_code"),
  phone: text("phone"),
  website: text("website"),
  description: text("description"),
  sourdoughVerified: integer("sourdough_verified").default(1).notNull(), // 1 for verified, 0 for not verified
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  imageUrl: text("image_url"),
  hours: text("hours"), // JSON string for operating hours
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
