export const isSeller = (req, res, next) => {
  if (req.user && req.user.role === "seller") return next();
  return res.status(403).json({ message: "Access denied, only sellers allowed" });
};
