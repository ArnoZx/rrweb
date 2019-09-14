import * as path from 'path';
import * as fs from 'fs';
// import { analyze } from './label';
import { analyze } from './getClicks';

const dir = path.resolve(__dirname, './src');
const dest = path.resolve(__dirname, './dest');

const files = fs
  .readdirSync(dir)
  .filter(name => path.extname(name) === '.json');

function group(arr: any[]) {
  const obj: any = {};
  for (const event of arr) {
    if (!obj[event.sessionId]) {
      obj[event.sessionId] = [];
    }
    obj[event.sessionId].push({
      ...event,
      data: JSON.parse(event.data.join('')),
      timestamp: new Date(event.timestamp).getTime(),
    });
  }
  return obj;
}

(async () => {
  const result: Record<string, Record<string, string[]>> = {};
  for (const file of files) {
    const content = fs.readFileSync(path.resolve(dir, file), 'utf8');
    try {
      const data = JSON.parse(content);
      const obj = group(data);
      const meta: Record<string, string[]> = await analyze(obj);
      result[file] = meta;
    } catch (error) {
      console.log(file, error.message);
    }
  }
  fs.writeFileSync(
    path.resolve(dest, 'meta.json'),
    JSON.stringify(result, null, 2),
  );
})();
