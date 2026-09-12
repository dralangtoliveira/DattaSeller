import { createHmac, timingSafeEqual } from "node:crypto";

export function signPaymentPayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function validSignature(payload, signature, secret) {
  const expected = Buffer.from(signPaymentPayload(payload, secret), "hex");
  const received = Buffer.from(signature ?? "", "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function receivePaymentWebhook({ payload, signature, secret, store, now = () => new Date() }) {
  if (!secret) throw new Error("Webhook secret is required");
  if (!store?.transaction) throw new Error("Transactional payment store is required");
  if (!validSignature(payload, signature, secret)) return { status: 401, error: "invalid_signature" };

  const event = JSON.parse(payload);
  if (!event.id || !event.external_payment_id || !event.order_reference || !event.status) return { status: 400, error: "incomplete_event" };

  return store.transaction(async (tx) => {
    if (await tx.findEvent(event.id)) return { status: 200, replayed: true, eventId: event.id };
    await tx.saveEvent({ id: event.id, payload: event, receivedAt: now().toISOString() });

    const order = await tx.findOrderByReference(event.order_reference);
    if (!order) {
      await tx.flagReconciliation({ eventId: event.id, reason: "order_not_found" });
      return { status: 202, reconciliationRequired: true, eventId: event.id };
    }
    if (event.status !== "paid") return { status: 202, ignored: true, eventId: event.id };

    const payment = await tx.recordPayment({
      orderId: order.id,
      provider: event.provider,
      externalOrderId: event.external_order_id ?? null,
      externalPaymentId: event.external_payment_id,
      idempotencyKey: event.id,
      amount: event.amount,
      currency: event.currency,
      status: "paid",
      payload: event
    });
    await tx.markOrderPaid(order.id);
    const sale = await tx.createSaleIfMissing({ orderId: order.id, paymentId: payment.id, paidAt: now().toISOString() });
    await tx.createDeliveryIfMissing({ orderId: order.id, targetProductKey: order.targetProductKey });
    return { status: 202, replayed: false, eventId: event.id, orderId: order.id, saleId: sale.id };
  });
}
