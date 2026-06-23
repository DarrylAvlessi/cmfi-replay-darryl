import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAppContext } from '../context/AppContext';
import { fedapayService, fedapayPublicKey } from '../lib/fedapayService';

interface FedapayDonationFormProps {
  streamerId: string;
  streamerName: string;
  onSuccess?: () => void;
}

const presetAmounts = [1000, 2500, 5000, 10000, 25000];

const formatFCFA = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount);
};

const FedapayDonationForm: React.FC<FedapayDonationFormProps> = ({
  streamerId,
  streamerName,
  onSuccess,
}) => {
  const { t, user, userProfile } = useAppContext();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(5000);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const getAmount = (): number | null => {
    if (customAmount) {
      const val = parseInt(customAmount, 10);
      return isNaN(val) || val < 100 ? null : val;
    }
    return selectedAmount;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const amount = getAmount();
    if (!amount) {
      toast.error(t('donationInvalidAmount') || 'Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      await fedapayService.loadScript();

      const win = window as any;
      const FedaPay = win.FedaPay;
      if (!FedaPay) {
        throw new Error('FedaPay Checkout not loaded');
      }

      if (!fedapayPublicKey) {
        throw new Error('FedaPay is not configured');
      }

      const onComplete = async (resp: any) => {
        const FedaPay = win.FedaPay;
        const isCompleted = resp.reason === FedaPay.CHECKOUT_COMPLETED || resp.reason === 1;

        if (isCompleted) {
          if (resp.transaction?.id) {
            try {
              await fedapayService.verifyAndRecordDonation(resp.transaction.id);
              toast.success(
                t('paymentSuccess') || 'Payment successful! Thank you for your donation.',
              );
              onSuccess?.();
            } catch (err: any) {
              toast.error(err.message || t('paymentError'));
            }
          } else {
            toast.error(t('paymentError') || 'Payment verification failed');
          }
        } else {
          toast.info(t('paymentCancelled') || 'Payment cancelled');
        }

        setProcessing(false);
      };

      const widget = FedaPay.init({
        public_key: fedapayPublicKey,
        transaction: {
          amount,
          description: `Donation to ${streamerName}`,
          custom_metadata: {
            streamerId,
            streamerName,
            donorId: user?.uid,
          },
        },
        currency: {
          iso: 'XOF',
        },
        customer: {
          email: user?.email || '',
          firstname: userProfile?.displayName || user?.displayName || '',
          lastname: '',
        },
        onComplete,
      });

      widget.open();
    } catch (error: any) {
      toast.error(error.message || t('paymentError'));
      setProcessing(false);
    }
  };

  const currentAmount = getAmount();

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('donationChooseAmount') || 'Choose an amount'}
          </h2>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
            FCFA
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setSelectedAmount(amount);
                setCustomAmount('');
              }}
              className={`py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                selectedAmount === amount && !customAmount
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {formatAmount(amount)}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 font-semibold">
              FCFA
            </span>
          </div>
          <input
            type="number"
            min="100"
            step="100"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              if (e.target.value) setSelectedAmount(null);
            }}
            placeholder={t('donationCustomAmount') || 'Custom amount'}
            className="w-full pl-16 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={processing || !currentAmount}
        className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all duration-200 ${
          processing || !currentAmount
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
            {t('donateButton') || 'Donate'} {currentAmount ? formatFCFA(currentAmount) : ''}
          </span>
        )}
      </button>

      <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
        {t('fedapayPaymentInfo') || 'Pay via Mobile Money (MTN, Orange, Moov) with FedaPay'}
      </p>
    </form>
  );
};

export default FedapayDonationForm;
