# Changelog

All notable changes to CV Analyzer Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-22

### Added
- Initial release of CV Analyzer Pro
- PDF CV upload and text extraction functionality
- Job description input via text area
- AI-powered fit score analysis (0-100 scale)
- Structured candidate profile extraction
- Interview kit generation with 6 questions + 2 clarifications
- Export functionality (JSON and CSV for candidate data)
- Three-tab results interface
- Progress tracking during analysis
- Comprehensive documentation (README, SETUP, CONTRIBUTING)
- MIT License
- Sample CV and JD for testing
- GitHub Actions CI workflow
- Security best practices (.env, .gitignore)

### Features
- **Fit Score Analysis**: Evidence-based matching with gap identification
- **Candidate Snapshot**: Structured data extraction from unstructured CVs
- **Interview Kit**: Role-specific questions with evaluation rubrics
- **Export Options**: JSON and CSV downloads
- **User-Friendly UI**: Clean Streamlit interface with progress indicators

### Technical Stack
- Streamlit for web interface
- Google Gemini Flash Lite for AI analysis
- PyPDF2 for PDF processing
- Python-dotenv for environment management
- Python 3.9 runtime

### Documentation
- Comprehensive README with features and quick start
- Detailed SETUP guide with deployment options
- CONTRIBUTING guidelines for developers
- Full DOCUMENTATION of architecture and features
- Sample files for testing

## [Unreleased]

### Planned Features
- Multi-language support
- Word document (.docx) support
- Batch CV processing
- Advanced filtering and search
- ATS integration APIs
- Email notification system
- Candidate comparison dashboard
- Custom scoring criteria
- Historical analysis tracking

---

## Version Guidelines

- **Major version (X.0.0)**: Breaking changes, major features
- **Minor version (0.X.0)**: New features, backwards compatible
- **Patch version (0.0.X)**: Bug fixes, minor improvements

## How to Update

When releasing a new version:

1. Update this CHANGELOG.md
2. Tag the commit: `git tag -a v1.0.0 -m "Release version 1.0.0"`
3. Push tags: `git push origin --tags`
4. Create GitHub release with release notes
