const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Multer configuration ─────────────────────────────────────────────────────
// Files land in uploads/ with a timestamped name.
// They are forwarded to FastAPI and then deleted.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed"));
    }
  },
});

const uploadHandler = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 4 }
]);

// Helper: delete a temporary Multer file (best-effort, non-blocking)
function cleanupTempFile(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.warn(`[Express] Could not delete temp file: ${filePath}`);
  });
}

// ── POST /api/inspections/scan ────────────────────────────────────────────────
// Flow: React → Express (Multer) → FastAPI /process → Express → React
router.post("/scan", (req, res) => {
  uploadHandler(req, res, async function (err) {
    // ── Multer error handling ─────────────────────────────────────────────────
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 10 MB per image.",
        });
      }
      return res.status(400).json({ success: false, message: "Upload error: " + err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const uploadedFiles = [];
    if (req.files) {
      if (req.files.image && req.files.image[0]) uploadedFiles.push(req.files.image[0]);
      if (req.files.images) uploadedFiles.push(...req.files.images);
    } else if (req.file) {
      uploadedFiles.push(req.file);
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    const primaryFile = uploadedFiles[0];
    const tempFilePaths = uploadedFiles.map(f => f.path);

    // ── Forward primary image to FastAPI ─────────────────────────────────────
    try {
      const aiServiceUrl = (process.env.AI_SERVICE_URL || "http://localhost:8001") + "/process";

      // Build a multipart/form-data body containing the actual file bytes
      const form = new FormData();
      form.append("image", fs.createReadStream(primaryFile.path), {
        filename: primaryFile.originalname,
        contentType: primaryFile.mimetype,
      });

      const aiResponse = await axios.post(aiServiceUrl, form, {
        headers: form.getHeaders(),
        timeout: 30000, // 30-second timeout — prevent indefinite hangs
      });

      // Cleanup temp files
      tempFilePaths.forEach(cleanupTempFile);

      return res.status(200).json({
        success: true,
        message: `${uploadedFiles.length} image(s) received and preprocessed by AI service`,
        fileCount: uploadedFiles.length,
        files: uploadedFiles.map(f => ({ originalname: f.originalname, size: f.size, mimetype: f.mimetype })),
        aiService: aiResponse.data,
      });

    } catch (axiosErr) {
      tempFilePaths.forEach(cleanupTempFile);

      // FastAPI is not running / refused connection
      if (axiosErr.code === "ECONNREFUSED" || axiosErr.code === "ENOTFOUND") {
        return res.status(503).json({
          success: false,
          message: "AI service is unavailable. Please ensure FastAPI is running.",
        });
      }

      // Timeout
      if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout")) {
        return res.status(504).json({
          success: false,
          message: "AI service did not respond in time. Please try again.",
        });
      }

      // FastAPI returned a 4xx/5xx error — forward its message
      if (axiosErr.response) {
        const detail = axiosErr.response.data?.detail || "AI service rejected the image.";
        return res.status(axiosErr.response.status).json({
          success: false,
          message: detail,
        });
      }

      // Unexpected error
      console.error("[Express] Unexpected error forwarding to AI service:", axiosErr.message);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while contacting the AI service.",
      });
    }
  });
});

module.exports = router;

