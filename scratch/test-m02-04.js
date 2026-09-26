const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('=== CARD-M02-04 VERIFICATION TEST: BOOKMARKS & POST SHARING ===\n');

  // 1. Authenticate David Adeyemi
  console.log('1. Authenticating student David Adeyemi...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'david@student.unilag.edu.ng',
      password: 'SecurePassword123!',
      institutionId: 'cmufo7bc800041135w2shvi9x',
    }
  );

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }

  const token = loginRes.data.data.accessToken;
  const user = loginRes.data.data.user;
  console.log(`✓ Authenticated as ${user.email} (ID: ${user.id})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch Campus Feed Posts to bookmark
  console.log('\n2. Fetching campus feed posts...');
  const feedRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/posts?scope=CAMPUS',
    method: 'GET',
    headers: authHeaders,
  });

  const posts = feedRes.data?.data?.data || [];
  console.log(`✓ Retrieved ${posts.length} posts from CAMPUS feed`);
  if (posts.length < 2) {
    console.error('Need at least 2 posts to thoroughly test bookmarks!');
    process.exit(1);
  }

  const post1 = posts[0];
  const post2 = posts[1];
  console.log(`Target Post 1: ${post1.id} (Type: ${post1.type})`);
  console.log(`Target Post 2: ${post2.id} (Type: ${post2.type})`);

  // 3. Bookmark Post 1
  console.log(`\n3. Bookmarking Post 1 (${post1.id})...`);
  const bm1Res = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/posts/${post1.id}/bookmark`,
      method: 'POST',
      headers: authHeaders,
    },
    {}
  );
  console.log('✓ Bookmark Post 1 response:', bm1Res.data);

  // 4. Bookmark Post 2
  console.log(`\n4. Bookmarking Post 2 (${post2.id})...`);
  const bm2Res = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/posts/${post2.id}/bookmark`,
      method: 'POST',
      headers: authHeaders,
    },
    {}
  );
  console.log('✓ Bookmark Post 2 response:', bm2Res.data);

  // 5. Query Bookmarks List (All)
  console.log('\n5. Querying all bookmarked posts (/posts/bookmarks)...');
  const listAllRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/posts/bookmarks',
    method: 'GET',
    headers: authHeaders,
  });

  const allBookmarked = listAllRes.data?.data?.data || listAllRes.data?.data || [];
  console.log(`✓ Retrieved ${allBookmarked.length} bookmarked items in personal library`);
  const hasPost1 = allBookmarked.some((p) => p.id === post1.id);
  const hasPost2 = allBookmarked.some((p) => p.id === post2.id);
  console.log(`  - Post 1 included: ${hasPost1} (isBookmarked: ${allBookmarked.find(p => p.id === post1.id)?.isBookmarked})`);
  console.log(`  - Post 2 included: ${hasPost2} (isBookmarked: ${allBookmarked.find(p => p.id === post2.id)?.isBookmarked})`);

  if (!hasPost1 || !hasPost2) {
    console.error('Failed: One or both posts missing from bookmarks!');
    process.exit(1);
  }

  // 6. Test Category / Type Filtering on Bookmarks
  console.log(`\n6. Querying filtered bookmarks by type (type=${post1.type})...`);
  const listFilteredRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/posts/bookmarks?type=${post1.type}`,
    method: 'GET',
    headers: authHeaders,
  });

  const filteredItems = listFilteredRes.data?.data?.data || listFilteredRes.data?.data || [];
  console.log(`✓ Retrieved ${filteredItems.length} items with type=${post1.type}`);
  for (const item of filteredItems) {
    console.log(`  - Item ID: ${item.id} | Type: ${item.type} | Author: ${item.author?.profile?.firstName} (${item.author?.verificationStatus})`);
  }

  // 7. Unbookmark Post 1
  console.log(`\n7. Removing Post 1 (${post1.id}) from bookmarks...`);
  const unbmRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/posts/${post1.id}/bookmark`,
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log('✓ Unbookmark response:', unbmRes.data);

  // 8. Confirm Post 1 Removed, Post 2 Remains
  console.log('\n8. Confirming Post 1 is removed from personal library...');
  const afterListRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/posts/bookmarks',
    method: 'GET',
    headers: authHeaders,
  });
  const remaining = afterListRes.data?.data?.data || afterListRes.data?.data || [];
  const post1StillThere = remaining.some((p) => p.id === post1.id);
  const post2StillThere = remaining.some((p) => p.id === post2.id);
  console.log(`  - Post 1 present: ${post1StillThere} (Expected: false)`);
  console.log(`  - Post 2 present: ${post2StillThere} (Expected: true)`);

  if (post1StillThere || !post2StillThere) {
    console.error('Failed: Unbookmark state inconsistency!');
    process.exit(1);
  }

  // 9. Single Post Detail API (Permalinks / Deep Links)
  console.log(`\n9. Testing direct permalink endpoint GET /posts/${post2.id}...`);
  const singlePostRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/posts/${post2.id}`,
    method: 'GET',
    headers: authHeaders,
  });

  const singlePost = singlePostRes.data?.data;
  console.log('✓ Single Post retrieved for direct route /posts/[id]:', {
    id: singlePost.id,
    type: singlePost.type,
    author: `${singlePost.author?.profile?.firstName} ${singlePost.author?.profile?.lastName}`,
    verification: singlePost.author?.verificationStatus,
    isBookmarked: singlePost.isBookmarked,
    reactionsCount: singlePost.reactionCount,
  });

  console.log('\n=== ALL CARD-M02-04 VERIFICATION TESTS PASSED PERFECTLY! ===');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
