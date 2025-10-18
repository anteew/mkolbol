# Filesystem Server (v1)

Purpose: provide simple FS operations over a JSONL request/response stream so any module/process can read/write/list without direct FS access.

Capabilities
- accepts: `fs/request`
- produces: `fs/response`
- features: `jsonl`

Requests (JSONL)
```json
{ "id": "1", "op": "mkdirp", "path": "tmp/demo" }
{ "id": "2", "op": "writeFile", "path": "tmp/demo/hello.txt", "dataBase64": "aGVsbG8=" }
{ "id": "3", "op": "stat", "path": "tmp/demo/hello.txt" }
{ "id": "4", "op": "readFile", "path": "tmp/demo/hello.txt" }
```

Responses (JSONL)
```json
{ "id": "3", "ok": true, "stat": { "isFile": true, "size": 11, "mtimeMs": 173 ... } }
{ "id": "4", "ok": true, "dataBase64": "aGVsbG8gd29ybGQ=" }
```

Streaming
- `readStream` streams chunks as `{ id, ok: true, chunkBase64 }` and terminates with `{ id, ok: true, done: true }`.

Demo
```bash
node dist/examples/servers/fs-server-demo.js
```

