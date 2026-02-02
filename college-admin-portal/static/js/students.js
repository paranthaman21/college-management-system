document.addEventListener('DOMContentLoaded', () => {
    loadStudents();

    // 1. Generate Password Logic
    const genPassBtn = document.getElementById('genPassBtn');
    const passwordInput = document.getElementById('sPassword');
    const realPasswordInput = document.getElementById('sRealPassword');

    genPassBtn.addEventListener('click', async () => {
        try {
            genPassBtn.innerText = '⏳';
            const response = await fetch('/api/generate-password', { method: 'POST' });
            const data = await response.json();

            // Critical: Show stars in input, store real in hidden
            passwordInput.value = data.masked;
            realPasswordInput.value = data.password;
            genPassBtn.innerText = '🔄';
        } catch (error) {
            console.error('Error generating password:', error);
            alert('Failed to generate password');
            genPassBtn.innerText = '🔄';
        }
    });

    // 2. Add Student Form Submit
    const form = document.getElementById('addStudentForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('sName').value;
        const dept = document.getElementById('sDept').value;
        const year = document.getElementById('sYear').value;
        const email = document.getElementById('sEmail').value;
        const contact = document.getElementById('sContact').value;
        const realPassword = document.getElementById('sRealPassword').value;

        if (!realPassword) {
            alert("Please generate a password first!");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = 'Add Student'; // Hardcoded as we replace dynamic change
        submitBtn.innerText = 'Adding...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    department: dept,
                    year,
                    email,
                    contact,
                    password: realPassword // Send real password to backend to hash and email
                })
            });

            const result = await response.json();

            if (response.ok) {
                submitBtn.innerText = 'Success!';
                submitBtn.style.backgroundColor = 'var(--success)';
                setTimeout(() => {
                    form.reset();
                    passwordInput.value = '';
                    realPasswordInput.value = '';
                    loadStudents(); // Refresh table
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.backgroundColor = '';
                }, 1500);
            } else {
                submitBtn.innerText = 'Failed';
                submitBtn.style.backgroundColor = 'var(--danger)';
                setTimeout(() => {
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.backgroundColor = '';
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            submitBtn.innerText = 'Error';
            submitBtn.style.backgroundColor = 'var(--danger)';
            setTimeout(() => {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = '';
            }, 2000);
        }
    });
});

// 3. Load Students Function
// 3. Load Students Function
let allStudentsData = []; // Store data for searching

async function loadStudents() {
    try {
        const response = await fetch('/api/all-students');
        allStudentsData = await response.json(); // Save to global variable
        renderStudentsTable(allStudentsData);
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No students found</td></tr>';
        return;
    }

    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', student.id);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${student.name}</td>
            <td>${student.department}</td>
            <td>${student.year}</td>
            <td>${student.email}</td>
            <td>${student.contact}</td>
            <td>*******</td>
            <td>
                <button class="action-btn edit-btn" onclick="editStudent(${student.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn delete-btn" onclick="deleteStudent(${student.id})" title="Delete" style="color: #ef4444; margin-left: 5px;"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Search Logic
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allStudentsData.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.department.toLowerCase().includes(term) ||
        s.year.toLowerCase().includes(term)
    );
    renderStudentsTable(filtered);
});

// 4. Delete Logic (Modal)
let deleteTargetId = null;
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

window.deleteStudent = (id) => {
    deleteTargetId = id;
    deleteModal.style.display = 'flex';
}

window.closeDeleteModal = () => {
    deleteModal.style.display = 'none';
    deleteTargetId = null;
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteTargetId) return;

        const originalText = confirmDeleteBtn.innerText;
        confirmDeleteBtn.innerText = 'Deleting...';
        confirmDeleteBtn.disabled = true;

        try {
            const response = await fetch(`/api/students/${deleteTargetId}`, { method: 'DELETE' });
            if (response.ok) {
                confirmDeleteBtn.innerText = 'Deleted!';
                confirmDeleteBtn.style.backgroundColor = 'var(--success)';

                setTimeout(() => {
                    closeDeleteModal();
                    loadStudents(); // Reloads list
                    confirmDeleteBtn.innerText = originalText;
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.style.backgroundColor = '#ef4444'; // Reset
                }, 1000);
            } else {
                confirmDeleteBtn.innerText = 'Failed';
                setTimeout(() => {
                    confirmDeleteBtn.innerText = originalText;
                    confirmDeleteBtn.disabled = false;
                }, 2000);
            }
        } catch (e) {
            console.error(e);
            confirmDeleteBtn.innerText = 'Error';
            setTimeout(() => {
                confirmDeleteBtn.innerText = originalText;
                confirmDeleteBtn.disabled = false;
            }, 2000);
        }
    });
}

// 4. Edit Student Logic (Inline)
window.editStudent = (id) => {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    // Get current values
    const name = row.children[1].innerText;
    const dept = row.children[2].innerText;
    const year = row.children[3].innerText;
    const email = row.children[4].innerText;
    const contact = row.children[5].innerText;

    // Replace details with inputs
    row.children[1].innerHTML = `<input type="text" value="${name}" class="edit-input" style="width:100%">`;
    row.children[2].innerHTML = `<select class="edit-input">
        <option value="CSE" ${dept === 'CSE' ? 'selected' : ''}>CSE</option>
        <option value="ECE" ${dept === 'ECE' ? 'selected' : ''}>ECE</option>
        <option value="MECH" ${dept === 'MECH' ? 'selected' : ''}>MECH</option>
        <option value="CIVIL" ${dept === 'CIVIL' ? 'selected' : ''}>CIVIL</option>
    </select>`;
    row.children[3].innerHTML = `<select class="edit-input">
        <option value="I" ${year === 'I' ? 'selected' : ''}>I</option>
        <option value="II" ${year === 'II' ? 'selected' : ''}>II</option>
        <option value="III" ${year === 'III' ? 'selected' : ''}>III</option>
        <option value="IV" ${year === 'IV' ? 'selected' : ''}>IV</option>
    </select>`;
    row.children[4].innerHTML = `<input type="email" value="${email}" class="edit-input" style="width:100%">`;
    row.children[5].innerHTML = `<input type="text" value="${contact}" class="edit-input" style="width:100%">`;

    // Change Edit button to Save and Cancel
    row.children[7].innerHTML = `
        <button class="action-btn" onclick="saveStudent(${id})" title="Save" style="color:green"><i class="fa-solid fa-floppy-disk"></i></button>
        <button class="action-btn" onclick="cancelEditStudent(${id})" title="Cancel" style="color:gray; margin-left: 5px;"><i class="fa-solid fa-xmark"></i></button>
    `;
}

window.cancelEditStudent = (id) => {
    // Reload the specific row or whole table. Simplest is to reload table logic.
    // However, we can also specificially re-render. 
    // For now, let's trigger the current search filter to re-render.
    const term = document.getElementById('searchInput').value.toLowerCase();
    if (term) {
        document.getElementById('searchInput').dispatchEvent(new Event('input'));
    } else {
        renderStudentsTable(allStudentsData);
    }
}

window.saveStudent = async (id) => {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    const inputs = row.querySelectorAll('.edit-input');
    const updatedData = {
        name: inputs[0].value,
        department: inputs[1].value,
        year: inputs[2].value,
        email: inputs[3].value,
        contact: inputs[4].value
    };

    try {
        const response = await fetch(`/api/students/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert("Student updated successfully!");
            loadStudents(); // Reload table to show clean text again
        } else {
            alert("Update failed");
        }
    } catch (e) {
        console.error(e);
        alert("Error saving data");
    }
}
