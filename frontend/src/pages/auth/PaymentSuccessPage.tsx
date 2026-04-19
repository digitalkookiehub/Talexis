import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { CheckCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') ?? '';
  const [confirming, setConfirming] = useState(true);
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    if (plan) {
      const token = localStorage.getItem('access_token');
      if (token) {
        api.post('/payments/confirm', null, { params: { plan_key: plan } })
          .then((r) => setPlanName((r.data as { plan?: { plan_name?: string } }).plan?.plan_name ?? plan))
          .catch(() => setPlanName(plan))
          .finally(() => setConfirming(false));
      } else {
        setPlanName(plan);
        setConfirming(false);
      }
    } else {
      setConfirming(false);
    }
  }, [plan]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MeshBackground />
      <GlassCard className="bg-white/80 backdrop-blur-xl max-w-md w-full text-center relative z-10">
        {confirming ? (
          <div className="py-8">
            <Loader2 className="animate-spin text-emerald-500 mx-auto mb-3" size={40} />
            <p className="text-gray-600">Confirming your payment...</p>
          </div>
        ) : (
          <div className="py-4">
            <CheckCircle className="text-emerald-500 mx-auto mb-4" size={56} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-500 mb-1">Your plan has been upgraded to:</p>
            <p className="text-lg font-semibold text-emerald-600 mb-6">{planName || 'Pro Plan'}</p>
            <Link to="/">
              <GradientButton className="w-full">Go to Dashboard</GradientButton>
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
