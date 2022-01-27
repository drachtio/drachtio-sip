declare function parseMessage(s: any, lazy: any): {
    headers: {};
};
declare function stringify(m: any): string;
export function stringifyUri(uri: any): string;
export function parseUri(s: any): any;
export function getHeaderName(hdr: any): any;
export function stringifyAuthHeader(a: any): string;
export declare function getParser(hdr: any): any;
export declare function getStringifier(hdr: any): any;
export { parseMessage as parseSipMessage, stringify as stringifySipMessage };
