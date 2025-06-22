export interface PageInfo {
    title: string;
    filename: string;
    children: PageInfo[];
    tags?: string[];
}