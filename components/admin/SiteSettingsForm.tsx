import type { SiteSettings } from "@/lib/content/types";
import { saveSiteSettings } from "@/app/admin/(dashboard)/actions";
import styles from "@/app/admin/(dashboard)/admin.module.css";

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  return <form action={saveSiteSettings} className={styles.settingsForm}>
    <label htmlFor="siteName">Site name</label><input id="siteName" name="siteName" defaultValue={settings.siteName} required />
    <label htmlFor="titleTemplate">Title template</label><input id="titleTemplate" name="titleTemplate" defaultValue={settings.titleTemplate} required /><small>Keep %s where each page title belongs.</small>
    <label htmlFor="defaultDescription">Default description</label><textarea id="defaultDescription" name="defaultDescription" rows={3} defaultValue={settings.defaultDescription} />
    <label htmlFor="socialProfiles">Social profile URLs</label><textarea id="socialProfiles" name="socialProfiles" rows={4} defaultValue={settings.socialProfiles.join("\n")} />
    <label htmlFor="verificationTokens">Search verification tokens</label><textarea id="verificationTokens" name="verificationTokens" rows={5} defaultValue={JSON.stringify(settings.verificationTokens, null, 2)} />
    <label htmlFor="robotsRules">Robots rules</label><textarea id="robotsRules" name="robotsRules" rows={5} defaultValue={JSON.stringify(settings.robotsRules, null, 2)} />
    <h2>Google Analytics</h2><p>Enter the GA4 Measurement ID from Google Analytics. Tracking is kept off the private admin pages.</p>
    <label htmlFor="googleAnalyticsMeasurementId">Google Analytics Measurement ID</label><input id="googleAnalyticsMeasurementId" name="googleAnalyticsMeasurementId" placeholder="G-XXXXXXXXXX" defaultValue={settings.googleAnalyticsMeasurementId} />
    <label><input type="checkbox" name="googleAnalyticsEnabled" defaultChecked={settings.googleAnalyticsEnabled} /> Enable Google Analytics on public pages</label>
    <h2>Google AdSense</h2><p>Add this only after Google gives you a publisher ID. Enabling it loads Google&apos;s code but does not guarantee approval.</p>
    <label htmlFor="adsensePublisherId">AdSense publisher ID</label><input id="adsensePublisherId" name="adsensePublisherId" placeholder="ca-pub-1234567890" defaultValue={settings.adsensePublisherId} />
    <label htmlFor="adsenseCode">AdSense code</label><textarea id="adsenseCode" name="adsenseCode" rows={5} defaultValue={settings.adsenseCode} />
    <label><input type="checkbox" name="adsenseEnabled" defaultChecked={settings.adsenseEnabled} /> Enable AdSense on public pages</label>
    <button>Save settings</button>
  </form>;
}
