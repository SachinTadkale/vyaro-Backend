import { NextFunction, Request, Response } from "express";

type ActorType = "USER" | "COMPANY";

export const requireActor = (...allowedActors: ActorType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.actorType || !allowedActors.includes(req.user.actorType)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};
