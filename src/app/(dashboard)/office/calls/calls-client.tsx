"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  initiateCall,
  endCall,
  addSignaling,
  getSignaling,
  getCallHistory,
  answerCall,
} from "@/lib/actions/office";
import { PeerConnection } from "@/lib/webrtc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface CallRecord {
  id: string;
  type: string;
  status: string;
  duration: number | null;
  createdAt: string | Date;
  caller: UserInfo;
  callee: UserInfo;
}

interface HistoryResult {
  data: CallRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusColor(status: string) {
  switch (status) {
    case "CONNECTED":
      return "bg-green-600";
    case "ENDED":
      return "bg-zinc-600";
    case "RINGING":
      return "bg-yellow-600";
    case "MISSED":
      return "bg-red-600";
    case "DECLINED":
      return "bg-red-500";
    default:
      return "bg-zinc-500";
  }
}

// ---------------------------------------------------------------------------
// Active Call View
// ---------------------------------------------------------------------------

function ActiveCallView({
  callId,
  callType,
  remoteName,
  isCaller,
  onEnded,
}: {
  callId: string;
  callType: "AUDIO" | "VIDEO";
  remoteName: string;
  isCaller: boolean;
  onEnded: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<PeerConnection | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sinceRef = useRef<number>(0);

  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);

  // Timer
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const sendSignal = useCallback(
    async (type: string, data: unknown) => {
      try {
        await addSignaling(callId, { type, data: JSON.stringify(data) });
      } catch {
        // ignore
      }
    },
    [callId]
  );

  // Poll for signaling messages from the other peer
  const startPolling = useCallback(
    (pc: PeerConnection) => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        try {
          const result = await getSignaling(callId, sinceRef.current || undefined);
          if (result.status === "ENDED" || result.status === "DECLINED" || result.status === "MISSED") {
            pc.close();
            onEnded();
            return;
          }
          for (const sig of result.signals) {
            const ts = sig.timestamp as number;
            if (ts > sinceRef.current) sinceRef.current = ts;
            const payload = JSON.parse(sig.data as string);
            if (sig.type === "offer") {
              const answer = await pc.createAnswer(payload);
              await sendSignal("answer", answer);
            } else if (sig.type === "answer") {
              await pc.setRemoteDescription(payload);
            } else if (sig.type === "ice-candidate") {
              await pc.addIceCandidate(payload);
            }
          }
        } catch {
          // ignore polling errors
        }
      }, 500);
    },
    [callId, onEnded, sendSignal]
  );

  // Setup WebRTC
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const pc = new PeerConnection();
      pcRef.current = pc;

      pc.onIceCandidate((candidate) => {
        sendSignal("ice-candidate", candidate);
      });

      pc.onRemoteStream((stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setConnected(true);
      });

      pc.onConnectionStateChange((state) => {
        if (state === "disconnected" || state === "failed" || state === "closed") {
          onEnded();
        }
      });

      const isVideo = callType === "VIDEO";
      const localStream = await pc.startLocalStream(isVideo);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      if (isCaller) {
        // Caller creates the offer
        const offer = await pc.createOffer();
        await sendSignal("offer", offer);
      }

      if (!cancelled) {
        startPolling(pc);
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
      pcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = async () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pcRef.current?.close();
    try {
      await endCall(callId);
    } catch {
      // already ended
    }
    onEnded();
  };

  const handleToggleAudio = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    pcRef.current?.toggleAudio(next);
  };

  const handleToggleVideo = () => {
    const next = !videoMuted;
    setVideoMuted(next);
    pcRef.current?.toggleVideo(next);
  };

  const handleToggleScreen = async () => {
    if (!pcRef.current) return;
    if (screenSharing) {
      pcRef.current.stopScreenShare();
      setScreenSharing(false);
    } else {
      try {
        await pcRef.current.startScreenShare();
        setScreenSharing(true);
      } catch {
        // user cancelled the screen picker
      }
    }
  };

  const isVideo = callType === "VIDEO";

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-zinc-950">
      {/* Remote video / audio indicator */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        {isVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-white">
              {remoteName[0]?.toUpperCase() ?? "?"}
            </div>
            <p className="text-xl text-white font-medium">{remoteName}</p>
            {!connected && (
              <p className="text-sm text-zinc-400 animate-pulse">Connecting...</p>
            )}
          </div>
        )}

        {/* Remote video placeholder when not connected */}
        {isVideo && !connected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-zinc-400 animate-pulse text-lg">Waiting for connection...</p>
          </div>
        )}

        {/* Local video PIP */}
        {isVideo && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-6 h-36 w-48 rounded-xl border-2 border-zinc-700 bg-black object-cover shadow-lg"
          />
        )}

        {/* Audio-only: hidden local video element to keep the stream alive */}
        {!isVideo && (
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-4 bg-zinc-900/80 px-8 py-5 backdrop-blur-sm w-full justify-center">
        {connected && (
          <span className="mr-4 font-mono text-sm text-zinc-300">
            {formatDuration(elapsed)}
          </span>
        )}

        <Button
          variant="outline"
          size="icon"
          className={`h-12 w-12 rounded-full border-zinc-600 ${audioMuted ? "bg-red-600/20 text-red-400" : "text-white"}`}
          onClick={handleToggleAudio}
        >
          {audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        {isVideo && (
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full border-zinc-600 ${videoMuted ? "bg-red-600/20 text-red-400" : "text-white"}`}
            onClick={handleToggleVideo}
          >
            {videoMuted ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          className={`h-12 w-12 rounded-full border-zinc-600 ${screenSharing ? "bg-blue-600/20 text-blue-400" : "text-white"}`}
          onClick={handleToggleScreen}
        >
          {screenSharing ? (
            <MonitorOff className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
        </Button>

        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Page
// ---------------------------------------------------------------------------

export function CallsClient({
  initialHistory,
  users,
}: {
  initialHistory: HistoryResult;
  users: UserInfo[];
}) {
  const searchParams = useSearchParams();
  const activeParam = searchParams.get("active");

  const [history, setHistory] = useState(initialHistory);
  const [activeCall, setActiveCall] = useState<{
    id: string;
    type: "AUDIO" | "VIDEO";
    remoteName: string;
    isCaller: boolean;
  } | null>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedType, setSelectedType] = useState<"AUDIO" | "VIDEO">("AUDIO");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const calleeId = params.get("calleeId");
    const type = params.get("type") as "AUDIO" | "VIDEO" | null;

    if (calleeId && type) {
      setStarting(true);
      initiateCall({ calleeId, type })
        .then((call) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = call as any;
          setActiveCall({
            id: c.id,
            type: type,
            remoteName: c.callee.name ?? c.callee.email,
            isCaller: true,
          });
          // Clean up search params
          window.history.replaceState({}, "", "/office/calls");
        })
        .catch((err) => {
          alert(err instanceof Error ? err.message : "Failed to start call");
        })
        .finally(() => {
          setStarting(false);
        });
    }
  }, []);

  // If redirected from incoming call answer
  useEffect(() => {
    if (activeParam) {
      // Fetch the call details and activate it
      (async () => {
        try {
          const result = await getCallHistory() as unknown as HistoryResult;
          const call = result.data.find((c: CallRecord) => c.id === activeParam);
          if (call && (call.status === "CONNECTED" || call.status === "RINGING")) {
            setActiveCall({
              id: call.id,
              type: call.type as "AUDIO" | "VIDEO",
              remoteName: call.caller.name ?? call.caller.email,
              isCaller: false,
            });
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [activeParam]);

  const handleStartCall = async () => {
    if (!selectedUser) return;
    setStarting(true);
    try {
      const call = await initiateCall({ calleeId: selectedUser, type: selectedType });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = call as any;
      setActiveCall({
        id: c.id,
        type: selectedType,
        remoteName: c.callee.name ?? c.callee.email,
        isCaller: true,
      });
      setStartDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start call");
    } finally {
      setStarting(false);
    }
  };

  const handleCallEnded = async () => {
    setActiveCall(null);
    // Refresh history
    try {
      const result = await getCallHistory() as unknown as HistoryResult;
      setHistory(result);
    } catch {
      // ignore
    }
  };

  if (activeCall) {
    return (
      <ActiveCallView
        callId={activeCall.id}
        callType={activeCall.type}
        remoteName={activeCall.remoteName}
        isCaller={activeCall.isCaller}
        onEnded={handleCallEnded}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calls</h1>
          <p className="text-sm text-muted-foreground">
            VoIP audio and video calls with your team
          </p>
        </div>

        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Phone className="h-4 w-4" />
            Start Call
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Call</label>
                <Select value={selectedUser} onValueChange={(v) => { if (v) setSelectedUser(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name ?? u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={selectedType}
                  onValueChange={(v) => { if (v) setSelectedType(v as "AUDIO" | "VIDEO"); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUDIO">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Audio Call
                      </span>
                    </SelectItem>
                    <SelectItem value="VIDEO">
                      <span className="flex items-center gap-2">
                        <Video className="h-4 w-4" /> Video Call
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleStartCall}
                disabled={!selectedUser || starting}
              >
                {starting ? "Connecting..." : "Call Now"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Call History Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Caller</th>
                <th className="px-4 py-3 font-medium">Callee</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.data.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No call history yet. Start a call to get going.
                  </td>
                </tr>
              )}
              {history.data.map((call) => (
                <tr key={call.id} className="border-b last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(call.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {call.caller.name ?? call.caller.email}
                  </td>
                  <td className="px-4 py-3">
                    {call.callee.name ?? call.callee.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1">
                      {call.type === "VIDEO" ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <Phone className="h-3 w-3" />
                      )}
                      {call.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${statusColor(call.status)} text-white border-0`}>
                      {call.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {history.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Page {history.page} of {history.totalPages} ({history.total} total)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
