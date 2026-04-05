export function generateBody(
    venueName: string,
    zone: string,
    crisisType: string,
    role: "staff" | "guest" | "admin",
    safetyMeasures?: string,
    description?: string
): string {
    const typeUpper = crisisType.toUpperCase();
    const measures = safetyMeasures || "Follow the instructions of the venue staff.";
    const info = description ? ` (${description})` : "";

    if (role === "admin") {
        return `[ADMIN-ALERT] ${typeUpper} detected at ${zone} of ${venueName}.${info} Monitor and coordinate with staff for response.`;
    }
    
    if (role === "staff") {
        return `[ACTION-REQUIRED] ${typeUpper} at ${zone}!${info} Staff, please proceed to ${zone} immediately to resolve the issue. (Venue: ${venueName})`;
    }

    return `${typeUpper} ALERT: A ${crisisType} has been confirmed in the ${zone} area of ${venueName}.${info} ${measures} Please stay safe!`;
}
