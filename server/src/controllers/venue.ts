import { Request, Response } from "express";
import {
  createVenue,
  getVenues,
  getVenueById,
  InvalidVenueConfigurationError,
  updateVenue,
  deleteVenue,
} from "../service/venue";
import {
  areStageSections,
  CreateVenueDto,
  isStageType,
  UpdateVenueDto,
} from "../types/venue";

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
      !isStageType(dto.stageType) ||
      !Number.isInteger(dto.capacity) ||
      dto.capacity <= 0 ||
      !areStageSections(dto.stageSections)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, location, a positive capacity, a valid stageType, and at least one valid stageSection are required",
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

    if (dto.stageType !== undefined && !isStageType(dto.stageType)) {
      return res.status(400).json({
        success: false,
        message: "stageType must be THEATER, CONCERT_STAGE, or STADIUM",
      });
    }

    if (
      dto.capacity !== undefined &&
      (!Number.isInteger(dto.capacity) || dto.capacity <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "capacity must be a positive integer",
      });
    }

    if (
      dto.stageSections !== undefined &&
      !areStageSections(dto.stageSections)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "stageSections must contain unique IDs, names, and valid ticket types",
      });
    }

    const venue = await updateVenue(id, dto);

    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }

    res.status(200).json({ success: true, data: venue });
  } catch (error) {
    if (error instanceof InvalidVenueConfigurationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
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
