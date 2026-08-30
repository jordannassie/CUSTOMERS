"use client";

/**
 * BotIcon — renders the lucide-react Bot icon.
 * Drop-in replacement that accepts the same size/className props
 * used across DirectAgentChat, DashboardShell, AgentCTA, etc.
 */
import { Bot } from "lucide-react";

interface BotIconProps {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false" | string;
}

export default function BotIcon({ size = 16, className = "" }: BotIconProps) {
  return (
    <Bot
      size={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
