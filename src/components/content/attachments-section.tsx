"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { File, Link2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  addExternalLinkAttachment,
  createAttachmentUploadUrl,
  deleteAttachment,
  getAttachmentDownloadUrl,
} from "@/server/actions/attachment-actions";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/attachments";
import type { AttachmentView } from "@/server/data/content-related";
import { toast } from "sonner";
import { useReportPending } from "@/hooks/use-report-pending";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function AttachmentRow({
  attachment,
  churchSlug,
  contentId,
  canDelete,
  onDeleted,
}: {
  attachment: AttachmentView;
  churchSlug: string;
  contentId: string;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending);

  async function handleOpen() {
    if (attachment.external_url) {
      window.open(attachment.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (attachment.storage_path) {
      const result = await getAttachmentDownloadUrl(churchSlug, attachment.storage_path);
      if (result.ok) window.open(result.data.url, "_blank", "noopener,noreferrer");
      else toast.error(result.message);
    }
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAttachment(churchSlug, contentId, attachment.id);
      onDeleted();
    });
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
      {attachment.external_url ? <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <File className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <button type="button" onClick={handleOpen} className="flex-1 truncate text-left font-medium hover:underline">
        {attachment.file_name}
      </button>
      {attachment.size_bytes ? <span className="text-xs text-muted-foreground">{formatBytes(attachment.size_bytes)}</span> : null}
      {canDelete ? (
        <Button variant="ghost" size="icon-sm" aria-label="Remover anexo" disabled={isPending} onClick={handleDelete}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  );
}

export function AttachmentsSection({
  churchSlug,
  contentId,
  attachments,
  canEditPublishable,
}: {
  churchSlug: string;
  contentId: string;
  attachments: AttachmentView[];
  canEditPublishable: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<AttachmentView["kind"] | null>(null);
  const [linkDialogKind, setLinkDialogKind] = useState<AttachmentView["kind"] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<AttachmentView["kind"]>("referencia");
  useReportPending(uploading !== null, "Enviando arquivo…");

  const publishable = attachments.filter((a) => a.kind === "publicavel");
  const reference = attachments.filter((a) => a.kind === "referencia");

  function triggerUpload(kind: AttachmentView["kind"]) {
    pendingKindRef.current = kind;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      toast.error("Arquivo muito grande. O limite é 50 MB — para vídeos grandes, use um link externo de referência.");
      return;
    }
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido.");
      return;
    }

    const kind = pendingKindRef.current;
    setUploading(kind);
    try {
      const upload = await createAttachmentUploadUrl(churchSlug, contentId, kind, file.name, file.type);
      if (!upload.ok) {
        toast.error(upload.message);
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(upload.data.path, upload.data.token, file);
      if (error) {
        toast.error("Não foi possível enviar o arquivo.");
        return;
      }
      const record = await import("@/server/actions/attachment-actions").then((m) =>
        m.recordAttachment(churchSlug, contentId, {
          kind,
          storagePath: upload.data.path,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        })
      );
      if (!record.ok) {
        toast.error(record.message);
        return;
      }
      toast.success("Anexo enviado.");
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} aria-hidden="true" />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold">Materiais publicáveis</h3>
          {canEditPublishable ? (
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload("publicavel")} disabled={uploading === "publicavel"}>
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {uploading === "publicavel" ? "Enviando…" : "Enviar arquivo"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLinkDialogKind("publicavel")}>
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Link externo
              </Button>
            </div>
          ) : null}
        </div>
        {publishable.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum material publicável ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {publishable.map((a) => (
              <AttachmentRow
                key={a.id}
                attachment={a}
                churchSlug={churchSlug}
                contentId={contentId}
                canDelete={canEditPublishable}
                onDeleted={() => router.refresh()}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold">Referências internas</h3>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => triggerUpload("referencia")} disabled={uploading === "referencia"}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {uploading === "referencia" ? "Enviando…" : "Enviar arquivo"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLinkDialogKind("referencia")}>
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Link externo
            </Button>
          </div>
        </div>
        {reference.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma referência interna ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {reference.map((a) => (
              <AttachmentRow
                key={a.id}
                attachment={a}
                churchSlug={churchSlug}
                contentId={contentId}
                canDelete={true}
                onDeleted={() => router.refresh()}
              />
            ))}
          </ul>
        )}
      </div>

      <ExternalLinkDialog
        kind={linkDialogKind}
        onOpenChange={(open) => !open && setLinkDialogKind(null)}
        churchSlug={churchSlug}
        contentId={contentId}
      />
    </section>
  );
}

function ExternalLinkDialog({
  kind,
  onOpenChange,
  churchSlug,
  contentId,
}: {
  kind: AttachmentView["kind"] | null;
  onOpenChange: (open: boolean) => void;
  churchSlug: string;
  contentId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending, "Salvando…");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addExternalLinkAttachment(churchSlug, formData);
      if (result.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={kind !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar link externo</DialogTitle>
          <DialogDescription>Use para vídeos grandes ou arquivos hospedados fora do Elo Mídia.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="kind" value={kind ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file_name">Nome</Label>
            <Input id="file_name" name="file_name" required placeholder="Ex.: Vídeo bruto no Google Drive" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="external_url">Link</Label>
            <Input id="external_url" name="external_url" type="url" required placeholder="https://…" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
