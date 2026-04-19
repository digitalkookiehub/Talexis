import { describe, it, expect } from 'vitest';
import type { Interview, InterviewQuestion, InterviewAnswer, AnswerEvaluation, StudentProfile, User } from '../types';

describe('TypeScript types', () => {
  it('Interview type has all required fields', () => {
    const interview: Interview = {
      id: 1,
      student_id: 1,
      interview_type: 'technical',
      difficulty_level: 'basic',
      status: 'in_progress',
      started_at: '2026-01-01T00:00:00Z',
      completed_at: null,
      total_score: null,
      target_questions: 5,
      duration_seconds: null,
      target_role: null,
      target_industry: null,
      overall_summary: null,
      overall_feedback: null,
      questions_answered: 0,
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(interview.id).toBe(1);
    expect(interview.status).toBe('in_progress');
  });

  it('InterviewQuestion type has expected_topics', () => {
    const question: InterviewQuestion = {
      id: 1, interview_id: 1, question_text: 'Test?',
      question_type: 'hr', difficulty: 'basic', order_index: 0,
      expected_topics: ['teamwork'],
    };
    expect(question.expected_topics).toContain('teamwork');
  });

  it('InterviewAnswer type has word_count and response_time', () => {
    const answer: InterviewAnswer = {
      id: 1, question_id: 1, interview_id: 1,
      answer_text: 'My answer', word_count: 2, response_time_seconds: 30.5,
      submitted_at: '2026-01-01',
    };
    expect(answer.word_count).toBe(2);
    expect(answer.response_time_seconds).toBe(30.5);
  });

  it('AnswerEvaluation has all 4 dimension scores', () => {
    const evaluation: AnswerEvaluation = {
      id: 1, answer_id: 1,
      communication_score: 7, technical_score: 8, confidence_score: 6, structure_score: 7,
      overall_score: 7, feedback_text: 'Good', strengths: ['clear'],
      weaknesses: ['structure'], improved_answer_suggestion: '', risk_flags: [],
    };
    expect(evaluation.communication_score).toBe(7);
    expect(evaluation.strengths).toContain('clear');
  });

  it('User type has all roles', () => {
    const roles: Array<User['role']> = ['student', 'company', 'college_admin', 'admin'];
    expect(roles).toHaveLength(4);
  });

  it('Interview types are correct', () => {
    const types: Array<Interview['interview_type']> = ['hr', 'technical', 'behavioral', 'sales'];
    expect(types).toHaveLength(4);
  });

  it('Difficulty levels are correct', () => {
    const levels: Array<Interview['difficulty_level']> = ['basic', 'intermediate', 'advanced'];
    expect(levels).toHaveLength(3);
  });
});
