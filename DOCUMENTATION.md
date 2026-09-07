> **Historical reference:** This guide may describe an earlier version. For the current HireLens application, use the [README](README.md) and [deployment guide](docs/DEPLOYMENT.md).

# 📚 CV Analyzer Pro - Documentation

> ⚠️ **Outdated.** This document describes the original Streamlit prototype, which now lives in
> [`legacy/`](legacy/). The current project is a FastAPI backend + React frontend — see
> [README.md](README.md) for setup and usage.

## Overview

CV Analyzer Pro is an AI-powered recruitment tool that helps hiring managers and recruiters efficiently screen candidates by analyzing CVs against job descriptions.

## Core Components

### 1. PDF Text Extraction
- Uses PyPDF2 library
- Extracts text from all pages
- Handles multi-page CVs
- Error handling for corrupted files

### 2. AI-Powered Analysis
- Powered by Google Gemini Flash Lite
- Three main analysis functions:
  - Fit Score Generation
  - Candidate Profile Extraction
  - Interview Kit Creation

### 3. User Interface
- Built with Streamlit
- Responsive three-column layout
- Tabbed results display
- Real-time progress tracking

## Features Breakdown

### 📊 Fit Score Analysis

**Purpose**: Quantify how well a candidate matches job requirements

**Output**:
- Numerical score (0-100)
- List of matched requirements with evidence
- Identified gaps and weaknesses
- Overall hiring recommendation

**Use Cases**:
- Quick candidate screening
- Shortlisting for interviews
- Comparing multiple candidates
- Justifying hiring decisions

### 👤 Candidate Snapshot

**Purpose**: Extract structured information from unstructured CVs

**Extracted Fields**:
- Personal Info (name, email, phone, LinkedIn)
- Professional (current role, company, experience)
- Skills & Technologies
- Education history
- Key achievements
- Languages

**Export Options**:
- JSON format (for ATS integration)
- CSV format (for spreadsheets)

**Use Cases**:
- Building candidate database
- ATS integration
- Quick reference during interviews
- Bulk candidate processing

### 📝 Interview Kit

**Purpose**: Generate customized interview questions

**Components**:
- 6 role-specific questions
- Evaluation rubrics per question
- 2 clarification questions for gaps
- Red flags and risk areas

**Question Categories**:
1. Experience verification
2. Technical skills assessment
3. Project deep-dive
4. Behavioral evaluation
5. Problem-solving ability
6. Culture fit

**Use Cases**:
- Interview preparation
- Standardized evaluation
- Panel interview coordination
- Skill assessment

## Technical Architecture

### Data Flow

```
1. User uploads CV (PDF)
   ↓
2. PyPDF2 extracts text
   ↓
3. User provides Job Description
   ↓
4. Streamlit triggers analysis
   ↓
5. Three parallel API calls to Gemini:
   - Fit Score analysis
   - Profile extraction
   - Interview questions
   ↓
6. Results displayed in tabs
   ↓
7. User can export data
```

### API Integration

**Google Gemini API**:
- Model: `gemini-flash-lite-latest`
- Authentication: API key via environment variable
- Request format: Text prompts with structured output requirements
- Response parsing: Markdown and JSON formats

### Security Considerations

**Environment Variables**:
- API keys stored in `.env` file
- Never committed to version control
- Loaded via python-dotenv

**Data Privacy**:
- CVs processed in-memory only
- No permanent storage
- No data sent to third parties (except Google API)
- Session-based data cleared on browser close

## Customization Guide

### Modifying Prompts

All AI prompts are in `app.py` in these functions:
- `generate_fit_score()` - line 106
- `generate_candidate_snapshot()` - line 142
- `generate_interview_kit()` - line 176

**Tips**:
- Be specific about output format
- Include examples in prompts
- Request structured responses (JSON, Markdown)
- Test changes with sample CVs

### Changing AI Model

Edit line 93 in `app.py`:
```python
model="models/gemini-flash-lite-latest",
```

Available alternatives:
- `gemini-1.5-pro` - More powerful, slower
- `gemini-1.5-flash` - Faster, lighter

### Adding New Features

**Example: Adding Salary Recommendation**

1. Create new function:
```python
def generate_salary_recommendation(cv_text, jd_text, location):
    prompt = f"""Analyze the CV and JD to recommend fair salary range...
    
    CV: {cv_text}
    JD: {jd_text}
    Location: {location}
    """
    return call_gemini_api(prompt)
```

2. Add UI element:
```python
location = st.text_input("Job Location")
```

3. Add to analysis workflow:
```python
st.session_state.salary_rec = generate_salary_recommendation(cv_text, jd_text, location)
```

4. Display in new tab:
```python
with tab4:
    st.markdown(st.session_state.salary_rec)
```

## Performance Optimization

### Current Performance
- PDF extraction: ~1-2 seconds
- AI analysis: ~30-60 seconds total
- Total time: ~1 minute per CV

### Optimization Strategies

1. **Batch Processing**: Process multiple CVs in parallel
2. **Caching**: Cache common JD analyses
3. **Model Selection**: Use lighter models for simple tasks
4. **Response Streaming**: Show results as they arrive
5. **Async Calls**: Make API calls asynchronously

### Scaling Considerations

For high-volume usage:
- Implement request queuing
- Use database for result caching
- Add rate limiting
- Consider dedicated API infrastructure
- Monitor API quota usage

## API Limits

**Google Gemini Free Tier**:
- 60 requests per minute
- 1500 requests per day
- Rate limiting applies

**Handling Limits**:
- Implement retry logic
- Add exponential backoff
- Show user-friendly error messages
- Consider paid tier for production

## Error Handling

### Common Errors

1. **PDF Extraction Failed**
   - Check if PDF is text-based
   - Verify file is not corrupted
   - Ensure file permissions

2. **API Key Invalid**
   - Verify key in `.env`
   - Check for typos
   - Regenerate if necessary

3. **Rate Limit Exceeded**
   - Wait before retrying
   - Implement queuing
   - Upgrade API plan

4. **JSON Parsing Failed**
   - AI didn't return valid JSON
   - Fallback to raw text display
   - Improve prompt clarity

## Best Practices

### For Recruiters

1. **Write detailed JDs**: More context = better analysis
2. **Review AI outputs**: Don't rely solely on scores
3. **Use as screening tool**: Not replacement for human judgment
4. **Export for records**: Save analyses for compliance
5. **Standardize process**: Use same JD format consistently

### For Developers

1. **Test with edge cases**: Unusual CV formats, languages
2. **Monitor API costs**: Track usage and optimize
3. **Version control prompts**: Document prompt changes
4. **Handle errors gracefully**: Never expose API errors to users
5. **Validate outputs**: Check AI responses make sense

## Maintenance

### Regular Tasks

- **Weekly**: Monitor API usage and costs
- **Monthly**: Review error logs, update dependencies
- **Quarterly**: Evaluate prompt effectiveness, gather user feedback
- **Yearly**: Major version updates, security audit

### Updating Dependencies

```bash
# Check for updates
pip list --outdated

# Update specific package
pip install --upgrade streamlit

# Update all
pip install -r requirements.txt --upgrade
```

## Support & Resources

- **Streamlit Docs**: https://docs.streamlit.io/
- **Google Gemini API**: https://ai.google.dev/docs
- **PyPDF2 Docs**: https://pypdf2.readthedocs.io/
- **Project Issues**: GitHub Issues section

---

**Last Updated**: January 2025  
**Version**: 1.0.0
