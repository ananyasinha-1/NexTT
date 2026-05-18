const express = require("express");
const router = express.Router();

const {
  register,
  login,
  updateRole,
  getUsers,
} = require("../controllers/auth");

const {authMiddleware , authorizeRoles} = require("../middlewares/auth");

// PUBLIC ROUTES

router.post("/register", register);

router.post("/login", login);

// PROTECTED ROUTES

router.put("/role", authMiddleware,authorizeRoles("Super Admin"), updateRole);

router.get("/users", authMiddleware, getUsers);

module.exports = router;
