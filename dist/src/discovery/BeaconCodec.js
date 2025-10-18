export class BeaconCodec {
    static encode(beacon) {
        const json = JSON.stringify(beacon);
        return Buffer.from(json, 'utf8');
    }
    static decode(buffer) {
        try {
            const json = buffer.toString('utf8');
            const beacon = JSON.parse(json);
            if (!beacon.hostId || !beacon.addr || !beacon.proto || !beacon.supportedVersions) {
                return null;
            }
            return beacon;
        }
        catch {
            return null;
        }
    }
    static beaconToPeerInfo(beacon) {
        return {
            hostId: beacon.hostId,
            addr: beacon.addr,
            proto: beacon.proto,
            supportedVersions: beacon.supportedVersions,
            namespaces: beacon.namespaces,
            caps: beacon.caps,
            ttl: beacon.ttl
        };
    }
}
//# sourceMappingURL=BeaconCodec.js.map