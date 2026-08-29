"""Prompt templates for the three analysis products."""

from __future__ import annotations

FIT_SCORE_PROMPT = """You are an expert recruiter assistant. Analyze how well this CV matches the job description.

JOB DESCRIPTION:
{jd_text}

CANDIDATE CV:
{cv_text}

Provide your analysis in this EXACT markdown format:

## FIT SCORE: [number 0-100]/100

### Matched Requirements
- **[requirement 1]:** [brief evidence from CV]
- **[requirement 2]:** [brief evidence from CV]
- **[requirement 3]:** [brief evidence from CV]
- **[requirement 4]:** [brief evidence from CV]
- **[requirement 5]:** [brief evidence from CV]

### Missing/Weak Areas
- **[gap 1]:** [what's missing or weak]
- **[gap 2]:** [what's missing or weak]

### Verdict
**[Strong Fit / Moderate Fit / Weak Fit]:** [One sentence recommendation]

Base every claim on evidence actually present in the CV. Do not invent experience.
Use proper markdown with headers (##, ###), bold (**text**), and bullet points (-). Do not use emoji."""


SNAPSHOT_PROMPT = """You are a CV parsing expert. Extract key information from this CV into a structured format.

CV TEXT:
{cv_text}

Return ONLY valid JSON (no markdown, no code blocks, no extra text). Use this exact structure:
{{
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number or null",
    "linkedin": "LinkedIn URL or null",
    "summary": "2-3 sentence professional summary",
    "experience_years": "estimated total years",
    "current_role": "most recent job title",
    "current_company": "most recent company",
    "skills": ["skill1", "skill2", "skill3"],
    "tools_technologies": ["tool1", "tool2"],
    "education": [
        {{"degree": "Degree Name", "institution": "University", "year": "Year"}}
    ],
    "key_achievements": ["achievement 1", "achievement 2"],
    "languages": ["English", "Other"]
}}

If any field is not found in the CV, use null for single values or an empty array [] for lists.
Never guess contact details that are not written in the CV."""


INTERVIEW_KIT_PROMPT = """You are a senior hiring manager. Create an interview kit for this candidate.

JOB DESCRIPTION:
{jd_text}

CANDIDATE CV:
{cv_text}

Generate an interview kit in this EXACT markdown format:

## Role-Specific Questions

### Question 1: Experience
**Q:** [Question about their relevant experience]

**Strong Answer Should Include:** [What a good answer includes]

---

### Question 2: Technical Skills
**Q:** [Technical/skill-based question from JD requirements]

**Strong Answer Should Include:** [What a good answer includes]

---

### Question 3: Project Deep-Dive
**Q:** [Question about a specific project from their CV]

**Strong Answer Should Include:** [What a good answer includes]

---

### Question 4: Behavioral
**Q:** [Behavioral question relevant to the role]

**Strong Answer Should Include:** [What a good answer includes]

---

### Question 5: Problem-Solving
**Q:** [Problem-solving question for the role]

**Strong Answer Should Include:** [What a good answer includes]

---

### Question 6: Culture Fit
**Q:** [Culture/teamwork question]

**Strong Answer Should Include:** [What a good answer includes]

---

## Clarification Questions (Address Gaps/Concerns)

### Clarification 1
**Q:** [Question about a gap, unclear period, or missing requirement]

**Why Ask This:** [What you're trying to clarify]

---

### Clarification 2
**Q:** [Question about a potential risk area]

**Why Ask This:** [What you're trying to clarify]

Ask only about things that are lawful and job-related. Do not ask about age, marital status,
religion, health, or national origin. Use proper markdown with headers, bold text, and horizontal
rules (---) for clear separation. Do not use emoji."""


def fit_score_prompt(cv_text: str, jd_text: str) -> str:
    return FIT_SCORE_PROMPT.format(cv_text=cv_text, jd_text=jd_text)


def snapshot_prompt(cv_text: str) -> str:
    return SNAPSHOT_PROMPT.format(cv_text=cv_text)


def interview_kit_prompt(cv_text: str, jd_text: str) -> str:
    return INTERVIEW_KIT_PROMPT.format(cv_text=cv_text, jd_text=jd_text)
