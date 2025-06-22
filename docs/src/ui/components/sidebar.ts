import type {PageInfo} from "../pageInfo.ts";
import {create} from "@targoninc/jess";
import {sidebarLink} from "./sidebar-link.ts";

export function sidebar(pages: PageInfo[]) {
    return create("div")
        .children(
            ...pages.map(page => sidebarLink(page))
        ).build();
}
