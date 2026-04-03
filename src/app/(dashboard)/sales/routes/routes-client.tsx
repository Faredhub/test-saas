"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Loader2,
  Route,
  MapPin,
  ArrowDown,
  Clock,
  Navigation,
} from "lucide-react";
import { getRoutePlan } from "@/lib/actions/sales";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("../map/map-component").then((mod) => ({ default: mod.MapComponent })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[400px] flex items-center justify-center bg-muted rounded-lg">
        Loading map...
      </div>
    ),
  }
);

type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number | null;
  longitude: number | null;
};

type RoutedContact = Contact & {
  sequence: number;
  distanceFromPrev: number;
};

type Props = {
  initialContacts: Contact[];
};

export function RoutesClient({ initialContacts }: Props) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [routePlan, setRoutePlan] = useState<RoutedContact[]>([]);
  const [routeLines, setRouteLines] = useState<{ lat: number; lng: number }[]>(
    []
  );
  const [isPending, startTransition] = useTransition();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const filteredContacts = initialContacts.filter((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ").toLowerCase();
    const q = search.toLowerCase();
    return (
      name.includes(q) ||
      (c.company?.toLowerCase() || "").includes(q) ||
      (c.city?.toLowerCase() || "").includes(q)
    );
  });

  function toggleContact(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  }

  function handlePlanRoute() {
    if (selectedIds.size < 2) {
      toast.error("Select at least 2 contacts to plan a route");
      return;
    }

    startTransition(async () => {
      try {
        const plan = await getRoutePlan(Array.from(selectedIds));
        if (plan.length === 0) {
          toast.error("No contacts with location data found in selection");
          return;
        }
        setRoutePlan(plan as RoutedContact[]);
        setRouteLines(
          plan
            .filter((p) => p.latitude != null && p.longitude != null)
            .map((p) => ({ lat: p.latitude!, lng: p.longitude! }))
        );
        toast.success(`Route planned with ${plan.length} stops`);
      } catch {
        toast.error("Failed to plan route");
      }
    });
  }

  function clearRoute() {
    setRoutePlan([]);
    setRouteLines([]);
    setSelectedIds(new Set());
  }

  const totalDistance = routePlan.reduce(
    (sum, c) => sum + c.distanceFromPrev,
    0
  );

  // Contacts for the map: either routed contacts or selected contacts
  const mapContacts =
    routePlan.length > 0
      ? routePlan
      : initialContacts.filter((c) => selectedIds.has(c.id));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Route Planner</h1>
          <p className="text-muted-foreground">
            Select contacts and plan an optimized visit route.{" "}
            <Badge variant="secondary">
              {initialContacts.length} contacts with locations
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          {routePlan.length > 0 && (
            <Button variant="outline" onClick={clearRoute}>
              Clear Route
            </Button>
          )}
          <Button
            onClick={handlePlanRoute}
            disabled={isPending || selectedIds.size < 2}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Route className="mr-2 h-4 w-4" />
            )}
            Plan Route ({selectedIds.size} selected)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left panel: contact selection or route result */}
        <div className="lg:col-span-1">
          {routePlan.length > 0 ? (
            /* Route Result */
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Route Plan
                </CardTitle>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {routePlan.length} stops
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {totalDistance.toFixed(1)} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{Math.ceil(totalDistance / 40 * 60)} min
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-0 pt-0">
                {routePlan.map((contact, idx) => {
                  const name = [contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div key={contact.id}>
                      {idx > 0 && (
                        <div className="flex items-center gap-2 py-1.5 pl-4">
                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {contact.distanceFromPrev} km
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                          selectedMapId === contact.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedMapId(contact.id)}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                          {contact.sequence}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {contact.company && (
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.company}
                            </p>
                          )}
                          {contact.city && (
                            <p className="text-xs text-muted-foreground">
                              {contact.city}
                              {contact.state ? `, ${contact.state}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            /* Contact Selection */
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Select Contacts</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={selectAll}
                  >
                    {selectedIds.size === filteredContacts.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-1 pt-0">
                {filteredContacts.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No contacts with locations found. Set locations on the{" "}
                    <a href="/sales/map" className="text-primary underline">
                      Customer Map
                    </a>{" "}
                    page first.
                  </p>
                )}
                {filteredContacts.map((contact) => {
                  const name = [contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <label
                      key={contact.id}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        selectedIds.has(contact.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={() => toggleContact(contact.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {contact.company && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.company}
                          </p>
                        )}
                        {contact.city && (
                          <p className="text-xs text-muted-foreground">
                            {contact.city}
                            {contact.state ? `, ${contact.state}` : ""}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-hidden">
            <MapComponent
              contacts={mapContacts}
              selectedId={selectedMapId}
              routeLines={routeLines}
              onMarkerClick={setSelectedMapId}
              className="h-full w-full"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
