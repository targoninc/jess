import {signal} from "@targoninc/jess/dist/src";
import type {PageInfo} from "./pageInfo.ts";

export const pages = signal<PageInfo[]>([]);