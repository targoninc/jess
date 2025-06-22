import {MIME_TYPES} from "./MIME_TYPES.ts";
import type {PageInfo} from "../ui/pageInfo.ts";
import fs from "fs";
import path from "path";

const filesDir = path.join(process.cwd(), "src/files");

export function getMimeType(filepath: string): string {
    const getFileExtension = (path: string): string =>
        path.split('.').pop()?.toLowerCase() || "";
    const extension = getFileExtension(filepath);
    return MIME_TYPES[extension] || "text/plain";
}

export function getTitleFromMarkdown(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? (titleMatch[1] ?? "Untitled") : "Untitled";
}

export async function getPages(): Promise<PageInfo[]> {
    const files = await fs.promises.readdir(filesDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    // For now, we have a simple structure with just the index file
    const pages: PageInfo[] = [];

    for (const file of markdownFiles) {
        const filePath = path.join(filesDir, file);
        const content = await Bun.file(filePath).text();
        const title = getTitleFromMarkdown(content);

        // Create a simple PageInfo structure
        pages.push({
            title,
            children: []
        });
    }

    return pages;
}

export async function getPageContent(pageName: string): Promise<string> {
    const files = await fs.promises.readdir(filesDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    for (const file of markdownFiles) {
        const filePath = path.join(filesDir, file);
        const content = await Bun.file(filePath).text();
        const title = getTitleFromMarkdown(content);

        // If the title matches the requested page, return the content
        if (title === pageName) {
            return content;
        }
    }

    // If no matching page is found, return a default message
    return "# Page Not Found\n\nThe requested page could not be found.";
};
