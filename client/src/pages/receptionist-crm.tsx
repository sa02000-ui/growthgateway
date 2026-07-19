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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Users, Inbox, KanbanSquare, CalendarDays, Send, Plus, Search } from "lucide-react";

// Full CRM front-end backed by the tenant's GHL sub-account. The client works
// contacts, inbox, pipeline, and appointments here — GHL stays invisible.

interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
}

interface Conversation {
  id: string;
  contactId: string;
  fullName?: string;
  phone?: string;
  email?: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  direction?: string;
  messageType?: string;
  body?: string;
  dateAdded?: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

interface Opportunity {
  id: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  monetaryValue?: number;
  contact?: { name?: string };
}

interface CalendarEvent {
  id: string;
  title?: string;
  startTime?: string;
  appointmentStatus?: string;
}

function contactName(c: Contact): string {
  return c.contactName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.phone || "Unnamed";
}

export default function ReceptionistCrm() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/receptionist">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">CRM</h1>
        </div>

        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox"><Inbox className="mr-1 h-4 w-4" /> Inbox</TabsTrigger>
            <TabsTrigger value="contacts"><Users className="mr-1 h-4 w-4" /> Contacts</TabsTrigger>
            <TabsTrigger value="pipeline"><KanbanSquare className="mr-1 h-4 w-4" /> Pipeline</TabsTrigger>
            <TabsTrigger value="appointments"><CalendarDays className="mr-1 h-4 w-4" /> Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox"><InboxTab /></TabsContent>
          <TabsContent value="contacts"><ContactsTab /></TabsContent>
          <TabsContent value="pipeline"><PipelineTab /></TabsContent>
          <TabsContent value="appointments"><AppointmentsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SimulatedNotice() {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      CRM not connected yet — data will appear here once your workspace is provisioned with live credentials.
    </p>
  );
}

// ---- Inbox ----

function InboxTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");
  const [channel, setChannel] = useState<"SMS" | "Email">("SMS");

  const convQ = useQuery<{ conversations: Conversation[]; simulated?: boolean }>({
    queryKey: ["/api/receptionist/crm/conversations"],
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const messagesQ = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/receptionist/crm/conversations", selected?.id, "messages"],
    enabled: Boolean(selected),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await apiRequest("POST", "/api/receptionist/crm/messages", {
        contactId: selected.contactId,
        type: channel,
        message: reply,
      });
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["/api/receptionist/crm/conversations", selected?.id, "messages"] });
      qc.invalidateQueries({ queryKey: ["/api/receptionist/crm/conversations"] });
    },
    onError: (e) => toast({ title: "Send failed", description: String(e), variant: "destructive" }),
  });

  const conversations = convQ.data?.conversations ?? [];

  return (
    <Card>
      <CardContent className="pt-6">
        {convQ.data?.simulated ? (
          <SimulatedNotice />
        ) : conversations.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No conversations yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
            <ScrollArea className="h-[520px] rounded-md border">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`block w-full border-b p-3 text-left hover:bg-muted ${selected?.id === c.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.fullName || c.phone || c.email || "Unknown"}</span>
                    {(c.unreadCount ?? 0) > 0 && <Badge>{c.unreadCount}</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{c.lastMessageBody ?? ""}</p>
                  {c.lastMessageDate && (
                    <p className="text-xs text-muted-foreground">{new Date(c.lastMessageDate).toLocaleString()}</p>
                  )}
                </button>
              ))}
            </ScrollArea>

            <div className="flex h-[520px] flex-col rounded-md border">
              {!selected ? (
                <p className="m-auto text-muted-foreground">Select a conversation</p>
              ) : (
                <>
                  <div className="border-b p-3 font-medium">{selected.fullName || selected.phone || selected.email}</div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-2">
                      {(messagesQ.data?.messages ?? []).map((m) => (
                        <div
                          key={m.id}
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                            m.direction === "outbound" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body ?? `[${m.messageType ?? "message"}]`}</p>
                          {m.dateAdded && (
                            <p className="mt-1 text-[10px] opacity-70">{new Date(m.dateAdded).toLocaleString()}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 border-t p-3">
                    <Select value={channel} onValueChange={(v) => setChannel(v as "SMS" | "Email")}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type a reply..."
                      onKeyDown={(e) => e.key === "Enter" && reply.trim() && send.mutate()}
                    />
                    <Button onClick={() => send.mutate()} disabled={!reply.trim() || send.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Contacts ----

function ContactsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [dialogOpen, setDialogOpen] = useState(false);

  const contactsQ = useQuery<{ contacts: Contact[]; simulated?: boolean }>({
    queryKey: [`/api/receptionist/crm/contacts${query ? `?q=${encodeURIComponent(query)}` : ""}`],
  });

  const create = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/receptionist/crm/contacts", newContact);
    },
    onSuccess: () => {
      setDialogOpen(false);
      setNewContact({ firstName: "", lastName: "", email: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["/api/receptionist/crm/contacts"] });
      toast({ title: "Contact created" });
    },
    onError: (e) => toast({ title: "Create failed", description: String(e), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-64"
            onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
          />
          <Button variant="outline" size="icon" onClick={() => setQuery(search)}><Search className="h-4 w-4" /></Button>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New contact</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First name</Label>
                  <Input value={newContact.firstName} onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Last name</Label>
                  <Input value={newContact.lastName} onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
              </div>
              <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
                {create.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {contactsQ.data?.simulated ? (
          <SimulatedNotice />
        ) : (contactsQ.data?.contacts ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No contacts yet — every caller is added automatically.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contactsQ.data?.contacts ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{contactName(c)}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell className="space-x-1">
                    {(c.tags ?? []).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Pipeline ----

function PipelineTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const pipelineQ = useQuery<{ pipelines: Pipeline[]; opportunities: Opportunity[]; simulated?: boolean }>({
    queryKey: ["/api/receptionist/crm/pipeline"],
  });

  const moveStage = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      await apiRequest("PATCH", `/api/receptionist/crm/opportunities/${id}`, { pipelineStageId: stageId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/receptionist/crm/pipeline"] }),
    onError: (e) => toast({ title: "Move failed", description: String(e), variant: "destructive" }),
  });

  if (pipelineQ.data?.simulated) {
    return <Card><CardContent className="pt-6"><SimulatedNotice /></CardContent></Card>;
  }

  const pipelines = pipelineQ.data?.pipelines ?? [];
  const opportunities = pipelineQ.data?.opportunities ?? [];

  if (pipelines.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="py-8 text-center text-muted-foreground">No pipeline configured yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {pipelines.map((p) => (
        <Card key={p.id}>
          <CardHeader><CardTitle className="text-base">{p.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(p.stages.length, 1)}, minmax(180px, 1fr))` }}>
              {p.stages.map((stage) => {
                const cards = opportunities.filter((o) => o.pipelineId === p.id && o.pipelineStageId === stage.id);
                return (
                  <div key={stage.id} className="rounded-md border bg-muted/40 p-2">
                    <p className="mb-2 text-sm font-medium">{stage.name} <span className="text-muted-foreground">({cards.length})</span></p>
                    <div className="space-y-2">
                      {cards.map((o) => (
                        <div key={o.id} className="rounded-md border bg-background p-2 text-sm shadow-sm">
                          <p className="font-medium">{o.name || o.contact?.name || "Opportunity"}</p>
                          {typeof o.monetaryValue === "number" && o.monetaryValue > 0 && (
                            <p className="text-muted-foreground">${o.monetaryValue.toLocaleString()}</p>
                          )}
                          <Select onValueChange={(stageId) => moveStage.mutate({ id: o.id, stageId })}>
                            <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue placeholder="Move to..." /></SelectTrigger>
                            <SelectContent>
                              {p.stages.filter((s) => s.id !== stage.id).map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- Appointments ----

function AppointmentsTab() {
  const eventsQ = useQuery<{ events: CalendarEvent[]; simulated?: boolean }>({
    queryKey: ["/api/receptionist/crm/appointments"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming appointments</CardTitle>
        <CardDescription>Everything your receptionist books lands here automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        {eventsQ.data?.simulated ? (
          <SimulatedNotice />
        ) : (eventsQ.data?.events ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No appointments in the next 30 days.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(eventsQ.data?.events ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.startTime ? new Date(e.startTime).toLocaleString() : "—"}</TableCell>
                  <TableCell className="font-medium">{e.title ?? "Appointment"}</TableCell>
                  <TableCell><Badge variant="secondary">{e.appointmentStatus ?? "confirmed"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
