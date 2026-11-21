import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { errorResult, jsonResult } from "../../common/tool-result.js";
import { LeetCodeBaseService } from "../../leetcode/leetcode-base-service.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Contest tool registry class that handles registration of LeetCode contest-related tools.
 * This class manages tools for accessing contest rankings, history, and user performance in contests.
 */
export class ContestToolRegistry extends ToolRegistry {
    protected registerCommon(): void {
        // User contest ranking tool
        this.server.tool(
            "get_user_contest_ranking",
            "Retrieves a user's contest ranking and participation history (read-only, no auth). Returns overall rating, ranking, and per-contest performance as JSON. Use get_user_profile for general stats and ranking; use this specifically for contest performance data.",
            {
                username: z
                    .string()
                    .describe(
                        "LeetCode username whose contest ranking to fetch"
                    ),
                attended: z
                    .boolean()
                    .optional()
                    .default(true)
                    .describe(
                        "true = only contests the user attended (default); false = include all contests in history"
                    )
            },
            async ({ username, attended = true }) => {
                try {
                    const data =
                        await this.leetcodeService.fetchUserContestRanking(
                            username,
                            attended
                        );
                    return jsonResult({
                        username,
                        contestRanking: data
                    });
                } catch (error: any) {
                    return errorResult(
                        "Failed to fetch user contest ranking",
                        error
                    );
                }
            }
        );

        // Upcoming contests tool
        this.server.tool(
            "get_upcoming_contests",
            "Retrieves the schedule of upcoming LeetCode contests (read-only, no auth). Returns titles, slugs, start times (epoch & ISO), durations, and direct registration links as JSON. Use this to check upcoming Weekly or Biweekly contests.",
            {},
            async () => {
                try {
                    const data =
                        await this.leetcodeService.fetchUpcomingContests();
                    return jsonResult({
                        count: data.length,
                        upcomingContests: data
                    });
                } catch (error: any) {
                    return errorResult(
                        "Failed to fetch upcoming contests",
                        error
                    );
                }
            }
        );
    }
}

/**
 * Registers all contest-related tools with the MCP server.
 *
 * @param server - The MCP server instance to register tools with
 * @param leetcodeService - The LeetCode service implementation to use for API calls
 */
export function registerContestTools(
    server: McpServer,
    leetcodeService: LeetCodeBaseService
): void {
    const registry = new ContestToolRegistry(server, leetcodeService);
    registry.registerTools();
}
