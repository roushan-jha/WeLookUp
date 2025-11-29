# WeLookup 🔍

A comprehensive platform for listing and discovering companies with AI-powered insights and verification tools.

## 📋 Overview

WeLookup helps businesses and individuals make informed decisions by providing company listings, AI-generated review summaries, automated GST certificate verification, and risk assessment based on company reviews.

## ✨ Features

- **Company Listing & Discovery**: Browse and search through a comprehensive database of companies
- **AI Review Summary Generator**: Get concise, AI-powered summaries of company reviews using Gemini API
- **OCR GST Certificate Verification**: Automatically verify GST certificates using optical character recognition
- **Risk Score Analysis**: Calculate risk scores based on company reviews and ratings
- **Smart Search**: Find companies based on various criteria and filters

## 🛠️ Tech Stack

- **Frontend**: Next.js
- **Backend**: Node.js
- **Database**: MongoDB
- **Containerization**: Docker
- **AI Integration**: Python + Google Gemini API
- **OCR Processing**: Python-based OCR system

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Docker
- Python 3.8+
- Gemini API Key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/welookup.git
cd welookup
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Add your configuration:
```
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
```

4. Run with Docker
```bash
docker-compose up
```

Or run locally:
```bash
npm run dev
```



## 📁 Project Structure

```
welookup/
├── frontend/          # Next.js frontend application
├── backend/           # Node.js backend API
├── python-services/   # Python services for AI & OCR
├── docker/            # Docker configuration files
└── docs/              # Documentation
```

## 🔧 Configuration

### MongoDB Setup
Ensure MongoDB is running and accessible. Update the connection string in your `.env` file.

### Gemini API Integration
1. Get your API key from Google AI Studio
2. Add it to your environment variables
3. The Python service will handle AI requests

### OCR Service
The OCR service uses Python libraries to extract text from GST certificates. Make sure required packages are installed:
```bash
pip install -r requirements.txt
```



