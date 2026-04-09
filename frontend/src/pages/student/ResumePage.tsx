import { useState, useEffect, type ChangeEvent } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { studentService } from '../../services/studentService';
import { FileText, Upload, Brain, Loader2, CheckCircle } from 'lucide-react';

export function ResumePage() {
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
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
    try {
      await studentService.uploadResume(file);
      setResumeUploaded(true);
      setMessage('Resume uploaded successfully!');
    } catch {
      setMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleParse = async () => {
    setParsing(true);
    setMessage('');
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
            <div className="mt-4">
              <GradientButton onClick={() => void handleParse()} disabled={parsing}>
                {parsing ? (
                  <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Parsing with AI...</span>
                ) : (
                  <span className="flex items-center gap-2"><Brain size={16} /> Parse with AI</span>
                )}
              </GradientButton>
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
            <div className="space-y-3 text-sm">
              {Object.entries(parsedData).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="ml-2 text-gray-600">
                    {Array.isArray(value) ? (value as string[]).join(', ') : String(value ?? 'N/A')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Upload and parse your resume to see extracted data here.</p>
          )}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
