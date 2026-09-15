export type MembershipRole = "admin" | "coordinator" | "collaborator";

export type ContentStage =
  | "solicitacao"
  | "planejamento"
  | "criacao"
  | "aprovacao"
  | "agendado"
  | "publicado";

export type ContentPriority = "baixa" | "normal" | "alta" | "urgente";

export type ContentType =
  | "arte"
  | "carrossel"
  | "video"
  | "reels"
  | "stories"
  | "fotografia"
  | "texto"
  | "outro";

export type Channel = "instagram" | "facebook" | "youtube" | "whatsapp" | "site" | "outro";

export type AttachmentKind = "publicavel" | "referencia";

export type Church = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  created_at: string;
  archived_at: string | null;
}

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export type Membership = {
  id: string;
  church_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
}

export type Invite = {
  id: string;
  church_id: string;
  email: string;
  role: MembershipRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  created_at: string;
}

export type Ministry = {
  id: string;
  church_id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
}

export type ContentRecord = {
  id: string;
  church_id: string;
  title: string;
  description: string;
  ministry_id: string | null;
  content_type: ContentType;
  requester_id: string | null;
  assignee_id: string | null;
  priority: ContentPriority;
  stage: ContentStage;
  production_due_at: string | null;
  planned_publish_at: string | null;
  caption: string;
  reference_links: string[];
  published_at: string | null;
  published_url: string | null;
  published_by: string | null;
  archived_at: string | null;
  duplicated_from: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type ContentChannelRecord = {
  id: string;
  content_id: string;
  church_id: string;
  channel: Channel;
}

export type ChecklistItem = {
  id: string;
  content_id: string;
  church_id: string;
  title: string;
  done: boolean;
  assignee_id: string | null;
  due_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type Comment = {
  id: string;
  content_id: string;
  church_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export type Attachment = {
  id: string;
  content_id: string;
  church_id: string;
  uploaded_by: string | null;
  kind: AttachmentKind;
  storage_path: string | null;
  external_url: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export type ActivityLogEntry = {
  id: string;
  church_id: string;
  content_id: string | null;
  actor_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type Approval = {
  id: string;
  content_id: string;
  church_id: string;
  approved_by: string | null;
  approved_version: number;
  snapshot: Record<string, unknown>;
  created_at: string;
  invalidated_at: string | null;
  invalidated_reason: string | null;
}
