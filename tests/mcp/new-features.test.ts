import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeetCodeBaseService } from "../../src/leetcode/leetcode-base-service.js";
import { registerLeetCodePrompts } from "../../src/mcp/prompts/leetcode-prompts.js";
import { ContestToolRegistry } from "../../src/mcp/tools/contest-tools.js";
import { ProblemToolRegistry } from "../../src/mcp/tools/problem-tools.js";

async function createTestHarness(mockService: Partial<LeetCodeBaseService>) {
    const service = {
        isCN: () => false,
        isAuthenticated: () => false,
        ...mockService
    } as unknown as LeetCodeBaseService;

    const server = new McpServer({
        name: "test-server",
        version: "1.0.0"
    });

    new ContestToolRegistry(server, service).registerTools();
    new ProblemToolRegistry(server, service).registerTools();
    registerLeetCodePrompts(server, service);

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    });

    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    return {
        client,
        close: async () => {
            await client.close();
            await server.close();
        }
    };
}

describe("New LeetCode MCP Tools and Prompts", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("retrieves upcoming contests correctly", async () => {
        const fetchUpcomingContests = vi.fn().mockResolvedValue([
            {
                title: "Weekly Contest 450",
                titleSlug: "weekly-contest-450",
                startTime: 1750000000,
                startTimeISO: "2025-06-15T02:30:00.000Z",
                durationSeconds: 5400,
                durationMinutes: 90,
                contestUrl: "https://leetcode.com/contest/weekly-contest-450"
            }
        ]);

        const { client, close } = await createTestHarness({
            fetchUpcomingContests
        });

        try {
            const result = await client.callTool({
                name: "get_upcoming_contests",
                arguments: {}
            });

            expect(result.isError).not.toBe(true);
            const content = result.content[0] as { type: "text"; text: string };
            const parsed = JSON.parse(content.text);
            expect(parsed.count).toBe(1);
            expect(parsed.upcomingContests[0].title).toBe("Weekly Contest 450");
        } finally {
            await close();
        }
    });

    it("retrieves language-specific code snippet", async () => {
        const fetchProblemSimplified = vi.fn().mockResolvedValue({
            title: "Two Sum",
            questionId: "1",
            codeSnippets: [
                {
                    lang: "Python3",
                    langSlug: "python3",
                    code: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass"
                },
                {
                    lang: "C++",
                    langSlug: "cpp",
                    code: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n    }\n};"
                }
            ]
        });

        const { client, close } = await createTestHarness({
            fetchProblemSimplified
        });

        try {
            const result = await client.callTool({
                name: "get_code_snippet",
                arguments: {
                    titleSlug: "two-sum",
                    lang: "python3"
                }
            });

            expect(result.isError).not.toBe(true);
            const content = result.content[0] as { type: "text"; text: string };
            const parsed = JSON.parse(content.text);
            expect(parsed.langSlug).toBe("python3");
            expect(parsed.code).toContain("def twoSum");
        } finally {
            await close();
        }
    });

    it("returns a random problem from search results", async () => {
        const searchProblems = vi.fn().mockResolvedValue({
            total: 2,
            questions: [
                { title: "Two Sum", titleSlug: "two-sum", difficulty: "Easy" },
                { title: "3Sum", titleSlug: "3sum", difficulty: "Medium" }
            ]
        });

        const { client, close } = await createTestHarness({
            searchProblems
        });

        try {
            const result = await client.callTool({
                name: "get_random_problem",
                arguments: {
                    difficulty: "EASY"
                }
            });

            expect(result.isError).not.toBe(true);
            const content = result.content[0] as { type: "text"; text: string };
            const parsed = JSON.parse(content.text);
            expect(parsed.selectedProblem).toBeDefined();
            expect(["two-sum", "3sum"]).toContain(
                parsed.selectedProblem.titleSlug
            );
        } finally {
            await close();
        }
    });

    it("registers and executes explain_problem prompt", async () => {
        const fetchProblemSimplified = vi.fn().mockResolvedValue({
            title: "Two Sum",
            difficulty: "Easy",
            content: "Given an array of integers nums and an integer target...",
            topicTags: [{ slug: "array" }]
        });

        const { client, close } = await createTestHarness({
            fetchProblemSimplified
        });

        try {
            const promptResult = await client.getPrompt({
                name: "explain_problem",
                arguments: {
                    titleSlug: "two-sum"
                }
            });

            expect(promptResult.messages).toBeDefined();
            expect(promptResult.messages.length).toBeGreaterThan(0);
            const text = (promptResult.messages[0].content as any).text;
            expect(text).toContain("Two Sum");
            expect(text).toContain("Explain the underlying intuition");
        } finally {
            await close();
        }
    });
});
