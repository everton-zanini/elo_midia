import type {
  Church,
  Profile,
  Membership,
  Invite,
  Ministry,
  ContentRecord,
  ContentChannelRecord,
  ChecklistItem,
  Comment,
  Attachment,
  ActivityLogEntry,
  Approval,
} from "./types";

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      churches: TableDef<Church>;
      profiles: TableDef<Profile>;
      memberships: TableDef<Membership>;
      invites: TableDef<Invite>;
      ministries: TableDef<Ministry>;
      contents: TableDef<ContentRecord>;
      content_channels: TableDef<ContentChannelRecord>;
      checklist_items: TableDef<ChecklistItem>;
      comments: TableDef<Comment>;
      attachments: TableDef<Attachment>;
      activity_log: TableDef<ActivityLogEntry>;
      approvals: TableDef<Approval>;
    };
    Views: Record<string, never>;
    Functions: {
      approve_content: {
        Args: { p_content_id: string; p_expected_version?: number | null };
        Returns: Approval;
      };
      request_changes: {
        Args: { p_content_id: string; p_comment: string; p_expected_version?: number | null };
        Returns: void;
      };
      schedule_content: {
        Args: {
          p_content_id: string;
          p_planned_publish_at: string;
          p_expected_version?: number | null;
        };
        Returns: void;
      };
      confirm_publication: {
        Args: { p_content_id: string; p_published_url?: string | null; p_expected_version?: number | null };
        Returns: void;
      };
      reopen_content: {
        Args: { p_content_id: string; p_reason: string; p_expected_version?: number | null };
        Returns: void;
      };
      duplicate_content: {
        Args: { p_content_id: string };
        Returns: string;
      };
      get_invite_preview: {
        Args: { p_token: string };
        Returns: { church_name: string | null; role: string | null; email: string | null; status: string }[];
      };
      accept_invite: {
        Args: { p_token: string };
        Returns: string;
      };
    };
  };
}
