import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneCall, CheckCircle2, AlertCircle, Clock, Lightbulb, Loader2 } from "lucide-react";

// Client portal dashboard: provisioning status, call log with transcripts,
// performance report, improvement suggestions, and tweakable settings —
// the owner never touches GHL or Retell.

interface Tenant {
  id: string;
  status: string;
  business_name: string;
  niche: string;
  retell_phone_number: string | null;
  greeting: string | null;
  faqs: { question: string; answer: string }[] | null;
  escalation: { transferNumber?: string; rules?: string[] } | null;
  provisioning: Record<string, { status: string; detail?: string; at: string }> | null;
}

interface Call {
  id: string;
  from_number: string | null;
  started_at: string | null;
  duration_sec: number | null;
  transcript: string | null;
  recording_url: string | null;
  outcome: string | null;
  sentiment: string | null;
}

interface Suggestion {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  proposed_faq: { question: string; answer: string } | null;
  status: string;
}

const STEP_LABELS: Record<string, string> = {
  ghl_location: "CRM workspace",
  retell_agent: "AI agent trained",
  phone_number: "Phone number assigned",
  a2p_registration: "Text messaging registration",
};

function outcomeBadge(outcome: string | null) {
  const variant = outcome === "booked" ? "default" : outcome === "escalated" ? "destructive" : "secondary";
  return <Badge variant={variant}>{outcome ?? "unscored"}</Badge>;
}

export default function ReceptionistDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [faqAnswers, setFaqAnswers] = useState<Record<string, string>>({});

  const tenantQ = useQuery<{ tenant: Tenant | null }>({ queryKey: ["/api/receptionist/tenant"] });
  const tenant = tenantQ.data?.tenant ?? null;
  const active = Boolean(tenant);

  const reportQ = useQuery<{ report: { totalCalls: number; bookedRate: number; escalatedRate: number; avgDurationSec: number; byOutcome: Record<string, number> } }>({
    queryKey: ["/api/receptionist/report"],
    enabled: active,
  });
  const callsQ = useQuery<{ calls: Call[] }>({ queryKey: ["/api/receptionist/calls"], enabled: active });
  const suggestionsQ = useQuery<{ suggestions: Suggestion[] }>({ queryKey: ["/api/receptionist/suggestions"], enabled: active });

  const suggestionAction = useMutation({
    mutationFn: async ({ id, action, answer }: { id: string; action: "approve" | "dismiss"; answer?: string }) => {
      await apiRequest("POST", `/api/receptionist/suggestions/${id}`, { action, answer });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/receptionist/suggestions"] });
      qc.invalidateQueries({ queryKey: ["/api/receptionist/tenant"] });
      toast({ title: "Updated" });
    },
    onError: (e) => toast({ title: "Action failed", description: String(e), variant: "destructive" }),
  });

  const settingsSave = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      await apiRequest("PATCH", "/api/receptionist/tenant/settings", patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/receptionist/tenant"] });
      toast({ title: "Settings saved", description: "Your live receptionist has been updated." });
    },
    onError: (e) => toast({ title: "Save failed", description: String(e), variant: "destructive" }),
  });

  const retryProvision = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/receptionist/provision/retry");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/receptionist/tenant"] }),
  });

  if (tenantQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <PhoneCall className="mx-auto h-10 w-10 text-primary" />
            <CardTitle>No receptionist yet</CardTitle>
            <CardDescription>Set up your 24/7 AI receptionist in about five minutes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/receptionist/onboarding">
              <Button>Get started</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = reportQ.data?.report;
  const proposed = (suggestionsQ.data?.suggestions ?? []).filter((s) => s.status === "proposed");

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{tenant.business_name}</h1>
            <p className="text-sm text-muted-foreground">
              AI Receptionist{" "}
              {tenant.retell_phone_number ? (
                <span className="font-medium text-foreground">{tenant.retell_phone_number}</span>
              ) : (
                "(number pending)"
              )}
            </p>
          </div>
          <Badge variant={tenant.status === "active" ? "default" : tenant.status === "error" ? "destructive" : "secondary"}>
            {tenant.status}
          </Badge>
        </div>

        {/* Provisioning status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Setup progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {Object.entries(STEP_LABELS).map(([key, label]) => {
              const s = tenant.provisioning?.[key];
              const status = s?.status ?? "pending";
              const icon =
                status === "done" || status === "simulated" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                );
              return (
                <div key={key} className="flex items-center gap-2 text-sm" title={s?.detail}>
                  {icon}
                  <span>{label}</span>
                  {status === "simulated" && <Badge variant="outline">test mode</Badge>}
                  {status === "manual" && <Badge variant="outline">action needed</Badge>}
                </div>
              );
            })}
            {tenant.status === "error" && (
              <Button size="sm" variant="outline" onClick={() => retryProvision.mutate()} disabled={retryProvision.isPending}>
                Retry setup
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-1"><CardDescription>Total calls</CardDescription></CardHeader>
            <CardContent className="text-2xl font-bold">{report?.totalCalls ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardDescription>Booked</CardDescription></CardHeader>
            <CardContent className="text-2xl font-bold">{Math.round((report?.bookedRate ?? 0) * 100)}%</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardDescription>Escalated to human</CardDescription></CardHeader>
            <CardContent className="text-2xl font-bold">{Math.round((report?.escalatedRate ?? 0) * 100)}%</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardDescription>Avg call length</CardDescription></CardHeader>
            <CardContent className="text-2xl font-bold">{Math.round((report?.avgDurationSec ?? 0) / 60)}m</CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calls">
          <TabsList>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="suggestions">
              Suggestions {proposed.length > 0 && <Badge className="ml-2">{proposed.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calls">
            <Card>
              <CardContent className="pt-6">
                {(callsQ.data?.calls ?? []).length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No calls yet — they'll appear here in real time.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Caller</TableHead>
                        <TableHead>Length</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(callsQ.data?.calls ?? []).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.started_at ? new Date(c.started_at).toLocaleString() : "—"}</TableCell>
                          <TableCell>{c.from_number ?? "Unknown"}</TableCell>
                          <TableCell>{c.duration_sec ? `${Math.floor(c.duration_sec / 60)}:${String(c.duration_sec % 60).padStart(2, "0")}` : "—"}</TableCell>
                          <TableCell>{outcomeBadge(c.outcome)}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">Transcript</Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Call transcript</DialogTitle>
                                </DialogHeader>
                                {c.recording_url && (
                                  <audio controls src={c.recording_url} className="w-full" />
                                )}
                                <pre className="whitespace-pre-wrap text-sm">{c.transcript ?? "Transcript not available."}</pre>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4" /> Improvement suggestions
                </CardTitle>
                <CardDescription>
                  Mined automatically from your calls. Approving a question (with your answer) teaches your receptionist instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {proposed.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">Nothing pending — your receptionist is keeping up!</p>
                ) : (
                  proposed.map((s) => (
                    <div key={s.id} className="space-y-2 rounded-md border p-4">
                      <p className="font-medium">{s.title}</p>
                      {s.detail && <p className="text-sm text-muted-foreground">{s.detail}</p>}
                      {s.type === "faq_gap" && (
                        <Textarea
                          placeholder="Type the answer your receptionist should give..."
                          value={faqAnswers[s.id] ?? ""}
                          onChange={(e) => setFaqAnswers((m) => ({ ...m, [s.id]: e.target.value }))}
                          rows={2}
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={suggestionAction.isPending || (s.type === "faq_gap" && !faqAnswers[s.id]?.trim())}
                          onClick={() => suggestionAction.mutate({ id: s.id, action: "approve", answer: faqAnswers[s.id] })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={suggestionAction.isPending}
                          onClick={() => suggestionAction.mutate({ id: s.id, action: "dismiss" })}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receptionist settings</CardTitle>
                <CardDescription>Changes apply to your live receptionist immediately.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingsForm tenant={tenant} onSave={(patch) => settingsSave.mutate(patch)} saving={settingsSave.isPending} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SettingsForm({
  tenant,
  onSave,
  saving,
}: {
  tenant: Tenant;
  onSave: (patch: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [greeting, setGreeting] = useState(tenant.greeting ?? "");
  const [transferNumber, setTransferNumber] = useState(tenant.escalation?.transferNumber ?? "");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="greeting">Greeting</Label>
        <Textarea id="greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="transfer">Transfer-to-human number</Label>
        <Input id="transfer" value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} />
      </div>
      <Button
        onClick={() =>
          onSave({
            greeting,
            escalation: { ...(tenant.escalation ?? { rules: [] }), transferNumber },
          })
        }
        disabled={saving}
      >
        {saving ? "Saving..." : "Save & update receptionist"}
      </Button>
    </div>
  );
}
