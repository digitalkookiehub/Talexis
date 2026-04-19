import api from './api';
import type { Interview, InterviewQuestion, InterviewAnswer, InterviewType, DifficultyLevel } from '../types';

export interface InterviewHistoryResponse {
  interviews: Interview[];
  total: number;
}

export interface StartInterviewRequest {
  interview_type: InterviewType;
  difficulty_level: DifficultyLevel;
  target_questions: number;
  target_role?: string;
  target_industry?: string;
}

export const interviewService = {
  start: (req: StartInterviewRequest) =>
    api.post<Interview>('/interviews/start', req).then((r) => r.data),

  active: () =>
    api.get<Interview | null>('/interviews/active').then((r) => r.data),

  get: (id: number) =>
    api.get<Interview>(`/interviews/${id}`).then((r) => r.data),

  getQuestions: (id: number) =>
    api.get<InterviewQuestion[]>(`/interviews/${id}/questions`).then((r) => r.data),

  generateQuestion: (id: number) =>
    api.post<InterviewQuestion>(`/interviews/${id}/questions/generate`).then((r) => r.data),

  submitAnswer: (interviewId: number, questionId: number, answer_text: string, response_time_seconds?: number) =>
    api.post<InterviewAnswer>(`/interviews/${interviewId}/answers?question_id=${questionId}`, {
      answer_text,
      response_time_seconds: response_time_seconds ?? null,
    }).then((r) => r.data),

  complete: (id: number) =>
    api.post<Interview>(`/interviews/${id}/complete`).then((r) => r.data),

  abandon: (id: number) => api.delete(`/interviews/${id}`).then((r) => r.data),

  transcribeAudio: (interviewId: number, audioBlob: Blob) => {
    const form = new FormData();
    form.append('file', audioBlob, 'recording.webm');
    return api.post<{ text: string; language: string; duration: number; provider: string }>(
      `/interviews/${interviewId}/transcribe`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then((r) => r.data);
  },

  history: (skip = 0, limit = 20) =>
    api.get<InterviewHistoryResponse>(`/interviews/history?skip=${skip}&limit=${limit}`).then((r) => r.data),
};
