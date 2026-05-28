import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .references(() => modules.id)
    .notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  question: text("question"),
  status: text("status").default("pending").notNull(),
  nextReviewAt: timestamp("next_review_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
