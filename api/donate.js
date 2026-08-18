import { createHmac } from "node:crypto";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return response.status(503).json({ error: "Donations are not configured yet." });
  try {
    if (request.body?.action === "verify") {
      const { razorpay_order_id: order, razorpay_payment_id: payment, razorpay_signature: signature } = request.body;
      const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${order}|${payment}`).digest("hex");
      if (!order || !payment || signature !== expected) return response.status(400).json({ error: "Payment verification failed." });
      return response.status(200).json({ verified: true });
    }
    const amount = Number(request.body?.amount);
    if (!Number.isInteger(amount) || amount < 5 || amount > 100) return response.status(400).json({ error: "Choose an amount from ₹5 to ₹100." });
    const authorization = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const apiResponse = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt: `adre_${Date.now()}`, notes: { purpose: "Support ADRE Quiz" } }) });
    const order = await apiResponse.json();
    if (!apiResponse.ok) throw new Error(order.error?.description || "Could not start payment.");
    return response.status(200).json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) { return response.status(500).json({ error: error instanceof Error ? error.message : "Payment could not be started." }); }
}
