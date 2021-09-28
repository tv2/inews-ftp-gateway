export function literal<T>(o: T) {
	return o
}

export function assertUnreachable(_never: never): never {
	throw new Error('Switch validation failed, look for assertUnreachable(...)')
}

function isValidDate(d: unknown) {
	return d instanceof Date
}

export function ParseDateFromInews(date: string) {
	const modifyDate = new Date(date)

	return isValidDate(modifyDate) ? modifyDate : new Date()
}

export function ReflectPromise<T>(
	ps: Promise<T>
): Promise<{ value: T; status: 'fulfilled' } | { e: any; status: 'rejected' }> {
	return ps.then(
		(value) => ({ value, status: 'fulfilled' }),
		(e) => ({ e, status: 'rejected' })
	)
}
