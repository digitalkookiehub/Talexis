import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { BookOpen, Download, Users, Building2, GraduationCap, User, Shield, Brain, Star, CheckCircle, MessageSquare } from 'lucide-react';

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <GlassCard className="bg-white border-gray-100 mb-6 break-inside-avoid">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </GlassCard>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{num}</div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

export function UserGuidePage() {
  return (
    <PageWrapper className="p-0 max-w-4xl">
      <div className="flex items-center justify-between mb-8 print:mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg print:hidden"><BookOpen className="text-blue-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Talexis Business Guide</h1>
            <p className="text-gray-500 text-sm">Complete guide for all platform users</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 print:hidden">
          <Download size={16} /> Download PDF
        </button>
      </div>

      {/* ===== OVERVIEW ===== */}
      <Section title="What is Talexis?" icon={<Brain size={18} className="text-emerald-600" />}>
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          Talexis is an AI-powered talent intelligence platform that connects three groups: <strong>candidates</strong> preparing for careers, <strong>companies</strong> hiring talent, and <strong>placement offices</strong> managing the process. The platform uses artificial intelligence to conduct mock interviews, evaluate performance, and match candidates with job opportunities across any industry.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <User size={16} className="text-blue-600 mb-1" />
            <p className="text-xs font-semibold text-blue-800">For Candidates</p>
            <p className="text-[10px] text-blue-600">Practice interviews, get AI feedback, build a scorecard, get discovered by companies</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <Building2 size={16} className="text-emerald-600 mb-1" />
            <p className="text-xs font-semibold text-emerald-800">For Companies</p>
            <p className="text-[10px] text-emerald-600">Browse pre-qualified talent, schedule interviews, track hiring pipeline</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
            <GraduationCap size={16} className="text-orange-600 mb-1" />
            <p className="text-xs font-semibold text-orange-800">For Placement Offices</p>
            <p className="text-[10px] text-orange-600">Manage candidates, approve schedules, track readiness, coordinate with companies</p>
          </div>
        </div>
      </Section>

      {/* ===== WHO USES IT ===== */}
      <Section title="Who Uses Talexis?" icon={<Users size={18} className="text-blue-600" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Role</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Who</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">How They Join</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr><td className="px-3 py-2 font-medium">College Candidate</td><td className="px-3 py-2">Students from colleges/universities</td><td className="px-3 py-2">Created by placement officer (single or CSV bulk)</td><td className="px-3 py-2">Candidate Portal</td></tr>
              <tr><td className="px-3 py-2 font-medium">Independent Candidate</td><td className="px-3 py-2">Experienced professionals, freshers not linked to a college</td><td className="px-3 py-2">Self-signup via Candidate Portal</td><td className="px-3 py-2">Candidate Portal</td></tr>
              <tr><td className="px-3 py-2 font-medium">Placement Officer</td><td className="px-3 py-2">College placement cell staff</td><td className="px-3 py-2">Self-signup via Placement Portal</td><td className="px-3 py-2">Placement Portal</td></tr>
              <tr><td className="px-3 py-2 font-medium">Company / HR</td><td className="px-3 py-2">Recruiters, HR consultants, hiring managers</td><td className="px-3 py-2">Request demo → admin creates account</td><td className="px-3 py-2">Company Portal</td></tr>
              <tr><td className="px-3 py-2 font-medium">Platform Admin</td><td className="px-3 py-2">Talexis operations team</td><td className="px-3 py-2">Created during setup</td><td className="px-3 py-2">Admin Login</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ===== CANDIDATE GUIDE ===== */}
      <Section title="Guide: Candidates" icon={<User size={18} className="text-blue-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Getting Started</h3>
            <Step num={1} title="Create your account" desc="Sign up via the Candidate Portal, or your placement officer creates it for you." />
            <Step num={2} title="Complete your profile" desc="Add skills, experience level, portfolio links (LinkedIn, GitHub), preferred roles and locations." />
            <Step num={3} title="Upload your resume" desc="Upload PDF or Word file. AI extracts skills, education, and experience automatically." />
            <Step num={4} title="Get your resume screened" desc="AI scores your resume on completeness, clarity, skills relevance, and gives improvement suggestions." />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Taking Interviews</h3>
            <Step num={5} title="Select interview type" desc="Choose: HR, Domain Skills, Behavioral, or Sales. Pick difficulty level and target role/industry." />
            <Step num={6} title="Answer AI questions" desc="AI generates questions based on your profile and industry. Answer via text or voice." />
            <Step num={7} title="Get evaluated" desc="AI scores you on 4 dimensions: Communication, Domain Knowledge, Confidence, Structure." />
            <Step num={8} title="Review detailed feedback" desc="See your answer alongside AI feedback, strengths, weaknesses, and a suggested better answer." />
          </div>
        </div>

        <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h3 className="text-xs font-semibold text-blue-800 mb-2">Becoming Visible to Companies</h3>
          <p className="text-[10px] text-blue-600 mb-2">You must meet these 4 requirements before companies can discover your profile:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-white rounded p-2"><CheckCircle size={10} className="text-emerald-500 inline" /> Complete 2+ interview types</div>
            <div className="bg-white rounded p-2"><CheckCircle size={10} className="text-emerald-500 inline" /> Complete 3+ evaluated interviews</div>
            <div className="bg-white rounded p-2"><CheckCircle size={10} className="text-emerald-500 inline" /> At least 1 intermediate or advanced</div>
            <div className="bg-white rounded p-2"><CheckCircle size={10} className="text-emerald-500 inline" /> Readiness score 60% or higher</div>
          </div>
        </div>

        <div className="mt-4 bg-indigo-50 rounded-lg p-3 border border-indigo-200">
          <h3 className="text-xs font-semibold text-indigo-800 mb-2">Progressive Difficulty</h3>
          <p className="text-[10px] text-indigo-600">Basic: unlimited attempts, always available. Intermediate: unlocked after scoring 5/10 on basic (10 attempts). Advanced: unlocked after scoring 6/10 on intermediate (5 attempts).</p>
        </div>
      </Section>

      {/* ===== COMPANY GUIDE ===== */}
      <Section title="Guide: Companies & HR" icon={<Building2 size={18} className="text-emerald-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Getting Started</h3>
            <Step num={1} title="Request a demo" desc="Visit the Company Portal, click 'Request Demo'. The Talexis team will contact you and create your account." />
            <Step num={2} title="Set up company profile" desc="Add company name, industry, size, logo, and description." />
            <Step num={3} title="Post job roles" desc="Create job postings with title, required skills, minimum readiness score. Set status: Draft, Active, or Closed." />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Finding & Hiring Talent</h3>
            <Step num={4} title="Browse talent pool" desc="Filter by recommendation, experience level, college. View enriched scorecards with scores, trends, skills, education." />
            <Step num={5} title="Shortlist & compare" desc="Add candidates to shortlist with notes. Select 2-3 to compare side-by-side." />
            <Step num={6} title="Schedule interview" desc="Pick a Talexis candidate, set date/time. Video/audio room auto-created. For college candidates, placement office must approve first." />
            <Step num={7} title="Submit feedback" desc="After the interview, rate (1-5 stars), set outcome (Hire/Next Round/Reject), add notes. Visible to placement office." />
          </div>
        </div>

        <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <h3 className="text-xs font-semibold text-amber-800 mb-2">Candidate Not on Talexis?</h3>
          <p className="text-[10px] text-amber-600">Share the registration link. Once they sign up and complete AI interviews, they appear in your talent pool. All interviews happen through the platform — no off-platform scheduling.</p>
        </div>
      </Section>

      {/* ===== PLACEMENT OFFICER GUIDE ===== */}
      <Section title="Guide: Placement Officers" icon={<GraduationCap size={18} className="text-orange-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Managing Candidates</h3>
            <Step num={1} title="Sign up & set college" desc="Register via Placement Portal. On first login, set your college/university name." />
            <Step num={2} title="Create candidate accounts" desc="Add candidates one by one or bulk import via CSV. Download the CSV template, fill in details, upload." />
            <Step num={3} title="Track readiness" desc="View candidate roster with interview counts, readiness scores, and recommendation status per candidate." />
            <Step num={4} title="Monitor placements" desc="Placement tracking page shows: Ready / Almost There / Needs Work funnel with per-candidate details." />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Working with Companies</h3>
            <Step num={5} title="Approve interview schedules" desc="When a company schedules an interview with your candidate, you see it on your dashboard. Approve or decline with a reason." />
            <Step num={6} title="View company feedback" desc="After each interview, see the company's star rating, outcome (Hire/Next Round/Reject), and notes." />
            <Step num={7} title="Recommend candidates" desc="Push specific candidates to specific companies with a personal message." />
            <Step num={8} title="Track activity" desc="Activity feed shows all events: schedules, approvals, feedback, recommendations — shared timeline with companies." />
          </div>
        </div>
      </Section>

      {/* ===== ADMIN GUIDE ===== */}
      <Section title="Guide: Platform Admin" icon={<Shield size={18} className="text-red-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Daily Operations</h3>
            <Step num={1} title="Review demo requests" desc="Companies requesting demos appear on your dashboard. Click 'Mark Contacted' after reaching out." />
            <Step num={2} title="Create company accounts" desc="After a demo call, create the company user via the Users page. Set role to 'company'." />
            <Step num={3} title="Monitor platform health" desc="Settings page shows live status of database, AI models (Ollama), and auth configuration." />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Oversight</h3>
            <Step num={4} title="Manage users" desc="Search, filter by role, change roles, activate/deactivate accounts. Paginated with 15 per page." />
            <Step num={5} title="View analytics" desc="30-day interview trends, score distribution, users by role, interview type breakdown." />
            <Step num={6} title="Anti-cheat monitoring" desc="View flagged interviews, expand for details. Flags: answer similarity, short answers, repeated patterns." />
          </div>
        </div>
      </Section>

      {/* ===== INTERVIEW TYPES ===== */}
      <Section title="Interview Types" icon={<Brain size={18} className="text-emerald-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { type: 'HR Interview', desc: 'Behavioral and situational questions. Tests teamwork, conflict resolution, leadership, communication skills.', color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { type: 'Domain Skills', desc: 'Field-specific knowledge. Adapts to the candidate\'s industry — IT, healthcare, education, finance, hospitality, etc.', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
            { type: 'Behavioral', desc: 'STAR method questions. Tests past experiences, decision-making, working under pressure, initiative.', color: 'bg-orange-50 border-orange-200 text-orange-800' },
            { type: 'Sales', desc: 'Persuasion and negotiation skills. Tests customer handling, closing techniques, relationship building.', color: 'bg-pink-50 border-pink-200 text-pink-800' },
          ].map((t) => (
            <div key={t.type} className={`rounded-lg p-3 border ${t.color}`}>
              <p className="text-xs font-semibold mb-1">{t.type}</p>
              <p className="text-[10px] opacity-80">{t.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">AI generates questions based on the candidate's target role, industry, and resume. Supports 10+ industry-specific topic pools.</p>
      </Section>

      {/* ===== SCORING ===== */}
      <Section title="How Scoring Works" icon={<Star size={18} className="text-amber-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">4-Dimension Evaluation</h3>
            <p className="text-xs text-gray-600 mb-3">Every answer is scored by AI on 4 dimensions (0-10 each):</p>
            <div className="space-y-2">
              {[
                { dim: 'Communication', desc: 'Clarity, articulation, and how well the response is expressed' },
                { dim: 'Domain Knowledge', desc: 'Correctness, relevance, and depth of the content' },
                { dim: 'Confidence', desc: 'Conviction, self-assurance demonstrated in the answer' },
                { dim: 'Structure', desc: 'Organization, logical flow, use of frameworks like STAR' },
              ].map((d) => (
                <div key={d.dim} className="flex gap-2 text-xs">
                  <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div><span className="font-medium text-gray-800">{d.dim}</span> — <span className="text-gray-500">{d.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Score Scale</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { range: '8-10', label: 'Excellent', color: 'bg-green-100 text-green-700' },
                { range: '6-7', label: 'Good', color: 'bg-blue-100 text-blue-700' },
                { range: '4-5', label: 'Below Average', color: 'bg-yellow-100 text-yellow-700' },
                { range: '0-3', label: 'Needs Improvement', color: 'bg-red-100 text-red-700' },
              ].map((s) => (
                <div key={s.range} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.color}`}>{s.range}</span>
                  <span className="text-gray-600">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-gray-50 rounded-lg p-2 text-[10px] text-gray-500">
              <p><strong>Readiness Score</strong> = average of all 4 dimensions across all evaluated interviews, expressed as a percentage (0-100%).</p>
              <p className="mt-1"><strong>Recommendation:</strong> 60%+ = YES, 50-59% = MAYBE, below 50% = NO</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ===== KEY CONCEPTS ===== */}
      <Section title="Key Concepts & Glossary" icon={<BookOpen size={18} className="text-gray-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {[
            { term: 'Talent Pool', def: 'All candidates who have granted consent and met visibility requirements. Companies browse this.' },
            { term: 'Candidate Code', def: 'Anonymized identifier like TAL-A1B2C3D4. Companies never see the candidate\'s real name until they connect.' },
            { term: 'Readiness Score', def: 'Percentage (0-100%) indicating how prepared a candidate is for placement, based on AI evaluations.' },
            { term: 'Progressive Unlock', def: 'Difficulty levels unlock based on performance. Must score 5/10 on basic to access intermediate.' },
            { term: 'Domain Skills', def: 'Interview type that tests field-specific knowledge. Questions adapt to the candidate\'s industry.' },
            { term: 'Talexis Meeting Room', def: 'Built-in video/audio room for company interviews. Auto-generated link per schedule.' },
            { term: 'College Approval', def: 'When a company schedules with a college candidate, the placement officer must approve before the interview.' },
            { term: 'Activity Feed', def: 'Shared timeline of events (schedules, approvals, feedback) visible to both company and college.' },
            { term: 'Job Board', def: 'Active job postings from companies. Candidates can browse and apply/express interest.' },
            { term: 'Anti-Cheat', def: 'System that detects answer similarity, repeated patterns, and enforces attempt limits.' },
            { term: 'Consent', def: 'Candidate must explicitly opt-in before their anonymized profile becomes visible to companies.' },
            { term: 'Demo Request', def: 'Companies request a demo via the portal. Admin reviews and creates their account after contact.' },
          ].map((g) => (
            <div key={g.term} className="py-1.5 border-b border-gray-100">
              <span className="font-semibold text-gray-800">{g.term}</span> — <span className="text-gray-500">{g.def}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== FAQ ===== */}
      <Section title="Frequently Asked Questions" icon={<MessageSquare size={18} className="text-blue-600" />}>
        <div className="space-y-3">
          {[
            { q: 'Is Talexis only for IT/tech candidates?', a: 'No. Talexis works for any industry. The AI generates questions based on the candidate\'s target role and industry — healthcare, education, finance, hospitality, manufacturing, and more.' },
            { q: 'Can a candidate retake interviews?', a: 'Yes. Basic difficulty has unlimited attempts. Intermediate allows 10, and Advanced allows 5 per interview type. Scores improve with practice.' },
            { q: 'How does anonymization work?', a: 'Companies see a random code (like TAL-A1B2C3D4), scores, skills, and education — never the candidate\'s name, email, or contact info until they connect directly.' },
            { q: 'What if a candidate is not on the platform?', a: 'Companies can share a registration link. The candidate signs up, takes AI interviews, and once they meet requirements, they appear in the talent pool. No off-platform scheduling.' },
            { q: 'Who approves interview schedules?', a: 'For college candidates: the placement officer. For independent candidates: no approval needed — the interview is confirmed immediately.' },
            { q: 'Can placement officers see company feedback?', a: 'Yes. After each company interview, the star rating, outcome (Hire/Next Round/Reject), and notes are visible on the placement officer\'s dashboard.' },
            { q: 'How do companies get accounts?', a: 'Companies request a demo through the Company Portal. The Talexis admin reviews the request and creates their account after a demo call.' },
            { q: 'Can I export data?', a: 'Yes. Companies can export shortlists and match results as CSV files. The workflow page can be downloaded as PDF.' },
          ].map((faq, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-800 mb-1">{faq.q}</p>
              <p className="text-[10px] text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="text-center text-xs text-gray-400 py-4 print:py-2">
        Talexis Business Guide &middot; Generated from the platform &middot; For internal use
      </div>
    </PageWrapper>
  );
}
