import { Request, Response } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../service/user";
import { CreateUserDto, UpdateUserDto } from "../types/user";

const getUsersHandler = async (_req: Request, res: Response) => {
  try {
    const users = await getUsers();
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

const getUserByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid User ID is required" });
    }
    const user = await getUserById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

const createUserHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreateUserDto = req.body;

    // Validate required fields
    if (!dto.name || !dto.email || !dto.password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }
    const user = await createUser(dto);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
};

const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid User ID is required" });
    }
    const dto: UpdateUserDto = req.body;

    const user = await updateUser(id, dto);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

const deleteUserHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid User ID is required" });
    }
    const user = await deleteUser(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

export {
  getUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
};
