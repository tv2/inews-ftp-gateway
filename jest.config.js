module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testPathIgnorePatterns: ['dist'],
	testMatch: ['**/*.(spec|test).(ts|js)'],
	transform: {
		'^.+\\.(ts|tsx|js)$': 'ts-jest',
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}
