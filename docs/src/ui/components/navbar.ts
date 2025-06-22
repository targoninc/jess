import {create, InputType, signal} from "@targoninc/jess";
import {input} from "@targoninc/jess-components";
import {search} from "../state.js";

export function navbar() {
    return create("div")
        .classes("navbar")
        .children(
            input({
                name: "search",
                value: search,
                type: InputType.text,
                placeholder: "Search",
            })
        ).build();
}