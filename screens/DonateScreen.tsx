import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { useAppContext } from '../context/AppContext';
import { stripePromise } from '../lib/stripeService';
import { fedapayEnabled } from '../lib/fedapayService';
import DonationForm from '../components/DonationForm';
import FedapayDonationForm from '../components/FedapayDonationForm';
import StreamAlert from '../components/StreamAlert';

const STREAMER_ID = 'cmfi-replay';
const STREAMER_NAME = 'CMFI Replay';

type PaymentMethod = 'stripe' | 'fedapay';

const DonateScreen: React.FC = () => {
  const { t, user } = useAppContext();
  const navigate = useNavigate();

  const stripeAvailable = !!stripePromise;
  const fedapayAvailable = fedapayEnabled;

  const defaultMethod: PaymentMethod = stripeAvailable ? 'stripe' : 'fedapay';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);

  const showMethodToggle = stripeAvailable && fedapayAvailable;

  const renderPaymentForm = () => {
    if (!user) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('pleaseLogin') || 'Please log in to donate'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
          >
            {t('login')}
          </button>
        </div>
      );
    }

    if (paymentMethod === 'stripe') {
      if (!stripePromise) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {t('stripeNotConfigured') || 'Payment is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY.'}
            </p>
          </div>
        );
      }
      return (
        <Elements stripe={stripePromise}>
          <DonationForm
            streamerId={STREAMER_ID}
            streamerName={STREAMER_NAME}
          />
        </Elements>
      );
    }

    if (paymentMethod === 'fedapay') {
      if (!fedapayAvailable) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {t('fedapayNotConfigured') || 'Mobile Money payment is not configured.'}
            </p>
          </div>
        );
      }
      return (
        <FedapayDonationForm
          streamerId={STREAMER_ID}
          streamerName={STREAMER_NAME}
        />
      );
    }

    return null;
  };

  const getSecurePaymentText = () => {
    if (paymentMethod === 'stripe') {
      return t('securePayment') || 'Secure payment via Stripe';
    }
    return t('securePaymentFedapay') || 'Secure payment via FedaPay (Mobile Money)';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <StreamAlert streamerId={STREAMER_ID} />

      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 dark:from-amber-700 dark:via-orange-800 dark:to-amber-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-16">
            <div className="lg:max-w-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {t('donate') || 'Support CMFI Replay'}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 leading-relaxed max-w-lg">
                {t('donateSubtitle') || 'Your donation helps us continue spreading the message of faith'}
              </p>
            </div>

            <div className="lg:max-w-md space-y-6">
              <h2 className="text-2xl font-bold text-white mb-3">
                {t('donateWhyGive') || 'Why your gift matters'}
              </h2>
              <div className="space-y-4">
                {[
                  {
                    title: t('donateImpact1Title') || 'Quality Production Equipment',
                    description: t('donateImpact1Desc') || 'Your donation helps us purchase professional-grade equipment to produce high-quality content that inspires and transforms lives.',
                  },
                  {
                    title: t('donateImpact2Title') || 'Platform Maintenance & Hosting',
                    description: t('donateImpact2Desc') || 'Support the ongoing costs of video hosting, deployment services, and infrastructure that keep CMFI Replay accessible to everyone.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex-shrink-0 w-1 bg-amber-400 rounded-full" />
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="text-sm text-white/80 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-black to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1 lg:max-w-lg xl:max-w-xl">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-xl">
              {showMethodToggle && (
                <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      paymentMethod === 'stripe'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 16" fill="currentColor">
                        <rect width="24" height="16" rx="2" />
                      </svg>
                      {t('payByCard') || 'Card'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('fedapay')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      paymentMethod === 'fedapay'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M6 12h4M14 12h4" strokeLinecap="round" />
                      </svg>
                      {t('mobileMoney') || 'Mobile Money'}
                    </span>
                  </button>
                </div>
              )}

              {renderPaymentForm()}
            </div>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {getSecurePaymentText()}
              </div>
            </div>
          </div>

          <div className="flex-1 lg:pt-8">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t('donationTerms') || 'Transparent & Secure'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('donationTermsDesc') || 'All transactions are processed securely via Stripe. Your information is protected with industry-standard encryption. You will receive a receipt via email.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t('donationFooter') || 'CMFI Replay is a faith-based streaming platform. Thank you for your generosity.'}
        </p>
      </div>
    </div>
  );
};

export default DonateScreen;
