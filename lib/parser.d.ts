export type Authorization = {
    scheme: string;
    [key: string]: string;
}

export type Payload = {
    content: string;
    type: string;
};

export type ParsedMessage = {
    body: string;
    header: Record<string, any>;
    method?: string;
    payload: Payload[]
    reason: string;
    status?: number;
    uri?: string;
    version: string;
};

export type URI = {
    family: 'ipv4' | 'ipv6';
    headers: Record<string, string>;
    host: string;
    params: Record<string, string>;
    password?: string;
    port?: number;
    user?: string;
    scheme: string;
};

declare function parseMessage(s: string, lazy: boolean): ParsedMessage;
declare function stringify(m: ParsedMessage): string;

export function stringifyUri(uri: string | URI): string;
export function parseUri(s: string | URI): URI | undefined;
export function getHeaderName(hdr: string): string;
export function stringifyAuthHeader(a: Authorization): string;
export function getParser(hdr: string): Function;
export function getStringifier(hdr: string): Function;
export { parseMessage as parseSipMessage, stringify as stringifySipMessage };
