import { Bell, Download, Globe2, Moon, SlidersHorizontal, Sprout } from "lucide-react";
import { PageHeader, StatusBadge } from "../components/ui";
import { settingGroups } from "../data/mockData";

export default function SettingsPage() {
  return (
    <section className="page">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Frontend-only controls for crop profile, language, notifications, thresholds, reports, and display mode."
      />
      <div className="settings-grid">
        {settingGroups.map((group) => (
          <article className="panel setting-panel" key={group.title}>
            <div className="panel-title">
              <h3>{group.title}</h3>
              <StatusBadge>{group.selected}</StatusBadge>
            </div>
            <div className="option-row">
              {group.options.map((option) => (
                <button className={option === group.selected ? "selected" : ""} key={option}>{option}</button>
              ))}
            </div>
          </article>
        ))}

        <article className="panel setting-panel">
          <div className="panel-title"><h3>Sensor Thresholds</h3><SlidersHorizontal size={20} /></div>
          <label>Soil Moisture Minimum <input type="range" min="20" max="80" defaultValue="45" /></label>
          <label>Temperature Maximum <input type="range" min="20" max="45" defaultValue="35" /></label>
          <label>Battery Warning <input type="range" min="10" max="60" defaultValue="30" /></label>
        </article>

        <article className="panel setting-panel">
          <div className="toggle-row"><Sprout size={20} /><span>Crop stage auto updates</span><input type="checkbox" defaultChecked /></div>
          <div className="toggle-row"><Bell size={20} /><span>Critical alert notifications</span><input type="checkbox" defaultChecked /></div>
          <div className="toggle-row"><Globe2 size={20} /><span>Regional weather format</span><input type="checkbox" defaultChecked /></div>
          <div className="toggle-row"><Moon size={20} /><span>Dark mode preview</span><input type="checkbox" /></div>
        </article>

        <article className="panel report-panel">
          <Download size={28} />
          <div>
            <h3>Export Reports</h3>
            <p>Generate a polished mock PDF or CSV report for presentation demos.</p>
          </div>
          <button>Export</button>
        </article>
      </div>
    </section>
  );
}
