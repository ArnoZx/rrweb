import * as path from 'path';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import { Replayer } from '../src';
import { eventWithTime, MouseInteractions } from '../src/types';

const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
const code = fs.readFileSync(bundlePath, 'utf8');

interface IWindow extends Window {
  rrweb: {
    Replayer: typeof Replayer;
  };
}

export async function analyze(obj: any) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.time(':1');

  async function getClicks(_events: eventWithTime[]) {
    const page = await browser.newPage();
    try {
      await page.evaluate(code);
      const results: any = await page.evaluate(
        (events: eventWithTime[]) => {
          return new Promise((resolve, reject) => {
            try {
              window.onerror = error => reject(error);
              const replayer = new ((window as unknown) as IWindow).rrweb.Replayer(
                events,
              );
              const clicks: unknown[] = [];
              replayer.on(
                'meta-change',
                (payload: { href: any; width: any; height: any }) => {
                  clicks.push(payload.href);
                },
              );
              replayer.on(
                'mouse-interaction',
                (payload: { target: any; type: MouseInteractions }) => {
                  if (payload.type === 2 || payload.type === 4) {
                    clicks.push(payload.target);
                  }
                },
              );
              replayer.on('finish', () => {
                resolve(clicks);
              });
              replayer.play(events[events.length - 1].timestamp);
            } catch (error) {
              console.log(error.message);
              reject(error);
            }
          });
        },
        _events as any,
      );
      await page.close();
      return results;
    } catch (error) {
      console.log('error', error.message);
      await page.close();
      return [];
    }
  }

  const meta: Record<string, string[]> = {};

  for (const sessionId of Object.keys(obj)) {
    const clicks = await getClicks(obj[sessionId]);
    if (clicks!.length) {
      meta[sessionId] = Array.from(new Set(clicks));
    }
  }

  console.timeEnd(':1');
  browser.close();
  return meta;
}
