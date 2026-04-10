import api from './api';
import type { Interview, InterviewQuestion, InterviewAnswer, InterviewType, DifficultyLevel } from '../types';

export interface InterviewHistoryResponse {
  interviews: Interview[];
  total: number;
}

export const interviewService = {
  start: (interview_type: InterviewType, difficulty_level: DifficultyLevel, target_questions = 5) =>
    api.post<Interview>('/interviews/start', { interview_type, difficulty_level, target_questions }).then((r) => r.data),

  active: () =>
    api.get<Interview | null>('/interviews/active').then((r) => r.data),

  get: (id: number) =>
    api.get<Interview>(`/interviews/${id}`).then((r) => r.data),

  getQuestions: (id: number) =>
    api.get<InterviewQuestion[]>(`/interviews/${id}/questions`).then((r) => r.data),

  generateQuestion: (id: number) =>
    api.post<InterviewQuestion>(`/interviews/${id}/questions/generate`).then((r) => r.data),

  submitAnswer: (interviewId: number, questionId: number, answer_text: string) =>
    api.post<InterviewAnswer>(`/interviews/${interviewId}/answers?question_id=${questionId}`, { answer_text }).then((r) => r.data),

  complete: (id: number) =>
    api.post<Interview>(`/interviews/${id}/complete`).then((r) => r.data),

  history: (skip = 0, limit = 20) =>
    api.get<InterviewHistoryResponse>(`/interviews/history?skip=${skip}&limit=${limit}`).then((r) => r.data),
};
