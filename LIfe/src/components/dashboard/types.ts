export type DashboardScheduleItem = {
  id: string;
  kind: "event" | "routine";
  title: string;
  starts_at: string;
  ends_at: string;
  category_id: string | null;
  is_shared: boolean;
  user_id?: string | null;
  color?: string | null;
};
