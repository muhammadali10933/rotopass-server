"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_controller_1 = __importDefault(require("../controllers/users_controller"));
const usersRoute = express_1.default.Router();
usersRoute.post("/register", users_controller_1.default.registerUserController);
usersRoute.post("/login", users_controller_1.default.loginUserController);
usersRoute.post("/check_expires", users_controller_1.default.checkExpiresController);
usersRoute.post("/forgot_password", users_controller_1.default.forgotPasswordController);
usersRoute.post("/reset_password", users_controller_1.default.resetPasswordController);
usersRoute.post("/free_signup", users_controller_1.default.freeSignUpController);
exports.default = usersRoute;
