# 🔧 Setup & Deployment Guide

Complete guide for setting up CV Analyzer Pro locally and deploying to production.

## 📋 Table of Contents
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
- [Troubleshooting](#troubleshooting)

## 🖥️ Local Development Setup

### System Requirements
- Python 3.9 or higher
- pip (Python package manager)
- Git
- 2GB RAM minimum
- Internet connection (for API calls)

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/cv-analyzer-pro.git
cd cv-analyzer-pro
```

#### 2. Create Virtual Environment (Recommended)
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Set Up Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your Google API key
# Use any text editor
nano .env  # or vim, code, notepad, etc.
```

Add your API key:
```
GOOGLE_API_KEY=your_actual_api_key_here
```

#### 5. Run the Application
```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`

## 🔑 Environment Configuration

### Getting Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Paste it in your `.env` file

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |

## 🚀 Deployment Options

### Option 1: Streamlit Cloud (Recommended)

**Pros**: Free, easy, automatic HTTPS, no server management

**Steps**:
1. Push code to GitHub
2. Visit [share.streamlit.io](https://share.streamlit.io)
3. Connect your GitHub account
4. Select repository and branch
5. Add secrets (API key) in settings
6. Deploy!

**Adding Secrets**:
- Go to app settings
- Navigate to "Secrets" section
- Add:
  ```toml
  GOOGLE_API_KEY = "your_api_key_here"
  ```

### Option 2: Heroku

**Steps**:
1. Install Heroku CLI
2. Create `setup.sh`:
   ```bash
   mkdir -p ~/.streamlit/
   echo "\
   [server]\n\
   headless = true\n\
   port = $PORT\n\
   enableCORS = false\n\
   \n\
   " > ~/.streamlit/config.toml
   ```

3. Create `Procfile`:
   ```
   web: sh setup.sh && streamlit run app.py
   ```

4. Deploy:
   ```bash
   heroku login
   heroku create your-app-name
   git push heroku main
   heroku config:set GOOGLE_API_KEY=your_key
   ```

### Option 3: Docker

**Create `Dockerfile`**:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8501

CMD ["streamlit", "run", "app.py"]
```

**Build and Run**:
```bash
docker build -t cv-analyzer .
docker run -p 8501:8501 -e GOOGLE_API_KEY=your_key cv-analyzer
```

### Option 4: AWS EC2

1. Launch EC2 instance (Ubuntu)
2. SSH into instance
3. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install python3-pip
   ```
4. Clone and setup as in local installation
5. Run with systemd or supervisor for persistent service

### Option 5: DigitalOcean App Platform

1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy with one click

## 🐛 Troubleshooting

### Common Issues

#### Issue: "GOOGLE_API_KEY not found"
**Solution**: 
- Check `.env` file exists
- Verify no typos in variable name
- Ensure `.env` is in project root
- Restart the application

#### Issue: "Could not extract text from PDF"
**Solution**:
- Ensure PDF is text-based (not scanned image)
- Try re-saving PDF with different software
- Check PDF is not password-protected

#### Issue: "API Error" messages
**Solution**:
- Verify API key is valid
- Check internet connection
- Ensure you haven't exceeded API quota
- Wait and retry (might be temporary)

#### Issue: Dependencies installation fails
**Solution**:
```bash
# Upgrade pip first
pip install --upgrade pip

# Install dependencies one by one
pip install streamlit
pip install PyPDF2
pip install google-genai
pip install python-dotenv
```

#### Issue: Port 8501 already in use
**Solution**:
```bash
# Use different port
streamlit run app.py --server.port 8502

# Or kill existing process (Linux/Mac)
lsof -ti:8501 | xargs kill -9
```

### Performance Issues

**Slow response times**:
- Check internet connection
- Verify API rate limits not exceeded
- Consider upgrading API plan
- Use smaller CV files if possible

**Memory issues**:
- Ensure at least 2GB RAM available
- Close other applications
- Consider cloud deployment

## 📞 Getting Help

If you encounter issues not covered here:

1. Check [GitHub Issues](https://github.com/yourusername/cv-analyzer-pro/issues)
2. Search [Streamlit Community](https://discuss.streamlit.io/)
3. Review [Google Gemini API Docs](https://ai.google.dev/docs)
4. Create a new issue with details

## 🔄 Updating

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Update dependencies
pip install -r requirements.txt --upgrade

# Restart application
streamlit run app.py
```

---

**Happy Deploying! 🚀**
