const API_URL = 'http://127.0.0.1:9000/api';
const user = JSON.parse(localStorage.getItem('user'));
// Fallback logic for legacy users or dev testing: default to hospital_id=1 if not present
const hospitalId = user?.hospital_id || 1;

if (!user) {
    window.location.href = '../login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        userNameEl.innerText = user.full_name || user.username;
    }
    loadDashboardData();
});

// --- Dashboard Data ---
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/hospital/${hospitalId}/details?_t=${Date.now()}`);
        const data = await response.json();

        if (data.hospital) {
            document.getElementById('hospital-name').innerText = data.hospital.name;
        }

        renderBeds(data.beds);
        renderDoctors(data.doctors);

        // Emergency module is currently hidden until backend supports it
        // renderMockEmergencies();
        loadAnalytics();
        loadAppointments();

    } catch (err) {
        console.error("Failed to load dashboard data", err);
    }
}

function renderBeds(beds) {
    const list = document.getElementById('bed-list');
    if (!list) return;
    list.innerHTML = '';
    if (!beds || beds.length === 0) {
        list.innerHTML = '<p class="text-muted">No beds configured.</p>';
        return;
    }

    beds.forEach(bed => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.style.cssText = "display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid var(--border-color);";
        item.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-main);">${bed.bed_type}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">₹${bed.price}/day</div>
            </div>
            <div style="text-align: right; margin-right: 1.5rem;">
                <div style="color: ${bed.available_count > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">
                    ${bed.available_count} <span style="font-size: 0.8rem; color: var(--text-muted);">/ ${bed.total_count}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Available</div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-direction: column; justify-content: center;">
                <button class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--primary-color);" onclick="editBed('${bed.bed_type}', ${bed.price}, ${bed.total_count}, ${bed.available_count})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--danger); border: none;" onclick="deleteBed(${bed.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.editBed = function (type, price, total, available) {
    document.getElementById('bed-type').value = type;
    document.getElementById('bed-price').value = price;
    document.getElementById('bed-total').value = total;
    document.getElementById('bed-available').value = available;
    // Scroll to form smoothly
    document.getElementById('bed-type').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.deleteBed = async function (bedId) {
    if (!confirm('Are you sure you want to delete this bed type completely?')) return;

    try {
        const res = await fetch(`${API_URL}/hospital/beds/${bedId}`, {
            method: 'DELETE',
        });
        if (res.ok) {
            loadDashboardData(); // Refresh the data
        } else {
            alert('Failed to delete bed');
        }
    } catch (err) {
        console.error(err);
        alert('Server Error');
    }
}

function escapeQuotes(str) {
    return str ? str.toString().replace(/'/g, "\\'") : '';
}

function parseTime12h(timeStr) {
    if (!timeStr) return null;
    let match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1]);
    let minutes = match[2] ? parseInt(match[2]) : 0;
    const isPM = match[3].toUpperCase() === 'PM';
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
}

function isShiftOver(hoursStr) {
    if (!hoursStr) return false;
    const parts = hoursStr.split('-');
    if (parts.length === 2) {
        const endTime = parseTime12h(parts[1].trim());
        if (endTime) {
            return new Date() > endTime; // Shift is over if current time is past end time
        }
    }
    return false;
}

function renderDoctors(doctors) {
    const list = document.getElementById('doctor-list');
    if (!list) return;
    list.innerHTML = '';

    if (!doctors || doctors.length === 0) {
        list.innerHTML = '<p class="text-muted" style="padding:1rem;">No doctors registered in roster.</p>';
        return;
    }

    doctors.forEach(doc => {
        const item = document.createElement('div');
        const isAvail = (doc.is_available === 1 || doc.is_available === undefined || doc.is_available === null);

        item.style.cssText = `padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; border-radius: 8px; background: rgba(0,0,0,0.2); margin-bottom: 0.5rem; border-left: 4px solid ${isAvail ? 'var(--success)' : 'var(--danger)'}; opacity: ${isAvail ? '1' : '0.6'}; transition: opacity 0.3s;`;

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--border-color); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    ${doc.image && doc.image.trim() !== '' ? `<img src="${doc.image}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fa-solid fa-user-doctor" style="font-size: 1.5rem; color: var(--text-muted);"></i>`}
                </div>
                <div>
                    <div style="font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                        ${doc.name} 
                        ${doc.is_visiting ? '<span style="font-size: 0.7rem; background: var(--warning); color: black; padding: 2px 6px; border-radius: 4px;">Visiting</span>' : ''}
                        <span style="font-size: 0.7rem; background: ${isAvail ? 'rgba(0,200,83,0.2)' : 'rgba(255,23,68,0.2)'}; color: ${isAvail ? 'var(--success)' : 'var(--danger)'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isAvail ? 'var(--success)' : 'var(--danger)'};">${isAvail ? 'Available' : 'Off Duty'}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.2rem;">${doc.specialization}</div>
                    <div style="font-size: 0.85rem; color: var(--primary-color); margin-top: 0.4rem;">
                        <i class="fa-regular fa-calendar" style="margin-right:4px;"></i> ${doc.days || 'N/A'} &nbsp;|&nbsp; 
                        <i class="fa-regular fa-clock" style="margin-right:4px;"></i> ${doc.hours || doc.availability || 'N/A'}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                <button class="btn-primary" title="${isAvail ? 'Mark Off Duty' : 'Mark Available'}" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; background: ${isAvail ? 'var(--danger)' : 'var(--success)'}; color: #fff; border: none; width: 100px;" onclick="toggleDoctorStatus(${doc.id})">
                    <i class="fa-solid ${isAvail ? 'fa-toggle-off' : 'fa-toggle-on'}"></i> ${isAvail ? 'Disable' : 'Enable'}
                </button>
                <div style="display: flex; gap: 0.5rem; width: 100px;">
                    <button class="btn-primary" title="Edit" style="flex: 1; padding: 0.4rem 0; font-size: 0.8rem; background: var(--primary-color);" onclick="editDoctor(${doc.id}, '${escapeQuotes(doc.name)}', '${escapeQuotes(doc.specialization)}', '${escapeQuotes(doc.days)}', '${escapeQuotes(doc.hours)}', '${escapeQuotes(doc.image)}', ${doc.is_visiting})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-primary" title="Remove" style="flex: 1; padding: 0.4rem 0; font-size: 0.8rem; background: transparent; border: 1px solid var(--danger); color: var(--danger);" onclick="deleteDoctor(${doc.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

window.toggleDoctorStatus = async function (id) {
    try {
        const res = await fetch(`${API_URL}/hospital/doctors/${id}/status`, { method: 'PUT' });
        if (res.ok) {
            loadDashboardData(); // Refresh list to see changes
        } else {
            alert('Failed to update status');
        }
    } catch (err) {
        console.error(err);
        alert('Network error updating doctor status');
    }
}

window.editDoctor = function (id, name, spec, days, hours, image, visiting) {
    const docIdEl = document.getElementById('doc-id');
    if (!docIdEl) return;
    docIdEl.value = id;
    document.getElementById('doc-name').value = name;
    document.getElementById('doc-spec').value = spec;
    document.getElementById('doc-days').value = days === 'undefined' || days === 'null' ? '' : days;
    document.getElementById('doc-hours').value = hours === 'undefined' || hours === 'null' ? '' : hours;

    const existingImg = image === 'undefined' || image === 'null' ? '' : image;
    const existingImgEl = document.getElementById('doc-existing-image');
    if (existingImgEl) existingImgEl.value = existingImg;

    const docImgInput = document.getElementById('doc-image');
    if (docImgInput) docImgInput.value = '';

    const previewContainer = document.getElementById('doc-image-preview');
    if (previewContainer) {
        if (existingImg) {
            previewContainer.style.display = 'block';
            previewContainer.querySelector('img').src = existingImg;
        } else {
            previewContainer.style.display = 'none';
        }
    }

    document.getElementById('doc-visiting').checked = (visiting == 1);
    document.getElementById('doc-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.deleteDoctor = async function (id) {
    if (!confirm('Are you sure you want to remove this doctor from the roster?')) return;
    try {
        const res = await fetch(`${API_URL}/hospital/doctors/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadDashboardData();
        } else {
            alert('Failed to delete doctor');
        }
    } catch (err) {
        console.error(err);
        alert('Server Error');
    }
};

// Add preview functionality for Doctor Image
document.getElementById('doc-image')?.addEventListener('change', function (e) {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewContainer = document.getElementById('doc-image-preview');
            if (previewContainer) {
                previewContainer.style.display = 'block';
                previewContainer.querySelector('img').src = e.target.result;
            }
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// --- Forms ---
// Bed Form
document.getElementById('bed-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
        hospital_id: hospitalId,
        bed_type: document.getElementById('bed-type').value,
        total_count: parseInt(document.getElementById('bed-total').value),
        available_count: parseInt(document.getElementById('bed-available').value),
        price: parseFloat(document.getElementById('bed-price').value)
    };

    if (body.available_count > body.total_count) {
        alert("Error: Available beds cannot exceed Total beds.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/hospital/beds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            alert('Bed Inventory Updated');
            loadDashboardData();
        }
    } catch (err) { console.error(err); alert('Failed to update bed'); }
});

// Doctor Form
document.getElementById('doctor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const docId = document.getElementById('doc-id').value;

    let base64Image = document.getElementById('doc-existing-image')?.value || '';
    const fileInput = document.getElementById('doc-image');

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(fileInput.files[0]);
        });
    }

    const body = {
        id: docId || null,
        hospital_id: hospitalId,
        name: document.getElementById('doc-name').value,
        specialization: document.getElementById('doc-spec').value,
        days: document.getElementById('doc-days').value,
        hours: document.getElementById('doc-hours').value,
        image: base64Image,
        is_visiting: document.getElementById('doc-visiting').checked ? 1 : 0
    };

    try {
        const res = await fetch(`${API_URL}/hospital/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            document.getElementById('doctor-form').reset();
            document.getElementById('doc-id').value = '';
            if (document.getElementById('doc-existing-image')) document.getElementById('doc-existing-image').value = '';
            if (document.getElementById('doc-image-preview')) document.getElementById('doc-image-preview').style.display = 'none';
            loadDashboardData();
        }
    } catch (err) { console.error(err); alert('Failed to add doctor'); }
});

// --- Mock Data Rendering for New Sections ---

function renderMockEmergencies() {
    const list = document.getElementById('emergency-list');
    const emergencies = [
        { patient: 'John Doe', ETA: '5 mins', bedType: 'ICU', unit: 'Ambulance 04' },
        { patient: 'Sarah Lee', ETA: '12 mins', bedType: 'Ventilator', unit: 'Ambulance 12' }
    ];

    if (emergencies.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 1.1rem;">No active emergencies.</p>';
        return;
    }

    list.innerHTML = '';
    emergencies.forEach(em => {
        const item = document.createElement('div');
        item.style.cssText = "padding: 1.5rem; border: 1px solid var(--danger); border-radius: var(--radius-md); background: rgba(255, 82, 82, 0.05); display: flex; flex-direction: column; min-width: 280px; flex: 1;";
        item.innerHTML = `
            <div style="font-weight: 700; color: var(--text-main); font-size: 1.4rem;">${em.patient}</div>
            <div style="font-size: 1rem; color: var(--text-muted); margin-top: 0.5rem;"><i class="fa-solid fa-truck-medical" style="color: var(--danger);"></i> ${em.unit} &bull; Booking: <span style="color: var(--danger);">${em.bedType}</span></div>
            <div style="color: var(--warning); font-weight: 700; font-size: 1.4rem; margin-top: auto; padding-top: 1rem;">ETA: ${em.ETA}</div>
        `;
        list.appendChild(item);
    });
}

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/hospital/${hospitalId}/analytics?_t=${Date.now()}`);
        const data = await response.json();

        const patientsStat = document.getElementById('stat-patients-served');
        const peakStat = document.getElementById('stat-peak-hours');

        // Show actual number of patients from the database
        if (patientsStat) patientsStat.innerText = data.patients_served || 0;
        if (peakStat) peakStat.innerText = data.peak_hours || 'N/A';
    } catch (err) {
        console.error("Failed to load analytics", err);
        const patientsStat = document.getElementById('stat-patients-served');
        if (patientsStat) patientsStat.innerText = '0';
    }
}

async function loadAppointments() {
    const tbody = document.getElementById('appointment-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/hospital/${hospitalId}/appointments?_t=${Date.now()}`);
        const appointments = await res.json();

        tbody.innerHTML = '';
        if (appointments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No appointments booked for today.</td></tr>';
            return;
        }

        appointments.forEach(apt => {
            const tr = document.createElement('tr');
            tr.dataset.id = apt.id;

            let statusHtml = '';
            if (apt.status === 'Checked-in') statusHtml = '<span style="color: var(--primary-color);">Checked-in</span>';
            else if (apt.status === 'Completed') statusHtml = '<span style="color: var(--success);">Completed</span>';
            else statusHtml = '<span style="color: var(--warning);">Pending</span>';

            tr.innerHTML = `
                <td style="font-weight: 600;">${apt.patient_name || apt.patient_username}</td>
                <td>${apt.doctor_name}</td>
                <td>${new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td class="status-badge">${statusHtml}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;" class="action-btns">
                        <button class="btn-action-checkin" style="background: transparent; border: 1px solid var(--primary-color); color: var(--primary-color); cursor: pointer; padding: 0.3rem 0.6rem; border-radius: var(--radius-md); font-size: 0.8rem;" title="Check-in Patient" ${apt.status === 'Checked-in' || apt.status === 'Completed' ? 'style="display:none;"' : ''}><i class="fa-solid fa-check"></i> In</button>
                        <button class="btn-action-complete" style="background: transparent; border: 1px solid var(--success); color: var(--success); cursor: pointer; padding: 0.3rem 0.6rem; border-radius: var(--radius-md); font-size: 0.8rem;" title="Mark Completed" ${apt.status === 'Completed' ? 'style="display:none;"' : ''}><i class="fa-solid fa-flag-checkered"></i> Done</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to load appointments", err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Failed to load appointments.</td></tr>';
    }
}

// Global Event Delegation for Appointment Actions
document.getElementById('appointment-list')?.addEventListener('click', async (e) => {
    if (e.target.closest('.btn-action-checkin') || e.target.closest('.btn-action-complete')) {
        const isCheckIn = !!e.target.closest('.btn-action-checkin');
        const tr = e.target.closest('tr');
        const aptId = tr.dataset.id;
        const newStatus = isCheckIn ? 'Checked-in' : 'Completed';

        try {
            const res = await fetch(`${API_URL}/hospital/appointments/${aptId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                if (isCheckIn) {
                    tr.querySelector('.status-badge').innerHTML = '<span style="color: var(--primary-color);">Checked-in</span>';
                } else {
                    tr.querySelector('.status-badge').innerHTML = '<span style="color: var(--success);">Completed</span>';
                    setTimeout(() => tr.remove(), 1000);
                }
            } else {
                alert("Failed to update status");
            }
        } catch (err) {
            console.error("Status update error", err);
        }
    }
});

