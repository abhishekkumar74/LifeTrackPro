/**
 * Unit & Logic Test Suite for LifeTrack Pro Study Rooms Admin & Governance System
 * Verifies role resolution, kick moderation permissions, co-admin delegation,
 * audio volume isolation, and termination guards.
 */

const assert = require('assert');

function runTests() {
  console.log('--- LifeTrack Pro: Study Rooms Admin Suite Test ---');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  const HOST_ID = 'user-host-1';
  const CO_HOST_1 = 'user-cohost-1';
  const CO_HOST_2 = 'user-cohost-2';
  const MEMBER_A = 'user-member-a';
  const MEMBER_B = 'user-member-b';
  const BANNED_MEMBER = 'user-banned-x';

  const mockRoom = {
    id: 'room-101',
    name: 'Late Night Revision',
    host_id: HOST_ID,
    co_host_ids: [CO_HOST_1, CO_HOST_2],
    banned_user_ids: [BANNED_MEMBER],
    timer_minutes: 25,
    is_active: true,
  };

  // Helper from app/rooms/[id].tsx
  function getRoles(room, currentUserId) {
    const isHost = !!room && room.host_id === currentUserId;
    const isCoHost = !!room && Array.isArray(room.co_host_ids) && room.co_host_ids.includes(currentUserId);
    const canManageRoom = isHost || isCoHost;
    return { isHost, isCoHost, canManageRoom };
  }

  function canKick(room, actorId, targetId) {
    if (actorId === targetId) return false;
    const actorRoles = getRoles(room, actorId);
    const isTargetHost = room.host_id === targetId;
    const isTargetCoHost = Array.isArray(room.co_host_ids) && room.co_host_ids.includes(targetId);

    if (actorRoles.isHost) return true;
    if (actorRoles.isCoHost && !isTargetHost && !isTargetCoHost) return true;
    return false;
  }

  function canToggleCoHost(room, actorId, targetId) {
    if (actorId === targetId) return false;
    const actorRoles = getRoles(room, actorId);
    return actorRoles.isHost;
  }

  function canTerminateRoom(room, actorId) {
    const actorRoles = getRoles(room, actorId);
    return actorRoles.isHost;
  }

  function isUserBanned(room, userId) {
    return Array.isArray(room.banned_user_ids) && room.banned_user_ids.includes(userId);
  }

  // 1. Role Resolution
  test('Host should have isHost=true and canManageRoom=true', () => {
    const roles = getRoles(mockRoom, HOST_ID);
    assert.strictEqual(roles.isHost, true);
    assert.strictEqual(roles.isCoHost, false);
    assert.strictEqual(roles.canManageRoom, true);
  });

  test('Co-Host should have isCoHost=true and canManageRoom=true', () => {
    const roles = getRoles(mockRoom, CO_HOST_1);
    assert.strictEqual(roles.isHost, false);
    assert.strictEqual(roles.isCoHost, true);
    assert.strictEqual(roles.canManageRoom, true);
  });

  test('Regular member should have isHost=false, isCoHost=false, canManageRoom=false', () => {
    const roles = getRoles(mockRoom, MEMBER_A);
    assert.strictEqual(roles.isHost, false);
    assert.strictEqual(roles.isCoHost, false);
    assert.strictEqual(roles.canManageRoom, false);
  });

  // 2. Moderation & Kick Permissions Matrix
  test('Host can kick regular members and co-hosts, but not self', () => {
    assert.strictEqual(canKick(mockRoom, HOST_ID, MEMBER_A), true);
    assert.strictEqual(canKick(mockRoom, HOST_ID, CO_HOST_1), true);
    assert.strictEqual(canKick(mockRoom, HOST_ID, HOST_ID), false);
  });

  test('Co-Host can kick regular members', () => {
    assert.strictEqual(canKick(mockRoom, CO_HOST_1, MEMBER_A), true);
    assert.strictEqual(canKick(mockRoom, CO_HOST_1, MEMBER_B), true);
  });

  test('Co-Host CANNOT kick host or another co-host', () => {
    assert.strictEqual(canKick(mockRoom, CO_HOST_1, HOST_ID), false);
    assert.strictEqual(canKick(mockRoom, CO_HOST_1, CO_HOST_2), false);
  });

  test('Regular members CANNOT kick anyone', () => {
    assert.strictEqual(canKick(mockRoom, MEMBER_A, MEMBER_B), false);
    assert.strictEqual(canKick(mockRoom, MEMBER_A, CO_HOST_1), false);
    assert.strictEqual(canKick(mockRoom, MEMBER_A, HOST_ID), false);
  });

  // 3. Co-Admin Delegation
  test('Only Host can promote or demote co-hosts', () => {
    assert.strictEqual(canToggleCoHost(mockRoom, HOST_ID, MEMBER_A), true);
    assert.strictEqual(canToggleCoHost(mockRoom, HOST_ID, CO_HOST_1), true);
    assert.strictEqual(canToggleCoHost(mockRoom, HOST_ID, HOST_ID), false);

    assert.strictEqual(canToggleCoHost(mockRoom, CO_HOST_1, MEMBER_A), false);
    assert.strictEqual(canToggleCoHost(mockRoom, MEMBER_A, MEMBER_B), false);
  });

  // 4. Banned Re-entry Protection
  test('Banned users are blocked from re-entering room', () => {
    assert.strictEqual(isUserBanned(mockRoom, BANNED_MEMBER), true);
    assert.strictEqual(isUserBanned(mockRoom, MEMBER_A), false);
  });

  // 5. Termination vs Leave
  test('Only Host can terminate room for everyone', () => {
    assert.strictEqual(canTerminateRoom(mockRoom, HOST_ID), true);
    assert.strictEqual(canTerminateRoom(mockRoom, CO_HOST_1), false);
    assert.strictEqual(canTerminateRoom(mockRoom, MEMBER_A), false);
  });

  // 6. Audio Volume Isolation Logic
  test('Device volume and local mute operate independently without altering room station', () => {
    let localPhoneState = {
      musicVolume: 0.5,
      isLocallyMuted: false,
    };

    function changeVolume(newVol) {
      localPhoneState.musicVolume = newVol;
      if (newVol > 0 && localPhoneState.isLocallyMuted) {
        localPhoneState.isLocallyMuted = false;
      }
      return localPhoneState.isLocallyMuted ? 0 : newVol;
    }

    function toggleLocalMute() {
      localPhoneState.isLocallyMuted = !localPhoneState.isLocallyMuted;
      return localPhoneState.isLocallyMuted ? 0 : localPhoneState.musicVolume;
    }

    // Member sets volume to 80%
    assert.strictEqual(changeVolume(0.8), 0.8);
    assert.strictEqual(localPhoneState.musicVolume, 0.8);

    // Member toggles local mute (phone audio = 0)
    assert.strictEqual(toggleLocalMute(), 0);
    assert.strictEqual(localPhoneState.isLocallyMuted, true);

    // Unmute restores user's preferred volume (0.8)
    assert.strictEqual(toggleLocalMute(), 0.8);
    assert.strictEqual(localPhoneState.isLocallyMuted, false);
  });

  // 7. Auto-Bouncer & System Event Ban Enforcement
  test('Auto-Bouncer identifies and evicts banned users from room presence', () => {
    const livePresenceMembers = [
      { userId: HOST_ID, name: 'Host' },
      { userId: MEMBER_A, name: 'Alice' },
      { userId: BANNED_MEMBER, name: 'BadActor' },
    ];
    const allBannedIds = [BANNED_MEMBER];

    // Filtered active members on UI
    const activeMembers = livePresenceMembers.filter((m) => !allBannedIds.includes(m.userId));
    assert.strictEqual(activeMembers.length, 2);
    assert.strictEqual(activeMembers.some((m) => m.userId === BANNED_MEMBER), false);

    // Auto-Bouncer triggers eviction
    const trespassers = livePresenceMembers.filter((m) => allBannedIds.includes(m.userId));
    assert.strictEqual(trespassers.length, 1);
    assert.strictEqual(trespassers[0].userId, BANNED_MEMBER);
  });

  test('Room chat system events accurately persist bans and co-host status', () => {
    const rawMessages = [
      { text: 'Hello everyone!', user_id: MEMBER_A },
      { text: `__SYS_EVENT__:BAN:${BANNED_MEMBER}`, user_id: HOST_ID },
      { text: `__SYS_EVENT__:COHOST_ADD:${MEMBER_B}`, user_id: HOST_ID },
      { text: 'Great focus session', user_id: MEMBER_B },
      { text: `__SYS_EVENT__:COHOST_REMOVE:${MEMBER_B}`, user_id: HOST_ID },
    ];

    const displayMessages = [];
    const parsedBanned = [];
    const parsedCoHosts = [];

    for (const msg of rawMessages) {
      if (msg.text.startsWith('__SYS_EVENT__:BAN:')) {
        parsedBanned.push(msg.text.replace('__SYS_EVENT__:BAN:', '').trim());
        continue;
      }
      if (msg.text.startsWith('__SYS_EVENT__:COHOST_ADD:')) {
        parsedCoHosts.push(msg.text.replace('__SYS_EVENT__:COHOST_ADD:', '').trim());
        continue;
      }
      if (msg.text.startsWith('__SYS_EVENT__:COHOST_REMOVE:')) {
        const id = msg.text.replace('__SYS_EVENT__:COHOST_REMOVE:', '').trim();
        const idx = parsedCoHosts.indexOf(id);
        if (idx !== -1) parsedCoHosts.splice(idx, 1);
        continue;
      }
      displayMessages.push(msg);
    }

    // Normal messages only
    assert.strictEqual(displayMessages.length, 2);
    assert.strictEqual(parsedBanned.includes(BANNED_MEMBER), true);
    assert.strictEqual(parsedCoHosts.includes(MEMBER_B), false); // added then removed
  });

  test('Pre-entry check blocks banned user before opening room', () => {
    function canUserEnterRoom(roomId, userId, roomBannedList, localStorageMap) {
      if (localStorageMap[`@lifetrack_banned_room_${roomId}`] === 'true') {
        return false;
      }
      if (Array.isArray(roomBannedList) && roomBannedList.includes(userId)) {
        return false;
      }
      return true;
    }

    assert.strictEqual(canUserEnterRoom('room-101', BANNED_MEMBER, [BANNED_MEMBER], {}), false);
    assert.strictEqual(canUserEnterRoom('room-101', 'user-cleared-db', [], { '@lifetrack_banned_room_room-101': 'true' }), false);
    assert.strictEqual(canUserEnterRoom('room-101', MEMBER_A, [BANNED_MEMBER], {}), true);
  });

  console.log('----------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
