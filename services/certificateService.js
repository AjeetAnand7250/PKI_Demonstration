const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const STORAGE_DIR = process.env.PKI_STORAGE_DIR || path.join(__dirname, "..");

const ROOT_KEY = process.env.CA_KEY_PATH ||
    path.join(STORAGE_DIR, "keys/root-ca/ca-key.pem");

const ROOT_CERT = process.env.CA_CERT_PATH ||
    path.join(STORAGE_DIR, "certificates/root-ca/ca-cert.pem");

const USER_KEYS_DIR = path.join(STORAGE_DIR, "keys/users");
const ISSUED_DIR = path.join(STORAGE_DIR, "certificates/issued");

async function generateCertificate({ name, email, organization }) {
    fs.mkdirSync(USER_KEYS_DIR, { recursive: true });
    fs.mkdirSync(ISSUED_DIR, { recursive: true });

    if (!fs.existsSync(ROOT_KEY) || !fs.existsSync(ROOT_CERT)) {
        throw new Error("Root CA files not found");
    }

    const serial = crypto.randomBytes(16).toString("hex").toUpperCase();

    const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, "_");
    const userKey = path.join(USER_KEYS_DIR, `${safeEmail}.key.pem`);
    const userCSR = path.join(USER_KEYS_DIR, `${safeEmail}.csr.pem`);
    const userCert = path.join(ISSUED_DIR, `${serial}.cert.pem`);
    const configFile = path.join(USER_KEYS_DIR, `${safeEmail}.cnf`);

    const config = `
[req]
prompt = no
distinguished_name = dn
req_extensions = req_ext

[dn]
CN = ${name.replace(/[^a-zA-Z0-9 ._-]/g, "")}
O = ${organization ? organization.replace(/[^a-zA-Z0-9 ._-]/g, "") : "PKI Demonstration"}
emailAddress = ${email}

[req_ext]
subjectAltName = email:${email}
`;

    fs.writeFileSync(configFile, config, { mode: 0o600 });

    try {
        await execFileAsync("openssl", [
            "genpkey",
            "-algorithm", "RSA",
            "-pkeyopt", "rsa_keygen_bits:2048",
            "-out", userKey
        ]);

        await execFileAsync("openssl", [
            "req",
            "-new",
            "-key", userKey,
            "-out", userCSR,
            "-config", configFile
        ]);

        await execFileAsync("openssl", [
            "x509",
            "-req",
            "-in", userCSR,
            "-CA", ROOT_CERT,
            "-CAkey", ROOT_KEY,
            "-set_serial", `0x${serial}`,
            "-out", userCert,
            "-days", "365",
            "-sha256",
            "-copy_extensions", "copy"
        ]);

        const certificatePEM = fs.readFileSync(userCert, "utf8");

        const { stdout: publicKey } = await execFileAsync("openssl", [
            "pkey",
            "-in", userKey,
            "-pubout"
        ]);

        const { stdout: subject } = await execFileAsync("openssl", [
            "x509", "-in", userCert, "-noout", "-subject"
        ]);

        const { stdout: issuer } = await execFileAsync("openssl", [
            "x509", "-in", userCert, "-noout", "-issuer"
        ]);

        const { stdout: dates } = await execFileAsync("openssl", [
            "x509", "-in", userCert, "-noout", "-startdate", "-enddate"
        ]);

        const validFrom = dates.match(/notBefore=(.+)/)[1];
        const validUntil = dates.match(/notAfter=(.+)/)[1];

        fs.unlinkSync(userCSR);
        fs.unlinkSync(configFile);

        fs.chmodSync(userKey, 0o600);

        return {
            serial,
            subject: subject.replace("subject=", "").trim(),
            issuer: issuer.replace("issuer=", "").trim(),
            certificatePEM,
            publicKey,
            certificatePath: userCert,
            privateKeyPath: userKey,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil)
        };

    } catch (error) {
        throw new Error(`Certificate generation failed: ${error.message}`);
    }
}

module.exports = { generateCertificate };
