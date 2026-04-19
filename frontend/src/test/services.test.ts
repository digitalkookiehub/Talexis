import { describe, it, expect } from 'vitest';

describe('Service modules exist and export correctly', () => {
  it('interviewService has all methods', async () => {
    const { interviewService } = await import('../services/interviewService');
    expect(interviewService.start).toBeDefined();
    expect(interviewService.active).toBeDefined();
    expect(interviewService.get).toBeDefined();
    expect(interviewService.getQuestions).toBeDefined();
    expect(interviewService.generateQuestion).toBeDefined();
    expect(interviewService.submitAnswer).toBeDefined();
    expect(interviewService.complete).toBeDefined();
    expect(interviewService.abandon).toBeDefined();
    expect(interviewService.transcribeAudio).toBeDefined();
    expect(interviewService.history).toBeDefined();
  });

  it('evaluationService has all methods', async () => {
    const { evaluationService } = await import('../services/evaluationService');
    expect(evaluationService.evaluate).toBeDefined();
    expect(evaluationService.getResults).toBeDefined();
    expect(evaluationService.getScorecard).toBeDefined();
    expect(evaluationService.getDetailedFeedback).toBeDefined();
  });

  it('studentService has all methods', async () => {
    const { studentService } = await import('../services/studentService');
    expect(studentService.getProfile).toBeDefined();
    expect(studentService.createProfile).toBeDefined();
    expect(studentService.updateProfile).toBeDefined();
    expect(studentService.uploadResume).toBeDefined();
    expect(studentService.parseResume).toBeDefined();
    expect(studentService.screenResume).toBeDefined();
    expect(studentService.uploadProfilePicture).toBeDefined();
    expect(studentService.getInterviewSuggestions).toBeDefined();
    expect(studentService.getDashboard).toBeDefined();
  });

  it('talentService has all methods', async () => {
    const { talentService } = await import('../services/talentService');
    expect(talentService.browse).toBeDefined();
    expect(talentService.getByCode).toBeDefined();
    expect(talentService.getDetail).toBeDefined();
    expect(talentService.shortlist).toBeDefined();
    expect(talentService.removeFromShortlist).toBeDefined();
    expect(talentService.getShortlist).toBeDefined();
    expect(talentService.updateShortlistStatus).toBeDefined();
    expect(talentService.updateShortlistNotes).toBeDefined();
    expect(talentService.getConsentStatus).toBeDefined();
    expect(talentService.getReadinessRequirements).toBeDefined();
    expect(talentService.updateConsent).toBeDefined();
  });

  it('scheduleService has all methods', async () => {
    const { scheduleService } = await import('../services/scheduleService');
    expect(scheduleService.create).toBeDefined();
    expect(scheduleService.list).toBeDefined();
    expect(scheduleService.update).toBeDefined();
    expect(scheduleService.cancel).toBeDefined();
    expect(scheduleService.complete).toBeDefined();
    expect(scheduleService.submitFeedback).toBeDefined();
  });

  it('companyService has all methods', async () => {
    const { companyService } = await import('../services/companyService');
    expect(companyService.getProfile).toBeDefined();
    expect(companyService.createProfile).toBeDefined();
    expect(companyService.updateProfile).toBeDefined();
    expect(companyService.uploadLogo).toBeDefined();
    expect(companyService.createJob).toBeDefined();
    expect(companyService.listJobs).toBeDefined();
    expect(companyService.updateJob).toBeDefined();
    expect(companyService.deleteJob).toBeDefined();
    expect(companyService.runMatching).toBeDefined();
  });

  it('collegeService has all methods', async () => {
    const { collegeService } = await import('../services/collegeService');
    expect(collegeService.getProfile).toBeDefined();
    expect(collegeService.updateProfile).toBeDefined();
    expect(collegeService.getStudents).toBeDefined();
    expect(collegeService.getAnalytics).toBeDefined();
    expect(collegeService.getPlacements).toBeDefined();
    expect(collegeService.getSchedules).toBeDefined();
    expect(collegeService.getRecommendations).toBeDefined();
    expect(collegeService.getActivity).toBeDefined();
  });

  it('adminService has all methods', async () => {
    const { adminService } = await import('../services/adminService');
    expect(adminService.listUsers).toBeDefined();
    expect(adminService.updateUser).toBeDefined();
    expect(adminService.deactivateUser).toBeDefined();
    expect(adminService.getStats).toBeDefined();
    expect(adminService.getAnalytics).toBeDefined();
  });
});
