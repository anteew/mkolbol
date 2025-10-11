type EventRow = {
    seq: number;
    type: string;
    aggregate_id: string;
    payload: any;
    created_at: number;
};
export declare class EventLog {
    private seq;
    private rows;
    append(type: string, aggregate_id: string, payload: any): EventRow;
    readAll(): EventRow[];
}
export {};
//# sourceMappingURL=eventlog.d.ts.map