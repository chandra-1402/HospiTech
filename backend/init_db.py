import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../database/hospitrack.db')
DB_DIR = os.path.dirname(DB_PATH)

if not os.path.exists(DB_DIR):
    os.makedirs(DB_DIR)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Users Table (Enhanced with hospital_id link for staff)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        full_name TEXT,
        hospital_id INTEGER
    )
    ''')

    # Hospitals Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS hospitals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        contact TEXT
    )
    ''')
    
    # Beds Table (Dynamic bed types)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS beds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER,
        bed_type TEXT NOT NULL,
        total_count INTEGER DEFAULT 0,
        available_count INTEGER DEFAULT 0,
        price REAL,
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
    )
    ''')

    # Doctors Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER,
        name TEXT NOT NULL,
        specialization TEXT,
        is_visiting BOOLEAN DEFAULT 0,
        availability TEXT,
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
    )
    ''')

    # Appointments Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        hospital_id INTEGER,
        doctor_name TEXT,
        date TEXT,
        status TEXT DEFAULT 'Pending',
        FOREIGN KEY (patient_id) REFERENCES users (id),
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
    )
    ''')

    # Reports Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        report_name TEXT,
        lab_name TEXT,
        date_uploaded TEXT,
        file_path TEXT,
        status TEXT DEFAULT 'Ready',
        FOREIGN KEY (patient_id) REFERENCES users (id)
    )
    ''')

    # Bed Reservations Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bed_reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        hospital_id INTEGER,
        bed_type TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Reserved',
        FOREIGN KEY (patient_id) REFERENCES users (id),
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
    )
    ''')

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
