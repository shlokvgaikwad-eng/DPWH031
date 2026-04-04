# GhostClear Port Container Management

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-v0.1.0-orange)

GhostClear is an advanced, full-stack logistics and container management platform. It offers deep transparency into port operations, shipment tracking, anomaly detection, and ownership tracing. Built for modern supply chain analytics, GhostClear delivers critical logistics data via a high-performance FastAPI backend to a robust React frontend interface.

---

## 🎯 Features

- **Shipment Tracking**: Real-time status tracking for containers from shipyard to warehouse, including ETA, route analysis, and delays.
- **Anomaly Detection**: Intelligent flagging of abnormal patterns such as excessive dwell times, missing documentation, or abandoned containers.
- **Ownership Tracing**: Network graph analytics that traces relationships between containers, regulatory registries, and ownership entities.
- **Data Ingestion Pipelines**: Centralized tracking for incoming data syncs from sources like Port TOS, Shipping Line APIs, and Customs authorities.
- **Risk Assessment (Trust Score)**: AI-driven automated trust scoring for shippers based on historical delivery timelines, customs holds, and disputes.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19 / Create React App
- **Styling**: Tailwind CSS, Radix UI primitives
- **Icons**: Phosphor Icons, Lucide React
- **Data Fetching**: Axios

### Backend
- **Framework**: FastAPI, Uvicorn
- **Database**: MongoDB (Currently using `mongomock_motor` for zero-configuration local mock testing)
- **Data Validation**: Pydantic

---

## ⚙️ Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### 1. Backend Setup

The backend utilizes FastAPI and a fully simulated in-memory MongoDB connection for local testing, requiring no actual database to be installed or hosted.

1. Navigate to the root folder.
2. Initialize your Python virtual environment:
   ```bash
   python3 -m venv test_venv
   source test_venv/bin/activate
   ```
3. Install the required backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   pip install mongomock_motor # (If not already included in requirements for mock DB)
   ```
4. Start the FastAPI development server:
   ```bash
   python3 -m uvicorn backend.server:app --reload --port 8000
   ```
*The backend API documentation is automatically accessible at `http://localhost:8000/docs`.*

### 2. Frontend Setup

The frontend consumes the local `localhost:8000` API.

1. Open a new terminal instance and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Configure your environment variables. Ensure a `.env` file exists in the frontend folder with the following key:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8000
   ```
3. Install node modules (legacy peer deps required for some UI compatibility points):
   ```bash
   npm install --legacy-peer-deps
   ```
4. Start the React development server:
   ```bash
   npm start
   ```

*The frontend application will compile and automatically open in your browser at `http://localhost:3000`.*

---

## 🏗 Project Structure

```text
├── backend/
│   ├── server.py             # Main FastAPI application, routes, and Seed Data
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/                  # React components, pages, and utilities
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies
│   └── tailwind.config.js    # Tailwind configuration
└── backend_test.py           # Integration API tests
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
