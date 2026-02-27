const API_URL = 'http://127.0.0.1:9000/api';
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = '../login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupModals();
    loadAdminStats();
    loadHospitals();
});

// --- Modals ---
function setupModals() {
    window.openProfileModal = () => {
        document.getElementById('profile-name').value = user.full_name;
        document.getElementById('profile-modal').classList.add('active');
    };

    window.openHospitalModal = () => {
        document.getElementById('hospital-modal').classList.add('active');
    }

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
                password: password || undefined
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Profile updated successfully!');
            localStorage.setItem('user', JSON.stringify(data.user));
            closeModal('profile-modal');
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to update profile');
    }
}

// --- Admin Features ---
async function loadAdminStats() {
    try {
        const res = await fetch(`${API_URL}/hospitals`);
        const hospitals = await res.json();
        document.getElementById('stat-active-hospitals').innerText = hospitals.length;

        let totalBeds = 0;
        let availableBeds = 0;
        hospitals.forEach(h => {
            totalBeds += (h.total_beds || 0);
            availableBeds += (h.available_beds || 0);
        });

        // Occupancy %
        const occupancy = totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 0;
        document.getElementById('stat-occupancy').innerText = `${occupancy}%`;

    } catch (err) { console.error(err); }
}

async function createHospital(e) {
    e.preventDefault();
    const name = document.getElementById('hosp-name').value;
    const location = document.getElementById('hosp-location').value;
    const contact = document.getElementById('hosp-contact').value;

    try {
        const res = await fetch(`${API_URL}/admin/hospitals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, location, contact })
        });
        if (res.ok) {
            alert('Hospital Added Successfully');
            closeModal('hospital-modal');
            document.getElementById('hospital-form').reset();
            loadAdminStats();
            loadHospitals();
        }
    } catch (err) { console.error(err); alert('Failed to add hospital'); }
}

async function loadHospitals() {
    // For now, reuse the existing Recent Uploads table structure or similar
    // The previous HTML didn't really have a list of hospitals, just "Live System Logs"
    // We can populate that with real hospitals if needed, but let's stick to updating the stats for now as per the "overview" nature.
    // However, let's dump the hospital list into the table area just to show data connectivity.

    try {
        const res = await fetch(`${API_URL}/hospitals`);
        const hospitals = await res.json();
        const tbody = document.querySelector('.data-table tbody');
        tbody.innerHTML = '';

        hospitals.forEach(h => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>ID: ${h.id}</td>
                <td>${h.name}</td>
                <td>${h.location}</td>
                <td><span class="status-badge status-active">Active</span></td>
            `;
            tbody.appendChild(tr);
        });

        // Update headers to match
        const thead = document.querySelector('.data-table thread tr');
        if (thead) thead.innerHTML = '<th>ID</th><th>Name</th><th>Location</th><th>Status</th>';

    } catch (err) { }
}
