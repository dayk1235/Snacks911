/**
 * core/salesThermostat.ts — Dynamic sales aggressiveness control.
 * 
 * Adjusts the "sales heat" based on time of day to optimize kitchen load vs revenue.
 */

export type ThermostatLevel = 'ECO' | 'STANDARD' | 'AGGRESSIVE';

/**
 * Determines the current sales thermostat level based on the hour.
 * 
 * Logic:
 * - Peak Hours (14-16, 20-22): ECO (Focus on speed, minimal friction)
 * - Valley Hours (16-20, 22-02): AGGRESSIVE (Push margins, more upsells)
 * - Other: STANDARD
 * 
 * @returns Current ThermostatLevel
 */
export function getCurrentLevel(): ThermostatLevel {
  const hour = new Date().getHours();

  // Peak Hours: Focus on processing orders fast
  if ((hour >= 14 && hour < 16) || (hour >= 20 && hour < 22)) {
    return 'ECO';
  }

  // Valley Hours: Opportunity to increase ticket value
  if ((hour >= 16 && hour < 20) || (hour >= 22) || (hour < 2)) {
    return 'AGGRESSIVE';
  }

  // Default operation
  return 'STANDARD';
}

/**
 * Returns behavior flags based on the current thermostat level.
 */
export function getThermostatSettings() {
  const level = getCurrentLevel();

  switch (level) {
    case 'ECO':
      return {
        allowUpsells: false,
        priority: 'speed',
        messageTone: 'direct'
      };
    case 'AGGRESSIVE':
      return {
        allowUpsells: true,
        priority: 'margin',
        messageTone: 'persuasive'
      };
    case 'STANDARD':
    default:
      return {
        allowUpsells: true,
        priority: 'balanced',
        messageTone: 'friendly'
      };
  }
}
