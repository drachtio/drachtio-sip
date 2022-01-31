import { ParsedMessage, URI } from "./parser";
export = SipMessage;

declare class SipMessage {
    constructor(msg: string | ParsedMessage);
    headers: Record<string, string>;
    raw: string;
    get type(): "request" | "response";
    get calledNumber(): string;
    get callingNumber(): string;
    get callingName(): string;
    get canFormDialog(): boolean;
    set(hdr: string | ParsedMessage, value: string): SipMessage;
    get(hdr: string): string;
    has(hdr: string): boolean;
    getParsedHeader(hdr: string): Record<string, any>;
    toString(): string;
    static parseUri(s: string | URI): URI | undefined;
}
