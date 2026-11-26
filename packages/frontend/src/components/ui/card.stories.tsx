import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card';

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <div className="px-4">
        <h2 className="font-medium">Plan project launch</h2>
        <p className="mt-1 text-muted-foreground">
          Prepare the launch checklist and coordinate the release.
        </p>
      </div>
    </Card>
  ),
};

export const Compact: Story = {
  render: () => (
    <Card className="w-80" size="sm">
      <div className="px-3">
        <h2 className="font-medium">Plan project launch</h2>
        <p className="mt-1 text-muted-foreground">
          Prepare the launch checklist and coordinate the release.
        </p>
      </div>
    </Card>
  ),
};
