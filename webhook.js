import Stripe from 'stripe';
import { buffer } from 'micro';
import Airtable from 'airtable';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const stripeId = session.customer;

    try {
      await base('Subscribers').create({
        fields: {
          Email: email,
          'Subscription Status': 'Active',
          'Stripe Customer ID': stripeId,
          'Plan Name': session.display_items?.[0]?.plan?.nickname || 'N/A',
        },
      });
    } catch (err) {
      console.error('Airtable insert error:', err.message);
    }
  }

  res.status(200).json({ received: true });
}
