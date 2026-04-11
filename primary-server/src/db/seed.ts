import mongoose from "mongoose";
import { crisisModel, venueModel, AiResponse } from "../models/ai_response.model.js";
import { SensorEvidence } from "../models/sensor_evidence.model.js";
import { env } from "../config/env.js";

async function seed() {
    console.log("Connecting to MongoDB at", env.MONGO_URI, "...");
    await mongoose.connect(env.MONGO_URI);

    console.log("Clearing old data...");
    await crisisModel.deleteMany({});
    await venueModel.deleteMany({});
    await AiResponse.deleteMany({});
    await SensorEvidence.deleteMany({});

    console.log("Inserting Crisis Types...");
    const crisisTypes = await crisisModel.insertMany([
        { type: "fire" },
        { type: "gas_leak" },
        { type: "earthquake" },
        { type: "security" },
        { type: "water_leak" },
        { type: "air_quality" },
    ]);

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
        email: "info@grandplaza.com",
        staff_details: {
            "fire": {
                name: "John Doe (Fire Safety Manager)",
                phoneNumber: "+917645054550"
            },
            "gas_leak": {
                name: "Mike Chen (Maintenance Lead)",
                phoneNumber: "+917645054550"
            },
            "earthquake": {
                name: "Sarah Kim (Emergency Coordinator)",
                phoneNumber: "+917645054550"
            },
            "security": {
                name: "James Wilson (Security Chief)",
                phoneNumber: "+917645054550"
            },
            "water_leak": {
                name: "Tom Brown (Facilities Manager)",
                phoneNumber: "+917645054550"
            },
            "air_quality": {
                name: "Lisa Park (HVAC Specialist)",
                phoneNumber: "+917645054550"
            }
        },
        guest_details: [
            {
                name: "Alice Johnson",
                phoneNumber: "+917645054550",
                room_no: 402
            },
            {
                name: "Bob Williams",
                phoneNumber: "+917645054550",
                room_no: 215
            },
            {
                name: "Carol Davis",
                phoneNumber: "+917645054550",
                room_no: 508
            }
        ]
    });
    await venue.save();

    console.log("\n══════════════════════════════════════");
    console.log("  SEEDING COMPLETE");
    console.log("══════════════════════════════════════");
    console.log("\n📦 Crisis Types:");
    crisisTypes.forEach(c => {
        console.log(`   ${c.type.padEnd(14)} → ${c._id}`);
    });
    console.log(`\n🏨 Venue: ${venue.name}`);
    console.log(`   ID: ${venue._id}`);
    console.log("\n👥 Staff Assignments:");
    crisisTypes.forEach(c => {
        const staff = venue.staff_details?.get(c.type);
        if (staff) {
            console.log(`   ${c.type.padEnd(14)} → ${staff.name}`);
        }
    });
    console.log(`\n🛎️  Guests: ${venue.guest_details?.length || 0}`);
    venue.guest_details?.forEach((g: any) => {
        console.log(`   Room ${g.room_no} → ${g.name} (${g.phoneNumber})`);
    });
    console.log("\n══════════════════════════════════════\n");

    process.exit(0);
}

seed().catch((err) => {
    console.error("Error seeding DB:", err);
    process.exit(1);
});
