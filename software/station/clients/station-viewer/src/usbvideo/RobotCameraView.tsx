import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Scan } from 'lucide-react';
import { st3215, usbvideo } from '../api/proto.js';
import CameraMotorStrip from '../st3215/CameraMotorStrip';
import MotorDataTable from '../st3215/MotorDataTable';
import CameraViewer from './CameraViewer';

type CameraFitMode = 'contain' | 'cover';

interface RobotCameraViewProps {
  primaryVideoSource?: usbvideo.IRxEnvelope;
  secondaryVideoSource?: usbvideo.IRxEnvelope;
  primaryVideoSourceId?: string | null;
  secondaryVideoSourceId?: string | null;
  cameraLayout?: 'pip' | 'side-by-side' | 'stacked';
  primaryCameraFit?: CameraFitMode;
  secondaryCameraFit?: CameraFitMode;
  onPrimaryCameraFitToggle?: () => void;
  onSecondaryCameraFitToggle?: () => void;
  bus: st3215.InferenceState.IBusState;
  busIndex: number;
  isWebControlled?: boolean;
  showMotorData?: boolean;
  showCalibrateButton?: boolean;
  needsCalibration?: boolean;
}

const RobotCameraView = memo(function RobotCameraView({
  primaryVideoSourceId,
  secondaryVideoSourceId,
  cameraLayout = 'pip',
  primaryCameraFit = 'contain',
  secondaryCameraFit = 'contain',
  onPrimaryCameraFitToggle,
  onSecondaryCameraFitToggle,
  bus,
  busIndex,
  isWebControlled,
  showMotorData = true,
  showCalibrateButton,
  needsCalibration,
}: RobotCameraViewProps) {
  const motorCount = bus.motors?.length ?? 0;
  const motorPanelHeight =
    motorCount >= 8 ? 'clamp(240px, 40%, 320px)' : 'clamp(180px, 32%, 240px)';
  const isSplitLayout =
    (cameraLayout === 'side-by-side' || cameraLayout === 'stacked') &&
    Boolean(secondaryVideoSourceId);
  const isStackedLayout = cameraLayout === 'stacked';
  const shouldShowCompactMotorStrip = showMotorData && motorCount > 0 && !isWebControlled;
  const shouldShowMobilePaneMotorStrip =
    shouldShowCompactMotorStrip && isSplitLayout && !isStackedLayout;
  const shouldShowStackedPaneMotorStrip =
    shouldShowCompactMotorStrip && isSplitLayout && isStackedLayout;
  const shouldLiftMobilePip = shouldShowCompactMotorStrip && !isSplitLayout;
  const renderFitButton = (
    fit: CameraFitMode,
    onToggle: (() => void) | undefined,
    label: string,
    className = 'right-2 top-12',
  ) => (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute z-30 flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-surface-primary/75 text-text-muted shadow-lg backdrop-blur-sm transition-colors hover:text-text-primary ${fit === 'cover' ? 'bg-accent-data/90 text-surface-base hover:text-surface-base' : ''} ${className}`}
      title={`${label}: ${fit}`}
      aria-label={`Toggle ${label} fit`}
    >
      <Scan className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  return (
    <div className="relative flex flex-col w-full h-full min-h-0 overflow-hidden bg-black rounded-b-lg">
      <div className="relative min-h-0" style={{ flex: '1 1 auto' }}>
        {isSplitLayout && primaryVideoSourceId ? (
          <div
            className={`grid h-full w-full ${
              isStackedLayout ? 'grid-rows-2' : 'grid-rows-2 sm:grid-cols-2 sm:grid-rows-1'
            }`}
          >
            <div
              className={`relative min-h-0 min-w-0 border-border-default ${
                isStackedLayout ? 'border-b' : 'border-b sm:border-b-0 sm:border-r'
              }`}
            >
              <CameraViewer
                sourceId={primaryVideoSourceId}
                className="h-full w-full"
                imageClassName="select-none"
                fit={primaryCameraFit}
              />
              {renderFitButton(primaryCameraFit, onPrimaryCameraFitToggle, 'Primary camera')}
              {(shouldShowMobilePaneMotorStrip || shouldShowStackedPaneMotorStrip) && (
                <div
                  className={`absolute bottom-0 left-0 right-0 z-40 max-h-[48%] min-h-0 border-t border-border-default bg-surface-base/95 shadow-2xl backdrop-blur-sm ${
                    shouldShowMobilePaneMotorStrip ? 'sm:hidden' : ''
                  }`}
                >
                  <CameraMotorStrip bus={bus} />
                </div>
              )}
            </div>
            <div className="relative min-h-0 min-w-0">
              <CameraViewer
                sourceId={secondaryVideoSourceId}
                className="h-full w-full"
                imageClassName="select-none"
                fit={secondaryCameraFit}
              />
              {renderFitButton(secondaryCameraFit, onSecondaryCameraFitToggle, 'Secondary camera')}
            </div>
          </div>
        ) : primaryVideoSourceId ? (
          <>
            <CameraViewer
              sourceId={primaryVideoSourceId}
              className="h-full w-full"
              imageClassName="select-none"
              fit={primaryCameraFit}
            />
            {renderFitButton(primaryCameraFit, onPrimaryCameraFitToggle, 'Primary camera')}
            {secondaryVideoSourceId && (
              <div
                className={`absolute right-4 z-30 h-[160px] w-2/5 min-w-[220px] max-w-[360px] overflow-hidden rounded-lg border-2 border-border-default bg-surface-primary shadow-2xl ${
                  shouldLiftMobilePip ? 'bottom-[36%] sm:bottom-4' : 'bottom-4'
                }`}
              >
                <CameraViewer
                  sourceId={secondaryVideoSourceId}
                  className="h-full w-full"
                  imageClassName="select-none"
                  fit={secondaryCameraFit}
                  overlay="none"
                />
                {renderFitButton(
                  secondaryCameraFit,
                  onSecondaryCameraFitToggle,
                  'Secondary camera',
                  'right-2 top-2',
                )}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-primary/30 p-6 text-center">
            <div className="text-accent-warning text-lg font-bold uppercase tracking-wide">
              No camera selected
            </div>
            <p className="max-w-md text-sm text-text-muted">
              Select an active USB video source in the title bar to switch this robot card into a camera-first operator view.
            </p>
          </div>
        )}

        {showCalibrateButton && needsCalibration && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <Link
              to="/st3215-bus-calibration"
              state={{ bus }}
              className="pointer-events-auto px-6 py-3 rounded text-lg font-bold transition-colors bg-accent-success-bg text-text-primary hover:bg-accent-success-deep ring-4 ring-accent-success-deep/50"
            >
              Calibrate
            </Link>
          </div>
        )}
      </div>

      {showMotorData &&
        motorCount > 0 &&
        !shouldShowMobilePaneMotorStrip &&
        !shouldShowStackedPaneMotorStrip && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-40 min-h-0 border-t border-border-default bg-surface-base/95 shadow-2xl backdrop-blur-sm ${
            isWebControlled ? '' : 'max-h-[34%]'
          }`}
          style={isWebControlled ? { height: motorPanelHeight } : undefined}
        >
          {isWebControlled ? (
            <MotorDataTable
              bus={bus}
              busIndex={busIndex}
              isWebControlled={isWebControlled}
              layout="panel"
            />
          ) : (
            <CameraMotorStrip bus={bus} />
          )}
        </div>
      )}
      {shouldShowMobilePaneMotorStrip && (
        <div className="absolute bottom-0 left-0 right-0 z-40 hidden min-h-0 max-h-[34%] border-t border-border-default bg-surface-base/95 shadow-2xl backdrop-blur-sm sm:block">
          <CameraMotorStrip bus={bus} />
        </div>
      )}
    </div>
  );
});

export default RobotCameraView;
