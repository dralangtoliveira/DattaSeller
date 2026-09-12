import { randomUUID } from "node:crypto";

function required(value, name) {
  if (value === undefined || value === null || value === "") throw new Error(`${name} is required`);
  return value;
}

export async function createExternalCheckout({ opportunityId, customerId, sellerId, plan, discountAmount = 0, checkoutProvider, createId = randomUUID }) {
  required(opportunityId, "opportunityId");
  required(customerId, "customerId");
  required(sellerId, "sellerId");
  required(plan?.id, "plan.id");
  required(plan?.priceAmount, "plan.priceAmount");
  required(plan?.currency, "plan.currency");
  if (plan.commercialStatus !== "available" || plan.availabilityStatus !== "available") throw new Error("Plan is not commercially available");
  if (discountAmount < 0 || discountAmount > plan.priceAmount) throw new Error("Invalid discount amount");
  if (!checkoutProvider?.createCheckout) throw new Error("A checkout provider is required");

  const order = {
    id: createId(),
    sellerOrderNumber: `DS-${createId()}`,
    opportunityId,
    customerId,
    sellerId,
    productPlanId: plan.id,
    authorizedAmount: plan.priceAmount,
    discountAmount,
    currency: plan.currency,
    paymentStatus: "pending",
    correlationId: createId()
  };
  const checkout = await checkoutProvider.createCheckout({
    orderId: order.id,
    reference: order.sellerOrderNumber,
    amount: order.authorizedAmount - order.discountAmount,
    currency: order.currency,
    customerId: order.customerId
  });
  if (!checkout?.url || !checkout?.externalOrderId) throw new Error("Checkout provider returned an incomplete checkout");

  return { ...order, checkoutUrl: checkout.url, externalOrderId: checkout.externalOrderId };
}
