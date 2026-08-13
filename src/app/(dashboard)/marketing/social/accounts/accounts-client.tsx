"use client";

import { useState } from "react";
import Link from "next/link";
import { SocialConnectionDTO, disconnectSocialAccount } from "@/lib/actions/social";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Share2, MessageSquare, Send, Trash2, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Props = {
  initialConnections: SocialConnectionDTO[];
};

const PROVIDERS = [
  {
    id: "FACEBOOK",
    name: "Facebook Page",
    icon: Globe,
    color: "bg-blue-600 text-white",
    connectUrl: "/api/social/facebook/connect",
    desc: "Requires Facebook Page Admin access & Meta App approval.",
  },
  {
    id: "INSTAGRAM",
    name: "Instagram Business",
    icon: Share2,
    color: "bg-pink-600 text-white",
    connectUrl: "/api/social/instagram/connect",
    desc: "Requires connected Instagram Business Profile.",
  },
  {
    id: "LINKEDIN",
    name: "LinkedIn Profile",
    icon: MessageSquare,
    color: "bg-sky-700 text-white",
    connectUrl: "/api/social/linkedin/connect",
    desc: "Requires LinkedIn Developer App OAuth 2.0 consent.",
  },
  {
    id: "TWITTER",
    name: "X / Twitter Account",
    icon: Send,
    color: "bg-slate-900 text-white",
    connectUrl: "/api/social/twitter/connect",
    desc: "Requires X Developer Account and OAuth 2.0 User Context keys.",
  },
];

export function AccountsClient({ initialConnections }: Props) {
  const [connections, setConnections] = useState<SocialConnectionDTO[]>(initialConnections);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this social account?")) return;
    setLoadingId(id);
    try {
      await disconnectSocialAccount(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      toast.success("Social account disconnected");
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROVIDERS.map((prov) => {
          const Icon = prov.icon;
          const activeConn = connections.find((c) => c.provider === prov.id);

          return (
            <Card key={prov.id} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${prov.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{prov.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{prov.desc}</CardDescription>
                  </div>
                </div>
                <Badge variant={activeConn ? "default" : "secondary"}>
                  {activeConn ? "Connected" : "Disconnected"}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4 border-t mt-2">
                {activeConn ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{activeConn.accountName}</p>
                      <p className="text-xs text-muted-foreground">ID: {activeConn.accountId}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={loadingId === activeConn.id}
                      onClick={() => handleDisconnect(activeConn.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Tenant Isolated Credentials
                    </span>
                    <a href={prov.connectUrl}>
                      <Button size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" /> Connect Account
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
