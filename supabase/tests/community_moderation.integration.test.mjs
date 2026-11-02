import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const projectRef = 'nagrxownsslyeosuqzca';

assert.ok(url && new URL(url).hostname === `${projectRef}.supabase.co`,
  'Safety stop: this suite may run only against the dedicated homologation project.');
assert.ok(publishableKey, 'Missing Supabase publishable key.');
assert.ok(serviceKey, 'Missing SUPABASE_TEST_SERVICE_ROLE_KEY.');

const adminApi = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const publicApi = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const unique = randomUUID();
const password = `ZapTest!9${randomUUID()}aA`;
const adminEmail = `zap-moderation-admin+${unique}@example.com`;
const memberEmail = `zap-moderation-member+${unique}@example.com`;
let adminId;
let memberId;
let postId;

async function dataOrThrow(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function createDisposableUser(email) {
  const result = await adminApi.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'ZapLanche Automated Test' }
  });
  return (await dataOrThrow(result, 'Create disposable Auth user')).user.id;
}

async function signedInClient(email) {
  const result = await publicApi.auth.signInWithPassword({ email, password });
  const session = (await dataOrThrow(result, 'Sign in disposable Auth user')).session;
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });
}

test('authenticated community moderation lifecycle', async () => {
  try {
    adminId = await createDisposableUser(adminEmail);
    memberId = await createDisposableUser(memberEmail);

    // Auth signup trigger should provision the matching public profiles.
    let profiles = [];
    for (let attempt = 0; attempt < 15; attempt++) {
      const result = await adminApi.from('profiles')
        .select('id, role').in('id', [adminId, memberId]);
      if (!result.error && result.data?.length === 2) {
        profiles = result.data;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.equal(profiles.length, 2, 'Auth signup did not provision both profile rows.');

    // Promote only this newly-created disposable account, using the server-only key.
    await dataOrThrow(
      await adminApi.from('profiles').update({ role: 'admin' }).eq('id', adminId),
      'Promote disposable admin fixture'
    );

    const admin = await signedInClient(adminEmail);
    const member = await signedInClient(memberEmail);

    await dataOrThrow(await admin.rpc('admin_list_community_members'), 'Admin list members');
    await dataOrThrow(await admin.rpc('admin_list_community_posts'), 'Admin list posts');
    await dataOrThrow(await admin.rpc('admin_list_community_moderation_history'), 'Admin list history');

    const forbiddenRpc = await member.rpc('admin_list_community_members');
    assert.ok(forbiddenRpc.error, 'A non-admin unexpectedly called an admin RPC.');
    assert.match(forbiddenRpc.error.message, /administrador|Acesso restrito/i);

    const createdPost = await dataOrThrow(
      await member.from('posts').insert({
        author_profile_id: memberId,
        title: 'Automated moderation fixture',
        content: 'Disposable integration-test post',
        status: 'publicado',
        post_type: 'publicacao'
      }).select('id').single(),
      'Create disposable community post'
    );
    postId = createdPost.id;

    await dataOrThrow(await admin.rpc('admin_moderate_community_post', {
      p_post_id: postId,
      p_remove: true,
      p_reason: 'Automated integration test: hide'
    }), 'Hide test post');

    let post = await dataOrThrow(
      await adminApi.from('posts').select('status, moderation_original_status')
        .eq('id', postId).single(),
      'Verify hidden post'
    );
    assert.equal(post.status, 'removido_moderacao');
    assert.equal(post.moderation_original_status, 'publicado');

    await dataOrThrow(await admin.rpc('admin_moderate_community_post', {
      p_post_id: postId,
      p_remove: false,
      p_reason: 'Automated integration test: restore'
    }), 'Restore test post');

    post = await dataOrThrow(
      await adminApi.from('posts').select('status, moderation_original_status')
        .eq('id', postId).single(),
      'Verify restored post'
    );
    assert.equal(post.status, 'publicado');
    assert.equal(post.moderation_original_status, null);

    await dataOrThrow(await admin.rpc('admin_set_community_suspension', {
      p_profile_id: memberId,
      p_reason: 'Automated integration test suspension',
      p_suspended_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      p_suspend: true
    }), 'Suspend disposable member');

    const suspension = await dataOrThrow(
      await adminApi.from('profiles').select('is_suspended').eq('id', memberId).single(),
      'Verify member suspension'
    );
    assert.equal(suspension.is_suspended, true);

    const blockedPost = await member.from('posts').insert({
      author_profile_id: memberId,
      title: 'Must be blocked',
      content: 'Suspended account write attempt',
      status: 'publicado',
      post_type: 'publicacao'
    });
    assert.ok(blockedPost.error, 'Suspended member unexpectedly published a post.');

    const blockedComment = await member.from('comments').insert({
      post_id: postId,
      profile_id: memberId,
      author_name: 'Automated test',
      text: 'Must be blocked'
    });
    assert.ok(blockedComment.error, 'Suspended member unexpectedly commented.');

    const blockedLike = await member.from('post_likes').insert({
      post_id: postId,
      profile_id: memberId
    });
    assert.ok(blockedLike.error, 'Suspended member unexpectedly liked a post.');

    const readable = await member.from('posts').select('id').eq('id', postId);
    assert.ifError(readable.error);

    await dataOrThrow(await admin.rpc('admin_set_community_suspension', {
      p_profile_id: memberId,
      p_reason: 'Automated integration test reinstatement',
      p_suspended_until: null,
      p_suspend: false
    }), 'Reinstate disposable member');

    const reinstated = await dataOrThrow(
      await adminApi.from('profiles')
        .select('is_suspended, suspension_reason, suspended_until')
        .eq('id', memberId).single(),
      'Verify member reinstatement'
    );
    assert.equal(reinstated.is_suspended, false);
    assert.equal(reinstated.suspension_reason, null);
    assert.equal(reinstated.suspended_until, null);
  } finally {
    // Best-effort cleanup always targets only IDs created in this test run.
    if (postId) await adminApi.from('posts').delete().eq('id', postId);
    if (memberId) await adminApi.auth.admin.deleteUser(memberId);
    if (adminId) await adminApi.auth.admin.deleteUser(adminId);
  }
});
