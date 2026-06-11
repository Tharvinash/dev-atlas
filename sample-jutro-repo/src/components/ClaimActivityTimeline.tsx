import { Card, Timeline, TimelineItem } from '@jutro/components';
import type { ClaimActivity } from '@/types/claim';

export interface ClaimActivityTimelineProps {
  claimId: string;
  activities: ClaimActivity[];
}

export function ClaimActivityTimeline({ claimId, activities }: ClaimActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card title="Activity">
        <p>No activity recorded for claim {claimId} yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Activity" subtitle={`Claim ${claimId}`}>
      <Timeline>
        {activities.map((activity) => (
          <TimelineItem
            key={activity.id}
            timestamp={activity.timestamp}
            actor={activity.actor}
          >
            {activity.description}
          </TimelineItem>
        ))}
      </Timeline>
    </Card>
  );
}
