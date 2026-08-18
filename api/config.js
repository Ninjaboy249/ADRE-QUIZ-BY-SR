export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed." });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return response.status(503).json({ error: "Supabase authentication is not configured yet." });
  return response.status(200).json({ supabaseUrl, supabaseKey, cashfreeMode: process.env.CASHFREE_MODE === "production" ? "production" : "sandbox", cashfreeEnabled: Boolean(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET), supportEmail: process.env.SUPPORT_EMAIL || "" });
}
