function decimal(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Amount must be a non-negative number");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function createCommission({ sale, sellerId, rule }) {
  if (sale?.paymentStatus !== "paid") throw new Error("Commission can only be created for a paid sale");
  if (!sellerId || !rule?.version || !Number.isFinite(rule.rate)) throw new Error("Seller and commission rule are required");
  if (rule.rate < 0 || rule.rate > 1) throw new Error("Commission rate must be between zero and one");
  return {
    saleId: sale.id,
    sellerId,
    ruleVersion: rule.version,
    amount: decimal(sale.amount * rule.rate),
    currency: sale.currency,
    status: "pending"
  };
}

export function applySaleReversal(commission, { saleStatus, reason }) {
  if (!['refunded', 'cancelled'].includes(saleStatus)) throw new Error("A refund or cancellation is required");
  if (!reason?.trim()) throw new Error("A reversal reason is required");
  return { ...commission, status: "reversed", reversalReason: reason.trim(), reversalSaleStatus: saleStatus };
}

export function commissionsVisibleTo(commissions, actor) {
  if (actor.role === "finance" || actor.role === "admin") return commissions;
  if (actor.role === "seller") return commissions.filter((commission) => commission.sellerId === actor.id);
  return [];
}
