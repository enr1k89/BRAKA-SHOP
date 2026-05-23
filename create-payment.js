const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { carrello, cliente, ordineId, totaleConSped } = JSON.parse(event.body);

    const totale = totaleConSped || carrello.reduce((s, i) => s + parseFloat(i.prezzo) * i.qta, 0) + 5.90;
    const totaleCents = Math.round(totale * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totaleCents,
      currency: 'eur',
      metadata: {
        ordine_id: ordineId,
        cliente_nome: cliente.nome,
        cliente_tel: cliente.tel,
        cliente_indirizzo: cliente.indirizzo,
        articoli: carrello.map(i => `${i.nome} x${i.qta}`).join(', ').slice(0, 500)
      },
      description: `Ordine brAkA ${ordineId} — ${cliente.nome}`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        ordineId
      })
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
