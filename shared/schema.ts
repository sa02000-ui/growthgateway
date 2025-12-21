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

export const occupationCategories = [
  { value: 'management', label: 'Management' },
  { value: 'business_financial', label: 'Business & Financial Operations' },
  { value: 'computer_mathematical', label: 'Computer & Mathematical' },
  { value: 'architecture_engineering', label: 'Architecture & Engineering' },
  { value: 'life_physical_social_science', label: 'Life, Physical & Social Science' },
  { value: 'community_social_service', label: 'Community & Social Service' },
  { value: 'legal', label: 'Legal' },
  { value: 'education_training_library', label: 'Education, Training & Library' },
  { value: 'arts_design_entertainment_media', label: 'Arts, Design, Entertainment & Media' },
  { value: 'healthcare_practitioners', label: 'Healthcare Practitioners & Technical' },
  { value: 'healthcare_support', label: 'Healthcare Support' },
  { value: 'protective_service', label: 'Protective Service' },
  { value: 'food_preparation_serving', label: 'Food Preparation & Serving' },
  { value: 'building_grounds_maintenance', label: 'Building & Grounds Maintenance' },
  { value: 'personal_care_service', label: 'Personal Care & Service' },
  { value: 'sales', label: 'Sales & Related' },
  { value: 'office_administrative', label: 'Office & Administrative Support' },
  { value: 'farming_fishing_forestry', label: 'Farming, Fishing & Forestry' },
  { value: 'construction_extraction', label: 'Construction & Extraction' },
  { value: 'installation_maintenance_repair', label: 'Installation, Maintenance & Repair' },
  { value: 'production', label: 'Production' },
  { value: 'transportation_material_moving', label: 'Transportation & Material Moving' },
  { value: 'military', label: 'Military Specific' },
  { value: 'self_employed', label: 'Self-Employed / Entrepreneur' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' },
  { value: 'unemployed', label: 'Unemployed / Seeking Work' },
  { value: 'homemaker', label: 'Homemaker / Caregiver' },
  { value: 'other', label: 'Other' },
];

export const fieldOfStudyOptions = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'computer_science', label: 'Computer Science / IT' },
  { value: 'business', label: 'Business / Management' },
  { value: 'medicine_health', label: 'Medicine / Health Sciences' },
  { value: 'law', label: 'Law / Legal Studies' },
  { value: 'education', label: 'Education' },
  { value: 'arts_humanities', label: 'Arts & Humanities' },
  { value: 'social_sciences', label: 'Social Sciences' },
  { value: 'natural_sciences', label: 'Natural Sciences' },
  { value: 'mathematics', label: 'Mathematics / Statistics' },
  { value: 'architecture', label: 'Architecture / Design' },
  { value: 'agriculture', label: 'Agriculture / Environmental' },
  { value: 'communications', label: 'Communications / Media' },
  { value: 'trades', label: 'Trades / Vocational' },
  { value: 'not_applicable', label: 'Not Applicable' },
  { value: 'other', label: 'Other' },
];

export const countryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IN', label: 'India' },
  { value: 'CN', label: 'China' },
  { value: 'JP', label: 'Japan' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'KR', label: 'South Korea' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SG', label: 'Singapore' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'IE', label: 'Ireland' },
  { value: 'PH', label: 'Philippines' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'EG', label: 'Egypt' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'IL', label: 'Israel' },
  { value: 'RU', label: 'Russia' },
  { value: 'PL', label: 'Poland' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CL', label: 'Chile' },
  { value: 'TH', label: 'Thailand' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'OTHER', label: 'Other' },
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
