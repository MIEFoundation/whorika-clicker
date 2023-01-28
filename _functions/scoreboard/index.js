const encoder = new TextEncoder()
const alphabet = '0123456789abcdef'
const shift = Math.log2(alphabet.length)
async function textToHash (text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text))
  const buf = new Uint8Array(digest)
  let str = ''
  for (let i = 0, l = buf.length; i < l; i++) {
    str += alphabet[buf[i] >> shift] + alphabet[buf[i] % (1 << shift)]	
  }
  return str
}

export async function onRequestHead() {
	return new Response(null, { status: 204 })
}

function IDtoURI (id) {
	if (!id) return null
	let [ username, domain, prefixed ] = id.split('@', 3)
	if (prefixed) {
		username = `@${domain}`
		domain = prefixed
	} else if (!domain) {
		domain = username
		username = ''
	}
	return `https://${domain}/${username}`
}

const MAX_ENTRIES = 10
export async function onRequestGet({ env }) {
	const { value, metadata } = await env.SCOREBOARD.getWithMetadata('@', { type: 'json' })
	return new Response(JSON.stringify(Object.values(value).slice(0, MAX_ENTRIES)), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Last-Modified': new Date(metadata.date).toGMTString()
		}
	})
}

const PLAYER_EXPIRATION_TTL = 60 * 60
const SALT = 'WhorikaClickerGame'
export async function onRequestPost({ request }) {
	const { id: _id, namespace } = await request.body.json()
	if (
		typeof _id !== 'string'
		|| typeof namespace !== 'string'
		|| _id.length + namespace.length > 256
	) return new Response(null, { status: 400 })
	const id = await textToHash(`${namespace}:${_id}#${SALT}`)
	const res = await env.SCOREBOARD.get(id)
	env.SCOREBOARD.set(id, res ?? {}, {
		expirationTtl: PLAYER_EXPIRATION_TTL,
		metadata: {
			date: Date.now(),
			id: _id,
			namespace: namespace
		}
	})
	return new Response(null, {
		status: res ? 200 : 201,
		headers: { Location: `/scoreboard/${id}` }
	})
}
