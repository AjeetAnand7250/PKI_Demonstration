
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const certificateController = require("../controllers/certificateController");

// Generate Certificate
router.post(
    "/generate",
    authMiddleware,
    certificateController.generate
);

// Verify Certificate
router.get(
    "/:serial/verify",
    certificateController.verify
);

// Revoke Certificate
router.post(
    "/:serial/revoke",
    authMiddleware,
    certificateController.revoke
);

// Dashboard Statistics
router.get(
    "/stats",
    authMiddleware,
    certificateController.stats
);

module.exports = router;
