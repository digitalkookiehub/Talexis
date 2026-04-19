import { Link } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { CheckCircle, X, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlanCard {
  name: string;
  planKey: string;
  price: string;
  period: string;
  target: string;
  highlight?: boolean;
  features: Array<{ text: string; included: boolean }>;
  cta: string;
  ctaLink: string;
}

const plans: PlanCard[] = [
  {
    name: 'Free',
    planKey: 'free',
    price: '₹0',
    period: 'forever',
    target: 'Try the platform',
    features: [
      { text: '3 AI interviews per month', included: true },
      { text: 'Basic difficulty only', included: true },
      { text: '1 resume screening', included: true },
      { text: 'Intermediate & Advanced', included: false },
      { text: 'Company visibility', included: false },
      { text: 'Job Board access', included: false },
    ],
    cta: 'Get Started Free',
    ctaLink: '/student/login',
  },
  {
    name: 'Pro Candidate',
    planKey: 'pro_candidate',
    price: '₹399',
    period: '/month',
    target: 'Serious job seekers',
    highlight: true,
    features: [
      { text: 'Unlimited AI interviews', included: true },
      { text: 'All difficulty levels', included: true },
      { text: 'Unlimited resume screening', included: true },
      { text: 'Company visibility enabled', included: true },
      { text: 'Job Board access', included: true },
      { text: 'Full readiness tracking', included: true },
    ],
    cta: 'Start Pro',
    ctaLink: '/student/login',
  },
  {
    name: 'College Plan',
    planKey: 'college',
    price: '₹149',
    period: '/student/year',
    target: 'Placement offices',
    features: [
      { text: 'Unlimited interviews for students', included: true },
      { text: 'Bulk candidate import (CSV)', included: true },
      { text: 'Schedule approval workflow', included: true },
      { text: 'Company feedback visibility', included: true },
      { text: 'College analytics & placement tracking', included: true },
      { text: 'Candidate recommendation to companies', included: true },
    ],
    cta: 'Contact Sales',
    ctaLink: '/placement/login',
  },
];

const companyPlans: PlanCard[] = [
  {
    name: 'Company Starter',
    planKey: 'company_starter',
    price: '₹7,999',
    period: '/month',
    target: 'Small teams',
    features: [
      { text: '50 talent pool views/month', included: true },
      { text: '5 shortlists/month', included: true },
      { text: '3 interview schedules/month', included: true },
      { text: '2 job postings', included: true },
      { text: 'AI matching', included: false },
      { text: 'CSV export & comparison', included: false },
    ],
    cta: 'Request Demo',
    ctaLink: '/hire/login',
  },
  {
    name: 'Company Growth',
    planKey: 'company_growth',
    price: '₹24,999',
    period: '/month',
    target: 'Growing companies',
    highlight: true,
    features: [
      { text: 'Unlimited talent browsing', included: true },
      { text: 'Unlimited shortlists', included: true },
      { text: '20 interview schedules/month', included: true },
      { text: '10 job postings', included: true },
      { text: 'AI matching with ranked results', included: true },
      { text: 'CSV export & candidate comparison', included: true },
    ],
    cta: 'Request Demo',
    ctaLink: '/hire/login',
  },
  {
    name: 'Enterprise',
    planKey: 'company_enterprise',
    price: 'Custom',
    period: 'pricing',
    target: 'Large organizations',
    features: [
      { text: 'Unlimited everything', included: true },
      { text: 'Unlimited job postings', included: true },
      { text: 'Unlimited schedules', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom branding', included: true },
      { text: 'API access', included: true },
    ],
    cta: 'Contact Sales',
    ctaLink: '/hire/login',
  },
];

function PlanCardComponent({ plan, index }: { plan: PlanCard; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
      <div className={`rounded-2xl p-6 h-full flex flex-col ${
        plan.highlight
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-200 scale-105'
          : 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-lg'
      }`}>
        <div className="mb-4">
          <p className={`text-sm font-medium ${plan.highlight ? 'text-emerald-100' : 'text-gray-500'}`}>{plan.target}</p>
          <h3 className={`text-xl font-bold mt-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
        </div>
        <div className="mb-6">
          <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
          <span className={`text-sm ${plan.highlight ? 'text-emerald-100' : 'text-gray-500'}`}> {plan.period}</span>
        </div>
        <div className="space-y-2 mb-6 flex-1">
          {plan.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {f.included ? (
                <CheckCircle size={14} className={plan.highlight ? 'text-emerald-200' : 'text-emerald-500'} />
              ) : (
                <X size={14} className={plan.highlight ? 'text-emerald-300/50' : 'text-gray-300'} />
              )}
              <span className={f.included ? '' : (plan.highlight ? 'text-emerald-200/50' : 'text-gray-400')}>{f.text}</span>
            </div>
          ))}
        </div>
        <Link to={plan.ctaLink}>
          <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            plan.highlight
              ? 'bg-white text-emerald-700 hover:bg-emerald-50'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}>
            {plan.cta}
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

export function PricingPage() {
  return (
    <div className="min-h-screen p-4 pb-16">
      <MeshBackground />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="pt-8 mb-4">
          <Link to="/" className="flex items-center gap-1 text-sm text-emerald-600 hover:underline mb-4">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">T</div>
            <h1 className="text-3xl font-bold text-gray-900">Talexis Pricing</h1>
          </div>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">Choose the plan that fits your needs. Start free, upgrade anytime.</p>
        </div>

        {/* Candidate & College Plans */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">For Candidates & Colleges</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, i) => <PlanCardComponent key={plan.name} plan={plan} index={i} />)}
        </div>

        {/* Company Plans */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">For Companies & HR</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {companyPlans.map((plan, i) => <PlanCardComponent key={plan.name} plan={plan} index={i} />)}
        </div>

        {/* FAQ */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing FAQ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {[
              { q: 'Can I start for free?', a: 'Yes! Candidates get 3 free AI interviews per month with basic difficulty. No credit card required.' },
              { q: 'How does the College Plan work?', a: 'Pricing is per student per year (₹149). Minimum 50 students. Contact us for volume discounts on 500+ students.' },
              { q: 'What happens when I hit my limit?', a: 'You\'ll see a clear upgrade prompt. Your data is never deleted. Upgrade instantly to continue.' },
              { q: 'Can I change plans anytime?', a: 'Yes. Upgrades take effect immediately. Downgrades apply at the next billing cycle.' },
              { q: 'Is GST included?', a: 'Prices shown are exclusive of GST (18%). GST will be added at checkout.' },
              { q: 'Do you offer annual billing?', a: 'Yes, for Pro Candidate and Company plans. Save 20% with annual billing. Contact sales.' },
            ].map((faq, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-800 mb-1">{faq.q}</p>
                <p className="text-xs text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">All prices in Indian Rupees (₹). GST extra. Subject to terms.</p>
      </div>
    </div>
  );
}
