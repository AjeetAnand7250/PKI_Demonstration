const fs = require("node:fs");
const path = require("node:path");

const apiBaseUrl = (process.env.API_BASE_URL || "").trim().replace(/\/+$/, "");

if (apiBaseUrl) {
    let parsedUrl;

    try {
        parsedUrl = new URL(apiBaseUrl);
    } catch {
        throw new Error("API_BASE_URL must be an absolute HTTP or HTTPS URL.");
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("API_BASE_URL must use HTTP or HTTPS.");
    }
}

const configPath = path.join(__dirname, "..", "public", "js", "api-config.js");
const config = `window.PKI_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`;

fs.writeFileSync(configPath, config);
console.log(`Frontend configured to use ${apiBaseUrl || "the current origin"} for its API.`);
