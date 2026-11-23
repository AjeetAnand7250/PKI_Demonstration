
const db = require("../config/db");
const { generateCertificate } = require("../services/certificateService");
const { generateCertificatePDF } = require("../services/pdfService");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

// =====================================
// 1. GENERATE DIGITAL CERTIFICATE
// =====================================

exports.generate = async (req, res) => {
    try {
        const { name, email, organization } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required"
            });
        }

        const certificate = await generateCertificate({
            name: name.trim(),
            email: email.trim(),
            organization: organization || "PKI Demonstration"
        });

        const certificateData = {
            name: name.trim(),
            email: email.trim(),
            organization: organization || "PKI Demonstration",
            serialNumber: certificate.serial,
            issuer: certificate.issuer,
            validFrom: certificate.validFrom,
            validUntil: certificate.validUntil,
            status: "VALID"
        };

        await db.promise().execute(
            `INSERT INTO certificates
            (serial_number, subject, issuer, certificate_path,
             valid_from, valid_until, status, certificate_pem,
             public_key, user_id)
            VALUES (?, ?, ?, ?, ?, ?, 'VALID', ?, ?, ?)`,
            [
                certificate.serial,
                certificate.subject,
                certificate.issuer,
                certificate.certificatePath,
                certificate.validFrom,
                certificate.validUntil,
                certificate.certificatePEM,
                certificate.publicKey,
                req.user.id
            ]
        );

        const pdfPath = await generateCertificatePDF(certificateData);

        return res.download(pdfPath, `${certificate.serial}.pdf`);

    } catch (error) {
        console.error("Certificate generation error:", error);

        return res.status(500).json({
            success: false,
            message: "Certificate generation failed",
            error: error.message
        });
    }
};


// =====================================
// 2. VERIFY DIGITAL CERTIFICATE
// =====================================

exports.verify = async (req, res) => {
    try {
        const serialNumber = req.params.serial;

        const [rows] = await db.promise().execute(
            `SELECT serial_number, subject, issuer, certificate_path,
                    valid_from, valid_until, status
             FROM certificates
             WHERE serial_number = ?`,
            [serialNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                verified: false,
                status: "NOT_FOUND",
                message: "Certificate not found"
            });
        }

        const cert = rows[0];

        if (cert.status === "REVOKED") {
            return res.json({
                success: true,
                verified: false,
                status: "REVOKED",
                message: "Certificate has been revoked."
            });
        }

        if (new Date(cert.valid_until) < new Date()) {
            return res.json({
                success: true,
                verified: false,
                status: "EXPIRED",
                message: "Certificate has expired."
            });
        }

        const rootCert = process.env.CA_CERT_PATH ||
            path.join(__dirname, "../certificates/root-ca/ca-cert.pem");

        await execFileAsync("openssl", [
            "verify",
            "-CAfile", rootCert,
            cert.certificate_path
        ]);

        return res.json({
            success: true,
            verified: true,
            status: "VALID",
            message: "Certificate is authentic and valid.",
            certificate: {
                serialNumber: cert.serial_number,
                subject: cert.subject,
                issuer: cert.issuer,
                validFrom: cert.valid_from,
                validUntil: cert.valid_until
            }
        });

    } catch (error) {
        console.error("Certificate verification error:", error);

        return res.status(400).json({
            success: false,
            verified: false,
            status: "INVALID",
            message: "Certificate signature verification failed."


            
        });
    }
};


// =====================================
// 3. REVOKE DIGITAL CERTIFICATE
// =====================================

exports.revoke = async (req, res) => {
    try {
        const serialNumber = req.params.serial;

        if (!serialNumber) {
            return res.status(400).json({
                success: false,
                message: "Certificate ID is required"
            });
        }

        // Check whether certificate exists and belongs to logged-in user
        const [rows] = await db.promise().execute(
            `SELECT serial_number, status
             FROM certificates
             WHERE serial_number = ? AND user_id = ?`,
            [serialNumber, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found or you are not authorized to revoke it."
            });
        }

        if (rows[0].status === "REVOKED") {
            return res.json({
                success: true,
                status: "REVOKED",
                message: "Certificate is already revoked."
            });
        }

        // Update certificate status
        await db.promise().execute(
            `UPDATE certificates
             SET status = 'REVOKED'
             WHERE serial_number = ? AND user_id = ?`,
            [serialNumber, req.user.id]
        );

        return res.json({
            success: true,
            status: "REVOKED",
            message: "Digital certificate has been revoked successfully.",
            certificateId: serialNumber
        });

    } catch (error) {
        console.error("Certificate revocation error:", error);

        return res.status(500).json({
            success: false,
            message: "Certificate revocation failed",
            error: error.message
        });
    }
};

// =====================================
// 4. DASHBOARD CERTIFICATE STATISTICS
// =====================================

exports.stats = async (req, res) => {
    try {
        const [rows] = await db.promise().execute(
            `SELECT
                COUNT(*) AS total,
                SUM(CASE
                    WHEN status = 'VALID'
                    AND valid_until >= NOW()
                    THEN 1 ELSE 0
                END) AS valid,
                SUM(CASE
                    WHEN status = 'REVOKED'
                    THEN 1 ELSE 0
                END) AS revoked
             FROM certificates
             WHERE user_id = ?`,
            [req.user.id]
        );

        return res.json({
            success: true,
            stats: {
                total: Number(rows[0].total || 0),
                valid: Number(rows[0].valid || 0),
                revoked: Number(rows[0].revoked || 0)
            }
        });

    } catch (error) {
        console.error("Dashboard statistics error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard statistics"
        });
    }
};