import StateWrapper from './state.js'
// Data definitions
import { AfterComboSplashes, RandomStageMessages, NextStageMessages } from './data/messages.js'
import Sounds from './data/sounds.js'
import Sprites from './data/sprites.js'
import UpgradeDefinition from './data/upgrades.js'
// Engine components
import GameConsole from './engine/console.js'
import EventDispatcher from './engine/event.js'
import IntlFormatter from './engine/intl.js'
import GameSounds from './engine/sounds.js'

function* quantities(start = 1, max = 1000) {
	for (let i = start, l = 0; i <= max; i *= 5 + l * 5, l ^= 1) {
		yield i
	}
}

class Game extends EventDispatcher {
	constructor (root = document.body) {
		super()
		this.isDebug = +localStorage.getItem('debug') ?? location.protocol === 'file:'
		this.state = new StateWrapper()
		this.formatter = new IntlFormatter()
		this.console = new GameConsole(root.querySelector('#console'))
		this.sounds = new GameSounds(Sounds)
		this.root = root
		this.time = Date.now()

		// Preventers & combo-breaker
		{
			let lastClick = 0
			const target = root.querySelector('#target')
			root.addEventListener('select', e => e.preventDefault())
			target.addEventListener('click', () => {
				const ts = performance.now()
				if (ts - lastClick < 100) return
				this[EventDispatcher.Dispatch]('hit', true)
				lastClick = ts
			})
			root.querySelector('main').addEventListener('click', e => {
				const ts = performance.now()
				if (e.path.includes(target) && ts - lastClick < 100) return
				e.preventDefault()
				this[EventDispatcher.Dispatch]('miss')
			})
			this.addEventListener('tick', (ts) => {
				if (!lastClick || ts - lastClick < 2000) return
				this[EventDispatcher.Dispatch]('comboReset', ts - lastClick)
				lastClick = 0
			})

			this.state.addEventListener('@increment', () => {
				this[EventDispatcher.Dispatch]('hit', false)
			})
		}

		// State elements
		{
			this.addEventListener('hit', isUser => isUser && this.state.updateDamage())
			root.querySelector('#editname').addEventListener('click', () => {
				const name = window.prompt('Введите имя', this.state.name)
				if (name !== null) this.state.name = name.trim()
			})
			root.querySelectorAll('[data-state]').forEach(el => {
				this.state.addEventListener(el.dataset.state, value => {
					el.innerText = this.formatter.format(value, el.dataset.as)
				})
				el.addEventListener('dblclick', () => {
					if (!this.isDebug) return
					const value = window.prompt(`state.${el.dataset.state} =`, JSON.stringify(this.state.state[state]))
					if (value !== null) this.state.state[state] = JSON.parse(value)
				})
			})
		}
		
		// Sprites
		{
			let spriteIndex = 0
			const sprites = Object.keys(Sprites)
				.filter(k => k.startsWith('hurt_'))
			this.addEventListener('hit', isUser => {
				if (!isUser) return
				spriteIndex += Math.floor(Math.random() * sprites.length)
				spriteIndex %= sprites.length
				this.applySprites(sprites[spriteIndex])
			})
			this.applySprites('default')
		}

		// Sound
		{
			let hitSound = 'stage_0'
			let heavySound = 'stage_0h'
			this.state.addEventListener('stage', (stage) => {
				if (`stage_${stage}` in Sounds) hitSound = `stage_${stage}`
				if (`stage_${stage}h` in Sounds) heavySound = `stage_${stage}h`
			})
			this.addEventListener('hit', () => this.sounds.play(
				Math.random() > 0.9 ? heavySound : hitSound
			))
			this.addEventListener('miss', () => this.sounds.play('miss'))
			this.addEventListener('@upgrades_buy', (id) => {
				this.sounds.play(`upgrade_${id}`)
				this.sounds.play('click')
			})
			this.addEventListener('@upgrades_sell', (id) => {
				this.sounds.play('click')
			})
		}

		// Commands
		{
			this.console.addCommand('помощь',
				[],
				() => this.console.help(),
				'Показывает этот список'
			)
			this.console.addCommand('сохранить', [],
				() => this.save()
					? `Игра сохранена`
					: `Не удалось сохранить игру`,
				'Сохраняет игру'
			)
			this.console.addCommand('загрузить', [],
				() => this.load()
					? `Игра загружена`
					: `Сохранение не найдено`,
				'Загружает игру'
			)
			this.console.addCommand('сбросить', [],
				() => this.clear()
					? `Перезагрузка страницы...`
					: `Сброс игры отменён`,
				'Сбрасывает сохранение'
			)
			this.console.addCommand('сохранитьслот', [Number],
				(slot) => this.save(slot)
					? `Игра сохранена в слот ${slot}`
					: `Не удалось сохранить игру в слот ${slot}`,
				'Сохраняет игру в слот <number>'
			)
			this.console.addCommand('загрузитьслот', [Number],
				(slot) => this.load(slot)
					? `Игра загружена из слота ${slot}`
					: `Слот ${slot} пустой`,
				'Загружает игру из слота <number>'
			)
			this.console.addCommand('сброситьслот', [Number],
				(slot) => this.clear(slot)
					? `Перезагрузка страницы...`
					: `Сброс слота ${slot} отменён`,
				'Сбрасывает слот <number>'
			)
			this.console.addCommand('повторить', [], () => {
				this.storyText()
				return `Повторяем...`
			}, 'Повторяет последнее сюжетное сообщение')
			this.console.addCommand('отладка', [Number], (num) => {
				this.isDebug = !!num
				localStorage.set('debug', num)
				return `Режим Отладки ${num ? 'включен' : 'выключен'}`
			}, 'Включает или отключает режим отладки')
		}

		// Upgrades
		{
			this.upgrades = root.querySelector('#upgrades')
			this.state.addEventListener('@damage', () => this.updateUpgrades())
			this.state.addEventListener('upgradeLevels', () => this.updateUpgrades())
			this.updateUpgrades()
		}

		// Story text
		this.storyTextGoing = false
		this.state.addEventListener('stage', (stage) => this.storyText(stage))

		// Random text
		this.randomText()

		// Target translating + combo
		{
			const MAX_SCALING = 6
			const MAX_OFFSET = 4

			let scaleTimeout
			const target = root.querySelector('#target')
			this.addEventListener('hit', isUser => {
				const mp = this.state.state.comboMultiplier
				if (isUser) this.state.state.comboMultiplier += 0.02

				target.style.setProperty(
					'--scale',
					1 - 0.05 * Math.min(mp, MAX_SCALING)
				)
				target.style.setProperty(
					'--offset',
					3 * (Math.random() - 0.5) / Math.max(MAX_OFFSET - mp, 1)
				)
				if (scaleTimeout) {
					clearTimeout(scaleTimeout)
				}
				scaleTimeout = setTimeout(() => target.style.setProperty('--scale', 1), 100)
			})
			target.style.setProperty('--scale', 1)

			const splash = root.querySelector('#splash')
			this.addEventListener('comboReset', (timeout) => {
				if (splash.dataset.show === 'true') return
				if (this.state.state.comboMultiplier >= 2) {
					splash.innerText = AfterComboSplashes[(Math.random() * AfterComboSplashes.length) | 0]
					splash.dataset.show = 'true'
					setTimeout(() => { splash.dataset.show = 'false' }, 3000)
				}
				this.state.state.comboMultiplier = 1
				target.style.setProperty('--offset', 0)
				this.console.debug(`Reset multiplier for ${timeout} ms timeout`)
			})
		}

		this.console.log('Всё загружено!')
		this.console.log(
			'Кликните дважды на консоль чтобы ввести команду, '
			+ 'узнать список команд: "помощь".'
		)
	}

	async randomText () {
		let randomChosen = []
		while (true) {
			await this.waitTicks(120000)
			const messages = RandomStageMessages[this.state.state.stage]
			if (!messages) continue
			if (randomChosen.length === messages.length) {
				randomChosen = []
			}
			const filtered = Array.from(messages).filter(v => !randomChosen.includes(v))
			const random = filtered[Math.floor(Math.random() * filtered.length)]
			randomChosen.push(random)
			this.console.message(random)
		}
	}

	async storyText (stage = this.state.state.stage) {
		if (!(stage in NextStageMessages) || this.storyTextGoing) return
		this.storyTextGoing = true
		for (const message of NextStageMessages[stage]) {
			this.console.message(message.replace(/{(\w+)}/gi, (_, name) => this.state.state[name]))
			await this.waitTicks(5000)
			if (stage !== this.state.state.stage) {
				// Stage changed faster than it should be
				this.storyTextGoing = false
				return this.storyText()
			}
		}
		this.storyTextGoing = false
	}

	applySprites (state) {
		for (const name in Sprites[state]) {
			const sprite = Object.assign({}, Sprites[state][name])
			const el = this.root.querySelector(`picture#${name}`)
			for (const child of el.children) {
				if (child instanceof HTMLImageElement) {
					child.src = sprite._
				} else if (child instanceof HTMLSourceElement && child.type in sprite) {
					child.srcset = sprite[child.type]
					delete sprite[child.type]
				}
			}
			delete sprite._
			for (const type in sprite) {
				const child = document.createElement('source')
				child.srcset = sprite[type]
				child.type = type
				el.appendChild(child)
			}
		}
	}

	save(slot = 0) {
		this.console.debug(`Сохранение слота #${slot}`)
		try {
			localStorage.setItem(slot, JSON.stringify(this.state))
			return true
		} catch (e) {
			this.console.error(e)
			return false
		}
	}

	load(slot = 0) {
		this.console.debug(`Загрузка слота #${slot}`)
		const item = localStorage.getItem(slot)
		if (item) this.state.fromJSON(JSON.parse(item))
		return !!item
	}

	clear(slot = 0) {
		const { state } = this.state
		let str = `Внимание!\nВы очищаете слот #${slot} и теряете следующий прогресс:\n`
		if (state.stage) str += `* Этап ${state.stage}\n`
		if (state.entropy) str += `* ${state.entropy} Э\n`
		if (state.ml) str += `* ${state.ml} мл\n`
		if (Object.keys(state.upgradeLevels).length) {
			str += `* ${Object.keys(state.upgradeLevels).length} улучшении\n`
		}
		str += '\nПродолжить?'
		if (!window.confirm(str)) return false
		this.console.log(`Очистка слота #${slot}`)
		localStorage.removeItem(slot)
		this.state = new StateWrapper()
		location.reload()
		return true
	}

	_createButton(id, amount) {
		this.console.debug(`Creating button for upgrade #${id} x ${amount}`)
		// Format price
		const item = UpgradeDefinition[id]
		let text = 'Бесплатно'
		if (item.costEntropy || item.costMl) {
			const { entropy, ml } = this.state.getPrice(id, amount)
			const str = this.formatter.format(
				[entropy + ' Э', ml + ' мл']
					.filter(v => !v.startsWith('0')),
				'list'
			)
			text = amount ? `${amount > 0 ? '+' : ''}${amount} за ${str}` : str
		}
		// Create button
		const button = document.createElement('button')
		button.appendChild(document.createTextNode(text))
		button.dataset.amount = amount ?? 1
		button.disabled = true
		if (amount > 0) {
			button.addEventListener('click', () => {
				this.console.debug(`Trying to buy ${item?.name} (#${id}) x ${amount}`)
				if (!this.state.buyUpgrade(id, amount)) return
				this.console.log(`+ ${this.formatter.format(amount)} ${item.name}`)
			})
		} else if (amount < 0) {
			button.addEventListener('click', () => {
				this.console.debug(`Trying to sell ${item?.name} (#${id}) x ${amount}`)
				if (!this.state.sellUpgrade(id, -amount)) return
				this.console.log(`- ${this.formatter.format(-amount)} ${item.name}`)
			})
		} else {
			button.addEventListener('click', () => {
				this.console.debug(`Trying to buy ${item?.name} (#${id})`)
				if (!this.state.buyUpgrade(id)) return
				this.console.log(`+ ${item.name}`)
			})
		}
		return button
	}

	updateUpgrades() {
		const upgrades = this.state.getAvailable()
		const { upgradeLevels } = this.state.state
		// Stage 1. Update
		for (let i = 0; i < this.upgrades.children.length; i++) {
			const item = this.upgrades.children[i]
			const id = item.dataset.id
			if (!(id in upgrades)) {
				this.upgrades.removeChild(item)
				i--
				continue
			}
			for (const button of item.children) {
				if (button instanceof HTMLSpanElement) {
					if (+item.dataset.amount !== (upgradeLevels[id] ?? 0)) {
						item.dataset.amount = upgradeLevels[id]
						button.innerText = `${item.dataset.amount}/${item.dataset.max}`
					}
					continue
				}
				if (!button instanceof HTMLButtonElement) continue
				button.disabled = +button.dataset.amount > 0
					? +button.dataset.amount > upgrades[id]
					: this.state.state.upgradeLevels[id] >= -button.dataset.amount
			}
			// Stage 2. Delete
			delete upgrades[id]
		}
		// Stage 3. Create
		for (const id in upgrades) {
			const item = UpgradeDefinition[id]

			const li = document.createElement('li')
			li.dataset.id = id
			li.dataset.amount = 0
			li.dataset.max = item.max ?? 1
			this.upgrades.appendChild(li)
			li.appendChild(document.createTextNode(item.name))

			const span = document.createElement('span')
			span.innerText = `${li.dataset.amount}/${li.dataset.max}`
			li.appendChild(span)

			if ((item.max ?? 1) === 1) {
				li.appendChild(this._createButton(id))
				return
			}

			if (item.sellable) {
				for (const i of quantities(1, item.max)) {
					li.appendChild(this._createButton(id, -i))
				}
			}

			for (const i of quantities(1, item.max)) {
				li.appendChild(this._createButton(id, i))
			}
		}
	}

	waitTicks (ticks = 1000) {
		const time = performance.now() + ticks
		return new Promise((resolve) => {
			const callback = (time2) => {
				if (time2 < time) return
				this.removeEventListener('tick', callback)
				resolve(time2 - time)
			}
			this.addEventListener('tick', callback)
		})
	}

	tick () {
		const currTime = Date.now()
		let stateTime = this.state.state.time
		if ((currTime - stateTime) < 1000) return
		for (; (currTime - stateTime) >= 1000; stateTime += 1000) {
			this.state.updateIncrement()
		}
		this.state.state.time = stateTime
		this[EventDispatcher.Dispatch]('tick', performance.now())
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const game = globalThis.game = new Game
	game.load()
	function idleCallback() {
		game.tick()
		requestIdleCallback(idleCallback)
	}
	idleCallback()
	setInterval(() => game.save(), 60 * 1000)
	window.addEventListener('beforeunload', () => game.save())
})

console.log(`Привет!
Это игра про чМонику с технической стороны,
данный инструмент предназначается прежде всего
для отладки, но если хочешь читерить...

Вот небольшой список того что можно сделать
> game.isDebug = true // Включить режим отладки
> game.load(1) // Загрузить слот 1
> game.save(1) // Сохранить слот 1
> game.state.ml += 1e10 // Добавить игровой валюты
> game.targetMultiplier = 20 // Поставить комбо х20
> game.clear(0) // Очистить слот 0 (основной)
`)
