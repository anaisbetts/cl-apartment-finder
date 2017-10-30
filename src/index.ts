import micro from 'micro';
import * as LRU from 'lru-cache';
import * as Slack from 'slack';
import { router, get } from 'microrouter';

import { delay } from './promise-array';
import { processLinks } from './lib';

const token = process.env.SLACK_TOKEN!.trim();
const channel = process.env.SLACK_CHANNEL!.trim();

const linkCache: LRU.Cache<string, boolean> = LRU({
  maxAge: 10 * 24 * 60 * 60 * 1000,
  max: 1000,
});

// tslint:disable-next-line:max-line-length
const rssFeed = process.env.RSS_FEED || 'https://sfbay.craigslist.org/search/apa?availabilityMode=0&bundleDuplicates=1&format=rss&hasPic=1&max_price=6000&min_bedrooms=3&postal=94107&search_distance=2';

async function poll() {
  let results = await processLinks(rssFeed, linkCache);

  for (let item of results) {
    let text = item.url;

    console.log('About to post: ' + text);
    await slack.chat.postMessage({ channel , text });
    if (item.mapLink) {
      await delay(3 * 1000);
      await slack.chat.postMessage({ channel, text: `${item.img}\n${item.mapLink}`});
    }
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

processLinks(rssFeed, linkCache, true)
  .then(() => {
    console.log('Ready to poll!');
    server.listen(3000);
  });