"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Ticket } from "lucide-react";

export default function PortalTicketLookup() {
  const [ticketId, setTicketId] = useState("");
  const router = useRouter();

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = ticketId.trim();
    if (id) {
      router.push(`/portal/tickets/${id}`);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Ticket className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Track Your Ticket</CardTitle>
          <p className="mt-1 text-sm text-gray-500">
            Enter your ticket ID to view its status and updates.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-2">
            <Input
              placeholder="Enter ticket ID..."
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!ticketId.trim()}>
              <Search className="mr-2 h-4 w-4" />
              Look Up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
