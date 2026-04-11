const COLORS = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
} as const;

function timestamp(): string {
    return new Date().toISOString();
}

export const logger = {
    info(msg: string, ...args: unknown[]) {
        console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.cyan}[IOT]${COLORS.reset} ${msg}`, ...args);
    },
    success(msg: string, ...args: unknown[]) {
        console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.green}[IOT ✓]${COLORS.reset} ${msg}`, ...args);
    },
    warn(msg: string, ...args: unknown[]) {
        console.warn(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}[IOT ⚠]${COLORS.reset} ${msg}`, ...args);
    },
    error(msg: string, ...args: unknown[]) {
        console.error(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.red}[IOT ✗]${COLORS.reset} ${msg}`, ...args);
    },
    sensor(deviceId: string, crisisType: string, confidence: number) {
        const color = confidence > 0.7 ? COLORS.red : confidence > 0.4 ? COLORS.yellow : COLORS.green;
        console.log(
            `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.magenta}[ESP32 ${deviceId}]${COLORS.reset} ` +
            `crisis=${COLORS.cyan}${crisisType}${COLORS.reset} ` +
            `confidence=${color}${(confidence * 100).toFixed(1)}%${COLORS.reset}`
        );
    },
};
