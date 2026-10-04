"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const analyze_js_1 = __importDefault(require("./routes/analyze.js"));
const analyzeRead_js_1 = __importDefault(require("./routes/analyzeRead.js"));
const analyzeContent_js_1 = __importDefault(require("./routes/analyzeContent.js"));
const analyses_js_1 = __importDefault(require("./routes/analyses.js"));
const history_js_1 = __importDefault(require("./routes/history.js"));
const me_js_1 = __importDefault(require("./routes/me.js"));
const stats_js_1 = __importDefault(require("./routes/stats.js"));
require("dotenv/config");
const app = (0, express_1.default)();
// Orígenes del front (web + extensión en dev) que pueden llamar a esta API.
// La extensión no necesita estar acá: las requests desde contexto de
// extensión (popup/background) con host_permissions quedan exentas del
// chequeo CORS del browser.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({ origin: allowedOrigins }));
// /analyze/read recibe imágenes en base64 y lleva su PROPIO parser con límite alto (3 MB),
// así que tiene que ir ANTES del express.json() global: el default de 100 kB rechazaría el
// body con 413 antes de que la request llegue a esa ruta. CORS ya corrió arriba (preflight).
app.use(analyzeRead_js_1.default);
app.use(express_1.default.json());
app.use(analyze_js_1.default);
app.use(analyzeContent_js_1.default);
app.use(analyses_js_1.default);
app.use(history_js_1.default);
app.use(me_js_1.default);
app.use(stats_js_1.default);
const PORT = Number(process.env.PORT) || 3000;
app.get("/", (_req, res) => {
    res.json({ status: "ok", service: "aletheIA-backend" });
});
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
