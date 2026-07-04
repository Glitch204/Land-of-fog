// ---- Supabase config (same project as Gray Fog) ----
const SUPABASE_URL = "https://wdxryokgpkuumczjwwrf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeHJ5b2tncGt1dW1jemp3d3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzY0NjAsImV4cCI6MjA5ODU1MjQ2MH0.gBmp-F-BBRkOdQxFW02bIERX7h-urc2HBgv0WV-yrfs";

export async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? " — " + text : ""}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function upsertSandboxPosition(clientId, name, x, z) {
  return sbFetch(`sandbox_positions?on_conflict=client_id`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      client_id: clientId,
      name,
      x,
      z,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function fetchSandboxPositions() {
  // only show players active in the last 20 seconds
  const cutoff = new Date(Date.now() - 20000).toISOString();
  const rows = await sbFetch(
    `sandbox_positions?updated_at=gte.${encodeURIComponent(cutoff)}&select=client_id,name,x,z,updated_at`
  );
  return rows || [];
}
