import jsr from '../jsr.json';

const old = jsr.version.split('.')
jsr.version = `${old[0]}.${old[1]}.${parseInt(old[2]!) + 1}`;
await Bun.write('./jsr.json', JSON.stringify(jsr, null, 2));
