import * as cheerio from 'cheerio';

// tslint:disable-next-line:no-var-requires
//const d = require('debug')('cl-apartment-finder');

export function getLinksFromXML(xmlText: string): string[] {
  const $ = cheerio.load(xmlText, { xmlMode: true, decodeEntities: true });

  let items = Array.from($('link'));
  return items
    .map(x => $(x).text().trim())
    .filter(x => x.length > 1 && !x.match(/\/search\//i));
}

export function screenScrapeCoordinatesFromCraigslistHtml(contents: string): number[] {
  const $ = cheerio.load(contents);

  let lat = parseFloat($('#map').attr('data-latitude'));
  let lng = parseFloat($('#map').attr('data-longitude'));
  return [lat, lng];
}