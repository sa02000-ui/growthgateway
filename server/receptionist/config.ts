// Central env config for the receptionist module.
// Every external integration degrades to "simulated" mode when its key is
// missing, so the whole flow can be exercised end-to-end before any accounts exist.

export const receptionistConfig = {
  ghl: {
    apiKey: process.env.GHL_API_KEY ?? "",
    companyId: process.env.GHL_COMPANY_ID ?? "",
    baseUrl: process.env.GHL_BASE_URL ?? "https://services.leadconnectorhq.com",
    apiVersion: "2021-07-28",
    // Map niche -> pre-built GHL snapshot to clone for new sub-accounts.
    // Populate as snapshots are authored, e.g. GHL_SNAPSHOT_SALON=abc123
    snapshotFor(niche: string): string | undefined {
      return process.env[`GHL_SNAPSHOT_${niche.toUpperCase()}`] || process.env.GHL_SNAPSHOT_DEFAULT;
    },
    get configured() {
      return Boolean(this.apiKey && this.companyId);
    },
  },
  retell: {
    apiKey: process.env.RETELL_API_KEY ?? "",
    baseUrl: process.env.RETELL_BASE_URL ?? "https://api.retellai.com",
    voiceId: process.env.RETELL_VOICE_ID ?? "11labs-Adrian",
    areaCode: process.env.RETELL_AREA_CODE ? Number(process.env.RETELL_AREA_CODE) : undefined,
    get configured() {
      return Boolean(this.apiKey);
    },
  },
  audit: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    judgeModel: process.env.RECEPTIONIST_JUDGE_MODEL ?? "gpt-4o-mini",
    get configured() {
      return Boolean(this.openaiApiKey);
    },
  },
  // Public base URL of this server, used for webhook registration.
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",
};
