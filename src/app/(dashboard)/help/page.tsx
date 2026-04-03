"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  FileQuestion,
  Keyboard,
  LifeBuoy,
  Mail,
  Phone,
  Rocket,
  Send,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";

const quickLinks = [
  {
    title: "Getting Started",
    description: "Learn the basics and set up your workspace",
    icon: Rocket,
    href: "#",
  },
  {
    title: "User Guide",
    description: "Detailed documentation for all features",
    icon: BookOpen,
    href: "#",
  },
  {
    title: "FAQs",
    description: "Answers to commonly asked questions",
    icon: FileQuestion,
    href: "#",
  },
  {
    title: "Keyboard Shortcuts",
    description: "Speed up your workflow with shortcuts",
    icon: Keyboard,
    href: "#",
  },
];

const whatsNew = [
  {
    version: "v1.4.0",
    date: "March 2026",
    title: "Organization Management",
    description:
      "Manage departments, branches, notices, calendar events, and notes from a single module.",
  },
  {
    version: "v1.3.0",
    date: "February 2026",
    title: "Dashboard & Analytics",
    description:
      "Interactive charts, KPI cards, and data visualization for sales and finance.",
  },
  {
    version: "v1.2.0",
    date: "January 2026",
    title: "Sales & CRM Module",
    description:
      "Full lead-to-invoice pipeline with contacts, deals, quotations, and invoicing.",
  },
];

export default function HelpPage() {
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState<string>("");

  function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDescription.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Support ticket submitted successfully");
    setTicketTitle("");
    setTicketDescription("");
    setTicketPriority("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Help & Support
        </h1>
        <p className="text-sm text-muted-foreground">
          Find answers, get in touch, or submit a support request
        </p>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <a key={link.title} href={link.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <link.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{link.title}</CardTitle>
                      <CardDescription>{link.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Support */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Contact Support</CardTitle>
                <CardDescription>
                  Reach out to our support team directly
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <a
                  href="mailto:support@tixelerp.com"
                  className="text-sm text-primary hover:underline"
                >
                  support@tixelerp.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">
                  +91 1800-XXX-XXXX (Mon-Fri, 9am-6pm IST)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit a Support Ticket */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Submit a Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and we will get back to you
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-title">Title</Label>
                <Input
                  id="ticket-title"
                  placeholder="Brief summary of the issue"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-description">Description</Label>
                <Textarea
                  id="ticket-description"
                  placeholder="Provide more details about your issue..."
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={ticketPriority}
                  onValueChange={(val) => setTicketPriority(val ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">
                <Send className="h-4 w-4" />
                Submit Ticket
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* What's New */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>What&apos;s New</CardTitle>
                <CardDescription>
                  Recent updates and new features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsNew.map((item) => (
              <div key={item.version} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {item.version}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.date}
                  </span>
                </div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Current application details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">App Version</span>
              <span className="text-sm font-medium">v1.4.0</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">March 28, 2026</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Environment</span>
              <span className="text-sm font-medium">Production</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Framework</span>
              <span className="text-sm font-medium">Next.js 16</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
