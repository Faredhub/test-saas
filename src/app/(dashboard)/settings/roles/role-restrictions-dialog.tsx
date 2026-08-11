"use client";

import { useState, useTransition } from "react";
import { updateRole } from "@/lib/actions/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Clock,
  Globe,
  MapPin,
  Monitor,
  UserCheck,
  Building2,
  Shield,
  Plus,
  X,
  Loader2,
} from "lucide-react";

type Restrictions = {
  timeRestriction?: {
    enabled: boolean;
    allowedDays: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  };
  sessionRestriction?: {
    enabled: boolean;
    maxDurationMinutes: number;
    idleTimeoutMinutes: number;
  };
  ipRestriction?: {
    enabled: boolean;
    mode: "whitelist" | "blacklist";
    entries: string[];
  };
  geoRestriction?: {
    enabled: boolean;
    allowedCountries: string[];
    allowedCities: string[];
    blockedCountries: string[];
    blockedCities: string[];
  };
  employeeStatusRestriction?: {
    enabled: boolean;
    allowedStatuses: string[];
  };
  departmentScope?: {
    enabled: boolean;
    mode: "own" | "all" | "custom";
    departmentIds: string[];
  };
};

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const EMPLOYEE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ON_NOTICE",
  "RESIGNED",
  "TERMINATED",
  "ON_LEAVE",
];

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

const COUNTRY_CODES: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  AE: "UAE",
  SG: "Singapore",
  AU: "Australia",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  BR: "Brazil",
};

const defaultRestrictions: Restrictions = {
  timeRestriction: {
    enabled: false,
    allowedDays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "18:00",
    timezone: "Asia/Kolkata",
  },
  sessionRestriction: {
    enabled: false,
    maxDurationMinutes: 480,
    idleTimeoutMinutes: 30,
  },
  ipRestriction: {
    enabled: false,
    mode: "whitelist",
    entries: [],
  },
  geoRestriction: {
    enabled: false,
    allowedCountries: [],
    allowedCities: [],
    blockedCountries: [],
    blockedCities: [],
  },
  employeeStatusRestriction: {
    enabled: false,
    allowedStatuses: ["ACTIVE"],
  },
  departmentScope: {
    enabled: false,
    mode: "own",
    departmentIds: [],
  },
};

function countEnabled(r: Restrictions): number {
  let c = 0;
  if (r.timeRestriction?.enabled) c++;
  if (r.sessionRestriction?.enabled) c++;
  if (r.ipRestriction?.enabled) c++;
  if (r.geoRestriction?.enabled) c++;
  if (r.employeeStatusRestriction?.enabled) c++;
  if (r.departmentScope?.enabled) c++;
  return c;
}

export function RoleRestrictionsDialog({
  open,
  onOpenChange,
  roleId,
  roleName,
  initialRestrictions,
  departments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  roleName: string;
  initialRestrictions: Restrictions | null;
  departments: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [restrictions, setRestrictions] = useState<Restrictions>(
    initialRestrictions ? { ...defaultRestrictions, ...initialRestrictions } : { ...defaultRestrictions }
  );
  const [newIpEntry, setNewIpEntry] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newBlockedCountry, setNewBlockedCountry] = useState("");
  const [newBlockedCity, setNewBlockedCity] = useState("");

  const update = (path: string, value: any) => {
    setRestrictions((prev) => {
      const next = { ...prev };
      const parts = path.split(".");
      let obj: any = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const toggleDay = (day: number) => {
    const days = restrictions.timeRestriction?.allowedDays || [];
    const idx = days.indexOf(day);
    if (idx >= 0) {
      update("timeRestriction.allowedDays", days.filter((d) => d !== day));
    } else {
      update("timeRestriction.allowedDays", [...days, day].sort());
    }
  };

  const toggleStatus = (status: string) => {
    const statuses = restrictions.employeeStatusRestriction?.allowedStatuses || [];
    const idx = statuses.indexOf(status);
    const next = idx >= 0 ? statuses.filter((s) => s !== status) : [...statuses, status];
    update("employeeStatusRestriction.allowedStatuses", next);
  };

  const addIpEntry = () => {
    const entry = newIpEntry.trim();
    if (!entry) return;
    const entries = restrictions.ipRestriction?.entries || [];
    if (!entries.includes(entry)) {
      update("ipRestriction.entries", [...entries, entry]);
    }
    setNewIpEntry("");
  };

  const removeIpEntry = (entry: string) => {
    update("ipRestriction.entries", (restrictions.ipRestriction?.entries || []).filter((e) => e !== entry));
  };

  const toggleDeptId = (id: string) => {
    const ids = restrictions.departmentScope?.departmentIds || [];
    const next = ids.includes(id) ? ids.filter((d) => d !== id) : [...ids, id];
    update("departmentScope.departmentIds", next);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateRole(roleId, { restrictions });
        toast.success(`Restrictions updated for ${roleName}`);
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to save restrictions");
      }
    });
  };

  const addToArray = (field: string, value: string) => {
    if (!value.trim()) return;
    const parts = field.split(".");
    let current: any = restrictions;
    for (let i = 0; i < parts.length; i++) {
      if (current === undefined || current === null) return;
      current = current[parts[i]];
    }
    const arr = current;
    if (!Array.isArray(arr)) return;
    if (!arr.includes(value.trim())) {
      update(field, [...arr, value.trim()]);
    }
  };

  const removeFromArray = (field: string, item: string) => {
    const parts = field.split(".");
    let current: any = restrictions;
    for (let i = 0; i < parts.length; i++) {
      if (current === undefined || current === null) return;
      current = current[parts[i]];
    }
    const arr = current;
    if (!Array.isArray(arr)) return;
    update(field, arr.filter((i: string) => i !== item));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Restrictions — {roleName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {countEnabled(restrictions)} of 6 restrictions active
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* TIME RESTRICTION */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm">Time Restriction</span>
              </div>
              <Switch
                checked={restrictions.timeRestriction?.enabled || false}
                onCheckedChange={(v) => update("timeRestriction.enabled", v)}
              />
            </div>
            {restrictions.timeRestriction?.enabled && (
              <div className="space-y-3 pl-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Allowed Days</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                      const selected = restrictions.timeRestriction?.allowedDays?.includes(d);
                      return (
                        <Badge
                          key={d}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => toggleDay(d)}
                        >
                          {DAY_LABELS[d]}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                    <Input
                      type="time"
                      value={restrictions.timeRestriction?.startTime || "09:00"}
                      onChange={(e) => update("timeRestriction.startTime", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">End Time</label>
                    <Input
                      type="time"
                      value={restrictions.timeRestriction?.endTime || "18:00"}
                      onChange={(e) => update("timeRestriction.endTime", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                    <Select
                      value={restrictions.timeRestriction?.timezone || "Asia/Kolkata"}
                      onValueChange={(v) => update("timeRestriction.timezone", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SESSION RESTRICTION */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-sm">Session Restriction</span>
              </div>
              <Switch
                checked={restrictions.sessionRestriction?.enabled || false}
                onCheckedChange={(v) => update("sessionRestriction.enabled", v)}
              />
            </div>
            {restrictions.sessionRestriction?.enabled && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Max Session Duration (minutes)</label>
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={restrictions.sessionRestriction?.maxDurationMinutes || 480}
                    onChange={(e) => update("sessionRestriction.maxDurationMinutes", parseInt(e.target.value) || 480)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Idle Timeout (minutes)</label>
                  <Input
                    type="number"
                    min={1}
                    max={480}
                    value={restrictions.sessionRestriction?.idleTimeoutMinutes || 30}
                    onChange={(e) => update("sessionRestriction.idleTimeoutMinutes", parseInt(e.target.value) || 30)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* IP RESTRICTION */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-sm">IP Restriction</span>
              </div>
              <Switch
                checked={restrictions.ipRestriction?.enabled || false}
                onCheckedChange={(v) => update("ipRestriction.enabled", v)}
              />
            </div>
            {restrictions.ipRestriction?.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-muted-foreground">Mode:</label>
                  <Select
                    value={restrictions.ipRestriction?.mode || "whitelist"}
                    onValueChange={(v) => v && update("ipRestriction.mode", v as "whitelist" | "blacklist")}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whitelist">Whitelist</SelectItem>
                      <SelectItem value="blacklist">Blacklist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="IP or CIDR (e.g. 192.168.1.0/24)"
                    value={newIpEntry}
                    onChange={(e) => setNewIpEntry(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addIpEntry()}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={addIpEntry} className="h-8 text-xs">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(restrictions.ipRestriction?.entries || []).map((entry) => (
                    <Badge
                      key={entry}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => removeIpEntry(entry)}
                    >
                      {entry} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  {(!restrictions.ipRestriction?.entries || restrictions.ipRestriction.entries.length === 0) && (
                    <span className="text-xs text-muted-foreground italic">No entries added</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* GEO RESTRICTION */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-sm">Geo Restriction</span>
              </div>
              <Switch
                checked={restrictions.geoRestriction?.enabled || false}
                onCheckedChange={(v) => update("geoRestriction.enabled", v)}
              />
            </div>
            {restrictions.geoRestriction?.enabled && (
              <div className="space-y-3 pl-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Allowed Countries (ISO codes)</label>
                    <div className="flex gap-2 mt-1">
                      <Select value={newCountry || "_select"} onValueChange={(v) => setNewCountry((v && v !== "_select") ? v : "")}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_select">Select...</SelectItem>
                          {Object.entries(COUNTRY_CODES).map(([code, name]) => (
                            <SelectItem key={code} value={code}>{name} ({code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => { addToArray("geoRestriction.allowedCountries", newCountry); setNewCountry(""); }}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(restrictions.geoRestriction?.allowedCountries || []).map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeFromArray("geoRestriction.allowedCountries", c)}
                        >
                          {c} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Blocked Countries (ISO codes)</label>
                    <div className="flex gap-2 mt-1">
                      <Select value={newBlockedCountry || "_select"} onValueChange={(v) => setNewBlockedCountry((v && v !== "_select") ? v : "")}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_select">Select...</SelectItem>
                          {Object.entries(COUNTRY_CODES).map(([code, name]) => (
                            <SelectItem key={code} value={code}>{name} ({code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => { addToArray("geoRestriction.blockedCountries", newBlockedCountry); setNewBlockedCountry(""); }}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(restrictions.geoRestriction?.blockedCountries || []).map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeFromArray("geoRestriction.blockedCountries", c)}
                        >
                          {c} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Allowed Cities</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (addToArray("geoRestriction.allowedCities", newCity), setNewCity(""))}
                        placeholder="e.g. Mumbai"
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => { addToArray("geoRestriction.allowedCities", newCity); setNewCity(""); }}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(restrictions.geoRestriction?.allowedCities || []).map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeFromArray("geoRestriction.allowedCities", c)}
                        >
                          {c} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Blocked Cities</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={newBlockedCity}
                        onChange={(e) => setNewBlockedCity(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (addToArray("geoRestriction.blockedCities", newBlockedCity), setNewBlockedCity(""))}
                        placeholder="e.g. Delhi"
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => { addToArray("geoRestriction.blockedCities", newBlockedCity); setNewBlockedCity(""); }}
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(restrictions.geoRestriction?.blockedCities || []).map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeFromArray("geoRestriction.blockedCities", c)}
                        >
                          {c} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* EMPLOYEE STATUS RESTRICTION */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-teal-600" />
                <span className="font-semibold text-sm">Employee Status Restriction</span>
              </div>
              <Switch
                checked={restrictions.employeeStatusRestriction?.enabled || false}
                onCheckedChange={(v) => update("employeeStatusRestriction.enabled", v)}
              />
            </div>
            {restrictions.employeeStatusRestriction?.enabled && (
              <div className="pl-6">
                <label className="text-xs font-medium text-muted-foreground">Allowed Statuses</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {EMPLOYEE_STATUSES.map((s) => {
                    const selected = restrictions.employeeStatusRestriction?.allowedStatuses?.includes(s);
                    return (
                      <Badge
                        key={s}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => toggleStatus(s)}
                      >
                        {s.replace(/_/g, " ")}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* DEPARTMENT SCOPE */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span className="font-semibold text-sm">Department Scope</span>
              </div>
              <Switch
                checked={restrictions.departmentScope?.enabled || false}
                onCheckedChange={(v) => update("departmentScope.enabled", v)}
              />
            </div>
            {restrictions.departmentScope?.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-muted-foreground">Mode:</label>
                  <Select
                    value={restrictions.departmentScope?.mode || "own"}
                    onValueChange={(v) => v && update("departmentScope.mode", v as "own" | "all" | "custom")}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="own">Own Dept Only</SelectItem>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {restrictions.departmentScope?.mode === "custom" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Select Departments</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {departments.map((dept) => {
                        const selected = restrictions.departmentScope?.departmentIds?.includes(dept.id);
                        return (
                          <Badge
                            key={dept.id}
                            variant={selected ? "default" : "outline"}
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => toggleDeptId(dept.id)}
                          >
                            {dept.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Restrictions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
