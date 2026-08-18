import { randomUUID } from "node:crypto";

const apiVersion = "2025-01-01";
const baseUrl = () => process.env.CASHFREE_MODE === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
const cashfreeHeaders = () => ({ "Content-Type": "application/json", "x-api-version": apiVersion, "x-client-id": process.env.CASHFREE_CLIENT_ID, "x-client-secret": process.env.CASHFREE_CLIENT_SECRET });

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) return response.status(503).json({ error: "Donations are not configured yet." });
  try {
    if (request.body?.action === "verify") {
      const orderId = String(request.body?.orderId || "");
      if (!/^adre_[A-Za-z0-9_-]{8,40}$/.test(orderId)) return response.status(400).json({ error: "Invalid order." });
      const apiResponse = await fetch(`${baseUrl()}/orders/${encodeURIComponent(orderId)}`, { headers: cashfreeHeaders() });
      const order = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(order.message || "Could not verify payment.");
      return response.status(order.order_status === "PAID" ? 200 : 202).json({ verified: order.order_status === "PAID", status: order.order_status });
    }
    const amount = Number(request.body?.amount);
    const phone = String(request.body?.phone || "").replace(/\D/g, "");
    if (!Number.isInteger(amount) || amount < 5 || amount > 100) return response.status(400).json({ error: "Choose an amount from ₹5 to ₹100." });
    if (!/^[6-9]\d{9}$/.test(phone)) return response.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
    const orderId = `adre_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const apiResponse = await fetch(`${baseUrl()}/orders`, { method: "POST", headers: { ...cashfreeHeaders(), "x-idempotency-key": randomUUID() }, body: JSON.stringify({
      order_id: orderId, order_amount: amount, order_currency: "INR", order_note: "Support ADRE Quiz",
      customer_details: { customer_id: `donor_${randomUUID().replaceAll("-", "").slice(0, 16)}`, customer_phone: phone, customer_name: String(request.body?.name || "ADRE supporter").slice(0, 100), customer_email: String(request.body?.email || "").slice(0, 100) },
    }) });
    const order = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(order.message || order.type || "Could not start payment.");
    return response.status(200).json({ orderId: order.order_id, paymentSessionId: order.payment_session_id });
  } catch (error) { return response.status(500).json({ error: error instanceof Error ? error.message : "Payment could not be started." }); }
}
