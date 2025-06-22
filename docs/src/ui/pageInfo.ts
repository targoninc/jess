export interface PageInfo {
    title: string;
    children: PageInfo[];
    tags?: string[];
}