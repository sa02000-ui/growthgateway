import type { Express, Request, Response } from "express";
import pg from "pg";
import { supabase } from "./db";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function authenticateUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export function registerProfileRoutes(app: Express) {
  app.get("/api/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ error: "userId required" });

      const profileResult = await pool.query(
        "SELECT * FROM user_profiles WHERE user_id = $1",
        [userId]
      );

      const eventsResult = await pool.query(
        "SELECT * FROM life_events_log WHERE user_id = $1 ORDER BY year DESC",
        [userId]
      );

      res.json({
        profile: profileResult.rows[0] || null,
        lifeEvents: eventsResult.rows,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ error: "userId required" });

      const { profile, lifeEvents } = req.body;

      await pool.query(
        `INSERT INTO user_profiles (
          user_id, marital_status, children_count, youngest_child_age,
          birth_country, years_in_region, cultural_background,
          profession, industry, education_level, field_of_study,
          household_income, parental_occupation, parental_income, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          marital_status = EXCLUDED.marital_status,
          children_count = EXCLUDED.children_count,
          youngest_child_age = EXCLUDED.youngest_child_age,
          birth_country = EXCLUDED.birth_country,
          years_in_region = EXCLUDED.years_in_region,
          cultural_background = EXCLUDED.cultural_background,
          profession = EXCLUDED.profession,
          industry = EXCLUDED.industry,
          education_level = EXCLUDED.education_level,
          field_of_study = EXCLUDED.field_of_study,
          household_income = EXCLUDED.household_income,
          parental_occupation = EXCLUDED.parental_occupation,
          parental_income = EXCLUDED.parental_income,
          updated_at = NOW()`,
        [
          userId,
          profile.maritalStatus || null,
          profile.childrenCount ? parseInt(profile.childrenCount) : null,
          profile.youngestChildAge || null,
          profile.birthCountry || null,
          profile.yearsInRegion || null,
          profile.culturalBackground || null,
          profile.profession || null,
          profile.industry || null,
          profile.educationLevel || null,
          profile.fieldOfStudy || null,
          profile.householdIncome || null,
          profile.parentalOccupation || null,
          profile.parentalIncome || null,
        ]
      );

      if (lifeEvents && Array.isArray(lifeEvents)) {
        for (const event of lifeEvents) {
          if (event.type && event.year) {
            await pool.query(
              `INSERT INTO life_events_log (user_id, event_type, year, significance)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id, event_type, year) DO UPDATE SET
                 significance = EXCLUDED.significance`,
              [userId, event.type, event.year, event.significance || 5]
            );
          }
        }
      }

      const snapshot = { profile, lifeEvents, timestamp: new Date().toISOString() };
      await pool.query(
        "INSERT INTO profile_history (user_id, snapshot) VALUES ($1, $2)",
        [userId, JSON.stringify(snapshot)]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Profile save error:", error);
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.delete("/api/profile/:userId/event", async (req, res) => {
    try {
      const { userId } = req.params;
      const { eventType, year } = req.body;
      if (!userId || !eventType || !year) {
        return res.status(400).json({ error: "userId, eventType, and year required" });
      }

      await pool.query(
        "DELETE FROM life_events_log WHERE user_id = $1 AND event_type = $2 AND year = $3",
        [userId, eventType, year]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Event delete error:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });
}
