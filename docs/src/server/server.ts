import {file, serve} from "bun";
import {baseHtml} from "./baseHtml.ts";
import {config} from "dotenv";
import * as path from "path";
import {getMimeType, getPageContent, getPages} from "./utils.ts";
config();

console.log(process.cwd());

const outDir = path.join(process.cwd(), "out");
const uiDir = path.join(process.cwd(), "src/ui");

const server = serve({
    port: parseInt(process.env.PORT || "3000"),
    async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        if (pathname === "/api/pages") {
            try {
                const pages = await getPages();
                return new Response(JSON.stringify(pages), { 
                    headers: { "Content-Type": "application/json" } 
                });
            } catch (error) {
                console.error("Error loading pages:", error);
                return new Response(JSON.stringify([]), { 
                    headers: { "Content-Type": "application/json" },
                    status: 500
                });
            }
        }

        if (pathname === "/api/page-content") {
            try {
                const page = url.searchParams.get("page");

                if (!page) {
                    return new Response(JSON.stringify("# Welcome to Jess\n\nA framework only as complex as needed."), { 
                        headers: { "Content-Type": "application/json" } 
                    });
                }

                const content = await getPageContent(page);

                return new Response(JSON.stringify(content), { 
                    headers: { "Content-Type": "application/json" } 
                });
            } catch (error) {
                console.error("Error loading page content:", error);
                return new Response(JSON.stringify("# Error\n\nAn error occurred while loading the page content."), { 
                    headers: { "Content-Type": "application/json" },
                    status: 500
                });
            }
        }

        const staticFiles = [outDir, uiDir];
        for (const dir of staticFiles) {
            const staticFilePath = path.join(dir, pathname.slice(1)); // Remove leading "/"

            if (await file(staticFilePath).exists()) {
                const mimeType = getMimeType(staticFilePath);

                return new Response(await file(staticFilePath).arrayBuffer(), {
                    headers: { "Content-Type": mimeType },
                });
            }
        }

        // Handle dynamic routes (fallback to baseHtml render)
        try {
            const html = await baseHtml(req);
            return new Response(html, { headers: { "Content-Type": "text/html" } });
        } catch (error) {
            console.error("Error rendering HTML:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    },
});

console.log(`Server is running on http://localhost:${server.port}`);
