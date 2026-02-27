const API_URL = 'http://127.0.0.1:9000/api';
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = '../login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Basic setup
    setupModals();
});

// --- Modals ---
function setupModals() {
    window.openProfileModal = () => {
        document.getElementById('profile-name').value = user.full_name;
        document.getElementById('profile-modal').classList.add('active');
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

// --- Report Upload ---
const form = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');

// Drag and drop
const dropArea = document.getElementById('drop-area');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false)
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false)
});

function highlight(e) {
    dropArea.classList.add('highlight');
    dropArea.style.borderColor = 'var(--primary-color)';
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
    dropArea.style.borderColor = 'var(--border-color)';
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        fileInput.files = files;
        updateFileList(files[0].name);
    }
}

fileInput.addEventListener('change', (e) => {
    if (fileInput.files.length > 0) {
        updateFileList(fileInput.files[0].name);
    }
});

function updateFileList(name) {
    document.getElementById('file-name-display').innerText = `Selected: ${name}`;
}

// --- Patient Search Logic ---
window.searchPatient = async () => {
    const hid = document.getElementById('search-hospitrack-id').value;
    const err = document.getElementById('search-error');
    err.style.display = 'none';

    if (!hid) {
        err.innerText = "Please enter a Hospitrack ID.";
        err.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/patient/search?hospitrack_id=${encodeURIComponent(hid)}`);
        const data = await res.json();

        if (res.ok) {
            document.getElementById('patient-id').value = data.id;
            document.getElementById('profile-name').innerText = data.full_name || data.username;
            document.getElementById('profile-id').innerText = data.hospitrack_id;

            document.getElementById('search-section').style.display = 'none';
            document.getElementById('patient-profile').style.display = 'block';
            document.getElementById('upload-form').style.display = 'block';
        } else {
            err.innerText = data.error || "Patient not found. Check the ID and try again.";
            err.style.display = 'block';
        }
    } catch (error) {
        err.innerText = "Server connection failed.";
        err.style.display = 'block';
    }
}

window.resetSearch = () => {
    document.getElementById('patient-id').value = "";
    document.getElementById('search-hospitrack-id').value = "";

    document.getElementById('search-section').style.display = 'block';
    document.getElementById('patient-profile').style.display = 'none';
    document.getElementById('upload-form').style.display = 'none';

    // reset form inputs
    form.reset();
    document.getElementById('file-name-display').innerText = '';
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('patient-id').value;
    const reportType = document.getElementById('report-type').value;
    const appointmentNo = document.getElementById('appointment-no') ? document.getElementById('appointment-no').value : '';

    if (!fileInput.files[0]) {
        alert("Please select a file first.");
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('patient_id', patientId);
    if (appointmentNo) formData.append('appointment_no', appointmentNo);
    formData.append('report_type', reportType);
    formData.append('lab_name', user.full_name || 'Lab Tech');

    try {
        const res = await fetch(`${API_URL}/lab/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            alert("Report uploaded successfully to the patient's Health Vault!");
            resetSearch();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Upload failed.");
    }
});
