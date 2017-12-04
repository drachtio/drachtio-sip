const merge = require('merge') ;
const only = require('only') ;
const parser = require('./parser') ;

exports = module.exports = SipMessage ;

function SipMessage(msg) {
  if (!(this instanceof SipMessage)) return new SipMessage(msg);

  this.headers = {} ;

  Object.defineProperty(this, 'type', {
    get: function() {
      if (this.method) return 'request' ;
      else if (this.status) return 'response' ;
    }
  }) ;
  Object.defineProperty(this, 'calledNumber', {
    get: function() {
      const user = this.uri.match(/sip:(.*?)@/) ;
      if (user && user.length > 1) {
        return user[1].split(';')[0] ;
      }
      return '' ;
    }
  }) ;
  Object.defineProperty(this, 'callingNumber', {
    get: function() {
      const header = this.has('p-asserted-identity') ? this.get('p-asserted-identity') : this.get('from') ;
      const user  = header.match(/sip:(.*?)@/) ;
      if (user && user.length > 1) {
        return user[1].split(';')[0] ;
      }
      return '' ;
    }
  }) ;

  Object.defineProperty(this, 'canFormDialog', {
    get: function() {
      return ('INVITE' === this.method || 'SUBSCRIBE' === this.method) && !this.get('to').tag ;
    }
  }) ;

  if (msg) {
    if (msg instanceof SipMessage) {
      merge(this, msg) ;
    }
    else if (typeof msg === 'object') {
      merge(this, only(msg, 'body method version headers status reason uri')) ;
    }
    else {
      const sm = parser.parseSipMessage(msg, true) ;
      merge(this, only(sm, 'body payload method version headers status reason uri')) ;
      this.raw = msg ;
    }
  }
}

SipMessage.parseUri = parser.parseUri ;

/* 
  get and set headers
*/
SipMessage.prototype.set = function(hdr, value) {
  const self = this ;

  const hdrs = {} ;
  if (typeof hdr === 'string') hdrs[hdr] = value ;
  else merge(hdrs, hdr) ;

  Object.keys(hdrs).forEach(function(key) {
    const name = parser.getHeaderName(key) ;
    const newValue = hdrs[key] ;
    let v = '' ;
    if (name in self.headers) {
      v += self.headers[name] ;
      v += ',' ;
    }
    v += newValue ;
    self.headers[name] = v;
  });

  return this ;
} ;

SipMessage.prototype.get = function(hdr) {
  if (this.has(hdr)) { return this.headers[parser.getHeaderName(hdr)] ; }
} ;

SipMessage.prototype.getParsedHeader = function(hdr) {
  const name = parser.getHeaderName(hdr) ;
  const v =  this.headers[name] ;
  const fn = parser.getParser(hdr.toLowerCase()) ;
  return fn({s:v, i:0}) ;
} ;

SipMessage.prototype.has = function(hdr) {
  const name = parser.getHeaderName(hdr) ;
  return name in this.headers ;
} ;

SipMessage.prototype.toString = function() {
  return parser.stringifySipMessage(this) ;
} ;

