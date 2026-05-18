const User = require("../database/models/User");
const { generateToken } = require("../utils/token");

const { hashPassword, comparePassword } = require("../utils/password");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { username, rollNo, email, password, phone, branch, section } =
      req.body;

    if (!username || !email || !password || !rollNo) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    const existing = await User.findOne({
      $or: [{ username }, { email }, { rollNo }],
    });

    if (existing) {
      return res.status(409).json({
        message: "Username, Email or RollNo already exists",
      });
    }

    let assignedRole = "Student";

    let assignedPerms = [];

    if (username === "JeetVarshney") {
      assignedRole = "Super Admin";

      assignedPerms = ["all"];
    }

    // hash password
    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      username,

      rollNo,

      email,

      password: hashedPassword,

      phone,

      branch,

      section,

      role: assignedRole,

      permissions: assignedPerms,
    });

    await newUser.save();

    const userObj = newUser.toObject();

    delete userObj.password;

    return res.status(201).json(userObj);
  } catch (error) {
    console.log(error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Provide credentials",
      });
    }

    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier },
        { rollNo: identifier },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const validPassword = await comparePassword(
      password,

      user.password,
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const userObj = user.toObject();

    delete userObj.password;

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",

      token,

      user: userObj,
    });
  } catch(error){
      console.error("LOGIN ERROR:", error);
        return res
   .status(500)
   .json({

      message:
      "Login failed",

      error:
      error.message

   });
  }
}

// UPDATE ROLE
exports.updateRole = async (req, res) => {
  try {
    const { targetUsername, newRole, newPermissions } = req.body;

    const user = await User.findOneAndUpdate(
      {
        username: targetUsername,
      },

      {
        role: newRole,
        permissions: newPermissions,
      },

      {
        new: true,
      },
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Role updated",
    });
  } catch (error) {
    console.error("UPDATE ROLE ERROR:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// GET USERS
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");

    return res.status(200).json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return res.status(500).json({
      message: "Failed",
    });
  }
};
