type EventRow = { seq: number; type: string; aggregate_id: string; payload: any; created_at: number };

export class EventLog {
  private seq = 0;
  private rows: EventRow[] = [];
  append(type: string, aggregate_id: string, payload: any) {
    const row: EventRow = { seq: ++this.seq, type, aggregate_id, payload, created_at: Date.now() };
    this.rows.push(row);
    return row;
  }
  readAll() {
    return [...this.rows];
  }
}
