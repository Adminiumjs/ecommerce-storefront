/**
 * Paying for an order online, through the payments Adminium takes.
 *
 * An order is payable while it is being paid (`paying`): its total, what is
 * left once a gift card paid its part (`due`), the connection's currency, and
 * the payment written into the shop's own `payments` as `online`. Payables
 * arrive switched off: whoever manages payments switches the shop on in
 * Adminium's Payments, and until then the shop takes bank transfers (when its
 * owner turned them on) or no orders at all.
 *
 *   - Only ways to pay that settle at once: a bank debit would hold stock for
 *     days.
 *   - Not paid in time, the order is cancelled by the clock, never while a
 *     payment is on its way.
 *
 * Refunds are rows of `payment_refunds`: the owner writes one (the refund
 * right), and Adminium sends it back through the service the money came by.
 * The customer's own cancel of a paid order, and the clock's cancel of one
 * whose money landed late, are refunded by themselves. A transfer is never
 * refunded here: the owner sends it back by hand and records that.
 */
export const PAYMENTS = {
  payables: [
    {
      table: "orders",
      label: "number",
      amount: { column: "total" },
      currency: { connection: true },
      due: { column: "due" },
      payments: {
        kind: "table",
        table: "payments",
        link: "order_id",
        amount: "amount",
        paidAt: "paid_at",
        method: { column: "method", values: { "*": "online" } },
        reference: "payment_ref",
        provider: "provider",
        refundedElsewhere: "refunded_elsewhere",
      },
      status: { column: "status", paid: "paid", from: ["paying"] },
      customerEmail: "email",
      payableWhen: [{ column: "status", eq: "paying" }],
      returnTo: "/o",
      receipt: "app",
      instantOnly: true,
      refunds: {
        model: "rows",
        table: "payment_refunds",
        payment: "payment_id",
        amount: "amount",
        when: [{ column: "method", eq: "online" }],
        providerRef: "provider_ref",
        state: "refund_state",
        openIn: "/orders",
        auto: { values: { automatic: true } },
      },
      refundOn: {
        moves: [{ from: ["paid", "paying"], to: "cancelled", by: ["customer", "system", "refund-right"] }],
      },
    },
  ],
};
