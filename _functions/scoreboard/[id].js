import StateDefinition from '../../data/state.js'

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

export async function onRequestHead({ request, env }) {
	return new Response(null, {
		status: env.SCOREBOARD.get(request.params.id) ? 204 : 404
	})
}

async function getPlayerEntry (id, env) {
	const res = await env.SCOREBOARD.getWithMetadata(id)
	if (!res) return null
	const { value: { name, totalDamage }, metadata: {id} } = res
	return [name, totalDamage, IDtoURI(id)]
}

export async function onRequestGet({ request, env }) {
	const { id } = request.params
	const entry = getPlayerEntry(id, env)
	if (!entry) return new Response(null, { status: 404 })
	const { value, metadata } = await env.SCOREBOARD.getWithMetadata('@')
	const index = Object.keys(value).indexOf(id)
	return new Response(JSON.stringify({ index, value: entry }), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Last-Modified': new Date(metadata.date).toGMTString()
		}
	})
}

const PLAYER_EXPIRATION_TTL = 30 * 24 * 60 * 60
export async function onRequestPost({ request, env }) {
	const { id } = request.params
	const state = await request.body.json()
	// Validation
	const entry = await env.SCOREBOARD.getWithMetadata(id)
	if (!entry) return new Response(null, { status: 404 })
	entry.metadata.date = Date.now()
	for (const key in StateDefinition) {
		const { optional, type, validate, serialize } = StateDefinition[key]
		if (optional && !(key in state)) continue
		if (
			!!serialize !== (key in state)
			|| value?.constructor !== type
			|| (validate && !validate(value))
		) return new Response(null, { status: 400 })
	}
	await env.SCOREBOARD.put(id, state, {
		expirationTtl: PLAYER_EXPIRATION_TTL,
		metadata: entry.metadata
	})
	return new Response(null, { status: 202 })
}
