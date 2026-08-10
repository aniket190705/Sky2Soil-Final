import { CalendarCheck2, CloudRain, Droplets, Sprout, Wheat } from "lucide-react";
import { PageHeader, StatusBadge } from "../components/ui";
import { calendarDays } from "../data/mockData";

const typeMap = {
  Irrigation: { icon: Droplets, tone: "green" },
  Fertilizer: { icon: Sprout, tone: "orange" },
  Weather: { icon: CloudRain, tone: "blue" },
  Harvest: { icon: Wheat, tone: "yellow" }
};

export default function Calendar() {
  return (
    <section className="page">
      <PageHeader
        eyebrow="Farm Operations"
        title="Farming Calendar"
        description="Monthly planning for irrigation, fertilizer, harvest, weather events, and tasks."
      />
      <div className="calendar-layout">
        <article className="panel calendar-panel">
          <div className="panel-title">
            <h3>July 2026</h3>
            <StatusBadge>Maize Cycle</StatusBadge>
          </div>
          <div className="weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => (
              <div className={`calendar-day ${day.day === 23 ? "today" : ""}`} key={day.day}>
                <strong>{day.day}</strong>
                <div>
                  {day.types.map((type) => {
                    const item = typeMap[type];
                    const Icon = item.icon;
                    return <span className={`dot dot-${item.tone}`} title={type} key={type}><Icon size={12} /></span>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="task-column">
          <article className="panel">
            <div className="panel-title"><h3>Today's Tasks</h3><StatusBadge tone="blue">Jul 23</StatusBadge></div>
            <div className="task-list">
              <div><CalendarCheck2 size={18} /><span>Check rainfall after 6 PM</span></div>
              <div><Droplets size={18} /><span>Keep irrigation on standby</span></div>
              <div><CloudRain size={18} /><span>Inspect drainage near Zone C</span></div>
            </div>
          </article>
          <article className="panel">
            <div className="panel-title"><h3>Upcoming Tasks</h3><StatusBadge>Next 7 Days</StatusBadge></div>
            <div className="task-list">
              <div><Sprout size={18} /><span>Fertilizer application on Jul 25</span></div>
              <div><Droplets size={18} /><span>Irrigation cycle on Jul 28</span></div>
              <div><Wheat size={18} /><span>Harvest readiness review on Jul 29</span></div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
