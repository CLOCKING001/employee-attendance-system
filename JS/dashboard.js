// SUPABASE CONNECTION

const SUPABASE_URL = "https://bqiqqagwmultojblbisj.supabase.co";

const SUPABASE_KEY = "sb_publishable_NIVEtutArzz7fh95viwTfg_Es4nzhy4";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
// VERIFIED EMPLOYEE LOCATION
let verifiedLocation = null;
// LIVE DATE AND TIME
function updateDateTime() {
    const now = new Date();

    const dateElement = document.getElementById("currentDate");
    const timeElement = document.getElementById("currentTime");

    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }
}

// Update every second
updateDateTime();
setInterval(updateDateTime, 1000);
// ATTENDANCE CLOCK-IN / CLOCK-OUT

const clockInBtn = document.getElementById("clockInBtn");
const clockOutBtn = document.getElementById("clockOutBtn");
const attendanceStatus = document.getElementById("attendanceStatus");

// Retrieve saved attendance
let clockInTime = localStorage.getItem("clockInTime");

function updateAttendanceStatus() {

if (!clockInBtn || !clockOutBtn || !attendanceStatus) {
    console.log("Attendance elements not found on this page.");
    return;
}
if (clockInTime) {
    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    attendanceStatus.textContent =
        "You clocked in at " + new Date(clockInTime).toLocaleTimeString();
} else {
    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    attendanceStatus.textContent =
        "You haven't clocked in today.";
}

}
// OFFICE GPS CONFIGURATION

const OFFICE_LATITUDE = 6.572734;
const OFFICE_LONGITUDE = 3.352611;
const ALLOWED_RADIUS = 100;
// CALCULATE DISTANCE FROM OFFICE

function calculateDistance(lat1, lon1, lat2, lon2) {

    const earthRadius = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
}
// VERIFY EMPLOYEE LOCATION

function verifyOfficeLocation() {

    return new Promise((resolve) => {

        if (!navigator.geolocation) {
            alert("GPS is not supported by this browser.");
            resolve(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(

            function(position) {

                const employeeLatitude = position.coords.latitude;
                const employeeLongitude = position.coords.longitude;
                verifiedLocation = {
    latitude: employeeLatitude,
    longitude: employeeLongitude
};
                console.log("Your Latitude:", employeeLatitude);
console.log("Your Longitude:", employeeLongitude);
console.log("GPS Accuracy:", position.coords.accuracy, "metres");

                const distance = calculateDistance(
                    OFFICE_LATITUDE,
                    OFFICE_LONGITUDE,
                    employeeLatitude,
                    employeeLongitude
                );

                if (distance <= ALLOWED_RADIUS) {

                    alert("Location verified. Attendance permitted.");
                    resolve(true);

                } else {

                    alert(
                        "Attendance denied!\nYou are approximately " +
                        Math.round(distance) +
                        " metres away from the office."
                    );

                    resolve(false);
                }
            },

            function(error) {

                alert("Unable to verify your location. Please enable GPS and allow location access.");

                resolve(false);

            },

            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }

        );

    });

}


// CLOCK IN - SAVE TO SUPABASE

if (clockInBtn) {
clockInBtn.addEventListener("click", async function () {

    const isVerified = await verifyOfficeLocation();

    if (!isVerified) return;

    if (!verifiedLocation) {
        alert("Unable to retrieve verified location.");
        return;
    }

    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        alert("Please sign in again.");
        window.location.href = "index.html";
        return;
    }

    const now = new Date();

    const attendanceDate =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    const { data, error } = await supabaseClient
        .from("attendance")
        .insert({
            user_id: userData.user.id,
            clock_in: now.toISOString(),
            clock_in_latitude: verifiedLocation.latitude,
            clock_in_longitude: verifiedLocation.longitude,
            attendance_date: attendanceDate
        })
        .select()
        .single();

    if (error) {
        alert("Clock-in failed: " + error.message);
        return;
    }

    clockInTime = now.toISOString();

    localStorage.setItem("clockInTime", clockInTime);
    localStorage.setItem("attendanceRecordId", data.id);

    updateAttendanceStatus();

    alert("Clock-in successful! Your attendance has been saved.");

});
}

// CLOCK OUT - UPDATE SUPABASE
if (clockOutBtn) {

clockOutBtn.addEventListener("click", async function () {

    if (!clockInTime) {
        alert("You must clock in first.");
        return;
    }

    const isVerified = await verifyOfficeLocation();

    if (!isVerified) return;

    if (!verifiedLocation) {
        alert("Unable to retrieve verified location.");
        return;
    }

    const recordId = localStorage.getItem("attendanceRecordId");

    if (!recordId) {
        alert("Attendance record not found. Please contact your administrator.");
        return;
    }

    const now = new Date();
    const savedClockIn = new Date(clockInTime);
    const duration = now - savedClockIn;

    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);

    const totalHours = duration / 3600000;

    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        alert("Please sign in again.");
        window.location.href = "index.html";
        return;
    }

    const { error } = await supabaseClient
        .from("attendance")
        .update({
            clock_out: now.toISOString(),
            clock_out_latitude: verifiedLocation.latitude,
            clock_out_longitude: verifiedLocation.longitude,
            total_hours: totalHours
        })
        .eq("id", recordId)
        .eq("user_id", userData.user.id);

    if (error) {
        alert("Clock-out failed: " + error.message);
        return;
    }

    saveAttendanceHistory(savedClockIn, now);

    localStorage.setItem("clockOutTime", now.toISOString());

    alert(
        "Clock-out successful!\nTotal time: " +
        hours + " hours " + minutes + " minutes"
    );

    document.getElementById("totalWorkTime").textContent =
        hours + " hours " + minutes + " minutes";

    localStorage.removeItem("clockInTime");
    localStorage.removeItem("attendanceRecordId");

    clockInTime = null;

    updateAttendanceStatus();

});


// CLOSE CLOCK OUT CONDITION
}

// INITIALIZE
updateAttendanceStatus();

displayAttendanceHistory();
// ATTENDANCE HISTORY

// SAVE EMPLOYEE ATTENDANCE HISTORY

function saveAttendanceHistory(clockIn, clockOut) {

    let history = JSON.parse(
        localStorage.getItem("attendanceHistory")
    ) || [];

    const duration = clockOut - clockIn;

    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);

    const record = {

        employeeID: document.getElementById("employeeID").textContent.trim(),

        employeeName: document.getElementById("employeeName").textContent.trim(),

        date: clockIn.toLocaleDateString("en-GB"),

        clockIn: clockIn.toLocaleTimeString(),

        clockOut: clockOut.toLocaleTimeString(),

        totalHours: hours + "h " + minutes + "m"

    };

    history.push(record);

    localStorage.setItem(
        "attendanceHistory",
        JSON.stringify(history)
    );

    displayAttendanceHistory();

}


// DISPLAY ATTENDANCE HISTORY

function displayAttendanceHistory() {

    const historyBody = document.getElementById("attendanceHistory");

    if (!historyBody) return;

    const history = JSON.parse(
        localStorage.getItem("attendanceHistory")
    ) || [];

    if (history.length === 0) {
        historyBody.innerHTML =
            '<tr><td colspan="4">No attendance records yet.</td></tr>';
        return;
    }

    historyBody.innerHTML = "";

    history.forEach(record => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${record.date}</td>
            <td>${record.clockIn}</td>
            <td>${record.clockOut}</td>
            <td>${record.totalHours}</td>
        `;

        historyBody.appendChild(row);

    });
}

displayAttendanceHistory();

// EMPLOYEE PROFILE INFORMATION

let employeeProfile = JSON.parse(
    localStorage.getItem("employeeProfile")
) || {
    fullName: "Employee Name",
    employeeID: "EMP001",
    department: "Information Technology",
    position: "IT Support Officer",
    email: "employee@company.com"
};

// DISPLAY EMPLOYEE INFORMATION

function updateEmployeeProfile() {

const name = document.getElementById("employeeName");
const id = document.getElementById("employeeID");
const department = document.getElementById("employeeDepartment");
const position = document.getElementById("employeePosition");
const email = document.getElementById("employeeEmail");
if (name) name.textContent = employeeProfile.fullName;
if (id) id.textContent = employeeProfile.employeeID;
if (department) department.textContent = employeeProfile.department;
if (position) position.textContent = employeeProfile.position;
if (email) email.textContent = employeeProfile.email;

}

// UPDATE PROFILE ATTENDANCE STATUS

function updateProfileAttendanceStatus() {

    const profileStatus = document.getElementById(
        "employeeAttendanceStatus"
    );

    if (!profileStatus) return;

    if (clockInTime) {

        profileStatus.textContent = "Clocked In";

        profileStatus.className = "clocked-in";

    } else {

        profileStatus.textContent = "Clocked Out";

        profileStatus.className = "clocked-out";

    }

}

// INITIALIZE EMPLOYEE PROFILE

updateEmployeeProfile();
updateProfileAttendanceStatus();

// EMPLOYEE PROFILE PHOTO UPLOAD

const photoInput = document.getElementById("photoInput");
const employeePhoto = document.getElementById("employeePhoto");

// LOAD SAVED PROFILE PHOTO

const savedPhoto = localStorage.getItem("employeePhoto");

if (savedPhoto && employeePhoto) {
    employeePhoto.src = savedPhoto;
}

// UPLOAD NEW PROFILE PHOTO

if (photoInput) {

    photoInput.addEventListener("change", function() {

        const file = this.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Image must not exceed 2MB.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function(event) {

            employeePhoto.src = event.target.result;

            localStorage.setItem(
                "employeePhoto",
                event.target.result
            );

            alert("Profile picture updated successfully!");

        };

        reader.readAsDataURL(file);

    });

}

// EMPLOYEE PROFILE EDITING

const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileForm = document.getElementById("editProfileForm");
const employeeEditForm = document.getElementById("employeeEditForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// OPEN EDIT PROFILE FORM

if (editProfileBtn && editProfileForm) {

editProfileBtn.addEventListener("click", function() {
    document.getElementById("editName").value = employeeProfile.fullName;
    document.getElementById("editID").value = employeeProfile.employeeID;
    document.getElementById("editDepartment").value = employeeProfile.department;
    document.getElementById("editPosition").value = employeeProfile.position;
    document.getElementById("editEmail").value = employeeProfile.email;
    editProfileForm.style.display = "block";
});

}

// SAVE EMPLOYEE INFORMATION

if (employeeEditForm) {

employeeEditForm.addEventListener("submit", function(event) {
    event.preventDefault();
    employeeProfile.fullName = document.getElementById("editName").value;
    employeeProfile.department = document.getElementById("editDepartment").value;
    employeeProfile.position = document.getElementById("editPosition").value;
    employeeProfile.email = document.getElementById("editEmail").value;
    localStorage.setItem("employeeProfile", JSON.stringify(employeeProfile));
    updateEmployeeProfile();
    editProfileForm.style.display = "none";
    alert("Employee profile updated successfully!");
});

}

// CANCEL EDITING

if (cancelEditBtn && editProfileForm) {

cancelEditBtn.addEventListener("click", function() {
    editProfileForm.style.display = "none";
});

}
// ADMINISTRATOR EMPLOYEE MANAGEMENT

let employees = JSON.parse(
    localStorage.getItem("employees")
) || [];

// GET HTML ELEMENTS

const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const addEmployeeForm = document.getElementById("addEmployeeForm");
const newEmployeeForm = document.getElementById("newEmployeeForm");
const employeeDirectory = document.getElementById("employeeDirectory");

// OPEN REGISTRATION FORM

if (addEmployeeBtn && addEmployeeForm) {

addEmployeeBtn.addEventListener("click", function() {
    addEmployeeForm.style.display =
        addEmployeeForm.style.display === "none" ? "block" : "none";
});

}
// DISPLAY REGISTERED EMPLOYEES

function displayEmployees() {

    employeeDirectory.innerHTML = "";

    if (employees.length === 0) {

        employeeDirectory.innerHTML =
            '<tr><td colspan="6">No additional employees registered.</td></tr>';

        return;
    }

    employees.forEach(function(employee, index) {

        const row = document.createElement("tr");

        const values = [
            employee.employeeID,
            employee.fullName,
            employee.department,
            employee.position,
            employee.status || "Active"
        ];

        values.forEach(function(value) {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        // ACTIONS COLUMN

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");

        editButton.textContent = "Edit";
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.dataset.index = index;

        const statusButton = document.createElement("button");

        statusButton.textContent =
            employee.status === "Inactive" ? "Reactivate" : "Deactivate";

        statusButton.type = "button";
        statusButton.dataset.action = "toggle";
        statusButton.dataset.index = index;

        actionCell.appendChild(editButton);
        actionCell.appendChild(statusButton);

        row.appendChild(actionCell);

        employeeDirectory.appendChild(row);

    });

}
// EMPLOYEE DIRECTORY ACTIONS

employeeDirectory.addEventListener("click", function(event) {

    const button = event.target;

    const action = button.dataset.action;
    const index = Number(button.dataset.index);

    if (!action || !employees[index]) {
        return;
    }

    const employee = employees[index];

    // EDIT EMPLOYEE

    if (action === "edit") {

        const newName = prompt("Enter employee full name:", employee.fullName);

        if (newName === null) return;

        const newID = prompt("Enter employee ID:", employee.employeeID);

        if (newID === null) return;

        const newDepartment = prompt("Enter department:", employee.department);

        if (newDepartment === null) return;

        const newPosition = prompt("Enter job position:", employee.position);

        if (newPosition === null) return;

        const newEmail = prompt("Enter email address:", employee.email);

        if (newEmail === null) return;

        if (!newName.trim() || !newID.trim() ||
            !newDepartment.trim() || !newPosition.trim() ||
            !newEmail.trim()) {

            alert("All employee fields are required.");
            return;
        }

        const duplicateID = employees.some(function(item, i) {
            return i !== index &&
                item.employeeID.toLowerCase() === newID.trim().toLowerCase();
        });

        if (duplicateID) {
            alert("This Employee ID already exists.");
            return;
        }

        const duplicateEmail = employees.some(function(item, i) {
            return i !== index &&
                item.email.toLowerCase() === newEmail.trim().toLowerCase();
        });

        if (duplicateEmail) {
            alert("This email address is already registered.");
            return;
        }

        employee.fullName = newName.trim();
        employee.employeeID = newID.trim();
        employee.department = newDepartment.trim();
        employee.position = newPosition.trim();
        employee.email = newEmail.trim();

        localStorage.setItem("employees", JSON.stringify(employees));

        displayEmployees();
        loadAttendanceEmployeeFilter();

alert("Employee information updated successfully!");

} else if (action === "toggle") {

    employee.status =
        employee.status === "Inactive" ? "Active" : "Inactive";

    localStorage.setItem("employees", JSON.stringify(employees));

    displayEmployees();
    loadAttendanceEmployeeFilter();

}

});
        // ADMIN ATTENDANCE MONITORING

const attendanceEmployeeFilter =
    document.getElementById("attendanceEmployeeFilter");

const adminAttendanceDirectory =
    document.getElementById("adminAttendanceDirectory");

const viewAttendanceBtn =
    document.getElementById("viewAttendanceBtn");


// LOAD EMPLOYEES INTO FILTER
function loadAttendanceEmployeeFilter() {
    attendanceEmployeeFilter.innerHTML =
        '<option value="all">All Employees</option>';
    employees.forEach(function(employee) {
        const option = document.createElement("option");
        option.value = employee.employeeID;
        option.textContent =
            employee.fullName + " (" + employee.employeeID + ")";
        attendanceEmployeeFilter.appendChild(option);
    });
}
// DISPLAY LIVE AND COMPLETED ATTENDANCE
function displayAdminAttendance() {
    let history = JSON.parse(
        localStorage.getItem("attendanceHistory")
    ) || [];
    const selectedEmployee = attendanceEmployeeFilter.value;
    const activeClockIn = localStorage.getItem("clockInTime");
    if (selectedEmployee !== "all") {
        history = history.filter(function(record) {
            return record.employeeID === selectedEmployee;
        });
    }
    if (activeClockIn) {
        const activeEmployeeID =
            document.getElementById("employeeID").textContent.trim();
        const activeEmployeeName =
            document.getElementById("employeeName").textContent.trim();
        if (
            selectedEmployee === "all" ||
            selectedEmployee === activeEmployeeID
        ) {
            const startTime = new Date(activeClockIn);
            const currentTime = new Date();
            const duration = currentTime - startTime;
            const hours = Math.floor(duration / 3600000);
            const minutes = Math.floor((duration % 3600000) / 60000);
            history.push({
                employeeID: activeEmployeeID,
                employeeName: activeEmployeeName,
                date: startTime.toLocaleDateString("en-GB"),
                clockIn: startTime.toLocaleTimeString(),
                clockOut: "--",
                totalHours: hours + "h " + minutes + "m",
                status: "Currently Working"
            });
        }
    }
    adminAttendanceDirectory.innerHTML = "";
    if (history.length === 0) {
        adminAttendanceDirectory.innerHTML =
            '<tr><td colspan="7">No attendance records available.</td></tr>';
        return;
    }
    history.forEach(function(record) {
        const row = document.createElement("tr");
        const values = [
            record.employeeID || "Previously recorded",
            record.employeeName || "Existing Record",
            record.date,
            record.clockIn,
            record.clockOut,
            record.totalHours,
            record.status || "Completed"
        ];
        values.forEach(function(value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        adminAttendanceDirectory.appendChild(row);
    });
}
// ATTENDANCE MONITORING BUTTON
viewAttendanceBtn.addEventListener("click", function() {
    displayAdminAttendance();
});
// INITIALIZE ATTENDANCE MONITORING
loadAttendanceEmployeeFilter();
displayAdminAttendance();

// REGISTER NEW EMPLOYEE

newEmployeeForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const newEmployee = {

        fullName: document.getElementById("newEmployeeName").value.trim(),

        employeeID: document.getElementById("newEmployeeID").value.trim(),

        department: document.getElementById("newEmployeeDepartment").value.trim(),

        position: document.getElementById("newEmployeePosition").value.trim(),

        email: document.getElementById("newEmployeeEmail").value.trim()

    };

    // CHECK FOR DUPLICATE EMPLOYEE ID

    const duplicateID = employees.some(function(employee) {

        return employee.employeeID.toLowerCase() ===
            newEmployee.employeeID.toLowerCase();

    });

    if (duplicateID) {

        alert("This Employee ID already exists.");

        return;

    }

    // CHECK FOR DUPLICATE EMAIL

    const duplicateEmail = employees.some(function(employee) {

        return employee.email.toLowerCase() ===
            newEmployee.email.toLowerCase();

    });

    if (duplicateEmail) {

        alert("This email address is already registered.");

        return;

    }

    // SAVE EMPLOYEE

    employees.push(newEmployee);

    localStorage.setItem(
        "employees",
        JSON.stringify(employees)
    );

    displayEmployees();

    newEmployeeForm.reset();

    addEmployeeForm.style.display = "none";

    alert("Employee registered successfully!");

});

// INITIALIZE EMPLOYEE DIRECTORY

displayEmployees();
// SUPABASE EMPLOYEE LOGIN

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();

        const password = document.getElementById("password").value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });

        if (error) {

            alert("Login failed: " + error.message);

            return;

        }

        alert("Login successful! Welcome.");

        window.location.href = "dashboard.html";

    });

}
// PROTECT EMPLOYEE DASHBOARD

if (window.location.pathname.endsWith("dashboard.html")) {

    (async function () {

        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data.session) {
            window.location.replace("index.html");
        }

    })();

}
