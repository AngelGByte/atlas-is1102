'use strict';

const { createHmac } = require('node:crypto');

class PostgresRateLimitStore {
  constructor(pool, secret) {
    this.pool = pool;
    this.secret = secret;
    this.windowMs = 0;
    this.operations = 0;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async increment(key) {
    const hashedKey = this.hashKey(key);
    const result = await this.pool.query(
      `INSERT INTO login_rate_limits (rate_key, total_hits, reset_at)
       VALUES ($1, 1, statement_timestamp() + ($2 * INTERVAL '1 millisecond'))
       ON CONFLICT (rate_key) DO UPDATE SET
         total_hits = CASE
           WHEN login_rate_limits.reset_at <= statement_timestamp() THEN 1
           ELSE login_rate_limits.total_hits + 1
         END,
         reset_at = CASE
           WHEN login_rate_limits.reset_at <= statement_timestamp() THEN EXCLUDED.reset_at
           ELSE login_rate_limits.reset_at
         END
       RETURNING total_hits, reset_at`,
      [hashedKey, this.windowMs]
    );

    this.operations += 1;
    if (this.operations % 256 === 0) {
      await this.pool.query(
        'DELETE FROM login_rate_limits WHERE reset_at <= statement_timestamp()'
      );
    }

    const totalHits = Number(result.rows[0].total_hits);
    if (!Number.isSafeInteger(totalHits)) {
      throw new RangeError('El contador de intentos de login excedió el rango seguro.');
    }
    return { totalHits, resetTime: result.rows[0].reset_at };
  }

  async decrement(key) {
    await this.pool.query(
      `UPDATE login_rate_limits
       SET total_hits = GREATEST(total_hits - 1, 0)
       WHERE rate_key = $1 AND reset_at > statement_timestamp()`,
      [this.hashKey(key)]
    );
  }

  async resetKey(key) {
    await this.pool.query(
      'DELETE FROM login_rate_limits WHERE rate_key = $1',
      [this.hashKey(key)]
    );
  }

  async resetAll() {
    await this.pool.query('DELETE FROM login_rate_limits');
  }

  hashKey(key) {
    return createHmac('sha256', this.secret).update(String(key)).digest('hex');
  }
}

module.exports = { PostgresRateLimitStore };
