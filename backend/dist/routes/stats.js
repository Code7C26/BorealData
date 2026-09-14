"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analysesRepository_js_1 = require("../db/analysesRepository.js");
const router = (0, express_1.Router)();
/**
 * GET /stats
 * Sin auth: son los totales públicos de la plataforma (no hay nada por usuario acá),
 * así que también los puede consumir la landing sin sesión.
 *
 * Devuelve { totalAnalyses, totalSources, averageConfidence, verdicts } acumulados desde
 * siempre: ni "de hoy" ni "de este usuario". Son los números que muestran los bloques del
 * dashboard y la landing, y suben con cada análisis nuevo que se guarda en /analyze.
 *
 * Rediseño V1 (sep-2026): `averageScore` (porcentaje) salió del contrato junto con el
 * score. Lo reemplazan `averageConfidence` (1 a 5) y el reparto por veredicto.
 */
router.get("/stats", async (_req, res) => {
    try {
        const stats = await (0, analysesRepository_js_1.getGlobalStats)();
        return res.status(200).json(stats);
    }
    catch (err) {
        return res.status(500).json({
            error: "No se pudieron obtener las estadísticas.",
            detail: err instanceof Error ? err.message : "Error desconocido.",
        });
    }
});
exports.default = router;
