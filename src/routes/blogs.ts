import express from "express";
import blogsController from "../controllers/blogs_controller";
const blogsRoute = express.Router();

blogsRoute.get(
  "/:titleSlug/:subSlug",
  blogsController.getBlogBySlugController
);

export default blogsRoute;
