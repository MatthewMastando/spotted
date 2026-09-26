module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(test).[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  clearMocks: true,
};
