import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { utcIsoToLocalInput } from "@/lib/format";

/**
 * Campo de data e hora simples: o navegador envia o valor local (sem fuso)
 * diretamente pelo `name` do formulário, como qualquer outro campo. A
 * conversão para o instante UTC correto acontece no servidor, que conhece o
 * fuso da igreja (veja `localInputToUtcIso` em src/lib/format.ts). Isso evita
 * depender de um campo oculto sincronizado por JS, que se mostrou frágil com
 * o comportamento nativo de <input type="datetime-local"> por segmentos.
 */
export function DateTimeLocalField({
  id,
  name,
  label,
  timezone,
  defaultValueIso,
  required,
  autoFocus,
}: {
  id: string;
  name: string;
  label: string;
  timezone: string;
  defaultValueIso?: string | null;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="datetime-local"
        required={required}
        autoFocus={autoFocus}
        defaultValue={utcIsoToLocalInput(defaultValueIso ?? null, timezone)}
      />
    </div>
  );
}
