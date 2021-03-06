
var sodium = require('chloridedown/build/Release/sodium')
var crypto = require('crypto')
var seed = crypto.randomBytes(32)
var JSONB = require('json-buffer')

var isArray = Array.isArray

function parse (ary) {
  return ary.map(function (e, i) {
    if(i) return new Buffer(e, 'base64')
    if(Array.isArray(e)) return parse(e)
    else return e
  })
}

function apply (ary) {
  var name = ary[0]
  var fn = name === 'assert' ? assert.deepEqual : sodium['crypto_'+name]
  if(!fn) throw new Error('method: crypto_'+name+' does not exist')

  try {
  return fn.apply(null, ary.slice(1).map(function (e) {
    return isArray(e) ? apply(e) : e
  }))
  } catch (err) {
    console.error('Error while running', ary)
    throw err
  }
}

function toCurve25519(keys) {
  return {
    publicKey: sodium.crypto_sign_ed25519_pk_to_curve25519(keys.publicKey),
    secretKey: sodium.crypto_sign_ed25519_sk_to_curve25519(keys.secretKey)
  }
}

var _alice = sodium.crypto_hash_sha256(new Buffer('alice'))
var _bob = sodium.crypto_hash_sha256(new Buffer('bob'))
var alice = sodium.crypto_sign_seed_keypair(_alice)
var bob = sodium.crypto_sign_seed_keypair(_bob)

var key = sodium.crypto_hash_sha256(new Buffer('key'))
var key2 = sodium.crypto_hash_sha256(new Buffer('NOT_KEY'))

var alice_curve = toCurve25519(alice)
var bob_curve = toCurve25519(bob)

var nonce = new Buffer(24)
nonce.fill(0)

var msgs = [
  'trust but verify',
// - russian proverb adopted by Ronald Regan

  'Military tactics are like unto water; '
+ 'for water in its natural course runs '
+ 'away from high places and hastens downwards. '
+ 'So in war, the way is to avoid what is strong '
+ 'and to strike at what is weak. ',
// - Sun Tzu, The Art of War

  'The last characteristic which we note in the history '
+ 'of cryptography is the division between amateur and '
+ 'professional cryptographers. Skill in production '
+ 'cryptanalysis has always been heavily on the side '
+ 'of the professionals, but innovation, particularly '
+ 'in the design of new types of cryptographic systems, '
+ 'has come primarily from the amateurs.'
// - Witfield Diffie, New Directions in Cryptography
].map(function (e) { return new Buffer(e) })

var funs = [
"crypto_auth","crypto_auth_verify","crypto_box_beforenm","crypto_box_detached","crypto_box_easy","crypto_box_easy_afternm",
"crypto_box_keypair","crypto_box_open_detached","crypto_box_open_easy","crypto_box_open_easy_afternm","crypto_box_seal",
"crypto_box_seal_open","crypto_box_seed_keypair","crypto_generichash","crypto_generichash_final","crypto_generichash_init",
"crypto_generichash_update","crypto_hash","crypto_onetimeauth","crypto_onetimeauth_final","crypto_onetimeauth_init",
"crypto_onetimeauth_update","crypto_onetimeauth_verify","crypto_pwhash_scryptsalsa208sha256","crypto_pwhash_scryptsalsa208sha256_ll",
"crypto_pwhash_scryptsalsa208sha256_str","crypto_pwhash_scryptsalsa208sha256_str_verify","crypto_scalarmult","crypto_scalarmult_base",
"crypto_secretbox_detached","crypto_secretbox_easy","crypto_secretbox_open_detached","crypto_secretbox_open_easy","crypto_shorthash",
"crypto_sign","crypto_sign_detached","crypto_sign_ed25519_pk_to_curve25519","crypto_sign_ed25519_sk_to_curve25519","crypto_sign_keypair",
"crypto_sign_open","crypto_sign_seed_keypair","crypto_sign_verify_detached"
]

var input = [
  ['sign_seed_keypair', _alice],
  ['sign_seed_keypair', _bob],

  ['sign_detached', msgs[0], bob.secretKey],
  ['sign_detached', msgs[1], bob.secretKey],
  ['sign_detached', msgs[2], bob.secretKey],

  ['sign', msgs[0], bob.secretKey],
  ['sign', msgs[1], bob.secretKey],
  ['sign', msgs[2], bob.secretKey],

  ['sign_open', sodium.crypto_sign(msgs[0], bob.secretKey), bob.publicKey],
  ['sign_open', sodium.crypto_sign(msgs[1], bob.secretKey), bob.publicKey],
  ['sign_open', sodium.crypto_sign(msgs[2], bob.secretKey), bob.publicKey],

  ['sign_verify_detached',
    sodium.crypto_sign_detached(msgs[0], bob.secretKey),
    msgs[0], bob.publicKey
  ],
  ['sign_verify_detached',
    sodium.crypto_sign_detached(msgs[1], bob.secretKey),
    msgs[1], bob.publicKey
  ],
  ['sign_verify_detached',
    sodium.crypto_sign_detached(msgs[2], bob.secretKey),
    msgs[2], bob.publicKey
  ],

  ['sign_ed25519_pk_to_curve25519', alice.publicKey],
  ['sign_ed25519_sk_to_curve25519', bob.secretKey],

  ['scalarmult',
    alice_curve.publicKey,
    bob_curve.secretKey
  ],
  //buffer, nonce, key
  ['secretbox_easy', msgs[0], nonce, key],
  ['secretbox_easy', msgs[1], nonce, key],
  ['secretbox_easy', msgs[2], nonce, key],

  ['secretbox_open_easy', sodium.crypto_secretbox_easy(msgs[0], nonce, key), nonce, key],
  ['secretbox_open_easy', sodium.crypto_secretbox_easy(msgs[1], nonce, key), nonce, key],
  ['secretbox_open_easy', sodium.crypto_secretbox_easy(msgs[2], nonce, key), nonce, key],

  //test failing to decrypt
  ['secretbox_open_easy', sodium.crypto_secretbox_easy(msgs[0], nonce, key), nonce, key2],
  ['secretbox_open_easy', sodium.crypto_secretbox_easy(msgs[1], nonce, key), nonce, key2],
  ['secretbox_open_easy', sodium.crypto_secretbox_easy(msgs[2], nonce, key), nonce, key2],

  //buffer, nonce, key

  ['box_easy', msgs[0], nonce, bob_curve.secretKey, alice_curve.publicKey],
  ['box_easy', msgs[1], nonce, bob_curve.secretKey, alice_curve.publicKey],
  ['box_easy', msgs[2], nonce, bob_curve.secretKey, alice_curve.publicKey],

  ['box_open_easy',
    sodium.crypto_box_easy(msgs[0], nonce, bob_curve.secretKey, alice_curve.publicKey),
    nonce, bob_curve.secretKey, alice_curve.publicKey],

  ['box_open_easy',
    sodium.crypto_box_easy(msgs[1], nonce, bob_curve.secretKey, alice_curve.publicKey),
    nonce, bob_curve.secretKey, alice_curve.publicKey],

  ['box_open_easy',
    sodium.crypto_box_easy(msgs[2], nonce, bob_curve.secretKey, alice_curve.publicKey),
    nonce, bob_curve.secretKey, alice_curve.publicKey],

  ['auth', msgs[0], key],
  ['auth', msgs[1], key],
  ['auth', msgs[2], key],

  ['auth_verify', sodium.crypto_auth(msgs[0], key), msgs[0], key],
  ['auth_verify', sodium.crypto_auth(msgs[1], key), msgs[1], key],
  ['auth_verify', sodium.crypto_auth(msgs[2], key), msgs[2], key],

  ['hash', msgs[0]],
  ['hash', msgs[1]],
  ['hash', msgs[2]],

  ['hash_sha256', msgs[0]],
  ['hash_sha256', msgs[1]],
  ['hash_sha256', msgs[2]]
 
//  ['scalarmult', bob_curve.publicKey, alice_curve.secretKey]
]

var output = input.map(function (e) {
  return ['deepEqual', e, apply(e)]
})



console.error(input)
console.log(JSON.stringify(JSONB.stringify(output, null, 2)))










