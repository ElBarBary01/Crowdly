import { Request, Response } from "express";
import prisma from "../lib/prisma";

const getUser = (req: Request, res: Response) => {
  const user = prisma.user.findMany();
  res.status(200).json({ message: "User route is working!", users: user });
};

const createUser = (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }
  // Here you would typically add logic to save the user to a database
  res
    .status(201)
    .json({ message: "User created successfully!", user: { name, email } });
};
export { getUser, createUser };
