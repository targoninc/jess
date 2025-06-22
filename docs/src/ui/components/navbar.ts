import {create, InputType, signal} from "@targoninc/jess/dist/src";
import {input} from "@targoninc/jess-components";

export function navbar() {
    const search = signal("");

    return create("div")
        .classes("navbar")
        .children(
            input({
                name: "search",
                value: search,
                type: InputType.text
            })
        ).build();
}