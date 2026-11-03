/**
 * Host half of dsh-animation-enhance.
 *
 * The enhancer is intentionally renderer-only: it owns no host service, RPC,
 * or persisted state, so the host entry stays an empty plugin. Its `./client`
 * export installs the motion layer into the Web client.
 */
export function apply() {}
