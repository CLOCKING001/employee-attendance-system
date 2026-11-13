// SUPABASE CONFIGURATION

const SUPABASE_URL = "https://bqiqqagwmultojblbisj.supabase.co";
const SUPABASE_KEY = "sb_publishable_NIVEtutArzz7fh95viwTfg_Es4nzhy4";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// EMPLOYEE LOGIN

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Login failed: " + error.message);
        return;
    }

    alert("Login successful!");

    window.location.href = "dashboard.html";

});