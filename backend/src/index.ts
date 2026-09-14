import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze.js";
import analysesRouter from "./routes/analyses.js";
import historyRouter from "./routes/history.js";
import meRouter from "./routes/me.js";
import statsRouter from "./routes/stats.js";
import "dotenv/config";

const app = express();

// Orígenes del front (web + extensión en dev) que pueden llamar a esta API.
// La extensión no necesita estar acá: las requests desde contexto de
// extensión (popup/background) con host_permissions quedan exentas del
// chequeo CORS del browser.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use(analyzeRouter);
app.use(analysesRouter);
app.use(historyRouter);
app.use(meRouter);
app.use(statsRouter);

const PORT = Number(process.env.PORT) || 3000;

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "aletheIA-backend" });
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});