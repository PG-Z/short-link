require('dotenv').config();
const express = require('express');
const app = express();

const morgan = require('morgan');
morgan.token('body', (req) => JSON.stringify(req.body));

const Redis = require('redis');
const md5 = require("js-md5");
const redis = Redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    },
    username: process.env.REDIS_USERNAME || null,
    password: process.env.REDIS_PASSWORD || null,
    pingInterval: 5 * 60 * 1000,
});
redis.on('error', err => console.error(err, 'Redis error'));
redis.on('connect', () => console.log('Redis is connect'));
redis.on('reconnecting', () => console.log('Redis is reconnecting'));
redis.on('ready', () => console.log('Redis is ready'));
const redisKey = {
    code: 'short-url:code',
    map: 'short-url:map',
    md5: 'short-url:md5'
};

const _alphabet = 'GS2w4R6789IbcdHEXhijWZAzopTrxPNq3sLMJalBVyQeDmY0nugtF5Uv1fkOCK';
const _base = _alphabet.length;
const encode = (id) => {
    let code = '';
    while (id > 0) {
        code = _alphabet.charAt(id % _base) + code;
        id = Math.floor(id / _base);
    }
    return code;
};

app.use(express.static('build'));
app.use(express.json());
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'));

app.get('/:code', async (request, response) => {
    const code = request.params.code;
    const originUrl = await redis.hGet(redisKey.map, code);
    if (!originUrl) {
        return response.status(404).json({ error: 'Unknown URL' }).end();
    }
    response.redirect(originUrl);
});

app.post('/', async (request, response) => {
    const decodedUrl = decodeURI(request.body.url);
    if (!/^((https|http)?:\/\/)[^\s]+/.test(decodedUrl)) {
        return response.status(400).json({ error: 'Incorrect URL format' }).end();
    }

    let md5 = require('js-md5');

    let mark = false;

    const hashCode = await redis.get(redisKey.md5 + md5(decodedUrl))
    if (hashCode) {
        const originUrl = await redis.hGet(redisKey.map, hashCode);
        if (originUrl) {
            mark =true;
        }
    }

    let code = hashCode;
    if (!mark) {
        const id = await redis.incrBy(redisKey.code, 1);
        code = encode(id);
        await redis.set(redisKey.md5 + md5(decodedUrl), code);
        await redis.hSet(redisKey.map, code, decodedUrl);
    }

    response.json({ url: decodedUrl, code });
});

const PORT = 3001;
redis.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});