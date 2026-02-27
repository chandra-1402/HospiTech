const API_URL = 'http://127.0.0.1:9000/api';

// --- Theme Toggle ---
const themeToggleBtn = document.getElementById('theme-toggle');
const rootElement = document.documentElement;

function setTheme(theme) {
    if (theme === 'light') {
        rootElement.setAttribute('data-theme', 'light');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun_o"></i>';
    } else {
        rootElement.setAttribute('data-theme', 'dark');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    localStorage.setItem('theme', theme);
}

const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = rootElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

// --- Fetch & Display Hospitals ---
async function fetchHospitals() {
    try {
        const response = await fetch(`${API_URL}/hospitals`);
        const hospitals = await response.json();

        displayHospitals(hospitals);
        updateStats(hospitals);

    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('hospital-results').innerHTML = `<p style="color:var(--danger-color)">Unable to load live data. Is the backend running?</p>`;
    }
}

function displayHospitals(hospitals) {
    const container = document.getElementById('hospital-results');
    container.innerHTML = '';

    if (hospitals.length === 0) {
        container.innerHTML = '<p>No hospitals found matching your criteria.</p>';
        return;
    }

    hospitals.forEach(hospital => {
        const card = document.createElement('div');
        card.className = 'hospital-card';
        card.innerHTML = `
            <div class="hospital-info">
                <h3>${hospital.name}</h3>
                <p><i class="fa-solid fa-location-dot"></i> ${hospital.location} &bull; <i class="fa-solid fa-phone"></i> ${hospital.contact}</p>
            </div>
            
            <div class="hospital-stats">
               <div class="bed-tags">
                   <div class="bed-tag">
                       <strong>${hospital.available_beds}</strong> BEDS FREE
                   </div>
               </div>
            </div>

            <div class="hospital-actions">
               <button class="btn-primary" onclick="showHospitalDetails(${hospital.id})">
                   <i class="fa-solid fa-calendar-check"></i> Book Bed
               </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateStats(hospitals) {
    let totalHospitals = hospitals.length;
    let totalICU = 0; // Backend aggregation doesn't distinguish deeply here, simplistic sum
    let totalGeneral = 0;

    // For landing page stats, we might want a separate API or just sum total available
    // Here we just sum total available beds as a proxy since we lost specific icu/general columns in the aggregate view
    // To be precise we'd need the backend to return types summary.
    // For now, let's just show total available as 'General' and 0 as ICU to avoid confusion or just sum up.
    let totalAvailable = 0;
    hospitals.forEach(h => totalAvailable += h.available_beds);

    document.getElementById('count-hospitals').innerText = totalHospitals;
    document.getElementById('count-icu').innerText = "-"; // Removed static distinction
    document.getElementById('count-general').innerText = totalAvailable;
}

// --- Search Functionality ---
async function searchHospitals() {
    const query = document.getElementById('hospital-search').value;
    try {
        const response = await fetch(`${API_URL}/hospitals/search?q=${encodeURIComponent(query)}`);
        const hospitals = await response.json();
        displayHospitals(hospitals);
    } catch (error) {
        console.error("Search error:", error);
    }
}

// --- Modal Functionality ---
async function showHospitalDetails(hospitalId) {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('modal-content-body');
    const title = document.getElementById('modal-hospital-name');

    // Show loading state
    content.innerHTML = '<p style="text-align:center; padding: 2rem;">Loading details...</p>';
    modal.classList.add('active');

    try {
        const response = await fetch(`${API_URL}/hospital/${hospitalId}/details`);
        const data = await response.json();

        title.innerText = data.hospital.name;

        let html = '';

        // Beds Section
        html += '<div class="detail-section"><h4><i class="fa-solid fa-bed"></i> Available Beds</h4>';
        if (data.beds.length === 0) {
            html += '<p>No bed information available.</p>';
        } else {
            html += '<div class="detail-grid">';
            data.beds.forEach(bed => {
                html += `
                    <div class="detail-card">
                        <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);">${bed.bed_type}</div>
                        <div class="resource-count" style="color: ${bed.available_count > 0 ? 'var(--success)' : 'var(--danger)'}">
                            ${bed.available_count} <span style="font-size: 0.9rem; color: var(--text-muted);">/ ${bed.total_count}</span>
                        </div>
                        <div class="resource-meta">
                            <span>$${bed.price}/day</span>
                            <span style="color: ${bed.available_count > 0 ? 'var(--success)' : 'var(--danger)'}">
                                ${bed.available_count > 0 ? 'Available' : 'Full'}
                            </span>
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        // Doctors Section
        html += '<div class="detail-section"><h4><i class="fa-solid fa-user-md"></i> Medical Staff</h4>';
        if (data.doctors.length === 0) {
            html += '<p>No doctor information available.</p>';
        } else {
            html += '<table class="data-table" style="margin-top:0;"><thead><tr><th>Name</th><th>Specialization</th><th>Availability</th></tr></thead><tbody>';
            data.doctors.forEach(doc => {
                html += `
                    <tr>
                        <td style="font-weight: 600;">${doc.name} ${doc.is_visiting ? '<span style="font-size:0.7rem; background:var(--warning); color:black; padding:2px 5px; border-radius:4px;">Visiting</span>' : ''}</td>
                        <td>${doc.specialization}</td>
                        <td>${doc.availability}</td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
        }

        content.innerHTML = html;

        // Add Modal Footer with Actions
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.marginTop = '2rem';
        footer.style.textAlign = 'right';
        footer.style.borderTop = '1px solid var(--border-color)';
        footer.style.paddingTop = '1rem';

        const user = JSON.parse(localStorage.getItem('user'));
        let actionBtn = '';

        if (user && user.role === 'patient') {
            actionBtn = `<button class="btn-primary" onclick="window.location.href='patient/index.html'">Go to Dashboard to Book</button>`;
        } else if (user) {
            actionBtn = `<span class="text-muted">Logged in as ${user.role}</span>`;
        } else {
            actionBtn = `<button class="btn-primary" onclick="window.location.href='login.html'">Login to Book</button>`;
        }

        footer.innerHTML = actionBtn;
        content.appendChild(footer);

    } catch (err) {
        console.error("Failed to load details", err);
        content.innerHTML = '<p style="color: var(--danger);">Failed to load details.</p>';
    }
}

function closeModal() {
    document.getElementById('details-modal').classList.remove('active');
}

// Close on outside click
document.getElementById('details-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('details-modal')) {
        closeModal();
    }
});


// Auto-run on load
window.addEventListener('DOMContentLoaded', () => {
    // Attempt compatibility init
    fetch(`${API_URL}/init_dummy_data`, { method: 'POST' })
        .then(() => fetchHospitals())
        .catch(err => console.log("Backend might not be ready yet", err));

    updateNavbar();
});

function updateNavbar() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            const loginLi = navLinks.lastElementChild;
            if (loginLi) {
                let dashUrl = '#';
                if (user.role === 'patient') dashUrl = 'patient/index.html';
                else if (user.role === 'hospital_staff') dashUrl = 'hospital/index.html';
                else if (user.role === 'lab_tech') dashUrl = 'labs/index.html';
                else if (user.role === 'admin') dashUrl = 'admin/index.html';

                loginLi.innerHTML = `<a href="${dashUrl}" class="btn-primary" style="padding: 0.5rem 1.5rem;"><i class="fa-solid fa-user-circle"></i> Dashboard</a>`;
            }
        }
    }
}
