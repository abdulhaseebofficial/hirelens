#!/bin/bash

# CV Analyzer Pro - Git Repository Initialization Script
# This script initializes the Git repository and prepares it for GitHub

echo "🚀 CV Analyzer Pro - Repository Setup"
echo "======================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    echo "Visit: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Initialize Git repository
echo "📦 Initializing Git repository..."
git init

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
    echo "🔐 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit .env and add your Google API key!"
else
    echo "✅ .env file already exists"
fi

# Add all files to staging
echo "📝 Adding files to Git..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: CV Analyzer Pro v1.0.0

Features:
- PDF CV upload and text extraction
- AI-powered fit score analysis
- Structured candidate profile extraction
- Interview kit generation
- Export functionality (JSON/CSV)
- Comprehensive documentation

Built with Streamlit + Google Gemini API"

echo ""
echo "✅ Git repository initialized successfully!"
echo ""
echo "📋 Next Steps:"
echo "==============="
echo ""
echo "1. Create a new repository on GitHub:"
echo "   Visit: https://github.com/new"
echo "   Repository name: cv-analyzer-pro"
echo "   Description: AI-powered CV analysis tool for recruiters"
echo "   Keep it public or private as needed"
echo "   DO NOT initialize with README, .gitignore, or license"
echo ""
echo "2. Link your local repository to GitHub:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/cv-analyzer-pro.git"
echo ""
echo "3. Push your code to GitHub:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Configure secrets for deployment:"
echo "   - For Streamlit Cloud: Add GOOGLE_API_KEY in app settings"
echo "   - For Heroku: heroku config:set GOOGLE_API_KEY=your_key"
echo ""
echo "⚠️  CRITICAL REMINDERS:"
echo "   ✓ Add your Google API key to .env file"
echo "   ✓ Never commit the .env file (already in .gitignore)"
echo "   ✓ Review README.md and update with your information"
echo "   ✓ Test the application before deploying"
echo ""
echo "📚 Documentation:"
echo "   - README.md: Quick start guide"
echo "   - SETUP.md: Detailed installation & deployment"
echo "   - DOCUMENTATION.md: Technical details"
echo ""
echo "Happy coding! 🎉"
