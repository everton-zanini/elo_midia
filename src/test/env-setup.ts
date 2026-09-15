import { config } from "dotenv";
import WebSocket from "ws";

config({ path: ".env.local" });

// @supabase/supabase-js exige um construtor global WebSocket (nativo a partir
// do Node 22) para o cliente realtime, mesmo quando ele não é usado nos
// testes. Node 20 não tem WebSocket nativo, então usamos o pacote `ws`.
if (!("WebSocket" in globalThis)) {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}
