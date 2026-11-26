import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <CircleCheck />
      <AlertDescription>Your changes have been saved.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
  },
  render: (args) => (
    <Alert {...args}>
      <CircleAlert />
      <AlertDescription>Unable to save your changes.</AlertDescription>
    </Alert>
  ),
};
