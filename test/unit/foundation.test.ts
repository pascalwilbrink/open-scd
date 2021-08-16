import { expect, fixture, html } from '@open-wc/testing';

import {
  ComplexAction,
  EditorAction,
  identity,
  findControlBlocks,
  findFCDAs,
  ifImplemented,
  invert,
  isCreate,
  isDelete,
  isMove,
  isSame,
  isSimple,
  isUpdate,
  newActionEvent,
  newPendingStateEvent,
  newWizardEvent,
  selector,
  tags,
  getReference,
  SCLTag,
  getChildElementsByTagName,
  cloneElement,
} from '../../src/foundation.js';

import { MockAction } from './mock-actions.js';

describe('foundation', () => {
  let scl1: Element;
  let scl2: Element;

  let substation: Element;
  let ied: Element;
  let communication: Element;
  let bay: Element;
  let privateSection: Element;
  let privateElement: Element;
  let publicElement: Element;

  beforeEach(async () => {
    scl1 = (
      await fetch('/base/test/testfiles/valid2007B4.scd')
        .then(response => response.text())
        .then(str => new DOMParser().parseFromString(str, 'application/xml'))
    ).documentElement;
    scl2 = (
      await fetch('/base/test/testfiles/valid2003.scd')
        .then(response => response.text())
        .then(str => new DOMParser().parseFromString(str, 'application/xml'))
    ).documentElement;

    substation = scl1.querySelector('Substation')!;
    ied = scl1.querySelector('IED')!;
    communication = scl1.querySelector('Communication')!;
    bay = scl1.querySelector('Bay')!;
    privateSection = bay.querySelector('Private')!;
    privateElement = privateSection.firstElementChild!;
    publicElement = bay.children.item(1)!;
  });
  describe('EditorAction', () => {
    it('consists of four disjunct simple types', () => {
      expect(MockAction.cre).to.satisfy(isCreate);
      expect(MockAction.del).to.satisfy(isDelete);
      expect(MockAction.mov).to.satisfy(isMove);
      expect(MockAction.upd).to.satisfy(isUpdate);

      expect(MockAction.cre).to.satisfy(isSimple);
      expect(MockAction.del).to.satisfy(isSimple);
      expect(MockAction.mov).to.satisfy(isSimple);
      expect(MockAction.upd).to.satisfy(isSimple);

      expect(MockAction.cre).to.not.satisfy(isDelete);
      expect(MockAction.cre).to.not.satisfy(isMove);
      expect(MockAction.cre).to.not.satisfy(isUpdate);

      expect(MockAction.del).to.not.satisfy(isCreate);
      expect(MockAction.del).to.not.satisfy(isMove);
      expect(MockAction.del).to.not.satisfy(isUpdate);

      expect(MockAction.mov).to.not.satisfy(isCreate);
      expect(MockAction.mov).to.not.satisfy(isDelete);
      expect(MockAction.mov).to.not.satisfy(isUpdate);

      expect(MockAction.upd).to.not.satisfy(isCreate);
      expect(MockAction.upd).to.not.satisfy(isDelete);
      expect(MockAction.upd).to.not.satisfy(isMove);
    });

    it('consists of one complex type', () => {
      expect(MockAction.complex).to.not.satisfy(isSimple);

      expect(MockAction.complex).to.not.satisfy(isCreate);
      expect(MockAction.complex).to.not.satisfy(isDelete);
      expect(MockAction.complex).to.not.satisfy(isMove);
      expect(MockAction.complex).to.not.satisfy(isUpdate);
    });

    describe('invert', () => {
      it('turns Create into Delete and vice versa', () => {
        expect(invert(MockAction.cre)).to.satisfy(isDelete);
        expect(invert(MockAction.del)).to.satisfy(isCreate);
      });

      it('turns Move into Move', () => {
        expect(invert(MockAction.mov)).to.satisfy(isMove);
      });

      it('turns Update into Update', () => {
        expect(invert(MockAction.upd)).to.satisfy(isUpdate);
      });

      it('inverts components of complex actions in reverse order', () => {
        const action = MockAction.complex;
        const inverse = <ComplexAction>invert(action);

        action.actions.forEach((element, index) =>
          expect(
            inverse.actions[inverse.actions.length - index - 1]
          ).to.deep.equal(invert(action.actions[index]))
        );
      });

      it('throws on unknown Action type', () => {
        const invalid = <EditorAction>(<unknown>'Not an action!');
        expect(() => invert(invalid)).to.throw();
      });
    });

    describe('ActionEvent', () => {
      it('bears an EditorAction in its detail', () => {
        expect(newActionEvent(MockAction.mov))
          .property('detail')
          .property('action')
          .to.satisfy(isMove);
      });
    });
  });

  describe('PendingStateEvent', () => {
    it('bears a void Promise in its detail', () => {
      expect(newPendingStateEvent(Promise.resolve()))
        .property('detail')
        .property('promise')
        .to.be.a('promise');
    });
  });

  describe('WizardEvent', () => {
    it('optionally bears a wizard in its detail', () => {
      expect(newWizardEvent()).property('detail').property('wizard').to.be.null;
      expect(newWizardEvent([]))
        .property('detail')
        .property('wizard')
        .to.be.an('array').and.to.be.empty;
    });
  });

  describe('ifImplemented', () => {
    let nonEmpty: HTMLElement;
    let empty: HTMLElement;

    beforeEach(async () => {
      nonEmpty = await fixture(html`<p>${ifImplemented('test')}</p>`);
      empty = await fixture(html`<p>${ifImplemented({})}</p>`);
    });

    it('renders non-empty objects into its template', () =>
      expect(nonEmpty).dom.to.have.text('test'));

    it('does not render empty objects into its template', () =>
      expect(empty).dom.to.be.empty);
  });

  describe('isSame', () => {
    it('is true of any two SCL Elements', () => {
      expect(isSame(scl1, scl2)).to.be.true;
    });

    it('is true of any two Header Elements', () => {
      expect(
        isSame(scl1.querySelector('Header')!, scl2.querySelector('Header')!)
      ).to.be.true;
    });

    it('is true of any two Communication Elements', () => {
      expect(
        isSame(
          scl1.querySelector('Communication')!,
          scl2.querySelector('Communication')!
        )
      ).to.be.true;
    });

    it('is true of any two DataTypeTemplates Elements', () => {
      expect(
        isSame(
          scl1.querySelector('DataTypeTemplates')!,
          scl2.querySelector('DataTypeTemplates')!
        )
      ).to.be.true;
    });

    it('is true of identical private sections', () => {
      expect(isSame(privateSection, privateSection)).to.be.true;
    });

    it('is false of any private elements', () => {
      expect(isSame(privateElement, privateElement)).to.be.false;
      expect(isSame(privateElement, publicElement)).to.be.false;
    });

    it('is true of any one Element and itself', () => {
      expect(isSame(substation, substation)).to.be.true;
      expect(isSame(ied, ied)).to.be.true;
      expect(isSame(bay, bay)).to.be.true;
      expect(isSame(communication, communication)).to.be.true;
    });

    it('is false of elements with different tagNames', () => {
      expect(isSame(substation, ied)).to.be.false;
      expect(isSame(substation, bay)).to.be.false;
      expect(isSame(bay, communication)).to.be.false;
      expect(isSame(communication, ied)).to.be.false;
    });

    it('is true of elements with equal nonempty id attributes', () => {
      expect(
        isSame(
          scl1.querySelector('LNodeType[id="Dummy.LLN0"]')!,
          scl2.querySelector('LNodeType[id="Dummy.LLN0"]')!
        )
      ).to.be.true;
    });

    it('is false of elements with unequal id attributes', () => {
      expect(
        isSame(
          scl1.querySelector('LNodeType[id="Dummy.LLN0"]')!,
          scl1.querySelector('LNodeType[id="Dummy.LLN0.two"]')!
        )
      ).to.be.false;
    });
  });
  describe('identity', () => {
    it('returns NaN for any private element', () => {
      expect(identity(privateElement)).to.be.NaN;
    });
    it('returns parent identity for singleton identities', () => {
      Object.entries(tags).forEach(([tag, data]) => {
        if (data.identity !== tags['Server'].identity) return;

        const element = scl1.querySelector(tag);
        if (element) {
          expect(identity(element)).to.equal(identity(element.parentElement!));
        }
      });
    });
    it('returns valid identity for special identities', () => {
      const expectations: Partial<Record<string, string>> = {
        Hitem: '1\t143',
        Terminal: 'AA1>E1>COUPLING_BAY>QC11>AA1/E1/COUPLING_BAY/L2',
        'Bay>LNode': 'IED2 CBSW/ LPHD 1',
        KDC: 'IED1>IED1 P1',
        LDevice: 'IED1>>CircuitBreaker_CB1',
        IEDName:
          'IED1>>CircuitBreaker_CB1>GCB>IED2 P1 CircuitBreaker_CB1/ CSWI 1',
        FCDA: 'IED1>>CircuitBreaker_CB1>GooseDataSet1>CircuitBreaker_CB1/ XCBR 1.Pos stVal (ST)',
        ExtRef:
          'IED1>>Disconnectors>DC CSWI 1>GOOSE:GCB CBSW/ LLN0  IED2 CBSW/ XSWI 2 Pos stVal@intAddr',
        'ExtRef:not([iedName])': 'IED1>>Disconnectors>DC CSWI 1>stVal-t[0]',
        LN: 'IED1>>CircuitBreaker_CB1> XCBR 1',
        ClientLN:
          'IED2>>CBSW> XSWI 1>ReportCb>IED1 P1 CircuitBreaker_CB1/ XCBR 1',
        DAI: 'IED1>>CircuitBreaker_CB1> XCBR 1>Pos>ctlModel',
        SDI: 'IED1>>CircuitBreaker_CB1>CB CSWI 2>Pos>pulseConfig',
        Val: 'IED1>>CircuitBreaker_CB1> XCBR 1>Pos>ctlModel> 0',
        ConnectedAP: 'IED1 P1',
        GSE: 'CircuitBreaker_CB1 GCB',
        SMV: 'MU01 MSVCB01',
        PhysConn: 'IED1 P1>RedConn',
        P: 'IED1 P1>IP [0]',
        EnumVal: '#Dummy_ctlModel>0',
        ProtNs: '#Dummy.LLN0.Mod.SBOw>8-MMS\tIEC 61850-8-1:2003',
      };

      Object.keys(expectations).forEach(key => {
        const element = scl1.querySelector(key);
        expect(identity(element!)).to.equal(expectations[key]);
      });
    });
    it('returns valid identity for naming identities', () => {
      Object.entries(tags).forEach(([tag, data]) => {
        if (data.identity !== tags['Substation'].identity) return;

        const element = scl1.querySelector(tag);
        if (element) {
          expect(identity(element)).to.equal(
            identity(element.parentElement!) +
              (element.parentElement?.tagName === 'SCL' ? '' : '>') +
              element.getAttribute('name')
          );
        }
      });
    });
  });

  describe('selector', () => {
    it('returns negation pseudo-class for identity of type NaN', () => {
      const element = scl1.querySelector('Assotiation');
      const ident = identity(element!);
      expect(selector('Assotiation', ident)).to.equal(':not(*)');
    });
    it('returns correct selector for all tags except IEDName and ProtNs', () => {
      Object.keys(tags).forEach(tag => {
        const element = Array.from(scl1.querySelectorAll(tag)).filter(
          item => !item.closest('Private')
        )[0];
        if (element && tag !== 'IEDName' && tag !== 'ProtNs')
          expect(element).to.satisfy((element: Element) =>
            element.isEqualNode(
              scl1.querySelector(selector(tag, identity(element)))
            )
          );
      });
    });
  });

  describe('getReference', () => {
    it('returns correct reference for already existing elements', () => {
      Object.keys(tags)
        .filter(tag => tags[<SCLTag>tag].children.length > 0)
        .forEach(tag => {
          const element = Array.from(scl1.querySelectorAll(tag)).filter(
            item => !item.closest('Private')
          )[0];

          if (
            !element ||
            element.tagName === 'Services' ||
            element.tagName === 'SettingGroups'
          )
            return;

          const children = Array.from(element.children);
          const childTags = new Set(children.map(child => child.tagName));

          for (const childTag of childTags) {
            expect(getReference(element, <SCLTag>childTag)).to.equal(
              children.find(child => child.tagName === childTag)
            );
          }
        });
    });

    it('returns correct reference for LNode element', () => {
      const scl = new DOMParser().parseFromString(
        `<Bay>
          <Private>testprivate</Private>
          <ConductingEquipment name="QA1"></ConductingEquipment>
        </Bay>`,
        'application/xml'
      ).documentElement;
      expect(getReference(scl, 'LNode')).to.equal(
        scl.querySelector('ConductingEquipment')
      );
      const scl2 = new DOMParser().parseFromString(
        `<Bay>
          <Private>testprivate</Private>
          <PowerTransformer name="pTrans"></PowerTransformer>
          <ConductingEquipment name="QA1"></ConductingEquipment>
        </Bay>`,
        'application/xml'
      ).documentElement;
      expect(getReference(scl2, 'LNode')).to.equal(
        scl2.querySelector('PowerTransformer')
      );
    });
    it('returns correct reference for Substation element', () => {
      const scl = new DOMParser().parseFromString(
        `<SCL>
          <Header></Header>
          <IED name="IED"></IED>
          <DataTypeTemplates></DataTypeTemplates>
        </SCL>`,
        'application/xml'
      ).documentElement;
      expect(getReference(scl, 'Substation')).to.equal(
        scl.querySelector('IED')
      );
    });
    it('returns correct reference for VoltageLevel element', () => {
      const scl = new DOMParser().parseFromString(
        `<Substation>
          <Private></Private>
          <LNode></LNode>
        </Substation>`,
        'application/xml'
      ).documentElement;
      expect(getReference(scl, 'VoltageLevel')).to.be.null;
    });
    it('returns correct reference for Bay element', () => {
      const scl = new DOMParser().parseFromString(
        `<VoltageLevel>
          <Private></Private>
          <Function></Function>
        </VoltageLevel>`,
        'application/xml'
      ).documentElement;
      expect(getReference(scl, 'Bay')).to.equal(scl.querySelector('Function'));
    });
    it('returns correct reference for ConductingEquipment element', () => {
      const scl = new DOMParser().parseFromString(
        `<Bay>
          <Private></Private>
          <ConnectivityNode></ConnectivityNode>
        </Bay>`,
        'application/xml'
      ).documentElement;
      expect(getReference(scl, 'ConductingEquipment')).to.equal(
        scl.querySelector('ConnectivityNode')
      );
    });
  });

  describe('findControlBlocks', () => {
    let doc: Document;
    beforeEach(async () => {
      doc = await fetch('/base/test/testfiles/comm-map.scd')
        .then(response => response.text())
        .then(str => new DOMParser().parseFromString(str, 'application/xml'));
    });
    it('returns an Set of controlBlocks connected to the ExtRef', () => {
      const extRef = doc.querySelector(
        ':root > IED[name="IED2"] > AccessPoint > Server > LDevice[inst="CircuitBreaker_CB1"] ExtRef'
      )!;
      expect(findControlBlocks(extRef).size).to.have.equal(1);
      expect(
        Array.from(findControlBlocks(extRef))[0].isEqualNode(
          doc.querySelector(
            'IED[name="IED1"] LDevice[inst="CircuitBreaker_CB1"] GSEControl[name="GCB"]'
          )
        )
      ).to.be.true;
    });

    it('returns empty Set if input not ExtRef', () => {
      expect(findControlBlocks(doc.querySelector('LN')!).size).to.equal(0);
    });

    it('returns empty array if input is not public', () => {
      expect(
        findControlBlocks(doc.querySelector('Private > ExtRef')!).size
      ).to.equal(0);
    });
  });

  describe('findFCDAs', () => {
    let doc: Document;
    beforeEach(async () => {
      doc = await fetch('/base/test/testfiles/comm-map.scd')
        .then(response => response.text())
        .then(str => new DOMParser().parseFromString(str, 'application/xml'));
    });
    it('returns an array of FCDAs connected to the ExtRef', () => {
      const extRef = doc.querySelector(
        ':root > IED[name="IED2"] > AccessPoint > Server > LDevice[inst="CircuitBreaker_CB1"] ExtRef'
      )!;
      expect(findFCDAs(extRef).length).to.have.equal(1);
      expect(
        findFCDAs(extRef)[0].isEqualNode(
          doc.querySelector(
            'IED[name="IED1"] LDevice[inst="CircuitBreaker_CB1"] ' +
              'FCDA[ldInst="CircuitBreaker_CB1"][lnClass="XCBR"][doName="Pos"][daName="stVal"]'
          )
        )
      ).to.be.true;
    });

    it('returns empty array if input not ExtRef', () => {
      expect(findFCDAs(doc.querySelector('LN')!).length).to.equal(0);
    });

    it('returns empty array if input is not public', () => {
      expect(findFCDAs(doc.querySelector('Private > ExtRef')!).length).to.equal(
        0
      );
    });
  });

  describe('getChildElementsByTagName', () => {
    let doc: Document;
    beforeEach(async () => {
      doc = await fetch('/base/test/testfiles/lnodewizard.scd')
        .then(response => response.text())
        .then(str => new DOMParser().parseFromString(str, 'application/xml'));
    });
    it('returns a child Element array with a specific tag', () => {
      const parent = doc.querySelector('Bay[name="COUPLING_BAY"]');
      expect(getChildElementsByTagName(parent!, 'LNode').length).to.have.equal(
        parent?.querySelectorAll(
          ':root > Substation > VoltageLevel > Bay[name="COUPLING_BAY"] > LNode'
        ).length
      );
    });
  });

  describe('cloneElement', () => {
    let element: Element;
    beforeEach(() => {
      element = new DOMParser().parseFromString(
        `<Element attr1="attrValue" ></Element>`,
        'application/xml'
      ).documentElement;
    });
    it('does not copy child nodes', () => {
      const newElement = cloneElement(element, {});
      expect(newElement.childNodes.length).to.equal(0);
    });
    it('creates a newElement with specified attrs', () => {
      const attr1 = 'newAttr1';
      const attr2 = 'newAttr2';
      const newElement = cloneElement(element, { attr1, attr2 });
      expect(newElement.attributes.length).to.equal(2);
      expect(newElement).to.have.attribute('attr2', 'newAttr2');
    });
    it('leaves attr untouched if not part of attrs', () => {
      const attr2 = 'newAttr2';
      const newElement = cloneElement(element, { attr2 });
      expect(newElement.attributes.length).to.equal(2);
      expect(newElement).to.have.attribute('attr1', 'attrValue');
    });
    it('updates existing attr if part of attrs', () => {
      const attr1 = 'newAttr1';
      const newElement = cloneElement(element, { attr1 });
      expect(newElement.attributes.length).to.equal(1);
      expect(newElement).to.have.attribute('attr1', 'newAttr1');
    });
    it('removes existing attr if set to null', () => {
      const attr1 = null;
      const attr2 = 'newAttr2';
      const newElement = cloneElement(element, { attr1, attr2 });
      expect(newElement.attributes.length).to.equal(1);
      expect(newElement).to.not.have.attribute('attr1');
    });
  });
});
