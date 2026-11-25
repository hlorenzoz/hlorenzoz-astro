// @ts-check
/**
 * Dev-only twin of the Worker's `html_handling: "auto-trailing-slash"`.
 *
 * In production Cloudflare answers `/en` with a 307 to `/en/` (the browser keeps
 * any `#pricing`). `astro dev` with `trailingSlash: 'always'` shows a 404 hint
 * page instead, so a URL typed or pasted without the slash works in production
 * but not locally. This makes the dev server behave like the Worker.
 */

/**
 * Where a dev request should be redirected, or null to serve it as is: page
 * paths without a trailing slash only. Files (an extension in the last
 * segment) and Vite/Astro internals are left alone.
 * @param {string} url request path with optional query, e.g. `/en?x=1`
 * @returns {string | null}
 */
export function redirectTarget(url) {
    const [path, query] = url.split(/\?(.*)/s, 2);
    if (path === '/' || path.endsWith('/')) return null;
    if (/^\/(@|__|_astro\/|node_modules\/|src\/)/.test(path)) return null;
    if (/\.[a-z0-9]+$/i.test(path.split('/').pop() ?? '')) return null;
    return `${path}/${query ? `?${query}` : ''}`;
}

/** @type {import('vite').Connect.NextHandleFunction} */
function redirect(req, res, next) {
    const target = req.method === 'GET' || req.method === 'HEAD' ? redirectTarget(req.url ?? '/') : null;
    if (!target) return next();
    res.writeHead(307, { Location: target });
    res.end();
}

/** @returns {import('astro').AstroIntegration} */
export default function trailingSlashRedirect() {
    return {
        name: 'dev-trailing-slash-redirect',
        hooks: {
            'astro:config:setup': ({ updateConfig }) => {
                updateConfig({
                    vite: {
                        plugins: [
                            {
                                name: 'dev-trailing-slash-redirect',
                                apply: 'serve',
                                // Astro unshifts its own trailing-slash 404 handler in the
                                // post phase of configureServer. Running ours post too,
                                // from a later (enforce: 'post') plugin, puts it in front.
                                enforce: 'post',
                                configureServer(server) {
                                    return () => {
                                        server.middlewares.stack.unshift({ route: '', handle: redirect });
                                    };
                                },
                            },
                        ],
                    },
                });
            },
        },
    };
}
