import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

const blogsController = {
  getBlogBySlugController: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { titleSlug, subSlug } = req.params;
    const featureCategory = await prisma.featureCategory.findFirst({
      where: {
        slug: titleSlug,
      },
    });
    if (!featureCategory) {
      res.status(404).json({ error: "Feature category not found" });
      return;
    }

    const blog = await prisma.feature.findFirst({
      where: {
        AND: [
          {
            full_seo_url: {
              contains: subSlug,
            },
          },
          {
            full_seo_url: {
              contains: titleSlug,
            },
          },
        ],
      },
    });

    if (!blog) {
      res.status(404).json({ error: "Blog not found" });
      return;
    }

    res.status(200).json({
      blogTitle: blog.title,
      publishedDate: new Date(Number(blog.timestamp) * 1000).toLocaleDateString(
        "en-US",
        {
          month: "long",
          year: "numeric",
          day: "numeric",
        }
      ),
      slugTitle: featureCategory.title,
      blogContent: blog.body,
    });
  },
};

export default blogsController;
