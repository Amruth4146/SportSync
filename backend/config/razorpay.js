const Razorpay = require('razorpay');


let razorpayInstance = null;

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    '[Razorpay] Warning: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not found. ' +
      'Wallet top-up routes will be disabled until credentials are provided.'
  );
} else {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

module.exports = razorpayInstance;

