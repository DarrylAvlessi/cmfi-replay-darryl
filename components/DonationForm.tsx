import React, { useState } from 'react';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import { useAppContext } from '../context/AppContext';
import { donationService } from '../lib/stripeService';

interface DonationFormProps {
  streamerId: string;
  streamerName: string;
  onSuccess?: () => void;
}

const presetAmounts = [5, 10, 25, 50, 100];

const CardBrandIcon: React.FC<{ brand: string }> = ({ brand }) => {
  if (!brand || brand === 'unknown') return null;

  switch (brand) {
    case 'visa':
      return (
        <svg viewBox="0 0 24 16" className="w-8 h-auto flex-shrink-0">
          <rect width="24" height="16" rx="2" fill="#1A1F71" />
          <text x="3" y="11" fontSize="5" fontWeight="bold" fill="white" fontFamily="Arial">VISA</text>
        </svg>
      );
    case 'mastercard':
      return (
        <svg viewBox="0 0 24 16" className="w-8 h-auto flex-shrink-0">
          <rect width="24" height="16" rx="2" fill="#000" />
          <circle cx="8.5" cy="8" r="4" fill="#EB001B" />
          <circle cx="15.5" cy="8" r="4" fill="#F79E1B" opacity="0.9" />
        </svg>
      );
    case 'amex':
      return (
        <svg viewBox="0 0 24 16" className="w-8 h-auto flex-shrink-0">
          <rect width="24" height="16" rx="2" fill="#2E77BC" />
          <text x="2.5" y="11" fontSize="4.5" fontWeight="bold" fill="white" fontFamily="Arial">AMEX</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 16" className="w-8 h-auto flex-shrink-0 opacity-40">
          <rect width="24" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <text x="2" y="11" fontSize="4" fill="currentColor" fontFamily="Arial">
            {brand.slice(0, 4).toUpperCase()}
          </text>
        </svg>
      );
  }
};

const elementStyle = (theme: string) => ({
  base: {
    fontSize: '16px',
    color: theme === 'dark' ? '#F9FAFB' : '#1F2937',
    fontFamily: '"Inter", sans-serif',
    '::placeholder': {
      color: '#9CA3AF',
    },
  },
  invalid: {
    color: '#EF4444',
    iconColor: '#EF4444',
  },
});

const DonationForm: React.FC<DonationFormProps> = ({
  streamerId,
  streamerName,
  onSuccess,
}) => {
  const { t, theme, user, userProfile } = useAppContext();
  const stripe = useStripe();
  const elements = useElements();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cardBrand, setCardBrand] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getAmount = (): number | null => {
    if (customAmount) {
      const val = parseFloat(customAmount);
      return isNaN(val) || val < 1 ? null : val;
    }
    return selectedAmount;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error('Stripe is not initialized');
      return;
    }

    const amount = getAmount();
    if (!amount) {
      toast.error(t('donationInvalidAmount') || 'Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      const clientSecret = await donationService.createPaymentIntent(
        amount,
        streamerId,
        streamerName,
      );

      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card element not found');
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name:
                userProfile?.displayName ||
                user?.displayName ||
                undefined,
              email: user?.email || undefined,
            },
          },
        });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        await donationService.recordDonation(paymentIntent.id);

        toast.success(
          t('paymentSuccess') || 'Payment successful! Thank you for your donation.',
        );

        onSuccess?.();
      }
    } catch (error: any) {
      toast.error(error.message || t('paymentError'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('donationChooseAmount') || 'Choose an amount'}
        </h2>

        <div className="grid grid-cols-5 gap-3 mb-4">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setSelectedAmount(amount);
                setCustomAmount('');
              }}
              className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedAmount === amount && !customAmount
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              €{amount}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 font-semibold">
              €
            </span>
          </div>
          <input
            type="number"
            min="1"
            step="0.50"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              if (e.target.value) setSelectedAmount(null);
            }}
            placeholder={t('donationCustomAmount') || 'Custom amount'}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('payByCard') || 'Card details'}
        </label>
        <div
          className={`overflow-hidden border rounded-xl bg-white dark:bg-black transition-all duration-200 ${
            focusedField
              ? 'border-amber-500 ring-2 ring-amber-500/30'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          <div className="flex items-center px-4 pt-3.5 pb-3">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Card number
              </label>
              <CardNumberElement
                options={{ style: elementStyle(theme), showIcon: false }}
                onChange={(e) => setCardBrand(e.brand)}
                onFocus={() => setFocusedField('number')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            {cardBrand && (
              <div className="ml-3 flex-shrink-0">
                <CardBrandIcon brand={cardBrand} />
              </div>
            )}
          </div>

          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 px-4 py-3.5">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Expiry date
              </label>
              <CardExpiryElement
                options={{ style: elementStyle(theme) }}
                onFocus={() => setFocusedField('expiry')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 px-4 py-3.5">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                CVC
              </label>
              <CardCvcElement
                options={{ style: elementStyle(theme) }}
                onFocus={() => setFocusedField('cvc')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || !getAmount()}
        className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all duration-200 ${
          !stripe || processing || !getAmount()
            ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/30 transform hover:scale-[1.02]'
        }`}
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            {t('processing')}
          </span>
        ) : (
          <span>
            {t('donateButton') || 'Donate'} {getAmount() ? `€${getAmount()}` : ''}
          </span>
        )}
      </button>
    </form>
  );
};

export default DonationForm;
