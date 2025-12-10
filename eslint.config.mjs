import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    vue: true,
    jsonc: true,
    toml: true,
  },
  { files: ['tsconfig*.json'], rules: { 'jsonc/sort-keys': 'off' } },
  {
    rules: {
      'ts/consistent-type-definitions': 'off',
    },
  },
)
