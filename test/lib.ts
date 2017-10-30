import * as fs from 'fs';
import { expect } from 'chai';
import * as LRU from 'lru-cache';

import './support';

import { getLinksFromXML, screenScrapeCoordinatesFromCraigslistHtml,
  processLinks } from '../src/lib';

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

// tslint:disable-next-line:max-line-length
const rssFeed = 'https://sfbay.craigslist.org/search/apa?availabilityMode=0&bundleDuplicates=1&format=rss&max_price=6000&min_bedrooms=3&postal=94107&search_distance=2';

describe('integration test', function() {
  this.timeout(30 * 1000);

  it('doesnt explode', async () => {
    let results = await processLinks(rssFeed, new LRU());
    results.forEach(x => console.log(`${x.url} - ${x.mapLink}(${x.coords})`));
  });
});