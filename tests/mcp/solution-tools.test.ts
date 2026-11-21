import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeetCodeBaseService } from "../../src/leetcode/leetcode-base-service.js";
import { SolutionToolRegistry } from "../../src/mcp/tools/solution-tools.js";

async function createSolutionClient(mockService: Partial<LeetCodeBaseService>) {
    const service = {
        isCN: () => false,
        isAuthenticated: () => false,
        ...mockService
    } as unknown as LeetCodeBaseService;

    const server = new McpServer({
        name: "test-server",
        version: "1.0.0"
    });

    new SolutionToolRegistry(server, service).registerTools();

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

describe("SolutionToolRegistry", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("accepts 'MOST_RECENT' order without space and returns solutions", async () => {
        const fetchQuestionSolutionArticles = vi.fn().mockResolvedValue({
            totalNum: 1,
            hasNextPage: false,
            articles: [
                {
                    topicId: "123",
                    title: "Test Solution",
                    canSee: true
                }
            ]
        });

        const { client, close } = await createSolutionClient({
            fetchQuestionSolutionArticles
        });

        try {
            const result = await client.callTool({
                name: "list_problem_solutions",
                arguments: {
                    questionSlug: "two-sum",
                    orderBy: "MOST_RECENT"
                }
            });

            expect(result.isError).not.toBe(true);
            expect(fetchQuestionSolutionArticles).toHaveBeenCalledWith(
                "two-sum",
                expect.objectContaining({
                    orderBy: "MOST_RECENT"
                })
            );

            const content = result.content[0] as { type: "text"; text: string };
            const parsed = JSON.parse(content.text);
            expect(parsed.questionSlug).toBe("two-sum");
            expect(parsed.solutionArticles.articles[0].topicId).toBe("123");
        } finally {
            await close();
        }
    });

    it("returns isError: true when service throws an error", async () => {
        const fetchQuestionSolutionArticles = vi
            .fn()
            .mockRejectedValue(new Error("Network timeout"));

        const { client, close } = await createSolutionClient({
            fetchQuestionSolutionArticles
        });

        try {
            const result = await client.callTool({
                name: "list_problem_solutions",
                arguments: {
                    questionSlug: "two-sum"
                }
            });

            expect(result.isError).toBe(true);
            const content = result.content[0] as { type: "text"; text: string };
            const parsed = JSON.parse(content.text);
            expect(parsed.error).toBe("Failed to fetch solutions");
            expect(parsed.message).toBe("Network timeout");
        } finally {
            await close();
        }
    });
});
