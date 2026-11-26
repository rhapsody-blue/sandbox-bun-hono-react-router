import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Task title',
    placeholder: 'Add a task title',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search'],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Task title',
  },
};

export const Invalid: Story = {
  args: {
    'aria-invalid': true,
    value: 'Invalid value',
  },
};
