/**
 * CLI onboarding — provision a receptionist without the web form.
 *
 * Usage:
 *   npx tsx scripts/onboard-client.ts --file client.json --owner <supabase-user-id>
 *
 * client.json must match the OnboardingForm shape (see shared/receptionist-schema.ts), e.g.:
 * {
 *   "businessName": "Bella Salon",
 *   "niche": "salon",
 *   "website": "https://bellasalon.com",
 *   "contactName": "Maria Lopez",
 *   "contactEmail": "maria@bellasalon.com",
 *   "timezone": "America/New_York",
 *   "services": [{ "name": "Women's cut", "price": "$65+" }],
 *   "faqs": [{ "question": "Do you take walk-ins?", "answer": "Yes, before 3pm on weekdays." }],
 *   "escalation": { "transferNumber": "+15559876543", "rules": ["Caller is upset"] }
 * }
 *
 * Missing GHL/Retell/OpenAI keys are fine — steps run in "simulated" mode.
 */
import { readFileSync } from "fs";
import { onboardingFormSchema } from "../shared/receptionist-schema";
import { startOnboarding } from "../server/receptionist/onboarding";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("file");
  const owner = arg("owner");
  if (!file || !owner) {
    console.error("Usage: npx tsx scripts/onboard-client.ts --file client.json --owner <supabase-user-id>");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(file, "utf8"));
  const parsed = onboardingFormSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Invalid onboarding file:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  console.log(`Provisioning "${parsed.data.businessName}" (${parsed.data.niche})...`);
  const tenant = await startOnboarding(owner, parsed.data);

  console.log(`\nTenant ${tenant.id} — status: ${tenant.status}`);
  for (const [step, s] of Object.entries(tenant.provisioning ?? {})) {
    console.log(`  ${step}: ${s.status}${s.detail ? ` — ${s.detail}` : ""}`);
  }
  if (tenant.retell_phone_number) {
    console.log(`\n📞 Live number: ${tenant.retell_phone_number}`);
  }
}

main().catch((err) => {
  console.error("Onboarding failed:", err);
  process.exit(1);
});
