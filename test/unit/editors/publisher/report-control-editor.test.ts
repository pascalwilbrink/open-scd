import { expect, fixture, html } from '@open-wc/testing';

import '../../../../src/editors/publisher/report-control-editor.js';
import { ReportControlEditor } from '../../../../src/editors/publisher/report-control-editor.js';

describe('Editor for ReportControl element', () => {
  let doc: XMLDocument;
  let element: ReportControlEditor;

  beforeEach(async () => {
    doc = await fetch('/test/testfiles/valid2007B4.scd')
      .then(response => response.text())
      .then(str => new DOMParser().parseFromString(str, 'application/xml'));

    element = await fixture(
      html`<report-control-editor .doc=${doc}></report-control-editor>`
    );
  });

  it('looks like the latest snapshot', async () =>
    await expect(element).shadowDom.to.equalSnapshot());
});