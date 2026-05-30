import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

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

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal"),
  cadence: text("cadence").default("morning").notNull(), // 'morning' | 'twice' | 'weekdays'
  status: text("status").default("draft").notNull(), // draft | researching | review | learning
  emoji: text("emoji"),
  blurb: text("blurb"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  minutes: integer("minutes").notNull(),
  included: boolean("included").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
