const rateLimitMax = 3
const rateLimitExpireSec = 5 // Worker shuts down after 10 secs
const rateLimitExpire = rateLimitExpireSec * 1000
const rateLimits = new Map()

export async function onRequest({ request, next }) {
	const ip = request.headers.get("CF-Connecting-IP")
	const ts = Date.now()
	if (rateLimits.has(ip)) {
		const acc = rateLimits.get(ip).filter(v => (ts - v) < rateLimitExpire)
		acc.push(ts)
		rateLimits.set(ip, acc)
		if (acc.length > rateLimitMax) {
			return new Response(null, {
				status: 429,
				headers: { 'Retry-After': rateLimitExpireSec }
			})
		}
	} else rateLimits.set(ip, [ts])
	return next()
}

const cache = caches.default
async function cacheMiddleware({ request, next }) {
	let response = cache.match(request)
	if (response) return response
	response = await next()
	if (response.ok) cache.put(request, response)
	return response
}
export {
	cacheMiddleware as onRequestHead,
	cacheMiddleware as onRequestGet
}
