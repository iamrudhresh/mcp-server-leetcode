import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeetCodeBaseService } from "../../leetcode/leetcode-base-service.js";

/**
 * Registers LeetCode MCP Prompts with the server.
 * Prompts provide pre-configured, structured workflows for AI assistants:
 * - explain_problem: Conceptual explanation and intuition
 * - get_hint: Progressive hinting without spoilers
 * - code_review: Solution review, complexity analysis, and edge cases
 * - mock_interview: Interactive FAANG-style interview persona
 */
export function registerLeetCodePrompts(
    server: McpServer,
    leetcodeService: LeetCodeBaseService
): void {
    // 1. Explain Problem Prompt
    server.prompt(
        "explain_problem",
        "Generates a structured, intuitive explanation of a LeetCode problem, breaking down constraints, edge cases, and algorithmic patterns.",
        {
            titleSlug: z
                .string()
                .describe(
                    "Problem URL slug (e.g., 'two-sum', 'trapping-rain-water')"
                ),
            focus: z
                .enum([
                    "intuition",
                    "edge_cases",
                    "complexity",
                    "comprehensive"
                ])
                .optional()
                .default("comprehensive")
                .describe(
                    "Aspect to focus on: intuition, edge_cases, complexity, or comprehensive"
                )
        },
        async ({ titleSlug, focus }) => {
            let problemData: any;
            try {
                problemData =
                    await leetcodeService.fetchProblemSimplified(titleSlug);
            } catch (err: any) {
                problemData = { titleSlug, error: err.message };
            }

            const promptText = `Please explain the LeetCode problem "${problemData.title || titleSlug}" (${problemData.difficulty || "Unknown difficulty"}):

Problem Details:
${JSON.stringify(problemData, null, 2)}

Instructions:
- Focus: ${focus}
- Explain the underlying intuition behind this problem in simple terms.
- Highlight key patterns (e.g., Two Pointers, Monotonic Stack, Dynamic Programming).
- Identify critical edge cases and constraint boundaries.
- State optimal Time and Space Complexity targets without immediately giving away the entire solution code.`;

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: promptText
                        }
                    }
                ]
            };
        }
    );

    // 2. Get Progressive Hint Prompt
    server.prompt(
        "get_hint",
        "Provides progressive, non-spoiler hints for a problem based on the requested hint level.",
        {
            titleSlug: z
                .string()
                .describe("Problem URL slug (e.g., 'two-sum')"),
            level: z
                .enum(["1_intuition", "2_data_structure", "3_pseudocode"])
                .default("1_intuition")
                .describe(
                    "Hint depth: 1_intuition (conceptual idea), 2_data_structure (key structures/pointers), 3_pseudocode (high-level flow)"
                )
        },
        async ({ titleSlug, level }) => {
            let problemData: any;
            try {
                problemData =
                    await leetcodeService.fetchProblemSimplified(titleSlug);
            } catch (err: any) {
                problemData = { titleSlug, error: err.message };
            }

            const promptText = `I am practicing LeetCode problem "${problemData.title || titleSlug}" (${problemData.difficulty || "Unknown"}).
Official hints available: ${JSON.stringify(problemData.hints || [])}

Requested Hint Level: ${level}

Guidelines:
- Level 1 (1_intuition): Give only a conceptual nudge or real-world analogy. DO NOT mention specific data structures or code.
- Level 2 (2_data_structure): Suggest which data structure or algorithmic technique applies, and why naive approaches fall short.
- Level 3 (3_pseudocode): Provide high-level pseudo-code or step-by-step logic, but DO NOT write full working solution code.`;

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: promptText
                        }
                    }
                ]
            };
        }
    );

    // 3. Code Review Prompt
    server.prompt(
        "code_review",
        "Reviews a candidate solution for a LeetCode problem, evaluating correctness, time/space complexity, edge cases, and code style.",
        {
            titleSlug: z
                .string()
                .describe("Problem URL slug (e.g., 'two-sum')"),
            lang: z
                .string()
                .describe(
                    "Programming language (e.g., 'python3', 'cpp', 'java', 'typescript')"
                ),
            code: z.string().describe("Source code to review")
        },
        async ({ titleSlug, lang, code }) => {
            let problemData: any;
            try {
                problemData =
                    await leetcodeService.fetchProblemSimplified(titleSlug);
            } catch (err: any) {
                problemData = { titleSlug, error: err.message };
            }

            const promptText = `Please conduct a comprehensive code review of the following solution for LeetCode problem "${problemData.title || titleSlug}":

Problem Difficulty: ${problemData.difficulty || "Unknown"}
Problem Constraints & Description:
${problemData.content ? problemData.content.replace(/<[^>]+>/g, " ").slice(0, 1500) : "N/A"}

Submitted Code (${lang}):
\`\`\`${lang}
${code}
\`\`\`

Review Checklist:
1. **Correctness**: Will this pass all standard and edge cases? Identify any off-by-one or boundary bugs.
2. **Time Complexity**: Calculate Big-O runtime and compare against optimal LeetCode solutions.
3. **Space Complexity**: Calculate auxiliary memory and call-stack usage.
4. **Style & Readability**: Idiomatic patterns for ${lang}, naming conventions, and clarity.
5. **Optimization suggestions**: Concrete improvements if any sub-optimal loops/allocations exist.`;

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: promptText
                        }
                    }
                ]
            };
        }
    );

    // 4. Mock Interview Prompt
    server.prompt(
        "mock_interview",
        "Initiates an interactive coding interview where the AI acts as a senior technical interviewer guiding the candidate through the problem.",
        {
            titleSlug: z.string().describe("Problem URL slug (e.g., 'two-sum')")
        },
        async ({ titleSlug }) => {
            let problemData: any;
            try {
                problemData =
                    await leetcodeService.fetchProblemSimplified(titleSlug);
            } catch (err: any) {
                problemData = { titleSlug, error: err.message };
            }

            const promptText = `You are a Senior Staff Software Engineer conducting a technical coding interview.

Problem for candidate: "${problemData.title || titleSlug}" (${problemData.difficulty || "Unknown"})

Instructions for Interviewer:
1. Greet the candidate and present the problem statement clearly.
2. Ask the candidate to explain their thought process and ask clarifying questions before writing code.
3. If they propose a brute-force approach, acknowledge it and prompt them toward optimal complexity.
4. Evaluate time and space complexity trade-offs collaboratively.
5. Provide encouragement and simulate a realistic FAANG/top-tier interview environment.

Problem Metadata:
${JSON.stringify({ title: problemData.title, difficulty: problemData.difficulty, tags: problemData.topicTags }, null, 2)}`;

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: promptText
                        }
                    }
                ]
            };
        }
    );
}
