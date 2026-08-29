import { Request, Response } from "express";
import {
  getGenreCounts,
  getFeaturedArtists,
  getNearByEvents,
  getTrendingEvents,
} from "../service/home";

export async function getHomeData(req: Request, res: Response) {
  try {
    const [trending, genres, nearby, artists] = await Promise.all([
      getTrendingEvents(),
      getGenreCounts(),
      getNearByEvents(),
      getFeaturedArtists(),
    ]);

    res.status(200).json({
      success: true,
      message: "Home data fetched successfully",
      data: {
        trending,
        genres,
        nearby,
        artists,
      },
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ success: false, message: "Failed to delete event" });
  }
}
