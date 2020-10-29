export const VERSION = '1.1.0'

export function VersionIsCompatible(storedVersion?: string): boolean {
	return storedVersion === VERSION
}
