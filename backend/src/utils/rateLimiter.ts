interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Rate limiter en memoria, de ventana fija por clave (ej. uid de Firebase). Vive en
 * memoria del proceso: el conteo se resetea si el server reinicia y no se comparte
 * entre instancias — aceptable mientras el backend corra en un solo proceso (MVP);
 * si en el futuro corre en varias instancias, esto tiene que migrar a un store
 * compartido (Redis).
 *
 * Barre entradas vencidas cada `windowMs` para no crecer sin límite en memoria a
 * medida que pasan usuarios distintos.
 */
export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {
    setInterval(() => this.cleanup(), windowMs).unref();
  }

  /** Intenta consumir una unidad de cupo para `key`. No consume nada si ya no queda cupo. */
  consume(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count < this.limit) {
      bucket.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const retryAfterSeconds = Math.ceil((bucket.windowStart + this.windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}
