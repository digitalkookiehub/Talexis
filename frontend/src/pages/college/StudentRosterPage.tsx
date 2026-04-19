import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { collegeService, type CollegeStudent } from '../../services/collegeService';
import api from '../../services/api';
import { Users, Loader2, Search, Brain, FileText, Eye, CheckCircle, Plus, X, Upload, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCsv } from '../../utils/csvExport';

const recColors: Record<string, string> = {
  yes: 'bg-green-100 text-green-700',
  maybe: 'bg-yellow-100 text-yellow-700',
  no: 'bg-red-100 text-red-700',
};

export function StudentRosterPage() {
  const [students, setStudents] = useState<CollegeStudent[]>([]);
  const [collegeName, setCollegeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newYear, setNewYear] = useState('');
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [csvRows, setCsvRows] = useState<Array<{ full_name: string; email: string; password: string; branch: string; department: string; graduation_year: string }>>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  useEffect(() => {
    collegeService.getStudents(0, 200).then((data) => {
      setStudents(data.students);
      setCollegeName(data.college_name);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const branches = useMemo(() => {
    const set = new Set(students.map((s) => s.branch || 'Unknown'));
    return ['all', ...Array.from(set).sort()];
  }, [students]);

  const filtered = useMemo(() => {
    let result = students;
    if (branchFilter !== 'all') {
      result = result.filter((s) => (s.branch || 'Unknown') === branchFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.branch ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [students, branchFilter, search]);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg"><Users className="text-emerald-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Candidate Roster</h1>
          <p className="text-gray-500 text-sm">{collegeName} &middot; {students.length} candidates</p>
          </div>
        </div>
        <GradientButton size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X size={16} /> : <span className="flex items-center gap-1"><Plus size={16} /> Add Candidate</span>}
        </GradientButton>
      </div>

      {/* Create student form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="bg-white border-gray-100 mb-6">
              {/* Tab toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button onClick={() => setAddMode('single')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${addMode === 'single' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                  Single Candidate
                </button>
                <button onClick={() => setAddMode('bulk')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${addMode === 'bulk' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                  Bulk Import (CSV)
                </button>
              </div>

              {addMode === 'single' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <AnimatedInput label="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Candidate name" required />
                    <AnimatedInput label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="student@email.com" required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <AnimatedInput label="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" required />
                    <AnimatedInput label="Branch" value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Computer Science" />
                    <AnimatedInput label="Graduation Year" type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="2025" />
                  </div>
                  {createMsg && <p className={`text-sm ${createMsg.includes('created') || createMsg.includes('Created') ? 'text-green-600' : 'text-red-500'}`}>{createMsg}</p>}
                  <GradientButton
                    disabled={creating || !newName || !newEmail || !newPassword}
                    onClick={async () => {
                      setCreating(true); setCreateMsg('');
                      try {
                        const r = await api.post('/college/students/create', {
                          email: newEmail, password: newPassword, full_name: newName,
                          branch: newBranch || undefined, graduation_year: newYear ? parseInt(newYear) : undefined,
                        });
                        setCreateMsg((r.data as { message: string }).message);
                        setNewEmail(''); setNewPassword(''); setNewName(''); setNewBranch(''); setNewYear('');
                        const data = await collegeService.getStudents(0, 200);
                        setStudents(data.students);
                      } catch (err: unknown) {
                        const axErr = err as { response?: { data?: { detail?: string } } };
                        setCreateMsg(axErr.response?.data?.detail || 'Failed to create student');
                      } finally { setCreating(false); }
                    }}
                  >
                    {creating ? <Loader2 className="animate-spin" size={16} /> : 'Create Candidate Account'}
                  </GradientButton>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Template download */}
                  <div className="flex items-center justify-between bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Download CSV Template</p>
                      <p className="text-[10px] text-emerald-600">Fill in student details and upload. Columns: full_name, email, password, branch, department, graduation_year</p>
                    </div>
                    <button
                      onClick={() => {
                        downloadCsv('student_import_template.csv',
                          ['full_name', 'email', 'password', 'branch', 'department', 'graduation_year'],
                          [
                            ['Arjun Kumar', 'arjun@college.edu', 'pass1234', 'Computer Science', 'Engineering', '2025'],
                            ['Priya Sharma', 'priya@college.edu', 'pass1234', 'Information Technology', 'Engineering', '2025'],
                          ],
                        );
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 shrink-0"
                    >
                      <Download size={14} /> Template
                    </button>
                  </div>

                  {/* CSV Upload */}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-emerald-400 transition-colors">
                    <Upload className="text-gray-400 mb-2" size={24} />
                    <span className="text-sm text-gray-600">{csvRows.length > 0 ? `${csvRows.length} students ready to import` : 'Click to upload CSV file'}</span>
                    <span className="text-[10px] text-gray-400 mt-1">CSV with headers: full_name, email, password, branch, department, graduation_year</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            let text = ev.target?.result as string;
                            // Remove BOM if present
                            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
                            // Normalize line endings
                            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                            const lines = text.trim().split('\n').filter((l) => l.trim());
                            if (lines.length < 2) {
                              setBulkResult({ created: 0, skipped: 0, errors: ['CSV must have a header row and at least one data row'] });
                              return;
                            }
                            const rawHeaders = (lines[0] ?? '').split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());

                            // Map common column name variations to our expected fields
                            const columnMap: Record<string, string> = {
                              'full_name': 'full_name', 'name': 'full_name', 'student_name': 'full_name', 'candidate_name': 'full_name',
                              'email': 'email', 'email_id': 'email', 'email_address': 'email', 'mail': 'email',
                              'password': 'password', 'pass': 'password',
                              'branch': 'branch', 'course': 'branch', 'program': 'branch', 'stream': 'branch', 'specialization': 'branch',
                              'department': 'department', 'dept': 'department',
                              'graduation_year': 'graduation_year', 'year': 'graduation_year', 'grad_year': 'graduation_year',
                              'enrollment_year': 'graduation_year', 'batch': 'graduation_year', 'passing_year': 'graduation_year',
                              'phone': '_phone', 'mobile': '_phone', 'contact': '_phone',
                              'city': '_city', 'location': '_city',
                              'student_id': '_student_id', 'roll_no': '_student_id', 'reg_no': '_student_id',
                            };

                            const headers = rawHeaders.map((h) => columnMap[h] || h);

                            // Validate required mapped headers
                            if (!headers.includes('full_name') || !headers.includes('email')) {
                              setBulkResult({ created: 0, skipped: 0, errors: [
                                'Could not find required columns. Need a "name" and "email" column. Found: ' + rawHeaders.join(', '),
                              ] });
                              return;
                            }

                            const rows = lines.slice(1).map((line) => {
                              const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''));
                              const row: Record<string, string> = {};
                              headers.forEach((h, i) => { row[h] = vals[i] || ''; });
                              return row as { full_name: string; email: string; password: string; branch: string; department: string; graduation_year: string };
                            }).filter((r) => r.email && r.full_name);
                            setCsvRows(rows);
                            setBulkResult(null);
                            if (rows.length === 0) {
                              setBulkResult({ created: 0, skipped: 0, errors: ['No valid rows found. Each row needs at least full_name and email.'] });
                            }
                          } catch {
                            setBulkResult({ created: 0, skipped: 0, errors: ['Failed to parse CSV file'] });
                          }
                        };
                        reader.readAsText(file);
                        // Reset file input so same file can be re-uploaded
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {/* Preview table */}
                  {csvRows.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium text-gray-500">Name</th>
                            <th className="text-left px-2 py-1.5 font-medium text-gray-500">Email</th>
                            <th className="text-left px-2 py-1.5 font-medium text-gray-500">Branch</th>
                            <th className="text-left px-2 py-1.5 font-medium text-gray-500">Year</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {csvRows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-2 py-1.5 text-gray-800">{row.full_name}</td>
                              <td className="px-2 py-1.5 text-gray-600">{row.email}</td>
                              <td className="px-2 py-1.5 text-gray-600">{row.branch}</td>
                              <td className="px-2 py-1.5 text-gray-600">{row.graduation_year}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Bulk result */}
                  {bulkResult && (
                    <div className={`p-3 rounded-lg text-sm ${bulkResult.created > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className="font-medium">{bulkResult.created} created, {bulkResult.skipped} skipped out of {bulkResult.created + bulkResult.skipped}</p>
                      {bulkResult.errors.length > 0 && (
                        <ul className="mt-1 text-xs text-red-600 space-y-0.5">
                          {bulkResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                          {bulkResult.errors.length > 5 && <li>...and {bulkResult.errors.length - 5} more</li>}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Import button */}
                  <GradientButton
                    disabled={bulkUploading || csvRows.length === 0}
                    onClick={async () => {
                      setBulkUploading(true); setBulkResult(null);
                      try {
                        const payload = csvRows.map((r) => ({
                          full_name: r.full_name, email: r.email, password: r.password || 'Welcome@123',
                          branch: r.branch || null, department: r.department || null,
                          graduation_year: r.graduation_year ? parseInt(r.graduation_year) : null,
                        }));
                        const res = await api.post('/college/students/bulk-import', payload);
                        setBulkResult(res.data as { created: number; skipped: number; errors: string[] });
                        if ((res.data as { created: number }).created > 0) {
                          const data = await collegeService.getStudents(0, 200);
                          setStudents(data.students);
                          setCsvRows([]);
                        }
                      } catch { setBulkResult({ created: 0, skipped: csvRows.length, errors: ['Upload failed'] }); }
                      finally { setBulkUploading(false); }
                    }}
                  >
                    {bulkUploading ? (
                      <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Importing...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Upload size={16} /> Import {csvRows.length} Students</span>
                    )}
                  </GradientButton>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or branch..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {branches.map((b) => (
            <button
              key={b}
              onClick={() => setBranchFilter(b)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                branchFilter === b ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b === 'all' ? 'All Branches' : b}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Users className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">
            {students.length === 0 ? 'No candidates registered from this college yet.' : 'No candidates match your search.'}
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="bg-white border-gray-100 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Interviews</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Readiness</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{s.name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{s.branch ?? '—'}</span>
                      {s.graduation_year && <span className="text-xs text-gray-400 ml-1">({s.graduation_year})</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Brain size={12} className="text-blue-500" />
                        <span className="text-sm font-medium">{s.evaluated_interviews}/{s.total_interviews}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.readiness_percent != null ? (
                        <div>
                          <span className="text-sm font-bold text-gray-900">{s.readiness_percent.toFixed(0)}%</span>
                          {s.recommendation && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${recColors[s.recommendation] ?? 'bg-gray-100'}`}>
                              {s.recommendation.toUpperCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {s.resume_uploaded && (
                          <span title="Resume uploaded" className="text-green-500"><FileText size={14} /></span>
                        )}
                        {s.talent_visible && (
                          <span title="Visible to companies" className="text-emerald-500"><Eye size={14} /></span>
                        )}
                        {s.evaluated_interviews > 0 && (
                          <span title="Has evaluations" className="text-blue-500"><CheckCircle size={14} /></span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
