import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    MAX_TOOL_INPUT_ARRAY_ITEMS,
    PROBLEM_CATEGORIES,
    PROBLEM_TAGS
} from "../../common/constants.js";
import { errorResult, jsonResult } from "../../common/tool-result.js";
import { LeetCodeBaseService } from "../../leetcode/leetcode-base-service.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Problem tool registry class that handles registration of LeetCode problem-related tools.
 * This class manages tools for accessing problem details, searching problems, and daily challenges.
 */
export class ProblemToolRegistry extends ToolRegistry {
    protected registerCommon(): void {
        // Daily challenge tool
        this.server.tool(
            "get_daily_challenge",
            "Retrieves today's Daily Challenge problem with full description (read-only, no auth). Returns problem details for the current date as JSON. Use get_problem when you know a specific titleSlug; use search_problems to discover problems by filters.",
            {},
            async () => {
                try {
                    const data =
                        await this.leetcodeService.fetchDailyChallenge();
                    return jsonResult({
                        date: new Date().toISOString().split("T")[0],
                        problem: data
                    });
                } catch (error: any) {
                    return errorResult(
                        "Failed to fetch daily challenge",
                        error
                    );
                }
            }
        );

        // Problem details tool
        this.server.tool(
            "get_problem",
            "Retrieves a single LeetCode problem by titleSlug (read-only, no auth). Returns description, examples, constraints, and metadata as JSON. Use search_problems to find problems by keyword/tag/difficulty; use get_daily_challenge for today's featured problem.",
            {
                titleSlug: z
                    .string()
                    .describe(
                        "Problem URL slug (e.g., 'two-sum', 'add-two-numbers')—the path segment after /problems/"
                    )
            },
            async ({ titleSlug }) => {
                try {
                    const data =
                        await this.leetcodeService.fetchProblemSimplified(
                            titleSlug
                        );
                    return jsonResult({
                        titleSlug,
                        problem: data
                    });
                } catch (error: any) {
                    return errorResult(
                        `Failed to fetch problem '${titleSlug}'`,
                        error
                    );
                }
            }
        );

        // Search problems tool
        this.server.tool(
            "search_problems",
            "Searches LeetCode problems by category, tags, difficulty, and keywords (read-only, no auth). Supports pagination via limit/offset. Returns matching problem list as JSON. Use get_problem when you already know the titleSlug; use this to browse or discover problems.",
            {
                category: z
                    .enum(PROBLEM_CATEGORIES as [string])
                    .default("all-code-essentials")
                    .describe(
                        "Problem set category (e.g., 'algorithms', 'database'). Default: 'all-code-essentials'."
                    ),
                tags: z
                    .array(z.enum(PROBLEM_TAGS as [string]))
                    .max(MAX_TOOL_INPUT_ARRAY_ITEMS)
                    .optional()
                    .describe(
                        "Topic tags to filter by, e.g. ['array', 'dynamic-programming']. Omit for no tag filter."
                    ),
                difficulty: z
                    .enum(["EASY", "MEDIUM", "HARD"])
                    .optional()
                    .describe("Difficulty filter. Omit for all levels."),
                searchKeywords: z
                    .string()
                    .optional()
                    .describe(
                        "Keyword search in problem titles and descriptions"
                    ),
                limit: z
                    .number()
                    .optional()
                    .default(10)
                    .describe("Max results per page (default: 10)"),
                offset: z
                    .number()
                    .optional()
                    .describe("Results to skip for pagination (default: 0)")
            },
            async ({
                category,
                tags,
                difficulty,
                limit,
                offset,
                searchKeywords
            }) => {
                try {
                    const data = await this.leetcodeService.searchProblems(
                        category,
                        tags,
                        difficulty,
                        limit,
                        offset,
                        searchKeywords
                    );
                    return jsonResult({
                        filters: { tags, difficulty, searchKeywords },
                        pagination: { limit, offset },
                        problems: data
                    });
                } catch (error: any) {
                    return errorResult("Failed to search problems", error);
                }
            }
        );

        // Code snippet tool
        this.server.tool(
            "get_code_snippet",
            "Retrieves starter boilerplate code for a problem in a specified programming language (read-only, no auth). Returns snippet, language, and method signatures as JSON. Use this when writing a solution and needing the exact starter template without fetching the full problem description.",
            {
                titleSlug: z
                    .string()
                    .describe("Problem URL slug (e.g., 'two-sum')"),
                lang: z
                    .string()
                    .describe(
                        "Language slug or name (e.g., 'python3', 'javascript', 'cpp', 'java', 'typescript', 'rust', 'golang')"
                    )
            },
            async ({ titleSlug, lang }) => {
                try {
                    const problem =
                        await this.leetcodeService.fetchProblemSimplified(
                            titleSlug
                        );
                    const normalizedLang = lang.trim().toLowerCase();
                    const snippets = problem?.codeSnippets || [];
                    const match = snippets.find(
                        (s: any) =>
                            s.langSlug?.toLowerCase() === normalizedLang ||
                            s.lang?.toLowerCase() === normalizedLang
                    );

                    if (!match) {
                        return errorResult(
                            `Code snippet for language '${lang}' not found for problem '${titleSlug}'`,
                            `Available languages: ${snippets.map((s: any) => s.langSlug).join(", ")}`
                        );
                    }

                    return jsonResult({
                        titleSlug,
                        title: problem.title,
                        questionId: problem.questionId,
                        lang: match.lang,
                        langSlug: match.langSlug,
                        code: match.code
                    });
                } catch (error: any) {
                    return errorResult(
                        `Failed to fetch code snippet for '${titleSlug}'`,
                        error
                    );
                }
            }
        );

        // Random problem tool
        this.server.tool(
            "get_random_problem",
            "Picks a random LeetCode problem optionally filtered by difficulty, category, and topic tags (read-only, no auth). Returns randomly selected problem details as JSON. Useful for mock interview preparation or algorithmic practice.",
            {
                difficulty: z
                    .enum(["EASY", "MEDIUM", "HARD"])
                    .optional()
                    .describe(
                        "Optional difficulty filter: 'EASY', 'MEDIUM', or 'HARD'"
                    ),
                tags: z
                    .array(z.enum(PROBLEM_TAGS as [string]))
                    .max(MAX_TOOL_INPUT_ARRAY_ITEMS)
                    .optional()
                    .describe(
                        "Optional topic tags, e.g. ['array', 'dynamic-programming']"
                    ),
                category: z
                    .enum(PROBLEM_CATEGORIES as [string])
                    .default("all-code-essentials")
                    .optional()
                    .describe(
                        "Category filter (default: 'all-code-essentials')"
                    )
            },
            async ({ difficulty, tags, category }) => {
                try {
                    const data = await this.leetcodeService.searchProblems(
                        category,
                        tags,
                        difficulty,
                        50,
                        0
                    );

                    const questions = data?.questions || [];
                    if (questions.length === 0) {
                        return errorResult(
                            "No problems found matching the specified criteria",
                            JSON.stringify({ difficulty, tags, category })
                        );
                    }

                    const randomIndex = Math.floor(
                        Math.random() * questions.length
                    );
                    const selected = questions[randomIndex];

                    return jsonResult({
                        selectedProblem: selected,
                        totalMatchingInPool: data.total,
                        poolSize: questions.length
                    });
                } catch (error: any) {
                    return errorResult("Failed to fetch random problem", error);
                }
            }
        );
    }
}

/**
 * Registers all problem-related tools with the MCP server.
 *
 * @param server - The MCP server instance to register tools with
 * @param leetcodeService - The LeetCode service implementation to use for API calls
 */
export function registerProblemTools(
    server: McpServer,
    leetcodeService: LeetCodeBaseService
): void {
    const registry = new ProblemToolRegistry(server, leetcodeService);
    registry.registerTools();
}
