
// -- Check Authentication --
function checkAuth(requiredRole) {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '../login.html?role=' + requiredRole;
        return;
    }

    const user = JSON.parse(userStr);

    // Check if role matches
    if (user.role !== requiredRole) {
        alert("Access Denied: You are not authorized for this portal.");
        window.location.href = '../index.html';
    }
}

// -- Logout Function --
function logout() {
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

// Attach logout to buttons automatically if present
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtns = document.querySelectorAll('.logout-btn'); // Add class logout-btn to your logout links
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });

    initGlobalClock();
});

function initGlobalClock() {
    // If clock already exists, don't duplicate
    if (document.getElementById('global-clock-display')) return;

    let navLinks = document.querySelector('.nav-links');
    if (!navLinks) {
        // Fallback for non-portal pages (like index.html)
        navLinks = document.querySelector('nav ul');
    }

    if (navLinks) {
        const li = document.createElement('li');
        li.style.cssText = "color: var(--text-muted); font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; margin-left: 1rem; border-left: 1px solid var(--border-color); padding-left: 1rem;";
        li.innerHTML = '<i class="fa-regular fa-clock"></i> <span id="global-clock-display"></span>';
        navLinks.appendChild(li);

        const updateClock = () => {
            const span = document.getElementById('global-clock-display');
            if (span) span.innerText = new Date().toLocaleString();
        };
        updateClock();
        setInterval(updateClock, 1000);
    }
}
