"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Search,
  Loader2,
  Navigation,
  Building2,
  Phone,
  Filter,
} from "lucide-react";
import { updateContactLocation, getAllContactsForMap } from "@/lib/actions/sales";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamic import of MapComponent to avoid SSR issues with leaflet
const MapComponent = dynamic(
  () => import("./map-component").then((mod) => ({ default: mod.MapComponent })),
  { ssr: false, loading: () => <div className="h-full w-full min-h-[400px] flex items-center justify-center bg-muted rounded-lg">Loading map...</div> }
);

type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  initialContacts: Contact[];
  filterOptions: { cities: string[]; states: string[] };
};

export function MapClient({ initialContacts, filterOptions }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationContact, setLocationContact] = useState<Contact | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const locatedContacts = contacts.filter(
    (c) => c.latitude != null && c.longitude != null
  );

  const filteredContacts = contacts.filter((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ").toLowerCase();
    const q = search.toLowerCase();
    return (
      name.includes(q) ||
      (c.company?.toLowerCase() || "").includes(q) ||
      (c.city?.toLowerCase() || "").includes(q)
    );
  });

  function handleSetLocation(contact: Contact) {
    setLocationContact(contact);
    setLocationDialogOpen(true);
  }

  function handleSaveLocation(formData: FormData) {
    if (!locationContact) return;
    const lat = parseFloat(formData.get("latitude") as string);
    const lng = parseFloat(formData.get("longitude") as string);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180");
      return;
    }

    startTransition(async () => {
      try {
        await updateContactLocation(locationContact.id, lat, lng);
        // Refresh contacts
        const updated = await getAllContactsForMap(
          cityFilter ? { city: cityFilter } : stateFilter ? { state: stateFilter } : undefined
        );
        setContacts(updated);
        toast.success("Location updated");
        setLocationDialogOpen(false);
        setLocationContact(null);
      } catch {
        toast.error("Failed to update location");
      }
    });
  }

  function handleApplyFilters() {
    startTransition(async () => {
      try {
        const updated = await getAllContactsForMap({
          city: cityFilter || undefined,
          state: stateFilter || undefined,
        });
        setContacts(updated);
      } catch {
        toast.error("Failed to filter contacts");
      }
    });
  }

  function handleClearFilters() {
    setCityFilter("");
    setStateFilter("");
    startTransition(async () => {
      try {
        const updated = await getAllContactsForMap();
        setContacts(updated);
      } catch {
        toast.error("Failed to load contacts");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Map</h1>
          <p className="text-muted-foreground">
            View and manage customer locations.{" "}
            <Badge variant="secondary">{locatedContacts.length}</Badge> of{" "}
            <Badge variant="outline">{contacts.length}</Badge> contacts have locations set.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="flex items-end gap-4 pt-6">
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm">City</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                <option value="">All cities</option>
                {filterOptions.cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm">State</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <option value="">All states</option>
                {filterOptions.states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={handleApplyFilters} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClearFilters} disabled={isPending}>
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar contact list */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contacts</CardTitle>
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
                  No contacts found
                </p>
              )}
              {filteredContacts.map((contact) => {
                const name = [contact.firstName, contact.lastName]
                  .filter(Boolean)
                  .join(" ");
                const hasLocation =
                  contact.latitude != null && contact.longitude != null;

                return (
                  <div
                    key={contact.id}
                    className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      selectedId === contact.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => {
                      if (hasLocation) {
                        setSelectedId(contact.id);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {name}
                        </span>
                        {hasLocation && (
                          <MapPin className="h-3 w-3 text-green-600 shrink-0" />
                        )}
                      </div>
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
                    {!hasLocation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetLocation(contact);
                        }}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Set
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] overflow-hidden">
            <MapComponent
              contacts={locatedContacts}
              selectedId={selectedId}
              onMarkerClick={setSelectedId}
              className="h-full w-full"
            />
          </Card>
        </div>
      </div>

      {/* Set Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Set Location for{" "}
              {locationContact
                ? [locationContact.firstName, locationContact.lastName]
                    .filter(Boolean)
                    .join(" ")
                : ""}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSaveLocation} className="space-y-4">
            {locationContact?.address && (
              <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <p>{locationContact.address}</p>
                  <p className="text-muted-foreground">
                    {[locationContact.city, locationContact.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            )}
            {locationContact?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {locationContact.phone}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 28.6139"
                  required
                  defaultValue={locationContact?.latitude ?? ""}
                />
                <p className="text-xs text-muted-foreground mt-1">-90 to 90</p>
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 77.2090"
                  required
                  defaultValue={locationContact?.longitude ?? ""}
                />
                <p className="text-xs text-muted-foreground mt-1">-180 to 180</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: You can find coordinates on Google Maps by right-clicking any location.
            </p>
            <div className="flex justify-end gap-2">
              <DialogClose>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Location
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
