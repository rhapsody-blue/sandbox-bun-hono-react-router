import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    allowedHosts: ['localhost', '127.0.0.1'],
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
