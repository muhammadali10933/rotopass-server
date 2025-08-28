"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const blogs_controller_1 = __importDefault(require("../controllers/blogs_controller"));
const blogsRoute = express_1.default.Router();
blogsRoute.get("/:titleSlug/:subSlug", blogs_controller_1.default.getBlogBySlugController);
exports.default = blogsRoute;
