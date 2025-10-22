module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/frontend/src/setupTests.ts"],
  testMatch: [
    "<rootDir>/frontend/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/backend/src/**/__tests__/**/*.{js,ts}"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: {
        jsx: "react-jsx",
        esModuleInterop: true
      }
    }]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"]
};
