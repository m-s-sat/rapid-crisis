import mongoose from "mongoose";
import { crisisModel, venueModel, AiResponse } from "../models/ai_response.model.js";
import { env } from "../config/env.js";

async function seed() {
    console.log("Connecting to MongoDB at", env.MONGO_URI, "...");
    await mongoose.connect(env.MONGO_URI);
    
    console.log("Clearing old test data...");
    await crisisModel.deleteMany({});
    await venueModel.deleteMany({});
    await AiResponse.deleteMany({});

    console.log("Inserting Crisis...");
    const crisis = new crisisModel({
        type: "fire"
    });
    await crisis.save();

    console.log("Inserting Venue...");
    const venue = new venueModel({
        name: "Grand Plaza Hotel",
        type: "hotel",
        address: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        country: "USA",
        phone: "+917645054550",
        email: "[EMAIL_ADDRESS]",
        staff_details: {
            "fire": {
                name: "John Doe (Fire Safety Manager)",
                phoneNumber: "+917645054550"
            },
            "medical": {
                name: "Jane Smith (Medic)",
                phoneNumber: "+917645054550"
            }
        },
        guest_details: [
            {
                name: "Alice Johnson",
                phoneNumber: "+917645054550",
                room_no: 402
            }
        ]
    });
    await venue.save();

    console.log("Inserting AI Response record required for population...");
    // The controller currently queries this collection to populate the payload for Redis!
    const response = new AiResponse({
        venue: venue._id,
        crisis: crisis._id,
        confidence_score: 0.85,
        status: "active"
    });
    await response.save();

    console.log("\n==================================");
    console.log("✅ SEEDING COMPLETE!");
    console.log("Use the following JSON body for your POST to http://localhost:3000/api/ai/response :\n");
    console.log(JSON.stringify({
        venue: venue._id,
        crisis: crisis._id,
        confidence_score: 0.85,
        status: "active"
    }, null, 2));
    console.log("\n==================================\n");

    process.exit(0);
}

seed().catch((err) => {
    console.error("Error seeding DB:", err);
    process.exit(1);
});
