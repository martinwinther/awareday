import type {
  DayViewActivityBlock,
  DayViewEventMarker,
} from "@/lib/firestore/derive-single-day-calendar-items";
import { formatClockTime } from "./summary-helpers";
import { StateNotice } from "./state-notice";

const HOURS_IN_DAY = 24;
const HOUR_ROW_HEIGHT_PX = 56;
const DAY_HEIGHT_PX = HOURS_IN_DAY * HOUR_ROW_HEIGHT_PX;
const MIN_ACTIVITY_BLOCK_HEIGHT_PX = 20;
const MIN_ACTIVITY_BLOCK_HEIGHT_WITH_TIME_PX = 36;
const ACTIVITY_LANE_GAP_PX = 5;
const EVENT_MARKER_MAX_WIDTH_PX = 176;
const EVENT_RAIL_WIDTH_PX = 126;
const EVENT_RAIL_GAP_PX = 6;
const EVENT_LABEL_STACK_OFFSET_PX = 11;
const EVENT_RAIL_DOT_X_PX = 10;
const EVENT_LABEL_HEIGHT_PX = 22;
const EVENT_LABEL_MIN_GAP_PX = 4;
const EVENT_LABEL_TOP_OFFSET_PX = -8;

type SingleDayCalendarTimelineProps = {
  activityBlocks: DayViewActivityBlock[];
  eventMarkers: DayViewEventMarker[];
};

type EventRenderItem = {
  marker: DayViewEventMarker;
  anchorTopPx: number;
  labelTopPx: number;
};

type ActivityRenderItem = {
  block: DayViewActivityBlock;
  topPx: number;
  heightPx: number;
  leftRatio: number;
  widthRatio: number;
};

function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(date);
}

function buildEventRenderItems(eventMarkers: DayViewEventMarker[]): EventRenderItem[] {
  const sorted = [...eventMarkers].sort((left, right) => left.topPercent - right.topPercent);
  const items: EventRenderItem[] = [];
  const minSpacingPx = EVENT_LABEL_HEIGHT_PX + EVENT_LABEL_MIN_GAP_PX;
  const maxLabelTop = DAY_HEIGHT_PX - EVENT_LABEL_HEIGHT_PX;

  for (const marker of sorted) {
    const anchorTopPx = (marker.topPercent / 100) * DAY_HEIGHT_PX;
    const denseOffset = marker.stackSize >= 3 ? EVENT_LABEL_STACK_OFFSET_PX - 2 : EVENT_LABEL_STACK_OFFSET_PX;
    const desiredTop = anchorTopPx + EVENT_LABEL_TOP_OFFSET_PX + marker.stackIndex * denseOffset;
    const previousLabelTop = items.length === 0 ? null : items[items.length - 1].labelTopPx;
    const nonCollidingTop = previousLabelTop === null ? desiredTop : Math.max(desiredTop, previousLabelTop + minSpacingPx);

    items.push({
      marker,
      anchorTopPx,
      labelTopPx: Math.max(0, Math.min(nonCollidingTop, maxLabelTop)),
    });
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const nextTop = index === items.length - 1 ? maxLabelTop : items[index + 1].labelTopPx - minSpacingPx;
    items[index].labelTopPx = Math.max(0, Math.min(items[index].labelTopPx, nextTop));
  }

  return items;
}

function buildActivityRenderItems(activityBlocks: DayViewActivityBlock[]): ActivityRenderItem[] {
  const items = activityBlocks
    .map((block) => {
      const laneWidthRatio = 1 / block.laneCount;
      const initialTopPx = (block.topPercent / 100) * DAY_HEIGHT_PX;
      const heightPx = Math.max((block.heightPercent / 100) * DAY_HEIGHT_PX, MIN_ACTIVITY_BLOCK_HEIGHT_PX);

      return {
        block,
        topPx: initialTopPx,
        heightPx,
        leftRatio: block.laneIndex * laneWidthRatio,
        widthRatio: block.laneSpan * laneWidthRatio,
      };
    })
    .sort((left, right) => {
      if (left.topPx !== right.topPx) {
        return left.topPx - right.topPx;
      }

      return left.leftRatio - right.leftRatio;
    });

  const minGapPx = 2;
  const sharesHorizontalSpace = (left: ActivityRenderItem, right: ActivityRenderItem) =>
    left.leftRatio < right.leftRatio + right.widthRatio && right.leftRatio < left.leftRatio + left.widthRatio;

  for (let index = 1; index < items.length; index += 1) {
    const current = items[index];

    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = items[previousIndex];
      if (!sharesHorizontalSpace(current, previous)) {
        continue;
      }

      const minimumTopPx = previous.topPx + previous.heightPx + minGapPx;

      if (current.topPx < minimumTopPx) {
        current.topPx = minimumTopPx;
      }
    }
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    item.topPx = Math.max(0, Math.min(item.topPx, DAY_HEIGHT_PX - item.heightPx));

    for (let earlierIndex = index - 1; earlierIndex >= 0; earlierIndex -= 1) {
      const earlier = items[earlierIndex];

      if (!sharesHorizontalSpace(item, earlier)) {
        continue;
      }

      const maxEarlierTop = item.topPx - minGapPx - earlier.heightPx;

      if (earlier.topPx > maxEarlierTop) {
        earlier.topPx = maxEarlierTop;
      }
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    current.topPx = Math.max(0, Math.min(current.topPx, DAY_HEIGHT_PX - current.heightPx));

    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = items[previousIndex];

      if (!sharesHorizontalSpace(current, previous)) {
        continue;
      }

      const minimumTopPx = previous.topPx + previous.heightPx + minGapPx;

      if (current.topPx < minimumTopPx) {
        current.topPx = minimumTopPx;
      }
    }

    current.topPx = Math.max(0, Math.min(current.topPx, DAY_HEIGHT_PX - current.heightPx));
  }

  return items;
}

export function SingleDayCalendarTimeline({ activityBlocks, eventMarkers }: SingleDayCalendarTimelineProps) {
  const eventRenderItems = buildEventRenderItems(eventMarkers);
  const activityRenderItems = buildActivityRenderItems(activityBlocks);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-[#fff8ef]">
        <div className="grid grid-cols-[2.5rem_1fr]">
          <div className="relative border-r border-amber-100 bg-[#fcf4e8]" style={{ height: DAY_HEIGHT_PX }}>
            {Array.from({ length: HOURS_IN_DAY + 1 }).map((_, hour) => {
              const top = hour * HOUR_ROW_HEIGHT_PX;

              return (
                <p
                  key={hour}
                  className="absolute -translate-y-1/2 pl-1 text-[11px] font-medium text-stone-500"
                  style={{ top }}
                >
                  {hour === HOURS_IN_DAY ? "24" : formatHourLabel(hour)}
                </p>
              );
            })}
          </div>

          <div className="relative" style={{ height: DAY_HEIGHT_PX }}>
            {Array.from({ length: HOURS_IN_DAY + 1 }).map((_, hour) => {
              const top = hour * HOUR_ROW_HEIGHT_PX;

              return (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-amber-100/80"
                  style={{ top }}
                  aria-hidden="true"
                />
              );
            })}

            <div className="absolute inset-0 px-2 py-1">
              {activityRenderItems.map(({ block, topPx, heightPx, leftRatio, widthRatio }) => {
                const showFullTimeRange = heightPx >= 56 && block.laneCount === 1;
                const showStartTime = !showFullTimeRange && heightPx >= MIN_ACTIVITY_BLOCK_HEIGHT_WITH_TIME_PX && block.laneCount <= 2;
                const denseLaneInsetPx = block.laneCount >= 3 ? 1.5 : 0;
                const activityCanvasWidthPx = EVENT_RAIL_WIDTH_PX + EVENT_RAIL_GAP_PX;
                const isDenseBlock = block.laneCount >= 3 || heightPx < 42;

                return (
                  <div
                    key={block.id}
                    className="absolute overflow-hidden rounded-lg border border-amber-300/85 bg-amber-100/85 shadow-[0_1px_2px_rgba(87,64,31,0.16)]"
                    style={{
                      top: `${topPx}px`,
                      left: `calc((100% - ${activityCanvasWidthPx}px) * ${leftRatio} + ${ACTIVITY_LANE_GAP_PX / 2 + denseLaneInsetPx}px)`,
                      width: `calc((100% - ${activityCanvasWidthPx}px) * ${widthRatio} - ${ACTIVITY_LANE_GAP_PX + denseLaneInsetPx * 2}px)`,
                      height: `${heightPx}px`,
                      zIndex: 10 + block.laneCount - block.laneSpan,
                    }}
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-amber-400/70" aria-hidden="true" />
                    <div className={`px-2 ${isDenseBlock ? "py-0.5" : "py-1"}`}>
                      <p className={`truncate font-semibold leading-tight text-stone-800 ${isDenseBlock ? "text-[11px]" : "text-xs"}`}>
                        {block.label}
                      </p>
                      {showFullTimeRange ? (
                        <p className="truncate text-[11px] leading-tight text-stone-600">
                          {formatClockTime(block.startTimestamp)} - {formatClockTime(block.endTimestamp)}
                        </p>
                      ) : showStartTime ? (
                        <p className="truncate text-[10px] leading-tight text-stone-600">
                          {formatClockTime(block.startTimestamp)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <div
                className="absolute inset-y-0 right-0 rounded-r-lg border-l border-indigo-200/70 bg-gradient-to-b from-indigo-50/55 to-indigo-50/30"
                style={{ width: EVENT_RAIL_WIDTH_PX }}
                aria-hidden="true"
              />

              {eventRenderItems.map(({ marker, anchorTopPx, labelTopPx }) => (
                <div
                  key={marker.id}
                  className="absolute right-0"
                  style={{
                    top: 0,
                    width: EVENT_RAIL_WIDTH_PX,
                    zIndex: 30 + marker.stackIndex,
                  }}
                >
                  <div className="absolute left-0 h-px w-full bg-indigo-200/75" style={{ top: anchorTopPx }} aria-hidden="true" />
                  <span
                    className="absolute h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-indigo-600 ring-2 ring-[#fff8ef]"
                    style={{ top: anchorTopPx, left: EVENT_RAIL_DOT_X_PX }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute w-px bg-indigo-300/80"
                    style={{
                      left: EVENT_RAIL_DOT_X_PX + 4,
                      top: Math.min(anchorTopPx, labelTopPx + EVENT_LABEL_HEIGHT_PX / 2),
                      height: Math.max(1, Math.abs(anchorTopPx - (labelTopPx + EVENT_LABEL_HEIGHT_PX / 2))),
                    }}
                    aria-hidden="true"
                  />
                  <p
                    className="absolute truncate rounded-md border border-indigo-200 bg-indigo-50/95 px-1.5 py-0.5 text-[11px] font-medium text-indigo-800 shadow-sm"
                    style={{
                      top: labelTopPx,
                      left: EVENT_RAIL_DOT_X_PX + 10,
                      maxWidth: `min(${EVENT_RAIL_WIDTH_PX - 24}px, ${EVENT_MARKER_MAX_WIDTH_PX}px)`,
                    }}
                  >
                    {marker.stackIndex === 0 ? `${formatClockTime(marker.timestamp)} ${marker.label}` : marker.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activityBlocks.length === 0 && eventMarkers.length === 0 ? (
        <StateNotice
          variant="empty"
          title="No day-schedule entries for this date."
          description="Log activities or events for this day to place them on the time grid."
        />
      ) : null}
    </div>
  );
}

