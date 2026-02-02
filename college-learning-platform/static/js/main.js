document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Initialize Theme

    // --- Global: Hamburger Menu ---
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const backdrop = document.getElementById('backdrop');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('open');
            backdrop.classList.add('active');
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            backdrop.classList.remove('active');
        });
    }

    // --- Login Page Logic ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            const errorMsg = document.getElementById('errorMsg');
            const submitBtn = loginForm.querySelector('button');

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, role })
                });

                const data = await response.json();

                if (data.success) {
                    window.location.href = data.redirect;
                } else {
                    errorMsg.style.display = 'block';
                    errorMsg.innerText = data.error || 'Login failed';
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Login';
                }
            } catch (err) {
                console.error(err);
                errorMsg.style.display = 'block';
                errorMsg.innerText = 'Server error. Please try again.';
                submitBtn.disabled = false;
                submitBtn.innerText = 'Login';
            }
        });
    }

    // --- Portal Logic (Student & Faculty) ---
    const context = document.getElementById('portalContext');
    if (context) {
        const role = context.dataset.role;
        const dept = context.dataset.dept;
        const year = context.dataset.year; // only for student


        // Load Notes
        fetchNotes(role, dept, year);

        // Load Reminders (Student Only)
        if (role === 'student') {
            fetchReminders(dept, year);
        }
    }

    // --- Reminders Logic ---
    // --- Reminders Logic ---
    async function fetchReminders(dept, year) {
        const container = document.getElementById('remindersList');
        // section logic removed as it is inside modal now

        const desktopBadge = document.getElementById('desktopBadge');
        const mobileBadge = document.getElementById('mobileBadge');

        try {
            const res = await fetch('/api/reminders');
            const reminders = await res.json();

            if (container) container.innerHTML = '';

            if (reminders.length > 0) {
                // Update Badges
                if (desktopBadge) {
                    desktopBadge.style.display = 'block';
                    desktopBadge.innerText = reminders.length > 9 ? '9+' : reminders.length;
                }
                if (mobileBadge) {
                    mobileBadge.style.display = 'block';
                }

                if (container) {
                    reminders.forEach(r => {
                        const div = document.createElement('div');
                        div.style.cssText = 'padding: 0.75rem; border-bottom: 1px solid var(--border); background: var(--bg-body); border-radius: 6px; margin-bottom: 0.5rem;';
                        div.innerHTML = `
                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.25rem;">
                                ${r.message}
                            </div>
                            <div style="font-size: 0.8rem; color: var(--secondary); display: flex; justify-content: space-between;">
                                <span><i class="fas fa-user-tie"></i> ${r.faculty_name || 'Faculty'}</span>
                                <span>${new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                        `;
                        container.appendChild(div);
                    });
                }
            } else {
                if (container) container.innerHTML = '<p style="text-align:center; color:var(--secondary); padding: 1rem;">No new reminders.</p>';
                if (desktopBadge) desktopBadge.style.display = 'none';
                if (mobileBadge) mobileBadge.style.display = 'none';
            }
        } catch (err) {
            console.error("Failed to fetch reminders:", err);
            if (container) container.innerHTML = '<p style="color:red; text-align:center;">Failed to load reminders</p>';
        }
    }

    // Faculty: Fetch Sent Reminders
    window.fetchFacultyReminders = async function () {
        const container = document.getElementById('facultyRemindersList');
        if (!container) return;

        container.innerHTML = '<p style="text-align:center; color:var(--secondary);">Loading...</p>';

        try {
            const res = await fetch('/api/reminders'); // Faculty gets their dept reminders
            const reminders = await res.json();

            container.innerHTML = '';

            if (reminders.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:var(--secondary); padding: 1rem;">No reminders sent yet.</p>';
                return;
            }

            reminders.forEach(r => {
                const div = document.createElement('div');
                div.style.cssText = 'padding: 0.75rem; border: 1px solid var(--border); background: var(--bg-body); border-radius: 6px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: start;';

                div.innerHTML = `
                    <div style="flex:1; padding-right:1rem;">
                        <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.25rem;">
                            Year ${r.target_year}: ${r.message}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--secondary);">
                            Sent: ${new Date(r.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <button onclick="deleteReminder(${r.id})" class="btn" style="color: var(--danger); padding: 0.2rem 0.5rem;" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                container.appendChild(div);
            });

        } catch (err) {
            console.error("Failed to fetch sent reminders:", err);
            container.innerHTML = '<p style="color:red; text-align:center;">Failed to load.</p>';
        }
    };

    // Global Delete Reminder
    window.deleteReminder = async function (id) {
        showCustomConfirm("Are you sure you want to delete this reminder?", async () => {
            try {
                const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
                const data = await res.json();

                if (res.ok) {
                    showToast("Reminder deleted", "success");
                    fetchFacultyReminders(); // Refresh list
                } else {
                    showToast(data.error || "Failed to delete", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error deleting reminder", "error");
            }
        });
    };

    // --- Faculty Upload Logic ---
    const uploadForm = document.getElementById('uploadForm');
    const uploadDept = document.getElementById('uploadDept');
    const uploadYear = document.getElementById('uploadYear');
    const uploadSubject = document.getElementById('uploadSubject');

    if (uploadForm) {
        // Event Listeners for Dept/Year change
        if (uploadDept && uploadYear) {
            uploadDept.addEventListener('change', loadSubjects);
            uploadYear.addEventListener('change', loadSubjects);

            // Initial load
            loadSubjects();
        }

        async function loadSubjects() {
            const dept = uploadDept.value;
            const year = uploadYear.value;

            if (!dept || !year) {
                uploadSubject.innerHTML = '<option value="">Select Dept & Year first</option>';
                uploadSubject.disabled = true;
                return;
            }

            try {
                uploadSubject.disabled = true;
                uploadSubject.innerHTML = '<option>Loading...</option>';

                const res = await fetch(`/api/subjects/${dept}/${year}`);
                const subjects = await res.json();

                uploadSubject.innerHTML = '';

                if (subjects.length > 0) {
                    uploadSubject.disabled = false;
                    subjects.forEach(sub => {
                        const opt = document.createElement('option');
                        opt.value = sub;
                        opt.innerText = sub;
                        uploadSubject.appendChild(opt);
                    });
                } else {
                    uploadSubject.innerHTML = '<option value="">No subjects found</option>';
                }
            } catch (err) {
                console.error(err);
                uploadSubject.innerHTML = '<option value="">Error loading subjects</option>';
            }
        }

        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = uploadForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            const formData = new FormData(uploadForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/api/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();
                if (res.ok) {
                    showToast("Note Uploaded Successfully!", "success");
                    closeUploadModal();
                    uploadForm.reset();
                    // Refetch subjects to reset or keep state
                    loadSubjects();

                    // Refresh grid safely
                    const ctx = document.getElementById('portalContext');
                    if (ctx) {
                        fetchNotes('faculty', ctx.dataset.dept);
                    }
                } else {
                    showToast(result.error || "Upload failed", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error uploading note", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Close modal when clicking outside
    if (uploadModal) {
        window.onclick = function (e) {
            if (e.target == uploadModal) {
                closeUploadModal();
            }
        }
    }

    // Create Toast Container
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(toastContainer);
    }
});

// --- Helper Functions ---

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error("Toast container not found.");
        return;
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        display: flex; align-items: center; gap: 8px;
    `;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global function for note deletion
async function deleteNote(noteId) {
    showCustomConfirm("Are you sure you want to delete this note? This cannot be undone.", async () => {
        try {
            const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                showToast("Note deleted successfully", "success");
                // Refresh the grid
                const ctx = document.getElementById('portalContext');
                if (ctx) {
                    fetchNotes('faculty', ctx.dataset.dept);
                }
            } else {
                showToast(data.error || "Failed to delete note", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Error deleting note", "error");
        }
    });
}

async function fetchNotes(role, dept, year) {
    const grid = role === 'student' ? document.getElementById('notesGrid') : document.getElementById('facultyNotesGrid');
    if (!grid) return;

    let notesUrl = `/api/notes?dept=${dept}`;
    if (year) notesUrl += `&year=${year}`;

    try {
        // Parallel fetch: Notes + Subjects (for correct filtering)
        const promises = [fetch(notesUrl).then(r => r.json())];

        // Only fetch subjects if we are in Student view (need them for chips)
        if (role === 'student' && year) {
            promises.push(fetch(`/api/subjects/${dept}/${year}`).then(r => r.json()));
        }

        const [notes, subjects] = await Promise.all(promises);

        grid.innerHTML = '';

        if (notes.error) {
            grid.innerHTML = `<p style="color:red">${notes.error}</p>`;
            return;
        }

        // --- Logic Update: Use Full Subject List for Chips ---
        // If we have a subject list (Student view), use that. Otherwise fallback to unique from notes.
        const subjectList = (subjects && subjects.length > 0) ? subjects : [...new Set(notes.map(n => n.subject))];

        const chipContainer = document.querySelector('.chip-container');
        if (chipContainer && subjectList.length > 0) {
            // Keep first 'All' chip
            chipContainer.innerHTML = '<button class="chip active" onclick="filterNotes(\'all\', this)">All Subjects</button>';
            subjectList.forEach(sub => {
                const btn = document.createElement('button');
                btn.className = 'chip';
                btn.innerText = sub;
                btn.onclick = function () { filterNotes(sub, this); };
                chipContainer.appendChild(btn);
            });

            // Populate Hamburger Menu Subjects (if student)
            const mobileMenuList = document.getElementById('mobileSubjectList');
            if (mobileMenuList) {
                mobileMenuList.innerHTML = ''; // Clear previous
                subjectList.forEach(sub => {
                    const link = document.createElement('a');
                    link.href = "#";
                    link.className = "btn";
                    link.style.justifyContent = "flex-start";
                    link.style.fontSize = "0.9rem";
                    link.innerHTML = `<i class="fas fa-book" style="width:24px; color:var(--primary);"></i> ${sub}`;
                    link.onclick = (e) => {
                        e.preventDefault();
                        // Trigger filter (find the matching chip)
                        const chip = Array.from(document.querySelectorAll('.chip')).find(c => c.innerText === sub);
                        if (chip) filterNotes(sub, chip);

                        document.getElementById('mobileMenu').classList.remove('open');
                        document.getElementById('backdrop').classList.remove('active');
                    };
                    mobileMenuList.appendChild(link);
                });
            }
        }

        if (notes.length === 0) {
            grid.innerHTML = '<p style="color:var(--secondary)">No notes found for this section.</p>';
            return;
        }

        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'card subject-card';
            card.dataset.subject = note.subject; // For filtering
            card.innerHTML = `
                <div class="subject-header">
                    <span class="badge">${note.subject}</span>
                    <small style="color: var(--secondary);">${new Date(note.created_at).toLocaleDateString()}</small>
                </div>
                <h4 style="margin-bottom: 0.5rem;">${note.title}</h4>
                <p style="font-size: 0.9rem; color: var(--secondary); margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${note.description || 'No description'}
                </p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <div class="rating-stars" style="font-size: 0.8rem;">
                        <i class="fas fa-star"></i> 4.5
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${note.ai_summary ?
                    `<button onclick="toggleSummary(this)" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--secondary); color: white;">
                                <i class="fas fa-robot"></i> Summary
                            </button>` : ''}
                        <a href="${note.file_url}" target="_blank" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                            <i class="fas fa-download"></i> PDF
                        </a>
                    </div>
                </div>

                <!-- AI Summary Expandable Section (Mobile Responsive) -->
                ${note.ai_summary ? `
                <div class="ai-summary-section" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-left: 4px solid var(--secondary); border-radius: 4px; width: 100%; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; font-size: 1rem; color: var(--secondary);"><i class="fas fa-magic"></i> AI Summary</h4>
                        <button onclick="toggleSummary(this)" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0 0.5rem;">&times;</button>
                    </div>
                    <p style="white-space: pre-wrap; margin: 0; font-size: 0.9rem; line-height: 1.5; color: #333;">${note.ai_summary}</p>
                </div>
                ` : ''}

                ${note.youtube_link ? `<div style="margin-top: 0.5rem;"><a href="${note.youtube_link}" target="_blank" style="font-size: 0.8rem; color: red;"><i class="fab fa-youtube"></i> Watch Video</a></div>` : ''}

                ${role === 'faculty' ?
                    `<div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 0.5rem; text-align: right;">
                    <button onclick="deleteNote(${note.id})" class="btn" style="background: var(--danger); color: white; padding: 0.3rem 0.6rem; font-size: 0.75rem;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>` : ''}
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p>Failed to load notes.</p>';
    }
}

// --- Theme Toggle Logic ---
function toggleTheme() {
    const isDark = document.body.dataset.theme === 'dark';
    document.body.dataset.theme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');

    // Update icon
    const icon = document.querySelector('.theme-toggle i');
    if (icon) icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}

function toggleThemeMobile() {
    toggleTheme();
    document.getElementById('mobileMenu').classList.remove('open');
    document.getElementById('backdrop').classList.remove('active');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = savedTheme;
    const icon = document.querySelector('.theme-toggle i');
    if (icon) icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// --- Subject Filter Logic ---
function filterNotes(subject, btn) {
    // Update active chip
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');

    const cards = document.querySelectorAll('.subject-card');
    cards.forEach(card => {
        const cardSubject = card.dataset.subject;
        if (subject === 'all' || cardSubject === subject) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// --- Summary Toggle Logic ---
function toggleSummary(btn) {
    // Find the closest card container
    const card = btn.closest('.card');
    if (!card) return;

    // Find the summary section within this card
    const summary = card.querySelector('.ai-summary-section');
    if (!summary) return;

    // Toggle logic
    const isHidden = summary.style.display === 'none';

    // Optional: Close all other summaries first (Accordion effect)
    // document.querySelectorAll('.ai-summary-section').forEach(el => el.style.display = 'none');

    summary.style.display = isHidden ? 'block' : 'none';
}

// --- Personal Notes (LocalStorage) ---
function openPersonalNotes() {
    // Check if modal exists, if not create it
    let modal = document.getElementById('personalNotesModal');
    if (!modal) {
        createPersonalNotesModal();
        modal = document.getElementById('personalNotesModal');
    }
    loadPersonalNotes();
    modal.classList.add('active');

    // Close mobile menu if open
    document.getElementById('mobileMenu').classList.remove('open');
    document.getElementById('backdrop').classList.remove('active');
}

function createPersonalNotesModal() {
    const modalHtml = `
    <div class="modal" id="personalNotesModal">
        <div class="modal-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3>My Personal Notes</h3>
                <button onclick="document.getElementById('personalNotesModal').classList.remove('active')" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            
            <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
                <input type="text" id="newNoteInput" class="form-input" placeholder="Type a quick note..." onkeypress="if(event.key==='Enter') addPersonalNote()">
                <button onclick="addPersonalNote()" class="btn btn-primary"><i class="fas fa-plus"></i></button>
            </div>
            
            <div id="personalNotesList" style="display:flex; flex-direction:column; gap:0.5rem; max-height:300px; overflow-y:auto;">
                <!-- Notes loaded here -->
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function loadPersonalNotes() {
    const notes = JSON.parse(localStorage.getItem('my_personal_notes') || '[]');
    const list = document.getElementById('personalNotesList');
    list.innerHTML = '';

    if (notes.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--secondary);">No notes yet. Add one!</p>';
        return;
    }

    notes.forEach((note, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'background:var(--bg-body); padding:0.8rem; border-radius:0.5rem; display:flex; justify-content:space-between; align-items:center;';
        item.innerHTML = `
            <span>${note}</span>
            <button onclick="deletePersonalNote(${index})" style="color:var(--danger); background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(item);
    });
}

function addPersonalNote() {
    const input = document.getElementById('newNoteInput');
    const text = input.value.trim();
    if (!text) return;

    const notes = JSON.parse(localStorage.getItem('my_personal_notes') || '[]');
    notes.unshift(text); // Add to top
    localStorage.setItem('my_personal_notes', JSON.stringify(notes));

    input.value = '';
    loadPersonalNotes();
}

function deletePersonalNote(index) {
    const notes = JSON.parse(localStorage.getItem('my_personal_notes') || '[]');
    notes.splice(index, 1);
    localStorage.setItem('my_personal_notes', JSON.stringify(notes));
    loadPersonalNotes();
}

function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');

    // UX FIX: Close mobile menu if it was open (so the modal is clearly visible)
    const menu = document.getElementById('mobileMenu');
    const backdrop = document.getElementById('backdrop');
    if (menu) menu.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
}

// --- Custom Confirm Modal Logic ---
function showCustomConfirm(message, onConfirm) {
    let modal = document.getElementById('customConfirmModal');
    if (!modal) {
        createConfirmModal();
        modal = document.getElementById('customConfirmModal');
    }

    document.getElementById('confirmMessage').innerText = message;

    const confirmBtn = document.getElementById('confirmBtn');
    // Remove old listeners to avoid stacking
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', () => {
        onConfirm();
        closeCustomConfirm();
    });

    modal.classList.add('active');
}

function closeCustomConfirm() {
    document.getElementById('customConfirmModal').classList.remove('active');
}

function createConfirmModal() {
    const modalHtml = `
    <div class="modal" id="customConfirmModal" style="z-index: 10000;">
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <div style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem;">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <h3 style="margin-bottom: 1rem;">Are you sure?</h3>
            <p id="confirmMessage" style="color: var(--secondary); margin-bottom: 2rem;"></p>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="closeCustomConfirm()" class="btn" style="background: var(--border); width: 100px;">Cancel</button>
                <button id="confirmBtn" class="btn" style="background: var(--danger); color: white; width: 100px;">Delete</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
