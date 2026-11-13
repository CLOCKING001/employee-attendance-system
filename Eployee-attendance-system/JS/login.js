// SUPABASE CONFIGURATION

const SUPABASE_URL = "https://bqiqqagwmultojblbisj.supabase.co";
const SUPABASE_KEY = "sb_publishable_NIVEtutArzz7fh95viwTfg_E4sNzhy4";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// LOGIN

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

    // GET USER PROFILE AND ROLE

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("role")
            .eq("user_id", data.user.id)
            .single();

    if (profileError || !profile) {

        await supabaseClient.auth.signOut();

        alert("Your employee profile was not found. Please contact the administrator.");

        return;
    }

    // DIRECT USER BASED ON ROLE

    if (profile.role === "admin") {

        alert("Administrator login successful!");

        window.location.href = "admin.html";

    } else {

        alert("Employee login successful!");

        window.location.href = "dashboard.html";

    }

});
