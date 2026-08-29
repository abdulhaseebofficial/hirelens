"""
HireLens - Recruiter's Smart Screening Assistant
========================================================
A business-driven CV analysis tool for recruiters and hiring managers.

Features:
1. JD <-> CV Fit Score with evidence-based matching
2. Structured Candidate Snapshot with JSON/CSV export
3. Interview Kit with role-specific questions (generated on demand)
4. Batch CV ranking - upload multiple CVs, rank them against one job description

Built with Streamlit + Google Gemini API
"""

import streamlit as st
import PyPDF2
import os
import io
import csv
import json
import re
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

# =============================================================================
# CONFIGURATION
# =============================================================================

load_dotenv()

st.set_page_config(
    page_title="HireLens",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="expanded"
)

MODEL_NAME = os.environ.get("GEMINI_MODEL", "models/gemini-flash-lite-latest")
MAX_FILE_SIZE_MB = 10
MAX_BATCH_SIZE = 15
MAX_RETRIES = 3

google_api_key = os.environ.get("GOOGLE_API_KEY")

if not google_api_key:
    st.error("GOOGLE_API_KEY not found. Please set it in your .env file.")
    st.stop()

try:
    client = genai.Client(api_key=google_api_key)
except Exception as e:
    st.error(f"Failed to initialize Gemini client: {e}")
    st.stop()

# =============================================================================
# STYLING
# =============================================================================

st.markdown("""
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
--ink: #F0EEE6;
--ink-muted: #A8A6A0;
--coral: #CC785C;
--coral-dark: #E0916F;
--coral-tint: rgba(204, 120, 92, 0.18);
--paper: #262624;
--paper-raised: #30302E;
--border: rgba(240, 238, 230, 0.14);
}
html, body, [class*="css"] {
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
h1, h2, h3 {
font-family: 'Source Serif 4', Georgia, serif !important;
color: var(--ink) !important;
font-weight: 600 !important;
}
.stButton > button, .stDownloadButton > button {
border-radius: 10px !important;
border: 1px solid var(--border) !important;
font-weight: 600 !important;
transition: all 0.15s ease;
}
.stButton > button[kind="primary"] {
background: var(--coral) !important;
border: none !important;
color: white !important;
box-shadow: 0 2px 6px rgba(204, 120, 92, 0.35);
}
.stButton > button[kind="primary"]:hover {
background: var(--coral-dark) !important;
box-shadow: 0 4px 10px rgba(204, 120, 92, 0.45);
}
.stTabs [data-baseweb="tab-list"] {
gap: 4px;
border-bottom: 1px solid var(--border);
}
.stTabs [data-baseweb="tab"] {
border-radius: 10px 10px 0 0;
font-weight: 600;
color: var(--ink-muted);
padding: 10px 18px;
}
.stTabs [aria-selected="true"] {
color: var(--coral-dark) !important;
background: var(--coral-tint) !important;
}
[data-testid="stFileUploaderDropzone"] {
border-radius: 14px !important;
border: 1.5px dashed var(--border) !important;
background: var(--paper-raised) !important;
}
.stTextArea textarea {
border-radius: 12px !important;
border: 1px solid var(--border) !important;
}
.score-badge {
display: flex;
align-items: center;
justify-content: center;
width: 120px;
height: 120px;
border-radius: 50%;
font-family: 'Source Serif 4', Georgia, serif;
font-size: 2.1rem;
font-weight: 700;
color: white;
margin: 0 auto 0.5rem auto;
box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}
.score-badge.high { background: linear-gradient(135deg, #7A9A6D, #5C7A50); }
.score-badge.mid { background: linear-gradient(135deg, var(--coral), var(--coral-dark)); }
.score-badge.low { background: linear-gradient(135deg, #C1594A, #9A4234); }
.verdict-pill {
display: inline-block;
padding: 5px 14px;
border-radius: 20px;
font-weight: 700;
font-size: 0.85rem;
color: white;
}
.verdict-pill.high { background: #5C7A50; }
.verdict-pill.mid { background: var(--coral-dark); }
.verdict-pill.low { background: #9A4234; }
.skill-pill {
display: inline-block;
padding: 5px 13px;
margin: 3px 4px 3px 0;
border-radius: 16px;
background: var(--coral-tint);
color: var(--coral-dark) !important;
border: 1px solid rgba(204, 120, 92, 0.25);
font-size: 0.82rem;
font-weight: 600;
}
.snapshot-card {
background: var(--paper-raised);
border: 1px solid var(--border);
border-radius: 16px;
padding: 18px 20px;
margin-bottom: 14px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.snapshot-card p {
color: var(--ink-muted);
font-size: 0.88rem;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
margin: 0;
}
[data-testid="stAlert"] {
border-radius: 12px !important;
background: var(--paper-raised) !important;
border: 1px solid var(--border) !important;
border-left: 4px solid var(--coral) !important;
color: var(--ink) !important;
}
[data-testid="stAlert"] p {
color: var(--ink) !important;
}
[data-testid="stAlert"] svg {
fill: var(--coral) !important;
}
[data-testid="stProgress"] > div > div > div {
background-color: var(--coral) !important;
}
[data-testid="stProgress"] > div > div {
background-color: var(--paper-raised) !important;
}
[data-testid="stDecoration"] {
background-image: linear-gradient(90deg, var(--coral), var(--coral-dark)) !important;
}
hr, [data-testid="stDivider"] {
border-color: var(--border) !important;
}
.block-container {
max-width: 1120px;
padding-top: 2.5rem;
}
.eyebrow {
text-transform: uppercase;
letter-spacing: 0.12em;
font-size: 0.72rem;
font-weight: 700;
color: var(--coral-dark);
margin-bottom: 0.3rem;
}
.section-label {
text-transform: uppercase;
letter-spacing: 0.08em;
font-size: 0.72rem;
font-weight: 700;
color: var(--ink-muted);
margin-bottom: 6px;
display: block;
}
[data-testid="stCaptionContainer"], .stCaption {
color: var(--ink-muted) !important;
}
section[data-testid="stSidebar"] {
border-right: 1px solid var(--border);
}
section[data-testid="stSidebar"] h2 {
font-size: 1.05rem !important;
}
.stTextArea textarea:focus, [data-testid="stFileUploaderDropzone"]:focus-within {
border-color: var(--coral) !important;
box-shadow: 0 0 0 3px var(--coral-tint) !important;
}
.stButton > button:not([kind="primary"]):hover {
border-color: var(--coral) !important;
color: var(--coral-dark) !important;
}
[data-testid="stMetricValue"] {
font-family: 'Source Serif 4', Georgia, serif;
}
[data-testid="stDataFrame"] {
border-radius: 12px;
overflow: hidden;
border: 1px solid var(--border);
}
[data-baseweb="select"] > div {
border-radius: 10px !important;
border-color: var(--border) !important;
}
</style>
""", unsafe_allow_html=True)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def extract_text_from_pdf(uploaded_file):
    """Extract text from an uploaded PDF. Returns (text, error_message)."""
    try:
        pdf_reader = PyPDF2.PdfReader(uploaded_file)
    except Exception as e:
        return "", f"Could not read PDF: {e}"

    if pdf_reader.is_encrypted:
        return "", "This PDF is password-protected."

    text = ""
    for page in pdf_reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    text = text.strip()

    if not text:
        return "", "Could not extract any text from this PDF (it may be a scanned image)."

    return text, None


def call_gemini_api(prompt, max_retries=MAX_RETRIES):
    """
    Send a prompt to Google Gemini API and return the response.
    Retries with exponential backoff on rate-limit / transient errors.
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)],
                ),
            ]
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
            )
            if not response.text:
                raise ValueError("Empty response from model")
            return response.text
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            is_transient = any(k in error_str for k in ["429", "rate limit", "resource_exhausted", "unavailable", "timeout", "503"])
            if is_transient and attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            break
    return f"API Error: {last_error}"


def generate_fit_score(cv_text, jd_text):
    """Generate a fit score (0-100) comparing CV against Job Description."""
    prompt = f"""You are an expert recruiter assistant. Analyze how well this CV matches the job description.

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

Use proper markdown with headers (##, ###), bold (**text**), and bullet points (-). Keep it well-structured and readable. Do not use emoji."""

    return call_gemini_api(prompt)


def generate_candidate_snapshot(cv_text):
    """Extract structured candidate information from CV."""
    prompt = f"""You are a CV parsing expert. Extract key information from this CV into a structured format.

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

If any field is not found in the CV, use null for single values or empty array [] for lists."""

    return call_gemini_api(prompt)


def generate_interview_kit(cv_text, jd_text):
    """Generate role-specific interview questions based on CV and JD."""
    prompt = f"""You are a senior hiring manager. Create an interview kit for this candidate.

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

Use proper markdown formatting with headers, bold text, and horizontal rules (---) for clear separation. Do not use emoji."""

    return call_gemini_api(prompt)


def parse_json_safely(json_string):
    """
    Safely parse JSON from API response, handling common issues like
    markdown code fences or stray text around the JSON object.
    """
    cleaned = json_string.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned), None
    except json.JSONDecodeError:
        pass

    # Fallback: extract the first {...} block in case the model added extra text
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0)), None
        except json.JSONDecodeError as e:
            return None, str(e)

    return None, "No JSON object found in response"


def extract_fit_score(fit_score_text):
    """Extract the numeric fit score from the fit-score markdown result."""
    match = re.search(r"FIT SCORE:\s*(\d+)", fit_score_text or "", re.IGNORECASE)
    return int(match.group(1)) if match else None


def extract_verdict(fit_score_text):
    """Extract the verdict label (Strong/Moderate/Weak Fit) from the fit-score result."""
    match = re.search(r"\*\*\s*(Strong Fit|Moderate Fit|Weak Fit)", fit_score_text or "", re.IGNORECASE)
    return match.group(1).title() if match else None


def score_tier(score):
    """Return 'high' / 'mid' / 'low' bucket for a 0-100 score."""
    if score is None:
        return "mid"
    if score >= 75:
        return "high"
    if score >= 50:
        return "mid"
    return "low"


def candidate_display_name(candidate):
    """Prefer the parsed candidate name; fall back to the uploaded filename."""
    snapshot = candidate.get("snapshot_json") or {}
    name = snapshot.get("name")
    if name and name.strip().lower() not in ("n/a", "null", "none"):
        return name.strip()
    return candidate["filename"]


def build_candidate_csv(data):
    """Build a properly escaped CSV row for a single candidate snapshot."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Name", "Email", "Phone", "Current Role", "Company", "Experience", "Skills"])
    writer.writerow([
        data.get("name", ""),
        data.get("email", ""),
        data.get("phone", ""),
        data.get("current_role", ""),
        data.get("current_company", ""),
        data.get("experience_years", ""),
        ", ".join(data.get("skills", []) or []),
    ])
    return buffer.getvalue()


def build_ranking_csv(ranked_candidates):
    """Build a CSV export of the full ranked candidate list."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Rank", "Name", "Score", "Verdict", "Email", "Current Role", "Company", "Skills"])
    for rank, c in enumerate(ranked_candidates, start=1):
        snap = c.get("snapshot_json") or {}
        writer.writerow([
            rank,
            candidate_display_name(c),
            c["score"] if c["score"] is not None else "",
            c["verdict"] or "",
            snap.get("email", ""),
            snap.get("current_role", ""),
            snap.get("current_company", ""),
            ", ".join(snap.get("skills", []) or []),
        ])
    return buffer.getvalue()


def reset_analysis():
    """Clear analysis results and force the file uploader to reset."""
    st.session_state.analysis_complete = False
    st.session_state.candidates = []
    st.session_state.uploader_key = st.session_state.get("uploader_key", 0) + 1


def render_candidate_report(candidate, jd_text, key_prefix):
    """Render the full Fit Score / Snapshot / Interview Kit report for one candidate."""
    tab1, tab2, tab3 = st.tabs([
        "Fit Score & Evidence",
        "Candidate Snapshot",
        "Interview Kit"
    ])

    # -------------------------------------------------------------------------
    # TAB 1: FIT SCORE
    # -------------------------------------------------------------------------
    with tab1:
        fit_result = candidate["fit_score_raw"]

        if fit_result.startswith("API Error:"):
            st.error(fit_result)
        else:
            score = candidate["score"]
            tier = candidate["tier"]
            verdict = candidate["verdict"]

            score_col, detail_col = st.columns([1, 3])
            with score_col:
                st.markdown(
                    f'<div class="score-badge {tier}">{score if score is not None else "?"}</div>',
                    unsafe_allow_html=True
                )
                if verdict:
                    st.markdown(
                        f'<div style="text-align:center"><span class="verdict-pill {tier}">{verdict}</span></div>',
                        unsafe_allow_html=True
                    )

            with detail_col:
                st.subheader("JD <-> CV Fit Analysis")
                body = re.sub(r"^##\s*FIT SCORE:.*\n?", "", fit_result, flags=re.IGNORECASE).strip()
                st.markdown(body)

    # -------------------------------------------------------------------------
    # TAB 2: CANDIDATE SNAPSHOT
    # -------------------------------------------------------------------------
    with tab2:
        st.subheader("Structured Candidate Profile")

        if candidate["snapshot_json"]:
            data = candidate["snapshot_json"]

            col1, col2 = st.columns(2)

            with col1:
                st.markdown('<div class="snapshot-card">', unsafe_allow_html=True)
                st.markdown('<span class="section-label">Basic Info</span>', unsafe_allow_html=True)
                st.write(f"**Name:** {data.get('name', 'N/A')}")
                st.write(f"**Email:** {data.get('email', 'N/A')}")
                st.write(f"**Phone:** {data.get('phone', 'N/A')}")
                st.write(f"**LinkedIn:** {data.get('linkedin', 'N/A')}")
                st.markdown('<span class="section-label" style="margin-top:14px">Current Position</span>', unsafe_allow_html=True)
                st.write(f"**Role:** {data.get('current_role', 'N/A')}")
                st.write(f"**Company:** {data.get('current_company', 'N/A')}")
                st.write(f"**Experience:** {data.get('experience_years', 'N/A')} years")
                st.markdown('</div>', unsafe_allow_html=True)

            with col2:
                st.markdown('<div class="snapshot-card">', unsafe_allow_html=True)
                st.markdown('<span class="section-label">Skills</span>', unsafe_allow_html=True)
                skills = data.get('skills', []) or []
                if skills:
                    pills = "".join(f'<span class="skill-pill">{s}</span>' for s in skills)
                    st.markdown(pills, unsafe_allow_html=True)
                else:
                    st.write("N/A")
                st.markdown('<span class="section-label" style="margin-top:14px">Tools &amp; Technologies</span>', unsafe_allow_html=True)
                tools = data.get('tools_technologies', []) or []
                if tools:
                    pills = "".join(f'<span class="skill-pill">{t}</span>' for t in tools)
                    st.markdown(pills, unsafe_allow_html=True)
                else:
                    st.write("N/A")
                st.markdown('<span class="section-label" style="margin-top:14px">Education</span>', unsafe_allow_html=True)
                education = data.get('education', []) or []
                if education:
                    for edu in education:
                        st.write(f"- {edu.get('degree', '')} - {edu.get('institution', '')} ({edu.get('year', '')})")
                else:
                    st.write("N/A")
                st.markdown('</div>', unsafe_allow_html=True)

            st.markdown('<span class="section-label">Summary</span>', unsafe_allow_html=True)
            st.info(data.get('summary', 'N/A'))

            st.markdown('<span class="section-label">Key Achievements</span>', unsafe_allow_html=True)
            achievements = data.get('key_achievements', []) or []
            if achievements:
                for ach in achievements:
                    st.write(f"- {ach}")
            else:
                st.write("N/A")

            st.divider()

            st.subheader("Export Data")
            col1, col2 = st.columns(2)

            with col1:
                json_str = json.dumps(data, indent=2, ensure_ascii=False)
                st.download_button(
                    label="Download JSON",
                    data=json_str,
                    file_name="candidate_profile.json",
                    mime="application/json",
                    key=f"{key_prefix}_dl_json"
                )

            with col2:
                csv_data = build_candidate_csv(data)
                st.download_button(
                    label="Download CSV",
                    data=csv_data,
                    file_name="candidate_profile.csv",
                    mime="text/csv",
                    key=f"{key_prefix}_dl_csv"
                )

        elif candidate["snapshot_raw"].startswith("API Error:"):
            st.error(candidate["snapshot_raw"])
        else:
            st.warning("Could not parse structured data. Showing raw response:")
            st.text(candidate["snapshot_raw"])

    # -------------------------------------------------------------------------
    # TAB 3: INTERVIEW KIT (generated on demand)
    # -------------------------------------------------------------------------
    with tab3:
        if candidate["interview_kit_raw"] is None:
            st.info("Not generated yet — saves API calls in batch mode.")
            if st.button("Generate Interview Kit", key=f"{key_prefix}_gen_kit"):
                with st.spinner("Generating interview questions..."):
                    candidate["interview_kit_raw"] = generate_interview_kit(candidate["cv_text"], jd_text)
                st.rerun()
        else:
            kit_result = candidate["interview_kit_raw"]
            if kit_result.startswith("API Error:"):
                st.error(kit_result)
                if st.button("Retry", key=f"{key_prefix}_retry_kit"):
                    candidate["interview_kit_raw"] = None
                    st.rerun()
            else:
                st.subheader("Interview Preparation Kit")
                st.markdown(kit_result)
                st.divider()
                st.download_button(
                    label="Download Interview Kit",
                    data=kit_result,
                    file_name="interview_kit.txt",
                    mime="text/plain",
                    key=f"{key_prefix}_dl_kit"
                )


# =============================================================================
# UI COMPONENTS
# =============================================================================

st.markdown('<span class="eyebrow">AI-Powered Candidate Screening</span>', unsafe_allow_html=True)
st.title("HireLens")
st.markdown("**Recruiter's Smart Screening Assistant**")
st.caption("Processed in-memory only. Nothing is stored.")
st.divider()

# =============================================================================
# SIDEBAR - INPUTS
# =============================================================================

if "uploader_key" not in st.session_state:
    st.session_state.uploader_key = 0

with st.sidebar:
    st.header("Step 1: Upload CV(s)")
    uploaded_files = st.file_uploader(
        "Upload candidate CV(s) (PDF)",
        type=["pdf"],
        accept_multiple_files=True,
        help="One CV for a full report, several to rank them",
        key=f"cv_uploader_{st.session_state.uploader_key}"
    )

    too_many_files = bool(uploaded_files) and len(uploaded_files) > MAX_BATCH_SIZE

    if uploaded_files:
        if too_many_files:
            st.error(f"Too many files — max {MAX_BATCH_SIZE} CVs per batch.")
        else:
            total_kb = sum(f.size for f in uploaded_files) / 1024
            st.success(f"{len(uploaded_files)} CV(s) selected ({total_kb:.0f} KB)")

    st.divider()

    st.header("Step 2: Paste Job Description")
    jd_text = st.text_area(
        "Job Description",
        height=200,
        placeholder="Paste the job description here...\n\nExample:\nWe are looking for a Software Engineer with 3+ years of Python experience...",
        help="Full JD gives more accurate matching"
    )

    st.divider()

    st.header("Step 3: Analyze")
    analyze_button = st.button(
        "Run Analysis",
        type="primary",
        use_container_width=True,
        disabled=not (uploaded_files and not too_many_files and jd_text.strip())
    )

    if not uploaded_files:
        st.caption("Upload at least one CV to continue")
    elif too_many_files:
        st.caption(f"Remove some files — max {MAX_BATCH_SIZE} per batch")
    elif not jd_text.strip():
        st.caption("Paste a job description")

    if st.session_state.get("analysis_complete"):
        st.divider()
        if st.button("Analyze New Batch", use_container_width=True):
            reset_analysis()
            st.rerun()

# =============================================================================
# MAIN CONTENT - ANALYSIS RESULTS
# =============================================================================

if "analysis_complete" not in st.session_state:
    st.session_state.analysis_complete = False
    st.session_state.candidates = []

if analyze_button and uploaded_files and not too_many_files and jd_text.strip():

    candidates = []
    total = len(uploaded_files)
    progress_bar = st.progress(0, text="Starting analysis...")

    for i, uploaded_file in enumerate(uploaded_files):
        progress_bar.progress(
            int((i / total) * 100),
            text=f"Analyzing {i + 1}/{total}: {uploaded_file.name}"
        )

        candidate = {
            "filename": uploaded_file.name,
            "cv_text": "",
            "fit_score_raw": "",
            "score": None,
            "tier": "mid",
            "verdict": None,
            "snapshot_raw": "",
            "snapshot_json": None,
            "interview_kit_raw": None,
            "error": None,
        }

        if uploaded_file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
            candidate["error"] = f"File too large (max {MAX_FILE_SIZE_MB}MB)"
            candidates.append(candidate)
            continue

        cv_text, extract_error = extract_text_from_pdf(uploaded_file)
        if extract_error:
            candidate["error"] = extract_error
            candidates.append(candidate)
            continue

        candidate["cv_text"] = cv_text

        fit_raw = generate_fit_score(cv_text, jd_text)
        candidate["fit_score_raw"] = fit_raw
        if not fit_raw.startswith("API Error:"):
            candidate["score"] = extract_fit_score(fit_raw)
            candidate["tier"] = score_tier(candidate["score"])
            candidate["verdict"] = extract_verdict(fit_raw)

        snapshot_raw = generate_candidate_snapshot(cv_text)
        candidate["snapshot_raw"] = snapshot_raw
        parsed_json, _ = parse_json_safely(snapshot_raw)
        candidate["snapshot_json"] = parsed_json

        candidates.append(candidate)

    progress_bar.progress(100, text="Analysis complete.")
    progress_bar.empty()

    st.session_state.candidates = candidates
    st.session_state.analysis_complete = True

if st.session_state.analysis_complete:

    all_candidates = st.session_state.candidates
    valid_candidates = [c for c in all_candidates if not c.get("error")]
    failed_candidates = [c for c in all_candidates if c.get("error")]

    if failed_candidates:
        with st.expander(f"{len(failed_candidates)} file(s) could not be processed"):
            for c in failed_candidates:
                st.write(f"**{c['filename']}:** {c['error']}")

    if not valid_candidates:
        st.error("No candidates could be analyzed. Check the files above and try again.")

    elif len(valid_candidates) == 1:
        render_candidate_report(valid_candidates[0], jd_text, key_prefix="c0")

    else:
        ranked = sorted(
            valid_candidates,
            key=lambda c: c["score"] if c["score"] is not None else -1,
            reverse=True
        )

        st.subheader(f"Candidate Ranking ({len(ranked)} analyzed)")

        table_rows = [
            {
                "Rank": rank,
                "Candidate": candidate_display_name(c),
                "Score": c["score"] if c["score"] is not None else 0,
                "Verdict": c["verdict"] or "—",
                "Current Role": (c.get("snapshot_json") or {}).get("current_role") or "—",
                "Email": (c.get("snapshot_json") or {}).get("email") or "—",
            }
            for rank, c in enumerate(ranked, start=1)
        ]

        st.dataframe(
            table_rows,
            use_container_width=True,
            hide_index=True,
            column_config={
                "Score": st.column_config.ProgressColumn("Score", min_value=0, max_value=100, format="%d"),
            },
        )

        st.download_button(
            "Download Ranking (CSV)",
            data=build_ranking_csv(ranked),
            file_name="candidate_ranking.csv",
            mime="text/csv",
        )

        st.divider()

        names = [candidate_display_name(c) for c in ranked]
        selected_name = st.selectbox("View full report for:", names)
        selected_index = names.index(selected_name)
        selected_candidate = ranked[selected_index]

        render_candidate_report(selected_candidate, jd_text, key_prefix=f"c{selected_index}")

else:
    st.info("**Get started:** upload CVs and a job description in the sidebar, then run analysis.")

    st.markdown("### What you'll get")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown(
            '<div class="snapshot-card"><span class="section-label">Fit Score</span>'
            '<p>Evidence-based 0-100 score.</p></div>',
            unsafe_allow_html=True
        )

    with col2:
        st.markdown(
            '<div class="snapshot-card"><span class="section-label">Candidate Snapshot</span>'
            '<p>Full profile, exportable as JSON/CSV.</p></div>',
            unsafe_allow_html=True
        )

    with col3:
        st.markdown(
            '<div class="snapshot-card"><span class="section-label">Interview Kit</span>'
            '<p>6 questions, 2 clarifications.</p></div>',
            unsafe_allow_html=True
        )

    with col4:
        st.markdown(
            '<div class="snapshot-card"><span class="section-label">Batch Ranking</span>'
            '<p>CVs ranked by fit score.</p></div>',
            unsafe_allow_html=True
        )

# =============================================================================
# FOOTER
# =============================================================================

st.divider()
st.caption("HireLens • 2025")
