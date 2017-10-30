import * as cheerio from 'cheerio';
import axios from 'axios';
import * as LRU from 'lru-cache';

import { asyncMap } from '../src/promise-array';

// tslint:disable-next-line:no-var-requires
const d = require('debug')('cl-apartment-finder');

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

export async function screenScrapeMapFromCoords(latlng: number[]): Promise<{link: string, img: string}> {
  const url = `https://google.com/search?q=${latlng[0]}%2C${latlng[1]}`;
  const result = (await axios.get(url)).data;

  const $ = cheerio.load(result);
  let img = $('a > img')[0];

  d(img);

  return {
    img: 'https://google.com' + $(img).attr('src'),
    link: $(img).parent().attr('href')
  };
}

export interface Listing {
  url: string;
  img: string | null;
  coords: number[];
  mapLink: string | null;
}

export async function processLinks(rssFeed: string, alreadySeen: LRU.Cache<string, boolean>, initialPoll = false): Promise<Listing[]> {
  let rss = (await axios.get(rssFeed)).data;
  let links = getLinksFromXML(rss);

  links = links.filter(x => {
    if (alreadySeen.has(x)) { return false; }

    alreadySeen.set(x, true);
    return true;
  });

  if (initialPoll) { return []; }

  let results = await asyncMap(links, async l => {
    let latlng = screenScrapeCoordinatesFromCraigslistHtml((await axios.get(l)).data);
    if (isNaN(latlng[0])) {
      d(`No map coordinates for ${l}`);
      return { coords: latlng, link: null, img: null };
    }

    let ret = await screenScrapeMapFromCoords(latlng);
    return { coords: latlng, img: ret.img, link: ret.link };
  }, 4);

  let ret: Listing[] = [];
  results.forEach((v, k) => ret.push({ url: k, img: v.img, mapLink: v.link, coords: v.coords }));
  return ret;
}