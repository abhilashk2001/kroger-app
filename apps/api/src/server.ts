// Entry point: starts the HTTP server. This is the ONLY file that opens a port.

import { createApp } from "./app";
import { config } from "./core/config";

const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
