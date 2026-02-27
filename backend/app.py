from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__, static_folder="../frontend", static_url_path="/")
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), '../database/hospitrack.db')
REPORT_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../frontend/assets/reports')

if not os.path.exists(REPORT_UPLOAD_FOLDER):
    os.makedirs(REPORT_UPLOAD_FOLDER)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# --- Authentication ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    if role:
        user = conn.execute('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?', 
                            (username, password, role)).fetchone()
    else:
        user = conn.execute('SELECT * FROM users WHERE username = ? AND password = ?', 
                            (username, password)).fetchone()
    
    conn.close()

    if user:
        return jsonify({"message": "Login successful", "user": user})
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    full_name = data.get('full_name')
    hospital_id = data.get('hospital_id') # Optional, for staff

    import string
    import random
    
    hospitrack_id = None
    if role == 'patient':
        hospitrack_id = "HT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (username, password, role, full_name, hospital_id, hospitrack_id) VALUES (?, ?, ?, ?, ?, ?)', 
                     (username, password, role, full_name, hospital_id, hospitrack_id))
        conn.commit()
        return jsonify({"message": "User created successfully"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400
    finally:
        conn.close()

# --- Hospital Management (Staff) ---

@app.route('/api/hospital/beds', methods=['POST'])
def add_update_bed():
    """Add or update a bed type for a hospital."""
    data = request.json
    hospital_id = data.get('hospital_id')
    bed_type = data.get('bed_type')
    total = data.get('total_count')
    available = data.get('available_count')
    price = data.get('price')

    conn = get_db_connection()
    # Check if exists
    existing = conn.execute('SELECT id FROM beds WHERE hospital_id = ? AND bed_type = ?', (hospital_id, bed_type)).fetchone()
    
    if existing:
        conn.execute('UPDATE beds SET total_count = ?, available_count = ?, price = ? WHERE id = ?',
                     (total, available, price, existing['id']))
    else:
        conn.execute('INSERT INTO beds (hospital_id, bed_type, total_count, available_count, price) VALUES (?, ?, ?, ?, ?)',
                     (hospital_id, bed_type, total, available, price))
    
    conn.commit()
    conn.close()
    return jsonify({"message": "Bed data updated"})

@app.route('/api/hospital/beds/<int:bed_id>', methods=['DELETE'])
def delete_bed(bed_id):
    """Delete a bed type for a hospital."""
    conn = get_db_connection()
    conn.execute('DELETE FROM beds WHERE id = ?', (bed_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Bed deleted successfully"})

@app.route('/api/hospital/doctors', methods=['POST'])
def add_update_doctor():
    """Add or update a doctor to a hospital."""
    data = request.json
    doctor_id = data.get('id')
    hospital_id = data.get('hospital_id')
    name = data.get('name')
    spec = data.get('specialization')
    days = data.get('days')
    hours = data.get('hours')
    image = data.get('image')
    is_visiting = data.get('is_visiting', 0)

    conn = get_db_connection()
    if doctor_id:
        conn.execute('UPDATE doctors SET name=?, specialization=?, days=?, hours=?, image=?, is_visiting=? WHERE id=?',
                     (name, spec, days, hours, image, is_visiting, doctor_id))
    else:
        conn.execute('INSERT INTO doctors (hospital_id, name, specialization, days, hours, image, is_visiting) VALUES (?, ?, ?, ?, ?, ?, ?)',
                     (hospital_id, name, spec, days, hours, image, is_visiting))
    conn.commit()
    conn.close()
    return jsonify({"message": "Doctor saved successfully"})

@app.route('/api/hospital/doctors/<int:doctor_id>/status', methods=['PUT'])
def toggle_doctor_status(doctor_id):
    conn = get_db_connection()
    doc = conn.execute('SELECT is_available, current_status FROM doctors WHERE id = ?', (doctor_id,)).fetchone()
    if not doc:
        conn.close()
        return jsonify({"error": "Doctor not found"}), 404
        
    new_avail = 0 if doc['is_available'] == 1 else 1
    new_status = 'Available' if new_avail == 1 else 'Off Duty'
    
    conn.execute('UPDATE doctors SET is_available = ?, current_status = ? WHERE id = ?', (new_avail, new_status, doctor_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Doctor status updated", "is_available": new_avail})

@app.route('/api/hospital/doctors/<int:doctor_id>', methods=['DELETE'])
def delete_doctor(doctor_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM doctors WHERE id = ?', (doctor_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Doctor deleted successfully"})

@app.route('/api/hospital/<int:hospital_id>/details', methods=['GET'])
def get_hospital_details(hospital_id):
    """Get full details (beds, doctors) for a hospital."""
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    hospital = conn.execute('SELECT * FROM hospitals WHERE id = ?', (hospital_id,)).fetchone()
    beds = conn.execute('SELECT * FROM beds WHERE hospital_id = ?', (hospital_id,)).fetchall()
    doctors = conn.execute('SELECT * FROM doctors WHERE hospital_id = ?', (hospital_id,)).fetchall()
    
    conn.close()
    return jsonify({
        "hospital": hospital,
        "beds": beds,
        "doctors": doctors
    })

@app.route('/api/hospital/<int:hospital_id>/appointments', methods=['GET'])
def get_hospital_appointments(hospital_id):
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    query = '''
        SELECT a.id, a.doctor_name, a.date, a.status, u.full_name as patient_name, u.username as patient_username
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.hospital_id = ?
        ORDER BY a.date ASC
    '''
    appointments = conn.execute(query, (hospital_id,)).fetchall()
    conn.close()
    
    return jsonify(appointments)

@app.route('/api/hospital/appointments/<int:appointment_id>', methods=['PATCH'])
def update_appointment_status(appointment_id):
    data = request.json
    status = data.get('status')
    
    conn = get_db_connection()
    conn.execute('UPDATE appointments SET status = ? WHERE id = ?', (status, appointment_id))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Appointment status updated"})

@app.route('/api/hospital/<int:hospital_id>/analytics', methods=['GET'])
def get_hospital_analytics(hospital_id):
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    # Simple count of all appointments assigned to this hospital as "patients served"
    served_count = conn.execute('SELECT count(*) as count FROM appointments WHERE hospital_id = ?', (hospital_id,)).fetchone()['count']
    
    conn.close()
    
    return jsonify({
        "patients_served": served_count,
        "peak_hours": "10 AM - 2 PM" # Peak hours is tricky to calculate without timestamps, keep static for now or base it on logic
    })

@app.route('/api/hospital/<int:hospital_id>/reservations', methods=['GET'])
def get_hospital_reservations(hospital_id):
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    reservations = conn.execute('''
        SELECT r.id, r.patient_id, u.full_name as patient_name, u.username as patient_contact, u.hospitrack_id as patient_uid, r.bed_type, r.timestamp, r.status, r.address, r.urgency
        FROM bed_reservations r 
        JOIN users u ON r.patient_id = u.id 
        WHERE r.hospital_id = ? 
        ORDER BY r.timestamp DESC
    ''', (hospital_id,)).fetchall()
    
    conn.close()
    return jsonify(reservations)

@app.route('/api/hospital/reservations/<int:res_id>', methods=['PATCH'])
def update_bed_reservation(res_id):
    data = request.json
    status = data.get('status')
    
    conn = get_db_connection()
    res = conn.execute('SELECT hospital_id, bed_type, status FROM bed_reservations WHERE id = ?', (res_id,)).fetchone()
    
    if not res:
        conn.close()
        return jsonify({"error": "Reservation not found"}), 404

    # If it's being cancelled from an active reserved state, we should refund the bed count
    if status in ['Cancelled', 'Rejected'] and res['status'] not in ['Cancelled', 'Rejected']:
        conn.execute('UPDATE beds SET available_count = available_count + 1 WHERE hospital_id = ? AND bed_type = ?', (res['hospital_id'], res['bed_type']))

    conn.execute('UPDATE bed_reservations SET status = ? WHERE id = ?', (status, res_id))
    conn.commit()
    conn.close()
    
    return jsonify({"message": f"Reservation status updated to {status}"})

# --- Public/Patient API ---

@app.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    """Fetch all hospitals with aggregated availability."""
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    hospitals = conn.execute('SELECT * FROM hospitals').fetchall()
    result = []
    
    for h in hospitals:
        # Aggregate bed counts for display
        beds = conn.execute('SELECT sum(available_count) as free, sum(total_count) as total FROM beds WHERE hospital_id = ?', (h['id'],)).fetchone()
        h['available_beds'] = beds['free'] if beds['free'] else 0
        h['total_beds'] = beds['total'] if beds['total'] else 0
        result.append(h)
        
    conn.close()
    return jsonify(result)

@app.route('/api/hospitals/search', methods=['GET'])
def search_hospitals():
    query = request.args.get('q', '')
    conn = get_db_connection()
    conn.row_factory = dict_factory
    hospitals = conn.execute(f"SELECT * FROM hospitals WHERE name LIKE '%{query}%' OR location LIKE '%{query}%'").fetchall()
    conn.close()
    return jsonify(hospitals)

@app.route('/api/admin/hospitals', methods=['POST'])
def create_hospital():
    data = request.json
    name = data.get('name')
    location = data.get('location')
    contact = data.get('contact')
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO hospitals (name, location, contact) VALUES (?, ?, ?)", (name, location, contact))
    new_id = cur.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Hospital created", "id": new_id})

# --- Init Dummy Data ---
@app.route('/api/init_dummy_data', methods=['POST'])
def init_dummy_data():
    conn = get_db_connection()
    
    # Check if hospitals exist
    if conn.execute('SELECT count(*) FROM hospitals').fetchone()[0] == 0:
        # Create Hospitals
        cur = conn.cursor()
        cur.execute("INSERT INTO hospitals (name, location, contact) VALUES ('City Hospital', 'Downtown', '555-0101')")
        hid1 = cur.lastrowid
        cur.execute("INSERT INTO hospitals (name, location, contact) VALUES ('General Medical Center', 'Westside', '555-0102')")
        hid2 = cur.lastrowid
        
        # Create Users linked to hospitals
        conn.execute("INSERT OR IGNORE INTO users (username, password, role, full_name, hospital_id) VALUES ('staff1', 'staff123', 'hospital_staff', 'Admin City Hosp', ?)", (hid1,))
        conn.execute("INSERT OR IGNORE INTO users (username, password, role, full_name, hospital_id) VALUES ('staff2', 'staff123', 'hospital_staff', 'Admin Gen Med', ?)", (hid2,))
        conn.execute("INSERT OR IGNORE INTO users (username, password, role, full_name) VALUES ('patient', 'patient123', 'patient', 'John Doe')")
        conn.execute("INSERT OR IGNORE INTO users (username, password, role, full_name) VALUES ('admin', 'admin123', 'admin', 'System Admin')")

        # Create Beds
        conn.execute("INSERT INTO beds (hospital_id, bed_type, total_count, available_count, price) VALUES (?, 'ICU', 20, 5, 500)", (hid1,))
        conn.execute("INSERT INTO beds (hospital_id, bed_type, total_count, available_count, price) VALUES (?, 'General Ward', 100, 42, 100)", (hid1,))
        conn.execute("INSERT INTO beds (hospital_id, bed_type, total_count, available_count, price) VALUES (?, 'Ventilator', 10, 2, 1000)", (hid1,))
        
        conn.execute("INSERT INTO beds (hospital_id, bed_type, total_count, available_count, price) VALUES (?, 'General Ward', 80, 10, 120)", (hid2,))

        # Create Doctors
        conn.execute("INSERT INTO doctors (hospital_id, name, specialization, availability) VALUES (?, 'Dr. Smith', 'Cardiologist', 'Mon-Fri 9AM-5PM')", (hid1,))
        conn.execute("INSERT INTO doctors (hospital_id, name, specialization, availability, is_visiting) VALUES (?, 'Dr. Jones', 'Neurologist', 'Tue, Thu 2PM-6PM', 1)", (hid1,))
        
        conn.commit()
        msg = "Dummy data initialized with dynamic beds/doctors."
    else:
        msg = "Data already exists."
    
    conn.close()
    return jsonify({"message": msg})

# --- Patient Features ---

@app.route('/api/profile/update', methods=['POST'])
def update_profile():
    data = request.json
    user_id = data.get('user_id')
    full_name = data.get('full_name')
    password = data.get('password')

    if not user_id:
        return jsonify({"error": "User ID required"}), 400

    conn = get_db_connection()
    try:
        if password:
            conn.execute('UPDATE users SET full_name = ?, password = ? WHERE id = ?', (full_name, password, user_id))
        else:
            conn.execute('UPDATE users SET full_name = ? WHERE id = ?', (full_name, user_id))
        conn.commit()
        
        # Fetch updated user to return
        updated_user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        updated_user_dict = dict(updated_user)
        return jsonify({"message": "Profile updated", "user": updated_user_dict})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- Live Bed & Appointment Endpoints ---

@app.route('/api/patient/search_beds', methods=['GET'])
def search_beds():
    location = request.args.get('location', '').lower()
    bed_type = request.args.get('type', '')
    price_filter = request.args.get('price', '') # 'low' or 'high' or empty

    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    query = '''
        SELECT b.id as bed_id, b.bed_type, b.price, b.available_count, h.id as hospital_id, h.name as hospital_name, h.location as hospital_location
        FROM beds b
        JOIN hospitals h ON b.hospital_id = h.id
        WHERE b.available_count > 0
    '''
    params = []

    if location:
        query += " AND (LOWER(h.name) LIKE ? OR LOWER(h.location) LIKE ?)"
        params.extend([f"%{location}%", f"%{location}%"])
    
    if bed_type:
        query += " AND b.bed_type = ?"
        params.append(bed_type)

    if price_filter == 'low':
        query += " AND b.price < 200"
    elif price_filter == 'high':
        query += " AND b.price >= 200"

    beds = conn.execute(query, params).fetchall()
    conn.close()

    # Add mock distance/rating to match frontend expectations
    import random
    for b in beds:
        b['distance'] = f"{round(random.uniform(1.0, 15.0), 1)} miles"
        b['rating'] = str(round(random.uniform(3.5, 5.0), 1))

    return jsonify(beds)

@app.route('/api/patient/reserve_bed', methods=['POST'])
def reserve_bed():
    data = request.json
    patient_id = data.get('patient_id')
    hospital_id = data.get('hospital_id')
    bed_type = data.get('bed_type')
    address = data.get('address', 'Not Provided')
    urgency = data.get('urgency', 'Normal')

    conn = get_db_connection()
    try:
        # Verify bed is still available
        bed = conn.execute('SELECT id, available_count FROM beds WHERE hospital_id = ? AND bed_type = ? AND available_count > 0', 
                           (hospital_id, bed_type)).fetchone()
        
        if not bed:
            return jsonify({"error": "Bed no longer available"}), 400

        # Deduct bed count
        conn.execute('UPDATE beds SET available_count = available_count - 1 WHERE id = ?', (bed['id'],))
        
        # Log reservation
        conn.execute('INSERT INTO bed_reservations (patient_id, hospital_id, bed_type, address, urgency) VALUES (?, ?, ?, ?, ?)',
                     (patient_id, hospital_id, bed_type, address, urgency))
        conn.commit()
        return jsonify({"message": "Bed reserved successfully for 30 minutes!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/patient/reservations', methods=['GET'])
def get_reservations():
    patient_id = request.args.get('patient_id')
    if not patient_id:
        return jsonify([])

    conn = get_db_connection()
    conn.row_factory = dict_factory
    reservations = conn.execute('''
        SELECT r.*, h.name as hospital_name 
        FROM bed_reservations r 
        JOIN hospitals h ON r.hospital_id = h.id 
        WHERE r.patient_id = ?
        ORDER BY r.timestamp DESC
    ''', (patient_id,)).fetchall()
    conn.close()
    return jsonify(reservations)

@app.route('/api/hospital/<int:hospital_id>/doctors_list', methods=['GET'])
def get_hospital_doctors_list(hospital_id):
    conn = get_db_connection()
    conn.row_factory = dict_factory
    doctors = conn.execute('SELECT id, name, specialization FROM doctors WHERE hospital_id = ?', (hospital_id,)).fetchall()
    conn.close()
    return jsonify(doctors)

@app.route('/api/patient/appointments', methods=['GET', 'POST'])
def manage_appointments():
    conn = get_db_connection()
    conn.row_factory = dict_factory

    if request.method == 'POST':
        data = request.json
        patient_id = data.get('patient_id')
        hospital_id = data.get('hospital_id')
        doctor_name = data.get('doctor_name')
        
        # Accept either `date` or `appointment_date` from JSON depending on frontend version
        date = data.get('appointment_date') or data.get('date')
        
        import uuid
        appointment_no = "APT-" + str(uuid.uuid4().hex[:8]).upper()

        conn.execute('INSERT INTO appointments (patient_id, hospital_id, doctor_name, appointment_date, date, appointment_no) VALUES (?, ?, ?, ?, ?, ?)',
                     (patient_id, hospital_id, doctor_name, date, date, appointment_no))
        conn.commit()
        conn.close()
        return jsonify({"message": "Appointment booked successfully"})
    
    else: # GET
        patient_id = request.args.get('patient_id')
        if not patient_id:
            conn.close()
            return jsonify([])
        
        # Join with hospitals to get name and reports to see if file exists
        appointments = conn.execute('''
            SELECT a.*, h.name as hospital_name, r.file_path as report_file_path
            FROM appointments a 
            JOIN hospitals h ON a.hospital_id = h.id 
            LEFT JOIN reports r ON a.appointment_no = r.appointment_no
            WHERE a.patient_id = ? 
            ORDER BY a.date DESC
        ''', (patient_id,)).fetchall()
        conn.close()
        return jsonify(appointments)

@app.route('/api/patient/reports', methods=['GET'])
def get_patient_reports():
    patient_id = request.args.get('patient_id')
    conn = get_db_connection()
    conn.row_factory = dict_factory
    reports = conn.execute('SELECT * FROM reports WHERE patient_id = ? ORDER BY date_uploaded DESC', (patient_id,)).fetchall()
    conn.close()
    return jsonify(reports)

@app.route('/api/patient/search', methods=['GET'])
def search_patient():
    hid = request.args.get('hospitrack_id')
    if not hid:
        return jsonify({"error": "No ID provided"}), 400
    
    conn = get_db_connection()
    conn.row_factory = dict_factory
    patient = conn.execute("SELECT id, username, full_name, hospitrack_id FROM users WHERE hospitrack_id = ? AND role = 'patient'", (hid,)).fetchone()
    conn.close()
    
    if patient:
        return jsonify(patient)
    return jsonify({"error": "Patient not found"}), 404

@app.route('/api/lab/upload', methods=['POST'])
def upload_report():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    patient_id = request.form.get('patient_id')
    appointment_no = request.form.get('appointment_no')
    lab_order_id = request.form.get('lab_order_id')
    report_type = request.form.get('report_type')
    lab_name = request.form.get('lab_name', 'Central Lab')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    conn = get_db_connection()
    
    # Try finding patient by appointment OR order_id
    if appointment_no and not patient_id:
        apt = conn.execute("SELECT patient_id FROM appointments WHERE appointment_no = ?", (appointment_no,)).fetchone()
        if apt:
            patient_id = apt['patient_id']
            
    if lab_order_id and not patient_id:
        ord_row = conn.execute("SELECT patient_id FROM reports WHERE lab_order_id = ?", (lab_order_id,)).fetchone()
        if ord_row:
            patient_id = ord_row['patient_id']
            
    if not patient_id:
        conn.close()
        return jsonify({"error": "Patient ID or Valid reference is required"}), 400

    # Save file
    filename = f"{patient_id}_{file.filename}"
    filepath = os.path.join(REPORT_UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # Store relative path for frontend access
    db_path = f"assets/reports/{filename}" 
    from datetime import datetime
    date_now = datetime.now().strftime("%Y-%m-%d")

    if lab_order_id:
        # Update existing pending order
        conn.execute('UPDATE reports SET file_name = ?, file_path = ?, status = ?, date_uploaded = ?, appointment_no = ? WHERE lab_order_id = ?',
                     (file.filename, db_path, 'Completed', date_now, appointment_no, lab_order_id))
    else:
        # Insert ad-hoc report
        conn.execute('INSERT INTO reports (patient_id, file_name, report_name, lab_name, date_uploaded, file_path, appointment_no, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                     (patient_id, file.filename, report_type, lab_name, date_now, db_path, appointment_no, 'Completed'))
    conn.commit()
    conn.close()

    return jsonify({"message": "Report uploaded successfully"})

@app.route('/api/lab/create_order', methods=['POST'])
def create_lab_order():
    data = request.json
    patient_id = data.get('patient_id')
    hospital_id = data.get('hospital_id')
    doctor_name = data.get('doctor_name')
    report_type = data.get('report_type')
    lab_name = data.get('lab_name', 'Central Lab')

    if not patient_id:
        return jsonify({"error": "Patient ID required"}), 400

    import uuid
    lab_order_id = "LAB-" + str(uuid.uuid4().hex[:8]).upper()
    
    conn = get_db_connection()
    from datetime import datetime
    date_now = datetime.now().strftime("%Y-%m-%d")

    conn.execute('''
        INSERT INTO reports (patient_id, hospital_id, doctor_name, report_name, lab_name, date_uploaded, status, lab_order_id, file_name) 
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, 'Pending Upload')
    ''', (patient_id, hospital_id, doctor_name, report_type, lab_name, date_now, lab_order_id))
    
    conn.commit()
    conn.close()
    return jsonify({"message": "Lab Order Created", "lab_order_id": lab_order_id})

@app.route('/api/lab/orders', methods=['GET'])
def get_lab_orders():
    conn = get_db_connection()
    conn.row_factory = dict_factory
    
    # We join with users to get patient name
    orders = conn.execute('''
        SELECT r.*, u.full_name as patient_name, u.hospitrack_id as patient_uid
        FROM reports r
        JOIN users u ON r.patient_id = u.id
        ORDER BY r.id DESC
    ''').fetchall()
    
    conn.close()
    return jsonify(orders)

if __name__ == '__main__':
    # Ensure tables exist
    import init_db
    init_db.init_db()
    app.run(debug=True, port=9000)
