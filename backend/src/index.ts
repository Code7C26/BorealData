import express from "express";
import scrapeTestRouter from "./routes/scrapeTest";

const app = express();
app.use(express.json());

app.use("/scrape-test", scrapeTestRouter);

const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "aletheIA-backend" });
});

// Acá después van a colgar las rutas:
// app.use("/analyze", analyzeRouter);
// app.use("/history", historyRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});