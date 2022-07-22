import UpgradeDefinitions from "./upgrades.js"

export default {
	name: {
		type: String,
		validate: v => v.length >= 3 && v.length < 256,
		default: () => 'Сотрудник',
		serialize: true,
	},
	start: {
		type: Date,
		validate: v => v.valueOf() <= Date.now(),
		default: () => new Date(),
		serialize: true,
		deserialize: v => new Date(v),
	},
	time: {
		type: Number,
		validate: v => v <= Date.now(),
		default: () => Date.now(),
		serialize: true,
	},
	end: {
		type: Date,
		optional: true,
		validate: v => v.valueOf() <= Date.now(),
		serialize: true,
		deserialize: v => new Date(v),
	},
	entropy: {
		type: Number,
		default: () => 0,
		serialize: true,
	},
	ml: {
		type: Number,
		default: () => 0,
		serialize: true,
	},
	totalDamage: {
		type: Number,
		default: () => 0,
		serialize: true,
	},
	stage: {
		type: Number,
		format: v => ['Отрицание', 'Гнев', 'Торг', 'Депрессия', 'Принятие'][v],
		validate: v => v >= 0 && v < 5,
		default: () => 0,
		serialize: true,
	},
	baseDamage: {
		type: Number,
		default: () => 1,
	},
	comboMultiplier: {
		type: Number,
		validate: v => v >= 1 && v <= 10,
		default: () => 1,
	},
	currentDamage: {
		type: Number,
		computed: state => Math.round(state.baseDamage * state.comboMultiplier),
	},
	mlDropChance: {
		type: Number,
		validate: v => v >= 0 && v <= 1,
		default: () => 0,
	},
	upgradeLevels: {
		type: Object,
		validate: v => Object.entries(v).every(([name, level]) => {
			if (!(name in UpgradeDefinitions)) return false
			const { max = 1, condition = null } = UpgradeDefinitions[name]
			if (condition && !condition({ upgradeLevels: v })) return false
			return level > 0 && level <= max
		}),
		default: () => ({}),
		serialize: true,
	},
	damageIncrement: {
		type: Number,
		default: () => 0,
	},
	entropyIncrement: {
		type: Number,
		default: () => 0,
	},
	mlIncrement: {
		type: Number,
		default: () => 0,
	},
}
