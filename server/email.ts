import type { Express, Request, Response } from "express";

interface SendInviteParams {
  to: string;
  fromName: string;
  feedbackUrl: string;
  customMessage?: string;
}

export async function sendInvite(params: SendInviteParams): Promise<boolean> {
  const { to, fromName, feedbackUrl, customMessage } = params;
  
  console.log('=== EMAIL INVITE (Mock) ===');
  console.log(`To: ${to}`);
  console.log(`From: ${fromName}`);
  console.log(`Feedback URL: ${feedbackUrl}`);
  if (customMessage) {
    console.log(`Custom Message: ${customMessage}`);
  }
  console.log('===========================');
  
  return true;
}

export function registerEmailRoutes(app: Express): void {
  app.post("/api/send-invite", async (req: Request, res: Response) => {
    try {
      const { emails, fromName, feedbackUrl, customMessage } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: "emails array is required" });
      }

      if (!fromName || !feedbackUrl) {
        return res.status(400).json({ error: "fromName and feedbackUrl are required" });
      }

      const results = await Promise.all(
        emails.map(async (email: string) => {
          const success = await sendInvite({
            to: email,
            fromName,
            feedbackUrl,
            customMessage,
          });
          return { email, success };
        })
      );

      const successCount = results.filter(r => r.success).length;
      
      res.json({ 
        success: true, 
        sent: successCount,
        total: emails.length,
        results 
      });
    } catch (error) {
      console.error("Send invite error:", error);
      res.status(500).json({ error: "Failed to send invites" });
    }
  });
}
