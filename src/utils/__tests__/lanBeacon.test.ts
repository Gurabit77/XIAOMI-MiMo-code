import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { createHmac } from 'crypto'

// Fixed HMAC key for tests
const TEST_LAN_KEY = 'a'.repeat(64)

// Mock dgram before importing LanBeacon
const mockSocket = {
  on: mock(() => mockSocket),
  bind: mock((port: number, cb: () => void) => cb()),
  addMembership: mock(() => {}),
  setMulticastInterface: mock(() => {}),
  setMulticastTTL: mock(() => {}),
  setBroadcast: mock(() => {}),
  dropMembership: mock(() => {}),
  send: mock(() => {}),
  close: mock(() => {}),
}

mock.module('dgram', () => ({
  createSocket: () => mockSocket,
}))

const { LanBeacon, _setLanKeyForTesting } = await import('../lanBeacon.js')

// Set the HMAC key to our test value so signPayload/verifyPayload use it
_setLanKeyForTesting(TEST_LAN_KEY)

/** Sign a JSON payload with the test HMAC key (mirrors lanBeacon's signPayload). */
function signTestPayload(json: string): string {
  return createHmac('sha256', TEST_LAN_KEY).update(json).digest('hex')
}

/** Build a Buffer containing a signed announce packet. */
function buildSignedAnnounce(fields: Record<string, unknown>): Buffer {
  const json = JSON.stringify(fields)
  return Buffer.from(JSON.stringify({ ...fields, hmac: signTestPayload(json) }))
}

type MockCall = [string, ...unknown[]]

function getMessageHandler(): ((msg: Buffer, rinfo: { address: string; port: number }) => void) | undefined {
  const calls = mockSocket.on.mock.calls as unknown as MockCall[]
  const call = calls.find(c => c[0] === 'message')
  return call?.[1] as ((msg: Buffer, rinfo: { address: string; port: number }) => void) | undefined
}

describe('LanBeacon', () => {
  let beacon: InstanceType<typeof LanBeacon>

  const announceData = {
    pipeName: 'cli-test1234',
    machineId: 'machine-abc',
    hostname: 'test-host',
    ip: '192.168.1.10',
    tcpPort: 7100,
    role: 'main' as const,
  }

  beforeEach(() => {
    mockSocket.on.mockClear()
    mockSocket.bind.mockClear()
    mockSocket.send.mockClear()
    mockSocket.close.mockClear()
    mockSocket.addMembership.mockClear()
    mockSocket.dropMembership.mockClear()
    beacon = new LanBeacon(announceData)
  })

  afterEach(() => {
    beacon.stop()
  })

  test('start initializes socket and sends first announce', () => {
    beacon.start()
    expect(mockSocket.bind).toHaveBeenCalledTimes(1)
    expect(mockSocket.addMembership).toHaveBeenCalledWith(
      '224.0.71.67',
      '192.168.1.10',
    )
    expect(mockSocket.setMulticastTTL).toHaveBeenCalledWith(1)
    // First announce sent immediately
    expect(mockSocket.send).toHaveBeenCalled()
  })

  test('getPeers returns empty map initially', () => {
    beacon.start()
    expect(beacon.getPeers().size).toBe(0)
  })

  test('stop closes socket and clears peers', () => {
    beacon.start()
    beacon.stop()
    expect(mockSocket.close).toHaveBeenCalled()
  })

  test('processes incoming announce from different peer', () => {
    beacon.start()

    const messageHandler = getMessageHandler()
    if (!messageHandler) return

    const peerFields = {
      proto: 'claude-pipe-v1',
      pipeName: 'cli-peer5678',
      machineId: 'machine-xyz',
      hostname: 'peer-host',
      ip: '192.168.1.20',
      tcpPort: 7102,
      role: 'sub',
      ts: Date.now(),
    }

    let discoveredPeer: any = null
    beacon.on('peer-discovered', (peer: any) => {
      discoveredPeer = peer
    })

    messageHandler(buildSignedAnnounce(peerFields), {
      address: '192.168.1.20',
      port: 7101,
    })

    expect(beacon.getPeers().size).toBe(1)
    expect(beacon.getPeers().has('cli-peer5678')).toBe(true)
    expect(discoveredPeer).not.toBeNull()
    expect(discoveredPeer.pipeName).toBe('cli-peer5678')
  })

  test('ignores self-announces', () => {
    beacon.start()

    const messageHandler = getMessageHandler()
    if (!messageHandler) return

    const selfFields = {
      proto: 'claude-pipe-v1',
      pipeName: 'cli-test1234', // same as our pipeName
      machineId: 'machine-abc',
      hostname: 'test-host',
      ip: '192.168.1.10',
      tcpPort: 7100,
      role: 'main',
      ts: Date.now(),
    }

    messageHandler(buildSignedAnnounce(selfFields), {
      address: '192.168.1.10',
      port: 7101,
    })
    expect(beacon.getPeers().size).toBe(0)
  })

  test('ignores non-claude-pipe protocol messages', () => {
    beacon.start()

    const messageHandler = getMessageHandler()
    if (!messageHandler) return

    const foreignMessage = JSON.stringify({
      proto: 'something-else',
      pipeName: 'cli-foreign',
    })

    messageHandler(Buffer.from(foreignMessage), {
      address: '192.168.1.30',
      port: 7101,
    })
    expect(beacon.getPeers().size).toBe(0)
  })

  test('updateAnnounce changes role', () => {
    beacon.updateAnnounce({ role: 'sub' })
    beacon.start()
    // The send call should include the updated role
    const sendCalls = mockSocket.send.mock.calls as unknown as [Buffer, ...unknown[]][]
    const sendCall = sendCalls[0]
    if (sendCall) {
      const payload = JSON.parse(sendCall[0].toString())
      expect(payload.role).toBe('sub')
    }
  })
})
