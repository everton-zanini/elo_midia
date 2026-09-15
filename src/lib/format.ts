import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function formatDateTime(value: string | null, timezone: string, pattern = "dd/MM/yyyy 'às' HH:mm"): string {
  if (!value) return "—";
  return formatInTimeZone(new Date(value), timezone, pattern, { locale: ptBR });
}

export function formatDate(value: string | null, timezone: string): string {
  if (!value) return "—";
  return formatInTimeZone(new Date(value), timezone, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateLong(value: string | null, timezone: string): string {
  if (!value) return "—";
  return formatInTimeZone(new Date(value), timezone, "d 'de' MMMM", { locale: ptBR });
}

/** Converte um valor de <input type="datetime-local"> (sem fuso) para um instante UTC correto no fuso da igreja. */
export function localInputToUtcIso(localValue: string, timezone: string): string {
  // O valor do input já representa "a hora de parede" na igreja; interpretamos
  // ele nesse fuso e convertemos para o instante UTC equivalente.
  const [datePart, timePart] = localValue.split("T");
  const [year, month, day] = datePart!.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);

  // Usamos o truque de formatar a mesma data em UTC e comparar com o fuso alvo
  // para achar o offset, evitando depender de bibliotecas extras de fuso.
  const utcGuess = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!));
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, utcGuess);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000).toISOString();
}

function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

/** Converte um instante ISO (UTC) para o valor esperado por <input type="datetime-local"> no fuso da igreja. */
export function utcIsoToLocalInput(isoValue: string | null, timezone: string): string {
  if (!isoValue) return "";
  return formatInTimeZone(new Date(isoValue), timezone, "yyyy-MM-dd'T'HH:mm");
}
