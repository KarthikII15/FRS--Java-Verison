import { z } from "zod";
import searchService from "../services/business/SearchService.js";

const SearchController = {
  async searchEvents(req, res) {
    const qs = z.object({
      deviceId: z.string().optional(),
      eventType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.coerce.number().optional(),
    }).safeParse(req.query);
    if (!qs.success) return res.status(400).json({ message: "invalid query" });
    const data = await searchService.searchEvents(qs.data);
    return res.json({ data });
  },

  async advancedEventSearch(req, res) {
    const parsed = z.object({ filters: z.any(), limit: z.coerce.number().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.advancedEventSearch(parsed.data);
    return res.json({ data });
  },

  async getEventById(req, res) {
    const data = await searchService.getEventById({ eventId: String(req.params.id) });
    if (!data) return res.status(404).json({ message: "not found" });
    return res.json(data);
  },

  async searchByFace(req, res) {
    const parsed = z.object({ embedding: z.array(z.number()), profile: z.string().optional(), cameraId: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.searchByFace(parsed.data);
    return res.json({ data });
  },

  async batchFaceSearch(req, res) {
    const parsed = z.object({ embeddings: z.array(z.array(z.number())) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.batchFaceSearch(parsed.data);
    return res.json({ data });
  },

  async searchByAppearance(req, res) {
    const parsed = z.object({ attributes: z.any(), profile: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.searchByAppearance(parsed.data);
    return res.json({ data });
  },

  async searchByAttributes(req, res) {
    const parsed = z.object({ attributes: z.any() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.searchByAttributes(parsed.data);
    return res.json({ data });
  },

  async searchByVehicle(req, res) {
    const parsed = z.object({ attributes: z.any() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.searchByVehicle(parsed.data);
    return res.json({ data });
  },

  async searchByLicensePlate(req, res) {
    const parsed = z.object({ plate: z.string() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.searchByLicensePlate(parsed.data);
    return res.json({ data });
  },

  async getSearchProfiles(_req, res) {
    return res.json({ profiles: [] });
  },
  async getSearchProfile(_req, res) {
    return res.json({ profile: null });
  },
  async createSearchProfile(_req, res) {
    return res.status(201).json({ ok: true });
  },
  async updateSearchProfile(_req, res) {
    return res.json({ ok: true });
  },
  async deleteSearchProfile(_req, res) {
    return res.json({ ok: true });
  },

  async getSearchHistory(req, res) {
    const userId = String(req.auth?.user?.id || "anon");
    const data = await searchService.getSearchHistory({ userId });
    return res.json({ data });
  },
  async getSearchResults(req, res) {
    const userId = String(req.auth?.user?.id || "anon");
    const data = await searchService.getSearchResults({ userId });
    return res.json({ data });
  },
  async saveSearchResult(req, res) {
    const userId = String(req.auth?.user?.id || "anon");
    const parsed = z.object({ result: z.any() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "invalid payload" });
    const data = await searchService.saveSearchResult({ userId, result: parsed.data.result });
    return res.status(201).json(data);
  },
  async deleteSearchHistory(req, res) {
    const userId = String(req.auth?.user?.id || "anon");
    const parsed = z.object({ id: z.string() }).safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ message: "invalid params" });
    const out = await searchService.deleteSearchHistory({ userId, id: parsed.data.id });
    return res.json(out);
  },
};

export default SearchController;

