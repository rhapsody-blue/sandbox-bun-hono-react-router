import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingState } from './loading-state';

const meta = {
  title: 'Components/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
  args: {
    children: 'Loading tasks…',
  },
} satisfies Meta<typeof LoadingState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
