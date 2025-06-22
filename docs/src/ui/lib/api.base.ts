export class ApiBase {
    static baseUrl = window.location.origin;

    static async get<T>(url: string, sendCredentials = true) {
        const res = await fetch(ApiBase.baseUrl + url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: sendCredentials ? 'include' : 'omit'
        });
        return await this.basicResponseHandling<T>(res);
    }

    static async basicResponseHandling<T>(res: Response): Promise<T> {
        const text = await res.text();

        if (!res.ok) {
            throw new Error(text);
        }

        return JSON.parse(text) as T;
    }
}
