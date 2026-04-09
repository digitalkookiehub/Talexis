# INITIAL.md - Talexis Product Definition

> AI-powered talent intelligence platform that trains students, evaluates their real-world interview performance, and connects companies with pre-qualified candidates—eliminating the need for traditional first-round interviews.

---

## PRODUCT

### Name
Talexis

### Description
Talexis is a two-sided AI-powered Interview & Placement Intelligence Platform using a hybrid LLM architecture (local + cloud). On the college side, it trains students from scratch, conducts AI mock interviews, evaluates and tracks progress, and generates placement readiness scores. On the company side, it provides access to pre-evaluated candidates with structured scorecards, enabling shortlisting without first-round interviews.

### Target User
- **Colleges:** Training & placement departments, career counselors
- **Students:** Undergraduate and graduate students preparing for placements
- **Companies:** Small & mid-sized companies looking for pre-qualified candidates

### Type
- [x] SaaS (Software as a Service)

---

## TECH STACK

### Backend
- [x] FastAPI + Python 3.11+

### Frontend
- [x] React + Vite + TypeScript

### Database
- [x] PostgreSQL + SQLAlchemy

### Authentication
- [x] Email/Password (JWT-based)

### UI Framework
- [x] Tailwind CSS + shadcn/ui

### AI / LLM
- [x] Local LLM via Ollama (Llama 3 / Mistral) — question generation, resume parsing, preprocessing
- [x] Cloud LLM via OpenAI GPT-4o / Azure OpenAI — evaluation, scoring, feedback
- [x] Whisper — speech-to-text conversion

### Payments
- [ ] No payments for MVP (add later)

---

## HYBRID AI ARCHITECTURE

### Local LLM Layer (Cost Optimization)
- **Runtime:** Ollama (Llama 3 / Mistral)
- **Responsibilities:**
  - Resume parsing → structured JSON
  - Interview question generation
  - Basic practice interview flow
  - Answer preprocessing before cloud evaluation

### Cloud LLM Layer (Accuracy & Trust)
- **Runtime:** OpenAI GPT-4o / Azure OpenAI
- **Responsibilities:**
  - Answer evaluation (0–10 scale)
  - Detailed feedback generation
  - Hiring recommendation (YES / MAYBE / NO)
  - Confidence scoring

### Confidence Layer
- Run evaluation twice (optional)
- Check score variance
- Flag inconsistent results for re-evaluation

---

## MODULES

### Module 1: Authentication (Required)

**Description:** User authentication and authorization with role-based access control (Student, College Admin, Company, Platform Admin).

**Models:**
- User: id, email, hashed_password, full_name, role (student/college_admin/company/admin), is_active, is_verified, created_at, updated_at
- RefreshToken: id, user_id, token, expires_at, revoked

**API Endpoints:**
- POST /api/v1/auth/register — Create new account (with role selection)
- POST /api/v1/auth/login — Login with email/password
- POST /api/v1/auth/refresh — Refresh access token
- POST /api/v1/auth/logout — Revoke refresh token
- GET /api/v1/auth/me — Get current user profile
- PUT /api/v1/auth/me — Update profile
- POST /api/v1/auth/forgot-password — Request password reset
- POST /api/v1/auth/reset-password — Reset password with token
- POST /api/v1/auth/verify-email — Verify email address

**Frontend Pages:**
- /login — Login page
- /register — Registration page (with role selection)
- /forgot-password — Forgot password page
- /verify-email — Email verification page
- /profile — User profile page (protected)

---

### Module 2: Student Profile & Resume

**Description:** Student profile creation, resume upload with AI-powered parsing, skill assessment, and baseline evaluation.

**Models:**
- StudentProfile: id, user_id, branch, department, college_name, graduation_year, skills (JSON), interests (JSON), bio, profile_picture_url, resume_url, parsed_resume (JSON), baseline_score, created_at, updated_at
- SkillAssessment: id, student_id, skill_name, score, assessed_at, assessment_type

**API Endpoints:**
- POST /api/v1/students/profile — Create student profile
- GET /api/v1/students/profile — Get own profile
- PUT /api/v1/students/profile — Update profile
- POST /api/v1/students/resume/upload — Upload resume (file upload)
- POST /api/v1/students/resume/parse — Parse resume with local LLM
- GET /api/v1/students/resume/parsed — Get parsed resume data
- POST /api/v1/students/skills/assess — Run baseline skill assessment
- GET /api/v1/students/skills — Get skill scores
- GET /api/v1/students/dashboard — Student dashboard data

**Frontend Pages:**
- /student/onboarding — Profile creation wizard
- /student/profile — View/edit profile
- /student/resume — Resume upload & parsed view
- /student/skills — Skill assessment & scores
- /student/dashboard — Student dashboard (progress, scores, recommendations)

---

### Module 3: AI Interview Engine

**Description:** AI-powered mock interview system with role-based interviews (HR, Technical, Sales, Behavioral), dynamic question generation via local LLM, multi-level difficulty, and text/voice input support.

**Models:**
- Interview: id, student_id, interview_type (hr/technical/sales/behavioral), difficulty_level (basic/intermediate/advanced), status (pending/in_progress/completed/evaluated), started_at, completed_at, total_score, created_at
- InterviewQuestion: id, interview_id, question_text, question_type, difficulty, order_index, expected_topics (JSON), created_at
- InterviewAnswer: id, question_id, interview_id, answer_text, audio_url, transcribed_text, submitted_at
- InterviewAttempt: id, student_id, interview_type, attempt_number, max_attempts, created_at

**API Endpoints:**
- POST /api/v1/interviews/start — Start a new interview session
- GET /api/v1/interviews/{id} — Get interview details
- GET /api/v1/interviews/{id}/questions — Get questions for interview
- POST /api/v1/interviews/{id}/questions/generate — Generate next question (local LLM)
- POST /api/v1/interviews/{id}/answers — Submit answer (text)
- POST /api/v1/interviews/{id}/answers/audio — Submit audio answer
- POST /api/v1/interviews/{id}/answers/{answer_id}/transcribe — Transcribe audio (Whisper)
- POST /api/v1/interviews/{id}/complete — Mark interview as completed
- GET /api/v1/interviews/history — List past interviews
- GET /api/v1/interviews/attempts — Get attempt counts

**Frontend Pages:**
- /student/interviews — Interview selection page (choose type & difficulty)
- /student/interviews/{id} — Live interview interface
- /student/interviews/{id}/review — Review completed interview
- /student/interviews/history — Interview history list

---

### Module 4: Evaluation Engine

**Description:** Cloud LLM-powered evaluation system that scores answers (0–10), analyzes communication clarity, technical accuracy, confidence, and answer structure. Generates detailed feedback and risk flags.

**Models:**
- AnswerEvaluation: id, answer_id, interview_id, communication_score, technical_score, confidence_score, structure_score, overall_score, feedback_text, risk_flags (JSON), strengths (JSON), weaknesses (JSON), improved_answer_suggestion, evaluated_at
- EvaluationRun: id, interview_id, run_number, variance_score, is_consistent, evaluated_at

**API Endpoints:**
- POST /api/v1/evaluations/evaluate/{interview_id} — Evaluate all answers in an interview (cloud LLM)
- GET /api/v1/evaluations/{interview_id} — Get evaluation results
- GET /api/v1/evaluations/{interview_id}/feedback — Get detailed feedback per answer
- POST /api/v1/evaluations/{interview_id}/re-evaluate — Re-evaluate for consistency check
- GET /api/v1/evaluations/{interview_id}/scorecard — Get structured scorecard

**Frontend Pages:**
- /student/interviews/{id}/results — Evaluation results & scores
- /student/interviews/{id}/feedback — Detailed feedback per question
- /student/scorecard — Overall scorecard across all interviews

---

### Module 5: Placement Readiness System

**Description:** Aggregates scores across all interviews and assessments to generate a placement readiness percentage, identify weak areas, and track improvement over time.

**Models:**
- PlacementReadiness: id, student_id, overall_readiness_percent, communication_avg, technical_avg, confidence_avg, structure_avg, weak_areas (JSON), strong_areas (JSON), recommendation (YES/MAYBE/NO), last_calculated_at
- ReadinessHistory: id, student_id, readiness_percent, calculated_at

**API Endpoints:**
- GET /api/v1/readiness/{student_id} — Get placement readiness score
- POST /api/v1/readiness/calculate — Recalculate readiness for current student
- GET /api/v1/readiness/history — Get readiness history (trend)
- GET /api/v1/readiness/weak-areas — Get weak areas with recommendations

**Frontend Pages:**
- /student/readiness — Readiness dashboard with progress chart
- /student/readiness/areas — Detailed weak/strong area breakdown

---

### Module 6: Talent Profile (Company View)

**Description:** Anonymized, structured candidate profiles for companies. Shows skill scores, role fit, recommendation, and risk indicators—never raw interview data.

**Models:**
- TalentProfile: id, student_id, candidate_code (anonymized), is_visible, consent_given, consent_date, skill_scores (JSON), role_fit_scores (JSON), recommendation (YES/MAYBE/NO), risk_indicators (JSON), last_updated
- CompanyShortlist: id, company_id, talent_profile_id, shortlisted_at, notes, status (shortlisted/contacted/rejected/hired)

**API Endpoints:**
- GET /api/v1/talents — List talent profiles (company access, paginated, filterable)
- GET /api/v1/talents/{candidate_code} — Get talent profile by anonymized code
- POST /api/v1/talents/{candidate_code}/shortlist — Add to company shortlist
- DELETE /api/v1/talents/{candidate_code}/shortlist — Remove from shortlist
- GET /api/v1/talents/shortlist — Get company's shortlist
- PUT /api/v1/talents/shortlist/{id}/status — Update shortlist status
- POST /api/v1/students/consent — Student grants consent to share profile
- DELETE /api/v1/students/consent — Student revokes consent

**Frontend Pages:**
- /company/talents — Browse pre-qualified candidates (with filters)
- /company/talents/{code} — View anonymized talent scorecard
- /company/shortlist — Manage shortlisted candidates

---

### Module 7: Company Job Portal

**Description:** Companies can post job roles, define requirements, and the matching engine ranks candidates against job criteria.

**Models:**
- Company: id, user_id, company_name, industry, size, website, logo_url, description, created_at
- JobRole: id, company_id, title, description, required_skills (JSON), min_readiness_score, interview_types_required (JSON), status (active/closed/draft), created_at, expires_at

**API Endpoints:**
- POST /api/v1/companies/profile — Create company profile
- GET /api/v1/companies/profile — Get company profile
- PUT /api/v1/companies/profile — Update company profile
- POST /api/v1/jobs — Create job role
- GET /api/v1/jobs — List job roles (filterable)
- GET /api/v1/jobs/{id} — Get job role details
- PUT /api/v1/jobs/{id} — Update job role
- DELETE /api/v1/jobs/{id} — Delete job role
- GET /api/v1/jobs/{id}/matches — Get matched candidates for a job

**Frontend Pages:**
- /company/profile — Company profile setup
- /company/jobs — Job roles list
- /company/jobs/new — Create new job role
- /company/jobs/{id} — Job role detail with matched candidates
- /company/dashboard — Company dashboard (hiring funnel stats)

---

### Module 8: Matching Engine

**Description:** Matches candidates with job roles based on scores, skills, and role fit. Ranks candidates by match quality.

**Models:**
- MatchResult: id, job_role_id, talent_profile_id, match_score, skill_match_percent, readiness_match, overall_rank, matched_at

**API Endpoints:**
- POST /api/v1/matching/run/{job_id} — Run matching for a job role
- GET /api/v1/matching/{job_id}/results — Get match results (ranked)
- GET /api/v1/matching/student/{student_id}/jobs — Get matching jobs for a student

**Frontend Pages:**
- (Integrated into /company/jobs/{id} and /student/dashboard)

---

### Module 9: Micro-Learning Module

**Description:** Short lessons and resources for weak areas. Provides targeted learning content based on evaluation feedback.

**Models:**
- LearningModule: id, title, category (hr/technical/communication/behavioral), difficulty, content_text, content_url, duration_minutes, tags (JSON), created_at
- StudentLearningProgress: id, student_id, module_id, status (not_started/in_progress/completed), started_at, completed_at

**API Endpoints:**
- GET /api/v1/learning/modules — List learning modules (filterable by category)
- GET /api/v1/learning/modules/{id} — Get module content
- GET /api/v1/learning/recommended — Get recommended modules based on weak areas
- POST /api/v1/learning/modules/{id}/start — Mark module as started
- POST /api/v1/learning/modules/{id}/complete — Mark module as completed
- GET /api/v1/learning/progress — Get learning progress

**Frontend Pages:**
- /student/learn — Learning hub with recommended modules
- /student/learn/{id} — Module content page
- /student/learn/progress — Learning progress tracker

---

### Module 10: Anti-Cheat System

**Description:** Ensures interview integrity by limiting attempts, randomizing questions, detecting answer similarity, and flagging repeated patterns.

**Models:**
- AntiCheatLog: id, student_id, interview_id, flag_type (similarity/pattern/attempt_limit), severity (low/medium/high), details (JSON), flagged_at
- AnswerSimilarity: id, answer_id_1, answer_id_2, similarity_score, flagged

**API Endpoints:**
- POST /api/v1/anticheat/check/{interview_id} — Run anti-cheat analysis on interview
- GET /api/v1/anticheat/flags/{student_id} — Get anti-cheat flags for a student
- GET /api/v1/anticheat/report — Admin anti-cheat report

**Frontend Pages:**
- /admin/anticheat — Anti-cheat flags dashboard (admin only)

---

### Module 11: Analytics Dashboard

**Description:** Platform-wide analytics for all user roles — student progress, college placement rates, company hiring funnel metrics.

**API Endpoints:**
- GET /api/v1/analytics/student — Student analytics (scores over time, interviews taken)
- GET /api/v1/analytics/college — College analytics (placement rates, avg readiness)
- GET /api/v1/analytics/company — Company analytics (hiring funnel, shortlist conversion)
- GET /api/v1/analytics/platform — Platform-wide stats (admin only)

**Frontend Pages:**
- /student/analytics — Student progress charts
- /college/analytics — College placement analytics
- /company/analytics — Hiring funnel analytics
- /admin/analytics — Platform-wide analytics

---

### Module 12: Admin Panel

**Description:** Platform administration — manage users, view stats, configure system settings, moderate content.

**API Endpoints:**
- GET /api/v1/admin/users — List all users (filterable by role)
- PUT /api/v1/admin/users/{id} — Update user status/role
- DELETE /api/v1/admin/users/{id} — Deactivate user
- GET /api/v1/admin/stats — Platform statistics
- GET /api/v1/admin/interviews/stats — Interview statistics
- GET /api/v1/admin/learning/manage — Manage learning modules
- POST /api/v1/admin/learning/modules — Create learning module
- PUT /api/v1/admin/learning/modules/{id} — Update learning module

**Frontend Pages:**
- /admin — Admin dashboard
- /admin/users — User management
- /admin/interviews — Interview statistics
- /admin/learning — Learning module management
- /admin/settings — System settings

---

## TRUST & SECURITY LAYER

- [x] Student consent required before sharing profile with companies
- [x] Never share raw video/audio with companies
- [x] Store only processed insights and scores
- [x] Role-based access control (Student, College Admin, Company, Platform Admin)
- [x] Rate limiting on auth endpoints
- [x] Input validation on all endpoints
- [x] SQL injection prevention (SQLAlchemy ORM)
- [x] XSS prevention (React + proper sanitization)

---

## MULTI-LANGUAGE SUPPORT

- [x] English (primary)
- [ ] Tamil (post-MVP)
- [ ] Hindi (post-MVP)
- [ ] Evaluate answers in multiple languages (post-MVP)

---

## MVP SCOPE

### Must Have (MVP)
- [x] User registration and login (all roles)
- [x] Student profile creation & resume upload
- [x] Resume parsing with local LLM
- [x] AI mock interview engine (text-based)
- [x] Dynamic question generation (local LLM)
- [x] Answer evaluation & scoring (cloud LLM, 0–10 scale)
- [x] Detailed feedback generation
- [x] Placement readiness score calculation
- [x] Company dashboard with candidate browsing
- [x] Anonymized talent scorecards
- [x] Candidate shortlisting
- [x] Basic admin panel

### Nice to Have (Post-MVP)
- [ ] Voice/audio interview support (Whisper)
- [ ] Job posting & matching engine
- [ ] Micro-learning modules
- [ ] Anti-cheat system
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Payment integration
- [ ] College admin analytics
- [ ] Confidence layer (dual evaluation)
- [ ] Advanced analytics dashboards

---

## ACCEPTANCE CRITERIA

### Authentication
- [ ] User can register with email/password and role selection
- [ ] User can login with email/password
- [ ] JWT tokens work correctly with refresh
- [ ] Protected routes redirect to login
- [ ] Role-based access control enforced on all endpoints
- [ ] Password reset flow works

### Student Profile & Resume
- [ ] Student can create and edit profile
- [ ] Student can upload resume (PDF)
- [ ] Resume is parsed by local LLM into structured JSON
- [ ] Baseline skill assessment runs successfully

### AI Interview Engine
- [ ] Student can start a mock interview (choose type & difficulty)
- [ ] Questions are dynamically generated by local LLM
- [ ] Student can submit text answers
- [ ] Interview can be completed and status updated
- [ ] Attempt limits enforced

### Evaluation Engine
- [ ] Answers are evaluated by cloud LLM
- [ ] Scores generated on 0–10 scale per dimension
- [ ] Detailed, actionable feedback provided
- [ ] Structured scorecard generated

### Placement Readiness
- [ ] Readiness percentage calculated from all interviews
- [ ] Weak areas identified
- [ ] Readiness trend tracked over time

### Company Dashboard
- [ ] Company can browse anonymized talent profiles
- [ ] Company can filter by skills, scores, readiness
- [ ] Company can shortlist candidates
- [ ] Raw interview data never exposed

### Quality
- [ ] All API endpoints documented in OpenAPI
- [ ] Backend test coverage 80%+
- [ ] Frontend TypeScript strict mode passes
- [ ] Docker builds and runs successfully
- [ ] Privacy: no raw data exposed to companies

---

## PROMPT ENGINEERING

### Question Generation (Local LLM)
```
Role: You are an interview question generator for {interview_type} interviews.
Difficulty: {difficulty_level}
Candidate Profile: {parsed_resume_summary}
Previous Questions: {previous_questions}

Generate a single interview question that:
1. Is appropriate for the role and difficulty level
2. Does not repeat previous questions
3. Tests a specific skill or competency
4. Can be answered in 2-3 minutes

Output: Just the question text, nothing else.
```

### Answer Evaluation (Cloud LLM)
```
Role: You are an expert interview evaluator. Evaluate the following answer objectively.

Question: {question_text}
Answer: {answer_text}
Expected Topics: {expected_topics}

Evaluate on these dimensions (0-10 each):
1. Communication Clarity - How clear and articulate is the response?
2. Technical Accuracy - How correct and relevant is the content?
3. Confidence - Does the answer demonstrate confidence and conviction?
4. Answer Structure - Is the answer well-organized (STAR method, logical flow)?

Respond in JSON:
{
  "communication_score": 0-10,
  "technical_score": 0-10,
  "confidence_score": 0-10,
  "structure_score": 0-10,
  "overall_score": 0-10,
  "feedback": "Detailed actionable feedback",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "improved_answer": "Suggested better answer",
  "risk_flags": ["flag1"] or []
}
```

### Feedback Generation
```
Based on the evaluation:
- Provide specific, actionable feedback (e.g., "Your answer lacks structure — try using the STAR method")
- Suggest an improved version of the answer
- Identify 1-2 learning modules that would help
```

---

## DATABASE DESIGN SUMMARY

| Table | Key Fields |
|-------|------------|
| users | id, email, hashed_password, role, is_active |
| student_profiles | id, user_id, branch, skills, resume_url, parsed_resume |
| companies | id, user_id, company_name, industry |
| interviews | id, student_id, type, difficulty, status, total_score |
| interview_questions | id, interview_id, question_text, difficulty |
| interview_answers | id, question_id, answer_text, audio_url |
| answer_evaluations | id, answer_id, scores (x4), feedback, risk_flags |
| placement_readiness | id, student_id, readiness_percent, weak_areas |
| talent_profiles | id, student_id, candidate_code, consent, scores |
| company_shortlists | id, company_id, talent_profile_id, status |
| job_roles | id, company_id, title, required_skills |
| match_results | id, job_role_id, talent_profile_id, match_score |
| learning_modules | id, title, category, content |
| student_learning_progress | id, student_id, module_id, status |
| anti_cheat_logs | id, student_id, flag_type, severity |

---

## AGENTS

> These 6 agents will build your product in parallel:

| Agent | Role | Works On |
|-------|------|----------|
| DATABASE-AGENT | Creates all models and migrations | All database models listed above |
| BACKEND-AGENT | Builds API endpoints, services, LLM integrations | All modules' backends + AI pipeline |
| FRONTEND-AGENT | Creates UI pages and components | All modules' frontends |
| DEVOPS-AGENT | Sets up Docker, CI/CD, environments | Infrastructure + Ollama setup |
| TEST-AGENT | Writes unit and integration tests | All code |
| REVIEW-AGENT | Security and code quality audit | All code |

---

## SPECIAL REQUIREMENTS

### AI Infrastructure
- Ollama must be set up for local LLM inference
- OpenAI API key required for cloud evaluation
- Whisper integration for audio transcription (post-MVP)
- Prompt templates must be versioned and configurable

### Privacy & Compliance
- Student consent management system
- Data anonymization pipeline for company-facing profiles
- Audit log for data access
- No raw interview data exposed to companies

### Integrations
- [x] Ollama (local LLM)
- [x] OpenAI / Azure OpenAI (cloud LLM)
- [x] File upload service (resumes, audio)
- [x] Email service (notifications — post-MVP)
- [ ] Whisper (speech-to-text — post-MVP)
- [ ] Payment provider (post-MVP)

---

# READY?

```bash
/generate-prp INITIAL.md
```

Then:

```bash
/execute-prp PRPs/talexis-prp.md
```
