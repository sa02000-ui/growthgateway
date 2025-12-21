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

export const peerFeedback = pgTable("peer_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetUserId: varchar("target_user_id").notNull(),
  scores: jsonb("scores").notNull(),
  peerName: text("peer_name"),
  isAnonymous: varchar("is_anonymous").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPeerFeedbackSchema = createInsertSchema(peerFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertPeerFeedback = z.infer<typeof insertPeerFeedbackSchema>;
export type PeerFeedback = typeof peerFeedback.$inferSelect;

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  maritalStatus: varchar("marital_status"),
  yearsInCurrentRegion: integer("years_in_current_region"),
  culturalBackground: varchar("cultural_background"),
  profession: varchar("profession"),
  industry: varchar("industry"),
  educationLevel: varchar("education_level"),
  householdIncome: varchar("household_income"),
  parentalOccupation: varchar("parental_occupation"),
  parentalIncome: varchar("parental_income"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export const lifeEvents = pgTable("life_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  assessmentId: varchar("assessment_id"),
  newJob: varchar("new_job").default('false'),
  relocation: varchar("relocation").default('false'),
  marriage: varchar("marriage").default('false'),
  divorce: varchar("divorce").default('false'),
  lossOfLovedOne: varchar("loss_of_loved_one").default('false'),
  newChild: varchar("new_child").default('false'),
  healthChange: varchar("health_change").default('false'),
  retirement: varchar("retirement").default('false'),
  otherEvent: text("other_event"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLifeEventsSchema = createInsertSchema(lifeEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertLifeEvents = z.infer<typeof insertLifeEventsSchema>;
export type LifeEvents = typeof lifeEvents.$inferSelect;

export const maritalStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'partnered', label: 'Partnered' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

export const culturalBackgroundOptions = [
  { value: 'eastern', label: 'Eastern' },
  { value: 'western', label: 'Western' },
  { value: 'mixed', label: 'Mixed/Multicultural' },
];

export const educationLevelOptions = [
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'professional', label: 'Professional Degree' },
];

export const incomeOptions = [
  { value: 'under_25k', label: 'Under $25,000' },
  { value: '25k_50k', label: '$25,000 - $50,000' },
  { value: '50k_75k', label: '$50,000 - $75,000' },
  { value: '75k_100k', label: '$75,000 - $100,000' },
  { value: '100k_150k', label: '$100,000 - $150,000' },
  { value: '150k_200k', label: '$150,000 - $200,000' },
  { value: 'over_200k', label: 'Over $200,000' },
];

export const lifeEventOptions = [
  { key: 'newJob', label: 'New Job or Career Change' },
  { key: 'relocation', label: 'Relocation to New Area' },
  { key: 'marriage', label: 'Marriage or New Partnership' },
  { key: 'divorce', label: 'Divorce or Separation' },
  { key: 'lossOfLovedOne', label: 'Loss of a Loved One' },
  { key: 'newChild', label: 'New Child or Adoption' },
  { key: 'healthChange', label: 'Significant Health Change' },
  { key: 'retirement', label: 'Retirement' },
];

export const feedbackTokens = pgTable("feedback_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: varchar("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FeedbackToken = typeof feedbackTokens.$inferSelect;

export const profileHistory = pgTable("profile_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProfileHistorySchema = createInsertSchema(profileHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertProfileHistory = z.infer<typeof insertProfileHistorySchema>;
export type ProfileHistory = typeof profileHistory.$inferSelect;

export * from "./models/chat";
