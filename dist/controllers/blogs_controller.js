"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const blogsController = {
    getBlogBySlugController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { titleSlug, subSlug } = req.params;
        try {
            // ✅ Find the feature category by slug
            const featureCategory = yield prisma.featureCategory.findFirst({
                where: { slug: titleSlug },
            });
            if (!featureCategory) {
                res.status(404).json({ error: "Feature category not found" });
                return;
            }
            // ✅ Find the blog by full_seo_url match
            const blog = yield prisma.feature.findFirst({
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
            const rawTimestamp = blog.timestamp;
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
        }
        catch (error) {
            console.error("Error retrieving blog:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
};
exports.default = blogsController;
