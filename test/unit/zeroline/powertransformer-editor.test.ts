import { fixture, html, expect } from '@open-wc/testing';
import { SinonSpy, spy } from 'sinon';

import '../../../src/zeroline/powertransformer-editor.js';

import { PowerTransformerEditor } from '../../../src/zeroline/powertransformer-editor.js';
import { isDelete } from '../../../src/foundation.js';

describe('powertransformer-editor', () => {
  let element: PowerTransformerEditor;
  let validSCL: XMLDocument;

  let wizardEvent: SinonSpy;
  let actionEvent: SinonSpy;

  beforeEach(async () => {
    validSCL = await fetch('/test/testfiles/valid2007B4withSubstationXY.scd')
      .then(response => response.text())
      .then(str => new DOMParser().parseFromString(str, 'application/xml'));

    element = <PowerTransformerEditor>(
      await fixture(
        html`<powertransformer-editor
          .element=${validSCL.querySelector('PowerTransformer')}
        ></powertransformer-editor>`
      )
    );

    wizardEvent = spy();
    window.addEventListener('wizard', wizardEvent);
    actionEvent = spy();
    window.addEventListener('editor-action', actionEvent);
  });

  it('looks like the latest snapshot', async () => {
    await expect(element).shadowDom.to.equalSnapshot();
  });

  it('triggers edit wizard for Linking LNode element on action button click', async () => {
    (<HTMLElement>(
      element.shadowRoot?.querySelector('mwc-fab[icon="account_tree"]')
    )).click();

    await element.requestUpdate();

    expect(wizardEvent).to.have.be.calledOnce;
    expect(wizardEvent.args[0][0].detail.wizard()[0].title).to.contain('lnode');
  });

  it('triggers edit wizard for PowerTransformer element on action button click', async () => {
    (<HTMLElement>(
      element.shadowRoot?.querySelector('mwc-fab[icon="edit"]')
    )).click();

    await element.requestUpdate();

    expect(wizardEvent).to.have.be.calledOnce;
    expect(wizardEvent.args[0][0].detail.wizard()[0].title).to.contain('edit');
  });

  it('triggers remove powertransformer action on action button click', async () => {
    (<HTMLElement>(
      element.shadowRoot?.querySelector('mwc-fab[icon="delete"]')
    )).click();

    await element.requestUpdate();

    expect(wizardEvent).to.not.have.been.called;
    expect(actionEvent).to.have.been.calledOnce;
    expect(actionEvent.args[0][0].detail.action).to.satisfy(isDelete);
  });
});