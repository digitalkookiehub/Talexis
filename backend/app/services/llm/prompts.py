"""Versioned prompt templates for Talexis LLM integrations."""

# v1 - Question Generation (Local LLM / Ollama)
QUESTION_GENERATION_PROMPT = """You are an expert interview question generator.

Interview Type: {interview_type}
Difficulty Level: {difficulty_level}
Candidate Profile Summary: {profile_summary}
Previous Questions Asked: {previous_questions}

Generate a single interview question that:
1. Is appropriate for the {interview_type} interview type and {difficulty_level} difficulty
2. Does not repeat any of the previous questions
3. Tests a specific skill or competency relevant to the role
4. Can be answered in 2-3 minutes

Output ONLY the question text, nothing else."""

QUESTION_GENERATION_SYSTEM = """You are an expert interviewer who creates thoughtful, \
role-appropriate interview questions. You adapt difficulty based on the candidate's profile \
and avoid repetition. Generate clear, specific questions that evaluate real competency."""

# v1 - Answer Evaluation (Cloud LLM / OpenAI)
ANSWER_EVALUATION_PROMPT = """Evaluate the following interview answer objectively.

Question: {question_text}
Answer: {answer_text}
Expected Topics: {expected_topics}
Interview Type: {interview_type}

Evaluate on these dimensions (0-10 each):
1. Communication Clarity - How clear, articulate, and well-expressed is the response?
2. Technical Accuracy - How correct, relevant, and thorough is the content?
3. Confidence - Does the answer demonstrate conviction and self-assurance?
4. Answer Structure - Is it well-organized (STAR method, logical flow, clear conclusion)?

Respond in JSON format:
{{
  "communication_score": <0-10>,
  "technical_score": <0-10>,
  "confidence_score": <0-10>,
  "structure_score": <0-10>,
  "overall_score": <0-10>,
  "feedback": "<Detailed actionable feedback in 2-3 sentences>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "improved_answer": "<A suggested better version of the answer>",
  "risk_flags": ["<flag>"] or []
}}"""

ANSWER_EVALUATION_SYSTEM = """You are an expert interview evaluator with years of experience \
in talent assessment. You provide fair, consistent, and objective evaluations. Your scores \
are well-calibrated: 0-3 is poor, 4-5 is below average, 6-7 is good, 8-9 is excellent, \
10 is exceptional. You always provide actionable feedback that helps candidates improve."""

# v1 - Feedback Generation
FEEDBACK_GENERATION_PROMPT = """Based on the evaluation scores below, generate actionable \
improvement feedback for the student.

Scores:
- Communication: {communication_score}/10
- Technical: {technical_score}/10
- Confidence: {confidence_score}/10
- Structure: {structure_score}/10
- Overall: {overall_score}/10

Weaknesses identified: {weaknesses}

Provide:
1. Specific, actionable feedback (e.g., "Your answer lacks structure — try using the STAR method")
2. Suggest 1-2 concrete improvement strategies
3. Identify which learning modules would help (from: HR basics, STAR method, \
Communication improvement, Technical fundamentals, Behavioral interview prep)

Keep feedback constructive and encouraging."""

# v1 - Resume Parsing (Local LLM / Ollama)
RESUME_PARSING_PROMPT = """Parse the following resume text into structured JSON format.

Resume Text:
{resume_text}

Extract and return JSON with these fields:
{{
  "full_name": "<name>",
  "email": "<email>",
  "phone": "<phone or null>",
  "education": [
    {{
      "degree": "<degree>",
      "institution": "<institution>",
      "year": "<graduation year>",
      "gpa": "<gpa or null>"
    }}
  ],
  "skills": ["<skill1>", "<skill2>"],
  "experience": [
    {{
      "title": "<job title>",
      "company": "<company>",
      "duration": "<duration>",
      "description": "<brief description>"
    }}
  ],
  "projects": [
    {{
      "name": "<project name>",
      "description": "<brief description>",
      "technologies": ["<tech1>", "<tech2>"]
    }}
  ],
  "certifications": ["<cert1>"],
  "languages": ["<language1>"],
  "summary": "<2-3 sentence professional summary>"
}}

If a field cannot be determined from the resume, use null or an empty list."""

RESUME_PARSING_SYSTEM = """You are an expert resume parser. Extract structured information \
from resume text accurately. If information is ambiguous or missing, use null rather than \
guessing. Return valid JSON only."""
