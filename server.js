const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { loadEnvConfig } = require('@next/env')

// Load environment variables from .env file
const projectDir = process.cwd()
loadEnvConfig(projectDir)

// Redirect stderr to stdout for visibility in Hostinger's "Runtime Logs" portal
process.stderr.write = (function (write) {
    return function (string, encoding, fd) {
        process.stdout.write(string, encoding, fd)
        write.apply(process.stderr, arguments)
    }
})(process.stderr.write)

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

console.log('--- STARTING HCF CHATBOT SERVER ---')
console.log('Environment:', process.env.NODE_ENV || 'development')
console.log('Port:', port)
console.log('Database Configured:', !!process.env.DATABASE_URL)

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
    createServer(async (req, res) => {
        try {
            // Be sure to pass `true` as the second argument to `url.parse`.
            // This tells it to parse the query portion of the URL.
            const parsedUrl = parse(req.url, true)
            const { pathname, query } = parsedUrl

            if (pathname === '/a') {
                await app.render(req, res, '/a', query)
            } else if (pathname === '/b') {
                await app.render(req, res, '/b', query)
            } else {
                await handle(req, res, parsedUrl)
            }
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })
        .once('error', (err) => {
            console.error(err)
            process.exit(1)
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`)
        })
})
