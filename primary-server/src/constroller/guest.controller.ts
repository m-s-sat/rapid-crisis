import type { Request, Response } from "express";
import Guest from "../models/guest.model.js";

export const createGuest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, room_id, phoneNumber } = req.body;
        const venueId = (req as any).venueId;

        const guest = await Guest.create({
            name,
            room_id,
            phoneNumber,
            venue_id: venueId,
            status: 'active'
        });

        res.status(201).json(guest);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const getGuests = async (req: Request, res: Response): Promise<any> => {
    try {
        const venueId = (req as any).venueId;
        const { page = 1, limit = 10, status } = req.query;

        const query: any = { venue_id: venueId };
        if (status) query.status = status;

        const guests = await Guest.find(query)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ checked_in_at: -1 });

        const total = await Guest.countDocuments(query);

        res.json({
            guests,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const checkOutGuest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const venue_id = (req as any).venueId;

        const guest = await Guest.findOneAndUpdate(
            { _id: id, venue_id } as any,
            { status: 'checked_out' },
            { new: true }
        );

        if (!guest) return res.status(404).json({ message: "Guest not found" });

        res.json(guest);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
