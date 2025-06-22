import { ApiBase } from "./api.base";
import type {PageInfo} from "../pageInfo.ts";

export enum ApiEndpoint {
    PAGES = "/api/pages",
    PAGE_CONTENT = "/api/page-content",
}

export class Api extends ApiBase {
    static getPageContent(page: string) {
        return this.get<string>(ApiEndpoint.PAGE_CONTENT + `?page=${page}`);
    }

    static getPages() {
        return this.get<PageInfo[]>(ApiEndpoint.PAGES);
    }
}
