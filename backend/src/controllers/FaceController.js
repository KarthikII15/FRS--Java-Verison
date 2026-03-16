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
    const match = await faceDB.findBestMatch(parsed.data.embedding);
    return res.json({ match });
  },
  async recognizeAndMark(req, res) {
    let embedding  = null;
    let confidence = 0;
    const deviceId  = req.body?.deviceId  || null;
    const timestamp = req.body?.timestamp || null;

    // ── PATH A: Embedding already in JSON body (sent by Jetson runner.py)
    // FAST PATH — zero EdgeAI calls. Camera ran YOLO+ArcFace locally.
    if (Array.isArray(req.body?.embedding) && req.body.embedding.length === 512) {
      embedding  = req.body.embedding;
      confidence = Number(req.body.confidence || 0);

    // ── PATH B: Image URL (external webhooks, manual API tests)
    } else if (req.body?.imageUrl) {
      let ai;
      try {
        ai = await edgeAIClient.recognizeByUrl(req.body.imageUrl, { source: 'webhook' });
      } catch (e) {
        return res.status(503).json({ message: 'EdgeAI sidecar unavailable: ' + e.message });
      }
      if (!ai?.embedding?.length) return res.status(404).json({ message: 'No face detected in image URL' });
      embedding = ai.embedding; confidence = ai.confidence || 0;

    // ── PATH C: File upload (HR admin test UI only)
    // WARNING: camera service MUST NOT use this path — causes double inference.
    } else if (req.file?.buffer) {
      let ai;
      try {
        ai = await edgeAIClient.recognizeImageBuffer(req.file.buffer, { source: 'manual-upload' });
      } catch (e) {
        return res.status(503).json({ message: 'EdgeAI sidecar unavailable: ' + e.message });
      }
      if (!ai?.embedding?.length) return res.status(404).json({ message: 'No face detected in uploaded image' });
      embedding = ai.embedding; confidence = ai.confidence || 0;

    } else {
      return res.status(400).json({
        message: 'Provide embedding (512-element array), imageUrl (string), or image (multipart file)',
      });
    }

    // ── DB MATCH: embedding → employee (same for all 3 paths)
    const match = await faceDB.findBestMatch(embedding);
    if (!match) {
      // Publish unknown face event non-fatally
      kafkaEventService.publishEvent({
        type: 'UNKNOWN_FACE_DETECTED', deviceId, confidence,
        timestamp: timestamp || new Date().toISOString(),
      }).catch(() => {});
      return res.status(404).json({ message: 'Face not recognised — employee not enrolled or similarity below threshold' });
    }

    const employeeId = match.metadata?.employeeId;
    if (!employeeId) {
      return res.status(404).json({ message: 'Face matched but employee mapping is missing — re-enroll this face' });
    }

    // ── MARK ATTENDANCE
    const record = await attendanceService.markAttendance({
      employeeId: String(employeeId),
      deviceId,
      timestamp,
      scope: {
        tenantId:   String(req.headers['x-tenant-id']   || req.auth?.scope?.tenantId   || ''),
        customerId: req.headers['x-customer-id'] ? String(req.headers['x-customer-id']) : undefined,
        siteId:     req.headers['x-site-id']     ? String(req.headers['x-site-id'])     : undefined,
        unitId:     req.headers['x-unit-id']     ? String(req.headers['x-unit-id'])     : undefined,
      },
    });

    // ── PUBLISH TO KAFKA (non-fatal)
    kafkaEventService.publishEvent({
      type: 'FACE_RECOGNIZED',
      employeeId,
      similarity:  match.similarity,
      confidence,
      deviceId,
      timestamp:   new Date().toISOString(),
    }).catch(() => {});

    return res.json({
      result: {
        employeeId,
        fullName:   match.metadata?.fullName,
        similarity: match.similarity,
        confidence,
        faceId:     match.faceId,
      },
      record,
    });
  },
  async verifyMultipleFaces(req, res) {
    const parsed = z.object({ embeddings: z.array(z.array(z.number())) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const out = [];
    for (const e of parsed.data.embeddings) {
      // eslint-disable-next-line no-await-in-loop
      const m = await faceDB.findBestMatch(e);
      out.push(m);
    }
    return res.json({ results: out });
  },
  async searchFaces(req, res) {
    const parsed = z.object({ embedding: z.array(z.number()) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const match = await faceDB.findBestMatch(parsed.data.embedding);
    return res.json({ match });
  },
  async searchByEmbedding(req, res) {
    const parsed = z.object({ embedding: z.array(z.number()) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const match = await faceDB.findBestMatch(parsed.data.embedding);
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

