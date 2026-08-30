import { Request, Response } from "express";
import {
  createEvent,
  getEvents,
  getUpcomingEvents,
  getEventById,
  getRelatedEvents,
  getTrendingEvents,
  InvalidEventConfigurationError,
  updateEvent,
  deleteEvent,
} from "../service/event";
import {
  CreateEventDto,
  UpdateEventDto,
  GetEventsQuery,
  areEventTickets,
} from "../types/event";

const getEventsHandler = async (req: Request, res: Response) => {
  try {
    const query: GetEventsQuery = {
      sort: req.query.sort as GetEventsQuery["sort"],
      order: req.query.order as GetEventsQuery["order"],
      genre: req.query.genre as string,
      venueId: req.query.venueId as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 6,
    };

    const result = await getEvents(query);

    res.status(200).json({
      success: true,
      count: result.events.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: result.events,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
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

const getLatestEventsHandler = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const upcomingEvents = await getUpcomingEvents(limit);
    res.status(200).json({
      success: true,
      count: upcomingEvents.length,
      data: upcomingEvents,
    });
  } catch (error) {
    console.error("Error fetching latest events:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch latest events" });
  }
};

const createEventHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreateEventDto = req.body;

    // Validate required fields
    if (
      !dto.title ||
      !dto.date ||
      !dto.time ||
      !dto.venueId ||
      !Array.isArray(dto.genres) ||
      !Array.isArray(dto.artistsIds) ||
      !areEventTickets(dto.tickets)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, date, time, venueId, genres, artistsIds, and valid unique tickets are required",
      });
    }

    const event = await createEvent(dto);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    if (error instanceof InvalidEventConfigurationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
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

    if (dto.tickets !== undefined && !areEventTickets(dto.tickets)) {
      return res.status(400).json({
        success: false,
        message: "tickets must contain valid, unique ticket categories",
      });
    }

    const event = await updateEvent(id, dto);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    if (error instanceof InvalidEventConfigurationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
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
const getRelatedEventsHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Event ID is required" });
    }

    const events = await getRelatedEvents(id);

    if (events === null) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching related events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch related events",
    });
  }
};
const getTrendingEventsHandler = async (req: Request, res: Response) => {
  try {
    const trendingEvents = await getTrendingEvents(4);

    res.status(200).json({
      success: true,
      count: trendingEvents.length,
      data: trendingEvents,
    });
  } catch (error) {
    console.error("Error fetching trending events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending events",
    });
  }
};

export {
  getEventsHandler,
  getEventByIdHandler,
  getRelatedEventsHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getLatestEventsHandler,
  getTrendingEventsHandler,
};
