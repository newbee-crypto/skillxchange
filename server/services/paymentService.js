// Mock payment service — replace with real Stripe/Razorpay integration
export const createPaymentIntent = async ({ amount, currency = 'usd', bookingId }) => {
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    id: `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    amount,
    currency,
    status: 'succeeded',
    bookingId,
    clientSecret: `mock_secret_${Date.now()}`,
    mock: true,
  };
};

export const confirmPayment = async (paymentId) => {
  return {
    id: paymentId,
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
    mock: true,
  };
};

export const refundPayment = async (paymentId) => {
  return {
    id: paymentId,
    status: 'refunded',
    refundedAt: new Date().toISOString(),
    mock: true,
  };
};
