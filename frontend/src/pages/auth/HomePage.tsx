import { Link } from 'react-router-dom';
import { MeshBackground } from '../../components/layout/MeshBackground';
import { GraduationCap, Building2, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const portals = [
  {
    to: '/pricing?for=candidate',
    icon: <GraduationCap size={32} />,
    title: 'Candidate',
    desc: 'Experienced professionals and independent candidates — practice AI mock interviews, build your scorecard, and get discovered.',
    color: 'from-blue-500 to-indigo-600',
    hover: 'hover:shadow-blue-200',
  },
  {
    to: '/pricing?for=college',
    icon: <Users size={32} />,
    title: 'Placement Officer',
    desc: 'Manage your college students, track readiness, approve schedules, and coordinate with companies.',
    color: 'from-orange-500 to-orange-600',
    hover: 'hover:shadow-orange-200',
  },
  {
    to: '/hire/login?tab=demo',
    icon: <Building2 size={32} />,
    title: 'Company / HR',
    desc: 'Browse pre-qualified talent, schedule interviews, and build your hiring pipeline.',
    color: 'from-emerald-500 to-emerald-600',
    hover: 'hover:shadow-emerald-200',
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <MeshBackground />
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 relative z-10 max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">T</div>
          <h1 className="text-4xl font-bold text-gray-900">Talexis</h1>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3 leading-tight">
          Where <span className="text-emerald-600">Talent</span> Meets <span className="text-teal-600">Opportunity</span>
        </h2>
        <p className="text-gray-500 text-base md:text-lg leading-relaxed">
          AI-powered mock interviews that prepare students, data-driven insights that help colleges, and pre-qualified talent pools that save companies time.
        </p>
        <div className="flex items-center justify-center gap-6 mt-5 text-sm text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> AI-Evaluated</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> 4-Dimension Scoring</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> Placement Ready</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full relative z-10">
        {portals.map((p, i) => (
          <motion.div
            key={p.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
          >
            <Link to={p.to}>
              <div className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 shadow-lg ${p.hover} hover:shadow-xl transition-all cursor-pointer group`}>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-4`}>
                  {p.icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h2>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{p.desc}</p>
                <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
                  Get Started <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-8 relative z-10 text-xs text-gray-400">
        <Link to="/pricing" className="text-emerald-600 hover:underline font-medium">View Pricing</Link>
        <span>&middot;</span>
        <span>Admin? <Link to="/login" className="text-emerald-600 hover:underline">Login here</Link></span>
      </div>
    </div>
  );
}
