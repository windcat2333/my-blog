export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const db = env.blog_db;
    const path = url.pathname;

    if (path === '/api/comments') {
      if (request.method === 'GET') {
        const slug = url.searchParams.get('slug');
        if (!slug) return json({ error: 'slug required' }, 400);
        const { results } = await db.prepare(
          'SELECT id, author, content, created_at FROM comments WHERE slug = ? ORDER BY created_at ASC'
        ).bind(slug).all();
        return json(results);
      }
      if (request.method === 'POST') {
        const body = await request.json();
        const { slug, author, content } = body;
        if (!slug || !author || !content) return json({ error: 'slug, author, content required' }, 400);
        if (author.length > 50) return json({ error: 'author too long' }, 400);
        if (content.length > 5000) return json({ error: 'content too long' }, 400);
        const { results } = await db.prepare(
          "INSERT INTO comments (slug, author, content) VALUES (?, ?, ?) RETURNING id, author, content, created_at"
        ).bind(slug, author, content).all();
        return json(results[0], 201);
      }
    }

    if (path === '/api/views') {
      const slug = url.searchParams.get('slug');
      if (!slug) return json({ error: 'slug required' }, 400);
      if (request.method === 'POST') {
        await db.prepare(
          'INSERT INTO views (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1'
        ).bind(slug).run();
      }
      const { results } = await db.prepare('SELECT count FROM views WHERE slug = ?').bind(slug).all();
      const count = results.length > 0 ? results[0].count : 0;
      return json({ slug, count });
    }

    return new Response('Not found', { status: 404 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
