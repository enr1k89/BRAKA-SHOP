const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const pi = stripeEvent.data.object;
    const meta = pi.metadata;
    const ordineId = meta.ordine_id;

    try {
      // Aggiorna stato ordine su Supabase a PAGATO
      await sb.from('orders')
        .update({ status: 'PAGATO', paid_at: new Date().toISOString(), stripe_id: pi.id })
        .eq('order_number', ordineId);

      console.log(`Ordine ${ordineId} marcato come PAGATO`);
    } catch (e) {
      console.error('Supabase update error:', e);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
