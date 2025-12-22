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
  childrenCount: integer("children_count"),
  youngestChildAge: varchar("youngest_child_age"),
  birthCountry: varchar("birth_country"),
  yearsInRegion: varchar("years_in_region"),
  culturalBackground: varchar("cultural_background"),
  profession: varchar("profession"),
  industry: varchar("industry"),
  educationLevel: varchar("education_level"),
  fieldOfStudy: varchar("field_of_study"),
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
  { value: 'anglo', label: 'Anglo (e.g., USA, UK, Australia)' },
  { value: 'latin_europe', label: 'Latin Europe (e.g., France, Italy, Spain)' },
  { value: 'nordic_europe', label: 'Nordic Europe (e.g., Sweden, Denmark, Finland)' },
  { value: 'germanic_europe', label: 'Germanic Europe (e.g., Germany, Austria, Netherlands)' },
  { value: 'eastern_europe', label: 'Eastern Europe (e.g., Poland, Russia, Hungary)' },
  { value: 'latin_america', label: 'Latin America (e.g., Mexico, Brazil, Argentina)' },
  { value: 'sub_saharan_africa', label: 'Sub-Saharan Africa (e.g., Nigeria, Kenya, South Africa)' },
  { value: 'middle_east', label: 'Middle East (e.g., Saudi Arabia, UAE, Egypt)' },
  { value: 'southern_asia', label: 'Southern Asia (e.g., India, Pakistan, Bangladesh)' },
  { value: 'confucian_asia', label: 'Confucian Asia (e.g., China, Japan, South Korea)' },
  { value: 'southeast_asia', label: 'Southeast Asia (e.g., Thailand, Vietnam, Philippines)' },
  { value: 'mixed_multicultural', label: 'Mixed / Multicultural Background' },
  { value: 'other', label: 'Other' },
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

export const yearsInRegionOptions = [
  { value: 'less_than_1', label: 'Less than 1 year' },
  { value: '1_to_2', label: '1-2 years' },
  { value: '3_to_5', label: '3-5 years' },
  { value: '6_to_10', label: '6-10 years' },
  { value: '11_to_20', label: '11-20 years' },
  { value: 'more_than_20', label: 'More than 20 years' },
  { value: 'entire_life', label: 'Entire life' },
];

export const youngestChildAgeOptions = [
  { value: 'infant', label: 'Infant (0-1)' },
  { value: 'toddler', label: 'Toddler (2-3)' },
  { value: 'preschool', label: 'Preschool (4-5)' },
  { value: 'elementary', label: 'Elementary (6-11)' },
  { value: 'middle_school', label: 'Middle School (12-14)' },
  { value: 'high_school', label: 'High School (15-18)' },
  { value: 'adult', label: 'Adult (19+)' },
  { value: 'not_applicable', label: 'Not Applicable' },
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
  { value: 'education', label: 'Education' },
  { value: 'arts_humanities', label: 'Arts & Humanities' },
  { value: 'social_sciences', label: 'Social Sciences, Journalism & Information' },
  { value: 'business_admin_law', label: 'Business, Administration & Law' },
  { value: 'natural_sciences', label: 'Natural Sciences, Mathematics & Statistics' },
  { value: 'ict', label: 'Information & Communication Technologies (ICT)' },
  { value: 'engineering_manufacturing', label: 'Engineering, Manufacturing & Construction' },
  { value: 'agriculture_forestry', label: 'Agriculture, Forestry, Fisheries & Veterinary' },
  { value: 'health_welfare', label: 'Health & Welfare' },
  { value: 'services', label: 'Services (Tourism, Transport, Security, etc.)' },
  { value: 'generic_programs', label: 'Generic Programs (Basic & Literacy)' },
  { value: 'not_applicable', label: 'Not Applicable / No Formal Education' },
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

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull().default('team'),
  privacyLevel: varchar("privacy_level").notNull().default('anonymous'),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  userId: varchar("user_id"),
  email: varchar("email"),
  name: varchar("name"),
  role: varchar("role").notNull().default('member'),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

export const groupTypeOptions = [
  { value: 'family', label: 'Family' },
  { value: 'team', label: 'Team' },
  { value: 'work', label: 'Work' },
  { value: 'friends', label: 'Friends' },
];

export const groupPrivacyOptions = [
  { value: 'open', label: 'Open (Members can see each other)' },
  { value: 'anonymous', label: 'Anonymous (Members hidden until threshold)' },
];

export const groupRoleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

export const profileHistory = pgTable("profile_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assessmentCategoryEnum = ['Who Am I', 'How I Think', 'How I Interact', 'How I Feel'] as const;
export type AssessmentCategory = typeof assessmentCategoryEnum[number];

export const inputTypeEnum = ['likert_5', 'likert_6', 'likert_7', 'binary', 'choice'] as const;
export type InputType = typeof inputTypeEnum[number];

export const scoringAlgorithmEnum = ['average', 'summation', 'complex_centering'] as const;
export type ScoringAlgorithm = typeof scoringAlgorithmEnum[number];

export const assessmentsLibrary = pgTable("assessments_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().default(''),
  popularEquivalent: varchar("popular_equivalent"),
  scientificReference: varchar("scientific_reference"),
  description: text("description"),
  questionCount: integer("question_count"),
  estimatedTime: varchar("estimated_time"),
  scoringAlgorithm: varchar("scoring_algorithm").notNull().default('average'),
  inputType: varchar("input_type").notNull().default('likert_5'),
  traitConfig: jsonb("trait_config"),
  isActive: varchar("is_active").notNull().default('true'),
});

export const insertAssessmentsLibrarySchema = createInsertSchema(assessmentsLibrary).omit({
  id: true,
});

export type InsertAssessmentsLibrary = z.infer<typeof insertAssessmentsLibrarySchema>;
export type AssessmentsLibrary = typeof assessmentsLibrary.$inferSelect;

export const assessmentQuestions = pgTable("assessment_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentSlug: varchar("assessment_slug").notNull(),
  questionNumber: integer("question_number").notNull(),
  text: text("text").notNull(),
  traitKey: varchar("trait_key").notNull(),
  facetKey: varchar("facet_key"),
  reverseCoded: varchar("reverse_coded").notNull().default('false'),
  inputType: varchar("input_type").notNull().default('likert_5'),
});

export const insertAssessmentQuestionSchema = createInsertSchema(assessmentQuestions).omit({
  id: true,
});

export type InsertAssessmentQuestion = z.infer<typeof insertAssessmentQuestionSchema>;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;

export const traitConfigSchema = z.object({
  traits: z.array(z.object({
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
  })),
  facets: z.array(z.object({
    key: z.string(),
    name: z.string(),
    parentTrait: z.string(),
  })).optional(),
  populationAverages: z.record(z.string(), z.number()).optional(),
});

export type TraitConfig = z.infer<typeof traitConfigSchema>;

export const insertProfileHistorySchema = createInsertSchema(profileHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertProfileHistory = z.infer<typeof insertProfileHistorySchema>;
export type ProfileHistory = typeof profileHistory.$inferSelect;

export * from "./models/chat";
