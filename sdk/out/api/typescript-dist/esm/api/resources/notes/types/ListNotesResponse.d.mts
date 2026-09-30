export interface ListNotesResponse {
    data: ListNotesResponse.Data.Item[];
    /** Pass as cursor for the next page; absent on the last page */
    next_cursor?: string | undefined;
}
export declare namespace ListNotesResponse {
    type Data = Data.Item[];
    namespace Data {
        interface Item {
            id: number;
            body: string;
            created_at: string;
        }
    }
}
