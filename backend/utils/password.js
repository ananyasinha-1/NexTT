const bcrypt = require("bcryptjs");

const hashPassword = async (password) => {
   return await bcrypt.hash(password, 10);
};

const comparePassword = async (
   plainPassword,
   hashedPassword
) => {
   return await bcrypt.compare(
      plainPassword,
      hashedPassword
   );
};

module.exports = {
   hashPassword,
   comparePassword
};