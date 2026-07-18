import { useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingFormSchema, NICHES, NICHE_LABELS, type OnboardingForm } from "@shared/receptionist-schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, PhoneCall } from "lucide-react";

// Client-facing setup wizard: everything needed to launch an AI receptionist
// in one form. Each field maps to an automated provisioning step — no GHL or
// Retell login ever needed.

const STEPS = ["Business", "Legal & Branding", "Services & FAQs", "Call Handling"] as const;

export default function ReceptionistOnboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      businessName: "",
      niche: "general",
      website: "",
      businessPhone: "",
      contactName: "",
      contactEmail: "",
      legalName: "",
      ein: "",
      logoUrl: "",
      customDomain: "",
      timezone: "America/New_York",
      services: [{ name: "", price: "", description: "" }],
      faqs: [{ question: "", answer: "" }],
      greeting: "",
      escalation: { transferNumber: "", rules: [] },
    },
    mode: "onBlur",
  });

  const services = useFieldArray({ control: form.control, name: "services" });
  const faqs = useFieldArray({ control: form.control, name: "faqs" });

  const fieldsPerStep: (keyof OnboardingForm)[][] = [
    ["businessName", "niche", "website", "businessPhone", "contactName", "contactEmail"],
    ["legalName", "ein", "address", "logoUrl", "customDomain", "timezone"],
    ["services", "faqs"],
    ["greeting", "escalation"],
  ];

  async function next() {
    const valid = await form.trigger(fieldsPerStep[step] as Parameters<typeof form.trigger>[0]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(values: OnboardingForm) {
    setSubmitting(true);
    try {
      const cleaned: OnboardingForm = {
        ...values,
        services: values.services.filter((s) => s.name.trim()),
        faqs: values.faqs.filter((f) => f.question.trim() && f.answer.trim()),
      };
      await apiRequest("POST", "/api/receptionist/onboarding", cleaned);
      toast({ title: "Receptionist launching!", description: "Provisioning has started — watch progress on your dashboard." });
      navigate("/receptionist");
    } catch (err) {
      toast({
        title: "Setup failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const err = form.formState.errors;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <PhoneCall className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Set up your AI Receptionist</h1>
            <p className="text-muted-foreground text-sm">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tell us about the business</CardTitle>
                <CardDescription>This is what your receptionist will know and say about you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name *</Label>
                  <Input id="businessName" {...form.register("businessName")} placeholder="Bella Salon & Spa" />
                  {err.businessName && <p className="text-sm text-destructive">{err.businessName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Industry *</Label>
                  <Select value={form.watch("niche")} onValueChange={(v) => form.setValue("niche", v as OnboardingForm["niche"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NICHES.map((n) => (
                        <SelectItem key={n} value={n}>{NICHE_LABELS[n]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" {...form.register("website")} placeholder="https://bellasalon.com" />
                    {err.website && <p className="text-sm text-destructive">{err.website.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Current business phone</Label>
                    <Input id="businessPhone" {...form.register("businessPhone")} placeholder="(555) 123-4567" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Your name *</Label>
                    <Input id="contactName" {...form.register("contactName")} />
                    {err.contactName && <p className="text-sm text-destructive">{err.contactName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Your email *</Label>
                    <Input id="contactEmail" type="email" {...form.register("contactEmail")} />
                    {err.contactEmail && <p className="text-sm text-destructive">{err.contactEmail.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Legal & branding</CardTitle>
                <CardDescription>
                  EIN and address are required to register your business for text messaging (a US carrier rule). Branding makes the portal yours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal business name</Label>
                    <Input id="legalName" {...form.register("legalName")} placeholder="Bella Salon LLC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ein">EIN</Label>
                    <Input id="ein" {...form.register("ein")} placeholder="12-3456789" />
                    {err.ein && <p className="text-sm text-destructive">{err.ein.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Business address</Label>
                  <Input id="street" {...form.register("address.street")} placeholder="Street" />
                  <div className="grid grid-cols-3 gap-2">
                    <Input {...form.register("address.city")} placeholder="City" />
                    <Input {...form.register("address.state")} placeholder="State" />
                    <Input {...form.register("address.zip")} placeholder="ZIP" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input id="logoUrl" {...form.register("logoUrl")} placeholder="https://.../logo.png" />
                    {err.logoUrl && <p className="text-sm text-destructive">{err.logoUrl.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customDomain">Custom domain (optional)</Label>
                    <Input id="customDomain" {...form.register("customDomain")} placeholder="book.bellasalon.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={form.watch("timezone")} onValueChange={(v) => form.setValue("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles"].map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Services, pricing & FAQs</CardTitle>
                <CardDescription>The receptionist only answers from what you provide here — it never guesses prices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Services & pricing</Label>
                  {services.fields.map((field, i) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <Input {...form.register(`services.${i}.name`)} placeholder="Service (e.g. Women's cut)" className="flex-1" />
                      <Input {...form.register(`services.${i}.price`)} placeholder="Price (e.g. $65+)" className="w-32" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => services.remove(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => services.append({ name: "", price: "", description: "" })}>
                    <Plus className="h-4 w-4 mr-1" /> Add service
                  </Button>
                </div>
                <div className="space-y-3">
                  <Label>Frequently asked questions</Label>
                  {faqs.fields.map((field, i) => (
                    <div key={field.id} className="space-y-2 rounded-md border p-3">
                      <div className="flex gap-2">
                        <Input {...form.register(`faqs.${i}.question`)} placeholder="Question (e.g. Do you take walk-ins?)" className="flex-1" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => faqs.remove(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea {...form.register(`faqs.${i}.answer`)} placeholder="Answer" rows={2} />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => faqs.append({ question: "", answer: "" })}>
                    <Plus className="h-4 w-4 mr-1" /> Add FAQ
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Call handling</CardTitle>
                <CardDescription>How the receptionist greets callers and when it hands off to a human.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting (leave blank for a professional default)</Label>
                  <Textarea
                    id="greeting"
                    {...form.register("greeting")}
                    rows={2}
                    placeholder={`Thank you for calling ${form.watch("businessName") || "your business"}! How can I help you today?`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferNumber">Transfer-to-human number</Label>
                  <Input id="transferNumber" {...form.register("escalation.transferNumber")} placeholder="(555) 987-6543" />
                  <p className="text-xs text-muted-foreground">
                    Callers who ask for a person (or hit an escalation rule) are transferred here.
                  </p>
                </div>
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  When you click Launch, we automatically create your CRM workspace, build and train your AI agent, and
                  assign a phone number. You'll see live progress on your dashboard — typically ready in under a minute.
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>Continue</Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Launching..." : "Launch my receptionist"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
