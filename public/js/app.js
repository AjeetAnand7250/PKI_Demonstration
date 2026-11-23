
// ========================================
// PKI DEMONSTRATION - MAIN JAVASCRIPT
// ========================================

const API_BASE_URL = window.PKI_API_BASE_URL || "";

// 1. GENERATE DIGITAL CERTIFICATE + PDF DOWNLOAD

const form = document.getElementById("certificateForm");
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const message = document.getElementById("generateMessage");
        const token = sessionStorage.getItem("pkiToken");

        if (!token) {
            message.textContent = "Please login first.";
            return;
        }

        const certificateData = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            organization: document.getElementById("organization").value.trim()
        };

        try {
            message.textContent = "Generating certificate PDF...";

            const response = await fetch(`${API_BASE_URL}/api/certificates/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(certificateData)
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || "Certificate generation failed");
            }

            const pdfBlob = await response.blob();
            const pdfUrl = window.URL.createObjectURL(pdfBlob);

            const link = document.createElement("a");
            link.href = pdfUrl;
            link.download = "Digital-Certificate.pdf";

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(pdfUrl);

            message.textContent =
                "Certificate generated and PDF downloaded successfully!";

            form.reset();

        } catch (error) {
            console.error("Certificate Generation Error:", error);
            message.textContent = error.message;
        }
    });
}


// 2. VERIFY DIGITAL CERTIFICATE USING CERTIFICATE ID

async function verifyCertificate() {

    const serial = document.getElementById("verifyId").value.trim();
    const message = document.getElementById("verifyMessage");

    if (!serial) {
        message.textContent = "Please enter Certificate ID.";
        return;
    }

    try {
        message.textContent = "Verifying certificate...";

        const response = await fetch(
            `${API_BASE_URL}/api/certificates/${encodeURIComponent(serial)}/verify`
        );

        const result = await response.json();

        if (result.verified === true) {

            message.textContent =
                "VALID: " + result.message +
                " | Certificate ID: " +
                result.certificate.serialNumber;

        } else {

            message.textContent =
                (result.status || "INVALID") +
                ": " + result.message;
        }

    } catch (error) {
        console.error("Verification Error:", error);

        message.textContent =
            "Verification failed. Please try again.";
    }
}


// 3. REVOKE DIGITAL CERTIFICATE


async function revokeCertificate() {
    const serial = document.getElementById("revokeId").value.trim();
    const message = document.getElementById("revokeMessage");
    const token = sessionStorage.getItem("pkiToken");

    if (!serial) {
        message.textContent = "Please enter Certificate ID.";
        return;
    }

    if (!token) {
        message.textContent = "Please login first.";
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to revoke this certificate? This action cannot be easily undone."
    );

    if (!confirmed) {
        return;
    }

    try {
        message.textContent = "Revoking certificate...";

        const response = await fetch(
            `${API_BASE_URL}/api/certificates/${encodeURIComponent(serial)}/revoke`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Revocation failed");
        }

        message.textContent =
            "REVOKED: " + result.message;

    } catch (error) {
        console.error("Revocation Error:", error);
        message.textContent = error.message;
    }
}


// 4. LOAD DASHBOARD STATISTICS


async function loadDashboardStats() {
    const total = document.getElementById("total");
    const valid = document.getElementById("valid");
    const revoked = document.getElementById("revoked");

    const token = sessionStorage.getItem("pkiToken");

    if (!token) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/certificates/stats`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to load statistics");
        }

        total.textContent = result.stats.total;
        valid.textContent = result.stats.valid;
        revoked.textContent = result.stats.revoked;

    } catch (error) {
        console.error("Dashboard statistics error:", error);
    }
}

// Load dashboard statistics when page opens
document.addEventListener("DOMContentLoaded", () => {
    loadDashboardStats();
});
