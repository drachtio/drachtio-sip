export = SipMessage;

declare class SipMessage {
    constructor(msg: string | object);
    headers: Record<string, string>;
    raw: string;
    get type(): "request" | "response";
    get calledNumber(): string;
    get callingNumber(): string;
    get callingName(): string;
    get canFormDialog(): boolean;
    set(hdr: string | object, value: string): SipMessage;
    get(hdr: string): string;
    has(hdr: string): boolean;
    getParsedHeader(hdr: string): any;
    toString(): string;
    static parseUri(s:string): any;
}
