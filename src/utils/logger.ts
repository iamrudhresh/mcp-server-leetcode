import { pino } from "pino";

const logger = pino(
    {
        level: "info",
        redact: [
            "cookie",
            // Hyphenated keys need bracket notation, or pino throws at startup.
            '["x-csrftoken"]',
            "csrfToken",
            "session",
            "LEETCODE_SESSION",
            "headers.cookie",
            "headers['x-csrftoken']"
        ],
        formatters: {
            level: (label: string) => ({ level: label.toUpperCase() })
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        messageKey: "message",
        nestedKey: "payload"
    },
    process.stderr
);

export default logger;
