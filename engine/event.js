const Listeners = Symbol('EventDispatcher.Listeners')
const Dispatch = Symbol('EventDispatcher.Dispatch')

export default class EventDispatcher {
	static Listeners = Listeners
	static Dispatch = Dispatch

	constructor (parent = null) {
		this[Listeners] = parent
			? parent[Listeners]
			: {}
	}

	[Dispatch] (name, ...args) {
		if (!(name in this[Listeners])) return false
		for (const func of this[Listeners][name]) {
			func(...args)
		}
		return true
	}

	addEventListener (name, func, options) {
		if (options?.once) {
			const onceWrapper = (...args) => {
				this.removeEventListener(name, onceWrapper)
				return func(...args)
			}
			return this.addEventListener(name, onceWrapper)
		}
		if (!(name in this[Listeners])) {
			this[Listeners][name] = new Set()
		}
		this[Listeners][name].add(func)
		return this
	}

	removeEventListener (name, func) {
		if (name in this[Listeners]) {
			this[Listeners][name].delete(func)
		}
		return this
	}
}
