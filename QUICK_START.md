> **Historical reference:** This guide may describe an earlier version. For the current HireLens application, use the [README](README.md) and [deployment guide](docs/DEPLOYMENT.md).

# ⚡ Quick Start Guide - CV Analyzer Pro

> ⚠️ **Outdated.** This document describes the original Streamlit prototype, which now lives in
> [`legacy/`](legacy/). The current project is a FastAPI backend + React frontend — see
> [README.md](README.md) for setup and usage.

Get started in 5 minutes or less!

## 🎯 Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Python 3.9 or higher installed
- [ ] Google account (for Gemini API key)
- [ ] PDF CV file ready for testing
- [ ] Job description prepared

## 🚀 Installation (5 Steps)

### Step 1: Get the Code
```bash
# Clone or download the repository
git clone https://github.com/YOUR_USERNAME/cv-analyzer-pro.git
cd cv-analyzer-pro
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Get API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the generated key

### Step 4: Configure Environment
```bash
# Create .env file
cp .env.example .env

# Open .env and paste your API key
# On Linux/Mac:
nano .env

# On Windows:
notepad .env
```

Add this line with your actual key:
```
GOOGLE_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

### Step 5: Run Application
```bash
streamlit run app.py
```

The app will open automatically at `http://localhost:8501`

## 📱 Using the Application

### Upload and Analyze (3 Steps)

1. **Upload CV**
   - Click "Browse files" in sidebar
   - Select PDF resume
   - Wait for "✅ CV loaded" message

2. **Paste Job Description**
   - Scroll to "Step 2" in sidebar
   - Paste full job description
   - Include all requirements

3. **Run Analysis**
   - Click "⚡ Run Full Analysis" button
   - Wait ~30-60 seconds
   - View results in tabs

### Understanding Results

#### Tab 1: Fit Score (📊)
- **Score**: 0-100 match percentage
- **Matched Requirements**: What candidate has
- **Gaps**: What's missing
- **Verdict**: Hiring recommendation

#### Tab 2: Candidate Snapshot (👤)
- **Profile Data**: Name, contact, experience
- **Skills**: Technical and soft skills
- **Export**: Download as JSON or CSV

#### Tab 3: Interview Kit (📝)
- **Questions**: 6 role-specific questions
- **Rubrics**: What to look for in answers
- **Clarifications**: Questions about gaps
- **Download**: Save as text file

## 🧪 Test with Sample Data

Use provided sample files:

1. **Sample CV**: See `sample_cv.txt` for reference
   - Create a PDF with this content OR
   - Use your own CV for testing

2. **Sample JD**: Copy from `sample_jd.txt`
   - Paste into the Job Description field
   - Or use a real job posting

## 🆘 Common Issues

### Issue: "API Key not found"
**Solution**: 
```bash
# Make sure .env file exists
ls -la .env

# Check contents
cat .env

# Should show:
GOOGLE_API_KEY=your_actual_key
```

### Issue: "Could not extract text from PDF"
**Solution**: 
- Ensure PDF is text-based (not scanned image)
- Try re-saving PDF
- Check PDF is not password-protected

### Issue: Dependencies installation fails
**Solution**:
```bash
# Upgrade pip first
pip install --upgrade pip

# Retry installation
pip install -r requirements.txt
```

### Issue: Port 8501 in use
**Solution**:
```bash
# Use different port
streamlit run app.py --server.port 8502
```

## 🎓 Learning Path

### Beginners
1. ✅ Install and run locally (this guide)
2. ✅ Test with sample data
3. ✅ Analyze real CV
4. 📖 Read README.md for features

### Intermediate
1. ✅ Complete beginner steps
2. 🔧 Customize prompts in `app.py`
3. 🎨 Modify UI layout
4. 📖 Read DOCUMENTATION.md

### Advanced
1. ✅ Complete intermediate steps
2. 🚀 Deploy to cloud (see SETUP.md)
3. 🔌 Add new features
4. 🤝 Contribute (see CONTRIBUTING.md)

## 📚 Where to Go Next

| Goal | Resource |
|------|----------|
| Deploy to cloud | `SETUP.md` |
| Understand code | `DOCUMENTATION.md` |
| Contribute | `CONTRIBUTING.md` |
| See all features | `README.md` |
| Report issues | GitHub Issues |

## 🎉 Success Checklist

After completing this guide, you should be able to:

- [ ] Run application locally
- [ ] Upload CV and get analysis
- [ ] View fit score with evidence
- [ ] Export candidate data
- [ ] Generate interview questions
- [ ] Understand basic troubleshooting

## 💡 Pro Tips

1. **Better Results**:
   - Use detailed job descriptions
   - Upload text-based PDFs
   - Review AI suggestions critically

2. **Faster Analysis**:
   - Keep JD concise but complete
   - Use consistent formatting
   - Close other browser tabs

3. **Organized Workflow**:
   - Export candidate data regularly
   - Save interview kits for reference
   - Document your hiring decisions

## 🔗 Helpful Links

- **Streamlit Docs**: https://docs.streamlit.io/
- **Google Gemini**: https://ai.google.dev/
- **Get API Key**: https://aistudio.google.com/app/apikey
- **GitHub Issues**: https://github.com/YOUR_USERNAME/cv-analyzer-pro/issues

## 📧 Need Help?

- Create an issue on GitHub
- Check SETUP.md for detailed troubleshooting
- Review DOCUMENTATION.md for technical details

---

**Estimated Time**: 5 minutes to install, 1 minute per CV to analyze

**Ready to start? Run:** `streamlit run app.py`
