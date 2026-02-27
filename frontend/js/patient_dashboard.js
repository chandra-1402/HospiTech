const API_URL = 'http://127.0.0.1:9000/api';
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = '../login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('user-name').innerText = user.full_name || user.username;
    const hospIdEl = document.getElementById('patient-hosp-id');
    if (hospIdEl) hospIdEl.innerText = user.hospitrack_id || 'HT-PENDING';

    loadAppointments();
    loadReports();
    loadReservations();
    setupModals();
    setupTabs();
    searchBeds(); // Load initial beds
});

// --- Modals ---
function setupModals() {
    // Profile Modal
    window.openProfileModal = () => {
        document.getElementById('profile-name').value = user.full_name;
        document.getElementById('profile-modal').classList.add('active');
    };

    // Appointment Modal
    window.openAppointmentModal = async () => {
        document.getElementById('appointment-modal').classList.add('active');
        await loadHospitalOptions();
    };

    window.closeModal = (id) => {
        document.getElementById(id).classList.remove('active');
    };
}

// --- Profile Management ---
async function updateProfile(e) {
    e.preventDefault();
    const fullName = document.getElementById('profile-name').value;
    const password = document.getElementById('profile-password').value;

    try {
        const response = await fetch(`${API_URL}/profile/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                full_name: fullName,
                password: password || undefined // Only send if changed
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Profile updated successfully!');
            localStorage.setItem('user', JSON.stringify(data.user)); // Update local storage
            document.getElementById('user-name').innerText = data.user.full_name;
            closeModal('profile-modal');
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to update profile');
    }
}

// --- Appointment Management ---
async function loadHospitalOptions() {
    const select = document.getElementById('apt-hospital');
    if (select.options.length > 1) return; // Already loaded

    try {
        const res = await fetch(`${API_URL}/hospitals`);
        const hospitals = await res.json();
        hospitals.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.id;
            opt.innerText = h.name;
            select.appendChild(opt);
        });

        select.addEventListener('change', async (e) => {
            const docSelect = document.getElementById('apt-doctor');
            docSelect.innerHTML = '<option value="">Loading...</option>';
            if (!e.target.value) {
                docSelect.innerHTML = '<option value="">-- Pls Choose Hospital First --</option>';
                return;
            }
            try {
                const docRes = await fetch(`${API_URL}/hospital/${e.target.value}/doctors_list`);
                const doctors = await docRes.json();
                docSelect.innerHTML = doctors.length ? '<option value="">-- Select a Doctor --</option>' : '<option value="">-- No Doctors Available --</option>';
                doctors.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.name; // In a full app, we'd use doctor.id, but name is fine for now
                    opt.innerText = `${d.name} (${d.specialization})`;
                    docSelect.appendChild(opt);
                });
            } catch (err) {
                docSelect.innerHTML = '<option value="">Error loading doctors</option>';
            }
        });
    } catch (err) {
        console.error("Failed to load hospitals", err);
    }
}

async function bookAppointment(e) {
    e.preventDefault();
    const hospitalId = document.getElementById('apt-hospital').value;
    const doctorName = document.getElementById('apt-doctor').value;
    const date = document.getElementById('apt-date').value;

    try {
        const res = await fetch(`${API_URL}/patient/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: user.id,
                hospital_id: hospitalId,
                doctor_name: doctorName,
                appointment_date: date,
                date: date // Keeping date for backwards compatibility with the GET route parsing if needed
            })
        });

        if (res.ok) {
            alert('Appointment booked!');
            closeModal('appointment-modal');
            loadAppointments(); // Refresh list
        } else {
            alert('Booking failed');
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadAppointments() {
    try {
        const res = await fetch(`${API_URL}/patient/appointments?patient_id=${user.id}&_t=${Date.now()}`);
        const appointments = await res.json();

        const list = document.getElementById('appointment-list');
        if (appointments.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align: center;">No upcoming appointments.</p>';
            return;
        }

        list.innerHTML = appointments.map(apt => `
            <div class="appointment-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-md); margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="background: rgba(0, 200, 83, 0.1); color: var(--success); padding: 1rem; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="fa-solid fa-user-doctor"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 1.2rem; color: var(--text-main);">${apt.doctor_name}</h4>
                        <p style="margin: 0; font-size: 0.95rem; color: var(--text-muted);"><i class="fa-regular fa-hospital"></i> ${apt.hospital_name}</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; color: var(--text-main); font-size: 1.1rem; margin-bottom: 0.3rem;"><i class="fa-regular fa-calendar"></i> ${new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <span style="font-size: 0.8rem; padding: 0.3rem 0.8rem; background: rgba(0,229,255,0.1); color: var(--primary-color); border-radius: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${apt.status}</span>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Failed to load appointments", err);
    }
}

async function loadReservations() {
    try {
        const res = await fetch(`${API_URL}/patient/reservations?patient_id=${user.id}&_t=${Date.now()}`);
        const reservations = await res.json();

        const list = document.getElementById('reservation-list');
        if (reservations.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align: center;">No active bed reservations.</p>';
            return;
        }

        list.innerHTML = reservations.map(r => {
            let color = 'var(--primary-color)';
            let bg = 'rgba(0, 229, 255, 0.1)';
            if (r.status === 'Arrived') {
                color = 'var(--success)';
                bg = 'rgba(0, 200, 83, 0.1)';
            } else if (r.status === 'Cancelled' || r.status === 'Rejected') {
                color = 'var(--danger)';
                bg = 'rgba(255, 82, 82, 0.1)';
            }
            return `
            <div class="appointment-card" style="background: rgba(255,255,255,0.02); border: 1px solid ${color}; padding: 1.5rem; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="background: ${bg}; color: ${color}; padding: 1rem; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="fa-solid fa-bed-pulse"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 1.2rem; color: var(--text-main);">${r.bed_type}</h4>
                        <p style="margin: 0; font-size: 0.95rem; color: var(--text-muted);"><i class="fa-regular fa-hospital"></i> ${r.hospital_name}</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; color: var(--text-main); font-size: 1.1rem; margin-bottom: 0.3rem;"><i class="fa-solid fa-clock"></i> ${new Date(r.timestamp).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}</div>
                    <span style="font-size: 0.8rem; padding: 0.3rem 0.8rem; background: ${bg}; color: ${color}; border-radius: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${r.status}</span>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error("Failed to load reservations", err);
    }
}

// --- Reports ---
async function loadReports() {
    // Currently fetching from hardcoded or dummy endpoint if not implemented fully
    // But we added the endpoint, so let's try to use it
    try {
        const res = await fetch(`${API_URL}/patient/reports?patient_id=${user.id}`);
        const reports = await res.json();
        const tbody = document.querySelector('#reports-table tbody');

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No vault items found.</td></tr>';
            return;
        }

        tbody.innerHTML = reports.map(r => `
             <tr>
                <td style="font-weight: 600; font-size: 1.05rem; display: flex; align-items: center; gap: 0.8rem;">
                    <i class="fa-solid fa-file-pdf" style="color: var(--danger); font-size: 1.5rem;"></i>
                    ${r.report_name}
                </td>
                <td style="color: var(--text-muted);">${r.date_uploaded}</td>
                <td style="color: var(--text-muted);"><span style="background: rgba(255,255,255,0.1); padding: 0.3rem 0.6rem; border-radius: var(--radius-md); font-size: 0.85rem;">${r.lab_name}</span></td>
                <td style="text-align: right;"><button class="btn-primary" style="padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem;" onclick="window.open('${r.file_path}')"><i class="fa-solid fa-cloud-arrow-down"></i> Download</button></td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Failed to load reports", err);
    }
}

// --- Bed Search & Reservations ---
window.searchBeds = async () => {
    const list = document.getElementById('bed-results');
    list.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">Searching for beds...</p>';

    const loc = document.getElementById('filter-location') ? document.getElementById('filter-location').value : '';
    const type = document.getElementById('filter-type') ? document.getElementById('filter-type').value : '';
    const price = document.getElementById('filter-price') ? document.getElementById('filter-price').value : '';

    try {
        const query = new URLSearchParams();
        if (loc) query.append('location', loc);
        if (type) query.append('type', type);
        if (price) query.append('price', price);

        const res = await fetch(`${API_URL}/patient/search_beds?${query.toString()}`);
        const beds = await res.json();

        if (beds.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No beds available matching criteria.</p>';
            return;
        }

        list.innerHTML = beds.map(bed => `
            <div class="dash-card" style="padding: 1.5rem; display: flex; flex-direction: column; height: 100%; border-top: 4px solid var(--danger);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="font-size: 1.3rem; margin-bottom: 0.3rem;">${bed.hospital_name}</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem;"><i class="fa-solid fa-location-dot"></i> ${bed.distance} &bull; <i class="fa-solid fa-star" style="color: var(--warning);"></i> ${bed.rating}</p>
                    </div>
                    <div style="background: rgba(255, 82, 82, 0.1); color: var(--danger); font-weight: 700; padding: 0.5rem 0.8rem; border-radius: var(--radius-md); text-align: center;">
                        <div style="font-size: 1.5rem; line-height: 1;">${bed.available_count}</div>
                        <div style="font-size: 0.7rem; text-transform: uppercase;">left</div>
                    </div>
                </div>
                <div style="margin-bottom: 1.5rem; background: #0F1219; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted);">Bed Type</span>
                        <span style="font-weight: 600; color: var(--text-main);">${bed.bed_type}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Price</span>
                        <span style="font-weight: 600; color: var(--success);">₹${bed.price}</span>
                    </div>
                </div>
                <button class="btn-primary" style="width: 100%; margin-top: auto; background: var(--danger); box-shadow: 0 0 15px rgba(255, 82, 82, 0.3);" onclick="reserveBed(${bed.hospital_id}, '${bed.bed_type}', '${bed.hospital_name}')">
                    <i class="fa-solid fa-bolt"></i> Reserve for 30 Mins
                </button>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p style="color: var(--danger); padding: 1rem;">Error connecting to server. Please try again later.</p>';
        console.error("Search failed", err);
    }
}

function escapeQuotes(str) {
    return str ? str.toString().replace(/'/g, "\\'") : '';
}

window.showHospitrackID = () => {
    if (!user) return;

    const displayId = user.hospitrack_id || 'HT-PENDING';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(displayId)}&color=00e5ff&bgcolor=12141d`;

    const html = `
    <div id="hosp-id-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); display:flex; justify-content:center; align-items:center; z-index:9999; animation: fadeIn 0.2s ease-out;" onclick="if(event.target.id === 'hosp-id-modal') this.remove()">
        <div style="background:var(--bg-surface); border:1px solid var(--primary-color); padding:0; border-radius:16px; width:90%; max-width:400px; box-shadow:0 15px 40px rgba(0,229,255,0.15); overflow:hidden;">
            
            <div style="background:var(--bg-card); padding:1.5rem; text-align:center; border-bottom:1px solid var(--border-color);">
                <i class="fa-solid fa-hospital-user" style="font-size:3rem; color:var(--primary-color); margin-bottom:1rem;"></i>
                <h2 style="color:var(--text-main); margin:0; font-size:1.5rem;">${user.full_name || user.username}</h2>
                <div style="color:var(--text-muted); font-size:0.9rem; margin-top:0.3rem;">Verified Patient</div>
            </div>
            
            <div style="padding:2rem; text-align:center;">
                <div style="background:rgba(0, 229, 255, 0.05); padding:1rem; border-radius:12px; border:1px dashed var(--primary-color); display:inline-block; margin-bottom:1.5rem;">
                    <img src="${qrUrl}" alt="QR Code" style="width:150px; height:150px; border-radius:8px; mix-blend-mode: screen;">
                </div>
                
                <div style="text-align:left; background:rgba(0,0,0,0.2); padding:1.5rem; border-radius:8px;">
                    <div style="margin-bottom:0.8rem; display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.8rem;">
                        <span style="color:var(--text-muted); font-size:0.9rem;">Hospitrack ID</span>
                        <span style="color:var(--text-main); font-weight:bold; font-family:monospace; font-size:1.1rem; letter-spacing:0.1em;">${displayId}</span>
                    </div>
                    <div style="margin-bottom:0.8rem; display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.8rem;">
                        <span style="color:var(--text-muted); font-size:0.9rem;">Contact / Email</span>
                        <span style="color:var(--text-main);">${user.username}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-muted); font-size:0.9rem;">System Role</span>
                        <span style="color:var(--primary-color); font-weight:500;">Patient</span>
                    </div>
                </div>
            </div>
            
            <div style="padding:1.5rem; text-align:center; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.2);">
                <button class="btn-primary" style="width:100%; border-radius:8px; background:var(--primary-color); color:var(--bg-main);" onclick="document.getElementById('hosp-id-modal').remove()">
                    Close Digital ID
                </button>
            </div>
        </div>
    </div>
    `;

    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`;
        document.head.appendChild(style);
    }

    document.body.insertAdjacentHTML('beforeend', html);
};

window.reserveBed = (hospitalId, type, hospitalName) => {
    // Dynamically insert a sleek custom modal instead of ugly native prompts
    const modalHTML = `
    <div id="reservation-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); display:flex; justify-content:center; align-items:center; z-index:9999; animation: fadeIn 0.2s ease-out;">
        <div style="background:var(--bg-surface); padding:2.5rem; border-radius:16px; border:1px solid var(--border-color); width:90%; max-width:450px; box-shadow:0 15px 35px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <h3 style="color:var(--text-main); font-size:1.5rem; margin:0;"><i class="fa-solid fa-bed-pulse" style="color:var(--primary-color); margin-right:8px;"></i> Reserve Bed</h3>
            </div>
            <p style="color:var(--text-muted); margin-bottom:2rem; font-size:0.95rem;">You are holding a <strong style="color:var(--primary-color);">${type}</strong> at <strong>${hospitalName}</strong> for 30 minutes.</p>
            
            <div class="form-group" style="margin-bottom:1.5rem;">
                <label style="font-size:0.9rem; color:var(--text-muted);">Current Address (Optional)</label>
                <input type="text" id="res-address" placeholder="e.g. 123 Main St, Block B" style="width:100%; padding:0.9rem 1rem; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:var(--text-main); border-radius:8px; margin-top:0.4rem;" autocomplete="off">
            </div>
            
            <div class="form-group" style="margin-bottom:2.5rem;">
                <label style="font-size:0.9rem; color:var(--text-muted); display:block; margin-bottom:0.8rem;">Medical Urgency</label>
                <input type="hidden" id="res-urgency" value="Normal">
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.5rem;" id="urgency-buttons">
                    <button type="button" class="urgency-btn active" data-val="Normal" style="padding:0.8rem 0.5rem; background:rgba(0, 200, 83, 0.1); border:1px solid var(--success); color:var(--text-main); border-radius:8px; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:all 0.2s;">
                        <span style="font-size:1.2rem; margin-bottom:4px;">🟢</span><span style="font-size:0.8rem;">Normal</span>
                    </button>
                    <button type="button" class="urgency-btn" data-val="High" style="padding:0.8rem 0.5rem; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:var(--text-main); border-radius:8px; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:all 0.2s;">
                        <span style="font-size:1.2rem; margin-bottom:4px;">🟠</span><span style="font-size:0.8rem;">High</span>
                    </button>
                    <button type="button" class="urgency-btn" data-val="Critical" style="padding:0.8rem 0.5rem; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:var(--text-main); border-radius:8px; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:all 0.2s;">
                        <span style="font-size:1.2rem; margin-bottom:4px;">🔴</span><span style="font-size:0.8rem;">Critical</span>
                    </button>
                </div>
            </div>
            
            <div style="display:flex; gap:1rem;">
                <button class="btn-primary" style="flex:1; background:transparent; border:1px solid var(--text-muted); color:var(--text-main);" onclick="document.getElementById('reservation-modal').remove()">Cancel</button>
                <button class="btn-primary" style="flex:1; background:var(--primary-color);" onclick="submitReservation(${hospitalId}, '${type}', '${escapeQuotes(hospitalName)}')">Confirm Request</button>
            </div>
        </div>
    </div>
    `;

    // Inject and add simple animation styles if not present
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`;
        document.head.appendChild(style);
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('res-address').focus();

    // Attach click listeners for urgency buttons
    const urgencyBtns = document.querySelectorAll('.urgency-btn');
    urgencyBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // Reset all buttons
            urgencyBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'rgba(0,0,0,0.2)';
                b.style.borderColor = 'var(--border-color)';
            });
            // Set active
            this.classList.add('active');
            const val = this.getAttribute('data-val');
            document.getElementById('res-urgency').value = val;

            // Set active visual state
            if (val === 'Normal') {
                this.style.background = 'rgba(0, 200, 83, 0.1)';
                this.style.borderColor = 'var(--success)';
            } else if (val === 'High') {
                this.style.background = 'rgba(255, 152, 0, 0.1)';
                this.style.borderColor = 'var(--warning)';
            } else if (val === 'Critical') {
                this.style.background = 'rgba(255, 82, 82, 0.1)';
                this.style.borderColor = 'var(--danger)';
            }
        });
    });
};

window.submitReservation = async (hospitalId, type, hospitalName) => {
    const address = document.getElementById('res-address').value;
    const urgency = document.getElementById('res-urgency').value;
    const btn = event.target;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/patient/reserve_bed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: user.id,
                hospital_id: hospitalId,
                bed_type: type,
                address: address || "Not Provided",
                urgency: urgency
            })
        });

        const data = await res.json();
        const modal = document.getElementById('reservation-modal');
        if (modal) modal.remove();

        if (res.ok) {
            alert(`Success! You have reserved a ${type} at ${hospitalName} for 30 minutes. Please proceed immediately.`);

            // Reload beds and reservations
            searchBeds();
            loadReservations();

            // Switch to history tab automatically
            const tabs = document.querySelectorAll('#history-tabs .tab-btn');
            if (tabs[1]) tabs[1].click();
            document.getElementById('history').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert(data.error || "Failed to reserve bed.");
        }
    } catch (err) {
        console.error("Reservation request failed", err);
        alert("Network error trying to reserve bed. Please try again.");
        const modal = document.getElementById('reservation-modal');
        if (modal) modal.remove();
    }
};

// --- Tabs setup ---
function setupTabs() {
    const tabs = document.querySelectorAll('#history-tabs .tab-btn');
    const aptSection = document.getElementById('appointment-history');
    const bedSection = document.getElementById('bed-reservation-history');

    tabs[0].addEventListener('click', () => {
        tabs[0].classList.add('active');
        tabs[0].style.borderBottom = '2px solid var(--primary-color)';
        tabs[0].style.color = 'var(--primary-color)';

        tabs[1].classList.remove('active');
        tabs[1].style.borderBottom = 'none';
        tabs[1].style.color = 'var(--text-muted)';

        aptSection.style.display = 'block';
        bedSection.style.display = 'none';
    });

    tabs[1].addEventListener('click', () => {
        tabs[1].classList.add('active');
        tabs[1].style.borderBottom = '2px solid var(--primary-color)';
        tabs[1].style.color = 'var(--primary-color)';

        tabs[0].classList.remove('active');
        tabs[0].style.borderBottom = 'none';
        tabs[0].style.color = 'var(--text-muted)';

        aptSection.style.display = 'none';
        bedSection.style.display = 'block';
    });
}
