"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, LogOut, ShieldCheck, AlertCircle } from "lucide-react";

type ActiveDevice = {
  id: string;
  type: "WEB" | "MOBILE";
  name: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
};

type DeviceSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onLogoutOtherDevices: (deviceId: string) => void;
};

export function DeviceSessionModal({
  open,
  onClose,
  onLogoutOtherDevices,
}: DeviceSessionModalProps) {
  const [devices, setDevices] = useState<ActiveDevice[]>([
    {
      id: "dev-1",
      type: "WEB",
      name: "Chrome on Windows 11 (Web App)",
      ip: "192.168.1.45",
      location: "Kolkata, IN",
      lastActive: "Active Now",
      isCurrent: true,
    },
    {
      id: "dev-2",
      type: "MOBILE",
      name: "Android App (Knect360 Mobile)",
      ip: "49.37.12.88",
      location: "Kolkata, IN",
      lastActive: "5 mins ago",
      isCurrent: false,
    },
  ]);

  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  function handleTerminate(id: string) {
    setTerminatingId(id);
    setTimeout(() => {
      setDevices((prev) => prev.filter((d) => d.id !== id));
      onLogoutOtherDevices(id);
      setTerminatingId(null);
    }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle>Concurrent Device Sessions</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Single user simultaneous Web App & Mobile App login is permitted. Review your active devices or log out from another device below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                dev.isCurrent
                  ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                  : "bg-card border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  dev.type === "WEB" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                }`}>
                  {dev.type === "WEB" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-foreground">{dev.name}</span>
                    {dev.isCurrent && (
                      <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0">
                        This Device
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {dev.ip} • {dev.location} • <span className="font-medium text-emerald-600">{dev.lastActive}</span>
                  </div>
                </div>
              </div>

              {!dev.isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={terminatingId === dev.id}
                  onClick={() => handleTerminate(dev.id)}
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Logout
                </Button>
              )}
            </div>
          ))}

          {devices.length <= 1 && (
            <div className="p-3 border border-dashed rounded-xl text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-muted/10">
              <AlertCircle className="h-4 w-4 text-emerald-500" />
              <span>No other active device sessions.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button onClick={onClose} className="bg-[#4E62F7] hover:bg-[#3E52E7] text-white text-xs h-9">
            Continue Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
