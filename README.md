# 📋 CV Analyzer Pro

A powerful AI-driven CV analysis tool for recruiters and hiring managers. Streamline your hiring process with intelligent candidate screening, structured profile extraction, and auto-generated interview kits.

![Python](https://img.shields.io/badge/python-3.9-blue.svg)
![Streamlit](https://img.shields.io/badge/streamlit-latest-red.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Features

### 📊 **JD ↔ CV Fit Score**
- **0-100 Match Score**: Quantitative assessment of candidate-job alignment
- **Evidence-Based Matching**: Specific examples from CV supporting each requirement
- **Gap Analysis**: Clear identification of missing or weak areas
- **Actionable Verdict**: Strong/Moderate/Weak fit recommendation

### 👤 **Candidate Snapshot**
- **Structured Profile Extraction**: Automatic parsing of key information
- **Export Options**: Download as JSON or CSV for ATS integration
- **Comprehensive Data**: Name, contact, experience, skills, education, achievements
- **Clean Format**: Ready for database storage or further processing

### 📝 **Interview Kit Generator**
- **6 Role-Specific Questions**: Tailored to JD and candidate background
- **Evaluation Rubrics**: Clear criteria for strong answers
- **Clarification Questions**: Address gaps and concerns proactively
- **Red Flags & Risks**: Areas requiring deeper investigation
- **Downloadable Format**: Share with interview panel

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/cv-analyzer-pro.git
cd cv-analyzer-pro
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**

Create a `.env` file in the project root:
```bash
GOOGLE_API_KEY=your_api_key_here
```

⚠️ **Security Note**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

4. **Run the application**
```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`

## 📖 Usage Guide

### Step 1: Upload CV
- Click "Browse files" in the sidebar
- Select a PDF resume/CV
- Wait for text extraction confirmation

### Step 2: Paste Job Description
- Copy the full job description
- Paste into the text area in the sidebar
- Include all requirements, responsibilities, and qualifications

### Step 3: Analyze
- Click "⚡ Run Full Analysis" button
- Wait for AI processing (typically 30-60 seconds)
- View results in three organized tabs

### Step 4: Review Results

**Tab 1 - Fit Score**
- Review the overall match percentage
- Check matched requirements with evidence
- Identify gaps and weaknesses
- Read the hiring recommendation

**Tab 2 - Candidate Snapshot**
- View structured profile data
- Download JSON for ATS integration
- Download CSV for spreadsheet tracking
- Copy key information for notes

**Tab 3 - Interview Kit**
- Prepare role-specific questions
- Review evaluation rubrics
- Note clarification questions
- Identify potential red flags

## 🛠️ Tech Stack

- **Framework**: [Streamlit](https://streamlit.io/) - Modern Python web framework
- **AI Engine**: [Google Gemini](https://ai.google.dev/) - Advanced language model
- **PDF Processing**: [PyPDF2](https://pypdf2.readthedocs.io/) - PDF text extraction
- **Environment**: [python-dotenv](https://pypi.org/project/python-dotenv/) - Secure config management

## 📂 Project Structure

```
cv-analyzer-pro/
│
├── app.py                 # Main Streamlit application
├── requirements.txt       # Python dependencies
├── runtime.txt           # Python version specification
├── .env.example          # Example environment file
├── .gitignore            # Git ignore rules
├── README.md             # Project documentation
└── LICENSE               # MIT License
```

## 🔒 Security Best Practices

1. **API Key Protection**
   - Store API keys in `.env` file (never in code)
   - Add `.env` to `.gitignore`
   - Use environment variables for sensitive data

2. **Data Privacy**
   - CVs are processed in-memory only
   - No data is stored permanently
   - Complies with data protection regulations

3. **Version Control**
   - Never commit API keys or credentials
   - Use `.env.example` as template
   - Review commits before pushing

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues & Limitations

- **PDF Support**: Only PDF files are currently supported (no Word docs)
- **API Rate Limits**: Subject to Google Gemini API rate limits
- **Language**: Optimized for English CVs and job descriptions
- **Accuracy**: AI-generated analysis should be reviewed by human recruiters

## 🔮 Future Enhancements

- [ ] Support for Word documents (.docx)
- [ ] Multi-language support
- [ ] Batch processing for multiple CVs
- [ ] ATS integration APIs
- [ ] Custom scoring criteria
- [ ] Candidate ranking dashboard
- [ ] Email integration for automated responses

## 📧 Contact & Support

For questions, issues, or suggestions:

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/cv-analyzer-pro/issues)
- **Email**: your.email@example.com

## 🙏 Acknowledgments

- Built with [Streamlit](https://streamlit.io/)
- Powered by [Google Gemini AI](https://ai.google.dev/)
- Created as an Undergraduate Project 2025

---

**Made with ❤️ for recruiters who value quality over quantity**
