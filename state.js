import StateFactory from "./engine/state.js"
import EventDispatcher from "./engine/event.js"
import StateDefinition from "./data/state.js"
import UpgradeDefinition from "./data/upgrades.js"

export default class StateWrapper extends EventDispatcher {
	static factory = new StateFactory(StateDefinition)
	constructor () {
		const state = StateWrapper.factory.create()
		super(state)
		this.state = state
	}

	updateDamage() {
		const damage = this.state.currentDamage
		this.state.entropy += damage
		this.state.ml += Math.round((Math.random() + 0.5) * this.state.mlDropChance * damage)
		this.state.totalDamage += damage
	}

	updateIncrement() {
		this.state.totalDamage += this.state.damageIncrement
		this.state.entropy += this.state.entropyIncrement
		this.state.ml += this.state.mlIncrement
	}

	getAvailable() {
		const available = {}
		for (const id in UpgradeDefinition) {
			const { stage, condition, costEntropy, costMl, max = 1, sellable } = UpgradeDefinition[id]
			if (stage !== this.state.stage) continue
			if (condition && !condition(this.state)) continue
			if (this.state.upgradeLevels[id] === max && !sellable) continue
			const maxByEntropy = costEntropy ? Math.ceil(this.state.entropy / costEntropy) : Infinity
			const maxByMl = costMl ? Math.ceil(this.state.ml / costMl) : Infinity
			available[id] = Math.min(maxByEntropy, maxByMl, max)
		}
		return available
	}

	getPrice(id, amount = 1) {
		const item = UpgradeDefinition[id]
		if (!item) return { entropy: -1, ml: -1 }
		return {
			entropy: (item.costEntropy ?? 0) * amount,
			ml: (item.costMl ?? 0) * amount,
		}
	}

	buyUpgrade(id, amount = 1) {
		const item = UpgradeDefinition[id]
		if (!item || item.stage !== this.state.stage) return false
		if (item.condition && !item.condition(this.state)) return false
		amount = Math.min(amount, (item.max ?? 1) - (this.state.upgradeLevels[id] ?? 0))
		if (!amount) return false
		///
		const { entropy, ml } = this.getPrice(id, amount)
		this.state.upgradeLevels[id] = (this.state.upgradeLevels[id] ?? 0) + amount
		this.state.entropy -= entropy
		this.state.ml -= ml
		if (item.mutate) {
			for (let i = 0; i < amount; i++) {
				item.mutate(this.state)
			}
		}
		this[EventDispatcher.Dispatch]('upgradeLevels', this.state.upgradeLevels)
		return true
	}

	sellUpgrade(id, amount = 1) {
		const item = UpgradeDefinition[id]
		if (!item?.sellable || (item.mutate && !item.revert)) return false
		amount = Math.min(amount, this.state.upgradeLevels[id] ?? 0)
		if (!amount) return false
		///
		const { entropy, ml } = this.getPrice(id, amount)
		this.state.upgradeLevels[id] -= amount
		this.state.entropy += entropy * 0.5
		this.state.ml += ml * 0.5
		if (item.revert) {
			for (let i = 0; i < amount; i++) {
				item.revert(this.state)
			}
		}
		this[EventDispatcher.Dispatch]('upgradeLevels', this.state.upgradeLevels)
		return true
	}

	toJSON() {
		return this.state.toJSON()
	}

	fromJSON(data) {
		this.state.fromJSON(data)
		for (const id in this.state.upgradeLevels) {
			const item = UpgradeDefinition[id]
			if (!item) continue
			if (item.mutate) {
				for (let i = 0; i < this.state.upgradeLevels[id]; i++) {
					item.mutate(this.state)
				}
			}
		}
	}
}
