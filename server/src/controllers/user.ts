import { Request, Response } from "express";

const getUser = (req: Request, res: Response) => {
  res.status(200).json({ message: "User route is working!" });
};

export { getUser };
