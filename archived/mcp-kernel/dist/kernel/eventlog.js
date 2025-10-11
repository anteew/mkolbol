export class EventLog {
    seq = 0;
    rows = [];
    append(type, aggregate_id, payload) {
        const row = { seq: ++this.seq, type, aggregate_id, payload, created_at: Date.now() };
        this.rows.push(row);
        return row;
    }
    readAll() {
        return [...this.rows];
    }
}
//# sourceMappingURL=eventlog.js.map