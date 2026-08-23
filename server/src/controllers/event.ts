import { Request, Response } from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../lib/event";
import { CreateEventDto, UpdateEventDto } from "../types/event";

const getEventsHandler = async (_req: Request, res: Response) => {
  try {
    const events = await getEvents();
    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
};

const getEventByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Event ID is required" });
    }
    const event = await getEventById(id);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
};

const createEventHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreateEventDto = req.body;

    // Validate required fields
    if (!dto.title || !dto.date || !dto.time || !dto.venueId) {
      return res.status(400).json({
        success: false,
        message: "Title, date, time, and venueId are required",
      });
    }

    const event = await createEvent(dto);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: "Failed to create event" });
  }
};

const updateEventHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Event ID is required" });
    }
    const dto: UpdateEventDto = req.body;

    const event = await updateEvent(id, dto);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ success: false, message: "Failed to update event" });
  }
};

const deleteEventHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Event ID is required" });
    }
    const event = await deleteEvent(id);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
      data: event,
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ success: false, message: "Failed to delete event" });
  }
};

export {
  getEventsHandler,
  getEventByIdHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
};
