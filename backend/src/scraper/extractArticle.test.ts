import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import { bodyMatchesTitle, extractArticle } from "./extractArticle";

const parrafo = (s: string) => `<p>${s} ${"Texto de relleno para que el párrafo sea largo. ".repeat(3)}</p>`;

/** Estructura de La Nación: los <article> son tarjetas, el cuerpo está suelto en <main>. */
const LA_NACION = `<html><head><title>Paul Gallagher, canciller del Vaticano: “El papa Francisco va a ser el elefante en el cuarto” - LA NACION</title></head>
<body><main>
  <h1>Paul Gallagher, canciller del Vaticano</h1>
  ${parrafo("ROMA.- La entrevista con el arzobispo Paul Gallagher fue en el Palacio Apostólico.")}
  ${parrafo("Gallagher dijo que el papa Francisco va a ser el elefante en el cuarto durante la gira.")}
  ${parrafo("El canciller del Vaticano acompañará a León XIV en su viaje a América Latina.")}
  <section>
    <article><h2>Así ardió uno de los hoteles más antiguos hacia el Everest</h2></article>
    <article><h2>La oposición de Paraguay impulsa el juicio político contra Peña</h2></article>
    <article><h2>Una mujer murió tras caer desde el séptimo piso de un hotel en Brasil</h2></article>
  </section>
</main></body></html>`;

/** Sitio "normal": la nota está en un <article> y hay una barra lateral con más texto suelto. */
const CLASICO = `<html><head><title>Sube la inflación de octubre según el INDEC</title></head>
<body><main>
  <article>
    <h1>Sube la inflación de octubre</h1>
    ${parrafo("El INDEC informó que la inflación de octubre fue de 2,1%.")}
    ${parrafo("Los rubros que más subieron fueron alimentos y transporte.")}
    ${parrafo("Los analistas esperan una baja de la inflación para noviembre.")}
  </article>
  <div class="mas-leidas">${parrafo("Otra nota cualquiera de la portada.")}</div>
</main></body></html>`;

describe("extractArticle", () => {
  it("con <article> que son tarjetas, toma el cuerpo de <main> y no los titulares ajenos", () => {
    const { text } = extractArticle(cheerio.load(LA_NACION));
    expect(text).toContain("elefante en el cuarto");
    expect(text).toContain("Palacio Apostólico");
  });

  it("con la nota dentro de un <article>, se queda con ese <article> y no con la barra lateral", () => {
    const { text } = extractArticle(cheerio.load(CLASICO));
    expect(text).toContain("inflación de octubre fue de 2,1%");
    expect(text).not.toContain("Otra nota cualquiera");
  });

  it("si hay varios <article>, elige el que tiene el cuerpo", () => {
    const html = `<html><head><title>x</title></head><body>
      <article><h2>Tarjeta uno</h2><p>corto</p></article>
      <article>${parrafo("El cuerpo de la nota de verdad.")}${parrafo("Segundo párrafo.")}</article>
      <article><h2>Tarjeta dos</h2></article></body></html>`;
    const { text } = extractArticle(cheerio.load(html));
    expect(text).toContain("El cuerpo de la nota de verdad.");
    expect(text).not.toContain("Tarjeta uno");
  });

  it("sin párrafos largos mantiene el comportamiento anterior (todos los <article>)", () => {
    const html = `<html><body><article><h2>Uno</h2></article><article><h2>Dos</h2></article></body></html>`;
    expect(extractArticle(cheerio.load(html)).text).toBe("Uno\nDos");
  });
});

describe("bodyMatchesTitle", () => {
  const titulo =
    "Paul Gallagher, canciller del Vaticano: “El papa Francisco va a ser el elefante en el cuarto” durante la gira de León XIV - LA NACION";

  it("rechaza un cuerpo que no comparte ninguna palabra con el título (el caso real)", () => {
    const basura = [
      "Video: así ardió a 4410 metros y bajo la nieve uno de los hoteles más antiguos hacia el Everest",
      "La oposición de Paraguay impulsa el juicio político contra el presidente Santiago Peña tras el “corralito” bancario",
      "Una mujer de 26 años murió tras caer por una ventana desde el séptimo piso de un hotel en Brasil",
    ].join("\n");
    expect(bodyMatchesTitle(titulo, basura)).toBe(false);
  });

  it("acepta el cuerpo real, sin importar mayúsculas ni tildes", () => {
    expect(bodyMatchesTitle(titulo, "la entrevista con el arzobispo GALLAGHER en el vaticano")).toBe(true);
  });

  it("no juzga títulos con menos de 3 palabras con peso", () => {
    expect(bodyMatchesTitle("Último momento", "cualquier cosa")).toBe(true);
  });
});
