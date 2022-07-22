export default {
	// Stage 0
	rag: {
		name: 'Ссаные тряпки',
		stage: 0,
		costEntropy: 100,
	},
	slap: {
		name: 'Дать по щам',
		stage: 0,
		condition: state => state.upgradeLevels.rag,
		mutate: state => (
			state.totalDamage += 1,
			state.entropy += 100,
			state
		),
	},
	castet: {
		name: 'Кастет',
		stage: 0,
		costEntropy: 500,
		mutate: state => (
			state.baseDamage = 5,
			state.dropChance = 0.005,
			state
		),
	},
	bat: {
		name: 'Деревянная бита',
		stage: 0,
		costEntropy: 2_000,
		condition: state => state.upgradeLevels.castet,
		mutate: state => (
			state.baseDamage = 8,
			state.dropChance = 0.01,
			state
		),
	},
	hammer: {
		name: 'Молоток',
		stage: 0,
		costEntropy: 6_000,
		condition: state => state.upgradeLevels.bat,
		mutate: state => (
			state.baseDamage = 20,
			state.dropChance = 0.05,
			state
		),
	},
	hammer_big: {
		name: 'Железный молот',
		stage: 0,
		costEntropy: 10_000,
		condition: state => state.upgradeLevels.hammer,
		mutate: state => (
			state.baseDamage = 30,
			state.dropChance = 0.1,
			state
		),
	},
	analysis: {
		name: 'Анализ крови',
		stage: 0,
		costEntropy: 50_000,
		costMl: 100,
		condition: state => state.upgradeLevels.bat && state.ml > 0,
		mutate: state => (
			state.stage = 1,
			state
		),
	},
	// Stage 1
	knife: {
		name: 'Нож',
		stage: 1,
		costEntropy: 40_000,
		condition: state => state.upgradeLevels.analysis,
		mutate: state => (
			state.baseDamage = 50,
			state.dropChance = 0.2,
			state
		),
	},
	knee: {
		name: 'Сломать колено',
		max: 2,
		stage: 1,
		costEntropy: 5_000,
		condition: state => state.upgradeLevels.slap,
		mutate: state => (
			state.totalDamage += 1000,
			state.entropy += 2000,
			state
		)
	},
	larger_knife: {
		name: 'Длинный нож',
		stage: 1,
		costEntropy: 50_000,
		condition: state => state.upgradeLevels.knife,
		mutate: state => (
			state.baseDamage = 80,
			state.dropChance = 0.4,
			state
		),
	},
	disposable: {
		name: 'Человек-расходник с ножом',
		stage: 1,
		max: 10,
		sellable: true,
		costMl: 5_000,
		mutate: state => (
			state.damageIncrement += 100,
			state.entropyIncrement += 100,
			state.mlIncrement += 10,
			state
		),
		revert: state => (
			state.damageIncrement -= 100,
			state.entropyIncrement -= 100,
			state.mlIncrement -= 10,
			state
		),
	},
	pistol: {
		name: 'Пистолет ГШ-18',
		stage: 1,
		costEntropy: 100_000,
		condition: state => state.upgradeLevels.larger_knife,
		mutate: state => (
			state.baseDamage = 240,
			state.dropChance = 0.2,
			state
		),
	},
	smg: {
		name: 'Пистолет-пулемёт ПП-2000',
		stage: 1,
		costEntropy: 250_000,
		condition: state => state.upgradeLevels.pistol,
		mutate: state => (
			state.baseDamage = 500,
			state.dropChance = 0.4,
			state
		),
	},
	guard: {
		name: 'Охранник с ПП',
		stage: 1,
		max: 10,
		sellable: true,
		costMl: 100_000,
		condition: state => state.upgradeLevels.disposable,
		mutate: state => (
			state.damageIncrement += 500,
			state.entropyIncrement += 200,
			state.mlIncrement += 100,
			state
		),
		revert: state => (
			state.damageIncrement -= 500,
			state.entropyIncrement -= 200,
			state.mlIncrement -= 100,
			state
		),
	},
	machine_gun: {
		name: 'Пулемёт ПКП',
		stage: 1,
		costEntropy: 500_000,
		condition: state => state.upgradeLevels.smg,
		mutate: state => (
			state.baseDamage = 800,
			state.dropChance = 0.6,
			state
		),
	},
	shotgun: {
		name: 'Ружьё Вепрь-12',
		stage: 1,
		costEntropy: 700_000,
		condition: state => state.upgradeLevels.machine_gun,
		mutate: state => (
			state.baseDamage = 1_000,
			state.dropChance = 0.8,
			state
		),
	},
	rifle: {
		name: 'Винтовка КСВК',
		stage: 1,
		costEntropy: 5_000_000,
		condition: state => state.upgradeLevels.shotgun,
		mutate: state => (
			state.baseDamage = 5_000,
			state.dropChance = 1,
			state
		),
	},
	turret: {
		name: 'Туррель',
		stage: 1,
		max: 50,
		sellable: true,
		costMl: 1_000_000,
		condition: state => state.upgradeLevels.guard,
		mutate: state => (
			state.damageIncrement += 2_000,
			state.entropyIncrement += 2_000,
			state.mlIncrement += 4000,
			state
		),
		revert: state => (
			state.damageIncrement -= 2_000,
			state.entropyIncrement -= 2_000,
			state.mlIncrement -= 4000,
			state
		),
	},
}
