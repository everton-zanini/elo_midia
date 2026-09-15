import { describe, expect, it } from "vitest";
import { localInputToUtcIso, utcIsoToLocalInput, formatDateTime } from "./format";

describe("conversão de fuso horário da agenda", () => {
  it("converte um horário de parede de São Paulo para o instante UTC correto", () => {
    // 09:00 em São Paulo (UTC-3, sem horário de verão desde 2019) = 12:00 UTC
    const iso = localInputToUtcIso("2026-03-15T09:00", "America/Sao_Paulo");
    expect(iso).toBe("2026-03-15T12:00:00.000Z");
  });

  it("é a inversa de utcIsoToLocalInput", () => {
    const local = "2026-06-01T18:30";
    const iso = localInputToUtcIso(local, "America/Sao_Paulo");
    const back = utcIsoToLocalInput(iso, "America/Sao_Paulo");
    expect(back).toBe(local);
  });

  it("formata para exibição no fuso da igreja, não no fuso do servidor", () => {
    const iso = "2026-03-15T12:00:00.000Z";
    expect(formatDateTime(iso, "America/Sao_Paulo")).toBe("15/03/2026 às 09:00");
  });
});
