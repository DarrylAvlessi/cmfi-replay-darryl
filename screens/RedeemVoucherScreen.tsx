import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { checkCoupon, redeemCoupon } from '../lib/couponService';
import { useAppContext } from '../context/AppContext';
import { usePageTitle } from '../lib/pageTitle';

const RedeemVoucherScreen: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState<any>(null);
  const { user, t, refreshSubscription } = useAppContext();
  const navigate = useNavigate();

  // Mise à jour du titre de la page
  const { updateTitle } = usePageTitle();
  useEffect(() => {
    updateTitle();
  }, [updateTitle]);

  const handleCheckCode = async () => {
    if (!code.trim()) {
      setError(t('pleaseEnterCode'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await checkCoupon(code);

      if (!result.success) {
        setError(result.error || t('invalidCode'));
        setCoupon(null);
        return;
      }

      setCoupon(result.data);

      if (!result.data.is_active) {
        setError(t('codeAlreadyUsed'));
      }
    } catch (err) {
      console.error('Error checking code:', err);
      setError(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!coupon || !user) return;

    setLoading(true);

    try {
      const result = await redeemCoupon(coupon.code, user?.uid || '');

      if (result.success) {
        // Rafraîchir le statut d'abonnement
        await refreshSubscription();

        toast.success(t('codeValidatedSuccess'));
        navigate('/');
      } else {
        setError(result.error || t('errorValidatingCode'));
      }
    } catch (err) {
      console.error('Error redeeming code:', err);
      setError(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header avec bouton retour */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{t('back')}</span>
          </button>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('redeemVoucherTitle')}
          </h1>
          <div className="h-1 w-16 bg-amber-500 rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('redeemVoucherSubtitle')}
          </p>
        </div>

        {/* Carte principale */}
        <div className="bg-white dark:bg-black rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 md:p-10">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('redeemVoucherTitle')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('redeemVoucherSubtitle')}
            </p>
            {/* Input et bouton de vérification */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label htmlFor="voucher-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('voucherCode')}
                </label>
                <div className="relative">
                  <input
                    id="voucher-code"
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all font-mono"
                    placeholder={t('enterCodeWithoutSpaces')}
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    disabled={loading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckCode();
                      }
                    }}
                  />
                  {code && (
                    <button
                      onClick={() => setCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCheckCode}
                  disabled={loading || !code.trim()}
                  className={`w-full h-[42px] bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-6 rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 ${loading || !code.trim() ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                    }`}
                >
                  {loading ? t('checking') : t('checkCode')}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Détails du coupon */}
            {coupon && (
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                    {t('codeDetails')}
                  </h3>
                  {coupon.paid_by && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('offeredBy')}: {coupon.paid_by}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{t('code')} :</span>
                    <span className="font-semibold text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded">{coupon.code}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{t('type')} :</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {coupon.type_coupon === 'monthly' ? t('monthly') :
                        coupon.type_coupon === 'yearly' ? t('yearly') : t('lifetime')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{t('status')} :</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${coupon.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${coupon.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {coupon.is_active ? t('available') : t('alreadyUsed')}
                    </span>
                  </div>

                  {coupon.used_by && (
                    <div className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{t('usedBy')} :</span>
                      <span className="text-gray-900 dark:text-white font-medium">{coupon.used_by}</span>
                    </div>
                  )}

                  {coupon.is_active && (
                    <button
                      onClick={handleRedeem}
                      disabled={loading}
                      className={`w-full mt-6 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                        }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {loading ? t('processing') : t('useThisCode')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer avec aide */}
          {/* <div className="bg-gray-50 dark:bg-gray-900 px-6 md:px-8 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{t('needHelp')}</span>
              <a href="mailto:support@cmfi.org" className="text-amber-600 dark:text-amber-400 hover:underline font-medium">
                {t('contactSupport')}
              </a>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default RedeemVoucherScreen;
