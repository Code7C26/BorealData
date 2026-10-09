import dns from "node:dns";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSafeAnalyzeUrl } from "./validateUrl.js";

/**
 * La defensa de SSRF de POST /analyze.
 *
 * Es el test más importante del backend y el que menos se puede verificar a ojo: si esto
 * se rompe, la app sigue funcionando igual para cualquier usuario normal y al mismo tiempo
 * cualquiera puede hacer que el servidor consulte su propia red interna (el endpoint de
 * metadata de GCP en 169.254.169.254, entre otras cosas). No hay síntoma visible.
 *
 * Los casos de IP literal y de protocolo no tocan la red. Los de resolución de dominio
 * mockean `dns.promises.lookup`, así que el test no depende de internet ni del DNS del
 * que lo corre.
 */
afterEach(() => {
  vi.restoreAllMocks();
});

/** Hace que cualquier resolución de dominio devuelva estas IPs. */
function mockDns(...ips: string[]) {
  vi.spyOn(dns.promises, "lookup").mockResolvedValue(
    ips.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })) as never
  );
}

describe("assertSafeAnalyzeUrl — formato y protocolo", () => {
  it("rechaza lo que no es una URL", async () => {
    expect((await assertSafeAnalyzeUrl("pegá acá la nota")).safe).toBe(false);
    expect((await assertSafeAnalyzeUrl("")).safe).toBe(false);
  });

  it("rechaza protocolos que no son http/https", async () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://ejemplo.com/x",
      "gopher://ejemplo.com",
      "data:text/html,<script>alert(1)</script>",
      "javascript:alert(1)",
    ]) {
      const r = await assertSafeAnalyzeUrl(url);
      expect(r.safe, url).toBe(false);
    }
  });
});

describe("assertSafeAnalyzeUrl — direcciones internas por IP literal", () => {
  it("rechaza loopback, redes privadas, link-local y CGNAT", async () => {
    const internas = [
      "http://127.0.0.1/",
      "http://127.1.2.3/",
      "http://10.0.0.1/",
      "http://172.16.0.1/",
      "http://172.31.255.254/",
      "http://192.168.1.1/",
      "http://0.0.0.0/",
      "http://100.64.0.1/",
      // El endpoint de metadata de la nube: el objetivo clásico de un SSRF.
      "http://169.254.169.254/computeMetadata/v1/",
    ];
    for (const url of internas) {
      const r = await assertSafeAnalyzeUrl(url);
      expect(r.safe, url).toBe(false);
    }
  });

  it("rechaza localhost por nombre", async () => {
    expect((await assertSafeAnalyzeUrl("http://localhost:4000/")).safe).toBe(false);
    expect((await assertSafeAnalyzeUrl("http://LOCALHOST/")).safe).toBe(false);
  });

  it("acepta una IP pública literal", async () => {
    expect((await assertSafeAnalyzeUrl("https://8.8.8.8/")).safe).toBe(true);
    expect((await assertSafeAnalyzeUrl("http://172.32.0.1/")).safe).toBe(true);
    expect((await assertSafeAnalyzeUrl("http://100.63.255.255/")).safe).toBe(true);
  });

  /**
   * Los corchetes del host IPv6 se sacan antes de mirar la IP. El DNS va mockeado a una
   * IP pública justamente para probar que el rechazo sale del chequeo de IP literal y no
   * de que "[::1]" no resuelva: sin sacar los corchetes, estos casos pasaban igual, pero
   * de rebote.
   */
  it("rechaza IPv6 interna por la IP, no porque el host no resuelva", async () => {
    mockDns("151.101.1.140");
    expect((await assertSafeAnalyzeUrl("http://[::1]/")).safe).toBe(false);
    expect((await assertSafeAnalyzeUrl("http://[fe80::1]/")).safe).toBe(false);
    expect((await assertSafeAnalyzeUrl("http://[fd00::1]/")).safe).toBe(false);
  });

  /**
   * La API de URL normaliza `[::ffff:127.0.0.1]` a `::ffff:7f00:1`, en hexadecimal. El
   * chequeo de IPv4 mapeada solo entendía la forma con puntos, así que esta URL pasaba
   * como pública y el scraper terminaba pegándole al loopback del propio servidor. Las
   * dos notaciones se prueban porque un cliente puede mandar cualquiera de las dos.
   */
  it("rechaza IPv4 mapeada en IPv6, en notación con puntos y en hexadecimal", async () => {
    mockDns("151.101.1.140");
    expect((await assertSafeAnalyzeUrl("http://[::ffff:127.0.0.1]/")).safe).toBe(false);
    expect((await assertSafeAnalyzeUrl("http://[::ffff:7f00:1]/")).safe).toBe(false);
    expect((await assertSafeAnalyzeUrl("http://[::ffff:10.0.0.1]/")).safe).toBe(false);
    expect((await assertSafeAnalyzeUrl("http://[::ffff:a9fe:a9fe]/")).safe).toBe(false); // 169.254.169.254
    expect((await assertSafeAnalyzeUrl("http://[::ffff:c0a8:1]/")).safe).toBe(false); // 192.168.0.1
  });

  it("una IPv4 pública mapeada en IPv6 sigue siendo pública", async () => {
    expect((await assertSafeAnalyzeUrl("http://[::ffff:8.8.8.8]/")).safe).toBe(true);
  });

  it("acepta IPv6 pública", async () => {
    expect((await assertSafeAnalyzeUrl("http://[2606:4700:4700::1111]/")).safe).toBe(true);
  });
});

describe("assertSafeAnalyzeUrl — resolución de dominio", () => {
  it("acepta un dominio que resuelve a una IP pública", async () => {
    mockDns("151.101.1.140");
    expect((await assertSafeAnalyzeUrl("https://diario.com/nota/1")).safe).toBe(true);
  });

  it("rechaza DNS rebinding: dominio público que resuelve a una IP interna", async () => {
    mockDns("127.0.0.1");
    const r = await assertSafeAnalyzeUrl("https://parece-normal.com/nota");
    expect(r.safe).toBe(false);
    expect(r.reason).toMatch(/privada|interna/i);
  });

  it("rechaza si CUALQUIERA de las IPs es interna, no solo la primera", async () => {
    mockDns("151.101.1.140", "10.0.0.5");
    expect((await assertSafeAnalyzeUrl("https://parece-normal.com/")).safe).toBe(false);
  });

  it("rechaza si el dominio no resuelve", async () => {
    vi.spyOn(dns.promises, "lookup").mockRejectedValue(new Error("ENOTFOUND"));
    expect((await assertSafeAnalyzeUrl("https://no-existe-este-dominio.com/")).safe).toBe(false);
  });

  it("rechaza si la resolución devuelve una lista vacía", async () => {
    mockDns();
    expect((await assertSafeAnalyzeUrl("https://raro.com/")).safe).toBe(false);
  });
});
