import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get taxonomy data
  app.get("/api/taxonomy", async (req, res) => {
    try {
      const taxonomyData = await storage.getTaxonomyData();
      res.json(taxonomyData);
    } catch (error) {
      console.error("Error fetching taxonomy data:", error);
      res.status(500).json({ message: "Failed to fetch taxonomy data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
