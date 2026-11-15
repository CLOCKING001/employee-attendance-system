// SUPABASE CONFIGURATION

const SUPABASE_URL = "https://bqiqqagwmultojblbisj.supabase.co";
const SUPABASE_KEY = "sb_publishable_NIVEtutArzz7fh95viwTfg_E4sNzhy4";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// CHECK ADMIN ACCESS

async function checkAdminAccess() {

    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "index.html";
        return false;
    }

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name, role")
            .eq("user_id", user.id)
            .single();

    if (profileError || !profile || profile.role !== "admin") {

        alert("Access denied. Administrator privileges required.");

        await supabaseClient.auth.signOut();

        window.location.href = "index.html";

        return false;
    }

    document.querySelector("header h1").textContent =
        "Welcome, " + (profile.full_name || "Administrator");

    return true;
}

// LOAD EMPLOYEES

async function loadEmployees() {

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("employee_id, full_name, email, department, position");

    const table = document.getElementById("employeeTable");

    if (error) {
        table.innerHTML =
            '<tr><td colspan="5">Unable to load employees.</td></tr>';
        console.error(error);
        return;
    }

    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML =
            '<tr><td colspan="5">No employees found.</td></tr>';
        return;
    }

    data.forEach(employee => {

        const row = document.createElement("tr");

        [
            employee.employee_id,
            employee.full_name,
            employee.email,
            employee.department,
            employee.position
        ].forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value || "-";
            row.appendChild(cell);

        });

        table.appendChild(row);

    });
}

// LOAD ATTENDANCE RECORDS

async function loadAttendance() {

    const { data: attendance, error } = await supabaseClient
        .from("attendance")
        .select("user_id, attendance_date, clock_in, clock_out, total_hours")
        .order("attendance_date", { ascending: false });

    const table = document.getElementById("attendanceTable");

    if (error) {
        table.innerHTML =
            '<tr><td colspan="5">Unable to load attendance records.</td></tr>';
        console.error(error);
        return;
    }

    const { data: employees } = await supabaseClient
        .from("profiles")
        .select("user_id, full_name");

    const employeeNames = {};

    (employees || []).forEach(employee => {
        employeeNames[employee.user_id] =
            employee.full_name || "Unknown employee";
    });

    table.innerHTML = "";

    if (!attendance || attendance.length === 0) {
        table.innerHTML =
            '<tr><td colspan="5">No attendance records found.</td></tr>';
        return;
    }

    attendance.forEach(record => {

        const row = document.createElement("tr");

        const values = [
            employeeNames[record.user_id] || "Unknown employee",
            record.attendance_date,
            record.clock_in
                ? new Date(record.clock_in).toLocaleTimeString()
                : "-",
            record.clock_out
                ? new Date(record.clock_out).toLocaleTimeString()
                : "-",
            record.total_hours ?? "-"
        ];

        values.forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);

        });

        table.appendChild(row);

    });
}

// LOGOUT

document.getElementById("logoutBtn").addEventListener("click", async function() {

    await supabaseClient.auth.signOut();

    window.location.href = "index.html";

});

// START ADMIN DASHBOARD

(async function() {

    const isAdmin = await checkAdminAccess();

    if (isAdmin) {
        await loadEmployees();
        await loadAttendance();
    }

})();
