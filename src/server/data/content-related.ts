import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { AttachmentKind } from "@/lib/supabase/types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export interface ChecklistItemView {
  id: string;
  title: string;
  done: boolean;
  due_at: string | null;
  assignee: { id: string; full_name: string } | null;
  position: number;
}

export interface CommentView {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; full_name: string } | null;
}

export interface AttachmentView {
  id: string;
  kind: AttachmentKind;
  file_name: string;
  storage_path: string | null;
  external_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  uploaded_by: { id: string; full_name: string } | null;
}

export interface ActivityView {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: { id: string; full_name: string } | null;
}

export interface ApprovalView {
  id: string;
  approved_version: number;
  created_at: string;
  invalidated_at: string | null;
  invalidated_reason: string | null;
  approved_by: { id: string; full_name: string } | null;
}

export async function getContentRelated(supabase: SupabaseServer, contentId: string) {
  const [checklistRes, commentsRes, attachmentsRes, activityRes, approvalsRes] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, title, done, due_at, position, assignee:profiles(id, full_name)")
      .eq("content_id", contentId)
      .order("position", { ascending: true }),
    supabase
      .from("comments")
      .select("id, body, created_at, author:profiles(id, full_name)")
      .eq("content_id", contentId)
      .order("created_at", { ascending: true }),
    supabase
      .from("attachments")
      .select("id, kind, file_name, storage_path, external_url, mime_type, size_bytes, created_at, uploaded_by:profiles(id, full_name)")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_log")
      .select("id, action, metadata, created_at, actor:profiles(id, full_name)")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select("id, approved_version, created_at, invalidated_at, invalidated_reason, approved_by:profiles(id, full_name)")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    checklist: (checklistRes.data ?? []) as unknown as ChecklistItemView[],
    comments: (commentsRes.data ?? []) as unknown as CommentView[],
    attachments: (attachmentsRes.data ?? []) as unknown as AttachmentView[],
    activity: (activityRes.data ?? []) as unknown as ActivityView[],
    approvals: (approvalsRes.data ?? []) as unknown as ApprovalView[],
  };
}
