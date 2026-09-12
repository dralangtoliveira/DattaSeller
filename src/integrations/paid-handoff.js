function required(value, name) {
  if (value === undefined || value === null || value === "") throw new Error(`${name} is required`);
  return value;
}

export function buildPaidHandoff({ target, order, customer, seller, idempotencyKey }) {
  if (!['dattavps', 'dattaseg'].includes(target)) throw new Error("Unsupported handoff target");
  if (order.paymentStatus !== "paid") throw new Error("Only paid orders can be handed off");
  const payload = {
    seller_order_id: required(order.id, "order.id"),
    customer_id: required(customer.id, "customer.id"),
    product_id: required(order.productId, "order.productId"),
    plan_id: required(order.planId, "order.planId"),
    amount: required(order.amount, "order.amount"),
    currency: required(order.currency, "order.currency"),
    payment_status: "paid",
    correlation_id: required(order.correlationId, "order.correlationId"),
    idempotency_key: required(idempotencyKey, "idempotencyKey")
  };
  if (target === "dattavps") return { target, payload: { ...payload, region: order.region ?? null } };
  return { target, payload: { ...payload, seller_id: required(seller.id, "seller.id"), requirements: order.requirements ?? {} } };
}

export async function dispatchPaidHandoff({ handoff, client }) {
  if (!client?.post) throw new Error("Integration client is required");
  try {
    const response = await client.post({ target: handoff.target, payload: handoff.payload, idempotencyKey: handoff.payload.idempotency_key });
    if (!response?.externalId || !response?.status) throw new Error("Integration returned incomplete status");
    return { status: "handoff_sent", externalReferenceId: response.externalId, externalStatus: response.status, idempotencyKey: handoff.payload.idempotency_key };
  } catch (error) {
    return { status: "blocked", error: error.message, idempotencyKey: handoff.payload.idempotency_key };
  }
}
