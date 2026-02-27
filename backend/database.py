import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../database/hospitrack.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()

    # Users Table (Split Login)
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('patient', 'hospital_staff', 'lab_tech', 'admin')),
            full_name TEXT
        )
    ''')

    # Hospitals Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS hospitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            contact TEXT,
            icu_beds_total INTEGER DEFAULT 0,
            icu_beds_available INTEGER DEFAULT 0,
            general_beds_total INTEGER DEFAULT 0,
            general_beds_available INTEGER DEFAULT 0
        )
    ''')
    
    # Doctors Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital_id INTEGER,
            name TEXT NOT NULL,
            specialization TEXT,
            schedule TEXT,
            FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        )
    ''')
    
    # Appointments Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            doctor_id INTEGER,
            hospital_id INTEGER,
            appointment_date TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            FOREIGN KEY (patient_id) REFERENCES users (id),
            FOREIGN KEY (doctor_id) REFERENCES doctors (id),
            FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        )
    ''')

    # Reports Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            lab_tech_id INTEGER,
            file_name TEXT NOT NULL,
            upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES users (id),
            FOREIGN KEY (lab_tech_id) REFERENCES users (id)
        )
    ''')

    conn.commit()
    conn.close()
    print("Database initialized successfully at:", DB_PATH)

if __name__ == '__main__':
    # Ensure the database folder exists
    if not os.path.exists(os.path.dirname(DB_PATH)):
        os.makedirs(os.path.dirname(DB_PATH))
    init_db()
