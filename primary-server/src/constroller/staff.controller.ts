import type { Request, Response } from "express";
import Staff from "../models/staff.model.js";

export const createStaff = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, phoneNumber, expertise } = req.body;
        const venueId = (req as any).venueId;

        const staff = await Staff.create({
            name,
            phoneNumber,
            expertise,
            venue_id: venueId
        });

        res.status(201).json(staff);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const getStaff = async (req: Request, res: Response): Promise<any> => {
    try {
        const venueId = (req as any).venueId;
        const { page = 1, limit = 10, expertise } = req.query;

        const query: any = { venue_id: venueId };
        if (expertise && expertise !== 'all') {
            query.expertise = expertise;
        }

        const staff = await Staff.find(query)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ name: 1 });

        const total = await Staff.countDocuments(query);

        res.json({
            staff,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteStaff = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const venueId = (req as any).venueId;

        const staff = await Staff.findOneAndDelete({ _id: id, venue_id: venueId } as any);
        if (!staff) return res.status(404).json({ message: "Staff not found" });

        res.json({ message: "Staff removed successfully" });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};
