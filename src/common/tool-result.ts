/**
 * Utility functions for wrapping tool results in the MCP response format.
 */

/**
 * Wraps a JSON-serializable payload in the standard MCP text content envelope.
 *
 * @param payload - The data to serialize and return
 * @returns MCP tool success response
 */
export function jsonResult(payload: unknown) {
    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(payload)
            }
        ]
    };
}

/**
 * Builds the standard MCP error response with `isError: true` flag.
 *
 * @param error - A short summary of the error
 * @param cause - The underlying error or exception details
 * @returns MCP tool error response conforming to the MCP specification
 */
export function errorResult(error: string, cause?: unknown) {
    return {
        isError: true,
        content: [
            {
                type: "text" as const,
                text: JSON.stringify({
                    error,
                    message:
                        cause instanceof Error
                            ? cause.message
                            : String(cause ?? "")
                })
            }
        ]
    };
}
