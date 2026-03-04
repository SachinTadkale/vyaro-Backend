export const adminOnly = (
  req: any,
  res: any,
  next: any
) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};