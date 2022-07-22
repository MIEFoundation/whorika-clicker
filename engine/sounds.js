export default class GameSounds {
	static validateDefinition (definitions) {
		for (const name in definitions) {
			if (typeof name !== 'string') throw new Error('Audio ID is not string')
			if (typeof definitions[name] !== 'string') throw new TypeError('Audio URL is not a string')
		}
	}

	constructor (definitions) {
		GameSounds.validateDefinition(definitions)
		this.audio = {}
		for (const id in definitions) {
			const audio = new Audio(definitions[id])
			audio.volume = 0.5
			audio.load()
			this.audio[id] = audio
		}
	}

	play (id) {
		if (!(id in this.audio)) return
		const target = this.audio[id]
		target.currentTime = 0
		target.play()
	}

	stop (id) {
		if (!(id in this.audio)) return
		const target = this.audio[id]
		target.pause()
		target.currentTime = 0
	}
}
