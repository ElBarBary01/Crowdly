import { Request, Response } from "express";
import {
  createVenue,
  getVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
} from "../service/venue";
import { CreateVenueDto, UpdateVenueDto } from "../types/venue";

const getVenuesHandler = async (_req: Request, res: Response) => {
  try {
    const venues = await getVenues();
    res.status(200).json({ success: true, count: venues.length, data: venues });
  } catch (error) {
    console.error("Error fetching venues:", error);
    res.status(500).json({ success: false, message: "Failed to fetch venues" });
  }
};

const getVenueByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Venue ID is required" });
    }
    const venue = await getVenueById(id);

    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }

    res.status(200).json({ success: true, data: venue });
  } catch (error) {
    console.error("Error fetching venue:", error);
    res.status(500).json({ success: false, message: "Failed to fetch venue" });
  }
};

const createVenueHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreateVenueDto = req.body;

    // Validate required fields
    if (
      !dto.name ||
      !dto.location ||
      dto.capacity === undefined ||
      dto.capacity === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, location, and capacity are required",
      });
    }

    const venue = await createVenue(dto);
    res.status(201).json({ success: true, data: venue });
  } catch (error) {
    console.error("Error creating venue:", error);
    res.status(500).json({ success: false, message: "Failed to create venue" });
  }
};

const updateVenueHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Venue ID is required" });
    }
    const dto: UpdateVenueDto = req.body;

    const venue = await updateVenue(id, dto);

    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }

    res.status(200).json({ success: true, data: venue });
  } catch (error) {
    console.error("Error updating venue:", error);
    res.status(500).json({ success: false, message: "Failed to update venue" });
  }
};

const deleteVenueHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Venue ID is required" });
    }
    const venue = await deleteVenue(id);

    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }

    res.status(200).json({
      success: true,
      message: "Venue deleted successfully",
      data: venue,
    });
  } catch (error) {
    console.error("Error deleting venue:", error);
    res.status(500).json({ success: false, message: "Failed to delete venue" });
  }
};

export {
  getVenuesHandler,
  getVenueByIdHandler,
  createVenueHandler,
  updateVenueHandler,
  deleteVenueHandler,
};
