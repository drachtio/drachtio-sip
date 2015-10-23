var assert = require('assert');
var should = require('should');
var examples = require('sip-message-examples') ;
var SipMessage = require('..').SipMessage ;
var parser = require('..').parser ;
var debug = require('debug')('drachtio-sip') ;

describe('Parser', function(){
  it('should provide headers as string values', function(){
    var msg = new SipMessage(examples('invite')) ;
    (typeof msg.get('from')).should.eql('string') ;
  }) ;
  it('should optionally provide a parsed header', function(){
    var msg = new SipMessage(examples('invite')) ;
    var obj = msg.getParsedHeader('from') ;
    obj.should.be.type('object'); 
    obj.should.have.property('uri') ;
  }) ;

  it('getting a header should return the same value provided to set', function(){
    var msg = new SipMessage() ;
    msg.set('From', '<sip:daveh@localhost>;tag=1234') ;
    msg.get('From').should.eql('<sip:daveh@localhost>;tag=1234') ;
  }) ;
  it('setting a header should be case insensitive', function(){
    var msg = new SipMessage() ;
    msg.set('from', '<sip:daveh@localhost>;tag=1234') ;
    msg.get('From').should.eql('<sip:daveh@localhost>;tag=1234') ;
  }) ;
  it('getting a header should be case insensitive', function(){
    var msg = new SipMessage() ;
    msg.set('From', '<sip:daveh@localhost>;tag=1234') ;
    msg.get('from').should.eql('<sip:daveh@localhost>;tag=1234') ;
  }) ;
  it('should parse multiple headers into an array', function(){
    var msg = new SipMessage(examples('invite')) ;
    var via = msg.getParsedHeader('via') ;
    via.should.be.an.array ;
    via.should.have.length(2) ;
  }) ;
  it('should coalesce multiple calls to set', function(){
    var msg = new SipMessage() ;
    msg.set('via','SIP/2.0/UDP 10.1.10.101;branch=z9hG4bKac619477600') ;
    msg.set('via','SIP/2.0/UDP 10.1.10.103;branch=z9hG4bKac619477603') ;
    var via = msg.getParsedHeader('via') ;
    via.should.be.an.array ;
    via.should.have.length(2) ;
    parser.getStringifier('via')( [via[1]] ).should.eql('Via: SIP/2.0/UDP 10.1.10.103;branch=z9hG4bKac619477603\r\n') ;
  }) ;
  it('should set multiple headers at once', function(){
    var msg = new SipMessage() ;
    msg.set({
      to: '<sip:5753606@10.1.10.1>',
      i: '619455480112200022407@10.1.10.101'
    }) ;
    msg.get('call-id').should.eql('619455480112200022407@10.1.10.101') ;
    msg.get('to').should.eql('<sip:5753606@10.1.10.1>') ;
  })
  it('should parse an invite request', function(){

    var msg = new SipMessage(examples('invite')) ;
    (msg.getParsedHeader('from').uri === null).should.be.false ;
    msg.type.should.eql('request') ;
    (msg.body === null).should.be.false ;
    msg.canFormDialog.should.be.true ;
  }) ;
  it('should parse compact headers', function(){

    var msg = new SipMessage(examples('invite-compact')) ;
    msg.getParsedHeader('from').should.be.an.object ;
    msg.getParsedHeader('to').should.be.an.object ;
    msg.getParsedHeader('via').should.be.an.array ;
  }) ;
  it('should parse a response', function(){

    var msg = new SipMessage(examples('200ok')) ;
    msg.type.should.eql('response') ;
    (msg.body === null).should.be.false ;
  }) ;
  it('should parse called number', function(){
    var msg = new SipMessage(examples('invite')) ;
    msg.calledNumber.should.eql('5753606') ;
  }) ;
  it('should parse calling number', function(){
    var msg = new SipMessage(examples('invite')) ;
    msg.callingNumber.should.eql('4083084809') ;
  }) ;
  
}) ;

