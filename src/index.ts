import micro from 'micro';
import * as LRU from 'lru-cache';
import * as Slack from 'slack';
import { router, get } from 'microrouter';

import { delay, asyncMap } from './promise-array';
import { processLinks, Listing } from './lib';

const token = process.env.SLACK_TOKEN!.trim();
const channel = process.env.SLACK_CHANNEL!.trim();

const linkCache: LRU.Cache<string, boolean> = LRU({
  maxAge: 10 * 24 * 60 * 60 * 1000,
  max: 1000,
});

const rssFeeds = [
  // tslint:disable-next-line:max-line-length
  'https://sfbay.craigslist.org/search/apa?availabilityMode=0&bundleDuplicates=1&format=rss&hasPic=1&max_price=6500&min_bedrooms=3&min_bathrooms=2&postal=94107&search_distance=4',
  // tslint:disable-next-line:max-line-length
  'https://sfbay.craigslist.org/search/apa?availabilityMode=0&bundleDuplicates=1&format=rss&hasPic=1&max_price=6500&min_bedrooms=3&min_bathrooms=2&postal=94044&search_distance=4',
];

async function poll() {
  let resultList = await asyncMap(rssFeeds, rssFeed => processLinks(rssFeed, linkCache));

  let results = Array.from(resultList.values()).reduce((acc: Listing[], x: Listing[]) => {
    acc.push(...x);
    return acc;
  }, []);

  for (let item of results) {
    let text = item.url;

    console.log('About to post: ' + text);
    await slack.chat.postMessage({ channel , text });
    if (item.mapLink) {
      await delay(10 * 1000);   // Slack really sucks

      text = `${item.img}\n${item.mapLink}`;
      console.log('Maplink: ' + text);
      await slack.chat.postMessage({ channel, text });
    }

    await delay(10 * 1000);   // Slack sucks
  }

  return { ok: true };
}

async function dumpSeenLinks() {
  return linkCache.keys();
}

const slack = new Slack({token});
const server = micro(router(
  get('/', poll),
  get('/dump', dumpSeenLinks),
));

if (!token || !channel) { throw new Error('Set SLACK_TOKEN and SLACK_CHANNEL!'); }

console.log('Building initial results...');

asyncMap(rssFeeds, x => processLinks(x, linkCache, true))
  .then(() => {
    console.log('Ready to poll!');
    server.listen(3000);
  });
