# PRP: Talexis

> Implementation blueprint for parallel agent execution

---

## METADATA

| Field | Value |
|-------|-------|
| **Product** | Talexis |
| **Type** | SaaS (Two-sided Platform) |
| **Version** | 1.0 |
| **Created** | 2026-04-09 |
| **Complexity** | High |

---

## PRODUCT OVERVIEW

**Description:** Talexis is an AI-powered talent intelligence platform with a hybrid LLM architecture (local Ollama + cloud OpenAI). It trains students through AI mock interviews, evaluates their performance with consistent 0–10 scoring, generates placement readiness scores, and connects companies with pre-qualified candidates via anonymized scorecards—eliminating traditional first-round interviews.

**Value Proposition:**
- **For Colleges:** Scalable interview training without manual effort; data-driven placement readiness tracking
- **For Students:** Unlimited AI mock interviews with actionable feedback and skill improvement paths
- **For Companies:** Access pre-evaluated, scored candidates without conducting first-round interviews

**MVP Scope:**
- [ ] User registration & login (4 roles: student, college_admin, company, admin)
- [ ] Student profile creation & resume upload with AI parsing
- [ ] AI mock interview engine (text-based, multi-type, multi-difficulty)
- [ ] Cloud LLM evaluation with 0–10 scoring & detailed feedback
- [ ] Placement readiness score calculation & tracking
- [ ] Anonymized talent profiles for company browsing
- [ ] Company candidate shortlisting
- [ ] Basic admin panel

---

## TECH STACK

| Layer | Technology | Skill Reference |
|-------|------------|-----------------|
| Backend | FastAPI + Python 3.11+ | skills/BACKEND.md |
| Frontend | React + TypeScript + Vite | skills/FRONTEND.md |
| Database | PostgreSQL + SQLAlchemy + Alembic | skills/DATABASE.md |
| Auth | JWT + bcrypt (Email/Password) | skills/BACKEND.md |
| UI | Tailwind CSS + shadcn/ui | skills/FRONTEND.md |
| Local AI | Ollama (Llama 3 / Mistral) | — |
| Cloud AI | OpenAI GPT-4o / Azure OpenAI | — |
| Testing | pytest + React Testing Library | skills/TESTING.md |
| Deployment | Docker + docker-compose + GitHub Actions | skills/DEPLOYMENT.md |

---

## DATABASE MODELS

### User Model
- id (PK), email (unique), hashed_password, full_name, role (enum: student/college_admin/company/admin), is_active, is_verified, created_at, updated_at

### RefreshToken Model
- id (PK), user_id (FK → users), token (unique), expires_at, revoked, created_at

### StudentProfile Model
- id (PK), user_id (FK → users, unique), branch, department, college_name, graduation_year, skills (JSON), interests (JSON), bio, profile_picture_url, resume_url, parsed_resume (JSON), baseline_score, created_at, updated_at

### SkillAssessment Model
- id (PK), student_id (FK → student_profiles), skill_name, score (0–10), assessed_at, assessment_type

### Company Model
- id (PK), user_id (FK → users, unique), company_name, industry, size, website, logo_url, description, created_at, updated_at

### JobRole Model
- id (PK), company_id (FK → companies), title, description, required_skills (JSON), min_readiness_score, interview_types_required (JSON), status (enum: active/closed/draft), created_at, expires_at

### Interview Model
- id (PK), student_id (FK → student_profiles), interview_type (enum: hr/technical/sales/behavioral), difficulty_level (enum: basic/intermediate/advanced), status (enum: pending/in_progress/completed/evaluated), started_at, completed_at, total_score, created_at

### InterviewQuestion Model
- id (PK), interview_id (FK → interviews), question_text, question_type, difficulty, order_index, expected_topics (JSON), created_at

### InterviewAnswer Model
- id (PK), question_id (FK → interview_questions), interview_id (FK → interviews), answer_text, audio_url, transcribed_text, submitted_at

### InterviewAttempt Model
- id (PK), student_id (FK → student_profiles), interview_type (enum), attempt_number, max_attempts, created_at

### AnswerEvaluation Model
- id (PK), answer_id (FK → interview_answers), interview_id (FK → interviews), communication_score, technical_score, confidence_score, structure_score, overall_score, feedback_text, risk_flags (JSON), strengths (JSON), weaknesses (JSON), improved_answer_suggestion, evaluated_at

### EvaluationRun Model
- id (PK), interview_id (FK → interviews), run_number, variance_score, is_consistent, evaluated_at

### PlacementReadiness Model
- id (PK), student_id (FK → student_profiles, unique), overall_readiness_percent, communication_avg, technical_avg, confidence_avg, structure_avg, weak_areas (JSON), strong_areas (JSON), recommendation (enum: YES/MAYBE/NO), last_calculated_at

### ReadinessHistory Model
- id (PK), student_id (FK → student_profiles), readiness_percent, calculated_at

### TalentProfile Model
- id (PK), student_id (FK → student_profiles, unique), candidate_code (unique, anonymized), is_visible, consent_given, consent_date, skill_scores (JSON), role_fit_scores (JSON), recommendation (enum: YES/MAYBE/NO), risk_indicators (JSON), last_updated

### CompanyShortlist Model
- id (PK), company_id (FK → companies), talent_profile_id (FK → talent_profiles), shortlisted_at, notes, status (enum: shortlisted/contacted/rejected/hired)

### MatchResult Model
- id (PK), job_role_id (FK → job_roles), talent_profile_id (FK → talent_profiles), match_score, skill_match_percent, readiness_match, overall_rank, matched_at

### LearningModule Model
- id (PK), title, category (enum: hr/technical/communication/behavioral), difficulty, content_text, content_url, duration_minutes, tags (JSON), created_at

### StudentLearningProgress Model
- id (PK), student_id (FK → student_profiles), module_id (FK → learning_modules), status (enum: not_started/in_progress/completed), started_at, completed_at

### AntiCheatLog Model
- id (PK), student_id (FK → student_profiles), interview_id (FK → interviews), flag_type (enum: similarity/pattern/attempt_limit), severity (enum: low/medium/high), details (JSON), flagged_at

### AnswerSimilarity Model
- id (PK), answer_id_1 (FK → interview_answers), answer_id_2 (FK → interview_answers), similarity_score, flagged

**Total Models: 19**

---

## MODULES

### Module 1: Authentication
**Agents:** DATABASE-AGENT + BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/register | Create account with role | Public |
| POST | /api/v1/auth/login | Login, get JWT tokens | Public |
| POST | /api/v1/auth/refresh | Refresh access token | Token |
| POST | /api/v1/auth/logout | Revoke refresh token | Token |
| GET | /api/v1/auth/me | Get current user | Token |
| PUT | /api/v1/auth/me | Update profile | Token |
| POST | /api/v1/auth/forgot-password | Request reset | Public |
| POST | /api/v1/auth/reset-password | Reset with token | Public |
| POST | /api/v1/auth/verify-email | Verify email | Public |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /login | LoginPage | LoginForm, AuthLayout |
| /register | RegisterPage | RegisterForm, RoleSelector |
| /forgot-password | ForgotPasswordPage | ForgotPasswordForm |
| /verify-email | VerifyEmailPage | VerificationStatus |
| /profile | ProfilePage | ProfileForm, AvatarUpload |

---

### Module 2: Student Profile & Resume
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP
**Dependencies:** Module 1 (Auth)

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/students/profile | Create profile | Student |
| GET | /api/v1/students/profile | Get own profile | Student |
| PUT | /api/v1/students/profile | Update profile | Student |
| POST | /api/v1/students/resume/upload | Upload resume PDF | Student |
| POST | /api/v1/students/resume/parse | Parse with local LLM | Student |
| GET | /api/v1/students/resume/parsed | Get parsed data | Student |
| POST | /api/v1/students/skills/assess | Baseline assessment | Student |
| GET | /api/v1/students/skills | Get skill scores | Student |
| GET | /api/v1/students/dashboard | Dashboard data | Student |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /student/onboarding | OnboardingPage | OnboardingWizard, SkillPicker |
| /student/profile | StudentProfilePage | ProfileCard, SkillBadges |
| /student/resume | ResumePage | ResumeUploader, ParsedResumeView |
| /student/skills | SkillsPage | SkillChart, AssessmentButton |
| /student/dashboard | StudentDashboardPage | StatsCards, ProgressChart, RecentInterviews |

---

### Module 3: AI Interview Engine
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP
**Dependencies:** Module 2 (Student Profile), Ollama setup

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/interviews/start | Start interview session | Student |
| GET | /api/v1/interviews/{id} | Get interview details | Student |
| GET | /api/v1/interviews/{id}/questions | Get questions | Student |
| POST | /api/v1/interviews/{id}/questions/generate | Generate next question (Ollama) | Student |
| POST | /api/v1/interviews/{id}/answers | Submit text answer | Student |
| POST | /api/v1/interviews/{id}/complete | Complete interview | Student |
| GET | /api/v1/interviews/history | List past interviews | Student |
| GET | /api/v1/interviews/attempts | Get attempt counts | Student |

**Backend Services:**
| Service | Description |
|---------|-------------|
| LocalLLMService | Ollama client for question generation |
| InterviewService | Interview session management |
| QuestionGeneratorService | Dynamic question generation with prompts |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /student/interviews | InterviewSelectPage | InterviewTypeCard, DifficultySelector |
| /student/interviews/{id} | LiveInterviewPage | QuestionDisplay, AnswerInput, Timer, ProgressBar |
| /student/interviews/{id}/review | InterviewReviewPage | QAList, ScoreSummary |
| /student/interviews/history | InterviewHistoryPage | InterviewTable, FilterBar |

---

### Module 4: Evaluation Engine
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP
**Dependencies:** Module 3 (Interview Engine), OpenAI API

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/evaluations/evaluate/{interview_id} | Evaluate interview (OpenAI) | System |
| GET | /api/v1/evaluations/{interview_id} | Get evaluation results | Student |
| GET | /api/v1/evaluations/{interview_id}/feedback | Detailed feedback | Student |
| POST | /api/v1/evaluations/{interview_id}/re-evaluate | Re-evaluate (consistency) | System |
| GET | /api/v1/evaluations/{interview_id}/scorecard | Structured scorecard | Student |

**Backend Services:**
| Service | Description |
|---------|-------------|
| CloudLLMService | OpenAI client for evaluation |
| EvaluationService | Score calculation & feedback generation |
| PromptManager | Versioned prompt templates |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /student/interviews/{id}/results | ResultsPage | ScoreRadar, DimensionBars, OverallScore |
| /student/interviews/{id}/feedback | FeedbackPage | FeedbackCard, ImprovedAnswerView |
| /student/scorecard | ScorecardPage | ScorecardGrid, TrendChart |

---

### Module 5: Placement Readiness
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP
**Dependencies:** Module 4 (Evaluation Engine)

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/readiness/{student_id} | Get readiness score | Student |
| POST | /api/v1/readiness/calculate | Recalculate readiness | Student |
| GET | /api/v1/readiness/history | Readiness trend | Student |
| GET | /api/v1/readiness/weak-areas | Weak areas + recommendations | Student |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /student/readiness | ReadinessPage | ReadinessGauge, TrendLine, WeakAreaCards |
| /student/readiness/areas | AreasPage | AreaDetailCard, ImprovementTips |

---

### Module 6: Talent Profiles (Company View)
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP
**Dependencies:** Module 5 (Readiness), Student consent

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/talents | List talent profiles (paginated) | Company |
| GET | /api/v1/talents/{candidate_code} | Get talent scorecard | Company |
| POST | /api/v1/talents/{candidate_code}/shortlist | Add to shortlist | Company |
| DELETE | /api/v1/talents/{candidate_code}/shortlist | Remove from shortlist | Company |
| GET | /api/v1/talents/shortlist | Company's shortlist | Company |
| PUT | /api/v1/talents/shortlist/{id}/status | Update shortlist status | Company |
| POST | /api/v1/students/consent | Grant consent | Student |
| DELETE | /api/v1/students/consent | Revoke consent | Student |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /company/talents | TalentBrowsePage | TalentCard, FilterSidebar, SkillFilter, ScoreRange |
| /company/talents/{code} | TalentDetailPage | AnonymizedScorecard, SkillRadar, RecommendationBadge |
| /company/shortlist | ShortlistPage | ShortlistTable, StatusDropdown, NotesEditor |

---

### Module 7: Company Job Portal
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** Post-MVP
**Dependencies:** Module 6 (Talent Profiles)

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/companies/profile | Create company profile | Company |
| GET | /api/v1/companies/profile | Get company profile | Company |
| PUT | /api/v1/companies/profile | Update company profile | Company |
| POST | /api/v1/jobs | Create job role | Company |
| GET | /api/v1/jobs | List job roles | Company |
| GET | /api/v1/jobs/{id} | Get job details | Company |
| PUT | /api/v1/jobs/{id} | Update job | Company |
| DELETE | /api/v1/jobs/{id} | Delete job | Company |
| GET | /api/v1/jobs/{id}/matches | Get matched candidates | Company |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /company/profile | CompanyProfilePage | CompanyForm, LogoUploader |
| /company/jobs | JobListPage | JobCard, StatusBadge |
| /company/jobs/new | CreateJobPage | JobForm, SkillRequirementBuilder |
| /company/jobs/{id} | JobDetailPage | MatchedCandidatesList, MatchScore |
| /company/dashboard | CompanyDashboardPage | HiringFunnel, StatsCards |

---

### Module 8: Matching Engine
**Agents:** BACKEND-AGENT
**Priority:** Post-MVP
**Dependencies:** Module 7 (Job Portal) + Module 6 (Talent Profiles)

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/matching/run/{job_id} | Run matching algorithm | Company |
| GET | /api/v1/matching/{job_id}/results | Get ranked results | Company |
| GET | /api/v1/matching/student/{student_id}/jobs | Matching jobs for student | Student |

**Backend Services:**
| Service | Description |
|---------|-------------|
| MatchingService | Score-based candidate-job matching algorithm |

---

### Module 9: Micro-Learning
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** Post-MVP
**Dependencies:** Module 4 (Evaluation — feeds weak areas)

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/learning/modules | List modules | Student |
| GET | /api/v1/learning/modules/{id} | Module content | Student |
| GET | /api/v1/learning/recommended | Recommended for weak areas | Student |
| POST | /api/v1/learning/modules/{id}/start | Start module | Student |
| POST | /api/v1/learning/modules/{id}/complete | Complete module | Student |
| GET | /api/v1/learning/progress | Learning progress | Student |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /student/learn | LearningHubPage | ModuleCard, CategoryFilter, RecommendedSection |
| /student/learn/{id} | ModuleContentPage | ContentViewer, ProgressTracker |
| /student/learn/progress | LearningProgressPage | ProgressGrid, CompletionChart |

---

### Module 10: Anti-Cheat System
**Agents:** BACKEND-AGENT
**Priority:** Post-MVP
**Dependencies:** Module 3 (Interview Engine)

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/anticheat/check/{interview_id} | Run anti-cheat analysis | System |
| GET | /api/v1/anticheat/flags/{student_id} | Get flags for student | Admin |
| GET | /api/v1/anticheat/report | Anti-cheat report | Admin |

**Backend Services:**
| Service | Description |
|---------|-------------|
| AntiCheatService | Similarity detection, pattern analysis, attempt tracking |

---

### Module 11: Analytics Dashboard
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP (basic), Post-MVP (advanced)
**Dependencies:** Modules 3–6

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/analytics/student | Student progress analytics | Student |
| GET | /api/v1/analytics/college | College placement analytics | College Admin |
| GET | /api/v1/analytics/company | Company hiring analytics | Company |
| GET | /api/v1/analytics/platform | Platform-wide stats | Admin |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /student/analytics | StudentAnalyticsPage | ScoreTrendChart, InterviewStats |
| /college/analytics | CollegeAnalyticsPage | PlacementRateChart, ReadinessDistribution |
| /company/analytics | CompanyAnalyticsPage | HiringFunnel, ShortlistConversion |
| /admin/analytics | PlatformAnalyticsPage | UserGrowth, InterviewVolume, SystemHealth |

---

### Module 12: Admin Panel
**Agents:** BACKEND-AGENT + FRONTEND-AGENT
**Priority:** MVP (basic)
**Dependencies:** Module 1 (Auth)

**Backend Endpoints:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/admin/users | List all users | Admin |
| PUT | /api/v1/admin/users/{id} | Update user status/role | Admin |
| DELETE | /api/v1/admin/users/{id} | Deactivate user | Admin |
| GET | /api/v1/admin/stats | Platform statistics | Admin |
| GET | /api/v1/admin/interviews/stats | Interview statistics | Admin |
| POST | /api/v1/admin/learning/modules | Create learning module | Admin |
| PUT | /api/v1/admin/learning/modules/{id} | Update learning module | Admin |

**Frontend Pages:**
| Route | Page | Key Components |
|-------|------|----------------|
| /admin | AdminDashboardPage | StatCards, QuickActions |
| /admin/users | UserManagementPage | UserTable, RoleEditor, StatusToggle |
| /admin/interviews | InterviewStatsPage | InterviewVolumeChart, TypeBreakdown |
| /admin/learning | LearningManagePage | ModuleEditor, CategoryManager |
| /admin/settings | SettingsPage | SystemConfigForm |

---

## AGENT-MODULE MAPPING

| Agent | Modules | Deliverables |
|-------|---------|-------------|
| DATABASE-AGENT | All | 19 models, migrations, database.py, enums |
| BACKEND-AGENT | 1–12 | 75+ endpoints, 8 services, LLM integrations, auth middleware |
| FRONTEND-AGENT | 1–7, 9, 11–12 | 35+ pages, 50+ components, routing, state management |
| DEVOPS-AGENT | Infrastructure | Docker, docker-compose, CI/CD, Ollama setup, env files |
| TEST-AGENT | All | pytest + RTL tests, 80%+ coverage |
| REVIEW-AGENT | All | Security audit, code review, performance review |

---

## PHASE EXECUTION PLAN

### Phase 1: Foundation (4 agents in parallel)

**DATABASE-AGENT:**
- Read: skills/DATABASE.md
- Create: backend/app/database.py (engine, session, Base)
- Create: All 19 model files in backend/app/models/
- Create: Alembic configuration + initial migration
- Create: Enum types (UserRole, InterviewType, DifficultyLevel, InterviewStatus, etc.)
- Create: backend/app/models/__init__.py with all exports

**BACKEND-AGENT:**
- Read: skills/BACKEND.md
- Create: backend/app/main.py (FastAPI app, CORS, middleware)
- Create: backend/app/config.py (Settings with pydantic-settings)
- Create: backend/requirements.txt
- Create: backend/app/auth/ (JWT utils, password hashing, dependencies)
- Create: backend/app/services/llm/prompts.py (versioned prompt templates)
- Create: backend/app/services/llm/local_llm.py (Ollama client)
- Create: backend/app/services/llm/cloud_llm.py (OpenAI client)

**FRONTEND-AGENT:**
- Read: skills/FRONTEND.md
- Create: Vite + React + TypeScript project scaffold
- Install: Tailwind CSS + shadcn/ui setup
- Create: src/types/ (all TypeScript interfaces)
- Create: src/services/api.ts (Axios client with interceptors)
- Create: src/context/AuthContext.tsx
- Create: src/components/layout/ (AppLayout, Sidebar, Navbar)
- Create: src/components/ui/ (shadcn components)
- Create: Router setup with role-based protected routes

**DEVOPS-AGENT:**
- Read: skills/DEPLOYMENT.md
- Create: docker-compose.yml (postgres, backend, frontend, ollama)
- Create: backend/Dockerfile
- Create: frontend/Dockerfile
- Create: .env.example
- Create: .github/workflows/ci.yml
- Create: Makefile (dev commands)

**Validation Gate 1:**
```bash
cd backend && pip install -r requirements.txt
alembic upgrade head
cd ../frontend && npm install
docker-compose config
```

---

### Phase 2: Core MVP Modules (backend + frontend parallel per module)

**Phase 2A: Auth Module**
- BACKEND-AGENT: Auth router, schemas, auth service
  - backend/app/routers/auth.py
  - backend/app/schemas/auth.py
  - backend/app/services/auth_service.py
- FRONTEND-AGENT: Auth pages + forms
  - Login, Register, ForgotPassword, Profile pages
  - AuthContext integration

**Phase 2B: Student Module (depends on 2A)**
- BACKEND-AGENT: Student router, schemas, resume service
  - backend/app/routers/students.py
  - backend/app/schemas/student.py
  - backend/app/services/resume_parser.py (uses local LLM)
  - File upload handling
- FRONTEND-AGENT: Student pages
  - Onboarding wizard, Profile, Resume upload, Skills, Dashboard

**Phase 2C: Interview + Evaluation Module (depends on 2B)**
- BACKEND-AGENT: Interview & evaluation routers, services
  - backend/app/routers/interviews.py
  - backend/app/routers/evaluations.py
  - backend/app/schemas/interview.py, evaluation.py
  - backend/app/services/interview_service.py
  - backend/app/services/evaluation_service.py
  - Integration with Ollama (question gen) + OpenAI (evaluation)
- FRONTEND-AGENT: Interview + evaluation pages
  - Interview selection, Live interview UI, Results, Feedback

**Phase 2D: Readiness + Talent + Company Module (depends on 2C)**
- BACKEND-AGENT: Readiness, talent, company routers
  - backend/app/routers/readiness.py
  - backend/app/routers/talents.py
  - backend/app/schemas/readiness.py, talent.py
  - backend/app/services/readiness_service.py
  - Consent management, anonymization pipeline
- FRONTEND-AGENT: Company-facing pages
  - Readiness dashboard, Talent browsing, Shortlist management

**Phase 2E: Admin + Analytics (depends on 2A)**
- BACKEND-AGENT: Admin & analytics routers
  - backend/app/routers/admin.py
  - backend/app/routers/analytics.py
- FRONTEND-AGENT: Admin pages
  - Admin dashboard, User management, Analytics pages

**Validation Gate 2:**
```bash
ruff check backend/
cd frontend && npm run lint && npm run type-check
curl http://localhost:8000/docs  # OpenAPI docs load
```

---

### Phase 3: Post-MVP Modules (when MVP is stable)

**Phase 3A: Job Portal + Matching**
- BACKEND-AGENT: Job and matching routers + services
- FRONTEND-AGENT: Company job pages

**Phase 3B: Micro-Learning**
- BACKEND-AGENT: Learning module router
- FRONTEND-AGENT: Learning hub pages

**Phase 3C: Anti-Cheat**
- BACKEND-AGENT: Anti-cheat service + router

---

### Phase 4: Quality (3 agents in parallel)

**TEST-AGENT:**
- Read: skills/TESTING.md
- Write: backend/tests/ (pytest for all routers + services)
- Write: frontend/src/__tests__/ (RTL for all pages + components)
- Target: 80%+ coverage
- Key test areas:
  - Auth flow (register → login → refresh → protected routes)
  - Interview lifecycle (start → answer → complete → evaluate)
  - Evaluation scoring consistency
  - Consent flow (grant → talent visible → revoke → talent hidden)
  - Role-based access (student can't see admin routes, company can't see raw data)

**REVIEW-AGENT:**
- Security audit:
  - No raw interview data leaks to company endpoints
  - JWT validation on all protected routes
  - Rate limiting on auth + LLM endpoints
  - Input sanitization on all user inputs
  - SQL injection prevention verified
  - File upload validation (type, size)
- Performance review:
  - Database queries optimized (N+1 detection)
  - LLM calls are async with proper timeouts
  - Pagination on all list endpoints
- Code quality:
  - Type hints on all Python functions
  - No `any` types in TypeScript
  - No `print()` or `console.log` in production code
  - Proper error handling with custom exceptions

**DEVOPS-AGENT:**
- Verify Docker builds
- Test docker-compose up (all services start)
- Verify Ollama container pulls model
- Health check endpoints working

**Validation Gate 3:**
```bash
pytest backend/tests -v --cov --cov-fail-under=80
cd frontend && npm test -- --coverage
```

---

### Final Validation

```bash
# Full build
docker-compose build

# Start all services
docker-compose up -d

# Health checks
curl http://localhost:8000/health
curl http://localhost:3000

# API docs
curl http://localhost:8000/docs

# Ollama check
curl http://localhost:11434/api/tags
```

---

## VALIDATION GATES

| Gate | Stage | Commands |
|------|-------|----------|
| 1 | Foundation | `pip install -r requirements.txt`, `alembic upgrade head`, `npm install`, `docker-compose config` |
| 2 | Modules | `ruff check backend/`, `npm run lint`, `npm run type-check`, OpenAPI docs load |
| 3 | Quality | `pytest --cov --cov-fail-under=80`, `npm test --coverage` |
| Final | Integration | `docker-compose up -d`, health checks, API docs, Ollama ready |

---

## ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://talexis_user:password@localhost:5432/talexis

# Auth
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Local LLM (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Cloud LLM (OpenAI)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## KEY ARCHITECTURAL DECISIONS

1. **Hybrid LLM:** Local Ollama for cost-sensitive operations (question gen, parsing), cloud OpenAI for accuracy-critical operations (evaluation, scoring)
2. **Privacy-first:** Anonymized candidate codes, consent system, no raw data exposure to companies
3. **Role-based architecture:** 4 distinct roles with separate route groups and UI flows
4. **Async everything:** All FastAPI endpoints async, LLM calls use async clients
5. **Prompt versioning:** All LLM prompts stored centrally with version tracking
6. **Evaluation consistency:** Optional dual-run evaluation with variance detection

---

## NEXT STEP

Execute with parallel agents:
```bash
/execute-prp PRPs/talexis-prp.md
```
