import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Check, Shield, Zap } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Payment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    api.get('/bookings').then(res => {
      const b = res.data.bookings?.find(b => b._id === bookingId);
      if (b) setBooking(b);
      else toast.error('Booking not found');
    });
  }, [bookingId]);

  const handlePay = async () => {
    setProcessing(true);
    try {
      const { data } = await api.post('/payments/create', {
        bookingId,
        amount: booking.price,
      });
      await api.post('/payments/confirm', { paymentId: data.payment.id });
      setPaid(true);
      toast.success('Payment successful!');
    } catch (err) {
      toast.error('Payment failed');
    }
    setProcessing(false);
  };

  if (!booking) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (paid) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-dark-100 mb-6">Your session for <span className="text-primary-400">{booking.skill}</span> has been confirmed.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(`/video/${bookingId}`)} className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-colors font-medium">
            Join Session
          </button>
          <button onClick={() => navigate('/bookings')} className="px-6 py-3 bg-dark-500 text-dark-50 rounded-xl hover:bg-dark-400 transition-colors">
            View Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">Complete Payment</h1>

      <div className="glass rounded-2xl p-6 space-y-6">
        {/* Order Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Order Summary</h3>
          <div className="bg-dark-600 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-dark-100">Skill Session</span>
              <span className="text-white font-medium">{booking.skill}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-100">Provider</span>
              <span className="text-white">{booking.provider?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-100">Duration</span>
              <span className="text-white">{booking.duration} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-100">Date</span>
              <span className="text-white">{new Date(booking.dateTime).toLocaleDateString()}</span>
            </div>
            <div className="border-t border-dark-400 pt-3 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-2xl font-bold gradient-text">${booking.price}</span>
            </div>
          </div>
        </div>

        {/* Mock Card Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Payment Details</h3>
          <div>
            <label className="block text-sm text-dark-100 mb-1">Card Number</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-200" />
              <input defaultValue="4242 4242 4242 4242" className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-100 mb-1">Expiry</label>
              <input defaultValue="12/28" className="w-full px-4 py-3 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-dark-100 mb-1">CVC</label>
              <input defaultValue="123" className="w-full px-4 py-3 bg-dark-700 border border-dark-400 rounded-xl text-white focus:outline-none focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 text-dark-200 text-sm">
          <Shield className="w-4 h-4" />
          <span>Mock payment — no real charges will be made</span>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={processing}
          className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Zap className="w-5 h-5" /> Pay ${booking.price}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Payment;
