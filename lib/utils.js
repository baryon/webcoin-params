'use strict'

const proto = require('bitcoin-protocol')
const struct = proto.struct
const defaultNetMessages = proto.messages.defaultMessages
const DefaultBlock = require('bitcoinjs-lib').Block
const inherits = require('inherits')
const assign = require('object-assign')

function createParams (params, assert) {
  assert = assert != null ? assert : true
  if (assert) {
    if (!params) {
      throw new Error('Must provide override params')
    }
    if (!params.blockchain) {
      throw new Error('Must provide blockchain params')
    }
    if (!params.blockchain.genesisHeader) {
      throw new Error('Must provide blockchain.genesisHeader')
    }
    if (!params.net) {
      throw new Error('Must provide net params')
    }
    if (params.net.magic == null) {
      throw new Error('Must provide net.magic')
    }
    if (!params.net.defaultPort) {
      throw new Error('Must provide net.defaultPort')
    }
  }

  if (!params.Block) {
    class Block extends DefaultBlock {
      constructor() {
        super();
      }
    }
    params.Block = Block

    if (params.structs && (params.structs.header || params.structs.transaction)) {
      const headerStruct = params.structs.header || proto.types.header
      const txStruct = params.structs.transaction || proto.types.transaction
      const txArrayStruct = struct.VarArray(proto.varint, txStruct)

      Block.prototype.toBuffer = function (headersOnly) {
        const header = headerStruct.encode(this)
        if (headersOnly || !this.transactions) return header
        const txs = txArrayStruct.encode(this.transactions)
        return Buffer.concat([header, txs])
      }

      Block.fromBuffer = function (buffer) {
        const block = new Block()
        const header = headerStruct.decode(buffer)
        assign(block, header)
        if (headerStruct.decode.bytes === buffer.length) return block
        block.transactions = txArrayStruct.decode(buffer, headerStruct.decode.bytes)
        return block
      }
    }
  }
  params.blockchain.Block = params.net.Block = params.Block

  function extend (child, assert) {
    const params = assign({}, extend, child)

    params.blockchain = assign({}, extend.blockchain, child.blockchain)

    params.net = assign({}, extend.net, {
      dnsSeeds: null,
      staticPeers: null,
      webSeeds: null
    }, child.net)
    const extendMessages = (extend.net && extend.net.messages) || defaultNetMessages
    params.net.messages = extendMessages(child.net.messages)

    params.structs = assign({}, extend.structs, child.structs)

    params.Block = null

    return createParams(params, assert)
  }
  return assign(extend, params)
}

module.exports = { createParams: createParams }
