export default class GameConsole {
	constructor (root) {
		this.journal = root
		this.journal.addEventListener('dblclick', e => {
			e.preventDefault()
			const value = window.prompt('Введите команду')
			if (!value) return
			try {
				this.log(`< ${value}`)
				this.log(`> ${this.processPrompt(value)}`)
			} catch (e) {
				this.error(e.toString())
			}
		})
		this.journal.value = ''
		this.commands = {}
	}

	debug(message) {
		console.debug(message)
	}

	log(message) {
		console.log(message)
		this.message(`[${new Date().toLocaleTimeString()}] ${message}`)
	}

	error(message) {
		console.error(message)
		this.message(`![${new Date().toLocaleTimeString()}] ${message}`)
	}

	message(message) {
		this.journal.value += `${message}\n`
		this.journal.scrollTop = this.journal.scrollHeight
	}

	help () {
		let str = ''
		for (const name in this.commands) {
			const { args, desc } = this.commands[name]
			if (!desc) continue
			str += `* ${name}`
			if (args.length) {
				str += args.map(v => ` <${v.name}>`.toLowerCase()).join('')
			}
			str += ` // ${desc}\n`
		}
		return str
	}

	processPrompt (string) {
		string = string.trim()
		const stack = []
		for (let i = 0; i < string.length;) {
			const nearestSpace = string.indexOf(' ', i)
			const nearestQuotes = string.indexOf('"', i)
			if (nearestQuotes !== -1 && nearestQuotes > nearestSpace) {
				const nextQuotes = string.indexOf('"', nearestQuotes + 1)
				if (nextQuotes === -1) {
					throw new Error(`No closing quotes (starting from ${nearestQuotes})`)
				}
				stack.push(string.substring(nearestQuotes + 1, nextQuotes))
				i = nextQuotes + 1
				continue
			}
			if (nearestSpace !== -1) {
				stack.push(string.substring(i, nearestSpace))
				i = nearestSpace + 1
				continue
			}
			stack.push(string.substring(i))
			break
		}
		if (!(stack[0] in this.commands)) {
			throw new Error(`Command "${stack[0]}" not found`)
		}
		const { args, handler } = this.commands[stack[0]]
		if (stack.length - 1 !== args.length) {
			throw new Error(`Argument count mismatch (expected ${stack.length}, got ${args.length})`)
		}
		return handler(stack.slice(1).map((v, i) => args[i](v)))
	}

	addCommand (name, args, handler, desc = null) {
		this.commands[name] = {
			args: args,
			desc,
			handler
		}
		return this
	}

	removeCommand (name) {
		delete this.commands[name]
		return this
	}
}
