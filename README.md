# HospiTech - Centralized Healthcare Management System 🏥

HospiTech is a robust, full-stack web application designed to unify the healthcare ecosystem. It provides three distinctly tailored web portals connecting **Patients**, **Hospital Staff**, and **Laboratory Technicians** into a single, seamless, synchronized platform.

![HospiTech Dashboard Preview](https://via.placeholder.com/800x400.png?text=HospiTech+Dashboard)

## 🌟 Key Features

### 🚨 Emergency SOS Module
- **One-Click Critical Triage:** A dedicated, hyper-visible SOS button on the landing page instantly detaches the user from standard workflows.
- **Smart GPS Routing:** Uses browser geolocation (or manual entry fallbacks) to calculate the distance to active hospitals.
- **Instant Capacity Checks:** Algorithmically cross-references active facility locations with current "Available Emergency Bed" counts in the system database to route critical patients effectively.

### 🧑‍⚕️ For Patients
- **Live Inventory Tracking:** Monitor real-time Bed/ICU availability across network hospitals.
- **Digital Health Vault:** Retrieve, view, and organize uploaded lab reports natively in the browser.
- **Unified Appointments:** Send digital booking requests rapidly to any available doctor rostered in the system.

### 🏥 For Hospital Administrators & Staff
- **Manage Bed Inventory:** Increment or decrement the number of occupied beds in specific wards instantly to reflect accurate system-wide numbers.
- **Advanced Doctor Rostering:** Add and manage treating physicians without ever deleting records. Support for **"Visiting Consultants"** flags, customized shift hours, and immediate **Available/Off-Duty toggles** that universally update public visibility algorithms.
- **Reservation Approvals:** Check and organize appointment and bed requisitions from the Patient Portal.

### 🔬 For Laboratory Technicians
- **Report Dispatch:** Directly append digitized PDF documents (X-rays, bloodwork, MRI reports) securely into targeted Patient Vaults.
- **Queue System:** View tracked lists of "Pending" laboratory orders vs "Completed" files.

## 🛠️ Technology Stack
- **Frontend:** Pure HTML5, Vanilla JavaScript, and heavily-customized Vanilla CSS natively utilizing modern Glassmorphism aesthetics and dynamic keyframe animations.
- **Backend Infrastructure:** Python 3 configured with the highly-optimized **Flask Web Framework**.
- **Database:** Localized **SQLite3**, utilizing asynchronous connection bridging for rapid Read/Write speeds with minimal latency.
- **API Paradigm:** Pure RESTful endpoints bridging the JavaScript frontend natively to the Python logic.

## 🚀 How to Run Locally

### 1. Prerequisites 
- Ensure you have **Python 3.8+** installed on your system.
- Basic terminal accessibility.

### 2. Installation
Clone the repository to your local machine:
```bash
git clone https://github.com/chandra-1402/HospiTech.git
cd HospiTech
```

### 3. Initialize the Core Database
Run the pre-configured database bootstrap script to generate the required SQLite files and populate the system with mocked hospitals, mock doctors, and default credentials.
```bash
python3 backend/init_db.py
```

### 4. Start the Application Server
Execute the Flask server logic. Assuming Port 9000 is open:
```bash
python3 backend/app.py
```
*The terminal should output: `* Running on http://127.0.0.1:9000`*

### 5. Open the Portals
Open your web browser and navigate directly to the frontend gateway:
```
http://localhost:9000
```

## 🔐 Default Sandbox Credentials
Upon initializing the repository, the `init_db.py` creates default sandbox accounts for immediate sandbox testing of all 3 portals:

- **Patient Portal Sandbox:** 
  - User: `patient` / Pass: `patient123`
- **Hospital Admin Sandbox:**
  - User: `staff1` / Pass: `staff123`
- **System Admin Prototype:**
  - User: `admin` / Pass: `admin123`

## 🤝 Contribution Guidelines
This repository acts as the Central Logic Infrastructure for the Hospitrack API architecture. Contributions to tighten security algorithms, optimize the DOM-rendering JavaScript, or visually enhance the CSS keyframes are heavily encouraged! 

***
*Engineered to save lives and streamline workflows.*
