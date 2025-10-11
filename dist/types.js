export function buildServerIdentity(parts) {
    const { fqdn, servername, classHex, owner, auth, authMechanism, uuid } = parts;
    return `${fqdn}:${servername}:${classHex}:${owner}:${auth}:${authMechanism}:${uuid}`;
}
//# sourceMappingURL=types.js.map