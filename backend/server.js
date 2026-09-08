/**
 * server.js
 * Entry point — creates the HTTP server and starts listening.
 */

require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Backend] Server running at http://localhost:${PORT}`);
});
