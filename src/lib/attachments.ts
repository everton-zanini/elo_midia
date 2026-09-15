export const ATTACHMENT_BUCKET = "attachments";
export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB — vídeos grandes devem usar link externo de referência
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
