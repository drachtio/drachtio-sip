var debug = require('debug')('drachtio:sip') ;
var merge = require('merge') ;
var only = require('only') ;
var assert = require('assert');
var parser = require('./parser') ;

exports = module.exports = SipMessage ;

function SipMessage(msg) {
  if (!(this instanceof SipMessage)) return new SipMessage(msg);

 var self = this ;

  this.headers = {} ;
  
  Object.defineProperty( this, 'type', {
    get: function() {
      if( this.method ) return 'request' ;
      else if( this.status ) return 'response' ;
    }
  }) ;
  Object.defineProperty( this, 'calledNumber', {
    get: function() {
      var user = this.uri.match(/sip:(.*?)@/) ;
      if( user && user.length > 1 ) {
        return user[1].split(';')[0] ;
      }
      return '' ;      
    }
  }) ;
  Object.defineProperty( this, 'callingNumber', {
    get: function() {
      var callingNumber ;
      var header = this.has('p-asserted-identity') ? this.get('p-asserted-identity') : this.get('from') ;
      var user  = header.match(/sip:(.*?)@/) ;
      if( user && user.length > 1 ) { 
        return user[1].split(';')[0] ;
      }
      return '' ;   
    }
  }) ;

  Object.defineProperty( this, 'canFormDialog', {
    get: function() {
      return ('INVITE' === this.method || 'SUBSCRIBE' === this.method) && !this.get('to').tag ;
    }
  }) ;

  if( msg ) {
    if( msg instanceof SipMessage ) {
      merge( this, msg ) ;
    }
    else if( typeof msg === 'object' ) {
      merge( this, only( msg, 'body method version headers status reason uri') ) ;
    }
    else {
      var sm = parser.parseSipMessage( msg, true ) ;
      merge( this, only( sm, 'body method version headers status reason uri')) ;
      this.raw = msg ;
    }
   }
}

SipMessage.parseUri = parser.parseUri ;

/* 
  get and set headers
*/
SipMessage.prototype.set = function( hdr, value ) {
  var self = this ;

  var hdrs = {} ;
  if( typeof hdr === 'string') hdrs[hdr] = value ;
  else merge( hdrs, hdr ) ;

  Object.keys(hdrs).forEach(function(key) {
    var name = parser.getHeaderName( key ) ;
    var newValue = hdrs[key] ;
    var v = '' ;
    if( name in self.headers ) {
      v += self.headers[name] ;
      v += ',' ;
    }
    v += newValue ;
    self.headers[name]= v;
  });

  return this ;
} ;

SipMessage.prototype.get = function( hdr ) {
  if( this.has( hdr ) ) { return this.headers[parser.getHeaderName( hdr )] ; }
} ;

SipMessage.prototype.getParsedHeader = function( hdr ) {
  var name = parser.getHeaderName( hdr ) ;
  var v =  this.headers[name] ;
  var fn = parser.getParser( hdr.toLowerCase() ) ;
  return fn( {s:v, i:0} ) ;
} ;

SipMessage.prototype.has = function( hdr ) {
  var name = parser.getHeaderName( hdr ) ;
  return name in this.headers ;
} ;

SipMessage.prototype.toString = function() {
  return parser.stringifySipMessage(this) ;
} ;

