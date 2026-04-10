import { useState, useEffect, type ChangeEvent } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { studentService, type ResumeScreening } from '../../services/studentService';
import { FileText, Upload, Brain, Loader2, CheckCircle, Sparkles, AlertTriangle, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export function ResumePage() {
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [screening, setScreening] = useState<ResumeScreening | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    studentService.getParsedResume().then((data) => {
      if (data.parsed_resume) {
        setParsedData(data.parsed_resume);
        setResumeUploaded(true);
      }
    }).catch(() => {});
  }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage('');
    setParsedData(null); // Clear stale parsed data from previous resume
    try {
      await studentService.uploadResume(file);
      setResumeUploaded(true);
      setMessage('Resume uploaded successfully! Click "Parse with AI" to extract data.');
    } catch {
      setMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleParse = async () => {
    setParsing(true);
    setMessage('');
    setParsedData(null);
    setScreening(null); // Clear screening too
    try {
      const result = await studentService.parseResume();
      setParsedData(result.data);
      setMessage('Resume parsed successfully!');
    } catch {
      setMessage('Parsing failed. Make sure Ollama is running.');
    } finally {
      setParsing(false);
    }
  };

  const handleScreen = async () => {
    setScreeningLoading(true);
    setMessage('');
    try {
      const result = await studentService.screenResume();
      setScreening(result);
      if (result.error) {
        setMessage(`Screening: ${result.error}`);
      }
    } catch {
      setMessage('Screening failed. Parse the resume first.');
    } finally {
      setScreeningLoading(false);
    }
  };

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileText className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume Manager</h1>
          <p className="text-gray-500 text-sm">Upload and parse your resume with AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Upload Resume</h2>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-purple-400 transition-colors">
            {uploading ? (
              <Loader2 className="animate-spin text-purple-500 mb-2" size={32} />
            ) : resumeUploaded ? (
              <CheckCircle className="text-green-500 mb-2" size={32} />
            ) : (
              <Upload className="text-gray-400 mb-2" size={32} />
            )}
            <span className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : resumeUploaded ? 'Resume uploaded! Click to replace.' : 'Click to upload PDF'}
            </span>
            <input type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={(e) => void handleUpload(e)} />
          </label>

          {resumeUploaded && (
            <div className="mt-4 flex gap-2 flex-wrap">
              <GradientButton onClick={() => void handleParse()} disabled={parsing}>
                {parsing ? (
                  <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Parsing...</span>
                ) : (
                  <span className="flex items-center gap-2"><Brain size={16} /> Parse with AI</span>
                )}
              </GradientButton>
              {parsedData && !parsedData.error ? (
                <GradientButton variant="secondary" onClick={() => void handleScreen()} disabled={screeningLoading}>
                  {screeningLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Screening...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Sparkles size={16} /> Screen & Score</span>
                  )}
                </GradientButton>
              ) : null}
            </div>
          )}

          {message && (
            <p className={`text-sm mt-3 ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}
        </GlassCard>

        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Parsed Data</h2>
          {parsedData ? (
            <div className="space-y-4 text-sm max-h-[600px] overflow-y-auto">
              <ParsedDataView data={parsedData} />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Upload and parse your resume to see extracted data here.</p>
          )}
        </GlassCard>
      </div>

      {/* Screening Report */}
      {screening && !screening.error && (
        <div className="mt-6">
          <ScreeningReport screening={screening} />
        </div>
      )}

      {screening?.error && (
        <GlassCard className="mt-6 bg-red-50 border-red-200">
          <p className="text-red-600 text-sm">{screening.error}</p>
        </GlassCard>
      )}
    </PageWrapper>
  );
}

function ScreeningReport({ screening }: { screening: ResumeScreening }) {
  const score = screening.overall_score ?? 0;
  const scoreColor = score >= 8 ? 'text-green-600' : score >= 6 ? 'text-yellow-600' : 'text-red-500';
  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <GlassCard className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-600 font-medium">Resume Score</p>
            <p className={`text-5xl font-bold ${scoreColor}`}>{score.toFixed(1)}<span className="text-lg text-gray-400">/10</span></p>
            {screening.summary && <p className="text-sm text-gray-600 mt-2 max-w-2xl">{screening.summary}</p>}
          </div>
          <Sparkles className="text-purple-400" size={48} />
        </div>
      </GlassCard>

      {/* Category scores */}
      {screening.category_scores && (
        <GlassCard className="bg-white border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Score Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(screening.category_scores).map(([key, val], i) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-bold">{val.toFixed(1)}/10</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <motion.div
                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(val / 10) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {screening.strengths && screening.strengths.length > 0 && (
          <GlassCard className="bg-green-50 border-green-200">
            <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
              <TrendingUp size={16} /> Strengths
            </h3>
            <ul className="space-y-1 text-sm text-gray-700">
              {screening.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-green-500">✓</span>{s}</li>)}
            </ul>
          </GlassCard>
        )}
        {screening.weaknesses && screening.weaknesses.length > 0 && (
          <GlassCard className="bg-red-50 border-red-200">
            <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
              <TrendingDown size={16} /> Weaknesses
            </h3>
            <ul className="space-y-1 text-sm text-gray-700">
              {screening.weaknesses.map((w, i) => <li key={i} className="flex gap-2"><span className="text-red-500">!</span>{w}</li>)}
            </ul>
          </GlassCard>
        )}
      </div>

      {/* Suggestions */}
      {screening.suggestions && screening.suggestions.length > 0 && (
        <GlassCard className="bg-white border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Lightbulb size={18} className="text-yellow-500" /> Suggestions to Improve
          </h3>
          <div className="space-y-3">
            {screening.suggestions.map((sug, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 bg-gray-50 rounded-lg border-l-4 border-purple-500"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-purple-600 capitalize">{sug.section}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[sug.priority] ?? ''}`}>
                    {sug.priority} priority
                  </span>
                </div>
                <p className="text-sm text-gray-700">{sug.suggestion}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Missing Sections */}
      {screening.missing_sections && screening.missing_sections.length > 0 && (
        <GlassCard className="bg-yellow-50 border-yellow-200">
          <h3 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-1">
            <AlertTriangle size={16} /> Missing Sections
          </h3>
          <div className="flex gap-2 flex-wrap">
            {screening.missing_sections.map((sec, i) => (
              <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs capitalize">
                {sec}
              </span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value as object).length === 0) return true;
  return false;
}

function ParsedDataView({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">{String(data.error)}</p>
        {data.raw_text_preview ? (
          <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {String(data.raw_text_preview)}
          </pre>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => {
        if (isEmpty(value)) return null;
        return (
          <div key={key} className="border-b border-gray-100 pb-3 last:border-0">
            <p className="font-semibold text-purple-600 text-xs uppercase tracking-wider mb-2">{formatKey(key)}</p>
            <RenderValue value={value} />
          </div>
        );
      })}
    </div>
  );
}

function RenderValue({ value }: { value: unknown }) {
  // Primitive
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">N/A</span>;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <p className="text-gray-700">{String(value)}</p>;
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400 italic">None</span>;

    // Array of strings → tags
    if (value.every((v) => typeof v === 'string')) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {(value as string[]).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
              {tag}
            </span>
          ))}
        </div>
      );
    }

    // Array of objects → cards
    return (
      <div className="space-y-2">
        {value.map((item, i) => {
          if (typeof item === 'object' && item !== null) {
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-1">
                {Object.entries(item as Record<string, unknown>).map(([k, v]) => {
                  if (isEmpty(v)) return null;
                  return (
                    <div key={k} className="text-xs">
                      <span className="font-medium text-gray-600">{formatKey(k)}: </span>
                      {Array.isArray(v) ? (
                        <span className="text-gray-700">{(v as unknown[]).join(', ')}</span>
                      ) : (
                        <span className="text-gray-700">{String(v)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }
          return <p key={i} className="text-gray-700 text-xs">{String(item)}</p>;
        })}
      </div>
    );
  }

  // Object
  if (typeof value === 'object') {
    return (
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => {
          if (isEmpty(v)) return null;
          return (
            <div key={k} className="text-xs">
              <span className="font-medium text-gray-600">{formatKey(k)}: </span>
              <span className="text-gray-700">{String(v)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="text-gray-700">{String(value)}</span>;
}
