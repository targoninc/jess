import type {PageInfo} from "../pageInfo.ts";
import {create} from "@targoninc/jess";
import {sidebarLink} from "./sidebar-link.ts";

export function sidebar(pages: PageInfo[]) {
    return create("div")
        .classes("sidebar", "flex-v", "no-gap")
        .children(
            ...pages.map(page => sidebarLink(page))
        ).build();
}
