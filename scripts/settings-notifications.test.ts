import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notificationCategories, notificationSettings, mergeNotificationPreferences } from '../src/lib/settings/notification-preferences';

test('notification defaults match iOS and preserve explicit opt-outs', () => {
  assert.equal(notificationSettings(null, null).enabled, true);
  const settings = notificationSettings(false, { notify_jobs: false, notify_reminders: true });
  assert.equal(settings.enabled, false);
  assert.equal(settings.preferences.notify_jobs, false);
  assert.equal(settings.preferences.notify_follows, true);
});
test('web notification saves retain future native categories', () => {
  const settings = notificationSettings(true, { notify_jobs: false });
  const merged = mergeNotificationPreferences({ notify_native_future: false, notify_jobs: true }, settings.preferences);
  assert.equal(merged.notify_native_future, false);
  assert.equal(merged.notify_jobs, false);
});
test('community controls omit professional workflows without changing stored preferences', () => {
  assert.deepEqual(notificationCategories.filter(row => row.community).map(row => row.key), ['notify_follows', 'notify_activity_updates', 'notify_reminders']);
});
