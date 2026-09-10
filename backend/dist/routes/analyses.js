"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analysesRepository_js_1 = require("../db/analysesRepository.js");
const router = (0, express_1.Router)();
/**
 * GET /analyses/:id
 * Sin auth a propósito: es el endpoint detrás del botón "Compartir resultado" de
 * /resultado — cualquiera con el link (id uuid, no adivinable) tiene que poder ver
 * ese análisis puntual sin necesitar cuenta. Ver getAnalysisById() para el porqué de
 * no filtrar por dueño acá (a diferencia de GET /history).
 */
router.get("/analyses/:id", async (req, res) => {
    const { id } = req.params;
    if (typeof id !== "string") {
        return res.status(404).json({ error: "No encontramos ese análisis." });
    }
    try {
        const analysis = await (0, analysesRepository_js_1.getAnalysisById)(id);
        if (!analysis) {
            return res.status(404).json({ error: "No encontramos ese análisis." });
        }
        return res.status(200).json(analysis);
    }
    catch (err) {
        return res.status(500).json({
            error: "No se pudo obtener el análisis.",
            detail: err instanceof Error ? err.message : "Error desconocido.",
        });
    }
});
exports.default = router;
