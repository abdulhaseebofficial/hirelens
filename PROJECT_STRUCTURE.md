> **Historical reference:** This guide may describe an earlier version. For the current HireLens application, use the [README](README.md) and [deployment guide](docs/DEPLOYMENT.md).

# 📁 CV Analyzer Pro - Project Structure

> ⚠️ **Outdated.** This document describes the original Streamlit prototype, which now lives in
> [`legacy/`](legacy/). The current project is a FastAPI backend + React frontend — see
> [README.md](README.md) for setup and usage.

Complete overview of the repository structure and file organization.

```
cv-analyzer-pro/
│
├── 📄 app.py                          # Main Streamlit application
│   ├── PDF text extraction
│   ├── Google Gemini API integration
│   ├── Three analysis functions
│   └── Streamlit UI components
│
├── 📄 requirements.txt                # Python dependencies
│   ├── streamlit
│   ├── pandas
│   ├── numpy
│   ├── PyPDF2
│   ├── google-genai
│   └── python-dotenv
│
├── 📄 runtime.txt                     # Python version specification
│   └── python-3.9
│
├── 🔒 .env.example                    # Environment variables template
│   └── GOOGLE_API_KEY placeholder
│
├── 🚫 .gitignore                      # Git ignore rules
│   ├── .env (protected)
│   ├── Python cache files
│   ├── Virtual environments
│   └── IDE files
│
├── 📖 README.md                       # Main project documentation
│   ├── Features overview
│   ├── Quick start guide
│   ├── Installation instructions
│   └── Usage examples
│
├── 🔧 SETUP.md                        # Detailed setup & deployment
│   ├── Local development setup
│   ├── Environment configuration
│   ├── Deployment options (5 platforms)
│   └── Troubleshooting guide
│
├── 🤝 CONTRIBUTING.md                 # Contribution guidelines
│   ├── How to report bugs
│   ├── Feature request process
│   ├── Pull request workflow
│   └── Code style guidelines
│
├── 📚 DOCUMENTATION.md                # Technical documentation
│   ├── Architecture overview
│   ├── Feature breakdown
│   ├── API integration details
│   ├── Customization guide
│   └── Best practices
│
├── 📜 LICENSE                         # MIT License
│   └── Open source license terms
│
├── 📝 CHANGELOG.md                    # Version history
│   ├── Current version (1.0.0)
│   ├── Release notes
│   └── Planned features
│
├── 📄 sample_cv.txt                   # Sample CV for testing
│   └── Example candidate profile
│
├── 📄 sample_jd.txt                   # Sample job description
│   └── Example job posting
│
├── 📄 PROJECT_STRUCTURE.md            # This file
│   └── Repository organization guide
│
└── .github/                           # GitHub-specific files
    └── workflows/
        └── ci.yml                     # GitHub Actions workflow
            ├── Python setup
            ├── Dependency installation
            └── Basic testing
```

## 📂 File Descriptions

### Core Application Files

| File | Purpose | Editable |
|------|---------|----------|
| `app.py` | Main application logic | Yes |
| `requirements.txt` | Python dependencies | Yes (when adding packages) |
| `runtime.txt` | Python version for deployment | Yes (for version changes) |
| `.env.example` | Template for environment setup | Yes |

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Quick start & overview | All users |
| `SETUP.md` | Installation & deployment | Developers/DevOps |
| `CONTRIBUTING.md` | Contribution guidelines | Contributors |
| `DOCUMENTATION.md` | Technical details | Developers |
| `CHANGELOG.md` | Version history | All users |
| `LICENSE` | Legal terms | All users |
| `PROJECT_STRUCTURE.md` | Repo organization | Developers |

### Configuration Files

| File | Purpose | Version Control |
|------|---------|-----------------|
| `.env` | Actual API keys | ❌ Never commit |
| `.env.example` | API key template | ✅ Commit |
| `.gitignore` | Files to exclude | ✅ Commit |

### Testing & CI/CD

| File | Purpose | Platform |
|------|---------|----------|
| `.github/workflows/ci.yml` | Automated testing | GitHub Actions |
| `sample_cv.txt` | Test data | All |
| `sample_jd.txt` | Test data | All |

## 🔄 Workflow

### Development Workflow

```
1. Clone repository
   ↓
2. Create .env from .env.example
   ↓
3. Install dependencies (requirements.txt)
   ↓
4. Run application (streamlit run app.py)
   ↓
5. Make changes to app.py
   ↓
6. Test locally
   ↓
7. Commit & push to GitHub
   ↓
8. GitHub Actions runs CI
   ↓
9. Deploy to production
```

### Deployment Workflow

```
Local Development → GitHub → CI/CD → Production
     ↓                ↓         ↓         ↓
   app.py         .github/   Tests    Streamlit Cloud
requirements.txt   workflows/         Heroku
   .env                              AWS/DigitalOcean
```

## 🗂️ Directory Purpose

### Root Directory (`/`)
- Contains main application files
- Configuration files
- Documentation
- Sample data

### `.github/` Directory
- GitHub-specific configurations
- Automated workflows (CI/CD)
- Issue templates (if added)
- Pull request templates (if added)

## 📊 File Size Overview

| Category | Approx. Size |
|----------|--------------|
| Application code (`app.py`) | ~18 KB |
| Documentation | ~50 KB total |
| Dependencies (installed) | ~500 MB |
| Sample files | ~5 KB |
| Total repository | ~75 KB (excluding node_modules/venv) |

## 🔐 Security Files

| File | Security Level | Notes |
|------|----------------|-------|
| `.env` | 🔴 Critical | Never share or commit |
| `.env.example` | 🟢 Safe | Template only, no secrets |
| `app.py` | 🟡 Review | Check before committing |
| `.gitignore` | 🟢 Safe | Protects sensitive files |

## 📝 Maintenance Checklist

### Regular Updates

- [ ] Keep `requirements.txt` updated
- [ ] Update `CHANGELOG.md` for new versions
- [ ] Review and update documentation
- [ ] Test with latest Python version
- [ ] Check for security vulnerabilities

### Before Each Release

- [ ] Update version in `CHANGELOG.md`
- [ ] Test all features
- [ ] Update documentation if needed
- [ ] Create Git tag
- [ ] Push to GitHub
- [ ] Create GitHub release

## 🎯 Quick Navigation

| Need to... | Check this file |
|------------|-----------------|
| Understand features | `README.md` |
| Install locally | `SETUP.md` |
| Deploy to cloud | `SETUP.md` |
| Contribute code | `CONTRIBUTING.md` |
| Understand architecture | `DOCUMENTATION.md` |
| See version history | `CHANGELOG.md` |
| Check license | `LICENSE` |
| Configure environment | `.env.example` |
| Modify application | `app.py` |
| Test the app | `sample_cv.txt` + `sample_jd.txt` |

## 🚀 Getting Started Paths

### For Users (Non-Technical)
1. Read `README.md`
2. Follow Quick Start section
3. Use sample files to test

### For Developers
1. Read `README.md`
2. Follow `SETUP.md` for local setup
3. Review `DOCUMENTATION.md` for architecture
4. Check `CONTRIBUTING.md` before making changes

### For DevOps
1. Read `README.md`
2. Review deployment options in `SETUP.md`
3. Configure CI/CD using `.github/workflows/ci.yml`
4. Set up environment variables

### For Contributors
1. Read `README.md`
2. Follow `SETUP.md` for local development
3. Review `CONTRIBUTING.md` guidelines
4. Check `DOCUMENTATION.md` for implementation details

---

**Last Updated**: January 2025  
**Maintained By**: CV Analyzer Pro Team
