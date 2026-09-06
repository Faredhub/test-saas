"use client";

import { useEffect, useState, useCallback } from "react";
import { getIncomingCalls, answerCall, declineCall } from "@/lib/actions/office";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface IncomingCall {
  id: string;
  type: string;
  caller: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export function CallProvider() {
  const [mounted, setMounted] = useState(false);
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const calls = await getIncomingCalls();
      setIncomingCalls(calls as unknown as IncomingCall[]);
    } catch {
      // Silently ignore poll failures (user may be logged out)
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 12000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleAnswer = async (call: IncomingCall) => {
    setAnswering(call.id);
    try {
      await answerCall(call.id);
      // Navigate to the call page with the active call
      router.push(`/office/calls?active=${call.id}`);
    } catch {
      // Call may have been cancelled
    } finally {
      setAnswering(null);
      setIncomingCalls((prev) => prev.filter((c) => c.id !== call.id));
    }
  };

  const handleDecline = async (callId: string) => {
    try {
      await declineCall(callId);
    } catch {
      // Already handled
    }
    setIncomingCalls((prev) => prev.filter((c) => c.id !== callId));
  };

  if (!mounted || incomingCalls.length === 0) return null;

  const call = incomingCalls[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-zinc-900 p-10 shadow-2xl border border-zinc-700 min-w-[340px]">
        {/* Ringing animation ring */}
        <div className="relative flex items-center justify-center">
          <span className="absolute h-24 w-24 animate-ping rounded-full bg-green-500/20" />
          <span className="absolute h-20 w-20 animate-pulse rounded-full bg-green-500/10" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-zinc-700 text-white text-2xl font-bold">
            {call.caller.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={call.caller.avatar}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              (call.caller.name?.[0] ?? call.caller.email?.split("@")[0]?.[0] ?? "U").toUpperCase()
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-white">
            {call.caller.name || call.caller.email?.split("@")[0] || "Unknown"}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
            {call.type === "VIDEO" ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            Incoming {call.type === "VIDEO" ? "Video" : "Audio"} Call
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Button
            size="lg"
            variant="destructive"
            className="h-14 w-14 rounded-full p-0"
            onClick={() => handleDecline(call.id)}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-green-600 p-0 hover:bg-green-700"
            onClick={() => handleAnswer(call)}
            disabled={answering === call.id}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>

        {incomingCalls.length > 1 && (
          <p className="text-xs text-zinc-500">
            +{incomingCalls.length - 1} other incoming call(s)
          </p>
        )}
      </div>
    </div>
  );
}
