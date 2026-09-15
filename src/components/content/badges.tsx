import {
  AlertTriangle,
  Aperture,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  Eye,
  FileText,
  GalleryHorizontal,
  Image,
  Inbox,
  ListTodo,
  Minus,
  MoreHorizontal,
  Palette,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CHANNEL_LABELS, CONTENT_TYPE_LABELS, PRIORITY_LABELS, STAGE_LABELS } from "@/lib/workflow";
import type { Channel, ContentPriority, ContentStage, ContentType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Camera, ThumbsUp, Video, MessageCircle, Globe, Link2 } from "lucide-react";

const STAGE_STYLES: Record<ContentStage, { className: string; icon: LucideIcon }> = {
  solicitacao: { className: "bg-muted text-muted-foreground", icon: Inbox },
  planejamento: { className: "bg-secondary text-secondary-foreground", icon: ListTodo },
  criacao: { className: "bg-primary/15 text-primary", icon: PenLine },
  aprovacao: { className: "bg-warning/25 text-warning-foreground", icon: Eye },
  agendado: { className: "bg-highlight/25 text-highlight-foreground", icon: CalendarClock },
  publicado: { className: "bg-success/15 text-success", icon: CheckCircle2 },
};

export function StageBadge({ stage, className }: { stage: ContentStage; className?: string }) {
  const { className: styles, icon: Icon } = STAGE_STYLES[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STAGE_LABELS[stage]}
    </span>
  );
}

const PRIORITY_STYLES: Record<ContentPriority, { className: string; icon: LucideIcon }> = {
  baixa: { className: "bg-muted text-muted-foreground", icon: ArrowDown },
  normal: { className: "bg-secondary text-secondary-foreground", icon: Minus },
  alta: { className: "bg-highlight/25 text-highlight-foreground", icon: ArrowUp },
  urgente: { className: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

export function PriorityBadge({ priority, className }: { priority: ContentPriority; className?: string }) {
  const { className: styles, icon: Icon } = PRIORITY_STYLES[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  instagram: Camera,
  facebook: ThumbsUp,
  youtube: Video,
  whatsapp: MessageCircle,
  site: Globe,
  outro: Link2,
};

export function ChannelBadge({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = CHANNEL_ICONS[channel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

export const CONTENT_TYPE_STYLES: Record<ContentType, { bg: string; icon: LucideIcon }> = {
  arte: { bg: "bg-type-arte/10", icon: Palette },
  carrossel: { bg: "bg-type-carrossel/10", icon: GalleryHorizontal },
  video: { bg: "bg-type-video/10", icon: Clapperboard },
  reels: { bg: "bg-type-reels/10", icon: Sparkles },
  stories: { bg: "bg-type-stories/10", icon: Aperture },
  fotografia: { bg: "bg-type-fotografia/10", icon: Image },
  texto: { bg: "bg-type-texto/10", icon: FileText },
  outro: { bg: "bg-muted", icon: MoreHorizontal },
};

export function ContentTypeBadge({ type, className }: { type: ContentType; className?: string }) {
  const Icon = CONTENT_TYPE_STYLES[type].icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {CONTENT_TYPE_LABELS[type]}
    </span>
  );
}
