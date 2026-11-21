import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Avviso } from "../../src/components/atoms/Avviso";
import { Distintivo } from "../../src/components/atoms/Distintivo";
import { Casella } from "../../src/components/atoms/Casella";
import { CampoEtichettato } from "../../src/components/molecules/CampoEtichettato";
import { IndicatorePassi } from "../../src/components/molecules/IndicatorePassi";
import { Statistiche } from "../../src/components/molecules/Statistiche";

test("Avviso: gli errori sono annunciati subito", () => {
  const h = renderToStaticMarkup(<Avviso tipo="errore">No</Avviso>);
  assert.match(h, /role="alert"/);
  assert.match(h, /avviso--errore/);
});

test("Distintivo: testo leggibile per ogni stato", () => {
  assert.match(renderToStaticMarkup(<Distintivo stato="in_revisione" />), /In attesa di approvazione/);
  assert.match(renderToStaticMarkup(<Distintivo stato="pubblicato" />), /distintivo--pubblicato/);
});

test("Casella: etichetta collegata alla spunta", () => {
  const h = renderToStaticMarkup(<Casella id="c1" checked={false} onChange={() => {}}>Accetto</Casella>);
  assert.match(h, /for="c1"/);
  assert.match(h, /id="c1"/);
});

test("Campo: etichetta, aiuto, errore e contatore", () => {
  const h = renderToStaticMarkup(
    <CampoEtichettato id="d" etichetta="Dedica" aiuto="Facoltativa" errore="Troppo lunga" contatore={{ attuale: 61, massimo: 60 }} value="" onChange={() => {}} />
  );
  assert.match(h, /<label class="campo__etichetta" for="d">Dedica<\/label>/);
  assert.match(h, /aria-invalid="true"/);
  assert.match(h, /aria-describedby="d-aiuto d-errore"/);
  assert.match(h, /61\/60/);
});

test("Passi: quello attuale è marcato", () => {
  const h = renderToStaticMarkup(<IndicatorePassi passi={["Foto", "Testo", "Anteprima"]} attuale={1} />);
  assert.match(h, /aria-current="step">2\. Testo/);
  assert.match(h, /✓ Foto/);
});

test("Statistiche", () => {
  const h = renderToStaticMarkup(<Statistiche scansioni={5} anteprime={3} acquisti={1} />);
  assert.match(h, /<strong>5<\/strong>visite dal QR/);
});
