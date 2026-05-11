# El Taller de Wally - Workshop Management System

A comprehensive, cross-platform management application designed specifically for mechanical and repair workshops. Built to streamline daily operations, manage service orders, track finances, and maintain customer relationships efficiently.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-1.1-blue)

## Authors
Created by **Dylan Gamero**.

## Key Features

* ** Interactive Dashboard:** Real-time metrics, estimated profits, and quick tracking of active repairs using optimistic UI updates for instant feedback.
* ** Service Orders (Servicios):** Full CRUD for service orders, status tracking (Pending, In Progress, Ready, Delivered), and automated **PDF generation** for receipts/invoices.
* ** Customer Management (Clientes):** Maintain a detailed directory of clients, contact info, and fast search capabilities.
* ** Warranty Tracking (Inventario):** Monitor active warranties, calculate remaining days, and process warranty claims or refunds effortlessly.
* ** Financial Ledger (Finanzas):** Track incomes and expenses, manage multiple bank accounts, and view a detailed accounting daily ledger.
* ** Cross-Platform:** Available as a responsive web application and a native Android APK built with Capacitor.

## Tech Stack

### Frontend
* **React (Vite):** Core framework.
* **Tailwind CSS:** Utility-first styling for a clean, modern interface.
* **SWR:** Stale-while-revalidate for advanced data fetching, caching, and blazing-fast navigation.
* **Axios:** HTTP client for API communication.
* **Capacitor:** Native runtime for deploying the React app to Android.
* **Lucide React:** Beautiful, consistent iconography.

### Backend
* **Python 3 & FastAPI:** High-performance REST API.
* **Uvicorn / Gunicorn:** ASGI server setup.
* **Deployment:** Google Cloud Platform (Compute Engine running Ubuntu/Linux).

## Local Development Setup

### Prerequisites
* Node.js (v16+)
* Python 3.10+
* Android Studio (Optional, for Android compilation)

### Frontend Setup

```bash

# Clone the repository and navigate to the frontend directory
npm install

# Create a .env file and set your API URL (if required by your configuration)
# Otherwise, update the baseURL in src/api/axios.js

# Start the development server
npm run dev

```

# Navigate to the backend directory
```
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
```
# Install dependencies
```
pip install -r requirements.txt
```

# Run the FastAPI server
```
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Building for Android (APK)
### This project uses Capacitor to generate a native Android application.

Build the production web assets:

```Bash
npm run build
```
### Sync the web assets with the Android project:
```Bash
npx cap sync android
```
### Compile the APK using Gradle (Linux/Mac):

```Bash
cd android
./gradlew assembleDebug
```
### The generated APK will be located at: ``` android/app/build/outputs/apk/debug/app-debug.apk ```.