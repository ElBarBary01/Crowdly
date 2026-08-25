import { Request, Response } from "express";
import {
  createArtist,
  getArtists,
  getArtistById,
  updateArtist,
  deleteArtist,
} from "../service/artist";
import { CreateArtistDto, UpdateArtistDto } from "../types/artist";

const getArtistsHandler = async (_req: Request, res: Response) => {
  try {
    const artists = await getArtists();
    res
      .status(200)
      .json({ success: true, count: artists.length, data: artists });
  } catch (error) {
    console.error("Error fetching artists:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch artists" });
  }
};

const getArtistByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Artist ID is required" });
    }
    const artist = await getArtistById(id);

    if (!artist) {
      return res
        .status(404)
        .json({ success: false, message: "Artist not found" });
    }

    res.status(200).json({ success: true, data: artist });
  } catch (error) {
    console.error("Error fetching artist:", error);
    res.status(500).json({ success: false, message: "Failed to fetch artist" });
  }
};

const createArtistHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreateArtistDto = req.body;

    // Validate required fields
    if (!dto.name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    const artist = await createArtist(dto);
    res.status(201).json({ success: true, data: artist });
  } catch (error) {
    console.error("Error creating artist:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create artist" });
  }
};

const updateArtistHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Artist ID is required" });
    }
    const dto: UpdateArtistDto = req.body;

    const artist = await updateArtist(id, dto);

    if (!artist) {
      return res
        .status(404)
        .json({ success: false, message: "Artist not found" });
    }

    res.status(200).json({ success: true, data: artist });
  } catch (error) {
    console.error("Error updating artist:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update artist" });
  }
};

const deleteArtistHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Artist ID is required" });
    }
    const artist = await deleteArtist(id);

    if (!artist) {
      return res
        .status(404)
        .json({ success: false, message: "Artist not found" });
    }

    res.status(200).json({
      success: true,
      message: "Artist deleted successfully",
      data: artist,
    });
  } catch (error) {
    console.error("Error deleting artist:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete artist" });
  }
};

export {
  getArtistsHandler,
  getArtistByIdHandler,
  createArtistHandler,
  updateArtistHandler,
  deleteArtistHandler,
};
