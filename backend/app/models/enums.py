import enum


class UserRole(str, enum.Enum):
    student = "student"
    college_admin = "college_admin"
    company = "company"
    admin = "admin"


class InterviewType(str, enum.Enum):
    hr = "hr"
    technical = "technical"
    sales = "sales"
    behavioral = "behavioral"


class DifficultyLevel(str, enum.Enum):
    basic = "basic"
    intermediate = "intermediate"
    advanced = "advanced"


class InterviewStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    evaluated = "evaluated"


class ShortlistStatus(str, enum.Enum):
    shortlisted = "shortlisted"
    contacted = "contacted"
    rejected = "rejected"
    hired = "hired"


class JobStatus(str, enum.Enum):
    active = "active"
    closed = "closed"
    draft = "draft"


class Recommendation(str, enum.Enum):
    yes = "YES"
    maybe = "MAYBE"
    no = "NO"


class AntiCheatFlagType(str, enum.Enum):
    similarity = "similarity"
    pattern = "pattern"
    attempt_limit = "attempt_limit"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class LearningStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class LearningCategory(str, enum.Enum):
    hr = "hr"
    technical = "technical"
    communication = "communication"
    behavioral = "behavioral"
