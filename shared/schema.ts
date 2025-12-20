import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const resultsLog = pgTable("results_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  assessmentType: varchar("assessment_type").notNull().default('IPIP-NEO-120'),
  responses: jsonb("responses").notNull(),
  scores: jsonb("scores").notNull(),
  neuroticismScore: real("neuroticism_score").notNull(),
  extraversionScore: real("extraversion_score").notNull(),
  opennessScore: real("openness_score").notNull(),
  agreeablenessScore: real("agreeableness_score").notNull(),
  conscientiousnessScore: real("conscientiousness_score").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertResultsLogSchema = createInsertSchema(resultsLog).omit({
  id: true,
  completedAt: true,
});

export type InsertResultsLog = z.infer<typeof insertResultsLogSchema>;
export type ResultsLog = typeof resultsLog.$inferSelect;

export const traitScoresSchema = z.object({
  N: z.number().min(0).max(100),
  E: z.number().min(0).max(100),
  O: z.number().min(0).max(100),
  A: z.number().min(0).max(100),
  C: z.number().min(0).max(100),
});

export type TraitScores = z.infer<typeof traitScoresSchema>;

export const assessmentResponsesSchema = z.record(z.string(), z.number().min(1).max(5));
export type AssessmentResponses = z.infer<typeof assessmentResponsesSchema>;
