import express from "express";
import analyzeRouter from "./routes/analyze.js";
import historyRouter from "./routes/history.js";
import meRouter from "./routes/me.js";
import "dotenv/config";

const app = express();
app.use(express.json());

app.use(analyzeRouter);
app.use(historyRouter);
app.use(meRouter);

const PORT = Number(process.env.PORT) || 3000;

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "aletheIA-backend" });
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});