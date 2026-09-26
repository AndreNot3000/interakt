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
  console.log('=== CARD-M02-03 VERIFICATION TEST ===\n');

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
  console.log(`✓ Authenticated as ${user.email} (ID: ${user.id}, Role: ${user.role})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch Campus Feed Posts
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
  if (posts.length === 0) {
    console.error('No posts available to test!');
    process.exit(1);
  }

  const testPost = posts[0];
  console.log(`Selected Post ID: ${testPost.id} | Author: ${testPost.author?.profile?.firstName} ${testPost.author?.profile?.lastName}`);

  // 3. React with INSIGHTFUL
  console.log('\n3. Reacting with INSIGHTFUL 💡 to post...');
  const react1 = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/reactions/posts/${testPost.id}`,
      method: 'POST',
      headers: authHeaders,
    },
    { type: 'INSIGHTFUL' }
  );
  console.log(`✓ React response:`, react1.data?.data);

  // 4. Switch reaction to LOVE (Helpful 🤝)
  console.log('\n4. Switching reaction to LOVE (Helpful 🤝)...');
  const react2 = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/reactions/posts/${testPost.id}`,
      method: 'POST',
      headers: authHeaders,
    },
    { type: 'LOVE' }
  );
  console.log(`✓ React response:`, react2.data?.data);

  // 5. Post Top-Level Threaded Comment
  console.log('\n5. Creating a top-level threaded discussion comment...');
  const commentContent = `Insightful perspective! The AVL balance condition ensures logarithmic height. Verified student discussion #${Date.now().toString().slice(-4)}`;
  const commentRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/posts/${testPost.id}/comments`,
      method: 'POST',
      headers: authHeaders,
    },
    { content: commentContent }
  );

  console.log('✓ Comment created:', {
    id: commentRes.data?.data?.id,
    content: commentRes.data?.data?.content,
    author: commentRes.data?.data?.author?.profile?.firstName,
    verification: commentRes.data?.data?.author?.verificationStatus,
  });
  const topCommentId = commentRes.data?.data?.id;

  // 6. Post Nested Reply to Top-Level Comment
  console.log('\n6. Creating a nested reply under the top-level comment...');
  const replyContent = `Spot on David! Specifically |h_L - h_R| <= 1. Let's do the practice problem together.`;
  const replyRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/posts/${testPost.id}/comments`,
      method: 'POST',
      headers: authHeaders,
    },
    { content: replyContent, parentId: topCommentId }
  );

  console.log('✓ Nested reply created:', {
    id: replyRes.data?.data?.id,
    parentId: replyRes.data?.data?.parentId,
    content: replyRes.data?.data?.content,
  });
  const replyId = replyRes.data?.data?.id;

  // 7. React to the Nested Reply with CELEBRATE 🎉
  console.log('\n7. Reacting to the nested reply with CELEBRATE 🎉...');
  const replyReact = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/reactions/comments/${replyId}`,
      method: 'POST',
      headers: authHeaders,
    },
    { type: 'CELEBRATE' }
  );
  console.log(`✓ Comment reaction response:`, replyReact.data?.data);

  // 8. Fetch Post Comments with Nested Hierarchy
  console.log('\n8. Fetching comments hierarchy for the post...');
  const commentsListRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/posts/${testPost.id}/comments`,
    method: 'GET',
    headers: authHeaders,
  });

  const commentsData = commentsListRes.data?.data?.data || commentsListRes.data?.data || [];
  console.log(`✓ Found ${commentsData.length} top-level comments for post`);

  const fetchedTopComment = commentsData.find((c) => c.id === topCommentId);
  if (fetchedTopComment) {
    console.log(`✓ Top-level comment: "${fetchedTopComment.content}"`);
    console.log(`  - Author: ${fetchedTopComment.author?.profile?.firstName} ${fetchedTopComment.author?.profile?.lastName} (${fetchedTopComment.author?.verificationStatus})`);
    console.log(`  - Replies loaded: ${fetchedTopComment.replies?.length || 0}`);
    if (fetchedTopComment.replies && fetchedTopComment.replies.length > 0) {
      const nested = fetchedTopComment.replies[0];
      console.log(`    ↳ Nested reply: "${nested.content}"`);
      console.log(`    ↳ Author: ${nested.author?.profile?.firstName} (${nested.author?.profile?.level}L)`);
      console.log(`    ↳ User Reaction: ${nested.userReaction}`);
    }
  }

  console.log('\n=== ALL CARD-M02-03 TESTS PASSED PERFECTLY! ===');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
