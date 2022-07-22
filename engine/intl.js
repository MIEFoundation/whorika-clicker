export default class IntlFormatter {
	constructor() {
		this.array = new Intl.ListFormat({
			style: 'short',
			type: 'conjunction'
		})
		this.date = new Intl.DateTimeFormat()
		this.number = new Intl.NumberFormat()
		this.relative = new Intl.RelativeTimeFormat()
	}

	format(value, as = 'any') {
		if (as !== 'any') {
			switch (as) {
				case 'multiplier':
					return 'x' + value.toPrecision(2)
				case 'percent':
					return this.number.format(value * 100)
				case 'list':
					return this.array.format(value.map(String))
				case 'date':
					return this.date.format(value)
				case 'relative':
					return this.relative.format(value)
			}
		}
		switch (typeof value) {
			case 'boolean':
				return value ? 'Да' : 'Нет'
			case 'bigint':
			case 'number':
				return this.number.format(value)
			case 'string':
				return value
			case 'undefined':
			case 'object':
				return value ? String(value) : 'Ничего'
			case 'symbol':
				return value.description ?? 'Что-то'
		}
	}
}
