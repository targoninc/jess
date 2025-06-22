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

async function getChildren(folders: string[]) {
    const children = [];
    for (const folder of folders) {
        children.push(...await getPages(folder))
    }
    return children;
}

export async function getPages(dir: string = filesDir): Promise<PageInfo[]> {
    const files = await fs.promises.readdir(dir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    const folders = files.filter(file => !file.includes(".")).map(f => path.join(dir, f));

    const pages: PageInfo[] = [];

    for (const file of markdownFiles) {
        const filePath = path.join(dir, file);
        const content = await Bun.file(filePath).text();
        const title = getTitleFromMarkdown(content);

        const relativePath = path.relative(filesDir, filePath);

        pages.push({
            title,
            filename: relativePath,
            children: file === "index.md" ? await getChildren(folders) : []
        });
    }

    return pages;
}

export async function getPageContent(filename: string): Promise<string> {
    if (filename.includes("..")) {
        return "# Page Not Found\n\nThe requested page could not be found.";
    }

    const targetFile = path.join(filesDir, filename);
    if (await Bun.file(targetFile).exists()) {
        return await Bun.file(targetFile).text();
    }

    return "# Page Not Found\n\nThe requested page could not be found.";
}
