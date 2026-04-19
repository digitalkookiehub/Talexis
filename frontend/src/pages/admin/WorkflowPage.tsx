import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GitBranch, User, Building2, GraduationCap, Shield, ArrowRight, ArrowDown, Brain, FileText, ClipboardCheck, TrendingUp, Heart, Briefcase, Calendar, Star, MessageSquare, Users, CheckCircle, Eye, Lock, ThumbsUp, Download } from 'lucide-react';

const roleColors: Record<string, { bg: string; border: string; text: string; light: string }> = {
  student: { bg: 'bg-blue-600', border: 'border-blue-300', text: 'text-blue-700', light: 'bg-blue-50' },
  company: { bg: 'bg-emerald-600', border: 'border-emerald-300', text: 'text-emerald-700', light: 'bg-emerald-50' },
  college: { bg: 'bg-orange-600', border: 'border-orange-300', text: 'text-orange-700', light: 'bg-orange-50' },
  admin: { bg: 'bg-red-600', border: 'border-red-300', text: 'text-red-700', light: 'bg-red-50' },
  system: { bg: 'bg-gray-600', border: 'border-gray-300', text: 'text-gray-700', light: 'bg-gray-50' },
};

interface FlowStep {
  icon: React.ReactNode;
  label: string;
  desc: string;
}

function FlowArrow() {
  return <ArrowDown size={16} className="text-gray-300 mx-auto my-1" />;
}

function FlowCard({ title, role, steps }: { title: string; role: string; steps: FlowStep[] }) {
  const c = roleColors[role] ?? { bg: 'bg-gray-600', border: 'border-gray-300', text: 'text-gray-700', light: 'bg-gray-50' };
  return (
    <div className={`rounded-xl border-2 ${c.border} overflow-hidden`}>
      <div className={`${c.bg} text-white px-4 py-2 text-sm font-semibold`}>{title}</div>
      <div className={`${c.light} p-3 space-y-2`}>
        {steps.map((step, i) => (
          <div key={i}>
            <div className="flex items-start gap-2">
              <div className={`${c.text} mt-0.5 shrink-0`}>{step.icon}</div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{step.label}</p>
                <p className="text-[10px] text-gray-500">{step.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && <FlowArrow />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkflowPage() {
  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg print:hidden"><GitBranch className="text-indigo-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Workflow</h1>
            <p className="text-gray-500 text-sm">Complete Talexis ecosystem — how all roles interact</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 print:hidden"
        >
          <Download size={16} /> Download PDF
        </button>
      </div>

      {/* Role Legend */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { role: 'student', label: 'Candidate', icon: <User size={12} /> },
          { role: 'company', label: 'Company / HR', icon: <Building2 size={12} /> },
          { role: 'college', label: 'College Admin', icon: <GraduationCap size={12} /> },
          { role: 'admin', label: 'Platform Admin', icon: <Shield size={12} /> },
          { role: 'system', label: 'AI / System', icon: <Brain size={12} /> },
        ].map((r) => (
          <div key={r.role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white ${roleColors[r.role]?.bg ?? 'bg-gray-600'}`}>
            {r.icon} {r.label}
          </div>
        ))}
      </div>

      {/* ===== How Candidates Join ===== */}
      <GlassCard className="bg-indigo-50 border-indigo-200 mb-6">
        <h2 className="text-sm font-semibold text-indigo-800 mb-3">How Candidates Join Talexis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="font-medium text-indigo-700 mb-1">College Candidates</p>
            <p className="text-gray-500">Placement officer creates accounts via single form or CSV bulk import. College name auto-assigned.</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="font-medium text-indigo-700 mb-1">Experienced / Independent</p>
            <p className="text-gray-500">Self-signup via Candidate Portal. No college needed. Sets experience level, portfolio links, preferred roles.</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="font-medium text-indigo-700 mb-1">Word of Mouth / Referral</p>
            <p className="text-gray-500">Company shares registration link. Candidate signs up, takes interviews, appears in talent pool. No off-platform scheduling.</p>
          </div>
        </div>
      </GlassCard>

      {/* ===== Candidate Journey ===== */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={18} className="text-blue-600" /> Candidate Journey
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <FlowCard title="1. Onboarding" role="student" steps={[
            { icon: <User size={12} />, label: 'Register / Created by College', desc: 'Self-signup or placement officer creates' },
            { icon: <User size={12} />, label: 'Complete Profile', desc: 'Skills, experience level, portfolio links, avatar' },
            { icon: <FileText size={12} />, label: 'Upload Resume', desc: 'PDF/DOCX (tables, text boxes supported)' },
            { icon: <Brain size={12} />, label: 'AI Resume Screening', desc: 'Score + suggestions (persisted)' },
          ]} />
          <FlowCard title="2. Interview Practice" role="student" steps={[
            { icon: <Brain size={12} />, label: 'Select Interview', desc: 'HR, Domain Skills, Behavioral, Sales' },
            { icon: <Lock size={12} />, label: 'Progressive Unlock', desc: 'Basic→Intermediate (5/10)→Advanced (6/10)' },
            { icon: <MessageSquare size={12} />, label: 'AI Questions', desc: 'Industry-specific topics (10 industries)' },
            { icon: <ClipboardCheck size={12} />, label: 'Answer & Submit', desc: 'Text/voice, word count, timer tracked' },
            { icon: <Star size={12} />, label: 'AI Evaluation', desc: '4 dimensions + summary + improved answer' },
          ]} />
          <FlowCard title="3. Review & Improve" role="student" steps={[
            { icon: <ClipboardCheck size={12} />, label: 'Detailed Feedback', desc: 'Q&A side-by-side with AI feedback' },
            { icon: <TrendingUp size={12} />, label: 'Score Trend', desc: 'Performance over time chart' },
            { icon: <Brain size={12} />, label: 'Action Items', desc: 'Weak area suggestions linked to modules' },
            { icon: <Briefcase size={12} />, label: 'Browse Job Board', desc: 'Apply to active company job postings' },
          ]} />
          <FlowCard title="4. Meet Requirements" role="student" steps={[
            { icon: <TrendingUp size={12} />, label: 'Auto-Readiness', desc: 'Calculated after every evaluation' },
            { icon: <Shield size={12} />, label: '4 Requirements', desc: '2 types, 3 interviews, 1 intermediate, 60%+' },
            { icon: <TrendingUp size={12} />, label: 'Readiness Checklist', desc: 'Dashboard tracks progress to visibility' },
          ]} />
          <FlowCard title="5. Get Discovered" role="student" steps={[
            { icon: <Eye size={12} />, label: 'Grant Consent', desc: 'Locked until all requirements met' },
            { icon: <Users size={12} />, label: 'Talent Profile', desc: 'Anonymized code + scores + experience' },
            { icon: <Calendar size={12} />, label: 'Talexis Interview', desc: 'Video/audio room auto-generated' },
            { icon: <CheckCircle size={12} />, label: 'Get Hired', desc: 'Through matching + feedback loop' },
          ]} />
        </div>
      </GlassCard>

      {/* ===== Company / HR Workflow ===== */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-emerald-600" /> Company / HR Workflow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <FlowCard title="1. Setup" role="company" steps={[
            { icon: <Building2 size={12} />, label: 'Company Profile', desc: 'Name, industry, logo upload' },
            { icon: <Briefcase size={12} />, label: 'Post Job Roles', desc: 'Skills, min readiness, interview types' },
            { icon: <ClipboardCheck size={12} />, label: 'Job Status', desc: 'Draft → Active → Closed' },
          ]} />
          <FlowCard title="2. Discover Talent" role="company" steps={[
            { icon: <Users size={12} />, label: 'Browse Talent Pool', desc: 'Filter by score, college, experience, recommendation' },
            { icon: <ClipboardCheck size={12} />, label: 'Enriched Scorecard', desc: 'Scores, trends, skills, portfolio, college/independent' },
            { icon: <Heart size={12} />, label: 'Shortlist + Notes', desc: 'Add notes, compare 2-3 side-by-side' },
            { icon: <Brain size={12} />, label: 'AI Matching', desc: 'Job ↔ candidates with ranked results + CSV export' },
            { icon: <Briefcase size={12} />, label: 'View Applications', desc: 'Candidates who applied via Job Board' },
          ]} />
          <FlowCard title="3. Interview" role="company" steps={[
            { icon: <Calendar size={12} />, label: 'Schedule Interview', desc: 'Talexis candidates only — no off-platform' },
            { icon: <Star size={12} />, label: 'Talexis Video/Audio Room', desc: 'Auto-generated meeting link per schedule' },
            { icon: <ThumbsUp size={12} />, label: 'College Approval', desc: 'Pending → Approved / Declined (if college candidate)' },
            { icon: <Star size={12} />, label: 'Post-Interview Feedback', desc: 'Rating (1-5), outcome, notes → college sees' },
            { icon: <MessageSquare size={12} />, label: 'Share Invite Link', desc: 'Not on platform? Share signup link to candidate' },
          ]} />
          <FlowCard title="4. Hire Pipeline" role="company" steps={[
            { icon: <TrendingUp size={12} />, label: 'Track Pipeline', desc: 'Shortlisted → Contacted → Hired / Rejected' },
            { icon: <Download size={12} />, label: 'Export CSV', desc: 'Shortlist & match results download' },
            { icon: <GraduationCap size={12} />, label: 'College Recommendations', desc: 'Placement officers push candidates' },
          ]} />
          <FlowCard title="5. Analytics" role="company" steps={[
            { icon: <TrendingUp size={12} />, label: 'Hiring Funnel', desc: 'Conversion rate, status breakdown' },
            { icon: <ClipboardCheck size={12} />, label: 'Shortlisting Trends', desc: '30-day activity chart' },
            { icon: <Calendar size={12} />, label: 'Schedule Overview', desc: 'Upcoming interviews on dashboard' },
          ]} />
        </div>
      </GlassCard>

      {/* ===== College Placement Office ===== */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap size={18} className="text-orange-600" /> College Placement Office
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <FlowCard title="1. Setup & Manage" role="college" steps={[
            { icon: <GraduationCap size={12} />, label: 'Set College', desc: 'First-login college name setup' },
            { icon: <Users size={12} />, label: 'Student Roster', desc: 'Filter by branch, search, status icons' },
            { icon: <TrendingUp size={12} />, label: 'Placement Tracking', desc: 'Ready / Almost / Needs Work funnel' },
          ]} />
          <FlowCard title="2. Coordinate" role="college" steps={[
            { icon: <ThumbsUp size={12} />, label: 'Approve Schedules', desc: 'Accept/decline with reason' },
            { icon: <Star size={12} />, label: 'View Feedback', desc: 'Company rating, outcome, notes' },
            { icon: <Heart size={12} />, label: 'Recommend Students', desc: 'Push to specific companies' },
          ]} />
          <FlowCard title="3. Monitor" role="college" steps={[
            { icon: <TrendingUp size={12} />, label: 'College Analytics', desc: 'Placement rate, scores, by branch/type' },
            { icon: <Calendar size={12} />, label: 'Interview Schedules', desc: 'All company interviews for college students' },
            { icon: <MessageSquare size={12} />, label: 'Activity Feed', desc: 'Shared timeline with companies' },
          ]} />
          <FlowCard title="4. Readiness Gauge" role="college" steps={[
            { icon: <CheckCircle size={12} />, label: 'Placement Rate', desc: 'Circular gauge — % students ready' },
            { icon: <Users size={12} />, label: 'Branch Breakdown', desc: 'Students per branch visualization' },
            { icon: <Eye size={12} />, label: 'Visibility Tracking', desc: 'How many students visible to companies' },
          ]} />
        </div>
      </GlassCard>

      {/* ===== Cross-Role Coordination ===== */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GitBranch size={18} className="text-indigo-600" /> Cross-Role Coordination
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Complete Candidate Pipeline (Single Path)</h3>
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">Candidate joins (any source)</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Takes AI interviews</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Gets scored (4D)</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Meets 4 requirements</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">Visible in talent pool</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">Company schedules via Talexis</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">Hired</span>
            </div>
            <p className="text-[9px] text-gray-400">Every candidate goes through the same pipeline. No off-platform shortcuts. Clean data.</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Interview Scheduling Flow</h3>
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">Company picks Talexis candidate</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">Talexis room auto-created</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">College approves (if college candidate)</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Video/audio interview</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-medium">Feedback submitted</span>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Word of Mouth / Referral</h3>
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-medium">Company shares signup link</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Candidate self-registers</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Takes AI interviews</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">Appears in talent pool</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-medium">Company schedules interview</span>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Candidate Notification (Who Sees What)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                <p className="font-medium text-blue-800 mb-1">College Candidate</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Company schedules</span>
                  <ArrowRight size={8} className="text-gray-300" />
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Dashboard: &quot;Awaiting approval&quot;</span>
                  <ArrowRight size={8} className="text-gray-300" />
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">College approves</span>
                  <ArrowRight size={8} className="text-gray-300" />
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Dashboard: &quot;Join Interview&quot; button</span>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                <p className="font-medium text-indigo-800 mb-1">Independent Candidate</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Company schedules</span>
                  <ArrowRight size={8} className="text-gray-300" />
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Dashboard: &quot;Join Interview&quot; immediately</span>
                  <span className="text-gray-400">(no approval needed)</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Auto-Sync Chain</h3>
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">Interview evaluated</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">Readiness auto-calculated</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">Talent scores synced</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">Anti-cheat runs</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ===== Platform Admin Oversight ===== */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-red-600" /> Platform Admin Oversight
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <FlowCard title="User Management" role="admin" steps={[
            { icon: <Users size={12} />, label: 'All Users', desc: 'Search, filter, pagination (15/page)' },
            { icon: <Shield size={12} />, label: 'Role Control', desc: 'Change roles via dropdown' },
            { icon: <CheckCircle size={12} />, label: 'Activate/Deactivate', desc: 'Per-user toggle' },
          ]} />
          <FlowCard title="Analytics" role="admin" steps={[
            { icon: <TrendingUp size={12} />, label: '30-Day Trends', desc: 'Interview activity bar chart' },
            { icon: <ClipboardCheck size={12} />, label: 'Score Distribution', desc: '0-3, 4-5, 6-7, 8-9, 10 buckets' },
            { icon: <Users size={12} />, label: 'Users by Role', desc: 'Percentage breakdown' },
          ]} />
          <FlowCard title="Anti-Cheat" role="admin" steps={[
            { icon: <Shield size={12} />, label: 'Flag Detection', desc: 'Similarity, patterns, attempt limits' },
            { icon: <ClipboardCheck size={12} />, label: 'Drill-Down', desc: 'Flagged interviews, expand for details' },
            { icon: <User size={12} />, label: 'Student Info', desc: 'Name, score, flag severity' },
          ]} />
          <FlowCard title="System Health" role="admin" steps={[
            { icon: <Brain size={12} />, label: 'LLM Status', desc: 'Ollama online/offline, models listed' },
            { icon: <Shield size={12} />, label: 'DB & Auth', desc: 'PostgreSQL host, JWT config' },
            { icon: <FileText size={12} />, label: 'Uploads', desc: 'Directory, max file size' },
          ]} />
          <FlowCard title="Workflow View" role="admin" steps={[
            { icon: <GitBranch size={12} />, label: 'This Page', desc: 'Complete platform flow visualization' },
            { icon: <ClipboardCheck size={12} />, label: 'Tech Stack', desc: 'All technologies documented' },
          ]} />
        </div>
      </GlassCard>

      {/* ===== Interview Readiness Framework ===== */}
      <GlassCard className="bg-blue-50 border-blue-200 mb-6">
        <h2 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <Lock size={16} /> Interview Readiness Framework
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="font-medium text-blue-700 mb-1">Attempt Limits</p>
            <ul className="space-y-1 text-blue-600">
              <li>Basic: Unlimited (free practice)</li>
              <li>Intermediate: 10 per type</li>
              <li>Advanced: 5 per type</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-blue-700 mb-1">Progressive Unlock</p>
            <ul className="space-y-1 text-blue-600">
              <li>Basic: Always available</li>
              <li>Intermediate: Score 5/10 on basic</li>
              <li>Advanced: Score 6/10 on intermediate</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-blue-700 mb-1">Visibility Requirements</p>
            <ul className="space-y-1 text-blue-600">
              <li>2+ interview types completed</li>
              <li>3+ evaluated interviews</li>
              <li>1+ intermediate/advanced interview</li>
              <li>{'Readiness score >= 60%'}</li>
            </ul>
          </div>
        </div>
      </GlassCard>

      {/* ===== Tech Stack ===== */}
      <GlassCard className="bg-gray-50 border-gray-200 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Technology Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="font-medium text-gray-800">Backend</p>
            <p className="text-gray-500">FastAPI + Python 3.11</p>
            <p className="text-gray-500">PostgreSQL + SQLAlchemy</p>
            <p className="text-gray-500">Alembic migrations</p>
            <p className="text-gray-500">85 backend tests (pytest)</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Frontend</p>
            <p className="text-gray-500">React 19 + TypeScript</p>
            <p className="text-gray-500">Vite + Tailwind CSS 4</p>
            <p className="text-gray-500">Framer Motion</p>
            <p className="text-gray-500">17 frontend tests (vitest)</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">AI / LLM</p>
            <p className="text-gray-500">Ollama (local) — qwen2.5:3b</p>
            <p className="text-gray-500">OpenAI GPT-4o (fallback)</p>
            <p className="text-gray-500">Whisper (voice STT)</p>
            <p className="text-gray-500">Rule-based fallback parser</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Auth & Security</p>
            <p className="text-gray-500">JWT (HS256) + bcrypt</p>
            <p className="text-gray-500">4 roles, progressive access</p>
            <p className="text-gray-500">Anti-cheat (similarity + patterns)</p>
            <p className="text-gray-500">Anonymized candidate codes</p>
          </div>
        </div>
      </GlassCard>

      {/* ===== Database Models ===== */}
      <GlassCard className="bg-gray-50 border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Database Models (22 tables)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-gray-500">
          {[
            'users', 'refresh_tokens', 'student_profiles', 'skill_assessments',
            'companies', 'job_roles', 'interviews', 'interview_questions',
            'interview_answers', 'interview_attempts', 'answer_evaluations',
            'evaluation_runs', 'placement_readiness', 'readiness_history',
            'talent_profiles', 'company_shortlists', 'match_results',
            'learning_modules', 'student_learning_progress',
            'anti_cheat_logs', 'answer_similarities',
            'scheduled_interviews', 'college_recommendations', 'activity_logs',
          ].map((table) => (
            <span key={table} className="bg-white px-2 py-1 rounded border border-gray-200 font-mono">{table}</span>
          ))}
        </div>
      </GlassCard>
    </PageWrapper>
  );
}
