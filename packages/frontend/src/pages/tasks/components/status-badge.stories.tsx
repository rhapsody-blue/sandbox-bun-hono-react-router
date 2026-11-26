import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge } from './status-badge';

const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];

const meta = {
  title: 'Tasks/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  args: {
    status: 'TODO',
  },
  argTypes: {
    status: {
      control: 'select',
      options: statuses,
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Todo: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {statuses.map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
