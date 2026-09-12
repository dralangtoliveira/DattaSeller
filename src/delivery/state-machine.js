const TRANSITIONS = {
  awaiting_payment: ["paid"],
  paid: ["handoff_pending"],
  handoff_pending: ["handoff_sent", "blocked"],
  handoff_sent: ["onboarding", "blocked"],
  onboarding: ["in_delivery", "awaiting_customer", "blocked"],
  in_delivery: ["awaiting_customer", "delivered", "blocked"],
  awaiting_customer: ["in_delivery", "delivered", "blocked"],
  blocked: ["handoff_pending", "onboarding", "in_delivery"],
  delivered: []
};

export function createDeliveryOrder({ orderId, targetProductKey, paymentStatus }) {
  if (!orderId || !targetProductKey) throw new Error("Order and target product are required");
  return { orderId, targetProductKey, status: paymentStatus === "paid" ? "paid" : "awaiting_payment", lastError: null };
}

export function transitionDelivery(delivery, nextStatus, { error = null } = {}) {
  if (!TRANSITIONS[delivery.status]?.includes(nextStatus)) throw new Error(`Invalid delivery transition: ${delivery.status} -> ${nextStatus}`);
  if (nextStatus === "blocked" && !error?.trim()) throw new Error("A blocked delivery requires an error");
  return { ...delivery, status: nextStatus, lastError: nextStatus === "blocked" ? error.trim() : null };
}

export function canAdvanceCommercialOpportunity(stage, paymentStatus) {
  if (stage === "paid" || stage === "handoff" || stage === "completed") return paymentStatus === "paid";
  return true;
}
