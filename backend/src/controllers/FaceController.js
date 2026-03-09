import { z } from "zod";
import faceDB from "../core/db/FaceDB.js";
import visitorDB from "../core/db/VisitorDB.js";
import attendanceService from "../services/business/AttendanceService.js";
import kafkaEventService from "../core/kafka/KafkaEventService.js";
import uploadSnapshotPushService from "../core/services/UploadSnapshotPushService.js";
import edgeAIClient from "../core/clients/EdgeAIClient.js";

const FaceController = {
  async registerFace(req, res) {
    const parsed = z.object({ embedding: z.array(z.number()), metadata: z.any().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const id = await faceDB.addFace(parsed.data.embedding, parsed.data.metadata || {});
    return res.status(201).json({ id });
  },
  async batchRegisterFaces(req, res) {
    const parsed = z.object({ faces: z.array(z.object({ id: z.string().optional(), embedding: z.array(z.number()), metadata: z.any().optional() })) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    await faceDB.batchUpsert(parsed.data.faces.map(f => ({ id: f.id, embedding: f.embedding, metadata: f.metadata })));
    return res.json({ count: parsed.data.faces.length });
  },
  async getEmployeeFaces(_req, res) {
    return res.json({ faces: [] });
  },
  async getFaceDetails(_req, res) {
    return res.json({ face: null });
  },
  async updateFace(_req, res) {
    return res.json({ ok: true });
  },
  async deleteFace(req, res) {
    const id = String(req.params.id);
    await faceDB.deleteFace(id);
    return res.json({ success: true });
  },
  async verifyFace(req, res) {
    const parsed = z.object({ embedding: z.array(z.number()) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const match = await faceDB.findMatch(parsed.data.embedding);
    return res.json({ match });
  },
  async recognizeAndMark(req, res) {
    const hasFile = Boolean(req.file && req.file.buffer);
    let aiResult = null;
    if (hasFile) {
      aiResult = await edgeAIClient.recognizeImageBuffer(req.file.buffer, { source: 'api' });
    } else {
      const parsed = z.object({
        embedding: z.array(z.number()).optional(),
        imageUrl: z.string().optional(),
        deviceId: z.string().optional(),
        timestamp: z.string().optional(),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
      if (parsed.data.imageUrl) {
        aiResult = await edgeAIClient.recognizeByUrl(parsed.data.imageUrl, { source: 'api' });
      } else if (parsed.data.embedding) {
        const match = await faceDB.findMatch(parsed.data.embedding);
        if (!match) return res.status(404).json({ message: "no match" });
        aiResult = { employeeId: match.metadata?.employeeId, confidence: match.similarity, faceId: match.faceId };
      } else {
        return res.status(400).json({ message: "image or embedding required" });
      }
    }

    const employeeId = aiResult?.employeeId;
    if (!employeeId) return res.status(404).json({ message: "no employee identified" });

    const record = await attendanceService.markAttendance({
      employeeId: String(employeeId),
      deviceId: req.body?.deviceId,
      timestamp: req.body?.timestamp,
      scope: {
        tenantId: String(req.headers["x-tenant-id"] || req.auth?.scope?.tenantId || ""),
        customerId: req.headers["x-customer-id"] ? String(req.headers["x-customer-id"]) : undefined,
        siteId: req.headers["x-site-id"] ? String(req.headers["x-site-id"]) : undefined,
        unitId: req.headers["x-unit-id"] ? String(req.headers["x-unit-id"]) : undefined,
      },
    });
    await kafkaEventService.publishEvent({
      type: "FACE_RECOGNIZED",
      employeeId,
      confidence: aiResult?.confidence,
      timestamp: new Date().toISOString(),
    });
    return res.json({ result: aiResult, record });
  },
  async verifyMultipleFaces(req, res) {
    const parsed = z.object({ embeddings: z.array(z.array(z.number())) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const out = [];
    for (const e of parsed.data.embeddings) {
      // eslint-disable-next-line no-await-in-loop
      const m = await faceDB.findMatch(e);
      out.push(m);
    }
    return res.json({ results: out });
  },
  async searchFaces(req, res) {
    const parsed = z.object({ embedding: z.array(z.number()) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const match = await faceDB.findMatch(parsed.data.embedding);
    return res.json({ match });
  },
  async searchByEmbedding(req, res) {
    const parsed = z.object({ embedding: z.array(z.number()) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const match = await faceDB.findMatch(parsed.data.embedding);
    return res.json({ match });
  },
  async uploadSnapshot(req, res) {
    if (!uploadSnapshotPushService.running) {
      await uploadSnapshotPushService.initialize();
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "snapshot file required" });
    }
    const jobId = uploadSnapshotPushService.enqueue({
      data: req.file.buffer,
      metadata: {
        uploader: req.auth?.user?.email || "api",
      },
    });
    return res.status(202).json({ jobId });
  },
  async getFaceGroups(_req, res) {
    return res.json({ groups: [] });
  },
  async createFaceGroup(_req, res) {
    return res.status(201).json({ ok: true });
  },
  async updateFaceGroup(_req, res) {
    return res.json({ ok: true });
  },
  async deleteFaceGroup(_req, res) {
    return res.json({ ok: true });
  },
  async addFacesToGroup(_req, res) {
    return res.json({ ok: true });
  },
  async removeFacesFromGroup(_req, res) {
    return res.json({ ok: true });
  },
  async getFaceStats(_req, res) {
    const stats = await faceDB.getStats();
    return res.json(stats);
  },
  async getMatchStats(_req, res) {
    return res.json({ known: 0, unknown: 0 });
  },
  async getVisitors(_req, res) {
    const list = await visitorDB.getKnownVisitors();
    return res.json({ visitors: list });
  },
  async getVisitorDetails(_req, res) {
    return res.json({ visitor: null });
  },
  async blacklistVisitor(_req, res) {
    return res.json({ ok: true });
  },
};

export default FaceController;

