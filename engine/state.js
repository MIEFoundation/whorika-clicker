import EventDispatcher from './event.js'

export default class StateFactory {
	static InnerState = Symbol('StateFactory.InnerState')
	static validateDefinition (definitions) {
		for (const name in definitions) {
			if (typeof name !== 'string') throw new Error('Key is not string')
			const {
				type,
				computed,
				optional,
				default: def,
				validate,
				format,
				serialize,
				deserialize
			} = definitions[name]
			if (typeof type !== 'function') throw new TypeError('State type must be a constructor')
			if (def && typeof def !== 'function') throw new TypeError('Default must be function')
			if (format && typeof format !== 'function') throw new TypeError('Formatter must be function')
			if (computed) {
				if (optional) throw new Error('Computed state cannot be optional')
				if (validate) throw new Error('Computed state not requires validation')
				if (serialize || deserialize) throw new Error('Computed state is not serializable')
			} else {
				if (validate && typeof validate !== 'function') throw new TypeError('Validator must be function')
				if (serialize && typeof serialize !== 'function' && typeof serialize !== 'boolean') {
					throw new Error('Serialize property must be boolean or function')
				}
				if (deserialize) {
					if (!serialize) throw new Error('Serialize property is not set')
					if (typeof deserialize !== 'function') throw new TypeError('Deserialize property must be function or undefined')
				}
			}
		}
	}
	constructor (definitions) {
		StateFactory.validateDefinition(definitions)
		const defaults = {}
		const formatter = {}
		const serializers = {}
		const deserializers = {}
		this.class = class State extends EventDispatcher {
			constructor () {
				super()
				this.clearData()
			}
			clearData () {
				this[StateFactory.InnerState] = {}
				for (const name in defaults) {
					this[StateFactory.InnerState][name] = defaults[name]()
				}
			}
			toFormatString (name) {
				return (formatter[name] ?? String)(this[name])
			}
			toJSON () {
				const data = {}
				for (const name in serializers) {
					data[name] = serializers[name](this[name])
				}
				return data
			}
			fromJSON (value) {
				this.clearData()
				for (const name in deserializers) {
					this[name] = deserializers[name](value[name])
				}
			}
		}
		for (const name in definitions) {
			const {
				type,
				computed,
				optional,
				default: def,
				validate,
				format,
				serialize,
				deserialize
			} = definitions[name]
			if (format) {
				formatter[name] = format
			}
			if (serialize) {
				serializers[name] = serialize === true ? v => v?.valueOf?.() : serialize
				deserializers[name] = deserialize ?? (v => type(v))
			}
			if (computed) {
				let prevValue = def?.()
				Object.defineProperty(this.class.prototype, name, {
					get: function() {
						const value = computed(this)
						if (prevValue !== value) {
							prevValue = value
							this[EventDispatcher.Dispatch](name, value)
						}
						return value
					}
				})
				continue
			}
			if (def) {
				defaults[name] = def
			}
			Object.defineProperty(this.class.prototype, name, {
				enumerable: true,
				get: function() {
					return this[StateFactory.InnerState][name]
				},
				set: function(value) {
					if (!optional || value) {
						if (value?.constructor !== type) return
						if (validate && !validate(value)) return
					}
					this[StateFactory.InnerState][name] = value
					this[EventDispatcher.Dispatch](name, value)
				}
			})
		}
	}

	create () {
		return new this.class()
	}
}
