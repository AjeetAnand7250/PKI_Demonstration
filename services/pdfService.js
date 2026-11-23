const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generateCertificatePDF(certificate) {
    return new Promise((resolve, reject) => {
        const storageDir = process.env.PKI_STORAGE_DIR || path.join(__dirname, "..");
        const pdfDir = path.join(storageDir, "certificates/pdfs");

        fs.mkdirSync(pdfDir, { recursive: true });

        const filePath = path.join(
            pdfDir,
            `${certificate.serialNumber}.pdf`
        );

        const doc = new PDFDocument({
            size: "A4",
            margins: {
                top: 60,
                bottom: 60,
                left: 55,
                right: 55
            }
        });

        const stream = fs.createWriteStream(filePath);

        stream.on("finish", () => resolve(filePath));
        stream.on("error", reject);
        doc.on("error", reject);

        doc.pipe(stream);

        doc.rect(0, 0, 595, 842).fill("#f4f7fb");

        doc.rect(25, 25, 545, 792)
            .lineWidth(3)
            .stroke("#087fbd");

        doc.fillColor("#087fbd")
            .fontSize(26)
            .font("Helvetica-Bold")
            .text("PKI DEMONSTRATION SYSTEM", 55, 85, {
                align: "center"
            });

        doc.fillColor("#172b4d")
            .fontSize(22)
            .text("DIGITAL CERTIFICATE", 55, 145, {
                align: "center"
            });

        doc.moveTo(90, 190)
            .lineTo(505, 190)
            .lineWidth(2)
            .stroke("#087fbd");

        doc.fillColor("#333333")
            .font("Helvetica")
            .fontSize(13)
            .text(
                "This document confirms that the following digital certificate has been issued by the PKI Demonstration Root Certificate Authority.",
                75,
                220,
                {
                    align: "center",
                    width: 445,
                    lineGap: 5
                }
            );

        const details = [
            ["Certificate Holder", certificate.name],
            ["Email Address", certificate.email],
            ["Organization", certificate.organization],
            ["Serial Number", certificate.serialNumber],
            ["Certificate Issuer", certificate.issuer],
            ["Valid From", new Date(certificate.validFrom).toLocaleString()],
            ["Valid Until", new Date(certificate.validUntil).toLocaleString()],
            ["Certificate Status", certificate.status]
        ];

        let y = 330;

        details.forEach(([label, value]) => {
            doc.fillColor("#172b4d")
                .font("Helvetica-Bold")
                .fontSize(11)
                .text(label, 75, y, { width: 155 });

            doc.fillColor("#333333")
                .font("Helvetica")
                .text(String(value || "N/A"), 240, y, {
                    width: 280
                });

            y += 43;
        });

        doc.moveTo(75, 700)
            .lineTo(520, 700)
            .stroke("#087fbd");

        doc.fillColor("#555555")
            .fontSize(10)
            .text(
                "This PDF is a readable summary of the X.509 digital certificate. The original PEM certificate is maintained separately.",
                75,
                720,
                {
                    align: "center",
                    width: 445
                }
            );

        doc.end();
    });
}

module.exports = { generateCertificatePDF };