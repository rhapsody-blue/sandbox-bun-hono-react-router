import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ErrorMessage } from './error-message';

const meta = {
  title: 'Components/ErrorMessage',
  component: ErrorMessage,
  tags: ['autodocs'],
  args: {
    message: 'Unable to load tasks. Please try again.',
  },
} satisfies Meta<typeof ErrorMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRetry: Story = {
  args: {
    onRetry: fn(),
  },
};

export const Retrying: Story = {
  args: {
    onRetry: fn(),
    retrying: true,
  },
};
