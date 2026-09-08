/**
 * routes/scan.js
 * API Gateway endpoint for processing product label scans via FastAPI AI service.
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const { randomUUID } = require("crypto");

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Store uploaded image in memory for fast proxying to FastAPI
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedMimeTypes.includes(file.mimetype) || (file.mimetype && file.mimetype.startsWith("image/"))) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed"));
    }
  },
});

const uploadMiddleware = upload.any();

/**
 * Handle scan request:
 * 1. Parse image upload with multer
 * 2. Forward to FastAPI POST http://localhost:8001/process
 * 3. Return complete, unmanipulated FastAPI response
 * 4. Handle errors if FastAPI is unavailable or times out
 */
const handleScan = (req, res) => {
  // Assign a unique correlation ID to each request for end-to-end tracing
  const requestId = randomUUID().slice(0, 8).toUpperCase();

  uploadMiddleware(req, res, async (err) => {
    // ── Multer error handling ───────────────────────────────────────────────
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        console.error(`[Express][${requestId}] Multer: file too large`);
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 10 MB per image.",
        });
      }
      console.error(`[Express][${requestId}] Multer error:`, err.message);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      console.error(`[Express][${requestId}] Upload error:`, err.message);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Support multiple files under 'images', 'image', or any field name
    let files = [];
    if (req.files && req.files.length > 0) {
      files = req.files;
    } else if (req.file) {
      files = [req.file];
    }

    if (files.length === 0) {
      console.warn(`[Express][${requestId}] No files received in request.`);
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please upload at least one image using field 'image' or 'images'.",
      });
    }

    // Log incoming images for this specific request
    console.log(
      `[Express][${requestId}] Received ${files.length} image(s):`,
      files.map((f, i) => `[${i}] ${f.originalname} (${(f.size / 1024).toFixed(1)} KB, ${f.mimetype})`).join(" | ")
    );

    // ── Forward 1–4 images to FastAPI ───────────────────────────────────────
    try {
      const aiBaseUrl = (process.env.AI_SERVICE_URL || "http://localhost:8001").replace(/\/+$/, "");
      const aiServiceUrl = `${aiBaseUrl}/process`;

      // Build a fresh FormData for this request — no shared state
      const form = new FormData();
      files.forEach((f, idx) => {
        form.append("images", f.buffer, {
          filename: f.originalname || `scan_image_${idx + 1}.png`,
          contentType: f.mimetype || "image/png",
        });
      });

      console.log(`[Express][${requestId}] Forwarding ${files.length} image(s) to FastAPI: ${aiServiceUrl}`);

      const aiResponse = await axios.post(aiServiceUrl, form, {
        headers: {
          ...form.getHeaders(),
          "X-Request-Id": requestId, // Pass correlation ID to FastAPI
        },
        timeout: 120000, // 120s timeout for multi-image OCR processing
      });

      // Log the product name FastAPI extracted so we can confirm it matches current images
      const extractedName = aiResponse.data?.extracted?.product_name || "(not detected)";
      console.log(`[Express][${requestId}] FastAPI responded ${aiResponse.status} — product_name: "${extractedName}"`);

      // Preserve and return complete FastAPI response
      return res.status(aiResponse.status).json(aiResponse.data);
    } catch (axiosErr) {
      // AI service is not running or connection refused
      if (
        axiosErr.code === "ECONNREFUSED" ||
        axiosErr.code === "ENOTFOUND" ||
        axiosErr.code === "ECONNRESET"
      ) {
        return res.status(503).json({
          success: false,
          message: "FastAPI AI service is unavailable. Please ensure FastAPI is running on port 8001.",
        });
      }

      // Timeout
      if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.includes("timeout")) {
        return res.status(504).json({
          success: false,
          message: "FastAPI AI service did not respond in time. Please try again.",
        });
      }

      // FastAPI returned an HTTP error (4xx / 5xx) — preserve response
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json(axiosErr.response.data);
      }

      // Unexpected error
      console.error("[Express Gateway] Error communicating with AI service:", axiosErr.message);
      return res.status(500).json({
        success: false,
        message: `An error occurred while contacting the AI service: ${axiosErr.message}`,
      });
    }
  });
};

// Route matching: handles both POST / and POST /scan when mounted
router.post("/", handleScan);
router.post("/scan", handleScan);

module.exports = router;
