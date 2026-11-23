
const API_BASE_URL = window.PKI_API_BASE_URL || "";
const API = `${API_BASE_URL}/api/auth`;

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

// ================= REGISTER =================

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const message = document.getElementById("message");

        const data = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch(`${API}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            message.textContent = result.message;

            if (response.ok) {
                message.style.color = "#4ade80";
                registerForm.reset();

                setTimeout(() => {
                    window.location.href = "/login";
                }, 1200);

            } else {
                message.style.color = "#f87171";
            }

        } catch (error) {
            message.textContent = "Server connection failed";
            message.style.color = "#f87171";
        }
    });
}

// ================= LOGIN =================

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const message = document.getElementById("message");

        const data = {
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch(`${API}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {

                // Save JWT token and user details
                sessionStorage.setItem("pkiToken", result.token);
                sessionStorage.setItem("pkiUser", JSON.stringify(result.user));

                message.style.color = "#4ade80";
                message.textContent = "Login successful! Redirecting to dashboard...";

                // Open dashboard after successful login
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 800);

            } else {
                message.style.color = "#f87171";
                message.textContent = result.message;
            }

        } catch (error) {
            message.style.color = "#f87171";
            message.textContent = "Server connection failed";
        }
    });
}
