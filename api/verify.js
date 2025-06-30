const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ access: false, reason: "Missing email" });
  }

  try {
    const customers = await stripe.customers.list({ email });

    if (!customers.data.length) {
      return res.status(200).json({ access: false });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active' });

    if (subscriptions.data.length > 0) {
      return res.status(200).json({ access: true });
    } else {
      return res.status(200).json({ access: false });
    }
  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(500).json({ access: false, error: "Internal error" });
  }
};
