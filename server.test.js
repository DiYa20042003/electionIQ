/**
 * ElectIQ — Backend Test Suite
 */

const request = require('supertest');
const app = require('./server');

describe('ElectIQ API', () => {

  // ===== HEALTH CHECK =====
  describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('ElectIQ');
    });
  });

  // ===== INPUT VALIDATION =====
  describe('POST /api/chat - validation', () => {
    it('rejects missing messages', async () => {
      const res = await request(app).post('/api/chat').send({});
      expect(res.status).toBe(400);
    });

    it('rejects non-array messages', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: 'hello' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid roles', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'system', content: 'hack' }] });
      expect(res.status).toBe(400);
    });

    it('rejects empty content', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: '   ' }] });
      expect(res.status).toBe(400);
    });

    it('rejects when last message is not from user', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there' }
          ]
        });
      expect(res.status).toBe(400);
    });

    it('rejects oversized messages', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ messages: [{ role: 'user', content: 'x'.repeat(5000) }] });
      expect(res.status).toBe(400);
    });
  });

  // ===== SECURITY HEADERS =====
  describe('Security Headers', () => {
    it('sets X-Content-Type-Options', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets X-Frame-Options', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });

  // ===== SPA FALLBACK =====
  describe('SPA Routing', () => {
    it('serves index.html for unknown routes', async () => {
      const res = await request(app).get('/some-unknown-route');
      expect(res.status).toBe(200);
      expect(res.type).toMatch(/html/);
    });
  });

});
