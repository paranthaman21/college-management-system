document.addEventListener('DOMContentLoaded', () => {
    loadFaculty();

    // 1. Password Generation
    const genPassBtn = document.getElementById('genPassBtn');
    const passwordInput = document.getElementById('fPassword');
    const realPasswordInput = document.getElementById('fRealPassword');

    genPassBtn.addEventListener('click', async () => {
        try {
            genPassBtn.innerText = '⏳';
            const response = await fetch('/api/generate-password', { method: 'POST' });
            const data = await response.json();

            passwordInput.value = data.masked;
            realPasswordInput.value = data.password;
            genPassBtn.innerText = 'Generate Password';
        } catch (error) {
            console.error(error);
            genPassBtn.innerText = 'Generate Password';
        }
    });

    // 2. Add Faculty
    const form = document.getElementById('addFacultyForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('fName').value;
        const dept = document.getElementById('fDept').value;
        const email = document.getElementById('fEmail').value;
        const contact = document.getElementById('fContact').value;
        const password = realPasswordInput.value;

        if (!password) {
            alert("Please generate a password first!");
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'Adding...';

        try {
            const response = await fetch('/api/faculty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, department: dept, email, contact, password })
            });

            if (response.ok) {
                submitBtn.innerText = 'Success!';
                submitBtn.style.backgroundColor = 'var(--success)';
                setTimeout(() => {
                    form.reset();
                    passwordInput.value = '';
                    realPasswordInput.value = '';
                    loadFaculty();
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                    submitBtn.style.backgroundColor = ''; // Reset color
                }, 1500);
            } else {
                submitBtn.innerText = 'Failed';
                submitBtn.style.backgroundColor = 'var(--danger)';
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                    submitBtn.style.backgroundColor = '';
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            submitBtn.innerText = 'Error';
            submitBtn.style.backgroundColor = 'var(--danger)';
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                submitBtn.style.backgroundColor = '';
            }, 2000);
        }
    });
});

let allFacultyData = [];

async function loadFaculty() {
    try {
        const response = await fetch('/api/all-faculty');
        allFacultyData = await response.json();
        renderFacultyTable(allFacultyData);
    } catch (error) {
        console.error('Error loading faculty:', error);
    }
}

function renderFacultyTable(facultyList) {
    const tbody = document.getElementById('facultyTableBody');
    tbody.innerHTML = '';

    if (facultyList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No faculty found</td></tr>';
        return;
    }

    facultyList.forEach((fac, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', fac.id);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${fac.name}</td>
            <td>${fac.department}</td>
            <td>${fac.email}</td>
            <td>${fac.contact}</td>
            <td>*******</td>
            <td>
                 <button class="action-btn edit-btn" onclick="editFaculty(${fac.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                 <button class="action-btn delete-btn" onclick="deleteFaculty(${fac.id})" title="Delete" style="color: #ef4444; margin-left: 5px;"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Search Logic
document.getElementById('facultySearchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allFacultyData.filter(f =>
        f.name.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term) ||
        f.department.toLowerCase().includes(term)
    );
    renderFacultyTable(filtered);
});

// 4. Delete Logic (Modal)
let deleteTargetId = null;
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Redefine deleteFaculty to open modal
window.deleteFaculty = (id) => {
    deleteTargetId = id;
    deleteModal.style.display = 'flex';
}

window.closeDeleteModal = () => {
    deleteModal.style.display = 'none';
    deleteTargetId = null;
}

// Confirm Delete Action
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteTargetId) return;

        const originalText = confirmDeleteBtn.innerText;
        confirmDeleteBtn.innerText = 'Deleting...';
        confirmDeleteBtn.disabled = true;

        try {
            const response = await fetch(`/api/faculty/${deleteTargetId}`, { method: 'DELETE' });
            if (response.ok) {
                confirmDeleteBtn.innerText = 'Deleted!';
                confirmDeleteBtn.style.backgroundColor = 'var(--success)';

                setTimeout(() => {
                    closeDeleteModal();
                    loadFaculty(); // Reloads list
                    // Reset Button
                    confirmDeleteBtn.innerText = originalText;
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.style.backgroundColor = '#ef4444'; // Reset to red
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

// 3. Edit Logic (Inline)
window.editFaculty = (id) => {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    // Get current values
    const name = row.children[1].innerText;
    const dept = row.children[2].innerText;
    const email = row.children[3].innerText;
    const contact = row.children[4].innerText;

    // Replace details with inputs
    row.children[1].innerHTML = `<input type="text" value="${name}" class="edit-input" style="width:100%">`;
    row.children[2].innerHTML = `<select class="edit-input">
        <option value="CSE" ${dept === 'CSE' ? 'selected' : ''}>CSE</option>
        <option value="ECE" ${dept === 'ECE' ? 'selected' : ''}>ECE</option>
        <option value="MECH" ${dept === 'MECH' ? 'selected' : ''}>MECH</option>
        <option value="CIVIL" ${dept === 'CIVIL' ? 'selected' : ''}>CIVIL</option>
    </select>`;
    row.children[3].innerHTML = `<input type="email" value="${email}" class="edit-input" style="width:100%">`;
    row.children[4].innerHTML = `<input type="text" value="${contact}" class="edit-input" style="width:100%">`;

    // Change Edit button to Save and Cancel
    row.children[6].innerHTML = `
        <button class="action-btn" onclick="saveFaculty(${id})" title="Save" style="color:green"><i class="fa-solid fa-floppy-disk"></i></button>
        <button class="action-btn" onclick="cancelEditFaculty(${id})" title="Cancel" style="color:gray; margin-left: 5px;"><i class="fa-solid fa-xmark"></i></button>
    `;
}

window.cancelEditFaculty = (id) => {
    // Cancel logic: re-render table to restore original view
    const term = document.getElementById('facultySearchInput').value.toLowerCase();
    if (term) {
        document.getElementById('facultySearchInput').dispatchEvent(new Event('input'));
    } else {
        renderFacultyTable(allFacultyData);
    }
}

window.saveFaculty = async (id) => {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;

    const inputs = row.querySelectorAll('.edit-input');
    const updatedData = {
        name: inputs[0].value,
        department: inputs[1].value,
        email: inputs[2].value,
        contact: inputs[3].value
    };

    try {
        const response = await fetch(`/api/faculty/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert("Faculty updated successfully!");
            loadFaculty();
        } else {
            alert("Update failed");
        }
    } catch (e) {
        console.error(e);
        alert("Error saving data");
    }
}
