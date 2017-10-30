import * as fs from 'fs';
import { expect } from 'chai';
import './support';

import { getLinksFromXML, screenScrapeCoordinatesFromCraigslistHtml } from '../src/index';

// tslint:disable-next-line:no-var-requires
const d = require('debug')('cl-apartment-finder');

describe('the parser', () => {
  it('returns links from our fixture file', () => {
    let result = getLinksFromXML(fs.readFileSync(`${__dirname}/fixture.xml`, 'utf8'));

    d(result);
    expect(result.length).to.equal(23);
    result.forEach(x => expect(x).match(/http.*craigslist/i));
  });

  it('fetches map coordinates for a Craigslist URL', () => {
    let result = screenScrapeCoordinatesFromCraigslistHtml(fs.readFileSync(`${__dirname}/fixture.html`, 'utf8'));

    d(result);
    expect(Math.abs(result[0] - 37.771650)).to.be.below(0.001);
    expect(Math.abs(result[1] - (-122.410174))).to.be.below(0.001);
  });
});