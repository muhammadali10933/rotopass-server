import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

const blogsController = {
  getBlogBySlugController: async (req: Request, res: Response): Promise<void> => {
    const { titleSlug, subSlug } = req.params;

    try {
      // ✅ Find the feature category by slug
      const featureCategory = await prisma.featureCategory.findFirst({
        where: { slug: titleSlug },
      });

      if (!featureCategory) {
        res.status(404).json({ error: "Feature category not found" });
        return;
      }

      // ✅ Find the blog by full_seo_url match
      const blog = await prisma.feature.findFirst({
        where: {
          AND: [
            { full_seo_url: { contains: subSlug } },
            { full_seo_url: { contains: titleSlug } },
          ],
        },
      });

      if (!blog) {
        res.status(404).json({ error: "Blog not found" });
        return;
      }

      // Postgres BigInt handling
      const rawTimestamp = blog.timestamp as unknown as bigint;
      const timestampNum = Number(rawTimestamp); // convert bigint → number (safe if within JS range)

      const publishedDate = new Date(timestampNum * 1000).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        day: "numeric",
      });

      res.status(200).json({
        blogTitle: blog.title,
        publishedDate,
        slugTitle: featureCategory.title,
        blogContent: blog.body,
      });
    } catch (error) {
      console.error("Error retrieving blog:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default blogsController;
