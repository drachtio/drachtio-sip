var debug = require('debug')('drachtio-sip') ;

exports = module.exports = {
  parseSipMessage: parseMessage,
  stringifySipMessage: stringify,
  parseUri: parseUri,
  getParser: function(hdr) {
    return parsers[hdr] || parseGenericHeader ;
  },
  getStringifier: function(hdr) {
    return stringifiers[hdr]; 
  },
  getHeaderName: getHeaderName
} ;

var headerNames = {
  'call-id': 'Call-ID',
  'content-length': 'Content-Length'
} ;

var customHeaderNames = [
  'Diversion'
] ;

function getHeaderName(hdr) {
  if( 0 === hdr.indexOf('X-') || -1 !== customHeaderNames.indexOf(hdr) ) return hdr ;
  var name = unescape(hdr).toLowerCase();
  return compactForm[name] || name;
}

function parseResponse(rs, m) {
  var r = rs.match(/^SIP\/(\d+\.\d+)\s+(\d+)\s*(.*)\s*$/);

  if(r) {
    m.version = r[1];
    m.status = +r[2];
    m.reason = r[3];

    return m;
  }  
}

function parseRequest(rq, m) {
  var r = rq.match(/^([\w\-.!%*_+`'~]+)\s([^\s]+)\sSIP\s*\/\s*(\d+\.\d+)/);

  if(r) {
    m.method = unescape(r[1]);
    m.uri = r[2];
    m.version = r[3];

    return m;
  }
}

function applyRegex(regex, data) {
  regex.lastIndex = data.i;
  var r = regex.exec(data.s);

  if(r && (r.index === data.i)) {
    data.i = regex.lastIndex;
    return r;
  }
}

function parseParams(data, hdr) {
  hdr.params = hdr.params || {};

  var re = /\s*;\s*([\w\-.!%*_+`'~]+)(?:\s*=\s*([\w\-.!%*_+`'~]+|"[^"\\]*(\\.[^"\\]*)*"))?/g; 
  
  for(var r = applyRegex(re, data); r; r = applyRegex(re, data)) {
    hdr.params[r[1].toLowerCase()] = r[2];
  }

  return hdr;
}

function parseMultiHeader(parser, d, h) {
  h = h || [];

  var re = /\s*,\s*/g;
  do {
    h.push(parser(d));
  } while(d.i < d.s.length && applyRegex(re, d));

  return h;
}

function parseGenericHeader(d, h) {
  return h ? h + ',' + d.s : d.s;
}

function parseAOR(data) {
  var r = applyRegex(/((?:[\w\-.!%*_+`'~]+)(?:\s+[\w\-.!%*_+`'~]+)*|"[^"\\]*(?:\\.[^"\\]*)*")?\s*\<\s*([^>]*)\s*\>|((?:[^\s@"<]@)?[^\s;]+)/g, data);
  return parseParams(data, {name: r[1], uri: r[2] || r[3] || ''});
}

function parseAorWithUri(data) {
  var r = parseAOR(data);
  r.uri = parseUri(r.uri);
  return r;
}

function parseVia(data) {
  var r = applyRegex(/SIP\s*\/\s*(\d+\.\d+)\s*\/\s*([\S]+)\s+([^\s;:]+)(?:\s*:\s*(\d+))?/g, data);
  return parseParams(data, {version: r[1], protocol: r[2], host: r[3], port: r[4] && +r[4]});
}

function parseCSeq(d) {
  var r = /(\d+)\s*([\S]+)/.exec(d.s);
  return { seq: +r[1], method: unescape(r[2]) };
}

function parseAuthHeader(d) {
  var r1 = applyRegex(/([^\s]*)\s+/g, d);
  var a = {scheme: r1[1]};

  var r2 = applyRegex(/([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d);
  a[r2[1]]=r2[2];

  while(r2 = applyRegex(/,\s*([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d)) {
    a[r2[1]]=r2[2];
  }

  return a;
}

function parseAuthenticationInfoHeader(d) {
  var a = {};
  var r = applyRegex(/([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d);
  a[r[1]]=r[2];

  while(r = applyRegex(/,\s*([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d)) {
    a[r[1]]=r[2];
  }
  return a;
}

var compactForm = {
  i: 'call-id',
  m: 'contact',
  e: 'contact-encoding',
  l: 'content-length',
  c: 'content-type',
  f: 'from',
  s: 'subject',
  k: 'supported',
  t: 'to',
  v: 'via'
};

var parsers = {
  'to': parseAOR,
  'from': parseAOR,
  'contact': function(v, h) {
    if(v == '*')
      return v;
    else
      return parseMultiHeader(parseAOR, v, h);
  },
  'route': parseMultiHeader.bind(0, parseAorWithUri),
  'record-route': parseMultiHeader.bind(0, parseAorWithUri),
  'path': parseMultiHeader.bind(0, parseAorWithUri),
  'cseq': parseCSeq,
  'content-length': function(v) { return +v.s; },
  'via': parseMultiHeader.bind(0, parseVia),
  'www-authenticate': parseMultiHeader.bind(0, parseAuthHeader),
  'proxy-authenticate': parseMultiHeader.bind(0, parseAuthHeader),
  'authorization': parseMultiHeader.bind(0, parseAuthHeader),
  'proxy-authorization': parseMultiHeader.bind(0, parseAuthHeader),
  'authentication-info': parseAuthenticationInfoHeader,
  'refer-to': parseAOR
};

function headerParse(parser, obj,hdr) {
  return parser(obj, hdr) ;
} 

function parse(data, lazy) {
  data = data.split(/\r\n(?![ \t])/);

  if(data[0] === '')
    return;

  var m = {};

  if(!(parseResponse(data[0], m) || parseRequest(data[0], m)))
    return;

  m.headers = {};

  for(var i = 1; i < data.length; ++i) {
    var r = data[i].match(/^([\S]*?)\s*:\s*([\s\S]*)$/);
    if(!r) {
      return;
    }

    var name = getHeaderName( r[1] ) ;
    var fnParse = parsers[name] || parseGenericHeader ;
    
    if( lazy === true ) {
      var v = '' ;
      if( name in m.headers ) {
        v += m.headers[name] ;
        v +=',' ;
      }
      v += r[2] ;
      m.headers[name] = v ;
    }
    else {
      m.headers[name] = fnParse({s:r[2], i:0}, m.headers[name]) ;
    }
  }

  return m;
}

function parseUri(s) {
  if(typeof s === 'object')
    return s;

  //var re = /^(sips?):(?:([^\s>:@]+)(?::([^\s@>]+))?@)?([\w\-\.]+)(?::(\d+))?((?:;[^\s=\?>;]+(?:=[^\s?\;]+)?)*)(?:\?(([^\s&=>]+=[^\s&=>]+)(&[^\s&=>]+=[^\s&=>]+)*))?$/;
  var re = /^(sips?):(?:([^\s>:@]+)(?::([^\s@>]+))?@)?(?:(|(?:\[.*\])|(?:[0-9A-Za-z]+\.)+[0-9A-Za-z]+)|(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::(\d+))?((?:;[^\s=\?>;]+(?:=[^\s?\;]+)?)*)(?:\?(([^\s&=>]+=[^\s&=>]+)(&[^\s&=>]+=[^\s&=>]+)*))?$/;

  var r = re.exec(s);

  if(r) {
    return {
      family: /\[.*\]/.test( r[4] ) ? 'ipv6' : 'ipv4',
      schema: r[1],
      user: r[2],
      password: r[3],
      host: r[4],
      port: +r[5],
      params: (r[6].match(/([^;=]+)(=([^;=]+))?/g) || [])
        .map(function(s) { return s.split('='); })
        .reduce(function(params, x) { params[x[0]]=x[1] || null; return params;}, {}),
      headers: ((r[7] || '').match(/[^&=]+=[^&=]+/g) || [])
        .map(function(s){ return s.split('='); })
        .reduce(function(params, x) { params[x[0]]=x[1]; return params; }, {})
    } ;
  }
}

function stringifyVersion(v) {
  return v || '2.0';
}

function stringifyParams(params) {
  var s = '';
  for(var n in params) {
      s += ';'+n+(params[n]?'='+params[n]:'');
  }

  return s;
}

function stringifyUri(uri) {
  if(typeof uri === 'string')
    return uri;

  var s = (uri.schema || 'sip') + ':';

  if(uri.user) {
    if(uri.password)
      s += uri.user + ':' + uri.password + '@';
    else
      s += uri.user + '@';
  }

  s += uri.host;

  if(uri.port)
    s += ':' + uri.port;

  if(uri.params)
    s += stringifyParams(uri.params);

  if(uri.headers) {
    var h = Object.keys(uri.headers).map(function(x){return x+'='+uri.headers[x];}).join('&');
    if(h.length)
      s += '?' + h; 
  }
  return s;
}

function stringifyAOR(aor) {
  return (aor.name || '') + ' <' + stringifyUri(aor.uri) + '>'+stringifyParams(aor.params); 
}

function stringifyAuthHeader(a) {
  var s = [];

  for(var n in a) {
    if(n !== 'scheme' && a[n] !== undefined) {
      s.push(n + '=' + a[n]);
    }
  }

  return a.scheme ? a.scheme + ' ' + s.join(',') : s.join(',');
}

exports.stringifyAuthHeader = stringifyAuthHeader;

var stringifiers = {
  via: function(h) {
    return h.map(function(via) {
      return 'Via: SIP/'+stringifyVersion(via.version)+'/'+via.protocol.toUpperCase()+' '+via.host+(via.port?':'+via.port:'')+stringifyParams(via.params)+'\r\n';
    }).join('');
  },
  to: function(h) {
    return 'To: '+stringifyAOR(h) + '\r\n';
   },
  from: function(h) {
    return 'From: '+stringifyAOR(h)+'\r\n';
  },
  contact: function(h) { 
    return 'Contact: '+ ((h !== '*' && h.length) ? h.map(stringifyAOR).join(', ') : '*') + '\r\n';
  },
  route: function(h) {
    return h.length ? 'Route: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
  },
  'record-route': function(h) {
    return h.length ? 'Record-Route: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
  },
  'path': function(h) { 
    return h.length ? 'Path: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
  },
  cseq: function(cseq) { 
    return 'CSeq: '+cseq.seq+' '+cseq.method+'\r\n';
  },
  'www-authenticate': function(h) { 
    return h.map(function(x) { return 'WWW-Authenticate: '+stringifyAuthHeader(x)+'\r\n'; }).join('');
  },
  'proxy-authenticate': function(h) { 
    return h.map(function(x) { return 'Proxy-Authenticate: '+stringifyAuthHeader(x)+'\r\n'; }).join('');
  },
  'authorization': function(h) {
    return h.map(function(x) { return 'Authorization: ' + stringifyAuthHeader(x) + '\r\n'; }).join('');
  },
  'proxy-authorization': function(h) {
    return h.map(function(x) { return 'Proxy-Authorization: ' + stringifyAuthHeader(x) + '\r\n'; }).join('');
  },
  'authentication-info': function(h) {
    return 'Authentication-Info: ' + stringifyAuthHeader(h) + '\r\n';
  },
  'refer-to': function(h) { return 'Refer-To: ' + stringifyAOR(h) + '\r\n'; }
};

function stringify(m) {
  var s;
  if(m.status) {
    s = 'SIP/' + stringifyVersion(m.version) + ' ' + m.status + ' ' + m.reason + '\r\n';
  }
  else {
    s = m.method + ' ' + stringifyUri(m.uri) + ' SIP/' + stringifyVersion(m.version) + '\r\n';
  }

  m.headers['content-length'] = (m.body || '').length;

  for(var n in m.headers) {
    if(typeof m.headers[n] === 'string' || !stringifiers[n]) 
      s += (headerNames[n] || n) + ': ' + m.headers[n] + '\r\n';
    else
      s += stringifiers[n](m.headers[n].parsed, n);
  }
  
  s += '\r\n';

  if(m.body)
    s += m.body;

  return s;
}


function parseMessage(s, lazy) {
  var r = s.toString('ascii').split('\r\n\r\n');
  if(r) {
    var m = parse(r[0], lazy);
    if(m) {
      if(m.headers['content-length']) {
        var c = Math.max(0, Math.min(m.headers['content-length'], r[1].length));
        m.body = r[1].substring(0, c);
      }
      else {
        m.body = r[1];
      }
      
      return m;
    }
  }
}

