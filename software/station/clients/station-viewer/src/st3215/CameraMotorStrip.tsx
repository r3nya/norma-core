import Long from 'long';
import { st3215 } from '../api/proto.js';
import { serverToLocal } from '../api/timestamp-utils';
import {
  getCurrentColor,
  getMotorStatusTextColor,
  getTemperatureColor,
} from '../utils/color-utils';
import { getMotorCurrent, getMotorTemperature } from './motor-parser';

interface CameraMotorStripProps {
  bus: st3215.InferenceState.IBusState;
}

export default function CameraMotorStrip({ bus }: CameraMotorStripProps) {
  const motors = [...(bus.motors ?? [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  if (!motors.length) {
    return null;
  }

  const now = Date.now();
  const motorRows = motors.map((motor) => {
    const current = motor.state ? getMotorCurrent(motor.state) : 0;
    const temperature = motor.state ? getMotorTemperature(motor.state) : 0;
    const adjustedMotorStamp = motor.monotonicStampNs
      ? serverToLocal(Long.fromValue(motor.monotonicStampNs))
      : null;
    const latency = adjustedMotorStamp ? now - adjustedMotorStamp.toNumber() / 1e6 : 0;
    const hasError = Boolean(motor.error);

    return {
      current,
      hasError,
      latency,
      motor,
      temperature,
    };
  });
  return (
    <div className="max-h-full overflow-y-auto overflow-x-hidden">
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 text-xs font-mono text-text-label sm:gap-2">
        {motorRows.map(({ current, hasError, latency, motor, temperature }) => (
          <div
            key={motor.id}
            className={`flex h-9 min-w-[7.5rem] flex-1 items-center justify-between gap-2 rounded-md border px-2 sm:flex-none ${
              hasError
                ? 'border-accent-critical/60 bg-accent-critical/10'
                : 'border-border-default/60 bg-surface-secondary/80'
            }`}
            title={motor.error?.description || undefined}
          >
            <span className={`font-bold ${getMotorStatusTextColor(latency, hasError)}`}>
              M{motor.id}
            </span>
            <span className={`tabular-nums ${getCurrentColor(current)}`}>
              I {current}
            </span>
            <span className={`tabular-nums ${getTemperatureColor(temperature)}`}>
              {temperature}°C
            </span>
            <span className={`font-bold ${getMotorStatusTextColor(latency, hasError)}`}>
              {hasError ? 'ERR' : 'OK'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
