const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const app = express();

// Replace this with your Stripe secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(bodyParser.raw({ type: "application/json" }));

app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log("⚠️  Webhook signature verification failed.", err.message);
    return res.sendStatus(400);
  }

  // Handle subscription created
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Subscription complete for:", session.customer_email);
    // You can store session.customer or session.customer_email in a database here
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    console.log("❌ Subscription canceled:", subscription.id);
    // Update database if needed
  }

  app.get("/verify", async (req, res) => {
  const customerEmail = req.query.email;

  if (!customerEmail) {
    return res.status(400).json({ access: false, message: "No email provided." });
  }

  try {
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      return res.status(403).json({ access: false, message: "No Stripe customer found." });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      return res.json({ access: true });
    } else {
      return res.json({ access: false, message: "No active subscription." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ access: false, message: "Server error." });
  }
});

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("BMSA Stripe Webhook Server is running.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
