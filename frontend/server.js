import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 4242;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18'
});

app.use(cors());
app.use(express.json());

app.post('/api/checkout', async (req, res) => {
  try {
    const { quantity = 1, showName, date, time } = req.body;
    const unitAmount = 4330; // CA$43.30 in cents

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'cad',
      line_items: [
        {
          price_data: {
            currency: 'cad',
            unit_amount: unitAmount,
            product_data: {
              name: showName || 'Terracotta Warriors VR',
              description: `Date: ${date || 'TBD'} • Time: ${time || 'TBD'}`
            }
          },
          quantity
        }
      ],
      success_url: `${process.env.VITE_BASE_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_BASE_URL || 'http://localhost:5173'}/cancel`
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to create session' });
  }
});

app.listen(port, () => {
  console.log(`Stripe checkout server running on http://localhost:${port}`);
});
