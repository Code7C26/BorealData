"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analyze_js_1 = __importDefault(require("./routes/analyze.js"));
require("dotenv/config");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(analyze_js_1.default);
const PORT = Number(process.env.PORT) || 3000;
app.get("/", (_req, res) => {
    res.json({ status: "ok", service: "aletheIA-backend" });
});
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
